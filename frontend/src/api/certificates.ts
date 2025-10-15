import { apiClient } from "./client";
import type { ApiResponse } from "./client";

export interface Certificate {
  id: string;
  certificate_code: string;
  participant_name: string;
  participant_email: string;
  issued_at: string;
  file_url: string;
  event_id: string;
}

export interface CertificateVerification {
  valid: boolean;
  certificate?: {
    code: string;
    participantName: string;
    participantEmail: string;
    issuedAt: string;
    fileUrl: string;
    event: {
      title: string;
      date: string;
      location: string;
    };
  };
}

export interface CertificateGeneration {
  generated: number;
  total: number;
  certificates: Array<{
    participant: string;
    email: string;
    certificateCode: string;
    fileUrl: string;
  }>;
  errors?: string[];
}

export class CertificateService {
  // Get all past events for certificate generation
  static async getPastEvents(): Promise<
    ApiResponse<
      Array<{
        id: string;
        title: string;
        description: string;
        start_date: string;
        end_date: string;
        location: string;
        status: string;
        registrations_count: number;
      }>
    >
  > {
    return apiClient.get("/certificates/events");
  }

  // Get all certificates for an event (organizer only)
  static async getEventCertificates(eventId: string): Promise<
    ApiResponse<{
      event: { id: string; title: string; end_date: string };
      certificates: Certificate[];
    }>
  > {
    return apiClient.get(`/certificates/event/${eventId}`);
  }

  // Generate certificates for event participants (organizer only)
  static async generateCertificates(
    eventId: string,
    options?: {
      participantIds?: string[];
      templateId?: string;
    }
  ): Promise<ApiResponse<CertificateGeneration>> {
    return apiClient.post(`/certificates/events/${eventId}/generate`, {
      participantIds: options?.participantIds,
      templateId: options?.templateId,
    });
  }

  // Get all certificates for an event
  static async getCertificates(
    eventId: string
  ): Promise<ApiResponse<Certificate[]>> {
    return apiClient.get(`/certificates/events/${eventId}/certificates`);
  }

  // Email certificates to participants
  static async emailCertificates(
    eventId: string,
    options?: {
      certificateIds?: string[];
      message?: string;
    }
  ): Promise<
    ApiResponse<{
      results: Array<{
        certificateId: string;
        participantName: string;
        participantEmail: string;
        status: "sent" | "failed";
        error?: string;
      }>;
      summary: {
        total: number;
        sent: number;
        failed: number;
      };
    }>
  > {
    return apiClient.post(`/certificates/events/${eventId}/email`, {
      certificateIds: options?.certificateIds,
      message: options?.message,
    });
  }

  // Verify a certificate by code (public)
  static async verifyCertificate(
    code: string
  ): Promise<ApiResponse<CertificateVerification>> {
    return apiClient.get(`/certificates/verify/${code}`);
  }

  // Download certificate by code (public)
  static downloadCertificate(code: string): string {
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
    return `${apiUrl}/certificates/download/${code}`;
  }
}
