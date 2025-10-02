import { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { AuthUtils } from "../utils/auth.js";
import { LoginSchema, CreateUserSchema } from "../../../shared/dist/schemas.js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const validatedData = CreateUserSchema.parse(req.body);

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from("users")
        .select("email")
        .eq("email", validatedData.email)
        .single();

      if (existingUser) {
        res.status(409).json({
          success: false,
          error: "User with this email already exists",
        });
        return;
      }

      // Hash password
      const hashedPassword = await AuthUtils.hashPassword(
        validatedData.password
      );

      // Create user in Supabase
      const { data: user, error } = await supabase
        .from("users")
        .insert({
          email: validatedData.email,
          password_hash: hashedPassword,
          name: validatedData.name,
          role: validatedData.role,
          organization_name: validatedData.organizationName,
          phone_number: validatedData.phoneNumber,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select(
          "id, email, name, role, organization_name, phone_number, created_at"
        )
        .single();

      if (error) {
        console.error("Database error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to create user account",
        });
        return;
      }

      // Generate tokens
      const tokens = AuthUtils.generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      // Set refresh token as httpOnly cookie
      res.cookie("refreshToken", tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(201).json({
        success: true,
        message: "Account created successfully",
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            organizationName: user.organization_name,
            phoneNumber: user.phone_number,
            createdAt: user.created_at,
          },
          accessToken: tokens.accessToken,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: "Invalid input data",
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

  static async login(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const validatedData = LoginSchema.parse(req.body);

      // Find user by email
      const { data: user, error } = await supabase
        .from("users")
        .select(
          "id, email, password_hash, name, role, organization_name, phone_number"
        )
        .eq("email", validatedData.email)
        .single();

      if (error || !user) {
        res.status(401).json({
          success: false,
          error: "Invalid email or password",
        });
        return;
      }

      // Verify password
      const isPasswordValid = await AuthUtils.comparePassword(
        validatedData.password,
        user.password_hash
      );

      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          error: "Invalid email or password",
        });
        return;
      }

      // Update last login
      await supabase
        .from("users")
        .update({
          last_login_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      // Generate tokens
      const tokens = AuthUtils.generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      // Set refresh token as httpOnly cookie
      res.cookie("refreshToken", tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({
        success: true,
        message: "Login successful",
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            organizationName: user.organization_name,
            phoneNumber: user.phone_number,
          },
          accessToken: tokens.accessToken,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: "Invalid input data",
          details: error.errors,
        });
        return;
      }

      console.error("Login error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }

  static async logout(req: Request, res: Response): Promise<void> {
    try {
      // Clear the refresh token cookie
      res.clearCookie("refreshToken");

      res.json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }

  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.cookies;

      if (!refreshToken) {
        res.status(401).json({
          success: false,
          error: "Refresh token required",
        });
        return;
      }

      // Verify refresh token
      const decoded = AuthUtils.verifyToken(refreshToken, true);

      // Get user from database
      const { data: user, error } = await supabase
        .from("users")
        .select("id, email, role")
        .eq("id", decoded.userId)
        .single();

      if (error || !user) {
        res.status(401).json({
          success: false,
          error: "Invalid refresh token",
        });
        return;
      }

      // Generate new tokens
      const tokens = AuthUtils.generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      // Set new refresh token as httpOnly cookie
      res.cookie("refreshToken", tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({
        success: true,
        data: {
          accessToken: tokens.accessToken,
        },
      });
    } catch (error) {
      console.error("Token refresh error:", error);
      res.status(401).json({
        success: false,
        error: "Invalid or expired refresh token",
      });
    }
  }

  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      // req.user is set by the authenticateToken middleware
      const userId = (req as any).user?.id;

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
          "id, email, name, role, organization_name, phone_number, created_at, updated_at, last_login_at"
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

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            organizationName: user.organization_name,
            phoneNumber: user.phone_number,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
            lastLoginAt: user.last_login_at,
          },
        },
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
