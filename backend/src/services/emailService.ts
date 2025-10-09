import nodemailer from "nodemailer";
import { google } from "googleapis";
import { sendEmailViaGmailAPI } from "./gmailApiService.js";
import crypto from "crypto";
import { supabase, supabaseAdmin } from "../config/supabase.js";
import dotenv from "dotenv";

dotenv.config();

// OAuth2 setup for Gmail
const OAuth2 = google.auth.OAuth2;

// Create transporter using user's Gmail access token
async function createUserDelegatedTransporter(
  userEmail: string,
  accessToken: string,
  refreshToken?: string
) {
  try {
    if (process.env.NODE_ENV === "development") {
      console.log(
        "🔑 Setting up user-delegated OAuth2 transporter for:",
        userEmail.slice(-10) // Only show last part of email
      );
    }

    // Create OAuth2 client for token refresh
    const oauth2Client = new OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      `${process.env.BACKEND_URL || "http://localhost:3001"}/api/email/callback`
    );

    // Verify and refresh token if needed
    let validAccessToken = accessToken;
    let validRefreshToken = refreshToken;

    if (refreshToken) {
      try {
        console.log(
          "🔄 Refreshing access token before creating transporter..."
        );
        oauth2Client.setCredentials({
          refresh_token: refreshToken,
        });

        const { credentials } = await oauth2Client.refreshAccessToken();
        if (credentials.access_token) {
          validAccessToken = credentials.access_token;
          if (process.env.NODE_ENV === "development") {
            console.log("✅ Access token refreshed successfully");
          }

          // Update refresh token if a new one was provided
          if (credentials.refresh_token) {
            validRefreshToken = credentials.refresh_token;
            if (process.env.NODE_ENV === "development") {
              console.log("✅ Refresh token also updated");
            }
          }
        }
      } catch (refreshError) {
        console.warn(
          "⚠️ Token refresh failed, using existing token:",
          refreshError
        );
        // Continue with existing token
      }
    }

    // Test the token by making a simple Gmail API call
    try {
      oauth2Client.setCredentials({
        access_token: validAccessToken,
        refresh_token: validRefreshToken,
      });

      const gmail = google.gmail({ version: "v1", auth: oauth2Client });
      const profile = await gmail.users.getProfile({ userId: "me" });
      console.log(
        "✅ Token validated with Gmail API for:",
        profile.data.emailAddress
      );
    } catch (apiError: any) {
      console.warn("⚠️ Gmail API test failed:", apiError.message);

      // If token is invalid and we have refresh token, try to refresh
      if (
        refreshToken &&
        (apiError.code === 401 || apiError.message?.includes("invalid"))
      ) {
        if (process.env.NODE_ENV === "development") {
          console.log("🔄 Attempting to refresh expired token...");
        }
        try {
          oauth2Client.setCredentials({
            refresh_token: refreshToken,
          });

          const { credentials } = await oauth2Client.refreshAccessToken();
          if (credentials.access_token) {
            validAccessToken = credentials.access_token;
            if (process.env.NODE_ENV === "development") {
              console.log("✅ Token refreshed successfully after API failure");
            }
          }
        } catch (refreshError) {
          console.error("❌ Token refresh failed:", refreshError);
          throw new Error(`OAuth2 token refresh failed: ${refreshError}`);
        }
      } else {
        throw new Error(`Invalid OAuth2 token: ${apiError.message}`);
      }
    }

    const authConfig: any = {
      type: "OAuth2",
      user: userEmail,
      clientId: process.env.GMAIL_CLIENT_ID,
      clientSecret: process.env.GMAIL_CLIENT_SECRET,
      accessToken: validAccessToken,
    };

    // Add refresh token if available for automatic token refresh
    if (validRefreshToken) {
      authConfig.refreshToken = validRefreshToken;
      if (process.env.NODE_ENV === "development") {
        console.log("🔄 Refresh token provided for automatic refresh");
      }
    }

    // Create transporter with user's tokens - use explicit SMTP config instead of service
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: authConfig,
    });

    // Verify the transporter configuration
    await transporter.verify();
    console.log(
      "✅ User-delegated OAuth2 transporter created and verified successfully"
    );
    return transporter;
  } catch (error) {
    console.error(
      "❌ Failed to create user-delegated OAuth2 transporter:",
      error
    );
    throw error;
  }
}

