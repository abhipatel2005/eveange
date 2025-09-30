/**
 * Gmail OAuth2 Setup Helper
 * This script helps you generate the necessary OAuth2 tokens for Gmail integration
 */
import { google } from "googleapis";
import readline from "readline";
const SCOPES = ["https://www.googleapis.com/auth/gmail.send"];
class GmailOAuth2Helper {
    constructor(credentials) {
        this.oauth2Client = new google.auth.OAuth2(credentials.clientId, credentials.clientSecret, credentials.redirectUri);
    }
    /**
     * Step 1: Generate authorization URL
     */
    generateAuthUrl() {
        const authUrl = this.oauth2Client.generateAuthUrl({
            access_type: "offline",
            scope: SCOPES,
            prompt: "consent", // Force consent screen to get refresh token
        });
        return authUrl;
    }
    /**
     * Step 2: Exchange authorization code for tokens
     */
    async getTokens(authCode) {
        try {
            const { tokens } = await this.oauth2Client.getToken(authCode);
            this.oauth2Client.setCredentials(tokens);
            return tokens;
        }
        catch (error) {
            console.error("Error retrieving access token:", error);
            throw error;
        }
    }
    /**
     * Interactive setup process
     */
    async interactiveSetup() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        console.log("🔧 Gmail OAuth2 Setup Helper\n");
        // Get credentials from user
        const clientId = await this.question(rl, "Enter your Google Client ID: ");
        const clientSecret = await this.question(rl, "Enter your Google Client Secret: ");
        const redirectUri = "urn:ietf:wg:oauth:2.0:oob"; // For installed applications
        // Update OAuth2 client
        this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
        // Generate and display auth URL
        const authUrl = this.generateAuthUrl();
        console.log("\n📋 Follow these steps:");
        console.log("1. Open this URL in your browser:");
        console.log(authUrl);
        console.log("\n2. Complete the authorization process");
        console.log("3. Copy the authorization code from the browser\n");
        // Get auth code from user
        const authCode = await this.question(rl, "Enter the authorization code: ");
        try {
            // Exchange code for tokens
            const tokens = await this.getTokens(authCode);
            console.log("\n✅ Success! Here are your OAuth2 credentials:");
            console.log("\n📝 Add these to your .env file:");
            console.log(`GMAIL_USER=your.email@gmail.com`);
            console.log(`GMAIL_CLIENT_ID=${clientId}`);
            console.log(`GMAIL_CLIENT_SECRET=${clientSecret}`);
            console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
            console.log(`FROM_EMAIL=your.email@gmail.com`);
            if (tokens.access_token) {
                console.log(`\n🔑 Access Token (optional): ${tokens.access_token}`);
            }
            console.log("\n🎉 Gmail OAuth2 setup complete!");
        }
        catch (error) {
            console.error("❌ Error during token exchange:", error);
        }
        rl.close();
    }
    question(rl, prompt) {
        return new Promise((resolve) => {
            rl.question(prompt, (answer) => {
                resolve(answer.trim());
            });
        });
    }
}
// Usage examples
export { GmailOAuth2Helper };
// Run interactive setup if this file is executed directly
if (require.main === module) {
    const helper = new GmailOAuth2Helper({
        clientId: "",
        clientSecret: "",
        redirectUri: "urn:ietf:wg:oauth:2.0:oob",
    });
    helper.interactiveSetup().catch(console.error);
}
/**
 * Manual Setup Instructions:
 *
 * 1. Go to Google Cloud Console: https://console.cloud.google.com/
 * 2. Create a new project or select existing one
 * 3. Enable Gmail API:
 *    - Go to "APIs & Services" → "Library"
 *    - Search for "Gmail API" and enable it
 *
 * 4. Create OAuth2 Credentials:
 *    - Go to "APIs & Services" → "Credentials"
 *    - Click "Create Credentials" → "OAuth client ID"
 *    - Choose "Desktop application" or "Web application"
 *    - Add authorized redirect URIs:
 *      - For desktop: urn:ietf:wg:oauth:2.0:oob
 *      - For web: http://localhost:3000/auth/callback
 *
 * 5. Download credentials or copy Client ID and Client Secret
 *
 * 6. Generate Refresh Token:
 *    - Use Google OAuth2 Playground: https://developers.google.com/oauthplayground/
 *    - Or run this script: npm run gmail-setup
 *
 * 7. Add credentials to .env file
 */
