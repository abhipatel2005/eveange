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
        let errorMessage = "An unexpected error occurred";

        if (error instanceof ApiError) {
          if (error.status === 401) {
            errorMessage =
              "Invalid email or password. Please check your credentials and try again.";
          } else if (error.status === 403) {
            // Check if this is an email verification issue
            const responseData = error.response as any;
            if (responseData?.requiresVerification) {
              if (responseData?.verificationEmailSent) {
                errorMessage =
                  "Please verify your email address. We've sent a new verification email to your inbox.";
                toast.success(
                  "New verification email sent! Please check your inbox."
                );
              } else {
                errorMessage =
                  "Please verify your email address before logging in. Check your inbox for verification instructions.";
              }
            } else {
              errorMessage =
                "Your account has been disabled. Please contact support for assistance.";
            }
          } else if (error.status === 429) {
            errorMessage =
              "Too many login attempts. Please wait a few minutes and try again.";
          } else if (error.status === 500) {
            errorMessage =
              "Server error occurred. Please try again in a few moments.";
          } else {
            errorMessage =
              error.response.error ||
              "Login failed. Please check your credentials.";
          }
        } else if (error instanceof Error) {
          if (
            error.message.includes("network") ||
            error.message.includes("fetch")
          ) {
            errorMessage =
              "Unable to connect to the server. Please check your internet connection.";
          } else {
            errorMessage = error.message || "Login failed. Please try again.";
          }
        }

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

        if (response.success) {
          if (response.data?.requiresVerification) {
            toast.success(
              "Account created! Please check your email for verification instructions."
            );
            navigate("/login");
            return true;
          } else if (response.data?.user && response.data?.accessToken) {
            // Legacy flow - direct authentication (shouldn't happen with new flow)
            setAuth(response.data.user, response.data.accessToken);
            toast.success("Account created successfully!");
            navigate("/dashboard");
            return true;
          }
        } else {
          throw new Error(response.error || "Registration failed");
        }
      } catch (error) {
        let errorMessage = "An unexpected error occurred";

        if (error instanceof ApiError) {
          if (error.status === 409) {
            errorMessage =
              "An account with this email already exists. Please try logging in instead.";
          } else if (error.status === 400) {
            if (error.response.error?.includes("email")) {
              errorMessage = "Please provide a valid email address.";
            } else if (error.response.error?.includes("password")) {
              errorMessage = "Password must be at least 8 characters long.";
            } else if (error.response.error?.includes("name")) {
              errorMessage = "Please provide your full name.";
            } else {
              errorMessage =
                error.response.error ||
                "Please check your information and try again.";
            }
          } else if (error.status === 500) {
            errorMessage =
              "Server error occurred. Please try again in a few moments.";
          } else {
            errorMessage =
              error.response.error || "Registration failed. Please try again.";
          }
        } else if (error instanceof Error) {
          if (
            error.message.includes("network") ||
            error.message.includes("fetch")
          ) {
            errorMessage =
              "Unable to connect to the server. Please check your internet connection.";
          } else {
            errorMessage =
              error.message || "Registration failed. Please try again.";
          }
        }

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
    updateUser,

    // Utility functions
    isOrganizer: user?.role === "organizer" || user?.role === "admin",
    isAdmin: user?.role === "admin",
    clearError: () => setError(null),
  };
};
