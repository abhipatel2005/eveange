import { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { OrganizerUpgradeSchema } from "../../../shared/dist/schemas.js";
import { AuthenticatedRequest } from "../middleware/auth.js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export class UserController {
  /**
   * Upgrade user from participant to organizer
   * POST /api/users/upgrade-to-organizer
   */
  static async upgradeToOrganizer(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      // Validate request body
      const validatedData = OrganizerUpgradeSchema.parse(req.body);
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
        return;
      }

      // Check if user exists
      const { data: currentUser, error: fetchError } = await supabase
        .from("users")
        .select("id, email, name, organization_name, phone_number, created_at")
        .eq("id", userId)
        .single();

      if (fetchError || !currentUser) {
        res.status(404).json({
          success: false,
          error: "User not found",
        });
        return;
      }

      // Insert into event_users as organizer for the new event
      // You must provide the eventId in the request body (validatedData.eventId)
      // Only update organization info, do not update role or assign event_users
      const { data: updatedUser, error: updateError } = await supabase
        .from("users")
        .update({
          organization_name: validatedData.organizationName,
          phone_number: validatedData.phoneNumber,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select("id, email, name, organization_name, phone_number, created_at")
        .single();

      if (updateError) {
        res.status(500).json({
          success: false,
          error: "Failed to update organization info",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          user: updatedUser,
          message: "Organization info updated successfully",
          canCreateEvent: true, // let frontend use this to show create event page
        },
      });
    } catch (err) {
      console.log(err);
    }
  }
  /**
   * Get user profile
   * GET /api/users/profile
   */
  static async getProfile(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
        return;
      }

      const { data: user, error } = await supabase
        .from("users")
        .select(
          "id, email, name, role, organization_name, phone_number, description, created_at"
        )
        .eq("id", userId)
        .single();

      if (error || !user) {
        res.status(404).json({
          success: false,
          error: "User not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }

  /**
   * Get user permissions from event_users table
   * GET /api/users/permissions
   */
  static async getPermissions(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
        return;
      }

      // Get all event_users entries for this user
      const { data: eventUsers, error } = await supabase
        .from("event_users")
        .select("event_id, role, permissions, is_active")
        .eq("user_id", userId)
        .eq("is_active", true);

      if (error) {
        console.error("Get permissions error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to fetch permissions",
        });
        return;
      }

      // Determine what the user can access
      const hasStaffAssignments = eventUsers && eventUsers.length > 0;
      const canAccessCertificates =
        eventUsers?.some(
          (eu: any) =>
            eu.role === "organizer" ||
            eu.permissions?.includes("manage-certificates") ||
            eu.permissions?.includes("view-certificates")
        ) || false;

      const canScanQR =
        eventUsers?.some(
          (eu: any) =>
            eu.role === "organizer" ||
            eu.role === "staff" ||
            eu.permissions?.includes("check-in")
        ) || false;

      res.status(200).json({
        success: true,
        data: {
          hasStaffAssignments,
          canAccessCertificates,
          canScanQR,
          eventUsers: eventUsers || [],
        },
      });
    } catch (error) {
      console.error("Get permissions error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }
}
