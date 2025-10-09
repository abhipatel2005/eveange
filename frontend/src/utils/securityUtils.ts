/**
 * Security Utilities
 *
 * This module provides various security-related utilities for the application
 * including input validation, sanitization, and security best practices.
 */

/**
 * Sanitizes user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== "string") return "";

  return input
    .replace(/[<>]/g, "") // Remove angle brackets
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, "") // Remove event handlers
    .trim();
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates phone number format
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[\d\s\-\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, "").length >= 10;
}

/**
 * Generates a secure random string
 */
export function generateSecureToken(length: number = 32): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  // Use crypto.getRandomValues for better security
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);

  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }

  return result;
}

/**
 * Validates that a string doesn't contain common injection patterns
 */
export function validateNoInjection(input: string): boolean {
  const injectionPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /data:text\/html/gi,
    /vbscript:/gi,
    /on\w+\s*=/gi,
  ];

  return !injectionPatterns.some((pattern) => pattern.test(input));
}

/**
 * Content Security Policy configuration
 */
export const CSP_CONFIG = {
  "default-src": ["'self'"],
  "script-src": [
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    "https://fonts.googleapis.com",
  ],
  "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  "font-src": ["'self'", "https://fonts.googleapis.com"],
  "img-src": ["'self'", "data:", "https:", "blob:"],
  "connect-src": ["'self'", "https:", "wss:", "ws:"],
  "frame-src": ["'none'"],
  "object-src": ["'none'"],
  "media-src": ["'self'"],
  "worker-src": ["'self'"],
  "child-src": ["'self'"],
  "form-action": ["'self'"],
  "frame-ancestors": ["'none'"],
  "base-uri": ["'self'"],
  "manifest-src": ["'self'"],
};

/**
 * Generate CSP header string
 */
export function generateCSPHeader(): string {
  return Object.entries(CSP_CONFIG)
    .map(([directive, sources]) => `${directive} ${sources.join(" ")}`)
    .join("; ");
}

/**
 * Security headers configuration
 */
export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
};

/**
 * Rate limiting configuration
 */
export const RATE_LIMITS = {
  LOGIN: { requests: 5, window: 15 * 60 * 1000 }, // 5 requests per 15 minutes
  REGISTER: { requests: 3, window: 60 * 60 * 1000 }, // 3 requests per hour
  PASSWORD_RESET: { requests: 3, window: 60 * 60 * 1000 }, // 3 requests per hour
  EMAIL_VERIFICATION: { requests: 5, window: 60 * 60 * 1000 }, // 5 requests per hour
};

/**
 * Password strength validation
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length < 8) {
    feedback.push("Password must be at least 8 characters long");
  } else {
    score += 1;
  }

  if (!/[a-z]/.test(password)) {
    feedback.push("Password must contain at least one lowercase letter");
  } else {
    score += 1;
  }

  if (!/[A-Z]/.test(password)) {
    feedback.push("Password must contain at least one uppercase letter");
  } else {
    score += 1;
  }

  if (!/\d/.test(password)) {
    feedback.push("Password must contain at least one number");
  } else {
    score += 1;
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    feedback.push("Password must contain at least one special character");
  } else {
    score += 1;
  }

  return {
    isValid: score >= 4 && password.length >= 8,
    score,
    feedback,
  };
}

/**
 * Secure storage utility
 */
export const secureStorage = {
  set(key: string, value: string): void {
    try {
      // Use sessionStorage for sensitive data instead of localStorage
      sessionStorage.setItem(key, value);
    } catch (error) {
      console.error("Failed to store data securely:", error);
    }
  },

  get(key: string): string | null {
    try {
      return sessionStorage.getItem(key);
    } catch (error) {
      console.error("Failed to retrieve data securely:", error);
      return null;
    }
  },

  remove(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.error("Failed to remove data securely:", error);
    }
  },

  clear(): void {
    try {
      sessionStorage.clear();
    } catch (error) {
      console.error("Failed to clear secure storage:", error);
    }
  },
};

/**
 * Environment-based configuration
 */
export const SECURITY_CONFIG = {
  PRODUCTION: {
    LOGGING_ENABLED: false,
    DEBUG_MODE: false,
    DETAILED_ERRORS: false,
    CONSOLE_OVERRIDE: true,
  },
  DEVELOPMENT: {
    LOGGING_ENABLED: true,
    DEBUG_MODE: true,
    DETAILED_ERRORS: true,
    CONSOLE_OVERRIDE: false,
  },
};

/**
 * Get current security configuration based on environment
 */
export function getSecurityConfig() {
  return import.meta.env.PROD
    ? SECURITY_CONFIG.PRODUCTION
    : SECURITY_CONFIG.DEVELOPMENT;
}
