import { Router } from "express";
import { AuthController } from "../controllers/authController.js";
import { authenticateToken } from "../middleware/auth.js";
import {
  authRateLimit,
  emailRateLimit,
  registrationRateLimit,
} from "../middleware/rateLimiting.js";

const router = Router();

// POST /api/auth/register - With rate limiting
router.post("/register", registrationRateLimit, AuthController.register);

// POST /api/auth/login - With rate limiting
router.post("/login", authRateLimit, AuthController.login);

// GET /api/auth/verify-email - With rate limiting
router.get("/verify-email", emailRateLimit, AuthController.verifyEmail);

// Debug endpoint to check email verifications (development only)
router.get(
  "/debug/email-verifications",
  AuthController.debugEmailVerifications
);

// POST /api/auth/resend-verification - With rate limiting
router.post(
  "/resend-verification",
  emailRateLimit,
  AuthController.resendVerification
);

// POST /api/auth/logout
router.post("/logout", AuthController.logout);

// POST /api/auth/refresh - With rate limiting
router.post("/refresh", authRateLimit, AuthController.refreshToken);

// GET /api/auth/profile - Protected route
router.get("/profile", authenticateToken, AuthController.getProfile);

export default router;
