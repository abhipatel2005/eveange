import { Router } from "express";
import { EventController } from "../controllers/eventController.js";
import { authenticateToken, requireOrganizer } from "../middleware/auth.js";

const router = Router();

// Public routes
router.get("/", EventController.getEvents);
router.get("/:id", EventController.getEventById);

// Protected routes (require authentication)
router.use(authenticateToken);

// Get user's role for a specific event
router.get("/:id/user-role", EventController.getUserEventRole);

// Organizer routes
router.post("/", EventController.createEvent);
router.put("/:id", requireOrganizer, EventController.updateEvent);
router.delete("/:id", requireOrganizer, EventController.deleteEvent);
router.get("/my/events", EventController.getMyEvents);

export default router;
