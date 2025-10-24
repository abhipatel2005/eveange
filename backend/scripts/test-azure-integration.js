#!/usr/bin/env node

/**
 * Azure Storage Integration Test
 * 
 * This script tests that both templates and certificates are properly using Azure storage
 * instead of local uploads folder.
 */

import fs from 'fs';
import path from 'path';

async function checkLocalUploads() {
    console.log('🔍 AZURE STORAGE INTEGRATION TEST');
    console.log('================================');
    console.log('');

    // Check templates folder
    const templatesPath = path.join(process.cwd(), 'uploads', 'templates');
    const certificatesPath = path.join(process.cwd(), 'uploads', 'certificates');

    console.log('📁 Checking Template Storage:');
    await checkFolder(templatesPath, 'templates');

    console.log('\n📁 Checking Certificate Storage:');
    await checkFolder(certificatesPath, 'certificates');

    console.log('\n🧪 TESTING RECOMMENDATIONS:');
    console.log('===========================');
    console.log('');
    console.log('1. 📤 Upload a new template through UI');
    console.log('   - Should NOT create files in uploads/templates/');
    console.log('   - Check backend logs for "📤 Creating template with Azure storage..."');
    console.log('');
    console.log('2. 🏆 Generate certificates for an event');
    console.log('   - Should NOT create files in uploads/certificates/');
    console.log('   - Check backend logs for Azure certificate upload messages');
    console.log('');
    console.log('3. 📥 Download a certificate');
    console.log('   - Should download from Azure Blob Storage');
    console.log('   - Check backend logs for "📥 Downloading certificate from Azure"');
    console.log('');
    console.log('4. 🌐 Access certificate/template URLs');
    console.log('   - Should serve from Azure via custom endpoints in server.ts');
    console.log('   - URLs should work: /uploads/templates/[filename] and /uploads/certificates/[filename]');
}

async function checkFolder(folderPath, type) {
    try {
        try {
            await fs.promises.access(folderPath);
        } catch (error) {
            console.log(`✅ EXCELLENT: No uploads/${type}/ directory exists`);
            console.log(`   This means ${type} are not being stored locally`);
            return;
        }

        const files = await fs.promises.readdir(folderPath);

        if (files.length === 0) {
            console.log(`✅ EXCELLENT: uploads/${type}/ directory is empty`);
            console.log(`   This means ${type} are not being stored locally`);
        } else {
            console.log(`❌ ISSUE: Found ${files.length} files in uploads/${type}/`);
            console.log(`   This suggests ${type} are still being stored locally`);

            // Show newest files
            const fileDetails = await Promise.all(
                files.slice(0, 3).map(async (file) => {
                    const filePath = path.join(folderPath, file);
                    const stats = await fs.promises.stat(filePath);
                    const ageMinutes = Math.floor((Date.now() - stats.birthtime.getTime()) / (1000 * 60));
                    return { name: file, ageMinutes };
                })
            );

            console.log('   Recent files:');
            fileDetails.forEach((file, index) => {
                console.log(`   ${index + 1}. ${file.name} (${file.ageMinutes} minutes old)`);
            });

            const recentFiles = fileDetails.filter(f => f.ageMinutes < 30);
            if (recentFiles.length > 0) {
                console.log(`   ⚠️  ${recentFiles.length} files created in last 30 minutes - may indicate active local storage use`);
            }
        }
    } catch (error) {
        console.error(`❌ Error checking ${type} folder:`, error);
    }
}

checkLocalUploads().catch(console.error);