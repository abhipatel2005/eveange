import { apiClient, ApiResponse } from "./client";
import { User } from "../store/authStore";

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role: "participant" | "organizer";
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface RegistrationResponse {
  email?: string;
  requiresVerification?: boolean;
  emailError?: boolean;
  // Legacy fields for backward compatibility
  user?: User;
  accessToken?: string;
}

export class AuthService {
  static async login(data: LoginData): Promise<ApiResponse<AuthResponse>> {
    return apiClient.post<AuthResponse>("/auth/login", data);
  }

  static async register(
    data: RegisterData
  ): Promise<ApiResponse<RegistrationResponse>> {
    return apiClient.post<RegistrationResponse>("/auth/register", data);
  }

  static async logout(): Promise<ApiResponse<void>> {
    return apiClient.post<void>("/auth/logout");
  }

  static async refreshToken(): Promise<ApiResponse<{ accessToken: string }>> {
    return apiClient.post<{ accessToken: string }>("/auth/refresh");
  }

  static async getProfile(): Promise<ApiResponse<{ user: User }>> {
    return apiClient.get<{ user: User }>("/auth/profile");
  }

  // Helper method to check if user is authenticated
  static isAuthenticated(): boolean {
    try {
      const authStore = localStorage.getItem("auth-store");
      if (authStore) {
        const parsed = JSON.parse(authStore);
        return parsed.state?.isAuthenticated || false;
      }
    } catch {
      // Ignore parsing errors
    }
    return false;
  }

  // Helper method to get current user
  static getCurrentUser(): User | null {
    try {
      const authStore = localStorage.getItem("auth-store");
      if (authStore) {
        const parsed = JSON.parse(authStore);
        return parsed.state?.user || null;
      }
    } catch {
      // Ignore parsing errors
    }
    return null;
  }

  // Helper method to get access token
  static getAccessToken(): string | null {
    try {
      const authStore = localStorage.getItem("auth-store");
      if (authStore) {
        const parsed = JSON.parse(authStore);
        return parsed.state?.accessToken || null;
      }
    } catch {
      // Ignore parsing errors
    }
    return null;
  }
}
