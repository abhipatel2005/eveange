import { useAuthStore } from "../store/authStore";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: any[];
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public response: ApiResponse,
    message?: string
  ) {
    super(message || response.error || "An error occurred");
    this.name = "ApiError";
  }
}

export class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      credentials: "include", // Include cookies for refresh tokens
      ...options,
    };

    // Add authorization header if token exists
    const token = this.getStoredToken();
    if (token) {
      (config.headers as Record<string, string>)[
        "Authorization"
      ] = `Bearer ${token}`;
      console.log("🔐 Request with token for:", endpoint);
    } else {
      console.log("⚠️ No token found for request:", endpoint);
    }

    try {
      console.log("📤 Making request to:", url);
      console.log("📤 Headers:", config.headers);
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        console.log("❌ Request failed:", response.status, data);
        throw new ApiError(response.status, data);
      }

      console.log("✅ Request successful:", data);
      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      // Network or other errors
      throw new ApiError(0, {
        success: false,
        error: "Network error or server unavailable",
      });
    }
  }

  private getStoredToken(): string | null {
    try {
      // First try to get token from store state
      const authState = useAuthStore.getState();
      if (authState.accessToken) {
        console.log("Retrieved token from store state: Token exists");
        return authState.accessToken;
      }

      // Fallback to localStorage
      const authStore = localStorage.getItem("auth-store");
      if (authStore) {
        const parsed = JSON.parse(authStore);
        // Zustand persist stores the data directly in the parsed object
        const token = parsed.state?.accessToken || parsed.accessToken || null;
        console.log(
          "Retrieved token from localStorage:",
          token ? "Token exists" : "No token found"
        );
        return token;
      }
    } catch (error) {
      console.error("Error retrieving token:", error);
    }
    console.log("No token found in store or localStorage");
    return null;
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

export const apiClient = new ApiClient();
