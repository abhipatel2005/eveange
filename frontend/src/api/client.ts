import { useAuthStore } from "../store/authStore";
import { apiRateLimiter } from "../utils/debounce";

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
    const rateLimitKey = `${options.method || "GET"}:${endpoint}`;

    // Check rate limit (client-side only - no toast)
    if (!apiRateLimiter.isAllowed(rateLimitKey)) {
      const resetTime = apiRateLimiter.getResetTime(rateLimitKey);
      const secondsRemaining = Math.ceil((resetTime - Date.now()) / 1000);

      const message = `Too many requests. Please wait ${secondsRemaining} seconds.`;

      throw new ApiError(429, {
        success: false,
        error: message,
      });
    }

    const isFormData = options.body instanceof FormData;
    const config: RequestInit = {
      headers: {
        // Don't set Content-Type for FormData - let browser set it with boundary
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
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
      if (import.meta.env.DEV) {
        console.log("🔐 Request with token for:", endpoint);
      }
    } else if (import.meta.env.DEV) {
      console.log("⚠️ No token found for request:", endpoint);
    }

    try {
      if (import.meta.env.DEV) {
        console.log("📤 Making request to:", url);
        // NEVER log headers as they contain sensitive Authorization tokens
        console.log("📤 Request method:", config.method);
      }
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        if (import.meta.env.DEV) {
          console.log("❌ Request failed:");
        }

        // Handle token expiration
        if (response.status === 401 && data.code === "TOKEN_EXPIRED") {
          if (import.meta.env.DEV) {
            console.log(
              "🔓 Token expired, clearing auth and redirecting to login"
            );
          }
          this.handleTokenExpiration();
          throw new ApiError(response.status, {
            ...data,
            shouldRedirectToLogin: true,
          });
        }

        throw new ApiError(response.status, data);
      }

      if (import.meta.env.DEV) {
        console.log("✅ Request successful:");
      }
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
        // if (import.meta.env.DEV) {
        //   console.log("Retrieved token from store state: Token exists");
        // }
        return authState.accessToken;
      }

      // Fallback to localStorage
      const authStore = localStorage.getItem("auth-store");
      if (authStore) {
        const parsed = JSON.parse(authStore);
        // Zustand persist stores the data directly in the parsed object
        const token = parsed.state?.accessToken || parsed.accessToken || null;
        // if (import.meta.env.DEV) {
        //   console.log(
        //     "Retrieved token from localStorage:",
        //     token ? "Token exists" : "No token found"
        //   );
        // }
        return token;
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error retrieving token:", error);
      }
    }
    return null;
  }

  private handleTokenExpiration(): void {
    // Clear auth from store
    const authStore = useAuthStore.getState();
    authStore.clearAuth();

    // Show user-friendly message
    authStore.setError("Your session has expired. Please log in again.");

    // Redirect to login page immediately
    window.location.href = "/login";
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const isFormData = data instanceof FormData;
    const config: RequestInit = {
      method: "POST",
    };

    if (isFormData) {
      // For FormData, let the browser set Content-Type with boundary
      config.body = data;
    } else {
      // For regular data, use JSON
      config.body = data ? JSON.stringify(data) : undefined;
    }

    return this.request<T>(endpoint, config);
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
