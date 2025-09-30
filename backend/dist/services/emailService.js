import nodemailer from "nodemailer";
import { google } from "googleapis";
import { sendEmailViaGmailAPI } from "./gmailApiService.js";
// OAuth2 setup for Gmail
const OAuth2 = google.auth.OAuth2;
// Create transporter using user's Gmail access token
async function createUserDelegatedTransporter(userEmail, accessToken, refreshToken) {
    try {
        console.log("🔑 Setting up user-delegated OAuth2 transporter for:", userEmail);
        // Create OAuth2 client for token refresh
        const oauth2Client = new OAuth2(process.env.GMAIL_CLIENT_ID, process.env.GMAIL_CLIENT_SECRET, `${process.env.BACKEND_URL || "http://localhost:3001"}/api/email/callback`);
        // Verify and refresh token if needed
        let validAccessToken = accessToken;
        let validRefreshToken = refreshToken;
        if (refreshToken) {
            try {
                console.log("🔄 Refreshing access token before creating transporter...");
                oauth2Client.setCredentials({
                    refresh_token: refreshToken,
                });
                const { credentials } = await oauth2Client.refreshAccessToken();
                if (credentials.access_token) {
                    validAccessToken = credentials.access_token;
                    console.log("✅ Access token refreshed successfully");
                    // Update refresh token if a new one was provided
                    if (credentials.refresh_token) {
                        validRefreshToken = credentials.refresh_token;
                        console.log("✅ Refresh token also updated");
                    }
                }
            }
            catch (refreshError) {
                console.warn("⚠️ Token refresh failed, using existing token:", refreshError);
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
            console.log("✅ Token validated with Gmail API for:", profile.data.emailAddress);
        }
        catch (apiError) {
            console.warn("⚠️ Gmail API test failed:", apiError.message);
            // If token is invalid and we have refresh token, try to refresh
            if (refreshToken &&
                (apiError.code === 401 || apiError.message?.includes("invalid"))) {
                console.log("🔄 Attempting to refresh expired token...");
                try {
                    oauth2Client.setCredentials({
                        refresh_token: refreshToken,
                    });
                    const { credentials } = await oauth2Client.refreshAccessToken();
                    if (credentials.access_token) {
                        validAccessToken = credentials.access_token;
                        console.log("✅ Token refreshed successfully after API failure");
                    }
                }
                catch (refreshError) {
                    console.error("❌ Token refresh failed:", refreshError);
                    throw new Error(`OAuth2 token refresh failed: ${refreshError}`);
                }
            }
            else {
                throw new Error(`Invalid OAuth2 token: ${apiError.message}`);
            }
        }
        const authConfig = {
            type: "OAuth2",
            user: userEmail,
            clientId: process.env.GMAIL_CLIENT_ID,
            clientSecret: process.env.GMAIL_CLIENT_SECRET,
            accessToken: validAccessToken,
        };
        // Add refresh token if available for automatic token refresh
        if (validRefreshToken) {
            authConfig.refreshToken = validRefreshToken;
            console.log("🔄 Refresh token provided for automatic refresh");
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
        console.log("✅ User-delegated OAuth2 transporter created and verified successfully");
        return transporter;
    }
    catch (error) {
        console.error("❌ Failed to create user-delegated OAuth2 transporter:", error);
        throw error;
    }
}
// System OAuth2 transporter (fallback)
async function createOAuth2Transporter() {
    try {
        console.log("🔑 Setting up system OAuth2 transporter...");
        // Create OAuth2 client
        const oauth2Client = new OAuth2(process.env.GMAIL_CLIENT_ID, process.env.GMAIL_CLIENT_SECRET, `${process.env.BACKEND_URL || "http://localhost:3001"}/api/email/callback`);
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
        console.log("✅ System OAuth2 access token generated successfully");
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
        console.log("✅ System OAuth2 transporter created and verified successfully");
        return transporter;
    }
    catch (error) {
        console.error("❌ Failed to create OAuth2 transporter:", error);
        throw error;
    }
}
// Get the appropriate transporter based on environment and available credentials
async function getTransporter(userEmail, userAccessToken, userRefreshToken) {
    // If user credentials are provided, try user-delegated sending first
    if (userEmail && userAccessToken) {
        try {
            console.log("📧 Using user-delegated email sending for:", userEmail);
            console.log("🔑 Access token length:", userAccessToken.length);
            console.log("🔄 Has refresh token:", !!userRefreshToken);
            return await createUserDelegatedTransporter(userEmail, userAccessToken, userRefreshToken);
        }
        catch (error) {
            console.warn("⚠️ User-delegated email failed, falling back to system email:", error);
            // Continue to system email fallback
        }
    }
    // Check if all system OAuth2 credentials are available
    if (process.env.GMAIL_CLIENT_ID &&
        process.env.GMAIL_CLIENT_SECRET &&
        process.env.GMAIL_REFRESH_TOKEN &&
        process.env.GMAIL_USER) {
        try {
            console.log("📧 Using system email sending");
            return await createOAuth2Transporter();
        }
        catch (error) {
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
            console.log("✅ App password transporter created and verified successfully");
            return transporter;
        }
        catch (error) {
            console.warn("⚠️ App password authentication failed:", error);
        }
    }
    // Development/fallback mode - log emails instead of sending
    console.log("📧 Using development mode (emails will be logged)");
    return {
        sendMail: async (mailOptions) => {
            console.log("📧 [DEV MODE] Email would be sent:");
            console.log("📧 To:", mailOptions.to);
            console.log("📧 Subject:", mailOptions.subject);
            console.log("📧 From:", mailOptions.from);
            console.log("📧 Content preview:", mailOptions.html?.substring(0, 200) + "...");
            return { messageId: "dev-mode-" + Date.now() };
        },
        verify: async () => true, // Always succeed in dev mode
    };
}
export class EmailService {
    // Test email configuration
    static async testConnection() {
        try {
            const transporter = await getTransporter();
            if ("verify" in transporter && typeof transporter.verify === "function") {
                await transporter.verify();
                console.log("✅ Email service connection successful");
                return true;
            }
            else {
                console.log("✅ Email service ready (development mode)");
                return true;
            }
        }
        catch (error) {
            console.error("❌ Email service connection failed:", error);
            return false;
        }
    }
    static async sendRegistrationConfirmation(to, data, userEmail, userAccessToken, userRefreshToken) {
        try {
            // First try SMTP approach
            const transporter = await getTransporter(userEmail, userAccessToken, userRefreshToken);
            const htmlContent = this.generateRegistrationEmailTemplate(data);
            await transporter.sendMail({
                from: userEmail || process.env.FROM_EMAIL || "noreply@eventplatform.com",
                to,
                subject: `Registration Confirmed - ${data.eventTitle}`,
                html: htmlContent,
            });
            console.log("✅ Registration confirmation email sent successfully via SMTP");
            return true;
        }
        catch (smtpError) {
            console.warn("⚠️ SMTP email failed, trying Gmail API:", smtpError);
            // Try Gmail API as fallback
            if (userEmail && userAccessToken && userRefreshToken) {
                try {
                    await sendEmailViaGmailAPI(userEmail, userAccessToken, userRefreshToken, to, `Registration Confirmed - ${data.eventTitle}`, this.generateRegistrationEmailTemplate(data));
                    console.log("✅ Registration confirmation email sent successfully via Gmail API");
                    return true;
                }
                catch (gmailError) {
                    console.error("❌ Gmail API email also failed:", gmailError);
                    return false;
                }
            }
            else {
                console.error("❌ No Gmail API credentials provided");
                return false;
            }
        }
    }
    static async sendStaffCredentials(to, staffName, tempPassword, eventTitle, loginUrl, userEmail, userAccessToken, userRefreshToken) {
        try {
            // First try SMTP approach
            const transporter = await getTransporter(userEmail, userAccessToken, userRefreshToken);
            const htmlContent = this.generateStaffCredentialsTemplate(staffName, to, tempPassword, eventTitle, loginUrl);
            const fromEmail = userEmail || process.env.FROM_EMAIL || "noreply@eventplatform.com";
            const result = await transporter.sendMail({
                from: fromEmail,
                to,
                subject: `Staff Access - ${eventTitle}`,
                html: htmlContent,
            });
            console.log("📧 Email sent successfully via SMTP, messageId:", result.messageId);
            console.log("📧 Sent from:", fromEmail);
            return true;
        }
        catch (smtpError) {
            console.error("❌ SMTP email sending failed:", smtpError);
            // Try Gmail API as fallback if we have user credentials
            if (userEmail && userAccessToken && userRefreshToken) {
                try {
                    console.log("🔄 Trying Gmail API as fallback...");
                    const htmlContent = this.generateStaffCredentialsTemplate(staffName, to, tempPassword, eventTitle, loginUrl);
                    await sendEmailViaGmailAPI(userEmail, userAccessToken, userRefreshToken, to, `Staff Access - ${eventTitle}`, htmlContent);
                    console.log("✅ Email sent successfully via Gmail API fallback");
                    return true;
                }
                catch (apiError) {
                    console.error("❌ Gmail API fallback also failed:", apiError);
                }
            }
            console.error("❌ All email sending methods failed");
            return false;
        }
    }
    static generateRegistrationEmailTemplate(data) {
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
    static generateStaffCredentialsTemplate(staffName, email, tempPassword, eventTitle, loginUrl) {
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
}
export default EmailService;
