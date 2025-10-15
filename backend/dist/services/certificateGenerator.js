import { createClient } from "@supabase/supabase-js";
import { createCanvas } from "canvas";
import fs from "fs/promises";
import crypto from "crypto";
import JSZip from "jszip";
import EmailService from "./emailService.js";
import { azureBlobService } from "../config/azure.js";
import { TemplateService } from "./templateService.js";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
export const AVAILABLE_DATA_FIELDS = [
    // Participant fields
    {
        key: "participant_name",
        label: "Participant Name",
        description: "Full name of the participant",
        category: "participant",
        dataType: "text",
        example: "John Doe",
    },
    {
        key: "participant_email",
        label: "Participant Email",
        description: "Email address of the participant",
        category: "participant",
        dataType: "email",
        example: "john@example.com",
    },
    {
        key: "participant_phone",
        label: "Participant Phone",
        description: "Phone number from registration",
        category: "participant",
        dataType: "phone",
        example: "+1234567890",
    },
    {
        key: "participant_organization",
        label: "Participant Organization",
        description: "Organization name from registration",
        category: "participant",
        dataType: "text",
        example: "Tech Corp",
    },
    // Event fields
    {
        key: "event_title",
        label: "Event Title",
        description: "Name of the event",
        category: "event",
        dataType: "text",
        example: "Tech Conference 2025",
    },
    {
        key: "event_description",
        label: "Event Description",
        description: "Event description",
        category: "event",
        dataType: "text",
        example: "Annual technology conference",
    },
    {
        key: "event_location",
        label: "Event Location",
        description: "Event venue or location",
        category: "event",
        dataType: "text",
        example: "New York Convention Center",
    },
    {
        key: "event_start_date",
        label: "Event Start Date",
        description: "Event start date",
        category: "event",
        dataType: "date",
        example: "January 15, 2025",
    },
    {
        key: "event_end_date",
        label: "Event End Date",
        description: "Event end date",
        category: "event",
        dataType: "date",
        example: "January 17, 2025",
    },
    {
        key: "event_date_range",
        label: "Event Date Range",
        description: "Complete date range",
        category: "event",
        dataType: "text",
        example: "January 15-17, 2025",
    },
    {
        key: "event_organizer",
        label: "Event Organizer",
        description: "Name of the event organizer",
        category: "event",
        dataType: "text",
        example: "Event Management Inc.",
    },
    // Registration fields
    {
        key: "registration_date",
        label: "Registration Date",
        description: "Date when participant registered",
        category: "registration",
        dataType: "date",
        example: "December 1, 2024",
    },
    {
        key: "attendance_date",
        label: "Attendance Date",
        description: "Date when participant attended",
        category: "registration",
        dataType: "date",
        example: "January 15, 2025",
    },
    {
        key: "registration_id",
        label: "Registration ID",
        description: "Unique registration identifier",
        category: "registration",
        dataType: "text",
        example: "REG-12345",
    },
    // System fields
    {
        key: "certificate_code",
        label: "Certificate Code",
        description: "Unique certificate verification code",
        category: "system",
        dataType: "text",
        example: "CERT-ABC123XYZ",
    },
    {
        key: "certificate_issue_date",
        label: "Certificate Issue Date",
        description: "Date when certificate was issued",
        category: "system",
        dataType: "date",
        example: "January 20, 2025",
    },
    {
        key: "certificate_serial",
        label: "Certificate Serial Number",
        description: "Sequential certificate number",
        category: "system",
        dataType: "number",
        example: "001",
    },
    {
        key: "certificate_url",
        label: "Certificate URL",
        description: "URL for certificate verification",
        category: "system",
        dataType: "text",
        example: "https://verify.example.com/CERT-ABC123",
    },
];
export class CertificateGenerator {
    /**
     * Get all participants eligible for certificates (those who attended)
     */
    static async getEligibleParticipants(eventId) {
        const { data, error } = await supabase
            .from("registrations")
            .select(`
        id,
        name,
        email,
        responses,
        created_at,
        qr_code,
        attendance!inner(
          checked_in_at
        )
      `)
            .eq("event_id", eventId)
            .eq("status", "confirmed");
        if (error) {
            throw new Error(`Failed to fetch participants: ${error.message}`);
        }
        return data.map((participant) => ({
            id: participant.id,
            name: participant.name,
            email: participant.email,
            phone: participant.responses?.phone || "",
            organization: participant.responses?.organization || "",
            registration_date: participant.created_at,
            attendance_date: participant.attendance?.[0]?.checked_in_at,
            registration_id: participant.qr_code,
            custom_fields: participant.responses || {},
        }));
    }
    /**
     * Get event data for certificate generation
     */
    static async getEventData(eventId) {
        const { data, error } = await supabase
            .from("events")
            .select(`
        id,
        title,
        description,
        location,
        start_date,
        end_date,
        organizer_id,
        users!organizer_id(
          name,
          organization_name
        )
      `)
            .eq("id", eventId)
            .single();
        if (error || !data) {
            throw new Error(`Failed to fetch event data: ${error?.message}`);
        }
        const organizer = Array.isArray(data.users) ? data.users[0] : data.users;
        return {
            id: data.id,
            title: data.title,
            description: data.description,
            location: data.location,
            start_date: data.start_date,
            end_date: data.end_date,
            organizer_name: organizer?.name || "Event Organizer",
            organizer_organization: organizer?.organization_name,
        };
    }
    /**
     * Generate certificate data object for a participant
     */
    static generateCertificateData(participant, event, certificateCode, serialNumber) {
        const formatDate = (dateString) => {
            return new Date(dateString).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
            });
        };
        const formatDateRange = (startDate, endDate) => {
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (start.toDateString() === end.toDateString()) {
                return formatDate(startDate);
            }
            return `${formatDate(startDate)} - ${formatDate(endDate)}`;
        };
        return {
            // Participant fields
            participant_name: participant.name,
            participant_email: participant.email,
            participant_phone: participant.phone || "",
            participant_organization: participant.organization || "",
            // Event fields
            event_title: event.title,
            event_description: event.description,
            event_location: event.location,
            event_start_date: formatDate(event.start_date),
            event_end_date: formatDate(event.end_date),
            event_date_range: formatDateRange(event.start_date, event.end_date),
            event_organizer: event.organizer_name,
            // Registration fields
            registration_date: formatDate(participant.registration_date),
            attendance_date: participant.attendance_date
                ? formatDate(participant.attendance_date)
                : "",
            registration_id: participant.registration_id,
            // System fields
            certificate_code: certificateCode,
            certificate_issue_date: formatDate(new Date().toISOString()),
            certificate_serial: serialNumber.toString().padStart(3, "0"),
            certificate_url: `${process.env.FRONTEND_URL}/certificate/verify?code=${certificateCode}`,
            // Add any custom fields from registration
            ...Object.keys(participant.custom_fields).reduce((acc, key) => {
                acc[`custom_${key}`] = String(participant.custom_fields[key] || "");
                return acc;
            }, {}),
        };
    }
    /**
     * Extract placeholders from PowerPoint template (supports both local and Azure storage)
     */
    static async extractPlaceholdersFromPPTX(filePath, templateId) {
        try {
            let templateData;
            // Try to load from Azure storage first if templateId is provided
            if (templateId) {
                try {
                    console.log(`📥 Loading template ${templateId} for placeholder extraction...`);
                    templateData = await TemplateService.getTemplateFile(templateId);
                }
                catch (azureError) {
                    console.warn(`⚠️ Could not load template from storage, using local path:`, azureError);
                    templateData = await fs.readFile(filePath);
                }
            }
            else {
                templateData = await fs.readFile(filePath);
            }
            const zip = new JSZip();
            const contents = await zip.loadAsync(templateData);
            const placeholders = new Set();
            const placeholderRegex = /\{\{([^}]+)\}\}/g;
            // Search through slide XML files
            for (const [filename, file] of Object.entries(contents.files)) {
                if (filename.startsWith("ppt/slides/slide") &&
                    filename.endsWith(".xml")) {
                    const content = await file.async("string");
                    let match;
                    while ((match = placeholderRegex.exec(content)) !== null) {
                        placeholders.add(match[1].trim());
                    }
                }
            }
            console.log(`🔍 Found ${placeholders.size} placeholders in template`);
            return Array.from(placeholders);
        }
        catch (error) {
            console.error("Error extracting placeholders:", error);
            return [];
        }
    }
    /**
     * Generate certificate using PowerPoint template (supports both local and Azure storage)
     */
    static async generatePowerPointCertificate(templatePath, certificateData, placeholderMapping, templateId) {
        try {
            let templateData;
            // Check if templateId is provided and try to load from Azure first
            if (templateId) {
                try {
                    console.log(`📥 Loading template ${templateId} from storage...`);
                    templateData = await TemplateService.getTemplateFile(templateId);
                    console.log(`✅ Template loaded successfully from storage`);
                }
                catch (azureError) {
                    console.warn(`⚠️ Could not load template from storage, falling back to local path:`, azureError);
                    templateData = await fs.readFile(templatePath);
                }
            }
            else {
                // Fallback to local file path
                console.log(`📁 Loading template from local path: ${templatePath}`);
                templateData = await fs.readFile(templatePath);
            }
            const zip = new JSZip();
            const contents = await zip.loadAsync(templateData);
            // Process each slide file
            for (const [filename, file] of Object.entries(contents.files)) {
                if (filename.startsWith("ppt/slides/slide") &&
                    filename.endsWith(".xml")) {
                    let content = await file.async("string");
                    // Replace placeholders with actual data
                    Object.entries(placeholderMapping).forEach(([placeholder, dataFieldKey]) => {
                        const value = certificateData[dataFieldKey] || `{{${placeholder}}}`;
                        const placeholderPattern = new RegExp(`\\{\\{${placeholder}\\}\\}`, "g");
                        content = content.replace(placeholderPattern, value);
                    });
                    // Update the file in the zip
                    zip.file(filename, content);
                }
            }
            // Generate the modified PowerPoint file with compression optimization
            const result = await zip.generateAsync({
                type: "uint8array",
                compression: "DEFLATE",
                compressionOptions: {
                    level: 6, // Balanced compression level (0-9)
                },
            });
            const finalBuffer = Buffer.from(result);
            console.log(`📦 Generated certificate: ${finalBuffer.length} bytes`);
            return finalBuffer;
        }
        catch (error) {
            console.error("Error generating PowerPoint certificate:", error);
            throw new Error("Failed to generate PowerPoint certificate");
        }
    }
    /**
     * Generate certificate using Canvas (for simple templates)
     */
    static async generateCanvasCertificate(certificateData, template) {
        const canvas = createCanvas(template.width || 1200, template.height || 800);
        const ctx = canvas.getContext("2d");
        // Background
        ctx.fillStyle = template.backgroundColor || "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Apply template elements
        if (template.elements) {
            for (const element of template.elements) {
                switch (element.type) {
                    case "text":
                        ctx.fillStyle = element.color || "#000000";
                        ctx.font = element.font || "20px Arial";
                        ctx.textAlign = element.align || "left";
                        const text = certificateData[element.dataField] || element.text || "";
                        ctx.fillText(text, element.x, element.y);
                        break;
                    case "border":
                        ctx.strokeStyle = element.color || "#000000";
                        ctx.lineWidth = element.width || 2;
                        ctx.strokeRect(element.x, element.y, element.w, element.h);
                        break;
                    // Add more element types as needed
                }
            }
        }
        return canvas.toBuffer("image/png");
    }
    /**
     * Generate a unique certificate code
     */
    static generateCertificateCode() {
        return `CERT-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
    }
    /**
     * Generate a unique verification code for certificate authenticity
     */
    static generateVerificationCode() {
        return `VERIFY-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
    }
    /**
     * Save certificate to storage and database
     */
    static async saveCertificate(registrationId, eventId, templateId, certificateBuffer, certificateCode, verificationCode, fileExtension, issuedById) {
        try {
            // Validate UUIDs format
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(registrationId)) {
                throw new Error(`Invalid registration ID format: ${registrationId}`);
            }
            if (!uuidRegex.test(eventId)) {
                throw new Error(`Invalid event ID format: ${eventId}`);
            }
            if (templateId && !uuidRegex.test(templateId)) {
                throw new Error(`Invalid template ID format: ${templateId}`);
            }
            // Verify that the registration exists and belongs to the event
            console.log(`🔍 Verifying registration ${registrationId} exists for event ${eventId}...`);
            const { data: registration, error: regError } = await supabase
                .from("registrations")
                .select("id, event_id, name, email")
                .eq("id", registrationId)
                .eq("event_id", eventId)
                .single();
            if (regError || !registration) {
                console.error(`❌ Registration verification failed:`, regError);
                throw new Error(`Registration ${registrationId} not found for event ${eventId}`);
            }
            console.log(`✅ Registration verified: ${registration.name} (${registration.email})`);
            // Verify that the event exists
            console.log(`🔍 Verifying event ${eventId} exists...`);
            const { data: event, error: eventError } = await supabase
                .from("events")
                .select("id, title, organizer_id")
                .eq("id", eventId)
                .single();
            if (eventError || !event) {
                console.error(`❌ Event verification failed:`, eventError);
                throw new Error(`Event ${eventId} not found`);
            }
            console.log(`✅ Event verified: ${event.title}`);
            // Generate a unique filename for Azure Blob Storage
            const fileName = azureBlobService.generateFileName(eventId, registrationId, fileExtension);
            console.log(`📤 Uploading certificate to Azure Blob Storage: ${fileName}`);
            // Upload to Azure Blob Storage
            const azureUrl = await azureBlobService.uploadCertificate(fileName, certificateBuffer);
            console.log(`✅ Certificate uploaded successfully: ${azureUrl}`);
            // Generate secure SAS URL for certificate access
            const secureUrl = await azureBlobService.generateSASUrl(fileName, 8760); // Valid for 1 year
            console.log(`🔐 Generated secure SAS URL for certificate access`);
            // Get the event organizer ID if issuedById is not provided
            let finalIssuedById = issuedById;
            if (!finalIssuedById) {
                finalIssuedById = event.organizer_id;
            }
            if (!finalIssuedById) {
                throw new Error("Unable to determine who issued the certificate");
            }
            if (!uuidRegex.test(finalIssuedById)) {
                throw new Error(`Invalid issued_by_id format: ${finalIssuedById}`);
            }
            console.log(`📝 Preparing to save certificate to database...`);
            console.log(`📝 Registration ID: ${registrationId}`);
            console.log(`📝 Event ID: ${eventId}`);
            console.log(`📝 Template ID: ${templateId || "null"}`);
            console.log(`📝 Certificate Code: ${certificateCode}`);
            console.log(`📝 Verification Code: ${verificationCode}`);
            console.log(`📝 Issued By ID: ${finalIssuedById}`);
            console.log(`📝 Certificate URL: ${secureUrl}`);
            // Save certificate record to database with secure SAS URL
            // Try with certificate_url first, fall back to file_url for backward compatibility
            const certificateData = {
                registration_id: registrationId,
                event_id: eventId,
                template_id: templateId || null,
                certificate_code: certificateCode,
                verification_code: verificationCode,
                issued_by_id: finalIssuedById,
                certificate_url: secureUrl, // Preferred field
                file_url: secureUrl, // Backward compatibility
            };
            const { data, error } = await supabase
                .from("certificates")
                .insert(certificateData)
                .select()
                .single();
            if (error) {
                console.error(`❌ Database error saving certificate:`, error);
                console.error(`❌ Error code: ${error.code}`);
                console.error(`❌ Error details: ${error.details}`);
                console.error(`❌ Error hint: ${error.hint}`);
                console.error(`❌ Error message: ${error.message}`);
                // Additional debugging: check if table exists and what columns it has
                try {
                    const { data: tableInfo, error: tableError } = await supabase
                        .from("information_schema.columns")
                        .select("column_name, data_type, is_nullable")
                        .eq("table_name", "certificates");
                    if (tableError) {
                        console.error(`❌ Could not check table structure:`, tableError);
                    }
                    else {
                        console.log(`📋 Certificates table structure:`, tableInfo);
                    }
                }
                catch (structureError) {
                    console.error(`❌ Error checking table structure:`, structureError);
                }
                throw new Error(`Failed to save certificate record: ${error.message}`);
            }
            console.log(`✅ Certificate record saved to database with ID: ${data.id}`);
            return secureUrl; // Return secure SAS URL
        }
        catch (error) {
            console.error(`❌ Error in saveCertificate:`, error);
            throw error;
        }
    }
    /**
     * Email certificate to participant
     */
    static async emailCertificate(participantEmail, participantName, eventTitle, certificateUrl, certificateCode, verificationCode, customMessage, sentByUserId) {
        try {
            console.log(`📧 Sending certificate email to ${participantEmail}...`);
            const success = await EmailService.sendCertificateEmail(participantEmail, participantName, eventTitle, certificateUrl, certificateCode, verificationCode, customMessage);
            if (!success) {
                throw new Error("Failed to send certificate email");
            }
            // Update database with successful email sending
            await this.updateEmailSentStatus(certificateCode, true, sentByUserId);
            console.log(`✅ Certificate email sent successfully to ${participantEmail}`);
        }
        catch (error) {
            console.error("❌ Error sending certificate email:", error);
            throw error;
        }
    }
    /**
     * Update email sent status in database using existing schema
     */
    static async updateEmailSentStatus(certificateCode, emailSent, sentByUserId) {
        try {
            const updateData = {
                email_sent: emailSent,
                updated_at: new Date().toISOString(),
            };
            if (emailSent) {
                updateData.email_sent_at = new Date().toISOString();
                if (sentByUserId) {
                    updateData.email_sent_by = sentByUserId;
                }
            }
            const { error } = await supabase
                .from("certificates")
                .update(updateData)
                .eq("certificate_code", certificateCode);
            if (error) {
                console.error(`❌ Failed to update email status:`, error);
            }
            else {
                console.log(`📝 Updated email_sent to '${emailSent}' for certificate ${certificateCode}`);
                if (emailSent) {
                    console.log(`📝 Email sent timestamp recorded: ${updateData.email_sent_at}`);
                }
            }
        }
        catch (error) {
            console.error(`❌ Error updating email status:`, error);
        }
    }
}
