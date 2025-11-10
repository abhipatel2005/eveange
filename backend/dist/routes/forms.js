import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import { requireRole } from "../middleware/roleCheck.js";
import { FormController } from "../controllers/formController.js";
const router = Router();
// Get form templates (for organizers)
router.get("/templates", authenticateToken, requireRole(["organizer", "admin"]), FormController.getFormTemplates);
// Create form for an event (organizers only)
router.post("/events/:eventId/form", authenticateToken, requireRole(["organizer", "admin"]), FormController.createForm);
// Get form for an event (public endpoint)
// Supports ?type=registration or ?type=feedback
router.get("/events/:eventId/form", FormController.getForm);
// Update form (organizers only)
router.put("/events/:eventId/form/:formId", authenticateToken, requireRole(["organizer", "admin"]), FormController.updateForm);
// Delete form (organizers only)
router.delete("/events/:eventId/form/:formId", authenticateToken, requireRole(["organizer", "admin"]), FormController.deleteForm);
export default router;
