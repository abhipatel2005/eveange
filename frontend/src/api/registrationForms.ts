import { apiClient } from "./client";
import type { ApiResponse } from "./client";

export type FieldType =
  | "text"
  | "email"
  | "phone"
  | "textarea"
  | "select"
  | "radio"
  | "checkbox"
  | "file"
  | "date"
  | "number"
  | "url";

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[]; // For select, radio, checkbox
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

export interface FormStep {
  title: string;
  description?: string;
  fields: string[]; // Field IDs for this step
}

export interface RegistrationForm {
  id: string;
  event_id: string;
  title: string;
  description?: string;
  fields: FormField[];
  is_multi_step: boolean;
  steps?: FormStep[];
  created_at: string;
  updated_at: string;
  event?: {
    id: string;
    title: string;
    organizer_id: string;
  };
}

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  fields: FormField[];
}

export interface CreateRegistrationFormData {
  title: string;
  description?: string;
  fields: FormField[];
  is_multi_step?: boolean;
  steps?: FormStep[];
}

export interface UpdateRegistrationFormData {
  title?: string;
  description?: string;
  fields?: FormField[];
  is_multi_step?: boolean;
  steps?: FormStep[];
}

export const RegistrationFormService = {
  // Get form templates
  async getFormTemplates(): Promise<
    ApiResponse<{ templates: FormTemplate[] }>
  > {
    return apiClient.get("/registration-forms/templates");
  },

  // Create registration form for an event
  async createRegistrationForm(
    eventId: string,
    data: CreateRegistrationFormData
  ): Promise<ApiResponse<{ form: RegistrationForm }>> {
    return apiClient.post(`/registration-forms/events/${eventId}/form`, data);
  },

  // Get registration form for an event
  async getRegistrationForm(
    eventId: string
  ): Promise<ApiResponse<{ form: RegistrationForm }>> {
    return apiClient.get(`/registration-forms/events/${eventId}/form`);
  },

  // Update registration form
  async updateRegistrationForm(
    eventId: string,
    formId: string,
    data: UpdateRegistrationFormData
  ): Promise<ApiResponse<{ form: RegistrationForm }>> {
    return apiClient.put(
      `/registration-forms/events/${eventId}/form/${formId}`,
      data
    );
  },

  // Delete registration form
  async deleteRegistrationForm(
    eventId: string,
    formId: string
  ): Promise<ApiResponse> {
    return apiClient.delete(
      `/registration-forms/events/${eventId}/form/${formId}`
    );
  },
};
