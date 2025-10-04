import { apiClient } from "./client";
import type { ApiResponse } from "./client";

export interface PaymentIntent {
  paymentId: string;
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  publishableKey: string;
  eventTitle: string;
  participantName: string;
  participantEmail: string;
}

export interface PaymentVerification {
  paymentId: string;
  paymentIntentId: string;
  paymentMethodId?: string;
}

export interface PaymentDetails {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_date?: string;
  failure_reason?: string;
  payment_method: string;
  gateway_payment_id?: string;
  gateway_order_id?: string;
  registration: {
    id: string;
    name: string;
    email: string;
    event: {
      id: string;
      title: string;
      start_date: string;
      location: string;
    };
  };
}

export const PaymentService = {
  // Create payment intent
  async createPaymentIntent(
    registrationId: string,
    eventId: string,
    amount: number,
    currency = "USD"
  ): Promise<ApiResponse<PaymentIntent>> {
    return apiClient.post("/payments/create-intent", {
      registrationId,
      eventId,
      amount,
      currency,
    });
  },

  // Verify payment
  async verifyPayment(verificationData: PaymentVerification): Promise<
    ApiResponse<{
      success: boolean;
      message: string;
      paymentId: string;
      registrationId: string;
    }>
  > {
    return apiClient.post("/payments/verify", verificationData);
  },

  // Handle payment failure
  async handlePaymentFailure(
    paymentId: string,
    reason: string
  ): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post("/payments/failure", {
      paymentId,
      reason,
    });
  },

  // Get payment details
  async getPaymentDetails(
    paymentId: string
  ): Promise<ApiResponse<PaymentDetails>> {
    return apiClient.get(`/payments/${paymentId}`);
  },
};
