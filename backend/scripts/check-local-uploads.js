#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Simple script to check if templates are still being uploaded locally
async function checkLocalUploads() {
    console.log('🔍 Checking local uploads folder for recent template files...');

    try {
        const uploadsPath = path.join(process.cwd(), 'uploads', 'templates');
        console.log('📁 Checking directory:', uploadsPath);

        // Check if uploads directory exists
        try {
            await fs.promises.access(uploadsPath);
        } catch (error) {
            console.log('✅ No uploads/templates directory found - this is good!');
            console.log('   This suggests templates are not being stored locally');
            return;
        }

        // List files in uploads directory
        const files = await fs.promises.readdir(uploadsPath);

        if (files.length === 0) {
            console.log('✅ Uploads directory is empty - this is good!');
            console.log('   This suggests templates are not being stored locally');
        } else {
            console.log(`❌ Found ${files.length} files in uploads directory:`);

            // Get file details with timestamps
            const fileDetails = await Promise.all(
                files.map(async (file) => {
                    const filePath = path.join(uploadsPath, file);
                    const stats = await fs.promises.stat(filePath);
                    return {
                        name: file,
                        size: stats.size,
                        created: stats.birthtime,
                        modified: stats.mtime,
                        path: filePath
                    };
                })
            );

            // Sort by creation time (newest first)
            fileDetails.sort((a, b) => b.created - a.created);

            console.log('\n📋 Recent template files:');
            fileDetails.forEach((file, index) => {
                const ageInMinutes = Math.floor((Date.now() - file.created.getTime()) / (1000 * 60));
                console.log(`${index + 1}. ${file.name}`);
                console.log(`   Size: ${file.size} bytes`);
                console.log(`   Created: ${file.created.toISOString()} (${ageInMinutes} minutes ago)`);
                console.log(`   Path: ${file.path}`);
                console.log('');
            });

            // Check for very recent files (within last 10 minutes)
            const recentFiles = fileDetails.filter(file => {
                const ageInMinutes = (Date.now() - file.created.getTime()) / (1000 * 60);
                return ageInMinutes < 10;
            });

            if (recentFiles.length > 0) {
                console.log('⚠️  WARNING: Found files created within the last 10 minutes!');
                console.log('   This suggests the UI is still uploading to local storage');
                console.log('   Recent files:', recentFiles.map(f => f.name).join(', '));
            } else {
                console.log('ℹ️  All files are older than 10 minutes');
                console.log('   This might be from previous uploads before the fix');
            }
        }

    } catch (error) {
        console.error('❌ Error checking uploads folder:', error);
    }
}

// Additional check for Azure container usage
function printInstructions() {
    console.log('\n📝 How to test template upload:');
    console.log('1. Start the backend server: npm run dev:backend');
    console.log('2. Open the frontend and upload a template through the UI');
    console.log('3. Run this script again to see if files appear in uploads/');
    console.log('4. If no new files appear, the Azure integration is working!');
    console.log('\n🔧 To verify Azure usage, check the backend logs for:');
    console.log('   - "📤 Creating template with Azure storage..."');
    console.log('   - "✅ Template uploaded successfully to Azure storage"');
    console.log('   - "🗑️ Cleaned up local file:"');
}

checkLocalUploads().then(() => {
    printInstructions();
});