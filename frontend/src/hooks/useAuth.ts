import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/authStore";
import { AuthService, LoginData, RegisterData } from "../api/auth";
import { ApiError } from "../api/client";

export const useAuth = () => {
  const navigate = useNavigate();
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    setAuth,
    clearAuth,
    setLoading,
    setError,
    updateUser,
  } = useAuthStore();

  const login = useCallback(
    async (data: LoginData) => {
      try {
        setLoading(true);
        setError(null);

        const response = await AuthService.login(data);

        if (response.success && response.data) {
          setAuth(response.data.user, response.data.accessToken);
          toast.success("Login successful!");
          navigate("/dashboard");
          return true;
        } else {
          throw new Error(response.error || "Login failed");
        }
      } catch (error) {
        const errorMessage =
          error instanceof ApiError
            ? error.response.error || "Login failed"
            : "An unexpected error occurred";

        setError(errorMessage);
        toast.error(errorMessage);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [setAuth, setLoading, setError, navigate]
  );

  const register = useCallback(
    async (data: RegisterData) => {
      try {
        setLoading(true);
        setError(null);

        const response = await AuthService.register(data);

        if (response.success && response.data) {
          setAuth(response.data.user, response.data.accessToken);
          toast.success("Account created successfully!");
          navigate("/dashboard");
          return true;
        } else {
          throw new Error(response.error || "Registration failed");
        }
      } catch (error) {
        const errorMessage =
          error instanceof ApiError
            ? error.response.error || "Registration failed"
            : "An unexpected error occurred";

        setError(errorMessage);
        toast.error(errorMessage);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [setAuth, setLoading, setError, navigate]
  );

  const logout = useCallback(async () => {
    try {
      setLoading(true);
      await AuthService.logout();
      clearAuth();
      toast.success("Logged out successfully");
      navigate("/");
    } catch (error) {
      // Even if the API call fails, clear local auth state
      clearAuth();
      navigate("/");
    } finally {
      setLoading(false);
    }
  }, [clearAuth, setLoading, navigate]);

  const refreshToken = useCallback(async () => {
    try {
      const response = await AuthService.refreshToken();

      if (response.success && response.data) {
        // Update only the access token, keep user data
        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
          setAuth(currentUser, response.data.accessToken);
        }
        return true;
      } else {
        throw new Error("Token refresh failed");
      }
    } catch (error) {
      // If refresh fails, redirect to login
      clearAuth();
      navigate("/login");
      return false;
    }
  }, [setAuth, clearAuth, navigate]);

  const checkAuthStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await AuthService.getProfile();

      if (response.success && response.data) {
        updateUser(response.data.user);
      } else {
        clearAuth();
      }
    } catch (error) {
      // Try to refresh token if profile fetch fails
      const refreshSuccess = await refreshToken();
      if (!refreshSuccess) {
        clearAuth();
      }
    } finally {
      setLoading(false);
    }
  }, [updateUser, clearAuth, refreshToken, setLoading]);

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,

    // Actions
    login,
    register,
    logout,
    refreshToken,
    checkAuthStatus,

    // Utility functions
    isOrganizer: user?.role === "organizer" || user?.role === "admin",
    isAdmin: user?.role === "admin",
    clearError: () => setError(null),
  };
};
