import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import { certificateController } from "../controllers/certificateController.js";
const router = Router();
// Get past events for certificate generation (matches frontend expectation)
router.get("/events", authenticateToken, certificateController.getPastEvents);
// Get available data fields for mapping
router.get("/data-fields", authenticateToken, certificateController.getAvailableDataFields);
// Template management routes
router.get("/templates", authenticateToken, certificateController.getTemplates);
router.get("/templates/test", certificateController.getTemplates); // Test route without auth
router.post("/templates", authenticateToken, certificateController.uploadTemplate);
router.post("/templates/upload", authenticateToken, certificateController.uploadTemplate);
router.put("/templates/:templateId/mapping", authenticateToken, certificateController.updatePlaceholderMapping);
router.delete("/templates/:templateId", authenticateToken, certificateController.deleteTemplate);
// Certificate generation routes
router.get("/events/:eventId/participants", authenticateToken, certificateController.getEligibleParticipants);
router.post("/events/:eventId/generate", authenticateToken, certificateController.generateCertificates);
// Get all certificates for an event
router.get("/events/:eventId/certificates", authenticateToken, certificateController.getCertificates);
// Email certificates to participants
router.post("/events/:eventId/email", authenticateToken, certificateController.emailCertificates);
router.get("/event/:eventId", authenticateToken, certificateController.getEventCertificates); // Fixed: removed 's' to match frontend
// This route is handled above in the "/events/:eventId/generate" route
// Certificate verification
router.get("/verify/:code", certificateController.verifyCertificate);
// Certificate download
router.get("/download/:code", certificateController.downloadCertificate);
export default router;
