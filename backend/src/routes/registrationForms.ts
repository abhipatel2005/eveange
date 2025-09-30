import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import { requireRole } from "../middleware/roleCheck.js";
import { RegistrationFormController } from "../controllers/registrationFormController.js";

const router = Router();

// Get form templates (for organizers)
router.get(
  "/templates",
  authenticateToken,
  requireRole(["organizer", "admin"]),
  RegistrationFormController.getFormTemplates
);

// Create registration form for an event (organizers only)
router.post(
  "/events/:eventId/form",
  authenticateToken,
  requireRole(["organizer", "admin"]),
  RegistrationFormController.createRegistrationForm
);

// Get registration form for an event (public endpoint)
router.get(
  "/events/:eventId/form",
  RegistrationFormController.getRegistrationForm
);

// Update registration form (organizers only)
router.put(
  "/events/:eventId/form/:formId",
  authenticateToken,
  requireRole(["organizer", "admin"]),
  RegistrationFormController.updateRegistrationForm
);

// Delete registration form (organizers only)
router.delete(
  "/events/:eventId/form/:formId",
  authenticateToken,
  requireRole(["organizer", "admin"]),
  RegistrationFormController.deleteRegistrationForm
);

export default router;
