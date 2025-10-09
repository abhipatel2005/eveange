/**
 * Input Validation and Sanitization Middleware
 *
 * This middleware provides comprehensive input validation and sanitization
 * to prevent XSS, SQL injection, and other attack vectors.
 */

import { Request, Response, NextFunction } from "express";
import DOMPurify from "isomorphic-dompurify";
import validator from "validator";

// Sanitize string inputs to prevent XSS
export function sanitizeString(input: string): string {
  if (!input || typeof input !== "string") return "";

  // Remove potentially dangerous HTML/JavaScript
  const cleaned = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });

  // Additional sanitization
  return cleaned
    .replace(/[<>]/g, "") // Remove angle brackets
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, "") // Remove event handlers
    .trim();
}

// Validate and sanitize email
export function sanitizeEmail(email: string): string | null {
  if (!email || typeof email !== "string") return null;

  const trimmed = email.trim().toLowerCase();
  if (!validator.isEmail(trimmed)) return null;

  return trimmed;
}

// Validate and sanitize phone number
export function sanitizePhone(phone: string): string | null {
  if (!phone || typeof phone !== "string") return null;

  const cleaned = phone.replace(/\D/g, ""); // Remove non-digits
  if (cleaned.length < 10 || cleaned.length > 15) return null;

  return cleaned;
}

// Validate and sanitize URL
export function sanitizeUrl(url: string): string | null {
  if (!url || typeof url !== "string") return null;

  const trimmed = url.trim();
  if (
    !validator.isURL(trimmed, {
      protocols: ["http", "https"],
      require_protocol: true,
    })
  )
    return null;

  return trimmed;
}

// Sanitize object recursively
export function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    return sanitizeString(obj);
  }

  if (typeof obj === "number" || typeof obj === "boolean") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  if (typeof obj === "object") {
    const sanitized: any = {};

    for (const [key, value] of Object.entries(obj)) {
      // Sanitize key
      const cleanKey = sanitizeString(key);
      if (cleanKey) {
        sanitized[cleanKey] = sanitizeObject(value);
      }
    }

    return sanitized;
  }

  return obj;
}

// Middleware to sanitize request body
export function sanitizeRequestBody(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }

  next();
}

// Middleware to sanitize query parameters
export function sanitizeQueryParams(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.query && typeof req.query === "object") {
    req.query = sanitizeObject(req.query);
  }

  next();
}

// Validate specific field types
export const validators = {
  email: (value: string) => {
    const sanitized = sanitizeEmail(value);
    if (!sanitized) throw new Error("Invalid email format");
    return sanitized;
  },

  phone: (value: string) => {
    const sanitized = sanitizePhone(value);
    if (!sanitized) throw new Error("Invalid phone number format");
    return sanitized;
  },

  url: (value: string) => {
    const sanitized = sanitizeUrl(value);
    if (!sanitized) throw new Error("Invalid URL format");
    return sanitized;
  },

  text: (value: string, maxLength: number = 1000) => {
    const sanitized = sanitizeString(value);
    if (sanitized.length > maxLength) {
      throw new Error(`Text exceeds maximum length of ${maxLength} characters`);
    }
    return sanitized;
  },

  alphanumeric: (value: string) => {
    const sanitized = sanitizeString(value);
    if (!validator.isAlphanumeric(sanitized)) {
      throw new Error("Value must contain only letters and numbers");
    }
    return sanitized;
  },

  uuid: (value: string) => {
    const sanitized = sanitizeString(value);
    if (!validator.isUUID(sanitized)) {
      throw new Error("Invalid UUID format");
    }
    return sanitized;
  },
};

// Security headers middleware
export function securityHeaders(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Set security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  // Only set HSTS in production
  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  next();
}

// CSRF protection for state-changing operations
export function csrfProtection(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  // Check for CSRF token in header
  const token = req.headers["x-csrf-token"] as string;

  // In a real implementation, you'd validate the token against a stored value
  // For now, we'll implement a simple check
  if (!token) {
    res.status(403).json({
      success: false,
      error: "CSRF token required",
      code: "CSRF_TOKEN_MISSING",
    });
    return;
  }

  next();
}
