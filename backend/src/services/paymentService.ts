import Stripe from "stripe";
import { supabaseAdmin } from "../config/supabase.js";
import { EmailService, EmailTemplateData } from "./emailService.js";
import { getFreshAccessToken } from "../routes/emailAuth.js";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export interface PaymentData {
  registrationId: string;
  eventId: string;
  userId: string;
  amount: number;
  currency?: string;
}

export interface PaymentVerificationData {
  paymentIntentId: string;
  paymentMethodId?: string;
}

export class PaymentService {
  // Create a payment intent
  static async createPaymentIntent(paymentData: PaymentData) {
    try {
      const {
        registrationId,
        eventId,
        userId,
        amount,
        currency = "USD",
      } = paymentData;

      // Fetch event and registration details
      console.log(
        `🔍 Looking for registration: ${registrationId} for user: ${userId}`
      );

      // Add a small delay in case there's a timing issue with registration creation
      await new Promise((resolve) => setTimeout(resolve, 100));

      // First, let's check if the registration exists at all
      const { data: registrationCheck, error: checkError } = await supabaseAdmin
        .from("registrations")
        .select("id, user_id, event_id, status, payment_status, created_at")
        .eq("id", registrationId)
        .single();

      console.log(`👀 Registration existence check:`, {
        registrationCheck,
        checkError,
      });

      if (checkError && checkError.code === "PGRST116") {
        console.log(
          `❌ Registration ${registrationId} does not exist in database`
        );
        throw new Error(`Registration ${registrationId} not found`);
      }

      if (registrationCheck && registrationCheck.user_id !== userId) {
        console.log(
          `❌ Registration belongs to user ${registrationCheck.user_id}, not ${userId}`
        );
        throw new Error("Registration belongs to a different user");
      }

      // Get all registrations for this user to debug
      const { data: userRegs } = await supabaseAdmin
        .from("registrations")
        .select("id, status, payment_status, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

      console.log(`🔍 Recent registrations for user ${userId}:`, userRegs);

      let { data: registration, error: regError } = await supabaseAdmin
        .from("registrations")
        .select(
          `
          *,
          events (
            id,
            title,
            price,
            is_paid
          )
        `
        )
        .eq("id", registrationId)
        .eq("user_id", userId)
        .in("status", ["pending", "confirmed"])
        .single();

      console.log(`📄 Registration query result:`, { registration, regError });

      if (regError) {
        console.error(`❌ Registration query error:`, regError);
        if (regError.code === "PGRST116") {
          // Try without status filter to see what the actual registration looks like
          console.log(
            `🔄 Trying to fetch registration without status filter...`
          );
          const { data: regWithoutFilter, error: regNoFilterError } =
            await supabaseAdmin
              .from("registrations")
              .select(
                `
              *,
              events (
                id,
                title,
                price,
                is_paid
              )
            `
              )
              .eq("id", registrationId)
              .eq("user_id", userId)
              .single();

          console.log(`📋 Registration without filter:`, {
            regWithoutFilter,
            regNoFilterError,
          });

          if (regNoFilterError) {
            throw new Error("Registration not found or has been cancelled");
          }

          if (regWithoutFilter) {
            // Check the actual status
            if (regWithoutFilter.status === "cancelled") {
              throw new Error("Registration has been cancelled");
            }
            if (regWithoutFilter.payment_status === "completed") {
              throw new Error(
                "Registration payment has already been completed"
              );
            }
            // Use this registration if it exists
            registration = regWithoutFilter;
          } else {
            throw new Error("Registration not found or has been cancelled");
          }
        } else {
          throw new Error(`Database error: ${regError.message}`);
        }
      }

      if (!registration) {
        throw new Error("Registration not found");
      }

      if (!registration.events?.is_paid) {
        throw new Error("This is a free event");
      }

      // Fetch user details
      const { data: userData, error: userError } = await supabaseAdmin
        .from("users")
        .select("name, email")
        .eq("id", userId)
        .single();

      if (userError || !userData) {
        throw new Error("User not found");
      }

      // Create payment record
      const { data: payment, error: paymentError } = await supabaseAdmin
        .from("payments")
        .insert({
          registration_id: registrationId,
          event_id: eventId,
          user_id: userId,
          amount: amount,
          currency: currency,
          status: "pending",
        })
        .select()
        .single();

      if (paymentError || !payment) {
        console.error("Payment creation error:", paymentError);
        throw new Error(
          `Failed to create payment record: ${
            paymentError?.message || "Unknown error"
          }`
        );
      }

      // Convert amount to cents for Stripe (assuming amount is in dollars)
      const amountInCents = Math.round(amount * 100);

      console.log(
        `💰 Payment amount conversion: $${amount} -> ${amountInCents} cents`
      );

      // Create Stripe payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents, // Amount in cents
        currency: currency.toLowerCase(),
        metadata: {
          paymentId: payment.id,
          registrationId: registrationId,
          eventId: eventId,
          userId: userId,
        },
        description: `Event Registration: ${registration.events.title}`,
        receipt_email: userData.email,
      });

      // Update payment record with Stripe payment intent ID
      await supabaseAdmin
        .from("payments")
        .update({
          gateway_payment_id: paymentIntent.id,
        })
        .eq("id", payment.id);

      return {
        paymentId: payment.id,
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id,
        amount: amountInCents,
        currency: currency,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
        eventTitle: registration.events.title,
        participantName: userData.name,
        participantEmail: userData.email,
      };
    } catch (error) {
      console.error("Payment intent creation error:", error);
      throw error;
    }
  }

  // Verify and complete payment
  static async completePayment(
    paymentId: string,
    verificationData: PaymentVerificationData
  ) {
    try {
      const { paymentIntentId, paymentMethodId } = verificationData;

      // Fetch payment record
      const { data: payment, error: paymentError } = await supabaseAdmin
        .from("payments")
        .select("*")
        .eq("id", paymentId)
        .single();

      if (paymentError || !payment) {
        throw new Error("Payment record not found");
      }

      // Retrieve payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(
        paymentIntentId
      );

      if (paymentIntent.status !== "succeeded") {
        throw new Error("Payment not completed");
      }

      // Update payment record
      const { error: updateError } = await supabaseAdmin
        .from("payments")
        .update({
          status: "completed",
          gateway_payment_id: paymentIntentId,
          gateway_response: {
            paymentIntentId: paymentIntentId,
            paymentMethodId: paymentMethodId,
            status: paymentIntent.status,
            amount_received: paymentIntent.amount_received,
          },
          payment_date: new Date().toISOString(),
        })
        .eq("id", paymentId);

      if (updateError) {
        console.error("💥 Payment update error details:", updateError);
        throw new Error(
          `Failed to update payment status: ${updateError.message}`
        );
      }

      // Update registration status to confirmed
      const { error: regUpdateError } = await supabaseAdmin
        .from("registrations")
        .update({
          payment_status: "completed",
          status: "confirmed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.registration_id);

      if (regUpdateError) {
        console.error("💥 Registration update error details:", regUpdateError);
        throw new Error(
          `Failed to update registration status: ${regUpdateError.message}`
        );
      }

      // Send confirmation email after successful payment
      try {
        await this.sendPaymentConfirmationEmail(payment.registration_id);
      } catch (emailError) {
        console.error("Failed to send payment confirmation email:", emailError);
        // Don't fail the payment completion if email fails
      }

      return {
        success: true,
        message: "Payment completed successfully",
        paymentId: paymentId,
        registrationId: payment.registration_id,
      };
    } catch (error) {
      console.error("Payment completion error:", error);
      throw error;
    }
  }

  // Get payment details
  static async getPaymentDetails(paymentId: string, userId: string) {
    try {
      const { data: payment, error } = await supabaseAdmin
        .from("payments")
        .select(
          `
          *,
          registrations (
            id,
            name,
            email,
            events (
              id,
              title,
              start_date,
              location
            )
          )
        `
        )
        .eq("id", paymentId)
        .eq("user_id", userId)
        .single();

      if (error || !payment) {
        throw new Error("Payment not found");
      }

      return payment;
    } catch (error) {
      console.error("Get payment details error:", error);
      throw error;
    }
  }

  // Get user payments
  static async getUserPayments(userId: string, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

      const {
        data: payments,
        error,
        count,
      } = await supabaseAdmin
        .from("payments")
        .select(
          `
          *,
          registrations (
            id,
            name,
            email,
            events (
              id,
              title,
              start_date,
              location
            )
          )
        `,
          { count: "exact" }
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error("Failed to fetch payments");
      }

      return {
        payments: payments || [],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        currentPage: page,
      };
    } catch (error) {
      console.error("Get user payments error:", error);
      throw error;
    }
  }

  // Handle Stripe webhook
  static async handleWebhook(body: string | Buffer, signature: string) {
    try {
      const event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );

      switch (event.type) {
        case "payment_intent.succeeded":
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          await this.handlePaymentSuccess(paymentIntent);
          break;

        case "payment_intent.payment_failed":
          const failedPayment = event.data.object as Stripe.PaymentIntent;
          await this.handlePaymentFailure(failedPayment);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      console.error("Webhook handling error:", error);
      throw error;
    }
  }

  // Handle successful payment from webhook
  private static async handlePaymentSuccess(
    paymentIntent: Stripe.PaymentIntent
  ) {
    try {
      const paymentId = paymentIntent.metadata.paymentId;

      if (!paymentId) {
        console.error("No payment ID in metadata");
        return;
      }

      // Update payment status
      const { error: paymentUpdateError } = await supabaseAdmin
        .from("payments")
        .update({
          status: "completed",
          gateway_response: {
            paymentIntentId: paymentIntent.id,
            status: paymentIntent.status,
            amount_received: paymentIntent.amount_received,
          },
          payment_date: new Date().toISOString(),
        })
        .eq("id", paymentId);

      if (paymentUpdateError) {
        console.error("💥 Webhook payment update error:", paymentUpdateError);
        return;
      }

      // Update registration status
      const registrationId = paymentIntent.metadata.registrationId;
      if (registrationId) {
        const { error: regUpdateError } = await supabaseAdmin
          .from("registrations")
          .update({
            payment_status: "completed",
            status: "confirmed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", registrationId);

        if (regUpdateError) {
          console.error(
            "💥 Webhook registration update error:",
            regUpdateError
          );
          return;
        }

        // Send confirmation email after successful payment via webhook
        try {
          await this.sendPaymentConfirmationEmail(registrationId);
        } catch (emailError) {
          console.error(
            "Failed to send webhook confirmation email:",
            emailError
          );
          // Don't fail the webhook processing if email fails
        }
      }
    } catch (error) {
      console.error("Handle payment success error:", error);
    }
  }

  // Handle failed payment from webhook
  private static async handlePaymentFailure(
    paymentIntent: Stripe.PaymentIntent
  ) {
    try {
      const paymentId = paymentIntent.metadata.paymentId;

      if (!paymentId) {
        console.error("No payment ID in metadata");
        return;
      }

      // Update payment status
      const { error: failureUpdateError } = await supabaseAdmin
        .from("payments")
        .update({
          status: "failed",
          gateway_response: {
            paymentIntentId: paymentIntent.id,
            status: paymentIntent.status,
            last_payment_error: paymentIntent.last_payment_error,
          },
        })
        .eq("id", paymentId);

      if (failureUpdateError) {
        console.error("💥 Webhook failure update error:", failureUpdateError);
      }
    } catch (error) {
      console.error("Handle payment failure error:", error);
    }
  }

  // Send confirmation email after successful payment
  private static async sendPaymentConfirmationEmail(registrationId: string) {
    try {
      // Fetch registration with event and user details
      const { data: registration, error: regError } = await supabaseAdmin
        .from("registrations")
        .select(
          `
          *,
          events (
            id,
            title,
            start_date,
            location,
            organizer_id
          ),
          users (
            id,
            email,
            name
          )
        `
        )
        .eq("id", registrationId)
        .single();

      if (regError || !registration) {
        throw new Error("Registration not found for email sending");
      }

      const event = registration.events;
      const user = registration.users;

      if (!event || !user) {
        throw new Error("Event or user data not found");
      }

      console.log(
        `📧 Sending payment confirmation email to: ${registration.email}`
      );

      // Check if the organizer has granted Gmail permission for delegated sending
      let organizerUserId: string | null = null;
      if (event?.organizer_id) {
        organizerUserId = event.organizer_id;
      }

      const freshTokenData = organizerUserId
        ? await getFreshAccessToken(organizerUserId)
        : null;

      if (freshTokenData) {
        console.log(
          "🔑 Using organizer-delegated Gmail sending from:",
          freshTokenData.email
        );
      } else {
        console.log("⚠️ No organizer Gmail permission, using system email");
      }

      // Prepare email template data
      const eventDate = new Date(event.start_date).toLocaleDateString();
      const eventTime = new Date(event.start_date).toLocaleTimeString();
      const ticketUrl = `https://eventbase.abhipatel.site/ticket/${registration.id}`;

      const emailData: EmailTemplateData = {
        participantName: registration.name || "Participant",
        eventTitle: event.title,
        eventDate: eventDate,
        eventTime: eventTime,
        eventLocation: event.location || "TBA",
        qrCode: registration.qr_code,
        registrationId: registration.id,
        ticketUrl: ticketUrl,
      };

      const emailSent = await EmailService.sendRegistrationConfirmation(
        registration.email,
        emailData,
        freshTokenData?.email,
        freshTokenData?.accessToken,
        freshTokenData?.refreshToken
      );

      if (emailSent) {
        console.log(
          `✅ Payment confirmation email sent successfully to: ${registration.email}`
        );
      } else {
        console.log(
          `⚠️ Payment confirmation email could not be sent to: ${registration.email}`
        );
      }
    } catch (error) {
      console.error("Send payment confirmation email error:", error);
      throw error;
    }
  }
}
