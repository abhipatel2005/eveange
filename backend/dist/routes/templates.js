import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import { authenticateToken } from "../middleware/auth.js";
import { fileUploadRateLimit } from "../middleware/rateLimiting.js";
import { TemplateService } from "../services/templateService.js";
import { CertificateGenerator, AVAILABLE_DATA_FIELDS, } from "../services/certificateGenerator.js";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
const router = Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
// Configure multer for PowerPoint file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadsDir = path.join(process.cwd(), "uploads", "templates");
        try {
            await fs.mkdir(uploadsDir, { recursive: true });
        }
        catch (err) {
            console.error("Error creating uploads directory:", err);
        }
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Generate cryptographically secure filename to prevent path traversal
        const eventId = req.body.eventId?.replace(/[^a-zA-Z0-9-_]/g, "") || "template";
        const timestamp = Date.now();
        const randomBytes = crypto.randomBytes(8).toString("hex");
        const ext = path.extname(file.originalname).toLowerCase();
        // Validate extension
        const allowedExtensions = [".ppt", ".pptx"];
        if (!allowedExtensions.includes(ext)) {
            return cb(new Error("Invalid file extension"), "");
        }
        cb(null, `${eventId}_${timestamp}_${randomBytes}${ext}`);
    },
});
const fileFilter = (req, file, cb) => {
    // Enhanced file validation
    const allowedMimes = [
        "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
        "application/vnd.ms-powerpoint", // .ppt
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = [".ppt", ".pptx"];
    // Check both MIME type and extension
    if (allowedMimes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
        cb(null, true);
    }
    else {
        cb(new Error("Only PowerPoint files (.ppt, .pptx) are allowed"));
    }
};
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // Reduced to 5MB limit for security
        files: 1, // Only one file at a time
        fields: 10, // Limit form fields
    },
});
// Default certificate template configuration
export const DEFAULT_TEMPLATE = {
    id: "default",
    name: "Default Template",
    type: "canvas",
    config: {
        width: 1200,
        height: 800,
        backgroundColor: "#ffffff",
        titleColor: "#2c3e50",
        textColor: "#34495e",
        accentColor: "#3498db",
        fonts: {
            title: "bold 48px Arial",
            subtitle: "bold 24px Arial",
            text: "20px Arial",
            name: "bold 36px Arial",
        },
        layout: {
            title: {
                x: 600,
                y: 150,
                align: "center",
                placeholder: "{{certificate_title}}",
            },
            subtitle: {
                x: 600,
                y: 220,
                align: "center",
                placeholder: "{{subtitle}}",
            },
            participantName: {
                x: 600,
                y: 300,
                align: "center",
                placeholder: "{{participant_name}}",
            },
            eventText: {
                x: 600,
                y: 360,
                align: "center",
                placeholder: "{{event_description}}",
            },
            eventName: {
                x: 600,
                y: 420,
                align: "center",
                placeholder: "{{event_title}}",
            },
            eventDate: {
                x: 600,
                y: 480,
                align: "center",
                placeholder: "{{event_date}}",
            },
            certificateCode: {
                x: 600,
                y: 700,
                align: "center",
                placeholder: "{{certificate_code}}",
            },
        },
    },
};
// Placeholder extraction function will be replaced with CertificateGenerator method
// Function to extract placeholders from PowerPoint file
// GET /api/templates/data-fields - Get available data fields for mapping
router.get("/data-fields", authenticateToken, async (req, res) => {
    try {
        res.json({
            success: true,
            data: AVAILABLE_DATA_FIELDS,
        });
    }
    catch (error) {
        console.error("Error fetching data fields:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
// GET /api/templates/event/:eventId - Get templates for an event
router.get("/event/:eventId", authenticateToken, async (req, res) => {
    try {
        const { eventId } = req.params;
        const userId = req.user.id;
        // Check if user is organizer of the event
        const { data: event, error: eventError } = await supabase
            .from("events")
            .select("id, organizer_id")
            .eq("id", eventId)
            .single();
        if (eventError || !event) {
            return res.status(404).json({ error: "Event not found" });
        }
        if (event.organizer_id !== userId) {
            return res.status(403).json({
                error: "Access denied. Only event organizers can view templates.",
            });
        }
        // Get custom templates for this event
        const { data: templates, error: templatesError } = await supabase
            .from("certificate_templates")
            .select("*")
            .eq("event_id", eventId)
            .order("created_at", { ascending: false });
        if (templatesError) {
            return res.status(500).json({ error: "Failed to fetch templates" });
        }
        // Include default template
        const allTemplates = [DEFAULT_TEMPLATE, ...(templates || [])];
        res.json({
            success: true,
            data: {
                templates: allTemplates,
                default_template_id: "default",
                available_fields: AVAILABLE_DATA_FIELDS,
            },
        });
    }
    catch (error) {
        console.error("Error fetching templates:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
// POST /api/templates/upload - Upload PowerPoint template
router.post("/upload", fileUploadRateLimit, authenticateToken, upload.single("template"), async (req, res) => {
    try {
        const { eventId, templateName, placeholderMapping } = req.body;
        const userId = req.user.id;
        const uploadedFile = req.file;
        if (!eventId || !templateName || !uploadedFile) {
            return res.status(400).json({
                error: "Event ID, template name, and PowerPoint file are required",
            });
        }
        // Check if user is organizer of the event
        const { data: event, error: eventError } = await supabase
            .from("events")
            .select("id, organizer_id")
            .eq("id", eventId)
            .single();
        if (eventError || !event) {
            return res.status(404).json({ error: "Event not found" });
        }
        if (event.organizer_id !== userId) {
            return res.status(403).json({
                error: "Access denied. Only event organizers can upload templates.",
            });
        }
        // Extract placeholders from the uploaded PowerPoint file
        const extractedPlaceholders = await CertificateGenerator.extractPlaceholdersFromPPTX(uploadedFile.path);
        // Parse placeholder mapping if provided
        let mapping = {};
        if (placeholderMapping) {
            try {
                mapping =
                    typeof placeholderMapping === "string"
                        ? JSON.parse(placeholderMapping)
                        : placeholderMapping;
            }
            catch (err) {
                console.warn("Invalid placeholder mapping format, using empty mapping");
            }
        }
        // Create template configuration
        const templateConfig = {
            type: "powerpoint",
            file_name: uploadedFile.originalname,
            placeholders: extractedPlaceholders,
            placeholder_mapping: mapping,
            available_fields: AVAILABLE_DATA_FIELDS,
        };
        try {
            // Create template with Azure storage
            const newTemplate = await TemplateService.createTemplateWithAzure(eventId, templateName, uploadedFile.path, uploadedFile.originalname, templateConfig);
            // Clean up local uploaded file after successful Azure upload
            try {
                await fs.unlink(uploadedFile.path);
                console.log(`🗑️ Cleaned up local file: ${uploadedFile.path}`);
            }
            catch (unlinkError) {
                console.warn("Could not clean up local file:", unlinkError);
            }
            res.json({
                success: true,
                data: newTemplate,
                message: "Template uploaded successfully to Azure storage",
            });
        }
        catch (azureError) {
            console.error("Azure upload failed:", azureError);
            // Fallback to local storage if Azure fails
            console.log("🔄 Falling back to local storage...");
            const fallbackConfig = {
                ...templateConfig,
                file_path: uploadedFile.path,
                uses_azure_storage: false,
            };
            const { data: newTemplate, error: createError } = await supabase
                .from("certificate_templates")
                .insert({
                event_id: eventId,
                name: templateName,
                template: fallbackConfig,
                uses_azure_storage: false,
            })
                .select("*")
                .single();
            if (createError) {
                // Clean up uploaded file if database insert fails
                try {
                    await fs.unlink(uploadedFile.path);
                }
                catch (unlinkError) {
                    console.error("Error cleaning up file:", unlinkError);
                }
                return res.status(500).json({ error: "Failed to create template" });
            }
            res.json({
                success: true,
                data: newTemplate,
                message: "Template uploaded to local storage (Azure unavailable)",
            });
        }
    }
    catch (error) {
        console.error("Error uploading template:", error);
        // Clean up uploaded file on error
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
            }
            catch (unlinkError) {
                console.error("Error cleaning up file:", unlinkError);
            }
        }
        res.status(500).json({ error: "Internal server error" });
    }
});
// PUT /api/templates/:templateId/mapping - Update placeholder mapping
router.put("/:templateId/mapping", authenticateToken, async (req, res) => {
    try {
        const { templateId } = req.params;
        const { placeholderMapping } = req.body;
        const userId = req.user.id;
        if (!placeholderMapping) {
            return res
                .status(400)
                .json({ error: "Placeholder mapping is required" });
        }
        // Check if template exists and user has permission
        const { data: existingTemplate, error: templateError } = await supabase
            .from("certificate_templates")
            .select(`
        *,
        events!inner (
          organizer_id
        )
      `)
            .eq("id", templateId)
            .single();
        if (templateError || !existingTemplate) {
            return res.status(404).json({ error: "Template not found" });
        }
        const eventData = Array.isArray(existingTemplate.events)
            ? existingTemplate.events[0]
            : existingTemplate.events;
        if (eventData.organizer_id !== userId) {
            return res.status(403).json({
                error: "Access denied. Only event organizers can update templates.",
            });
        }
        // Update template configuration with new mapping
        const updatedConfig = {
            ...existingTemplate.template,
            placeholder_mapping: placeholderMapping,
        };
        const { data: updatedTemplate, error: updateError } = await supabase
            .from("certificate_templates")
            .update({ template: updatedConfig })
            .eq("id", templateId)
            .select("*")
            .single();
        if (updateError) {
            return res
                .status(500)
                .json({ error: "Failed to update template mapping" });
        }
        res.json({
            success: true,
            data: updatedTemplate,
        });
    }
    catch (error) {
        console.error("Error updating template mapping:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
// DELETE /api/templates/:templateId - Delete a certificate template
router.delete("/:templateId", authenticateToken, async (req, res) => {
    try {
        const { templateId } = req.params;
        const userId = req.user.id;
        // Check if template exists and user has permission
        const { data: existingTemplate, error: templateError } = await supabase
            .from("certificate_templates")
            .select(`
        *,
        events!inner (
          organizer_id
        )
      `)
            .eq("id", templateId)
            .single();
        if (templateError || !existingTemplate) {
            return res.status(404).json({ error: "Template not found" });
        }
        const eventData = Array.isArray(existingTemplate.events)
            ? existingTemplate.events[0]
            : existingTemplate.events;
        if (eventData.organizer_id !== userId) {
            return res.status(403).json({
                error: "Access denied. Only event organizers can delete templates.",
            });
        }
        // Check if template is being used by any certificates
        const { data: usedCertificates, error: usageError } = await supabase
            .from("certificates")
            .select("id")
            .eq("template_id", templateId)
            .limit(1);
        if (usageError) {
            return res
                .status(500)
                .json({ error: "Failed to check template usage" });
        }
        if (usedCertificates && usedCertificates.length > 0) {
            return res.status(400).json({
                error: "Cannot delete template that is being used by certificates",
            });
        }
        // Use TemplateService to delete template (handles both Azure and local storage)
        const deleteSuccess = await TemplateService.deleteTemplate(templateId);
        if (!deleteSuccess) {
            return res.status(500).json({ error: "Failed to delete template" });
        }
        res.json({
            success: true,
            message: "Template deleted successfully",
        });
    }
    catch (error) {
        console.error("Error deleting template:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
// POST /api/templates/migrate-to-azure - Migrate existing templates to Azure storage
router.post("/migrate-to-azure", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        // Only allow super admin or system admin to run migration
        const { data: user, error: userError } = await supabase
            .from("users")
            .select("role")
            .eq("id", userId)
            .single();
        if (userError || !user || !["admin", "super_admin"].includes(user.role)) {
            return res.status(403).json({
                error: "Access denied. Only administrators can run template migration.",
            });
        }
        console.log(`🚀 Starting template migration to Azure initiated by user ${userId}...`);
        const result = await TemplateService.migrateAllTemplatesToAzure();
        res.json({
            success: true,
            message: "Template migration completed",
            data: {
                migrated: result.success,
                failed: result.failed,
                skipped: result.skipped,
                total: result.success + result.failed + result.skipped,
            },
        });
    }
    catch (error) {
        console.error("Error in template migration API:", error);
        res.status(500).json({
            error: "Template migration failed",
            details: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
// POST /api/templates/:templateId/migrate-to-azure - Migrate specific template to Azure
router.post("/:templateId/migrate-to-azure", authenticateToken, async (req, res) => {
    try {
        const { templateId } = req.params;
        const userId = req.user.id;
        // Check if user is organizer of the event that owns this template
        const { data: template, error: templateError } = await supabase
            .from("certificate_templates")
            .select(`
          id,
          event_id,
          uses_azure_storage,
          events!inner(organizer_id)
        `)
            .eq("id", templateId)
            .single();
        if (templateError || !template) {
            return res.status(404).json({ error: "Template not found" });
        }
        // Type assertion for events array
        const events = template.events;
        const organizerId = Array.isArray(events)
            ? events[0]?.organizer_id
            : events?.organizer_id;
        if (organizerId !== userId) {
            return res.status(403).json({
                error: "Access denied. Only event organizers can migrate their templates.",
            });
        }
        if (template.uses_azure_storage) {
            return res.json({
                success: true,
                message: "Template already uses Azure storage",
                data: { alreadyMigrated: true },
            });
        }
        console.log(`🔄 Migrating template ${templateId} to Azure...`);
        const migrationSuccess = await TemplateService.migrateTemplateToAzure(templateId);
        if (migrationSuccess) {
            res.json({
                success: true,
                message: "Template migrated to Azure successfully",
                data: { migrated: true },
            });
        }
        else {
            res.status(500).json({
                error: "Failed to migrate template to Azure",
                data: { migrated: false },
            });
        }
    }
    catch (error) {
        console.error("Error migrating template:", error);
        res.status(500).json({
            error: "Template migration failed",
            details: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
export default router;
