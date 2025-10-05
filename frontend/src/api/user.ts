import { apiClient, ApiResponse } from "./client";
import { User } from "../store/authStore";

export interface OrganizerUpgradeData {
  organizationName: string;
  phoneNumber?: string;
  description?: string;
}

export interface UserProfile extends User {
  organizationName?: string;
  phoneNumber?: string;
  description?: string;
}

export class UserService {
  /**
   * Upgrade user from participant to organizer
   */
  static async upgradeToOrganizer(
    data: OrganizerUpgradeData
  ): Promise<ApiResponse<{ user: UserProfile; message: string }>> {
    return apiClient.post<{ user: UserProfile; message: string }>(
      "/users/upgrade-to-organizer",
      data
    );
  }

  /**
   * Get user profile with organizer details
   */
  static async getProfile(): Promise<ApiResponse<{ user: UserProfile }>> {
    return apiClient.get<{ user: UserProfile }>("/users/profile");
  }
}
