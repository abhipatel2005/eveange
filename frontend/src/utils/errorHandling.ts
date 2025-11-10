export interface ErrorHandlerOptions {
  action?: string; // e.g., "loading events", "saving data"
  showToast?: boolean;
  fallbackMessage?: string;
}

/**
 * Converts API errors and generic errors into user-friendly messages
 */
export function getErrorMessage(
  error: unknown,
  options: ErrorHandlerOptions = {}
): string {
  const { action, fallbackMessage } = options;
  const defaultMessage =
    fallbackMessage ||
    (action ? `Failed to ${action}` : "An unexpected error occurred");

  // Handle API errors with specific status codes
  if (error instanceof Error && "response" in error) {
    const apiError = error as any;
    const status = apiError.status;
    const errorResponse = apiError.response?.error || "";

    switch (status) {
      case 400:
        if (
          errorResponse.includes("validation") ||
          errorResponse.includes("invalid")
        ) {
          return "Please check your information and try again.";
        }
        if (errorResponse.includes("deadline")) {
          return "The deadline for this action has passed.";
        }
        if (
          errorResponse.includes("capacity") ||
          errorResponse.includes("full")
        ) {
          return "This action cannot be completed due to capacity limitations.";
        }
        if (errorResponse.includes("already")) {
          return "This action has already been completed.";
        }
        return (
          errorResponse || "Invalid request. Please check your information."
        );

      case 401:
        return "Your session has expired. Please log in again.";

      case 403:
        if (errorResponse.includes("organizer")) {
          return "As an organizer, you cannot perform this action on your own event.";
        }
        if (
          errorResponse.includes("permission") ||
          errorResponse.includes("access")
        ) {
          return "You don't have permission to perform this action.";
        }
        if (
          errorResponse.includes("invitation") ||
          errorResponse.includes("private")
        ) {
          return "This is a private resource that requires special access.";
        }
        return (
          errorResponse ||
          "Access denied. You don't have permission for this action."
        );

      case 404:
        if (action?.includes("event")) {
          return "The event could not be found. It may have been deleted or the link is incorrect.";
        }
        if (action?.includes("user") || action?.includes("staff")) {
          return "The user could not be found. They may have been removed or the information is outdated.";
        }
        return errorResponse || "The requested resource could not be found.";

      case 409:
        if (errorResponse.includes("already registered")) {
          return "You have already registered for this event.";
        }
        if (errorResponse.includes("already exists")) {
          return "This item already exists. Please use a different name or identifier.";
        }
        return errorResponse || "This action conflicts with existing data.";

      case 429:
        if (errorResponse.includes("Rate limit")) {
          return errorResponse; // Already has good message from client
        }
        return "Too many requests. Please wait a moment and try again.";

      case 500:
      case 502:
      case 503:
        return "Server error occurred. Please try again in a few moments.";

      default:
        return errorResponse || defaultMessage;
    }
  }

  // Handle generic JavaScript errors
  if (error instanceof Error) {
    if (
      error.message.includes("network") ||
      error.message.includes("fetch") ||
      error.message.includes("connection")
    ) {
      return "Unable to connect to the server. Please check your internet connection and try again.";
    }

    if (error.message.includes("timeout")) {
      return "The request timed out. Please try again.";
    }

    return error.message || defaultMessage;
  }

  // Handle string errors or unknown error types
  if (typeof error === "string") {
    return error;
  }

  return defaultMessage;
}

/**
 * Common error handling patterns for different types of operations
 */
export const ErrorPatterns = {
  REGISTRATION: {
    action: "register for the event",
    fallbackMessage: "Registration failed. Please try again.",
  },

  LOGIN: {
    action: "log in",
    fallbackMessage: "Login failed. Please check your credentials.",
  },

  LOADING_EVENTS: {
    action: "load events",
    fallbackMessage: "Unable to load events. Please refresh the page.",
  },

  SAVING_DATA: {
    action: "save your changes",
    fallbackMessage: "Failed to save. Please try again.",
  },

  STAFF_MANAGEMENT: {
    action: "manage staff",
    fallbackMessage: "Staff management operation failed.",
  },
} as const;

/**
 * Shows appropriate error message based on error type and context
 */
export function handleError(
  error: unknown,
  options: ErrorHandlerOptions = {}
): string {
  const message = getErrorMessage(error, options);

  if (options.showToast) {
    // Could integrate with toast library here
    // Only log errors in development
    if (import.meta.env.DEV) {
      console.error("Error:", message);
    }
  }

  return message;
}

/**
 * Simple error handler for basic cases (legacy compatibility)
 */
export function handleErrorSimple(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  return "An unexpected error occurred";
}

/**
 * Logs error details for debugging while returning user-friendly message
 */
export function handleErrorWithLogging(
  error: unknown,
  context?: string
): string {
  const message = handleErrorSimple(error);
  // Only log errors in development
  if (import.meta.env.DEV) {
    console.error(`Error${context ? ` in ${context}` : ""}:`, error);
  }
  return message;
}
