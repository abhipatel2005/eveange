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
  async getAssignedEvents(options?: {
    limit?: number;
  }): Promise<ApiResponse<{ events: StaffEvent[] }>> {
    const params = new URLSearchParams();
    if (options?.limit) {
      params.append("limit", options.limit.toString());
    }
    const url = params.toString()
      ? `/staff/assigned-events?${params.toString()}`
      : "/staff/assigned-events";
    return apiClient.get(url);
  },
};
