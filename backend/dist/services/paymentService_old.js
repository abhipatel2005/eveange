import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
// Initialize Stripe (only if environment variables are provided)
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2023-10-16",
    });
}
export class PaymentService {
    // Create a payment intent
    static async createPaymentIntent(paymentData) {
        try {
            if (!razorpay) {
                throw new Error("Payment gateway not configured. Please contact administrator.");
            }
            const { registrationId, eventId, userId, amount, currency = "INR", } = paymentData;
            // Fetch event and registration details
            const { data: registration, error: regError } = await supabase
                .from("registrations")
                .select(`
          id, email, name,
          event:event_id(id, title, is_paid, price)
        `)
                .eq("id", registrationId)
                .single();
            if (regError || !registration) {
                throw new Error("Registration not found");
            }
            const event = Array.isArray(registration.event)
                ? registration.event[0]
                : registration.event;
            if (!event.is_paid || !event.price) {
                throw new Error("Event is not a paid event");
            }
            if (event.price !== amount) {
                throw new Error("Amount mismatch");
            }
            // Create Razorpay order
            const orderOptions = {
                amount: amount * 100, // Razorpay expects amount in paise
                currency,
                receipt: `reg_${registrationId}_${Date.now()}`,
                notes: {
                    registration_id: registrationId,
                    event_id: eventId,
                    user_id: userId,
                    event_title: event.title,
                    participant_name: registration.name,
                    participant_email: registration.email,
                },
            };
            const razorpayOrder = await razorpay.orders.create(orderOptions);
            // Store payment record in database
            const { data: payment, error: paymentError } = await supabase
                .from("payments")
                .insert({
                registration_id: registrationId,
                event_id: eventId,
                user_id: userId,
                amount,
                currency,
                payment_method: "razorpay",
                gateway_order_id: razorpayOrder.id,
                status: "pending",
                gateway_response: razorpayOrder,
            })
                .select()
                .single();
            if (paymentError) {
                console.error("Failed to create payment record:", paymentError);
                throw new Error("Failed to create payment record");
            }
            // Update registration payment status
            await supabase
                .from("registrations")
                .update({
                payment_status: "pending",
                payment_id: payment.id,
            })
                .eq("id", registrationId);
            return {
                paymentId: payment.id,
                orderId: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                key: process.env.RAZORPAY_KEY_ID,
                name: "Event Management Platform",
                description: `Payment for ${event.title}`,
                prefill: {
                    name: registration.name,
                    email: registration.email,
                },
                theme: {
                    color: "#3B82F6",
                },
            };
        }
        catch (error) {
            console.error("Payment order creation error:", error);
            throw error;
        }
    }
    // Verify payment signature
    static verifyPaymentSignature(verificationData) {
        try {
            if (!process.env.RAZORPAY_KEY_SECRET) {
                console.error("Razorpay key secret not configured");
                return false;
            }
            const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = verificationData;
            const body = razorpay_order_id + "|" + razorpay_payment_id;
            const expectedSignature = crypto
                .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
                .update(body.toString())
                .digest("hex");
            return expectedSignature === razorpay_signature;
        }
        catch (error) {
            console.error("Payment verification error:", error);
            return false;
        }
    }
    // Complete payment after verification
    static async completePayment(paymentId, verificationData) {
        try {
            // Verify payment signature
            if (!this.verifyPaymentSignature(verificationData)) {
                throw new Error("Invalid payment signature");
            }
            // Get payment record
            const { data: payment, error: paymentError } = await supabase
                .from("payments")
                .select(`
          id, registration_id, status,
          registration:registration_id(id, event_id)
        `)
                .eq("id", paymentId)
                .single();
            if (paymentError || !payment) {
                throw new Error("Payment record not found");
            }
            if (payment.status !== "pending") {
                throw new Error("Payment is not in pending status");
            }
            // Update payment status
            const { error: updateError } = await supabase
                .from("payments")
                .update({
                status: "completed",
                payment_date: new Date().toISOString(),
                gateway_payment_id: verificationData.razorpay_payment_id,
                gateway_response: verificationData,
            })
                .eq("id", paymentId);
            if (updateError) {
                throw new Error("Failed to update payment status");
            }
            // Update registration status to confirmed and payment status to completed
            const registration = Array.isArray(payment.registration)
                ? payment.registration[0]
                : payment.registration;
            await supabase
                .from("registrations")
                .update({
                status: "confirmed",
                payment_status: "completed",
            })
                .eq("id", registration.id);
            return {
                success: true,
                message: "Payment completed successfully",
                paymentId,
                registrationId: registration.id,
            };
        }
        catch (error) {
            console.error("Payment completion error:", error);
            // Update payment status to failed
            if (paymentId) {
                await supabase
                    .from("payments")
                    .update({
                    status: "failed",
                    failure_reason: error instanceof Error ? error.message : "Unknown error",
                })
                    .eq("id", paymentId);
            }
            throw error;
        }
    }
    // Handle payment failure
    static async handlePaymentFailure(paymentId, reason) {
        try {
            // Update payment status
            const { error: paymentError } = await supabase
                .from("payments")
                .update({
                status: "failed",
                failure_reason: reason,
            })
                .eq("id", paymentId);
            if (paymentError) {
                console.error("Failed to update payment failure:", paymentError);
            }
            // Update registration payment status
            const { data: payment } = await supabase
                .from("payments")
                .select("registration_id")
                .eq("id", paymentId)
                .single();
            if (payment) {
                await supabase
                    .from("registrations")
                    .update({
                    payment_status: "failed",
                })
                    .eq("id", payment.registration_id);
            }
        }
        catch (error) {
            console.error("Payment failure handling error:", error);
        }
    }
    // Get payment details
    static async getPaymentDetails(paymentId) {
        try {
            const { data: payment, error } = await supabase
                .from("payments")
                .select(`
          id, amount, currency, status, payment_date, failure_reason,
          payment_method, gateway_payment_id, gateway_order_id,
          registration:registration_id(
            id, name, email,
            event:event_id(id, title, start_date, location)
          )
        `)
                .eq("id", paymentId)
                .single();
            if (error) {
                throw new Error("Payment not found");
            }
            return payment;
        }
        catch (error) {
            console.error("Get payment details error:", error);
            throw error;
        }
    }
}
