import { Router } from "express";
import { RegistrationController } from "../controllers/registrationController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Registration routes
router.post(
  "/events/:eventId/register",
  RegistrationController.registerForEvent
);
router.get(
  "/events/:eventId/registrations",
  RegistrationController.getEventRegistrations
);
router.get(
  "/events/:eventId/registration-status",
  RegistrationController.checkRegistrationStatus
);
router.get("/my-registrations", RegistrationController.getUserRegistrations);
router.get("/:registrationId", RegistrationController.getRegistrationById);
router.put(
  "/:registrationId/cancel",
  RegistrationController.cancelRegistration
);

export default router;
