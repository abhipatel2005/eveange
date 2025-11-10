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

export interface Form {
  id: string;
  event_id: string;
  title: string;
  description?: string;
  form_type: "registration" | "feedback";
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

export interface CreateFormData {
  title: string;
  description?: string;
  form_type: "registration" | "feedback";
  fields: FormField[];
  is_multi_step?: boolean;
  steps?: FormStep[];
}

export interface UpdateFormData {
  title?: string;
  description?: string;
  form_type?: "registration" | "feedback";
  fields?: FormField[];
  is_multi_step?: boolean;
  steps?: FormStep[];
}

export const FormService = {
  // Get form templates
  async getFormTemplates(): Promise<
    ApiResponse<{ templates: FormTemplate[] }>
  > {
    return apiClient.get("/forms/templates");
  },

  // Create form for an event
  async createForm(
    eventId: string,
    data: CreateFormData
  ): Promise<ApiResponse<{ form: Form }>> {
    return apiClient.post(`/forms/events/${eventId}/form`, data);
  },

  // Get form for an event (by type)
  async getForm(
    eventId: string,
    formType?: "registration" | "feedback"
  ): Promise<ApiResponse<{ form: Form }>> {
    const params = formType ? `?type=${formType}` : "";
    return apiClient.get(`/forms/events/${eventId}/form${params}`);
  },

  // Update form
  async updateForm(
    eventId: string,
    formId: string,
    data: UpdateFormData
  ): Promise<ApiResponse<{ form: Form }>> {
    return apiClient.put(`/forms/events/${eventId}/form/${formId}`, data);
  },

  // Delete form
  async deleteForm(eventId: string, formId: string): Promise<ApiResponse> {
    return apiClient.delete(`/forms/events/${eventId}/form/${formId}`);
  },
};
