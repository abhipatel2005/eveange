import { apiClient } from "./client";
import type { ApiResponse } from "./client";

export interface Registration {
  id: string;
  status: "pending" | "confirmed" | "cancelled" | "attended";
  payment_status?:
    | "not_required"
    | "pending"
    | "completed"
    | "failed"
    | "refunded";
  email: string;
  name: string;
  responses?: Record<string, any>; // Changed from form_data to responses
  qr_code?: string;
  created_at: string;
  updated_at: string;
  event?: {
    id: string;
    title: string;
    description: string;
    start_date: string;
    end_date: string;
    location: string;
    banner_url?: string;
    is_paid: boolean;
    price?: number;
  };
  user?: {
    id: string;
    name: string;
    email: string;
    phone_number?: string;
  };
}

export interface RegistrationFormData {
  [key: string]: any;
}

export interface RegisterForEventData {
  formData: RegistrationFormData;
}

export const RegistrationService = {
  // Register for an event
  async registerForEvent(
    eventId: string,
    data: RegisterForEventData
  ): Promise<
    ApiResponse<{
      registration: Registration;
      requiresPayment?: boolean;
      amount?: number;
    }>
  > {
    return apiClient.post(`/registrations/events/${eventId}/register`, data);
  },

  // Get registrations for an event (organizers only)
  async getEventRegistrations(
    eventId: string
  ): Promise<ApiResponse<{ registrations: Registration[] }>> {
    return apiClient.get(`/registrations/events/${eventId}/registrations`);
  },

  // Check if user is registered for an event
  async checkRegistrationStatus(
    eventId: string
  ): Promise<
    ApiResponse<{ isRegistered: boolean; registration: Registration | null }>
  > {
    return apiClient.get(
      `/registrations/events/${eventId}/registration-status`
    );
  },

  // Get user's registrations
  async getUserRegistrations(): Promise<
    ApiResponse<{ registrations: Registration[] }>
  > {
    return apiClient.get("/registrations/my-registrations");
  },

  // Cancel a registration
  async cancelRegistration(registrationId: string): Promise<ApiResponse> {
    return apiClient.put(`/registrations/${registrationId}/cancel`);
  },
};
