import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { authenticateToken } from "../middleware/auth.js";
import { Canvas, createCanvas, loadImage } from "canvas";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import PptxGenJS from "pptxgenjs";

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Certificate template configurations
const CERTIFICATE_CONFIG = {
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
};

// Generate unique certificate code
const generateCertificateCode = (): string => {
  return `CERT-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
};

// Create certificate image
const createCertificateImage = async (
  participantName: string,
  eventTitle: string,
  eventDate: string,
  certificateCode: string
): Promise<Buffer> => {
  const canvas = createCanvas(
    CERTIFICATE_CONFIG.width,
    CERTIFICATE_CONFIG.height
  );
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = CERTIFICATE_CONFIG.backgroundColor;
  ctx.fillRect(0, 0, CERTIFICATE_CONFIG.width, CERTIFICATE_CONFIG.height);

  // Border
  ctx.strokeStyle = CERTIFICATE_CONFIG.accentColor;
  ctx.lineWidth = 8;
  ctx.strokeRect(
    20,
    20,
    CERTIFICATE_CONFIG.width - 40,
    CERTIFICATE_CONFIG.height - 40
  );

  // Inner border
  ctx.strokeStyle = CERTIFICATE_CONFIG.titleColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(
    40,
    40,
    CERTIFICATE_CONFIG.width - 80,
    CERTIFICATE_CONFIG.height - 80
  );

  // Title
  ctx.fillStyle = CERTIFICATE_CONFIG.titleColor;
  ctx.font = CERTIFICATE_CONFIG.fonts.title;
  ctx.textAlign = "center";
  ctx.fillText(
    "CERTIFICATE OF PARTICIPATION",
    CERTIFICATE_CONFIG.width / 2,
    150
  );

  // Subtitle
  ctx.font = CERTIFICATE_CONFIG.fonts.subtitle;
  ctx.fillStyle = CERTIFICATE_CONFIG.textColor;
  ctx.fillText("This is to certify that", CERTIFICATE_CONFIG.width / 2, 220);

  // Participant name
  ctx.font = CERTIFICATE_CONFIG.fonts.name;
  ctx.fillStyle = CERTIFICATE_CONFIG.titleColor;
  ctx.fillText(participantName, CERTIFICATE_CONFIG.width / 2, 300);

  // Event participation text
  ctx.font = CERTIFICATE_CONFIG.fonts.text;
  ctx.fillStyle = CERTIFICATE_CONFIG.textColor;
  ctx.fillText(
    "has successfully participated in",
    CERTIFICATE_CONFIG.width / 2,
    360
  );

  // Event title
  ctx.font = CERTIFICATE_CONFIG.fonts.subtitle;
  ctx.fillStyle = CERTIFICATE_CONFIG.accentColor;
  ctx.fillText(eventTitle, CERTIFICATE_CONFIG.width / 2, 420);

  // Event date
  ctx.font = CERTIFICATE_CONFIG.fonts.text;
  ctx.fillStyle = CERTIFICATE_CONFIG.textColor;
  ctx.fillText(`Held on ${eventDate}`, CERTIFICATE_CONFIG.width / 2, 480);

  // Certificate code
  ctx.font = "16px Arial";
  ctx.textAlign = "right";
  ctx.fillText(
    `Certificate Code: ${certificateCode}`,
    CERTIFICATE_CONFIG.width - 60,
    CERTIFICATE_CONFIG.height - 60
  );

  // Date of issue
  ctx.textAlign = "left";
  ctx.fillText(
    `Issued on: ${new Date().toLocaleDateString()}`,
    60,
    CERTIFICATE_CONFIG.height - 60
  );

  return canvas.toBuffer("image/png");
};

// Create PowerPoint certificate from template
const createPowerPointCertificate = async (
  templatePath: string,
  placeholderMapping: Record<string, string>,
  certificateData: Record<string, string>
): Promise<Buffer> => {
  try {
    const pptx = new PptxGenJS();

    // Load the template PowerPoint file
    const templateBuffer = await fs.readFile(templatePath);

    // For now, we'll create a simple certificate
    // In a full implementation, we would parse the PPTX and replace placeholders

    const slide = pptx.addSlide();

    // Add a background (customize as needed)
    slide.background = { color: "ffffff" };

    // Apply data with placeholder mapping
    Object.entries(placeholderMapping).forEach(([placeholder, dataField]) => {
      const value = certificateData[dataField] || `{{${placeholder}}}`;

      // Add text box for each mapped field
      // This is a simplified implementation - in production you'd parse the actual PPTX structure
      slide.addText(value, {
        x: 1,
        y: 1,
        w: 8,
        h: 0.5,
        fontSize: 24,
        bold: true,
        align: "center",
      });
    });

    // Convert to buffer
    const pptxData = await pptx.write({ outputType: "base64" });
    const pptxBuffer = Buffer.from(pptxData as string, "base64");
    return pptxBuffer;
  } catch (error) {
    console.error("Error creating PowerPoint certificate:", error);
    throw new Error("Failed to generate PowerPoint certificate");
  }
};

// Generate certificate data object
const generateCertificateData = (
  participant: any,
  event: any,
  certificateCode: string
): Record<string, string> => {
  return {
    participant_name: participant.name || participant.email,
    participant_email: participant.email,
    event_title: event.title,
    event_description: event.description || `Event: ${event.title}`,
    event_date: new Date(event.start_date).toLocaleDateString(),
    event_location: event.location || "Online",
    certificate_code: certificateCode,
    issue_date: new Date().toLocaleDateString(),
    organizer_name: event.organizer_name || "Event Organizer",
    certificate_title: "Certificate of Participation",
  };
};

// GET /api/certificates/event/:eventId - Get all certificates for an event
router.get(
  "/event/:eventId",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      const userId = (req as any).user.id;

      // Check if user is organizer of the event
      const { data: event, error: eventError } = await supabase
        .from("events")
        .select("id, title, end_date, organizer_id, status")
        .eq("id", eventId)
        .single();

      if (eventError || !event) {
        return res.status(404).json({ error: "Event not found" });
      }

      if (event.organizer_id !== userId) {
        return res.status(403).json({
          error: "Access denied. Only event organizers can view certificates.",
        });
      }

      // Check if event has ended
      const now = new Date();
      const eventEndDate = new Date(event.end_date);

      if (now <= eventEndDate) {
        return res.status(400).json({
          error: "Certificates not available yet",
          message:
            "Certificates can only be generated after the event has ended.",
          eventEndDate: event.end_date,
        });
      }

      // Get certificates for this event with proper joins
      const { data: certificates, error: certError } = await supabase
        .from("certificates")
        .select(
          `
        id,
        certificate_code,
        issued_at,
        file_url,
        registrations!inner (
          id,
          name,
          email
        ),
        events!inner (
          id,
          title,
          start_date,
          end_date
        )
      `
        )
        .eq("event_id", eventId)
        .order("issued_at", { ascending: false });

      if (certError) {
        return res.status(500).json({ error: "Failed to fetch certificates" });
      }

      res.json({
        success: true,
        data: {
          event: {
            id: event.id,
            title: event.title,
            end_date: event.end_date,
          },
          certificates: certificates || [],
        },
      });
    } catch (error) {
      console.error("Error fetching event certificates:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// POST /api/certificates/generate - Generate certificates for event participants
router.post(
  "/generate",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { eventId, participantIds, templateId } = req.body;
      const userId = (req as any).user.id;

      if (!eventId) {
        return res.status(400).json({ error: "Event ID is required" });
      }

      // Check if user is organizer of the event
      const { data: event, error: eventError } = await supabase
        .from("events")
        .select("id, title, start_date, end_date, organizer_id, status")
        .eq("id", eventId)
        .single();

      if (eventError || !event) {
        return res.status(404).json({ error: "Event not found" });
      }

      if (event.organizer_id !== userId) {
        return res.status(403).json({
          error:
            "Access denied. Only event organizers can generate certificates.",
        });
      }

      // Check if event has ended
      const now = new Date();
      const eventEndDate = new Date(event.end_date);

      if (now <= eventEndDate) {
        return res.status(400).json({
          error: "Certificates cannot be generated yet",
          message:
            "Certificates can only be generated after the event has ended.",
          eventEndDate: event.end_date,
        });
      }

      // Get attended participants (those who checked in)
      let attendedParticipants;
      if (participantIds && participantIds.length > 0) {
        // Generate for specific participants
        const { data, error } = await supabase
          .from("attendance")
          .select(
            `
          registration_id,
          registrations (
            id,
            name,
            email,
            event_id
          )
        `
          )
          .eq("event_id", eventId)
          .eq("status", "checked_in")
          .in("registration_id", participantIds);

        if (error) {
          return res
            .status(500)
            .json({ error: "Failed to fetch participants" });
        }
        attendedParticipants = data;
      } else {
        // Generate for all attended participants
        const { data, error } = await supabase
          .from("attendance")
          .select(
            `
          registration_id,
          registrations (
            id,
            name,
            email,
            event_id
          )
        `
          )
          .eq("event_id", eventId)
          .eq("status", "checked_in");

        if (error) {
          return res
            .status(500)
            .json({ error: "Failed to fetch attended participants" });
        }
        attendedParticipants = data;
      }

      if (!attendedParticipants || attendedParticipants.length === 0) {
        return res.status(400).json({
          error: "No attended participants found for certificate generation",
        });
      }

      const generatedCertificates = [];
      const errors = [];

      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), "uploads", "certificates");
      try {
        await fs.mkdir(uploadsDir, { recursive: true });
      } catch (err) {
        console.error("Error creating uploads directory:", err);
      }

      for (const participant of attendedParticipants) {
        try {
          const registration = Array.isArray(participant.registrations)
            ? participant.registrations[0]
            : participant.registrations;

          if (!registration) {
            console.log(`No registration data found for participant`);
            continue;
          }

          // Check if certificate already exists
          const { data: existingCert } = await supabase
            .from("certificates")
            .select("id")
            .eq("event_id", eventId)
            .eq("registration_id", registration.id)
            .single();

          if (existingCert) {
            console.log(`Certificate already exists for ${registration.name}`);
            continue;
          }

          // Generate certificate
          const certificateCode = generateCertificateCode();
          const eventDate = new Date(event.start_date).toLocaleDateString();

          let certificateBuffer: Buffer;
          let fileExtension = "png";
          let fileName: string;
          let filePath: string;

          // Check if custom template is specified
          if (templateId && templateId !== "default") {
            // Get template from database
            const { data: template, error: templateError } = await supabase
              .from("certificate_templates")
              .select("*")
              .eq("id", templateId)
              .eq("event_id", eventId)
              .single();

            if (templateError || !template) {
              throw new Error("Template not found");
            }

            if (template.template?.type === "powerpoint") {
              // Generate PowerPoint certificate
              const certificateData = generateCertificateData(
                registration,
                event,
                certificateCode
              );

              certificateBuffer = await createPowerPointCertificate(
                template.template.file_path,
                template.template.placeholder_mapping || {},
                certificateData
              );
              fileExtension = "pptx";
            } else {
              // Use canvas for custom or default template
              certificateBuffer = await createCertificateImage(
                registration.name,
                event.title,
                eventDate,
                certificateCode
              );
            }
          } else {
            // Use default canvas template
            certificateBuffer = await createCertificateImage(
              registration.name,
              event.title,
              eventDate,
              certificateCode
            );
          }

          // Save certificate file
          fileName = `${certificateCode}.${fileExtension}`;
          filePath = path.join(uploadsDir, fileName);
          await fs.writeFile(filePath, certificateBuffer);

          // Save certificate record to database (using normalized design)
          const { data: certificate, error: certError } = await supabase
            .from("certificates")
            .insert({
              event_id: eventId,
              registration_id: registration.id,
              certificate_code: certificateCode,
              file_url: `/uploads/certificates/${fileName}`,
              issued_at: new Date().toISOString(),
              issued_by_id: userId,
              template_id: templateId || null, // Use provided template or default
            })
            .select("*")
            .single();

          if (certError) {
            errors.push(
              `Failed to save certificate for ${registration.name}: ${certError.message}`
            );
            continue;
          }

          generatedCertificates.push({
            participant: registration.name,
            email: registration.email,
            certificateCode: certificateCode,
            fileUrl: certificate.file_url,
          });

          console.log(`✅ Certificate generated for ${registration.name}`);
        } catch (error) {
          console.error(`Error generating certificate for participant:`, error);
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          errors.push(
            `Failed to generate certificate for participant: ${errorMessage}`
          );
        }
      }

      res.json({
        success: true,
        data: {
          generated: generatedCertificates.length,
          total: attendedParticipants.length,
          certificates: generatedCertificates,
          errors: errors.length > 0 ? errors : undefined,
        },
        message: `Successfully generated ${generatedCertificates.length} certificate(s)`,
      });
    } catch (error) {
      console.error("Error generating certificates:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// GET /api/certificates/verify/:code - Verify certificate by code
router.get("/verify/:code", async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    const { data: certificate, error } = await supabase
      .from("certificates")
      .select(
        `
        id,
        certificate_code,
        issued_at,
        file_url,
        registrations!inner (
          id,
          name,
          email
        ),
        events!inner (
          id,
          title,
          start_date,
          end_date,
          location
        )
      `
      )
      .eq("certificate_code", code)
      .single();

    if (error || !certificate) {
      return res.status(404).json({
        success: false,
        error: "Certificate not found or invalid code",
      });
    }

    const eventData = Array.isArray(certificate.events)
      ? certificate.events[0]
      : certificate.events;

    const registrationData = Array.isArray(certificate.registrations)
      ? certificate.registrations[0]
      : certificate.registrations;

    res.json({
      success: true,
      data: {
        valid: true,
        certificate: {
          code: certificate.certificate_code,
          participantName: registrationData?.name,
          participantEmail: registrationData?.email,
          issuedAt: certificate.issued_at,
          fileUrl: certificate.file_url,
          event: {
            title: eventData?.title,
            date: eventData?.start_date,
            location: eventData?.location,
          },
        },
      },
    });
  } catch (error) {
    console.error("Error verifying certificate:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/certificates/download/:code - Download certificate by code
router.get("/download/:code", async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    const { data: certificate, error } = await supabase
      .from("certificates")
      .select(
        `
        file_url,
        registrations!inner (
          name
        )
      `
      )
      .eq("certificate_code", code)
      .single();

    if (error || !certificate) {
      return res.status(404).json({ error: "Certificate not found" });
    }

    const registrationData = Array.isArray(certificate.registrations)
      ? certificate.registrations[0]
      : certificate.registrations;

    const filePath = path.join(process.cwd(), certificate.file_url);

    try {
      await fs.access(filePath);
      res.download(filePath, `${registrationData?.name}_Certificate.png`);
    } catch (err) {
      res.status(404).json({ error: "Certificate file not found" });
    }
  } catch (error) {
    console.error("Error downloading certificate:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
