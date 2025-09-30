import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { EmailService } from "../services/emailService.js";
import { getFreshAccessToken } from "../routes/emailAuth.js";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const CreateRegistrationSchema = z.object({
    eventId: z.string().uuid(),
    formData: z.record(z.any()).optional().default({}), // Will be stored as 'responses'
    email: z.string().email().optional(), // Optional if user is logged in
    name: z.string().min(1).optional(), // Optional if user is logged in
});
export class RegistrationController {
    // Register for an event
    static async registerForEvent(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: "Authentication required",
                });
                return;
            }
            const { eventId } = req.params;
            const validatedData = CreateRegistrationSchema.parse({
                eventId,
                formData: req.body.formData || {},
                email: req.body.email,
                name: req.body.name,
            });
            // Get user info - either from authenticated user or request body
            let userEmail = req.user?.email || validatedData.email;
            let userName = validatedData.name;
            // If user is authenticated, get their name from the database
            if (req.user?.id && !userName) {
                const { data: userData, error: userError } = await supabase
                    .from("users")
                    .select("name")
                    .eq("id", req.user.id)
                    .single();
                if (userData && !userError) {
                    userName = userData.name;
                }
            }
            if (!userEmail || !userName) {
                res.status(400).json({
                    success: false,
                    error: "Email and name are required for registration",
                });
                return;
            }
            // Check if event exists and is available for registration
            const { data: event, error: eventError } = await supabase
                .from("events")
                .select(`
          id, title, start_date, end_date, capacity, 
          organizer_id, visibility, registration_deadline,
          is_paid, price, location
        `)
                .eq("id", eventId)
                .single();
            if (eventError || !event) {
                res.status(404).json({
                    success: false,
                    error: "Event not found",
                });
                return;
            }
            // Check if user is the organizer (organizers can't register for their own events)
            if (event.organizer_id === userId) {
                res.status(403).json({
                    success: false,
                    error: "Organizers cannot register for their own events",
                });
                return;
            }
            // Check if event is private and user has access (for now, just check visibility)
            if (event.visibility === "private" ||
                event.visibility === "invite-only") {
                // TODO: Implement invitation system
                res.status(403).json({
                    success: false,
                    error: "This event requires an invitation",
                });
                return;
            }
            // Check registration deadline
            if (event.registration_deadline &&
                new Date() > new Date(event.registration_deadline)) {
                res.status(400).json({
                    success: false,
                    error: "Registration deadline has passed",
                });
                return;
            }
            // Check if event has already started
            if (new Date() > new Date(event.start_date)) {
                res.status(400).json({
                    success: false,
                    error: "Cannot register for an event that has already started",
                });
                return;
            }
            // Check if user is already registered
            const { data: existingRegistration } = await supabase
                .from("registrations")
                .select("id")
                .eq("event_id", eventId)
                .eq("user_id", userId)
                .single();
            if (existingRegistration) {
                res.status(409).json({
                    success: false,
                    error: "You are already registered for this event",
                });
                return;
            }
            // Check event capacity
            const { count: registrationCount } = await supabase
                .from("registrations")
                .select("*", { count: "exact", head: true })
                .eq("event_id", eventId)
                .eq("status", "confirmed");
            if (registrationCount && registrationCount >= event.capacity) {
                res.status(400).json({
                    success: false,
                    error: "Event is at full capacity",
                });
                return;
            }
            // Create registration first to get the ID
            const { data: registration, error: registrationError } = await supabase
                .from("registrations")
                .insert({
                event_id: eventId,
                user_id: userId || null,
                email: userEmail,
                name: userName,
                responses: validatedData.formData,
                status: "confirmed",
                qr_code: "", // We'll update this after getting the ID
            })
                .select(`
          id, status, created_at, responses, qr_code, email, name,
          event:event_id(id, title, start_date, location),
          user:user_id(id, name, email)
        `)
                .single();
            if (registrationError) {
                console.error("Registration creation error:", registrationError);
                res.status(500).json({
                    success: false,
                    error: "Failed to create registration",
                });
                return;
            }
            // Generate QR code using eventId:registrationId format
            const qrCode = `${eventId}:${registration.id}`;
            // Update registration with QR code
            const { error: updateError } = await supabase
                .from("registrations")
                .update({ qr_code: qrCode })
                .eq("id", registration.id);
            if (updateError) {
                console.error("Failed to update QR code:", updateError);
                // Continue anyway, we can generate QR code on the fly if needed
            }
            // Update the registration object with the QR code
            registration.qr_code = qrCode;
            // Send registration confirmation email
            console.log("📧 Attempting to send registration confirmation email to:", userEmail);
            try {
                // Check if the organizer has granted Gmail permission for delegated sending
                let organizerUserId = null;
                if (event?.organizer_id) {
                    organizerUserId = event.organizer_id;
                }
                const freshTokenData = organizerUserId
                    ? await getFreshAccessToken(organizerUserId)
                    : null;
                if (freshTokenData) {
                    console.log("🔑 Using organizer-delegated Gmail sending from:", freshTokenData.email);
                    console.log("🎫 Has access token:", !!freshTokenData.accessToken);
                    console.log("🔄 Has refresh token:", !!freshTokenData.refreshToken);
                }
                else {
                    console.log("⚠️ No organizer Gmail permission, using system email");
                }
                // Prepare email template data
                const eventDate = new Date(event.start_date).toLocaleDateString();
                const eventTime = new Date(event.start_date).toLocaleTimeString();
                const ticketUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/ticket/${registration.id}`;
                const emailData = {
                    participantName: registration.name || "Participant",
                    eventTitle: event.title,
                    eventDate: eventDate,
                    eventTime: eventTime,
                    eventLocation: event.location || "TBA",
                    qrCode: registration.qr_code,
                    registrationId: registration.id,
                    ticketUrl: ticketUrl,
                };
                const emailSent = await EmailService.sendRegistrationConfirmation(userEmail, emailData, freshTokenData?.email, freshTokenData?.accessToken, freshTokenData?.refreshToken);
                if (emailSent) {
                    console.log(`✅ Registration confirmation sent successfully to: ${userEmail}`);
                }
                else {
                    console.log(`⚠️ Registration confirmation could not be sent to: ${userEmail} (but registration was created)`);
                }
            }
            catch (emailError) {
                console.error("📧 Email sending failed:", emailError);
                // Don't fail the whole operation if email fails
            }
            res.status(201).json({
                success: true,
                message: "Successfully registered for event",
                data: { registration },
            });
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({
                    success: false,
                    error: "Invalid registration data",
                    details: error.errors,
                });
                return;
            }
            console.error("Registration error:", error);
            res.status(500).json({
                success: false,
                error: "Internal server error",
            });
        }
    }
    // Get registrations for an event (organizers only)
    static async getEventRegistrations(req, res) {
        try {
            const userId = req.user?.id;
            const userRole = req.user?.role;
            const { eventId } = req.params;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: "Authentication required",
                });
                return;
            }
            // Check if user is the organizer or admin
            const { data: event, error: eventError } = await supabase
                .from("events")
                .select("organizer_id")
                .eq("id", eventId)
                .single();
            if (eventError || !event) {
                res.status(404).json({
                    success: false,
                    error: "Event not found",
                });
                return;
            }
            if (userRole !== "admin" && event.organizer_id !== userId) {
                res.status(403).json({
                    success: false,
                    error: "You can only view registrations for your own events",
                });
                return;
            }
            // Get registrations
            const { data: registrations, error } = await supabase
                .from("registrations")
                .select(`
          id, status, created_at, updated_at, email, name, responses, qr_code,
          user:user_id(id, name, email, phone_number)
        `)
                .eq("event_id", eventId)
                .order("created_at", { ascending: false });
            if (error) {
                console.error("Get registrations error:", error);
                res.status(500).json({
                    success: false,
                    error: "Failed to fetch registrations",
                });
                return;
            }
            res.json({
                success: true,
                data: { registrations },
            });
        }
        catch (error) {
            console.error("Get event registrations error:", error);
            res.status(500).json({
                success: false,
                error: "Internal server error",
            });
        }
    }
    // Get user's registrations
    static async getUserRegistrations(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: "Authentication required",
                });
                return;
            }
            const { data: registrations, error } = await supabase
                .from("registrations")
                .select(`
          id, status, created_at, email, name, responses, qr_code,
          event:event_id(
            id, title, description, start_date, end_date, 
            location, banner_url, is_paid, price
          )
        `)
                .eq("user_id", userId)
                .order("created_at", { ascending: false });
            if (error) {
                console.error("Get user registrations error:", error);
                res.status(500).json({
                    success: false,
                    error: "Failed to fetch registrations",
                });
                return;
            }
            // Fix QR codes for registrations that don't have the correct format
            const updatedRegistrations = await Promise.all(registrations.map(async (registration) => {
                if (!registration.qr_code || !registration.qr_code.includes(":")) {
                    // Generate correct QR code format: eventId:registrationId
                    const correctQrCode = `${registration.event.id}:${registration.id}`;
                    // Update in database
                    await supabase
                        .from("registrations")
                        .update({ qr_code: correctQrCode })
                        .eq("id", registration.id);
                    // Update local object
                    registration.qr_code = correctQrCode;
                }
                return registration;
            }));
            res.json({
                success: true,
                data: { registrations: updatedRegistrations },
            });
        }
        catch (error) {
            console.error("Get user registrations error:", error);
            res.status(500).json({
                success: false,
                error: "Internal server error",
            });
        }
    }
    // Cancel registration
    static async cancelRegistration(req, res) {
        try {
            const userId = req.user?.id;
            const { registrationId } = req.params;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: "Authentication required",
                });
                return;
            }
            // Check if registration exists and belongs to user
            const { data: registration, error: fetchError } = await supabase
                .from("registrations")
                .select(`
          id, user_id, status,
          event:event_id(id, title, start_date)
        `)
                .eq("id", registrationId)
                .single();
            if (fetchError || !registration) {
                res.status(404).json({
                    success: false,
                    error: "Registration not found",
                });
                return;
            }
            if (registration.user_id !== userId) {
                res.status(403).json({
                    success: false,
                    error: "You can only cancel your own registrations",
                });
                return;
            }
            // Check if event has already started
            const eventData = Array.isArray(registration.event)
                ? registration.event[0]
                : registration.event;
            if (eventData && new Date() > new Date(eventData.start_date)) {
                res.status(400).json({
                    success: false,
                    error: "Cannot cancel registration for an event that has already started",
                });
                return;
            }
            // Update registration status to cancelled
            const { error: updateError } = await supabase
                .from("registrations")
                .update({
                status: "cancelled",
                updated_at: new Date().toISOString(),
            })
                .eq("id", registrationId);
            if (updateError) {
                console.error("Cancel registration error:", updateError);
                res.status(500).json({
                    success: false,
                    error: "Failed to cancel registration",
                });
                return;
            }
            res.json({
                success: true,
                message: "Registration cancelled successfully",
            });
        }
        catch (error) {
            console.error("Cancel registration error:", error);
            res.status(500).json({
                success: false,
                error: "Internal server error",
            });
        }
    }
    // Check registration status for a specific event and user
    static async checkRegistrationStatus(req, res) {
        try {
            const userId = req.user?.id;
            const { eventId } = req.params;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: "Authentication required",
                });
                return;
            }
            const { data: registration, error } = await supabase
                .from("registrations")
                .select("id, status, created_at")
                .eq("event_id", eventId)
                .eq("user_id", userId)
                .single();
            if (error && error.code !== "PGRST116") {
                // PGRST116 is "not found"
                console.error("Check registration status error:", error);
                res.status(500).json({
                    success: false,
                    error: "Failed to check registration status",
                });
                return;
            }
            res.json({
                success: true,
                data: {
                    isRegistered: !!registration,
                    registration: registration || null,
                },
            });
        }
        catch (error) {
            console.error("Check registration status error:", error);
            res.status(500).json({
                success: false,
                error: "Internal server error",
            });
        }
    }
    // Get single registration by ID (for ticket display)
    static async getRegistrationById(req, res) {
        try {
            const { registrationId } = req.params;
            const userId = req.user.id;
            if (!registrationId) {
                res.status(400).json({
                    success: false,
                    error: "Registration ID is required",
                });
                return;
            }
            // Fetch registration with event details
            const { data: registration, error: fetchError } = await supabase
                .from("registrations")
                .select(`
          id, name, email, qr_code, status, created_at, user_id,
          event:event_id(id, title, start_date, end_date, location)
        `)
                .eq("id", registrationId)
                .single();
            if (fetchError || !registration) {
                res.status(404).json({
                    success: false,
                    error: "Registration not found",
                });
                return;
            }
            // Check if user has access to this registration
            // Users can only view their own registrations
            if (registration.user_id && registration.user_id !== userId) {
                res.status(403).json({
                    success: false,
                    error: "You don't have permission to view this registration",
                });
                return;
            }
            // For non-authenticated registrations, check by email
            if (!registration.user_id) {
                // Get user's email to verify access
                const { data: userData } = await supabase
                    .from("users")
                    .select("email")
                    .eq("id", userId)
                    .single();
                if (!userData || userData.email !== registration.email) {
                    res.status(403).json({
                        success: false,
                        error: "You don't have permission to view this registration",
                    });
                    return;
                }
            }
            // Fix the event data structure (Supabase returns array, we want object)
            const eventData = Array.isArray(registration.event)
                ? registration.event[0]
                : registration.event;
            // Fix QR code if it doesn't have the correct format
            if (!registration.qr_code || !registration.qr_code.includes(":")) {
                const correctQrCode = `${eventData.id}:${registration.id}`;
                // Update in database
                await supabase
                    .from("registrations")
                    .update({ qr_code: correctQrCode })
                    .eq("id", registration.id);
                // Update local object
                registration.qr_code = correctQrCode;
            }
            const formattedRegistration = {
                ...registration,
                event: eventData,
            };
            res.json({
                success: true,
                data: formattedRegistration,
            });
        }
        catch (error) {
            console.error("Get registration error:", error);
            res.status(500).json({
                success: false,
                error: "Internal server error",
            });
        }
    }
}