// System OAuth2 transporter (fallback)
async function createOAuth2Transporter() {
  try {
    console.log("🔑 Setting up system OAuth2 transporter...");

    // Create OAuth2 client
    const oauth2Client = new OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      `${process.env.BACKEND_URL || "http://localhost:3001"}/api/email/callback`
    );

    // Set credentials
    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
    });

    // Get access token
    const accessTokenObj = await oauth2Client.getAccessToken();
    const accessToken = accessTokenObj.token;

    if (!accessToken) {
      throw new Error("Failed to create access token");
    }

    if (process.env.NODE_ENV === "development") {
      console.log("✅ System OAuth2 access token generated successfully");
    }

    // Create transporter with fresh access token
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        type: "OAuth2",
        user: process.env.GMAIL_USER,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
        accessToken: accessToken,
      },
    });

    // Verify the transporter configuration
    await transporter.verify();
    console.log(
      "✅ System OAuth2 transporter created and verified successfully"
    );
    return transporter;
  } catch (error) {
    console.error("❌ Failed to create OAuth2 transporter:", error);
    throw error;
  }
}

// Get the appropriate transporter based on environment and available credentials
async function getTransporter(
  userEmail?: string,
  userAccessToken?: string,
  userRefreshToken?: string
) {
  // If user credentials are provided, try user-delegated sending first
  if (userEmail && userAccessToken) {
    try {
      if (process.env.NODE_ENV === "development") {
        console.log(
          "📧 Using user-delegated email sending for:",
          userEmail.slice(-10)
        );
        console.log("🔑 Access token length:", userAccessToken.length);
        console.log("🔄 Has refresh token:", !!userRefreshToken);
      }

      return await createUserDelegatedTransporter(
        userEmail,
        userAccessToken,
        userRefreshToken
      );
    } catch (error) {
      console.warn(
        "⚠️ User-delegated email failed, falling back to system email:",
        error
      );
      // Continue to system email fallback
    }
  }

  // Check if all system OAuth2 credentials are available
  if (
    process.env.GMAIL_CLIENT_ID &&
    process.env.GMAIL_CLIENT_SECRET &&
    process.env.GMAIL_REFRESH_TOKEN &&
    process.env.GMAIL_USER
  ) {
    try {
      console.log("📧 Using system email sending");
      return await createOAuth2Transporter();
    } catch (error) {
      console.error("OAuth2 setup failed:", error);
      // Fall through to app password or development mode
    }
  }

  // Check if app password is available as fallback
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    try {
      console.log("🔑 Using Gmail app password authentication as fallback...");
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });

      await transporter.verify();
      console.log(
        "✅ App password transporter created and verified successfully"
      );
      return transporter;
    } catch (error) {
      console.warn("⚠️ App password authentication failed:", error);
    }
  }

  // Development/fallback mode - log emails instead of sending
  console.log("📧 Using development mode (emails will be logged)");
  return {
    sendMail: async (mailOptions: any) => {
      console.log("📧 [DEV MODE] Email would be sent:");
      console.log("📧 To:", mailOptions.to);
      console.log("📧 Subject:", mailOptions.subject);
      console.log("📧 From:", mailOptions.from);
      console.log(
        "📧 Content preview:",
        mailOptions.html?.substring(0, 200) + "..."
      );
      return { messageId: "dev-mode-" + Date.now() };
    },
    verify: async () => true, // Always succeed in dev mode
  };
}

export interface EmailTemplateData {
  participantName: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  eventTime: string;
  qrCode: string;
  registrationId: string;
  ticketUrl: string;
}

export class EmailService {
  // Test email configuration
  static async testConnection(): Promise<boolean> {
    try {
      const transporter = await getTransporter();
      if ("verify" in transporter && typeof transporter.verify === "function") {
        await transporter.verify();
        console.log("✅ Email service connection successful");
        return true;
      } else {
        console.log("✅ Email service ready (development mode)");
        return true;
      }
    } catch (error) {
      console.error("❌ Email service connection failed:", error);
      return false;
    }
  }

