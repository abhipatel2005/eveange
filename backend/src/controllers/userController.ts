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

      // Check if user exists and is currently a participant
      const { data: currentUser, error: fetchError } = await supabase
        .from("users")
        .select("id, role, email, name")
        .eq("id", userId)
        .single();

      if (fetchError || !currentUser) {
        res.status(404).json({
          success: false,
          error: "User not found",
        });
        return;
      }

      if (currentUser.role === "organizer") {
        res.status(400).json({
          success: false,
          error: "User is already an organizer",
        });
        return;
      }

      // Update user to organizer with additional details
      const { data: updatedUser, error: updateError } = await supabase
        .from("users")
        .update({
          role: "organizer",
          organization_name: validatedData.organizationName,
          phone_number: validatedData.phoneNumber,
          description: validatedData.description,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select(
          "id, email, name, role, organization_name, phone_number, description, created_at"
        )
        .single();

      if (updateError) {
        console.error("Database error:", updateError);
        res.status(500).json({
          success: false,
          error: "Failed to upgrade user to organizer",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          user: updatedUser,
          message: "Successfully upgraded to organizer",
        },
      });
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        res.status(400).json({
          success: false,
          error: "Invalid request data",
          details: error.message,
        });
        return;
      }

      console.error("Organizer upgrade error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
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
}
