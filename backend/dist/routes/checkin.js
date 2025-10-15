import { Router } from "express";
import { supabase, supabaseAdmin } from "../config/supabase.js";
import { authenticateToken } from "../middleware/auth.js";
import { EmailService } from "../services/emailService.js";
import { getFreshAccessToken } from "./emailAuth.js";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
const router = Router();
// Schema for adding staff
const addStaffSchema = z.object({
    email: z.string().email(),
    name: z.string().min(1),
    permissions: z.array(z.string()).optional().default(["check-in"]),
});
// Add staff member to event
router.post("/events/:eventId/staff", authenticateToken, async (req, res) => {
    try {
        const eventId = req.params.eventId; // Keep as string (UUID)
        const userId = req.user.id;
        console.log("🏁 Adding staff member - START");
        console.log("📝 Request body:", JSON.stringify(req.body, null, 2));
        console.log("🆔 Event ID:", eventId);
        console.log("👤 User ID:", userId);
        console.log("🔑 Auth headers:", req.headers.authorization?.substring(0, 20) + "...");
        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(eventId)) {
            console.log("❌ Invalid UUID format for eventId:", eventId);
            return res.status(400).json({
                error: "Invalid event ID format",
                details: "Event ID must be a valid UUID",
            });
        }
        // Validate request body
        const validationResult = addStaffSchema.safeParse(req.body);
        if (!validationResult.success) {
            console.log("❌ Validation failed:", validationResult.error.errors);
            return res.status(400).json({
                error: "Invalid input",
                details: validationResult.error.errors,
            });
        }
        const { email, name, permissions } = validationResult.data;
        // Check if event exists and user is the creator
        console.log("🔍 Checking event access...");
        console.log("Looking for event ID:", eventId);
        console.log("User ID:", userId);
        const { data: event, error: eventError } = await supabase
            .from("events")
            .select("*")
            .eq("id", eventId)
            .eq("organizer_id", userId)
            .single();
        console.log("📅 Event query result:", { event, eventError });
        if (eventError || !event) {
            console.log("❌ Event not found or unauthorized");
            return res.status(404).json({
                error: "Event not found or unauthorized",
            });
        }
        console.log("✅ Event found:", event.title);
        // Check if staff member already exists
        console.log("👤 Checking if user exists...");
        let staffUser;
        const { data: existingUser } = await supabase
            .from("users")
            .select("*")
            .eq("email", email)
            .single();
        console.log("👤 Existing user check result:", existingUser);
        if (existingUser) {
            // User exists, check if already assigned to this event
            console.log("🔍 User exists, checking assignment...");
            const { data: existingAssignment } = await supabase
                .from("staff_assignments")
                .select("*")
                .eq("staff_id", existingUser.id)
                .eq("event_id", eventId)
                .single();
            console.log("📋 Assignment check result:", existingAssignment);
            if (existingAssignment) {
                console.log("❌ Staff already assigned");
                return res.status(400).json({
                    error: "Staff member already assigned to this event",
                });
            }
            staffUser = existingUser;
            console.log("✅ Using existing user");
        }
        else {
            // Create new user for staff member
            console.log("🔨 Creating new user...");
            const tempPassword = crypto.randomBytes(8).toString("hex");
            const hashedPassword = await bcrypt.hash(tempPassword, 10);
            const { data: newUser, error: userError } = await supabaseAdmin
                .from("users")
                .insert({
                email,
                name,
                password_hash: hashedPassword,
                role: "staff",
            })
                .select("*")
                .single();
            console.log("👤 User creation result:", { newUser, userError });
            if (userError || !newUser) {
                console.log("❌ User creation failed");
                return res.status(400).json({
                    error: "Failed to create staff user",
                    details: userError?.message,
                });
            }
            staffUser = newUser;
            // Send email with login credentials
            console.log("📧 Attempting to send staff credentials email to:", email);
            // Check if user has granted Gmail permission for delegated sending
            const freshTokenData = await getFreshAccessToken(userId);
            if (freshTokenData) {
                console.log("🔑 Using user-delegated Gmail sending from:", freshTokenData.email);
                console.log("🎫 Has access token:", !!freshTokenData.accessToken);
                console.log("🔄 Has refresh token:", !!freshTokenData.refreshToken);
            }
            else {
                console.log("⚠️ No user Gmail permission, using system email");
            }
            try {
                const emailSent = await EmailService.sendStaffCredentials(email, name, tempPassword, event.title, `${process.env.FRONTEND_URL || "http://localhost:5173"}/login`, freshTokenData?.email, freshTokenData?.accessToken, freshTokenData?.refreshToken);
                if (emailSent) {
                    console.log(`✅ Staff credentials sent successfully to: ${email}`);
                }
                else {
                    console.log(`⚠️ Staff credentials could not be sent to: ${email} (but staff was created)`);
                }
            }
            catch (emailError) {
                console.error("📧 Email sending failed:", emailError);
                // Don't fail the whole operation if email fails
            }
        }
        // Create staff assignment
        // Permissions are already in array format from frontend
        const { data: assignment, error: assignmentError } = await supabaseAdmin
            .from("staff_assignments")
            .insert({
            staff_id: staffUser.id,
            event_id: eventId,
            assigned_by: userId,
            permissions: permissions,
        })
            .select("*")
            .single();
        if (assignmentError) {
            return res.status(400).json({
                error: "Failed to assign staff",
                details: assignmentError.message,
            });
        }
        console.log("✅ Staff member added successfully - END", email);
        res.status(201).json({
            message: "Staff member added successfully",
            assignment,
            temporaryCredentials: staffUser
                ? { email, note: "Password sent via email" }
                : null,
        });
    }
    catch (error) {
        console.error("❌ Add staff error:", error);
        res.status(500).json({
            error: "Internal server error",
            details: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
// Get staff members for an event
router.get("/events/:eventId/staff", authenticateToken, async (req, res) => {
    try {
        const eventId = req.params.eventId;
        const userId = req.user.id;
        // console.log("👥 Fetching staff for event:", eventId, "user:", userId);
        // console.log("👤 User object:", req.user);
        // Check if user is the event organizer or admin
        const { data: event, error: eventError } = await supabase
            .from("events")
            .select("id, organizer_id")
            .eq("id", eventId)
            .single();
        // console.log("🎪 Event lookup result:", { event, eventError });
        if (eventError || !event) {
            console.log("❌ Event not found");
            return res.status(404).json({ error: "Event not found" });
        }
        // Only organizer or admin can view staff list
        const { data: user, error: userError } = await supabase
            .from("users")
            .select("role")
            .eq("id", userId)
            .single();
        console.log("👤 User role lookup:", { user, userError });
        const isOrganizer = event.organizer_id === userId;
        const isAdmin = user?.role === "admin";
        // console.log("🔐 Authorization check:", {
        //   isOrganizer,
        //   isAdmin,
        //   eventOrganizerId: event.organizer_id,
        //   userId,
        // });
        if (!isOrganizer && !isAdmin) {
            console.log("❌ Access denied - not organizer or admin");
            return res.status(403).json({
                error: "Access denied. Only event organizers and admins can view staff.",
            });
        }
        // Fetch staff assignments with user details
        const { data: staffAssignments, error: staffError } = await supabaseAdmin
            .from("staff_assignments")
            .select(`
          id,
          permissions,
          created_at,
          assigned_by,
          staff_id,
          event_id
        `)
            .eq("event_id", eventId)
            .order("created_at", { ascending: false });
        console.log("🔍 Staff assignments raw data:", staffAssignments);
        if (staffError) {
            console.error("Error fetching staff:", staffError);
            return res.status(500).json({ error: "Failed to fetch staff" });
        }
        // Fetch user details separately for each staff member
        const staff = [];
        for (const assignment of staffAssignments || []) {
            console.log("🔄 Processing assignment:", assignment);
            // Fetch staff user details
            const { data: staffUser } = await supabaseAdmin
                .from("users")
                .select("id, name, email, last_login_at")
                .eq("id", assignment.staff_id)
                .single();
            // Fetch assigned_by user details
            const { data: assignedByUser } = await supabaseAdmin
                .from("users")
                .select("name, email")
                .eq("id", assignment.assigned_by)
                .single();
            const transformedStaff = {
                id: assignment.id,
                permissions: {
                    can_check_in: Array.isArray(assignment.permissions)
                        ? assignment.permissions.includes("check-in")
                        : assignment.permissions?.can_check_in || false,
                    can_view_stats: Array.isArray(assignment.permissions)
                        ? assignment.permissions.includes("view-stats")
                        : assignment.permissions?.can_view_stats || false,
                },
                assigned_at: assignment.created_at, // Map created_at to assigned_at for frontend
                user: staffUser,
                assigned_by_user: assignedByUser,
            };
            console.log("✅ Transformed staff:", transformedStaff);
            staff.push(transformedStaff);
        }
        // console.log("✅ Staff fetched successfully:", staff.length, "members");
        // console.log("📊 Final staff data:", staff);
        res.json({ success: true, staff });
    }
    catch (error) {
        console.error("❌ Get staff error:", error);
        res.status(500).json({
            error: "Internal server error",
            details: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
// Get check-in stats for an event
router.get("/events/:eventId/stats", authenticateToken, async (req, res) => {
    try {
        const eventId = req.params.eventId;
        const userId = req.user.id;
        // console.log(
        //   "📊 Fetching check-in stats for event:",
        //   eventId,
        //   "user:",
        //   userId
        // );
        // Check if user has access to this event (either organizer or staff)
        const { data: eventAccess, error: eventError } = await supabaseAdmin
            .from("events")
            .select("id, organizer_id")
            .eq("id", eventId)
            .single();
        if (eventError || !eventAccess) {
            console.log("❌ Event not found or error:", eventError);
            return res.status(404).json({ error: "Event not found" });
        }
        const isOrganizer = eventAccess.organizer_id === userId;
        // console.log(
        //   "👑 Is organizer:",
        //   isOrganizer,
        //   "organizer_id:",
        //   eventAccess.organizer_id,
        //   "user_id:",
        //   userId
        // );
        let isStaff = false;
        if (!isOrganizer) {
            console.log("🔍 Checking staff access...");
            // Check if user is staff for this event - remove is_active constraint
            const { data: staffAccess, error: staffError } = await supabase
                .from("staff_assignments")
                .select("id, permissions")
                .eq("staff_id", userId)
                .eq("event_id", eventId)
                .single();
            // console.log("👷 Staff access result:", { staffAccess, staffError });
            isStaff =
                !!staffAccess && staffAccess.permissions?.includes("check-in");
            // console.log("👷 Is staff with check-in permission:", isStaff);
        }
        if (!isOrganizer && !isStaff) {
            console.log("❌ Access denied - user is neither organizer nor staff");
            return res.status(403).json({ error: "Access denied" });
        }
        // Get total registrations
        const { count: totalRegistrations } = await supabaseAdmin
            .from("registrations")
            .select("*", { count: "exact", head: true })
            .eq("event_id", eventId)
            .eq("status", "confirmed");
        // Get total check-ins
        const { count: totalCheckIns } = await supabaseAdmin
            .from("attendance")
            .select("*", { count: "exact", head: true })
            .eq("event_id", eventId)
            .eq("status", "checked_in");
        // Get recent check-ins
        const { data: recentCheckIns } = await supabaseAdmin
            .from("attendance")
            .select(`
          id,
          checked_in_at,
          location,
          registrations!inner (
            name,
            email
          ),
          checked_in_by:users!checked_in_by_id (
            name
          )
        `)
            .eq("event_id", eventId)
            .eq("status", "checked_in")
            .order("checked_in_at", { ascending: false })
            .limit(10);
        const checkInRate = (totalRegistrations || 0) > 0
            ? (((totalCheckIns || 0) / (totalRegistrations || 1)) * 100).toFixed(1)
            : "0";
        const stats = {
            total_registrations: totalRegistrations || 0,
            total_check_ins: totalCheckIns || 0,
            check_in_rate: checkInRate,
        };
        const formattedRecentCheckIns = recentCheckIns?.map((checkIn) => ({
            id: checkIn.id,
            checked_in_at: checkIn.checked_in_at,
            location: checkIn.location,
            registration: {
                name: checkIn.registrations?.name || "Unknown",
                email: checkIn.registrations?.email || "Unknown",
            },
            checked_in_by_user: {
                name: checkIn.checked_in_by?.name || "System",
            },
        })) || [];
        // console.log("✅ Check-in stats retrieved successfully");
        res.json({
            success: true,
            stats,
            recent_check_ins: formattedRecentCheckIns,
        });
    }
    catch (error) {
        console.error("❌ Error fetching check-in stats:", error);
        res.status(500).json({
            error: "Internal server error",
            details: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
// Check in a participant using QR code
router.post("/events/:eventId", 
// authenticateToken, // Temporarily disabled for testing
async (req, res) => {
    console.log("🚨 ROUTE HIT! Check-in route was called!");
    console.log("🚨 Request reached check-in handler!");
    try {
        const eventId = req.params.eventId;
        // Temporarily mock user for testing
        const userId = "5a054e3a-034d-4a4c-a7fc-444514cb7e9e"; // Admin user ID from logs
        req.user = {
            id: userId,
            email: "patelabhideep02@gmail.com",
            role: "admin",
        };
        const { qr_code, location = "Main Entrance", device_info } = req.body;
        console.log("🎫 === CHECK-IN REQUEST START ===");
        console.log("🎫 Processing check-in for event:", eventId);
        console.log("👤 User ID:", userId);
        console.log("📋 QR Code:", qr_code);
        console.log("� Request params:", req.params);
        console.log("📋 Request body:", req.body);
        console.log("🔑 User details:", req.user);
        if (!qr_code) {
            console.log("❌ No QR code provided");
            return res.status(400).json({ error: "QR code is required" });
        }
        console.log("🔍 Checking event access for eventId:", eventId);
        // Check if user has access to this event (either organizer or staff)
        const { data: eventAccess, error: eventError } = await supabaseAdmin
            .from("events")
            .select("id, organizer_id, title")
            .eq("id", eventId)
            .single();
        console.log("🎪 Event access result:", { eventAccess, eventError });
        if (eventError || !eventAccess) {
            console.log("❌ Event not found or error:", eventError);
            console.log("❌ eventId being queried:", eventId);
            console.log("❌ eventError details:", JSON.stringify(eventError, null, 2));
            return res.status(404).json({ error: "Event not found" });
        }
        const isOrganizer = eventAccess.organizer_id === userId;
        // console.log(
        //   "👑 Is organizer:",
        //   isOrganizer,
        //   "organizer_id:",
        //   eventAccess.organizer_id,
        //   "user_id:",
        //   userId
        // );
        let isStaff = false;
        if (!isOrganizer) {
            // Check if user is staff for this event
            const { data: staffAccess } = await supabaseAdmin
                .from("staff_assignments")
                .select("id, permissions")
                .eq("staff_id", userId)
                .eq("event_id", eventId)
                .eq("is_active", true)
                .single();
            isStaff =
                !!staffAccess && staffAccess.permissions?.includes("check-in");
        }
        if (!isOrganizer && !isStaff) {
            return res.status(403).json({ error: "Access denied" });
        }
        // Enhanced QR code parsing - supports multiple formats
        let registrationId;
        try {
            console.log("🔍 Parsing QR code format:", qr_code);
            // Format 1: eventId:registrationId (preferred format)
            if (qr_code.includes(":") && !qr_code.startsWith("QR_")) {
                const [qrEventId, qrRegistrationId] = qr_code.split(":");
                console.log("📋 Event-prefixed format detected:", {
                    qrEventId,
                    qrRegistrationId,
                });
                if (qrEventId !== eventId) {
                    console.log("❌ Event ID mismatch:", qrEventId, "vs", eventId);
                    return res.status(400).json({
                        error: "QR code is for a different event",
                        details: `This QR code is for event ${qrEventId}, but you're scanning for event ${eventId}`,
                    });
                }
                registrationId = qrRegistrationId;
            }
            // Format 2: QR_XXX_timestamp (legacy format) or UUID format
            else {
                console.log("📋 Direct registration ID format detected");
                registrationId = qr_code;
            }
            console.log("✅ Extracted registration ID:", registrationId);
            console.log("🔍 About to validate registration ID format...");
            // Validate registration ID format
            if (!registrationId || registrationId.length < 5) {
                console.log("❌ Registration ID validation failed:", registrationId);
                throw new Error("Invalid registration ID format");
            }
            console.log("✅ Registration ID format validated successfully");
        }
        catch (error) {
            console.log("❌ QR parsing error:", error);
            return res.status(400).json({
                error: "Invalid QR code format",
                details: "QR code could not be parsed. Please ensure you're using a valid event ticket.",
            });
        }
        console.log("🔍 About to check event details...");
        // Check if event has ended - prevent check-ins after event end
        const { data: eventDetails, error: eventDetailsError } = await supabaseAdmin
            .from("events")
            .select("id, title, start_date, end_date")
            .eq("id", eventId)
            .single();
        console.log("🎪 Event details lookup result:", {
            eventDetails,
            eventDetailsError,
        });
        if (eventDetailsError || !eventDetails) {
            return res.status(404).json({ error: "Event not found" });
        }
        console.log("🔍 About to check event timing...");
        // Check if event has ended
        const now = new Date();
        const eventEndDate = new Date(eventDetails.end_date);
        console.log("⏰ Time check:", {
            now: now.toISOString(),
            eventEndDate: eventEndDate.toISOString(),
            hasEnded: now > eventEndDate,
        });
        if (now > eventEndDate) {
            return res.status(400).json({
                error: "Check-in not allowed: Event has ended",
                eventEndDate: eventDetails.end_date,
                message: `This event ended on ${eventEndDate.toLocaleString()}. QR scanning is no longer available.`,
            });
        }
        // Note: Early check-in restriction removed - events can decide their own check-in policies
        // Future enhancement: Add per-event setting for "allow_early_checkin" or "checkin_start_time"
        // Example:
        // if (eventDetails.restrict_early_checkin) {
        //   const eventStartDate = new Date(eventDetails.start_date);
        //   if (now < eventStartDate) {
        //     return res.status(400).json({ error: "Event hasn't started yet" });
        //   }
        // }
        // Note: Event status check removed - events table doesn't have status column
        // If needed in the future, add status column to events table first
        console.log("🔍 About to lookup registration...", {
            registrationId,
            eventId,
        });
        // Find the registration
        const { data: registration, error: regError } = await supabaseAdmin
            .from("registrations")
            .select("id, name, email, event_id, status, qr_code")
            .eq("id", registrationId)
            .eq("event_id", eventId)
            .single();
        console.log("📋 Registration lookup completed:", {
            registration,
            regError,
        });
        if (regError || !registration) {
            return res.status(404).json({
                error: "Registration not found",
                details: "This QR code does not correspond to a valid registration for this event. Please check your ticket or contact support.",
            });
        }
        if (registration.status !== "confirmed") {
            console.log("❌ Registration not confirmed:", registration.status);
            return res.status(400).json({ error: "Registration is not confirmed" });
        }
        console.log("✅ Registration is confirmed, checking for duplicates...");
        // Check for duplicate check-in
        const { data: existingCheckIn, error: checkInError } = await supabaseAdmin
            .from("attendance")
            .select("id, checked_in_at, location")
            .eq("registration_id", registration.id)
            .eq("event_id", eventId)
            .single();
        console.log("🔍 Duplicate check result:", {
            existingCheckIn,
            checkInError,
        });
        if (existingCheckIn && !checkInError) {
            const checkedInTime = new Date(existingCheckIn.checked_in_at);
            const timeAgo = Math.floor((Date.now() - checkedInTime.getTime()) / 1000 / 60); // minutes ago
            return res.status(409).json({
                error: "Participant already checked in",
                message: `${registration.name} was already checked in ${timeAgo} minutes ago`,
                details: {
                    participant_name: registration.name,
                    checked_in_at: existingCheckIn.checked_in_at,
                    checked_in_time_formatted: checkedInTime.toLocaleString(),
                    location: existingCheckIn.location,
                    minutes_ago: timeAgo,
                },
            });
        }
        console.log("✅ No duplicate found, creating attendance record...");
        // Create attendance record
        const { data: attendance, error: attendanceError } = await supabaseAdmin
            .from("attendance")
            .insert({
            registration_id: registrationId,
            event_id: eventId,
            checked_in_by: userId,
            checked_in_at: new Date().toISOString(),
            location: location,
            device_info: device_info,
        })
            .select("*")
            .single();
        console.log("📋 Attendance record creation result:", {
            attendance,
            attendanceError,
        });
        if (attendanceError) {
            return res
                .status(500)
                .json({ error: "Failed to check in participant" });
        }
        res.json({
            success: true,
            message: "Participant checked in successfully",
            participant: {
                id: registration.id,
                name: registration.name,
                email: registration.email,
            },
            attendance: {
                id: attendance.id,
                checked_in_at: attendance.checked_in_at,
                location: attendance.location,
            },
        });
    }
    catch (error) {
        console.error("❌ DETAILED ERROR in check-in route:", error);
        console.error("❌ Error stack:", error instanceof Error ? error.stack : "No stack");
        res.status(500).json({
            error: "Internal server error",
            details: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
export default router;
