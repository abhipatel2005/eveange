/**
 * Security Configuration
 * Handles sensitive data and logging in a secure manner
 */

// Production-safe logging utility
export const secureLog = {
  info: (message: string, data?: any) => {
    if (import.meta.env.DEV) {
      console.log(message, data);
    }
  },

  error: (message: string, error?: any) => {
    if (import.meta.env.DEV) {
      console.error(message, error);
    } else {
      // In production, only log non-sensitive error information
      console.error(message);
    }
  },

  warn: (message: string, data?: any) => {
    if (import.meta.env.DEV) {
      console.warn(message, data);
    }
  },

  // Never log sensitive data like tokens, passwords, or personal info
  debug: (message: string, data?: any) => {
    if (import.meta.env.DEV) {
      console.log(`[DEBUG] ${message}`, data);
    }
  },
};

// Utility to sanitize data for logging
export const sanitizeForLogging = (data: any): any => {
  if (!data || typeof data !== "object") return data;

  const sensitiveKeys = [
    "password",
    "token",
    "accessToken",
    "refreshToken",
    "secret",
    "key",
    "authorization",
    "auth",
    "email",
    "phone",
    "phoneNumber",
    "address",
    "ssn",
    "creditCard",
    "bankAccount",
  ];

  const sanitized = { ...data };

  for (const key in sanitized) {
    if (
      sensitiveKeys.some((sensitive) =>
        key.toLowerCase().includes(sensitive.toLowerCase())
      )
    ) {
      sanitized[key] = "[REDACTED]";
    }
  }

  return sanitized;
};

// Safe user data for logging (remove sensitive info)
export const getSafeUserData = (user: any) => {
  if (!user) return null;

  return {
    id: user.id,
    role: user.role,
    isAuthenticated: !!user,
    // Remove email, phone, and other sensitive data
  };
};
