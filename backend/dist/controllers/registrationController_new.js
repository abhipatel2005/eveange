import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
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
          is_paid, price
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
            // Generate QR code
            const qrCode = `QR_${Math.random()
                .toString(36)
                .substr(2, 8)
                .toUpperCase()}_${Date.now()}`;
            // Create registration
            const { data: registration, error: registrationError } = await supabase
                .from("registrations")
                .insert({
                event_id: eventId,
                user_id: userId || null,
                email: userEmail,
                name: userName,
                responses: validatedData.formData,
                status: "confirmed",
                qr_code: qrCode,
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
                    error: "Failed to register for event",
                });
                return;
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
          id, status, created_at, email, name, responses,
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
            res.json({
                success: true,
                data: { registrations },
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
}
