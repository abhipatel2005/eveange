import { Router } from "express";
import { google } from "googleapis";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();
const OAuth2 = google.auth.OAuth2;

// Store user tokens temporarily (in production, use Redis or database)
const userTokens = new Map<
  string,
  {
    accessToken: string;
    refreshToken?: string;
    email: string;
  }
>();

// OAuth2 configuration
const oauth2Client = new OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  `${process.env.BACKEND_URL || "http://localhost:3001"}/api/email/callback`
);

// Scopes for Gmail sending (updated for SMTP compatibility)
const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://mail.google.com/", // Full Gmail access (needed for SMTP)
];

// Start OAuth2 flow for email permissions
router.get(
  "/authorize",
  authenticateToken,
  (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;

      // Generate OAuth2 authorization URL
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
        state: userId, // Pass user ID to identify them in callback
        prompt: "consent", // Force consent screen to get refresh token
      });

      console.log("🔑 Generated OAuth2 URL for user:", userId);
      res.json({
        success: true,
        authUrl,
        message: "Please authorize Gmail access to send staff credentials",
      });
    } catch (error) {
      console.error("❌ OAuth2 URL generation failed:", error);
      res.status(500).json({
        error: "Failed to generate authorization URL",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Handle OAuth2 callback
router.get("/callback", async (req, res) => {
  try {
    const { code, state: userId } = req.query;

    if (!code || !userId) {
      return res.status(400).send("Missing authorization code or user ID");
    }

    console.log("🔑 Processing OAuth2 callback for user:", userId);

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code as string);

    if (!tokens.access_token) {
      throw new Error("No access token received");
    }

    // Get user's email using the access token
    oauth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: "me" });
    const userEmail = profile.data.emailAddress;

    if (!userEmail) {
      throw new Error("Could not retrieve user email");
    }

    // Store user's tokens and email
    userTokens.set(userId as string, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || undefined,
      email: userEmail,
    });

    console.log(
      "✅ Gmail access granted for user:",
      userId,
      "email:",
      userEmail
    );

    // Redirect back to frontend with success
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    res.redirect(`${frontendUrl}/events?gmail_auth=success`);
  } catch (error) {
    console.error("❌ OAuth2 callback failed:", error);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    res.redirect(`${frontendUrl}/events?gmail_auth=error`);
  }
});

// Check if user has granted Gmail permission
router.get("/status", authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const hasPermission = userTokens.has(userId);

  res.json({
    hasGmailPermission: hasPermission,
    userEmail: req.user!.email,
  });
});

// Check Gmail permission status
router.get(
  "/status",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const tokenData = userTokens.get(userId);

      if (!tokenData) {
        return res.json({
          hasPermission: false,
          email: null,
          message: "No Gmail permission granted",
        });
      }

      // Test the token by calling Gmail API
      try {
        const oauth2Client = new OAuth2(
          process.env.GMAIL_CLIENT_ID,
          process.env.GMAIL_CLIENT_SECRET,
          `${
            process.env.BACKEND_URL || "http://localhost:3001"
          }/api/email/callback`
        );

        oauth2Client.setCredentials({
          access_token: tokenData.accessToken,
          refresh_token: tokenData.refreshToken,
        });

        const gmail = google.gmail({ version: "v1", auth: oauth2Client });
        const profile = await gmail.users.getProfile({ userId: "me" });

        res.json({
          hasPermission: true,
          email: profile.data.emailAddress,
          message: "Gmail permission active",
          tokenInfo: {
            hasAccessToken: !!tokenData.accessToken,
            hasRefreshToken: !!tokenData.refreshToken,
            storedEmail: tokenData.email,
          },
        });
      } catch (apiError: any) {
        console.warn("Gmail API test failed for user:", userId, apiError);
        res.json({
          hasPermission: false,
          email: tokenData.email,
          message: "Gmail permission expired or invalid",
          error: apiError?.message || String(apiError),
        });
      }
    } catch (error: any) {
      console.error("Error checking Gmail status:", error);
      res.status(500).json({
        error: "Failed to check Gmail status",
        details: error?.message || String(error),
      });
    }
  }
);

// Clear stored tokens (for debugging)
router.delete("/clear", authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  userTokens.delete(userId);

  console.log("🗑️ Cleared stored Gmail tokens for user:", userId);
  res.json({
    success: true,
    message: "Gmail tokens cleared. Please re-authorize.",
  });
});

// Revoke Gmail permission
router.delete(
  "/revoke",
  authenticateToken,
  (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;
    userTokens.delete(userId);

    console.log("🔑 Gmail permission revoked for user:", userId);
    res.json({
      success: true,
      message: "Gmail permission revoked",
    });
  }
);

// Get user's Gmail token data (for internal use)
export function getUserGmailToken(
  userId: string
): { accessToken: string; refreshToken?: string; email: string } | undefined {
  return userTokens.get(userId);
}

// Helper function to get a fresh access token for a user
export async function getFreshAccessToken(
  userId: string
): Promise<
  { accessToken: string; refreshToken?: string; email: string } | undefined
> {
  const tokenData = userTokens.get(userId);
  if (!tokenData) {
    return undefined;
  }

  try {
    // If we have a refresh token, use it to get a fresh access token
    if (tokenData.refreshToken) {
      const oauth2Client = new OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET
      );

      oauth2Client.setCredentials({
        refresh_token: tokenData.refreshToken,
      });

      const { credentials } = await oauth2Client.refreshAccessToken();

      if (credentials.access_token) {
        // Update stored token
        userTokens.set(userId, {
          ...tokenData,
          accessToken: credentials.access_token,
        });

        return {
          accessToken: credentials.access_token,
          refreshToken: tokenData.refreshToken, // Include refresh token
          email: tokenData.email,
        };
      }
    }

    // If no refresh token or refresh failed, try using existing access token
    return {
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken, // Include refresh token if available
      email: tokenData.email,
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return undefined;
  }
}

export default router;
