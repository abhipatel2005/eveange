import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import { authenticateToken } from "../middleware/auth.js";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import PptxGenJS from "pptxgenjs";
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
        // Generate unique filename: eventId_timestamp_originalname
        const eventId = req.body.eventId || 'template';
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        cb(null, `${eventId}_${timestamp}${ext}`);
    }
});
const fileFilter = (req, file, cb) => {
    // Only allow PowerPoint files
    const allowedMimes = [
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-powerpoint'
    ];
    if (allowedMimes.includes(file.mimetype) || file.originalname.endsWith('.pptx') || file.originalname.endsWith('.ppt')) {
        cb(null, true);
    }
    else {
        cb(new Error('Only PowerPoint files (.ppt, .pptx) are allowed'), false);
    }
};
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
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
            title: { x: 600, y: 150, align: "center", placeholder: "{{certificate_title}}" },
            subtitle: { x: 600, y: 220, align: "center", placeholder: "{{subtitle}}" },
            participantName: { x: 600, y: 300, align: "center", placeholder: "{{participant_name}}" },
            eventText: { x: 600, y: 360, align: "center", placeholder: "{{event_description}}" },
            eventName: { x: 600, y: 420, align: "center", placeholder: "{{event_title}}" },
            eventDate: { x: 600, y: 480, align: "center", placeholder: "{{event_date}}" },
            certificateCode: { x: 600, y: 700, align: "center", placeholder: "{{certificate_code}}" },
        }
    }
};
// Available data fields for placeholder mapping
export const AVAILABLE_DATA_FIELDS = [
    { key: "participant_name", label: "Participant Name", description: "Name of the certificate recipient" },
    { key: "participant_email", label: "Participant Email", description: "Email address of the participant" },
    { key: "event_title", label: "Event Title", description: "Name of the event" },
    { key: "event_description", label: "Event Description", description: "Description of the event" },
    { key: "event_date", label: "Event Date", description: "Date when the event took place" },
    { key: "event_location", label: "Event Location", description: "Location where the event was held" },
    { key: "certificate_code", label: "Certificate Code", description: "Unique verification code for the certificate" },
    { key: "issue_date", label: "Issue Date", description: "Date when the certificate was issued" },
    { key: "organizer_name", label: "Organizer Name", description: "Name of the event organizer" },
    { key: "certificate_title", label: "Certificate Title", description: "Title of the certificate (e.g., 'Certificate of Completion')" },
];
// Function to extract placeholders from PowerPoint file
const extractPlaceholdersFromPPTX = async (filePath) => {
    try {
        const pptx = new PptxGenJS();
        // For now, we'll use a regex to find placeholders in the file
        // In a more advanced implementation, we could parse the PPTX XML
        const fileBuffer = await fs.readFile(filePath);
        const fileContent = fileBuffer.toString('binary');
        // Find all {{placeholder}} patterns
        const placeholderRegex = /\{\{([^}]+)\}\}/g;
        const placeholders = new Set();
        let match;
        while ((match = placeholderRegex.exec(fileContent)) !== null) {
            placeholders.add(match[1].trim());
        }
        return Array.from(placeholders);
    }
    catch (error) {
        console.error("Error extracting placeholders:", error);
        return [];
    }
};
// GET /api/templates/data-fields - Get available data fields for mapping
router.get("/data-fields", authenticateToken, async (req, res) => {
    try {
        res.json({
            success: true,
            data: AVAILABLE_DATA_FIELDS
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
                error: "Access denied. Only event organizers can view templates."
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
                available_fields: AVAILABLE_DATA_FIELDS
            }
        });
    }
    catch (error) {
        console.error("Error fetching templates:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
// POST /api/templates/upload - Upload PowerPoint template
router.post("/upload", authenticateToken, upload.single('template'), async (req, res) => {
    try {
        const { eventId, templateName, placeholderMapping } = req.body;
        const userId = req.user.id;
        const uploadedFile = req.file;
        if (!eventId || !templateName || !uploadedFile) {
            return res.status(400).json({
                error: "Event ID, template name, and PowerPoint file are required"
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
                error: "Access denied. Only event organizers can upload templates."
            });
        }
        // Extract placeholders from the uploaded PowerPoint file
        const extractedPlaceholders = await extractPlaceholdersFromPPTX(uploadedFile.path);
        // Parse placeholder mapping if provided
        let mapping = {};
        if (placeholderMapping) {
            try {
                mapping = typeof placeholderMapping === 'string'
                    ? JSON.parse(placeholderMapping)
                    : placeholderMapping;
            }
            catch (err) {
                console.warn("Invalid placeholder mapping format, using empty mapping");
            }
        }
        // Create template record
        const templateConfig = {
            type: "powerpoint",
            file_path: uploadedFile.path,
            file_name: uploadedFile.originalname,
            placeholders: extractedPlaceholders,
            placeholder_mapping: mapping,
            available_fields: AVAILABLE_DATA_FIELDS
        };
        const { data: newTemplate, error: createError } = await supabase
            .from("certificate_templates")
            .insert({
            event_id: eventId,
            name: templateName,
            template: templateConfig
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
            data: {
                template: newTemplate,
                extracted_placeholders: extractedPlaceholders,
                needs_mapping: extractedPlaceholders.length > 0 && Object.keys(mapping).length === 0
            }
        });
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
            return res.status(400).json({ error: "Placeholder mapping is required" });
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
                error: "Access denied. Only event organizers can update templates."
            });
        }
        // Update template configuration with new mapping
        const updatedConfig = {
            ...existingTemplate.template,
            placeholder_mapping: placeholderMapping
        };
        const { data: updatedTemplate, error: updateError } = await supabase
            .from("certificate_templates")
            .update({ template: updatedConfig })
            .eq("id", templateId)
            .select("*")
            .single();
        if (updateError) {
            return res.status(500).json({ error: "Failed to update template mapping" });
        }
        res.json({
            success: true,
            data: updatedTemplate
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
                error: "Access denied. Only event organizers can delete templates."
            });
        }
        // Check if template is being used by any certificates
        const { data: usedCertificates, error: usageError } = await supabase
            .from("certificates")
            .select("id")
            .eq("template_id", templateId)
            .limit(1);
        if (usageError) {
            return res.status(500).json({ error: "Failed to check template usage" });
        }
        if (usedCertificates && usedCertificates.length > 0) {
            return res.status(400).json({
                error: "Cannot delete template that is being used by certificates"
            });
        }
        // Delete associated file if it exists
        if (existingTemplate.template?.file_path) {
            try {
                await fs.unlink(existingTemplate.template.file_path);
            }
            catch (fileError) {
                console.warn("Could not delete template file:", fileError);
            }
        }
        // Delete template from database
        const { error: deleteError } = await supabase
            .from("certificate_templates")
            .delete()
            .eq("id", templateId);
        if (deleteError) {
            return res.status(500).json({ error: "Failed to delete template" });
        }
        res.json({
            success: true,
            message: "Template deleted successfully"
        });
    }
    catch (error) {
        console.error("Error deleting template:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
export default router;
