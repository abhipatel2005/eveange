import { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import {
  CertificateGenerator,
  AVAILABLE_DATA_FIELDS,
  type CertificateTemplate,
  type PlaceholderMapping,
} from "../services/certificateGenerator";
import { TemplateService } from "../services/templateService";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Configure multer for template uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), "uploads", "templates");
    await fs.mkdir(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [".pptx", ".png", ".jpg", ".jpeg"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Only PowerPoint (.pptx) and image files (.png, .jpg, .jpeg) are allowed"
        )
      );
    }
  },
});

export const certificateController = {
  // Get available data fields for certificate mapping
  getAvailableDataFields: async (req: Request, res: Response) => {
    try {
      res.json({
        success: true,
        data: AVAILABLE_DATA_FIELDS,
      });
    } catch (error) {
      console.error("Error fetching data fields:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch data fields",
      });
    }
  },

  // Get all certificate templates
  getTemplates: async (req: Request, res: Response) => {
    try {
      const { eventId } = req.query;

      let query = supabase
        .from("certificate_templates")
        .select("*")
        .order("created_at", { ascending: false });

      // If eventId is provided, filter by event or global templates
      if (eventId) {
        query = query.or(`event_id.eq.${eventId},event_id.is.null`);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        data: data || [],
      });
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch templates",
      });
    }
  },

  // Upload new certificate template
  uploadTemplate: [
    upload.single("template"),
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({
            success: false,
            message: "No template file uploaded",
          });
        }

        const { name, type, eventId } = req.body;
        if (!name || !type) {
          return res.status(400).json({
            success: false,
            message: "Template name and type are required",
          });
        }

        const filePath = req.file.path;
        let placeholders: string[] = [];
        let templateData: any = {};

        if (
          type === "powerpoint" &&
          path.extname(req.file.filename) === ".pptx"
        ) {
          // Extract placeholders from PowerPoint template
          placeholders = await CertificateGenerator.extractPlaceholdersFromPPTX(
            filePath
          );
        } else if (type === "canvas") {
          // For canvas templates, we'll set up basic template data
          templateData = {
            width: 1200,
            height: 800,
            backgroundColor: "#ffffff",
            elements: [],
          };
        }

        // Create initial placeholder mapping (empty, to be configured by user)
        const placeholderMapping: PlaceholderMapping = {};
        placeholders.forEach((placeholder) => {
          placeholderMapping[placeholder] = ""; // Will be mapped by user
        });

        // Create template configuration
        const templateConfig = {
          type: type,
          file_name: req.file.originalname,
          placeholders: placeholders,
          placeholder_mapping: placeholderMapping,
          available_fields: AVAILABLE_DATA_FIELDS,
        };

        try {
          // Create template with Azure storage
          console.log(`📤 Creating template with Azure storage...`);
          const newTemplate = await TemplateService.createTemplateWithAzure(
            eventId || null,
            name,
            filePath,
            req.file.originalname,
            templateConfig
          );

          // Clean up local uploaded file after successful Azure upload
          try {
            await fs.unlink(filePath);
            console.log(`🗑️ Cleaned up local file: ${filePath}`);
          } catch (unlinkError) {
            console.warn("Could not clean up local file:", unlinkError);
          }

          res.json({
            success: true,
            data: {
              template: newTemplate,
              placeholders,
              message: "Template uploaded successfully to Azure storage.",
            },
          });
        } catch (azureError) {
          console.error("❌ Azure upload failed:", azureError);

          // Fallback to local storage if Azure fails
          console.log("🔄 Falling back to local storage...");

          const fallbackConfig = {
            ...templateConfig,
            file_path: filePath,
            uses_azure_storage: false,
          };

          // Save template to database with local storage
          const { data, error } = await supabase
            .from("certificate_templates")
            .insert({
              event_id: eventId || null, // Allow null for global templates
              name,
              template: fallbackConfig,
              uses_azure_storage: false,
            })
            .select()
            .single();

          if (error) {
            // Clean up uploaded file if database insert fails
            try {
              await fs.unlink(filePath);
            } catch (unlinkError) {
              console.error("Error cleaning up file:", unlinkError);
            }
            throw error;
          }

          res.json({
            success: true,
            data: {
              template: data,
              placeholders,
              message:
                "Template uploaded to local storage (Azure unavailable).",
            },
          });
        }
      } catch (error) {
        console.error("Error uploading template:", error);

        // Clean up uploaded file on error
        if (req.file) {
          try {
            await fs.unlink(req.file.path);
          } catch (unlinkError) {
            console.error("Error cleaning up file:", unlinkError);
          }
        }

        res.status(500).json({
          success: false,
          message: "Failed to upload template",
        });
      }
    },
  ],

  // Update placeholder mapping for a template
  updatePlaceholderMapping: async (req: Request, res: Response) => {
    try {
      const { templateId } = req.params;
      const { placeholderMapping } = req.body;

      if (!placeholderMapping || typeof placeholderMapping !== "object") {
        return res.status(400).json({
          success: false,
          message: "Valid placeholder mapping is required",
        });
      }

      const { data, error } = await supabase
        .from("certificate_templates")
        .update({
          placeholder_mapping: placeholderMapping,
          updated_at: new Date().toISOString(),
        })
        .eq("id", templateId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        data,
        message: "Placeholder mapping updated successfully",
      });
    } catch (error) {
      console.error("Error updating placeholder mapping:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update placeholder mapping",
      });
    }
  },

  // Get eligible participants for an event
  getEligibleParticipants: async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;

      const participants = await CertificateGenerator.getEligibleParticipants(
        eventId
      );

      res.json({
        success: true,
        data: participants,
        count: participants.length,
      });
    } catch (error) {
      console.error("Error fetching eligible participants:", error);
      res.status(500).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch participants",
      });
    }
  },

  // Generate certificates for participants
  generateCertificates: async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      const { templateId, participantIds } = req.body;

      if (!templateId) {
        return res.status(400).json({
          success: false,
          message: "Template ID is required",
        });
      }

      // Get template
      const { data: template, error: templateError } = await supabase
        .from("certificate_templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (templateError || !template) {
        return res.status(404).json({
          success: false,
          message: "Template not found",
        });
      }

      // Validate placeholder mapping
      const mappingEntries = Object.entries(template.placeholder_mapping || {});
      const unmappedPlaceholders = mappingEntries.filter(
        ([, dataField]) => !dataField
      );

      if (unmappedPlaceholders.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Please map all placeholders: ${unmappedPlaceholders
            .map(([p]) => p)
            .join(", ")}`,
        });
      }

      // Get event data
      const eventData = await CertificateGenerator.getEventData(eventId);

      // Get participants
      const allParticipants =
        await CertificateGenerator.getEligibleParticipants(eventId);
      const participants = participantIds
        ? allParticipants.filter((p) => participantIds.includes(p.id))
        : allParticipants;

      if (participants.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No eligible participants found",
        });
      }

      const results = [];
      let serialNumber = 1;

      for (const participant of participants) {
        try {
          // Generate unique certificate code and verification code
          const certificateCode =
            CertificateGenerator.generateCertificateCode();
          const verificationCode =
            CertificateGenerator.generateVerificationCode();

          // Generate certificate data
          const certificateData = CertificateGenerator.generateCertificateData(
            participant,
            eventData,
            certificateCode,
            serialNumber++
          );

          let certificateBuffer: Buffer;
          let fileExtension: string;

          if (template.type === "powerpoint" && template.file_path) {
            certificateBuffer =
              await CertificateGenerator.generatePowerPointCertificate(
                template.file_path,
                certificateData,
                template.placeholder_mapping
              );
            fileExtension = "pptx";
          } else {
            certificateBuffer =
              await CertificateGenerator.generateCanvasCertificate(
                certificateData,
                template.template_data
              );
            fileExtension = "png";
          }

          // Save certificate
          const certificateUrl = await CertificateGenerator.saveCertificate(
            participant.id,
            eventId,
            templateId,
            certificateBuffer,
            certificateCode,
            verificationCode,
            fileExtension
          );

          // console.log(
          //   `✅ Certificate generated successfully for ${participant.name}`,
          //   {
          //     certificateCode,
          //     verificationCode,
          //     certificateUrl,
          //   }
          // );

          results.push({
            participantId: participant.id,
            participantName: participant.name,
            certificateCode,
            verificationCode,
            certificateUrl,
            status: "success",
          });
        } catch (error) {
          console.error(
            `❌ Error generating certificate for ${participant.name}:`,
            error
          );
          console.error("❌ Error details:", {
            participantId: participant.id,
            participantName: participant.name,
            eventId,
            templateId,
            errorMessage:
              error instanceof Error ? error.message : "Unknown error",
            errorStack: error instanceof Error ? error.stack : undefined,
          });

          results.push({
            participantId: participant.id,
            participantName: participant.name,
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      const successCount = results.filter((r) => r.status === "success").length;
      const errorCount = results.filter((r) => r.status === "error").length;

      console.log("📊 Certificate generation summary:", {
        totalParticipants: participants.length,
        totalResults: results.length,
        successCount,
        errorCount,
        results: results.map((r) => ({
          name: r.participantName,
          status: r.status,
          error: r.error,
        })),
      });

      const responseData = {
        success: true,
        data: {
          results,
          summary: {
            total: participants.length,
            successful: successCount,
            failed: errorCount,
          },
        },
        message: `Generated ${successCount} certificates successfully${
          errorCount > 0 ? `, ${errorCount} failed` : ""
        }`,
      };

      console.log(
        "📤 Sending response:",
        JSON.stringify(responseData, null, 2)
      );

      res.json(responseData);
    } catch (error) {
      console.error("Error generating certificates:", error);
      res.status(500).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to generate certificates",
      });
    }
  },

  // Get all certificates for an event
  getCertificates: async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;

      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: "Event ID is required",
        });
      }

      // Get all certificates for the event with participant details
      const { data: certificates, error } = await supabase
        .from("certificates")
        .select(
          `
          *,
          registrations!registration_id (
            id,
            name,
            email
          ),
          events!event_id (
            id,
            title
          )
        `
        )
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching certificates:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch certificates",
        });
      }

      res.json({
        success: true,
        data: certificates,
        message: `Found ${certificates.length} certificates`,
      });
    } catch (error) {
      console.error("Error in getCertificates:", error);
      res.status(500).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch certificates",
      });
    }
  },

  // Email certificates to participants
  emailCertificates: async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      const { certificateIds, message } = req.body; // Optional: specific certificates to email

      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: "Event ID is required",
        });
      }

      // Get certificates to email
      let query = supabase
        .from("certificates")
        .select(
          `
          *,
          registrations!registration_id (
            id,
            name,
            email
          ),
          events!event_id (
            id,
            title,
            start_date
          )
        `
        )
        .eq("event_id", eventId);

      if (certificateIds && certificateIds.length > 0) {
        query = query.in("id", certificateIds);
      }

      const { data: certificates, error } = await query;

      if (error) {
        console.error("Error fetching certificates for email:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch certificates",
        });
      }

      if (!certificates || certificates.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No certificates found to email",
        });
      }

      const emailResults = [];

      // Get current user ID from request (assuming it's set by auth middleware)
      const currentUserId = (req as any).user?.id;

      for (const certificate of certificates) {
        try {
          // Send email with certificate and track who sent it
          await CertificateGenerator.emailCertificate(
            certificate.registrations.email,
            certificate.registrations.name,
            certificate.events.title,
            certificate.certificate_url || certificate.file_url, // Use certificate_url if available, fallback to file_url
            certificate.certificate_code,
            certificate.verification_code,
            message ||
              `Congratulations! Your certificate for ${certificate.events.title} is ready.`,
            currentUserId // Pass the user who is sending the email
          );

          emailResults.push({
            certificateId: certificate.id,
            participantName: certificate.registrations.name,
            participantEmail: certificate.registrations.email,
            status: "sent",
          });

          console.log(
            `✅ Certificate emailed to ${certificate.registrations.email}`
          );
        } catch (error) {
          console.error(
            `❌ Failed to email certificate to ${certificate.registrations.email}:`,
            error
          );

          emailResults.push({
            certificateId: certificate.id,
            participantName: certificate.registrations.name,
            participantEmail: certificate.registrations.email,
            status: "failed",
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      const successCount = emailResults.filter(
        (r) => r.status === "sent"
      ).length;
      const failedCount = emailResults.filter(
        (r) => r.status === "failed"
      ).length;

      res.json({
        success: true,
        data: {
          results: emailResults,
          summary: {
            total: emailResults.length,
            sent: successCount,
            failed: failedCount,
          },
        },
        message: `Emailed ${successCount} certificates successfully${
          failedCount > 0 ? `, ${failedCount} failed` : ""
        }`,
      });
    } catch (error) {
      console.error("Error in emailCertificates:", error);
      res.status(500).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to email certificates",
      });
    }
  },

  // Get past events for certificate generation
  getPastEvents: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const now = new Date().toISOString();

      // Get events that have ended and belong to the user
      const { data: events, error } = await supabase
        .from("events")
        .select(
          `
          id,
          title,
          description,
          start_date,
          end_date,
          location,
          registrations:registrations(count)
        `
        )
        .eq("organizer_id", userId)
        .lt("end_date", now) // Only past events
        .order("end_date", { ascending: false });

      if (error) {
        console.error("Database error:", error);
        return res.status(500).json({
          success: false,
          error: "Failed to fetch events",
        });
      }

      // Format the response to include registration count
      const formattedEvents = (events || []).map((event) => ({
        ...event,
        status: "completed", // Set status as completed for past events
        registrations_count: Array.isArray(event.registrations)
          ? event.registrations[0]?.count || 0
          : 0,
      }));

      res.json({
        success: true,
        data: formattedEvents,
      });
    } catch (error) {
      console.error("Error fetching past events:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  },

  // Get certificates for an event
  getEventCertificates: async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;

      const { data, error } = await supabase
        .from("certificates")
        .select(
          `
          *,
          registrations(
            name,
            email,
            event_id
          ),
          certificate_templates(
            name,
            type
          )
        `
        )
        .eq("registrations.event_id", eventId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        data: data || [],
      });
    } catch (error) {
      console.error("Error fetching event certificates:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch certificates",
      });
    }
  },

  // Verify certificate by code
  verifyCertificate: async (req: Request, res: Response) => {
    try {
      const { code } = req.params;

      const { data, error } = await supabase
        .from("certificates")
        .select(
          `
          *,
          registrations(
            name,
            email,
            events(title, start_date, end_date, location)
          ),
          certificate_templates(
            name,
            type
          )
        `
        )
        .eq("verification_code", code)
        .single();

      if (error || !data) {
        return res.status(404).json({
          success: false,
          message: "Certificate not found",
        });
      }

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error("Error verifying certificate:", error);
      res.status(500).json({
        success: false,
        message: "Failed to verify certificate",
      });
    }
  },

  // Delete a certificate template
  deleteTemplate: async (req: Request, res: Response) => {
    try {
      const { templateId } = req.params;

      // Get template to delete file
      const { data: template } = await supabase
        .from("certificate_templates")
        .select("file_path")
        .eq("id", templateId)
        .single();

      // Delete from database
      const { error } = await supabase
        .from("certificate_templates")
        .delete()
        .eq("id", templateId);

      if (error) {
        throw error;
      }

      // Delete file if exists
      if (template?.file_path) {
        try {
          await fs.unlink(template.file_path);
        } catch (fileError) {
          console.error("Error deleting template file:", fileError);
        }
      }

      res.json({
        success: true,
        message: "Template deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting template:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete template",
      });
    }
  },

  // Download certificate by code
  downloadCertificate: async (req: Request, res: Response) => {
    try {
      const { code } = req.params;

      const { data, error } = await supabase
        .from("certificates")
        .select(
          `
          certificate_url,
          registrations!inner (
            name
          )
        `
        )
        .eq("verification_code", code)
        .single();

      if (error || !data) {
        return res.status(404).json({
          success: false,
          error: "Certificate not found",
        });
      }

      const registrationData = Array.isArray(data.registrations)
        ? data.registrations[0]
        : data.registrations;

      // For now, just return the certificate URL
      // In production, you might want to serve the actual file
      res.json({
        success: true,
        data: {
          downloadUrl: data.certificate_url,
          fileName: `${registrationData?.name}_Certificate.png`,
        },
      });
    } catch (error) {
      console.error("Error downloading certificate:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  },
};
