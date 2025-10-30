// Add staff assigned events API to EventService
import { apiClient } from "./client";
import type { ApiResponse } from "./client";

export interface StaffEvent {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  location: string;
  permissions: {
    can_check_in?: boolean;
    can_view_stats?: boolean;
  };
  assigned_at: string;
}

export const StaffService = {
  async getAssignedEvents(): Promise<ApiResponse<{ events: StaffEvent[] }>> {
    return apiClient.get("/staff/assigned-events");
  },
};
