// Utility to clean up corrupted auth tokens from localStorage
export const cleanupAuthTokens = () => {
  const keys = ["token", "accessToken", "authToken"];

  keys.forEach((key) => {
    const token = localStorage.getItem(key);
    if (token) {
      // Check if it's a valid JWT format
      if (!token.includes(".") || token.split(".").length !== 3) {
        if (import.meta.env.DEV) {
          console.log(`Removing invalid token from localStorage: ${key}`);
        }
        localStorage.removeItem(key);
      }
    }
  });
};

// Function to validate JWT token format
export const isValidJWTFormat = (token: string): boolean => {
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

// Clean up on app initialization
if (typeof window !== "undefined") {
  cleanupAuthTokens();
}
