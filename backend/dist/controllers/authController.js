import { z } from "zod";
import { AuthUtils } from "../utils/auth.js";
import { LoginSchema, CreateUserSchema } from "../../../shared/dist/schemas.js";
import EmailService from "../services/emailService.js";
import { supabaseAdmin } from "../config/supabase.js";
import dotenv from "dotenv";
dotenv.config();
export class AuthController {
    static async register(req, res) {
        try {
            // Validate request body
            const validatedData = CreateUserSchema.parse(req.body);
            // Check if user already exists
            const { data: existingUser } = await supabaseAdmin
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
            const hashedPassword = await AuthUtils.hashPassword(validatedData.password);
            // Create user in Supabase
            const { data: user, error } = await supabaseAdmin
                .from("users")
                .insert({
                email: validatedData.email,
                password_hash: hashedPassword,
                name: validatedData.name,
                role: validatedData.role,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
                .select("id, email, name, role, organization_name, phone_number, created_at")
                .single();
            if (error) {
                console.error("Database error:", error);
                res.status(500).json({
                    success: false,
                    error: "Failed to create user account",
                });
                return;
            }
            // Generate verification token and send email
            try {
                const verificationToken = await EmailService.generateVerificationToken(user.id);
                console.log(verificationToken);
                await EmailService.sendVerificationEmail(user.email, user.name, verificationToken);
                res.status(201).json({
                    success: true,
                    message: "Account created successfully. Please check your email for verification instructions.",
                    data: {
                        email: user.email,
                        requiresVerification: true,
                    },
                });
            }
            catch (emailError) {
                console.error("Failed to send verification email:", emailError);
                // Still return success but indicate email issue
                res.status(201).json({
                    success: true,
                    message: "Account created successfully, but verification email could not be sent. Please contact support.",
                    data: {
                        email: user.email,
                        requiresVerification: true,
                        emailError: true,
                    },
                });
            }
        }
        catch (error) {
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
    static async login(req, res) {
        try {
            // Validate request body
            const validatedData = LoginSchema.parse(req.body);
            // Find user by email
            const { data: user, error } = await supabaseAdmin
                .from("users")
                .select("id, email, password_hash, name, role, organization_name, phone_number, email_verified, is_active")
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
            const isPasswordValid = await AuthUtils.comparePassword(validatedData.password, user.password_hash);
            if (!isPasswordValid) {
                res.status(401).json({
                    success: false,
                    error: "Invalid email or password",
                });
                return;
            }
            // Check if account is active
            if (!user.is_active) {
                res.status(403).json({
                    success: false,
                    error: "Your account has been disabled. Please contact support for assistance.",
                });
                return;
            }
            // Check if email is verified
            if (!user.email_verified) {
                try {
                    // Generate new verification token and send email
                    console.log("🔄 Generating new verification token for unverified user:", user.email);
                    const verificationToken = await EmailService.generateVerificationToken(user.id);
                    await EmailService.sendVerificationEmail(user.email, user.name, verificationToken);
                    console.log("✅ Verification email sent to unverified user");
                    res.status(403).json({
                        success: false,
                        error: "Please verify your email address before logging in. We've sent a new verification email to your inbox.",
                        requiresVerification: true,
                        email: user.email,
                        verificationEmailSent: true,
                    });
                }
                catch (emailError) {
                    console.error("❌ Failed to send verification email:", emailError);
                    res.status(403).json({
                        success: false,
                        error: "Please verify your email address before logging in. Please contact support if you need help.",
                        requiresVerification: true,
                        email: user.email,
                        verificationEmailSent: false,
                    });
                }
                return;
            }
            // Update last login
            await supabaseAdmin
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
        }
        catch (error) {
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
    static async logout(req, res) {
        try {
            // Clear the refresh token cookie
            res.clearCookie("refreshToken");
            res.json({
                success: true,
                message: "Logged out successfully",
            });
        }
        catch (error) {
            console.error("Logout error:", error);
            res.status(500).json({
                success: false,
                error: "Internal server error",
            });
        }
    }
    static async refreshToken(req, res) {
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
            const { data: user, error } = await supabaseAdmin
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
        }
        catch (error) {
            console.error("Token refresh error:", error);
            res.status(401).json({
                success: false,
                error: "Invalid or expired refresh token",
            });
        }
    }
    static async getProfile(req, res) {
        try {
            // req.user is set by the authenticateToken middleware
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: "User not authenticated",
                });
                return;
            }
            const { data: user, error } = await supabaseAdmin
                .from("users")
                .select("id, email, name, role, organization_name, phone_number, created_at, updated_at, last_login_at")
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
        }
        catch (error) {
            console.error("Get profile error:", error);
            res.status(500).json({
                success: false,
                error: "Internal server error",
            });
        }
    }
    static async verifyEmail(req, res) {
        try {
            const { token } = req.query;
            console.log("🔍 Email verification request received for token:", token);
            if (!token || typeof token !== "string") {
                console.log("❌ Invalid token provided");
                res.status(400).json({
                    success: false,
                    error: "Verification token is required",
                });
                return;
            }
            console.log("🔄 Calling EmailService.verifyEmailToken...");
            const result = await EmailService.verifyEmailToken(token);
            console.log("📋 EmailService result:", result);
            if (result.success) {
                console.log("✅ Email verification successful");
                res.status(200).json({
                    success: true,
                    message: "Email verified successfully! You can now log in.",
                });
            }
            else {
                console.log("❌ Email verification failed:", result.error);
                res.status(400).json({
                    success: false,
                    error: result.error,
                });
            }
        }
        catch (error) {
            console.error("Email verification controller error:", error);
            res.status(500).json({
                success: false,
                error: "Internal server error",
            });
        }
    }
    static async resendVerification(req, res) {
        try {
            const { email } = req.body;
            if (!email) {
                res.status(400).json({
                    success: false,
                    error: "Email is required",
                });
                return;
            }
            const result = await EmailService.resendVerificationEmail(email);
            if (result.success) {
                res.status(200).json({
                    success: true,
                    message: "Verification email sent successfully. Please check your inbox.",
                });
            }
            else {
                res.status(400).json({
                    success: false,
                    error: result.error,
                });
            }
        }
        catch (error) {
            console.error("Resend verification error:", error);
            res.status(500).json({
                success: false,
                error: "Internal server error",
            });
        }
    }
    // Debug endpoint to check email verifications table
    static async debugEmailVerifications(req, res) {
        try {
            const { data: verifications, error } = await supabaseAdmin
                .from("email_verifications")
                .select("*")
                .limit(10);
            if (error) {
                res.status(500).json({
                    success: false,
                    error: `Database error: ${error.message}`,
                    details: error,
                });
                return;
            }
            res.json({
                success: true,
                data: verifications,
                count: verifications?.length || 0,
            });
        }
        catch (error) {
            console.error("Debug endpoint error:", error);
            res.status(500).json({
                success: false,
                error: "Internal server error",
            });
        }
    }
}
