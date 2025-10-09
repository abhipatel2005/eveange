/**
 * Handles errors and returns user-friendly error messages
 */
export function handleError(error: unknown): string {
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
  const message = handleError(error);
  // Only log errors in development
  if (import.meta.env.DEV) {
    console.error(`Error${context ? ` in ${context}` : ""}:`, error);
  }
  return message;
}