  static async sendRegistrationConfirmation(
    to: string,
    data: EmailTemplateData,
    userEmail?: string,
    userAccessToken?: string,
    userRefreshToken?: string
  ): Promise<boolean> {
    try {
      // First try SMTP approach
      const transporter = await getTransporter(
        userEmail,
        userAccessToken,
        userRefreshToken
      );
      const htmlContent = this.generateRegistrationEmailTemplate(data);

      await transporter.sendMail({
        from:
          userEmail || process.env.FROM_EMAIL || "noreply@eventplatform.com",
        to,
        subject: `Registration Confirmed - ${data.eventTitle}`,
        html: htmlContent,
      });

      console.log(
        "✅ Registration confirmation email sent successfully via SMTP"
      );
      return true;
    } catch (smtpError) {
      console.warn("⚠️ SMTP email failed, trying Gmail API:", smtpError);

      // Try Gmail API as fallback
      if (userEmail && userAccessToken && userRefreshToken) {
        try {
          await sendEmailViaGmailAPI(
            userEmail,
            userAccessToken,
            userRefreshToken,
            to,
            `Registration Confirmed - ${data.eventTitle}`,
            this.generateRegistrationEmailTemplate(data)
          );

          console.log(
            "✅ Registration confirmation email sent successfully via Gmail API"
          );
          return true;
        } catch (gmailError) {
          console.error("❌ Gmail API email also failed:", gmailError);
          return false;
        }
      } else {
        console.error("❌ No Gmail API credentials provided");
        return false;
      }
    }
  }

  static async sendStaffCredentials(
    to: string,
    staffName: string,
    tempPassword: string,
    eventTitle: string,
    loginUrl: string,
    userEmail?: string,
    userAccessToken?: string,
    userRefreshToken?: string
  ): Promise<boolean> {
    try {
      // First try SMTP approach
      const transporter = await getTransporter(
        userEmail,
        userAccessToken,
        userRefreshToken
      );
      const htmlContent = this.generateStaffCredentialsTemplate(
        staffName,
        to,
        tempPassword,
        eventTitle,
        loginUrl
      );

      const fromEmail =
        userEmail || process.env.FROM_EMAIL || "noreply@eventplatform.com";

      const result = await transporter.sendMail({
        from: fromEmail,
        to,
        subject: `Staff Access - ${eventTitle}`,
        html: htmlContent,
      });

      console.log(
        "📧 Email sent successfully via SMTP, messageId:",
        result.messageId
      );
      console.log("📧 Sent from:", fromEmail);
      return true;
    } catch (smtpError) {
      console.error("❌ SMTP email sending failed:", smtpError);

      // Try Gmail API as fallback if we have user credentials
      if (userEmail && userAccessToken && userRefreshToken) {
        try {
          console.log("🔄 Trying Gmail API as fallback...");
          const htmlContent = this.generateStaffCredentialsTemplate(
            staffName,
            to,
            tempPassword,
            eventTitle,
            loginUrl
          );

          await sendEmailViaGmailAPI(
            userEmail,
            userAccessToken,
            userRefreshToken,
            to,
            `Staff Access - ${eventTitle}`,
            htmlContent
          );

          console.log("✅ Email sent successfully via Gmail API fallback");
          return true;
        } catch (apiError) {
          console.error("❌ Gmail API fallback also failed:", apiError);
        }
      }

      console.error("❌ All email sending methods failed");
      return false;
    }
  }

