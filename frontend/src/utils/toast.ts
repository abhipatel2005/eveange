import toast from "react-hot-toast";

/**
 * Utility for showing user-friendly error messages with toast notifications
 */

/**
 * Parse error from various sources (API response, Error object, string, etc.)
 */
export function parseError(error: any): string {
  // Handle string errors
  if (typeof error === "string") {
    return error;
  }

  // Handle Error objects
  if (error instanceof Error) {
    return error.message;
  }

  // Handle API response errors
  if (error?.response?.data?.error) {
    return error.response.data.error;
  }

  if (error?.error) {
    return error.error;
  }

  if (error?.message) {
    return error.message;
  }

  // Handle validation errors
  if (error?.errors && Array.isArray(error.errors)) {
    return error.errors.map((e: any) => e.message || e).join(", ");
  }

  // Default message
  return "An unexpected error occurred";
}

/**
 * Get user-friendly error message based on error type
 */
export function getUserFriendlyMessage(error: any): string {
  const errorMessage = parseError(error).toLowerCase();

  // Network errors
  if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
    return "Network error. Please check your internet connection and try again.";
  }

  // Timeout errors
  if (errorMessage.includes("timeout") || errorMessage.includes("timed out")) {
    return "Request timed out. Please try again in a moment.";
  }

  // Upload errors
  if (errorMessage.includes("upload") || errorMessage.includes("file")) {
    if (errorMessage.includes("size") || errorMessage.includes("large")) {
      return "File is too large. Please upload a smaller file.";
    }
    if (errorMessage.includes("format") || errorMessage.includes("type")) {
      return "Invalid file format. Please upload a valid file.";
    }
    return "Upload failed. Please check your file and try again.";
  }

  // Authentication errors
  if (
    errorMessage.includes("unauthorized") ||
    errorMessage.includes("authentication") ||
    errorMessage.includes("token")
  ) {
    return "Session expired. Please log in again.";
  }

  // Permission errors
  if (
    errorMessage.includes("forbidden") ||
    errorMessage.includes("permission")
  ) {
    return "You don't have permission to perform this action.";
  }

  // Validation errors
  if (errorMessage.includes("validation") || errorMessage.includes("invalid")) {
    return parseError(error); // Return original validation message
  }

  // Server errors
  if (errorMessage.includes("500") || errorMessage.includes("server error")) {
    return "Server error. Please try again in a few moments.";
  }

  // Database errors
  if (errorMessage.includes("database") || errorMessage.includes("query")) {
    return "Database error. Please try again later.";
  }

  // Return original message if no pattern matches
  return parseError(error);
}

/**
 * Show error toast with user-friendly message
 */
export function showErrorToast(error: any, customMessage?: string): void {
  const message = customMessage || getUserFriendlyMessage(error);
  toast.error(message, {
    duration: 5000,
    icon: "❌",
  });
}

/**
 * Show success toast
 */
export function showSuccessToast(message: string): void {
  toast.success(message, {
    duration: 4000,
    icon: "✅",
  });
}

/**
 * Show info toast
 */
export function showInfoToast(message: string): void {
  toast(message, {
    duration: 4000,
    icon: "ℹ️",
  });
}

/**
 * Show warning toast
 */
export function showWarningToast(message: string): void {
  toast(message, {
    duration: 4000,
    icon: "⚠️",
    style: {
      background: "#f59e0b",
      color: "#fff",
    },
  });
}

/**
 * Show loading toast (returns toast id for dismissal)
 */
export function showLoadingToast(message: string = "Processing..."): string {
  return toast.loading(message);
}

/**
 * Dismiss a specific toast
 */
export function dismissToast(toastId: string): void {
  toast.dismiss(toastId);
}

/**
 * Handle async operations with loading and error toasts
 */
export async function handleAsyncWithToast<T>(
  operation: () => Promise<T>,
  {
    loadingMessage = "Processing...",
    successMessage,
    errorMessage,
  }: {
    loadingMessage?: string;
    successMessage?: string;
    errorMessage?: string;
  } = {}
): Promise<T | null> {
  const toastId = showLoadingToast(loadingMessage);

  try {
    const result = await operation();
    dismissToast(toastId);

    if (successMessage) {
      showSuccessToast(successMessage);
    }

    return result;
  } catch (error) {
    dismissToast(toastId);
    showErrorToast(error, errorMessage);
    return null;
  }
}
