import { Router } from "express";
import { UserController } from "../controllers/userController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

// POST /api/users/upgrade-to-organizer - Protected route
router.post(
  "/upgrade-to-organizer",
  authenticateToken,
  UserController.upgradeToOrganizer
);

// GET /api/users/profile - Protected route
router.get("/profile", authenticateToken, UserController.getProfile);

export default router;