  private static generateRegistrationEmailTemplate(
    data: EmailTemplateData
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Registration Confirmation</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .qr-section { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center; border: 2px dashed #667eea; }
        .event-details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #eee; }
        .button { background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Registration Confirmed!</h1>
            <p>You're all set for ${data.eventTitle}</p>
        </div>
        
        <div class="content">
            <h2>Hello ${data.participantName}!</h2>
            <p>Thank you for registering for <strong>${data.eventTitle}</strong>. Your registration has been confirmed and we're excited to see you there!</p>
            
            <div class="event-details">
                <h3>📅 Event Details</h3>
                <div class="detail-row">
                    <span><strong>Event:</strong></span>
                    <span>${data.eventTitle}</span>
                </div>
                <div class="detail-row">
                    <span><strong>Date:</strong></span>
                    <span>${data.eventDate}</span>
                </div>
                <div class="detail-row">
                    <span><strong>Time:</strong></span>
                    <span>${data.eventTime}</span>
                </div>
                <div class="detail-row">
                    <span><strong>Location:</strong></span>
                    <span>${data.eventLocation}</span>
                </div>
            </div>

            <div class="qr-section">
                <h3>🎫 Your Digital Ticket</h3>
                <p>Present this QR code at the event entrance for quick check-in:</p>
                <div style="margin: 20px 0; font-family: monospace; background: #f0f0f0; padding: 15px; border-radius: 5px; word-break: break-all;">
                    QR Code: ${data.qrCode}
                </div>
                <p><strong>Important:</strong> Save this email or take a screenshot of your QR code for offline access.</p>
                
                <a href="${data.ticketUrl}" class="button">📱 View Digital Ticket</a>
            </div>

            <div style="background: #e8f4f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4>📋 Important Reminders:</h4>
                <ul style="margin: 0; padding-left: 20px;">
                    <li>Arrive 15 minutes early for smooth check-in</li>
                    <li>Bring a valid ID along with your QR code</li>
                    <li>Keep your QR code secure and don't share it</li>
                    <li>Contact us if you need to make any changes</li>
                </ul>
            </div>

            <p>If you have any questions, please don't hesitate to reach out to our support team.</p>
            
            <p>Looking forward to seeing you at the event!</p>
            
            <p>Best regards,<br>
            The Event Team</p>
        </div>

        <div class="footer">
            <p>This email was sent regarding your registration for ${data.eventTitle}</p>
            <p>Registration ID: ${data.registrationId}</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  private static generateStaffCredentialsTemplate(
    staffName: string,
    email: string,
    tempPassword: string,
    eventTitle: string,
    loginUrl: string
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Staff Access Credentials</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .credentials { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #f5576c; }
        .button { background: #f5576c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ Staff Access Granted</h1>
            <p>Welcome to the team for ${eventTitle}</p>
        </div>
        
        <div class="content">
            <h2>Hello ${staffName}!</h2>
            <p>You have been granted staff access for <strong>${eventTitle}</strong>. Here are your login credentials:</p>
            
            <div class="credentials">
                <h3>🔐 Login Credentials</h3>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Temporary Password:</strong> <code style="background: #f0f0f0; padding: 5px; border-radius: 3px;">${tempPassword}</code></p>
            </div>

            <div class="warning">
                <h4>⚠️ Security Notice</h4>
                <p>For security reasons, please change your password immediately after your first login.</p>
            </div>

            <a href="${loginUrl}" class="button">🚀 Login Now</a>

            <div style="background: #e8f4f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4>📋 Your Responsibilities:</h4>
                <ul style="margin: 0; padding-left: 20px;">
                    <li>Check-in event participants using QR code scanning</li>
                    <li>Monitor check-in statistics and participant flow</li>
                    <li>Assist participants with check-in issues</li>
                    <li>Report any technical problems to the event organizer</li>
                </ul>
            </div>

            <p>If you have any questions about your role or need technical support, please contact the event organizer.</p>
            
            <p>Thank you for being part of our team!</p>
            
            <p>Best regards,<br>
            The Event Management Team</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Generate verification token and store it in database
   */
  static async generateVerificationToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Token expires in 24 hours

    // CRITICAL: Never log actual tokens in production - security risk!
    if (process.env.NODE_ENV === "development") {
      console.log("🔄 Generating verification token...");
      console.log("🔍 User ID:", userId);
      console.log("🔍 Token length:", token.length);
      console.log("🔍 Expires at:", expiresAt.toISOString());
    }

    // Store verification token in database
    const { data: insertedData, error } = await supabaseAdmin
      .from("email_verifications")
      .upsert({
        user_id: userId,
        token,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
      })
      .select("*");

    if (error) {
      console.error("❌ Database error storing verification token:", error);
      console.error("❌ Error details:", error.message);
      console.error("❌ Error hint:", error.hint);
      console.error(
        "❌ This likely means the email_verifications table doesn't exist yet."
      );
      console.error(
        "❌ Please run the setup SQL script in your Supabase dashboard."
      );
      throw new Error(
        `Failed to generate verification token: ${error.message}`
      );
    }

    if (process.env.NODE_ENV === "development") {
      if (process.env.NODE_ENV === "development") {
        console.log("✅ Token saved to database:", insertedData);
      }
    }
    return token;
  }

  /**
   * Send verification email
   */
  static async sendVerificationEmail(
    email: string,
    name: string,
    token: string
  ): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to EventBase!</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Hi ${name},</h2>
          
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            Thank you for signing up! To complete your registration and start creating amazing events, 
            please verify your email address by clicking the button below.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="display: inline-block; background: #667eea; color: white; padding: 15px 30px; 
                      text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Verify Email Address
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:
            <br>
            <a href="${verificationUrl}" style="color: #667eea; word-break: break-all;">
              ${verificationUrl}
            </a>
          </p>
          
          <hr style="border: none; height: 1px; background: #e9ecef; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px; margin: 0;">
            This verification link will expire in 24 hours. If you didn't create an account, 
            you can safely ignore this email.
          </p>
        </div>
      </body>
      </html>
    `;

    try {
      // CRITICAL: Never log actual tokens in production - security risk!
      if (process.env.NODE_ENV === "development") {
        console.log("token verification - token length:", token.length);
      }
      console.log("📧 Starting email sending process...");
      console.log("📧 Gmail User:", process.env.GMAIL_USER);
      console.log(
        "📧 Gmail App Password configured:",
        !!process.env.GMAIL_APP_PASSWORD
      );
      console.log("📧 From Email:", process.env.FROM_EMAIL);

      // Create SMTP transporter using Gmail app password
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });

      // Verify transporter configuration
      console.log("🔍 Verifying SMTP configuration...");
      await transporter.verify();
      console.log("✅ SMTP configuration verified successfully");

      // Send email
      const mailOptions = {
        from: `"EventBase" <${
          process.env.FROM_EMAIL || process.env.GMAIL_USER
        }>`,
        to: email,
        subject: "Verify Your Email Address",
        html: htmlContent,
      };

      console.log("📤 Sending email to:", email);
      const result = await transporter.sendMail(mailOptions);
      console.log(`✅ Verification email sent to ${email}`, result.messageId);
    } catch (error) {
      console.error("❌ SMTP Failed to send verification email:", error);
      console.error(
        "❌ Error details:",
        error instanceof Error ? error.message : String(error)
      );

      // Fallback: Try OAuth2 if SMTP fails
      try {
        console.log("🔄 Trying OAuth2 fallback...");
        const systemEmail = process.env.GMAIL_USER;
        const systemRefreshToken = process.env.GMAIL_REFRESH_TOKEN;

        if (systemEmail && systemRefreshToken) {
          console.log("🔑 OAuth2 credentials found, attempting OAuth2 send...");
          // OAuth2 fallback
          const oauth2Client = new OAuth2(
            process.env.GMAIL_CLIENT_ID,
            process.env.GMAIL_CLIENT_SECRET,
            `${
              process.env.BACKEND_URL || "http://localhost:3001"
            }/api/email/callback`
          );

          oauth2Client.setCredentials({
            refresh_token: systemRefreshToken,
          });

          const { credentials } = await oauth2Client.refreshAccessToken();

          if (credentials.access_token) {
            await sendEmailViaGmailAPI(
              systemEmail,
              credentials.access_token,
              systemRefreshToken,
              email,
              "Verify Your Email Address",
              htmlContent
            );
            console.log(`✅ Verification email sent via OAuth2 to ${email}`);
            return;
          }
        } else {
          console.log("❌ OAuth2 credentials not configured");
        }
      } catch (oauthError) {
        console.error("❌ OAuth2 fallback also failed:", oauthError);
      }

      throw new Error(
        `Failed to send verification email: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Verify email token
   */
  static async verifyEmailToken(
    token: string
  ): Promise<{ success: boolean; userId?: string; error?: string }> {
    try {
      // CRITICAL: Never log actual tokens in production - security risk!
      if (process.env.NODE_ENV === "development") {
        if (process.env.NODE_ENV === "development") {
          console.log("🔍 Searching for token length:", token.length);
        }
      }

      // First, let's see all tokens in the database for debugging
      const { data: allTokens, error: debugError } = await supabaseAdmin
        .from("email_verifications")
        .select("token, user_id, expires_at, is_used")
        .limit(10);

      if (debugError) {
        console.error("❌ Debug query error:", debugError);
      } else {
        if (process.env.NODE_ENV === "development") {
          console.log("🔍 All tokens in database:", allTokens);
          console.log("🔍 Total tokens found:", allTokens?.length || 0);
        }
      }

      // Find verification record
      const { data: verification, error: fetchError } = await supabaseAdmin
        .from("email_verifications")
        .select("user_id, expires_at, is_used, verified_at")
        .eq("token", token);

      if (fetchError) {
        console.error(
          "❌ Database error during email verification:",
          fetchError
        );
        console.error("❌ Error details:", fetchError.message);
        console.error("❌ Error code:", fetchError.code);
        return {
          success: false,
          error: `Database error: ${fetchError.message}`,
        };
      }

      // Check if any verification record was found
      if (!verification || verification.length === 0) {
        if (process.env.NODE_ENV === "development") {
          console.log("❌ No verification record found for token");
        }
        return {
          success: false,
          error:
            "Invalid or expired verification token. The token may have already been used or has expired.",
        };
      }

      const verificationRecord = verification[0];
      console.log("✅ Verification record found:", verificationRecord);

      // Check if token has already been used
      if (verificationRecord.is_used || verificationRecord.verified_at) {
        if (process.env.NODE_ENV === "development") {
          console.log("❌ Token has already been used");
        }
        return {
          success: false,
          error:
            "This verification link has already been used. Please try logging in.",
        };
      }

      // Check if token has expired
      const now = new Date();
      const expiresAt = new Date(verificationRecord.expires_at);

      if (now > expiresAt) {
        // Clean up expired token
        await supabaseAdmin
          .from("email_verifications")
          .delete()
          .eq("token", token);

        return { success: false, error: "Verification token has expired" };
      }

      // Update user as verified
      console.log("🔄 Updating user verification status...");
      console.log("🔍 User ID:", verificationRecord.user_id);
      console.log("🔍 Current timestamp:", new Date().toISOString());

      // First, check if user exists before updating
      const { data: existingUser, error: checkError } = await supabaseAdmin
        .from("users")
        .select("id, email, email_verified, email_verified_at")
        .eq("id", verificationRecord.user_id)
        .single();

      if (checkError) {
        console.error("❌ Failed to find user:", checkError);
        return {
          success: false,
          error: `User not found: ${checkError.message}`,
        };
      }

      console.log("🔍 User before update:", existingUser);

      // First, try updating just email_verified field
      const { data: updatedUser, error: updateError } = await supabaseAdmin
        .from("users")
        .update({
          email_verified: true,
          email_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", verificationRecord.user_id)
        .select("id, email, email_verified, email_verified_at")
        .single();

      if (updateError) {
        console.error("❌ Failed to update user:", updateError);
        console.error("❌ Update error details:", updateError.message);
        console.error("❌ Update error code:", updateError.code);
        console.error("❌ Update error hint:", updateError.hint);

        // Try a more basic update without email_verified_at
        console.log("🔄 Retrying with basic update...");
        const { error: basicUpdateError } = await supabaseAdmin
          .from("users")
          .update({ email_verified: true })
          .eq("id", verificationRecord.user_id);

        if (basicUpdateError) {
          console.error("❌ Basic update also failed:", basicUpdateError);
          return {
            success: false,
            error: `Failed to verify email: ${basicUpdateError.message}`,
          };
        } else {
          console.log("✅ Basic update succeeded");
        }
      } else {
        console.log("✅ User updated successfully:", updatedUser);
      }

      // Try to add email_verified_at if the column exists
      try {
        await supabaseAdmin
          .from("users")
          .update({ email_verified_at: new Date().toISOString() })
          .eq("id", verificationRecord.user_id);
        console.log("✅ email_verified_at timestamp updated");
      } catch (timestampError) {
        console.log(
          "⚠️ Could not update email_verified_at (column might not exist):",
          timestampError
        );
        // This is not critical, continue with verification
      }

      // Mark verification token as used
      await supabaseAdmin
        .from("email_verifications")
        .update({
          is_used: true,
          verified_at: new Date().toISOString(),
        })
        .eq("token", token);

      console.log("✅ Email verification completed successfully!");
      return { success: true, userId: verificationRecord.user_id };
    } catch (error) {
      console.error("Email verification error:", error);
      return { success: false, error: "Internal server error" };
    }
  }

  /**
   * Resend verification email
   */
  static async resendVerificationEmail(
    email: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Find user by email
      const { data: user, error: userError } = await supabaseAdmin
        .from("users")
        .select("id, name, email_verified")
        .eq("email", email)
        .single();

      if (userError || !user) {
        return { success: false, error: "User not found" };
      }

      if (user.email_verified) {
        return { success: false, error: "Email is already verified" };
      }

      // Generate new verification token
      const token = await this.generateVerificationToken(user.id);

      // Send verification email
      await this.sendVerificationEmail(email, user.name, token);

      return { success: true };
    } catch (error) {
      console.error("Resend verification error:", error);
      return { success: false, error: "Failed to resend verification email" };
    }
  }
}

export default EmailService;
