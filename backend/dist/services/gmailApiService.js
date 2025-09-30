import { google } from "googleapis";
const OAuth2 = google.auth.OAuth2;
// Send email using Gmail API instead of SMTP
export async function sendEmailViaGmailAPI(userEmail, accessToken, refreshToken, to, subject, htmlContent) {
    try {
        console.log("📧 Sending email via Gmail API...");
        // Create OAuth2 client
        const oauth2Client = new OAuth2(process.env.GMAIL_CLIENT_ID, process.env.GMAIL_CLIENT_SECRET, `${process.env.BACKEND_URL || "http://localhost:3001"}/api/email/callback`);
        // Set credentials
        oauth2Client.setCredentials({
            access_token: accessToken,
            refresh_token: refreshToken,
        });
        // Create Gmail API instance
        const gmail = google.gmail({ version: "v1", auth: oauth2Client });
        // Create email message
        const emailLines = [
            `From: ${userEmail}`,
            `To: ${to}`,
            `Subject: ${subject}`,
            "Content-Type: text/html; charset=utf-8",
            "",
            htmlContent,
        ];
        const email = emailLines.join("\\r\\n");
        const encodedEmail = Buffer.from(email).toString("base64");
        // Send the email
        const result = await gmail.users.messages.send({
            userId: "me",
            requestBody: {
                raw: encodedEmail,
            },
        });
        console.log("✅ Email sent successfully via Gmail API:", result.data.id);
    }
    catch (error) {
        console.error("❌ Gmail API email sending failed:", error);
        throw error;
    }
}
