import { Request, Response } from "express";
import { z } from "zod";
import { PaymentService } from "../services/paymentService.js";
import { supabase } from "../config/supabase.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

const CreatePaymentIntentSchema = z.object({
  registrationId: z.string().uuid(),
  eventId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().optional().default("usd"),
});

const VerifyPaymentSchema = z.object({
  paymentId: z.string().uuid(),
  paymentIntentId: z.string(),
  paymentMethodId: z.string().optional(),
});

export class PaymentController {
  // Create payment intent
  static async createPaymentIntent(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "Authentication required",
        });
        return;
      }

      const validatedData = CreatePaymentIntentSchema.parse(req.body);

      console.log(`💳 Creating payment intent for user: ${userId}`);
      console.log(`📋 Payment data:`, validatedData);

      const paymentIntent = await PaymentService.createPaymentIntent({
        ...validatedData,
        userId,
      });

      res.json({
        success: true,
        data: paymentIntent,
      });
    } catch (error) {
      console.error("Create payment intent error:", error);

      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: "Invalid payment data",
          details: error.errors,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  // Verify and complete payment
  static async verifyPayment(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "Authentication required",
        });
        return;
      }

      const validatedData = VerifyPaymentSchema.parse(req.body);

      const result = await PaymentService.completePayment(
        validatedData.paymentId,
        {
          paymentIntentId: validatedData.paymentIntentId,
          paymentMethodId: validatedData.paymentMethodId,
        }
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Verify payment error:", error);

      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: "Invalid verification data",
          details: error.errors,
        });
        return;
      }

      res.status(400).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Payment verification failed",
      });
    }
  }

  // Handle payment failure
  static async handlePaymentFailure(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "Authentication required",
        });
        return;
      }

      const { paymentId, reason } = req.body;

      if (!paymentId) {
        res.status(400).json({
          success: false,
          error: "Payment ID is required",
        });
        return;
      }

      // Update payment status to failed
      const { error } = await supabase
        .from("payments")
        .update({
          status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", paymentId);

      if (error) {
        throw new Error("Failed to update payment status");
      }
      res.json({
        success: true,
        message: "Payment failure recorded",
      });
    } catch (error) {
      console.error("Handle payment failure error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }

  // Get payment details
  static async getPaymentDetails(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      const { paymentId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "Authentication required",
        });
        return;
      }

      if (!paymentId) {
        res.status(400).json({
          success: false,
          error: "Payment ID is required",
        });
        return;
      }

      const payment = await PaymentService.getPaymentDetails(paymentId, userId);

      res.json({
        success: true,
        data: payment,
      });
    } catch (error) {
      console.error("Get payment details error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  // Handle Stripe webhook
  static async handleStripeWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers["stripe-signature"] as string;

      if (!signature) {
        res.status(400).json({
          success: false,
          error: "Missing stripe signature",
        });
        return;
      }

      // Handle the webhook
      const result = await PaymentService.handleWebhook(req.body, signature);

      res.json(result);
    } catch (error) {
      console.error("Webhook handling error:", error);
      res.status(400).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Webhook handling failed",
      });
    }
  }
}
