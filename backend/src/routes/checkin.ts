import { Router } from "express";
import { supabase } from "../config/supabase.js";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth.js";
import { EmailService } from "../services/emailService.js";
import { getUserGmailToken, getFreshAccessToken } from "./emailAuth.js";
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
router.post(
  "/events/:eventId/staff",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const eventId = req.params.eventId; // Keep as string (UUID)
      console.log(eventId);
      const userId = req.user!.id;

      console.log("🏁 Adding staff member - START");
      console.log("📝 Request body:", JSON.stringify(req.body, null, 2));
      console.log("🆔 Event ID:", eventId);
      console.log("👤 User ID:", userId);

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
      } else {
        // Create new user for staff member
        console.log("🔨 Creating new user...");
        const tempPassword = crypto.randomBytes(8).toString("hex");
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        const { data: newUser, error: userError } = await supabase
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
          console.log(
            "🔑 Using user-delegated Gmail sending from:",
            freshTokenData.email
          );
          console.log("🎫 Has access token:", !!freshTokenData.accessToken);
          console.log("🔄 Has refresh token:", !!freshTokenData.refreshToken);
        } else {
          console.log("⚠️ No user Gmail permission, using system email");
        }

        try {
          const emailSent = await EmailService.sendStaffCredentials(
            email,
            name,
            tempPassword,
            event.title,
            `${process.env.FRONTEND_URL || "http://localhost:5173"}/login`,
            freshTokenData?.email,
            freshTokenData?.accessToken,
            freshTokenData?.refreshToken
          );

          if (emailSent) {
            console.log(`✅ Staff credentials sent successfully to: ${email}`);
          } else {
            console.log(
              `⚠️ Staff credentials could not be sent to: ${email} (but staff was created)`
            );
          }
        } catch (emailError) {
          console.error("📧 Email sending failed:", emailError);
          // Don't fail the whole operation if email fails
        }
      }

      // Create staff assignment
      const { data: assignment, error: assignmentError } = await supabase
        .from("staff_assignments")
        .insert({
          staff_id: staffUser.id,
          event_id: eventId,
          assigned_by: userId,
          permissions,
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
    } catch (error) {
      console.error("❌ Add staff error:", error);
      res.status(500).json({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Get check-in stats for an event
router.get(
  "/events/:eventId/check-in-stats",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const eventId = req.params.eventId;
      const userId = req.user!.id;

      console.log(
        "📊 Fetching check-in stats for event:",
        eventId,
        "user:",
        userId
      );

      // Check if user has access to this event (either organizer or staff)
      const { data: eventAccess, error: eventError } = await supabase
        .from("events")
        .select("id, organizer_id")
        .eq("id", eventId)
        .eq("is_active", true)
        .single();

      if (eventError || !eventAccess) {
        return res.status(404).json({ error: "Event not found" });
      }

      const isOrganizer = eventAccess.organizer_id === userId;
      let isStaff = false;

      if (!isOrganizer) {
        // Check if user is staff for this event
        const { data: staffAccess } = await supabase
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

      // Get total registrations
      const { count: totalRegistrations } = await supabase
        .from("registrations")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("status", "confirmed");

      // Get total check-ins
      const { count: totalCheckIns } = await supabase
        .from("attendance")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("status", "checked_in");

      // Get recent check-ins
      const { data: recentCheckIns } = await supabase
        .from("attendance")
        .select(
          `
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
        `
        )
        .eq("event_id", eventId)
        .eq("status", "checked_in")
        .order("checked_in_at", { ascending: false })
        .limit(10);

      const checkInRate =
        (totalRegistrations || 0) > 0
          ? (((totalCheckIns || 0) / (totalRegistrations || 1)) * 100).toFixed(
              1
            )
          : "0";

      const stats = {
        total_registrations: totalRegistrations || 0,
        total_check_ins: totalCheckIns || 0,
        check_in_rate: checkInRate,
      };

      const formattedRecentCheckIns =
        recentCheckIns?.map((checkIn: any) => ({
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

      console.log("✅ Check-in stats retrieved successfully");

      res.json({
        success: true,
        stats,
        recent_check_ins: formattedRecentCheckIns,
      });
    } catch (error) {
      console.error("❌ Error fetching check-in stats:", error);
      res.status(500).json({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Check in a participant using QR code
router.post(
  "/events/:eventId/check-in",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const eventId = req.params.eventId;
      const userId = req.user!.id;
      const { qr_code, location = "Main Entrance", device_info } = req.body;

      console.log("🎫 Processing check-in for event:", eventId, "QR:", qr_code);

      if (!qr_code) {
        return res.status(400).json({ error: "QR code is required" });
      }

      // Check if user has access to this event (either organizer or staff)
      const { data: eventAccess, error: eventError } = await supabase
        .from("events")
        .select("id, organizer_id, title")
        .eq("id", eventId)
        .eq("is_active", true)
        .single();

      if (eventError || !eventAccess) {
        return res.status(404).json({ error: "Event not found" });
      }

      const isOrganizer = eventAccess.organizer_id === userId;
      let isStaff = false;

      if (!isOrganizer) {
        // Check if user is staff for this event
        const { data: staffAccess } = await supabase
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

      // Parse QR code to get registration ID
      let registrationId;
      try {
        // QR code format: eventId:registrationId or just registrationId
        if (qr_code.includes(":")) {
          const [qrEventId, qrRegistrationId] = qr_code.split(":");
          if (qrEventId !== eventId) {
            return res
              .status(400)
              .json({ error: "QR code is for a different event" });
          }
          registrationId = qrRegistrationId;
        } else {
          registrationId = qr_code;
        }
      } catch (error) {
        return res.status(400).json({ error: "Invalid QR code format" });
      }

      // Find the registration
      const { data: registration, error: regError } = await supabase
        .from("registrations")
        .select("id, name, email, event_id, status")
        .eq("id", registrationId)
        .eq("event_id", eventId)
        .single();

      if (regError || !registration) {
        return res.status(404).json({ error: "Registration not found" });
      }

      if (registration.status !== "confirmed") {
        return res.status(400).json({ error: "Registration is not confirmed" });
      }

      // Check if already checked in
      const { data: existingCheckIn } = await supabase
        .from("attendance")
        .select("id, checked_in_at")
        .eq("registration_id", registrationId)
        .eq("event_id", eventId)
        .eq("status", "checked_in")
        .single();

      if (existingCheckIn) {
        return res.status(409).json({
          error: "Participant already checked in",
          checked_in_at: existingCheckIn.checked_in_at,
        });
      }

      // Create attendance record
      const { data: attendance, error: attendanceError } = await supabase
        .from("attendance")
        .insert({
          registration_id: registrationId,
          event_id: eventId,
          checked_in_by_id: userId,
          checked_in_at: new Date().toISOString(),
          location: location,
          status: "checked_in",
          device_info: device_info,
        })
        .select("*")
        .single();

      if (attendanceError) {
        console.error("❌ Error creating attendance record:", attendanceError);
        return res
          .status(500)
          .json({ error: "Failed to check in participant" });
      }

      console.log("✅ Participant checked in successfully:", registration.name);

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
    } catch (error) {
      console.error("❌ Error processing check-in:", error);
      res.status(500).json({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

export default router;
