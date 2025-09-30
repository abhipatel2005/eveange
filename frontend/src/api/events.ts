import { apiClient } from "./client";
import type { ApiResponse } from "./client";

export interface Event {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  location: string;
  capacity: number;
  banner_url?: string;
  visibility: "public" | "private" | "invite-only";
  registration_deadline?: string;
  is_paid: boolean;
  price?: number;
  created_at: string;
  updated_at: string;
  organizer?: {
    id: string;
    name: string;
    email: string;
    organization_name?: string;
  };
  category?: {
    id: string;
    name: string;
    color: string;
  };
  registrations?: any[];
}

export interface CreateEventData {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  capacity: number;
  categoryId?: string;
  bannerUrl?: string;
  visibility: "public" | "private" | "invite-only";
  registrationDeadline?: string;
  isPaid: boolean;
  price?: number;
}

export interface UpdateEventData {
  title?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  capacity?: number;
  categoryId?: string;
  bannerUrl?: string;
  visibility?: "public" | "private" | "invite-only";
  registrationDeadline?: string;
  isPaid?: boolean;
  price?: number;
}

export interface EventsResponse {
  events: Event[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface GetEventsParams {
  page?: number;
  limit?: number;
  visibility?: string;
  categoryId?: string;
  organizerId?: string;
  search?: string;
  upcoming?: boolean;
}

export const EventService = {
  // Create a new event
  async createEvent(
    data: CreateEventData
  ): Promise<ApiResponse<{ event: Event }>> {
    return apiClient.post("/events", data);
  },

  // Get all events with filters
  async getEvents(
    params?: GetEventsParams
  ): Promise<ApiResponse<EventsResponse>> {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.visibility) queryParams.append("visibility", params.visibility);
    if (params?.categoryId) queryParams.append("categoryId", params.categoryId);
    if (params?.organizerId)
      queryParams.append("organizerId", params.organizerId);
    if (params?.search) queryParams.append("search", params.search);
    if (params?.upcoming)
      queryParams.append("upcoming", params.upcoming.toString());

    const url = queryParams.toString()
      ? `/events?${queryParams.toString()}`
      : "/events";
    return apiClient.get(url);
  },

  // Get a single event by ID
  async getEventById(id: string): Promise<ApiResponse<{ event: Event }>> {
    return apiClient.get(`/events/${id}`);
  },

  // Update an event
  async updateEvent(
    id: string,
    data: UpdateEventData
  ): Promise<ApiResponse<{ event: Event }>> {
    return apiClient.put(`/events/${id}`, data);
  },

  // Delete an event
  async deleteEvent(id: string): Promise<ApiResponse> {
    return apiClient.delete(`/events/${id}`);
  },

  // Get events for the authenticated organizer
  async getMyEvents(): Promise<ApiResponse<{ events: Event[] }>> {
    return apiClient.get("/events/my/events");
  },
};
