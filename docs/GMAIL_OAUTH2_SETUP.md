# Gmail OAuth2 Setup Guide

## Overview

Your email service has been updated to use OAuth2 authentication for enhanced security. Follow this guide to set up Gmail OAuth2 credentials.

## Prerequisites

- Google Cloud Console account
- Gmail account for sending emails

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

## Step 2: Enable Gmail API

1. In Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for "Gmail API"
3. Click on Gmail API and press **Enable**

## Step 3: Create OAuth2 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. If prompted, configure the OAuth consent screen:
   - Choose **External** for user type
   - Fill in required fields (App name, User support email, Developer contact)
   - Add your email as a test user
4. Choose **Desktop application** as application type
5. Give it a name (e.g., "Event Management Email Service")
6. Click **Create**
7. Copy the **Client ID** and **Client Secret**

## Step 4: Generate Refresh Token

### Option A: Using Google OAuth2 Playground (Recommended)

1. Go to [Google OAuth2 Playground](https://developers.google.com/oauthplayground/)
2. Click the settings gear icon (⚙️) in the top right
3. Check **"Use your own OAuth credentials"**
4. Enter your **Client ID** and **Client Secret**
5. On the left side, find **Gmail API v1**
6. Select `https://www.googleapis.com/auth/gmail.send`
7. Click **Authorize APIs**
8. Sign in with your Gmail account
9. Grant permissions
10. Click **Exchange authorization code for tokens**
11. Copy the **refresh_token** value

### Option B: Manual URL Method

1. Create authorization URL:

```
https://accounts.google.com/o/oauth2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=urn:ietf:wg:oauth:2.0:oob&scope=https://www.googleapis.com/auth/gmail.send&response_type=code&access_type=offline&prompt=consent
```

2. Replace `YOUR_CLIENT_ID` with your actual client ID
3. Open the URL in browser and complete authorization
4. Copy the authorization code from the page
5. Exchange code for tokens using curl or Postman:

```bash
curl -X POST https://oauth2.googleapis.com/token \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "code=YOUR_AUTH_CODE" \
  -d "grant_type=authorization_code" \
  -d "redirect_uri=urn:ietf:wg:oauth:2.0:oob"
```

## Step 5: Update Environment Variables

Add these variables to your `.env` file:

```env
# Gmail OAuth2 Configuration
GMAIL_USER=your.email@gmail.com
GMAIL_CLIENT_ID=your_client_id_here
GMAIL_CLIENT_SECRET=your_client_secret_here
GMAIL_REFRESH_TOKEN=your_refresh_token_here
FROM_EMAIL=your.email@gmail.com
```

## Step 6: Test the Configuration

1. Start your backend server
2. Trigger an email action (like event registration)
3. Check server logs for any authentication errors
4. Verify emails are sent successfully

## Troubleshooting

### Common Issues

1. **"invalid_grant" error**

   - Regenerate refresh token
   - Make sure to use `prompt=consent` in authorization URL

2. **"insufficient authentication scopes"**

   - Ensure you selected the correct Gmail scope
   - Use `https://www.googleapis.com/auth/gmail.send`

3. **"unauthorized_client"**

   - Check Client ID and Client Secret
   - Verify OAuth consent screen is configured

4. **"access_denied"**
   - Make sure Gmail account has permission
   - Check if account is added as test user

### Testing Email Sending

You can test your configuration by creating a simple test endpoint or using the existing registration flow.

## Security Notes

- Never commit OAuth2 credentials to version control
- Keep `.env` file in `.gitignore`
- Refresh tokens don't expire but can be revoked
- Use environment variables for all sensitive data

## Production Deployment

When deploying to production:

1. Set up OAuth consent screen for production (verification required for external users)
2. Add your production domain to authorized origins
3. Use production environment variables
4. Monitor email sending quotas and limits

---

For more information, see [Google's OAuth2 documentation](https://developers.google.com/identity/protocols/oauth2).
