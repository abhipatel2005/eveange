/**
 * Enhanced Rate Limiting Middleware for Authentication Routes
 *
 * This middleware provides stronger rate limiting specifically for
 * authentication endpoints to prevent brute force attacks.
 */
import rateLimit from "express-rate-limit";
// Strict rate limiting for authentication endpoints
export const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 auth requests per windowMs
    message: {
        success: false,
        error: "Too many authentication attempts from this IP, please try again later.",
        code: "RATE_LIMIT_AUTH",
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip successful requests
    skipSuccessfulRequests: true,
});
// Rate limiting for password reset and email verification
export const emailRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 email requests per hour
    message: {
        success: false,
        error: "Too many email requests from this IP, please try again later.",
        code: "RATE_LIMIT_EMAIL",
    },
    standardHeaders: true,
    legacyHeaders: false,
});
// Rate limiting for registration
export const registrationRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 registration attempts per hour
    message: {
        success: false,
        error: "Too many registration attempts from this IP, please try again later.",
        code: "RATE_LIMIT_REGISTRATION",
    },
    standardHeaders: true,
    legacyHeaders: false,
});
// Rate limiting for file uploads
export const fileUploadRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 file uploads per 15 minutes
    message: {
        success: false,
        error: "Too many file uploads from this IP, please try again later.",
        code: "RATE_LIMIT_UPLOAD",
    },
    standardHeaders: true,
    legacyHeaders: false,
});
