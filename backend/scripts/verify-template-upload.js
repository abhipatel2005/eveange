#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

/**
 * Template Upload Test Verification Script
 * 
 * This script helps verify that template uploads are now using Azure storage
 * instead of local storage.
 */

function printHeader() {
    console.log('🧪 TEMPLATE UPLOAD VERIFICATION');
    console.log('================================');
    console.log('');
    console.log('This script verifies that template uploads are using Azure storage.');
    console.log('');
}

async function checkUploadsFolder() {
    const uploadsPath = path.join(process.cwd(), 'uploads', 'templates');

    try {
        // Check if directory exists
        try {
            await fs.promises.access(uploadsPath);
        } catch (error) {
            console.log('✅ EXCELLENT: No uploads/templates directory exists');
            console.log('   This means templates are not being stored locally');
            return { isEmpty: true, fileCount: 0 };
        }

        // If directory exists, check if it's empty
        const files = await fs.promises.readdir(uploadsPath);

        if (files.length === 0) {
            console.log('✅ EXCELLENT: uploads/templates directory is empty');
            console.log('   This means templates are not being stored locally');
            return { isEmpty: true, fileCount: 0 };
        } else {
            console.log(`❌ ISSUE: Found ${files.length} files in uploads/templates`);
            console.log('   This suggests templates are still being stored locally');

            // Show recent files
            const fileDetails = await Promise.all(
                files.map(async (file) => {
                    const filePath = path.join(uploadsPath, file);
                    const stats = await fs.promises.stat(filePath);
                    return {
                        name: file,
                        size: stats.size,
                        created: stats.birthtime,
                        ageMinutes: Math.floor((Date.now() - stats.birthtime.getTime()) / (1000 * 60))
                    };
                })
            );

            fileDetails.sort((a, b) => a.ageMinutes - b.ageMinutes);

            console.log('\n   Recent files:');
            fileDetails.slice(0, 3).forEach((file, index) => {
                console.log(`   ${index + 1}. ${file.name}`);
                console.log(`      Size: ${file.size} bytes, Age: ${file.ageMinutes} minutes`);
            });

            return { isEmpty: false, fileCount: files.length, files: fileDetails };
        }

    } catch (error) {
        console.error('❌ Error checking uploads folder:', error);
        return { isEmpty: false, fileCount: -1 };
    }
}

function printTestInstructions() {
    console.log('\n📋 HOW TO TEST:');
    console.log('===============');
    console.log('');
    console.log('1. 🚀 Start the backend server:');
    console.log('   cd backend && npm run dev');
    console.log('');
    console.log('2. 🌐 Start the frontend:');
    console.log('   cd frontend && npm run dev');
    console.log('');
    console.log('3. 📤 Upload a template through the UI:');
    console.log('   - Go to Certificate Management page');
    console.log('   - Click "Upload New Template"');
    console.log('   - Select a PowerPoint file');
    console.log('   - Submit the upload');
    console.log('');
    console.log('4. 🔍 Run this script again:');
    console.log('   node scripts/verify-template-upload.js');
    console.log('');
    console.log('5. ✅ If uploads folder stays empty = Azure is working!');
    console.log('   ❌ If files appear in uploads folder = Still using local storage');
}

function printAzureVerification() {
    console.log('\n🔧 VERIFY AZURE INTEGRATION:');
    console.log('=============================');
    console.log('');
    console.log('Check the backend console logs during upload for:');
    console.log('✅ "📤 Creating template with Azure storage..."');
    console.log('✅ "📤 Uploading template [ID] to Azure..."');
    console.log('✅ "✅ Template uploaded to Azure successfully"');
    console.log('✅ "🗑️ Cleaned up local file: [path]"');
    console.log('');
    console.log('If you see "🔄 Falling back to local storage..." then:');
    console.log('- Check Azure Storage connection string in .env');
    console.log('- Verify Azure storage account exists');
    console.log('- Check network connectivity');
}

function printEnvCheck() {
    console.log('\n⚙️  ENVIRONMENT CHECK:');
    console.log('=====================');
    console.log('');
    console.log('Required environment variables:');
    console.log('- AZURE_STORAGE_CONNECTION_STRING');
    console.log('- AZURE_TEMPLATES_CONTAINER_NAME (default: certificate-templates)');
    console.log('');
    console.log('Add these to your .env file in the backend directory.');
}

async function main() {
    printHeader();

    const result = await checkUploadsFolder();

    if (result.isEmpty) {
        console.log('\n🎉 TEMPLATE UPLOAD FIX APPEARS TO BE WORKING!');
        console.log('   Templates should now be using Azure Blob Storage.');
        console.log('');
        console.log('   To be 100% sure, follow the test instructions below.');
    } else if (result.fileCount > 0) {
        console.log('\n⚠️  TEMPLATE UPLOAD FIX NEEDS VERIFICATION');
        console.log('   Files are still present in local uploads folder.');
        console.log('');
        console.log('   This could mean:');
        console.log('   - Files are from before the fix was applied');
        console.log('   - Azure storage is not configured properly');
        console.log('   - The backend server needs to be restarted');
    }

    printTestInstructions();
    printAzureVerification();
    printEnvCheck();
}

main().catch(console.error);