import { google } from "googleapis";

const OAuth2 = google.auth.OAuth2;

// Send email using Gmail API instead of SMTP
export async function sendEmailViaGmailAPI(
  userEmail: string,
  accessToken: string,
  refreshToken: string,
  to: string,
  subject: string,
  htmlContent: string,
  attachment?: {
    filename: string;
    content: Buffer;
    contentType: string;
  }
): Promise<void> {
  try {
    console.log("📧 Sending email via Gmail API...");
    console.log(`📧 Gmail API parameters:`, {
      userEmail,
      to,
      subject,
      hasAttachment: !!attachment,
      attachmentInfo: attachment
        ? {
            filename: attachment.filename,
            contentType: attachment.contentType,
            size: attachment.content.length,
          }
        : null,
    });

    // Create OAuth2 client
    const oauth2Client = new OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      `${process.env.BACKEND_URL || "http://localhost:3001"}/api/email/callback`
    );

    // Set credentials
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    // Create Gmail API instance
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    let email: string;

    if (attachment) {
      // Create multipart email with attachment
      const boundary = `boundary_${Date.now()}_${Math.random().toString(36)}`;

      const emailLines = [
        `From: ${userEmail}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        "",
        `--${boundary}`,
        "Content-Type: text/html; charset=utf-8",
        "",
        htmlContent,
        "",
        `--${boundary}`,
        `Content-Type: ${attachment.contentType}`,
        `Content-Disposition: attachment; filename="${attachment.filename}"`,
        "Content-Transfer-Encoding: base64",
        "",
        attachment.content.toString("base64"),
        "",
        `--${boundary}--`,
      ];

      email = emailLines.join("\r\n");
    } else {
      // Create simple email without attachment
      const emailLines = [
        `From: ${userEmail}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        "Content-Type: text/html; charset=utf-8",
        "",
        htmlContent,
      ];

      email = emailLines.join("\r\n");
    }

    const encodedEmail = Buffer.from(email)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    // Send the email
    const result = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedEmail,
      },
    });

    console.log("✅ Email sent successfully via Gmail API:", result.data.id);
    if (attachment) {
      console.log(
        `📎 Attachment included: ${attachment.filename} (${attachment.content.length} bytes)`
      );
    }
  } catch (error) {
    console.error("❌ Gmail API email sending failed:", error);
    throw error;
  }
}
