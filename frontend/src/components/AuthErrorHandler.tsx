import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { AlertCircle, LogIn } from "lucide-react";

interface AuthErrorHandlerProps {
  error: any;
  children?: React.ReactNode;
}

export const AuthErrorHandler: React.FC<AuthErrorHandlerProps> = ({
  error,
  children,
}) => {
  const navigate = useNavigate();
  const { clearAuth, setError } = useAuthStore();

  useEffect(() => {
    // Check if the error is a token expiration
    if (error?.response?.code === "TOKEN_EXPIRED" || error?.status === 401) {
      if (import.meta.env.DEV) {
        console.log("🔓 Detected authentication error, clearing auth");
      }

      // Clear auth state
      clearAuth();

      // Set a user-friendly error message
      setError("Your session has expired. Please log in again.");

      // Redirect to login page immediately
      navigate("/login", { replace: true });
    }
  }, [error, clearAuth, setError, navigate]);

  // If it's an auth error, show a specific message
  if (error?.response?.code === "TOKEN_EXPIRED" || error?.status === 401) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-auto p-6">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>

            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Session Expired
            </h3>

            <p className="text-sm text-gray-500 mb-6">
              Your session has expired. You will be redirected to the login page
              automatically.
            </p>

            <button
              onClick={() => navigate("/login")}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // For other errors, render children normally
  return <>{children}</>;
};

// Hook to handle API errors consistently
export const useApiErrorHandler = () => {
  const navigate = useNavigate();
  const { clearAuth, setError } = useAuthStore();

  const handleApiError = (error: any) => {
    console.error("API Error:", error);

    // Handle token expiration
    if (error?.response?.code === "TOKEN_EXPIRED" || error?.status === 401) {
      if (import.meta.env.DEV) {
        console.log("🔓 Token expired, handling authentication error");
      }
      clearAuth();
      setError("Your session has expired. Please log in again.");

      // Redirect immediately
      navigate("/login", { replace: true });

      return "Your session has expired. Redirecting to login...";
    }

    // Handle other API errors
    if (error?.response?.error) {
      return error.response.error;
    }

    // Generic error
    return "An unexpected error occurred. Please try again.";
  };

  return { handleApiError };
};
