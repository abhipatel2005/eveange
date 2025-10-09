/**
 * Safe Logging Utility
 *
 * This utility provides production-safe logging that automatically
 * sanitizes sensitive data like tokens, passwords, and personal information
 * to prevent security vulnerabilities.
 */

interface LogOptions {
  level?: "log" | "info" | "warn" | "error";
  sanitize?: boolean;
}

// Patterns to detect sensitive data
const SENSITIVE_PATTERNS = [
  /bearer\s+[a-zA-Z0-9\-_\.]+/gi, // Bearer tokens
  /token["\']?\s*[:=]\s*["\']?[a-zA-Z0-9\-_\.]+/gi, // Token assignments
  /password["\']?\s*[:=]\s*["\']?[^"',\s]+/gi, // Passwords
  /secret["\']?\s*[:=]\s*["\']?[a-zA-Z0-9\-_\.]+/gi, // Secrets
  /key["\']?\s*[:=]\s*["\']?[a-zA-Z0-9\-_\.]+/gi, // API keys
  /authorization["\']?\s*[:=]\s*["\']?[^"',\s]+/gi, // Authorization headers
  /refresh_token["\']?\s*[:=]\s*["\']?[a-zA-Z0-9\-_\.]+/gi, // Refresh tokens
  /access_token["\']?\s*[:=]\s*["\']?[a-zA-Z0-9\-_\.]+/gi, // Access tokens
];

// Email pattern for PII detection
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi;

/**
 * Sanitizes a string by replacing sensitive data with redacted placeholders
 */
function sanitizeString(str: string): string {
  let sanitized = str;

  // Replace sensitive patterns
  SENSITIVE_PATTERNS.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, (match) => {
      const prefix = match.split(/[:=]/)[0];
      return `${prefix}: [REDACTED]`;
    });
  });

  // Replace email addresses (PII)
  sanitized = sanitized.replace(EMAIL_PATTERN, "[EMAIL_REDACTED]");

  return sanitized;
}

/**
 * Sanitizes an object by recursively replacing sensitive values
 */
function sanitizeObject(obj: any, depth = 0): any {
  if (depth > 10) return "[MAX_DEPTH_REACHED]"; // Prevent infinite recursion

  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    return sanitizeString(obj);
  }

  if (typeof obj === "number" || typeof obj === "boolean") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, depth + 1));
  }

  if (typeof obj === "object") {
    const sanitized: any = {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      // Check if key indicates sensitive data
      if (
        lowerKey.includes("token") ||
        lowerKey.includes("password") ||
        lowerKey.includes("secret") ||
        lowerKey.includes("key") ||
        lowerKey.includes("authorization") ||
        lowerKey.includes("auth")
      ) {
        sanitized[key] = "[REDACTED]";
      } else {
        sanitized[key] = sanitizeObject(value, depth + 1);
      }
    }

    return sanitized;
  }

  return obj;
}

/**
 * Production-safe console.log that automatically sanitizes sensitive data
 */
export function safeLog(
  message: string,
  data?: any,
  options: LogOptions = {}
): void {
  // Only log in development mode unless explicitly forced
  if (import.meta.env.PROD && !options.sanitize) {
    return;
  }

  const { level = "log", sanitize = true } = options;

  if (data !== undefined) {
    const sanitizedData = sanitize ? sanitizeObject(data) : data;
    console[level](message, sanitizedData);
  } else {
    const sanitizedMessage = sanitize ? sanitizeString(message) : message;
    console[level](sanitizedMessage);
  }
}

/**
 * Development-only logging that is completely stripped in production
 */
export function devLog(message: string, data?: any): void {
  if (import.meta.env.DEV) {
    safeLog(message, data, { sanitize: true });
  }
}

/**
 * Force logging even in production (use sparingly and ensure data is safe)
 */
export function forceLog(message: string, data?: any): void {
  safeLog(message, data, { sanitize: true });
}

/**
 * Error logging that's always enabled but sanitized
 */
export function safeError(message: string, error?: any): void {
  const sanitizedError = error ? sanitizeObject(error) : undefined;
  console.error(message, sanitizedError);
}

/**
 * Override console methods in production to prevent accidental logging
 */
export function enableProductionSafety(): void {
  if (import.meta.env.PROD) {
    // In production, completely disable console.log, info, warn to prevent any data leaks
    console.log = () => {};
    console.info = () => {};
    console.warn = () => {};

    // Keep console.error for critical error tracking
    const originalError = console.error;
    console.error = (...args) => {
      const sanitizedArgs = args.map((arg) =>
        typeof arg === "string" ? sanitizeString(arg) : sanitizeObject(arg)
      );
      originalError(...sanitizedArgs);
    };
  } else {
    // In development, apply sanitization
    const originalLog = console.log;
    const originalInfo = console.info;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args) => {
      const sanitizedArgs = args.map((arg) =>
        typeof arg === "string" ? sanitizeString(arg) : sanitizeObject(arg)
      );
      originalLog(...sanitizedArgs);
    };

    console.info = (...args) => {
      const sanitizedArgs = args.map((arg) =>
        typeof arg === "string" ? sanitizeString(arg) : sanitizeObject(arg)
      );
      originalInfo(...sanitizedArgs);
    };

    console.warn = (...args) => {
      const sanitizedArgs = args.map((arg) =>
        typeof arg === "string" ? sanitizeString(arg) : sanitizeObject(arg)
      );
      originalWarn(...sanitizedArgs);
    };

    console.error = (...args) => {
      const sanitizedArgs = args.map((arg) =>
        typeof arg === "string" ? sanitizeString(arg) : sanitizeObject(arg)
      );
      originalError(...sanitizedArgs);
    };
  }
}

// Auto-enable production safety
enableProductionSafety();
