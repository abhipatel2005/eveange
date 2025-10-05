// Test script for email verification
// Run this with: node test-email.js

import { EmailService } from './src/services/emailService.js';
import dotenv from 'dotenv';

dotenv.config();

async function testEmailService() {
    try {
        console.log('🧪 Testing email verification service...');

        // Test token generation
        const token = await EmailService.generateVerificationToken();
        console.log('✅ Token generated:', token.substring(0, 8) + '...');

        // Test email sending (replace with your test email)
        const testEmail = 'your-test-email@example.com';
        const testName = 'Test User';

        console.log(`📧 Attempting to send verification email to ${testEmail}...`);

        await EmailService.sendVerificationEmail('test-user-id', testEmail, testName, token);
        console.log('✅ Email sent successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

// Only run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testEmailService();
}