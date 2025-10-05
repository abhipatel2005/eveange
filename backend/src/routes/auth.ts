import { Router } from "express";
import { AuthController } from "../controllers/authController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

// POST /api/auth/register
router.post("/register", AuthController.register);

// POST /api/auth/login
router.post("/login", AuthController.login);

// GET /api/auth/verify-email
router.get("/verify-email", AuthController.verifyEmail);

// Debug endpoint to check email verifications
router.get(
  "/debug/email-verifications",
  AuthController.debugEmailVerifications
);

// POST /api/auth/resend-verification
router.post("/resend-verification", AuthController.resendVerification);

// POST /api/auth/logout
router.post("/logout", AuthController.logout);

// POST /api/auth/refresh
router.post("/refresh", AuthController.refreshToken);

// GET /api/auth/profile - Protected route
router.get("/profile", authenticateToken, AuthController.getProfile);

export default router;
