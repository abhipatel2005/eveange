import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
  id: string;
  email: string;
  name: string;
  role: "participant" | "organizer" | "admin" | "staff";
  organizationName?: string;
  phoneNumber?: string;
  createdAt?: string;
  lastLoginAt?: string;
  canCreateEvent?: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  setAuth: (user: User, accessToken: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateUser: (user: Partial<User>) => void;
  validateToken: () => boolean;
}

// Helper function to validate JWT token format
const isValidJWTFormat = (token: string): boolean => {
  if (!token || typeof token !== "string") return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  // Check if each part is valid base64
  try {
    parts.forEach((part) => {
      if (!part) throw new Error("Empty part");
      // Basic base64 check
      atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    });
    return true;
  } catch {
    return false;
  }
};

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      setAuth: (user: User, accessToken: string) => {
        set({
          user,
          accessToken,
          isAuthenticated: true,
          error: null,
        });
      },

      clearAuth: () => {
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      setLoading: (isLoading: boolean) => {
        set({ isLoading });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      updateUser: (userUpdate: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...userUpdate },
          });
        }
      },

      validateToken: () => {
        const { accessToken } = get();
        if (!accessToken || !isValidJWTFormat(accessToken)) {
          // Clear invalid token
          get().clearAuth();
          return false;
        }
        return true;
      },
    }),
    {
      name: "auth-store",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
