import twilio from "twilio";
import { supabaseAdmin } from "../config/supabase";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

class SMSService {
  private twilioClient: twilio.Twilio | null = null;
  private isConfigured = false;

  constructor() {
    this.initializeTwilio();
  }

  private initializeTwilio() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (accountSid && authToken && phoneNumber) {
      try {
        this.twilioClient = twilio(accountSid, authToken);
        this.isConfigured = true;
        console.log("✅ Twilio SMS service initialized successfully");
      } catch (error) {
        console.error("❌ Failed to initialize Twilio:", error);
        this.isConfigured = false;
      }
    } else {
      console.warn(
        "⚠️ Twilio not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to .env"
      );
      this.isConfigured = false;
    }
  }

  /**
   * Generate 6-digit OTP code
   */
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Validate and format phone number
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, "");

    // Add country code if not present (assuming +91 for India, adjust as needed)
    if (digits.length === 10) {
      return `+91${digits}`;
    } else if (digits.length === 12 && digits.startsWith("91")) {
      return `+${digits}`;
    } else if (digits.length === 13 && digits.startsWith("+91")) {
      return digits;
    }

    // Return as-is if already properly formatted
    return phoneNumber.startsWith("+") ? phoneNumber : `+${digits}`;
  }

  /**
   * Generate OTP and store in database
   */
  async generatePhoneVerification(
    userId: string,
    phoneNumber: string
  ): Promise<{ success: boolean; otpCode?: string; error?: string }> {
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      const otpCode = this.generateOTP();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5-minute expiry

      if (process.env.NODE_ENV === "development") {
        console.log("🔄 Generating phone verification...");
        console.log("🔍 User ID:", userId);
        console.log("🔍 Phone Number:", "***" + formattedPhone.slice(-4)); // Only show last 4 digits
        console.log("🔍 OTP Code length:", otpCode.length); // Don't log actual OTP
        console.log("🔍 Expires at:", expiresAt.toISOString());
      }

      // Store OTP in database
      const { data, error } = await supabaseAdmin
        .from("phone_verifications")
        .upsert({
          user_id: userId,
          phone_number: formattedPhone,
          otp_code: otpCode,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString(),
          attempts: 0,
          is_verified: false,
        })
        .select("*");

      if (error) {
        console.error("❌ Database error storing OTP:", error);
        return {
          success: false,
          error: `Failed to generate OTP: ${error.message}`,
        };
      }

      console.log("✅ OTP saved to database:", data);
      return {
        success: true,
        otpCode,
      };
    } catch (error) {
      console.error("❌ Error generating phone verification:", error);
      return {
        success: false,
        error: "Failed to generate phone verification",
      };
    }
  }

  /**
   * Send SMS with free trial considerations
   */
  async sendOTP(
    phoneNumber: string,
    otpCode: string,
    userName?: string
  ): Promise<{ success: boolean; error?: string; messageSid?: string }> {
    if (!this.isConfigured || !this.twilioClient) {
      return {
        success: false,
        error: "SMS service not configured. Please check Twilio credentials.",
      };
    }

    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      // Free trial friendly message
      const message = userName
        ? `Hi ${userName}! Your eveange verification code is: ${otpCode}. Valid for 5 minutes. (Sent from trial account)`
        : `Your eveange verification code is: ${otpCode}. Valid for 5 minutes. (Sent from trial account)`;

      console.log("📱 Sending SMS...");
      console.log("📱 To:", formattedPhone);
      console.log("📱 Message length:", message.length);

      // Use Messaging Service SID for trial accounts (more reliable)
      const messageOptions: any = {
        body: message,
        to: formattedPhone,
      };

      // Use either Messaging Service SID or Phone Number
      if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
        messageOptions.messagingServiceSid =
          process.env.TWILIO_MESSAGING_SERVICE_SID;
        console.log(
          "📱 Using Messaging Service SID:",
          process.env.TWILIO_MESSAGING_SERVICE_SID
        );
      } else if (process.env.TWILIO_PHONE_NUMBER) {
        messageOptions.from = process.env.TWILIO_PHONE_NUMBER;
        console.log("📱 Using From Number:", process.env.TWILIO_PHONE_NUMBER);
      } else {
        const errorMsg =
          "Either TWILIO_MESSAGING_SERVICE_SID or TWILIO_PHONE_NUMBER must be configured.\n" +
          "🔧 To fix this:\n" +
          "1. Go to https://console.twilio.com/\n" +
          "2. Get a trial phone number OR create a messaging service\n" +
          "3. Add TWILIO_PHONE_NUMBER or TWILIO_MESSAGING_SERVICE_SID to your .env file\n" +
          "📖 See docs/TWILIO_SETUP.md for detailed instructions";
        console.error("❌ Twilio Configuration Error:", errorMsg);
        throw new Error(errorMsg);
      }

      const twilioMessage = await this.twilioClient.messages.create(
        messageOptions
      );

      console.log("✅ SMS sent successfully!");
      console.log("📱 Message SID:", twilioMessage.sid);
      console.log("📱 Status:", twilioMessage.status);

      return {
        success: true,
        messageSid: twilioMessage.sid,
      };
    } catch (error: any) {
      console.error("❌ Failed to send SMS:", error);

      // Handle free trial specific errors
      let errorMessage = "Failed to send SMS";
      if (error.code === 21211) {
        errorMessage =
          "Invalid phone number format. Please use international format (+91xxxxxxxxxx)";
      } else if (error.code === 21614) {
        errorMessage =
          "This phone number is not verified for your Twilio trial account. Please verify it in the Twilio console first.";
      } else if (error.code === 21608) {
        errorMessage = "The phone number is not a valid mobile number";
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(
    phoneNumber: string,
    otpCode: string
  ): Promise<{ success: boolean; userId?: string; error?: string }> {
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      console.log("🔍 Verifying OTP...");
      console.log("🔍 Phone:", formattedPhone);
      console.log("🔍 OTP:", otpCode);

      // Find verification record
      const { data: verification, error: fetchError } = await supabaseAdmin
        .from("phone_verifications")
        .select("*")
        .eq("phone_number", formattedPhone)
        .eq("otp_code", otpCode)
        .eq("is_verified", false)
        .order("created_at", { ascending: false })
        .limit(1);

      if (fetchError) {
        console.error("❌ Database error:", fetchError);
        return {
          success: false,
          error: `Database error: ${fetchError.message}`,
        };
      }

      if (!verification || verification.length === 0) {
        console.log("❌ No matching OTP found");
        return {
          success: false,
          error: "Invalid OTP code",
        };
      }

      const record = verification[0];

      // Check if OTP has expired
      const now = new Date();
      const expiresAt = new Date(record.expires_at);

      if (now > expiresAt) {
        console.log("❌ OTP has expired");

        // Clean up expired OTP
        await supabaseAdmin
          .from("phone_verifications")
          .delete()
          .eq("id", record.id);

        return {
          success: false,
          error: "OTP has expired. Please request a new one.",
        };
      }

      // Check attempt limit
      if (record.attempts >= 3) {
        console.log("❌ Too many attempts");
        return {
          success: false,
          error: "Too many attempts. Please request a new OTP.",
        };
      }

      // Mark as verified
      await supabaseAdmin
        .from("phone_verifications")
        .update({
          is_verified: true,
          verified_at: new Date().toISOString(),
        })
        .eq("id", record.id);

      // Update user's phone verification status
      await supabaseAdmin
        .from("users")
        .update({
          phone_number: formattedPhone,
          phone_verified: true,
          phone_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", record.user_id);

      console.log("✅ Phone verification completed successfully!");

      return {
        success: true,
        userId: record.user_id,
      };
    } catch (error) {
      console.error("❌ Error verifying OTP:", error);
      return {
        success: false,
        error: "Failed to verify OTP",
      };
    }
  }

  /**
   * Send OTP for phone verification
   */
  async sendPhoneVerificationOTP(
    userId: string,
    phoneNumber: string,
    userName?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Generate OTP and store in database
      const generateResult = await this.generatePhoneVerification(
        userId,
        phoneNumber
      );

      if (!generateResult.success || !generateResult.otpCode) {
        return {
          success: false,
          error: generateResult.error || "Failed to generate OTP",
        };
      }

      // Send SMS
      const sendResult = await this.sendOTP(
        phoneNumber,
        generateResult.otpCode,
        userName
      );

      if (!sendResult.success) {
        return {
          success: false,
          error: sendResult.error || "Failed to send SMS",
        };
      }

      return { success: true };
    } catch (error) {
      console.error("❌ Error sending phone verification OTP:", error);
      return {
        success: false,
        error: "Failed to send verification OTP",
      };
    }
  }

  /**
   * Resend OTP (with rate limiting)
   */
  async resendOTP(
    phoneNumber: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      // Check if there's a recent OTP request (rate limiting)
      const { data: recentOTP } = await supabaseAdmin
        .from("phone_verifications")
        .select("*")
        .eq("phone_number", formattedPhone)
        .gte("created_at", new Date(Date.now() - 60000).toISOString()) // Last 1 minute
        .order("created_at", { ascending: false })
        .limit(1);

      if (recentOTP && recentOTP.length > 0) {
        return {
          success: false,
          error: "Please wait 1 minute before requesting a new OTP",
        };
      }

      // Get user ID from the last verification attempt
      const { data: lastVerification } = await supabaseAdmin
        .from("phone_verifications")
        .select("user_id")
        .eq("phone_number", formattedPhone)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!lastVerification || lastVerification.length === 0) {
        return {
          success: false,
          error: "No previous verification attempt found",
        };
      }

      // Generate and send new OTP
      return await this.sendPhoneVerificationOTP(
        lastVerification[0].user_id,
        phoneNumber
      );
    } catch (error) {
      console.error("❌ Error resending OTP:", error);
      return {
        success: false,
        error: "Failed to resend OTP",
      };
    }
  }
}

export default new SMSService();
