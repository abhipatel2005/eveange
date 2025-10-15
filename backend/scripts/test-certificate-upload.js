#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import https from 'https';

// Test the actual certificate controller template upload endpoint
async function testTemplateUpload() {
    console.log('🧪 Testing Certificate Controller Template Upload...');

    try {
        // Create a test PPTX file
        const testFilePath = path.join(__dirname, 'test-template.txt');
        const testContent = 'This is a test template file for upload testing';
        fs.writeFileSync(testFilePath, testContent);

        console.log('📝 Created test file:', testFilePath);

        // Create form data
        const form = new FormData();
        form.append('template', fs.createReadStream(testFilePath));
        form.append('name', 'Test Template Upload');
        form.append('type', 'powerpoint');
        form.append('eventId', 'test-event-id');

        // Make request to the upload endpoint
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/api/certificates/templates/upload',
            method: 'POST',
            headers: {
                ...form.getHeaders(),
                'Authorization': 'Bearer test-token' // This might fail but we can see the logs
            }
        };

        console.log('📤 Sending request to upload endpoint...');

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log('📥 Response status:', res.statusCode);
                console.log('📥 Response data:', data);

                // Clean up test file
                try {
                    fs.unlinkSync(testFilePath);
                    console.log('🗑️ Cleaned up test file');
                } catch (err) {
                    console.warn('⚠️ Could not clean up test file:', err);
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Request error:', error);

            // Clean up test file
            try {
                fs.unlinkSync(testFilePath);
            } catch (err) {
                console.warn('⚠️ Could not clean up test file:', err);
            }
        });

        form.pipe(req);

    } catch (error) {
        console.error('❌ Test setup error:', error);
    }
}

// Alternative: Test by checking the database after a manual upload
async function checkRecentTemplateUploads() {
    console.log('🔍 Checking recent template uploads in database...');

    try {
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        );

        const { data: templates, error } = await supabase
            .from('certificate_templates')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) {
            console.error('❌ Database query error:', error);
            return;
        }

        console.log('📊 Recent template uploads:');
        templates.forEach((template, index) => {
            console.log(`\n${index + 1}. Template: ${template.name}`);
            console.log(`   ID: ${template.id}`);
            console.log(`   Uses Azure: ${template.uses_azure_storage}`);
            console.log(`   Azure URL: ${template.azure_url ? 'Yes' : 'No'}`);
            console.log(`   Local Path: ${template.template?.file_path || 'None'}`);
            console.log(`   Created: ${template.created_at}`);

            if (template.uses_azure_storage) {
                console.log('   ✅ Uses Azure Storage');
            } else {
                console.log('   ❌ Uses Local Storage');
            }
        });

    } catch (error) {
        console.error('❌ Database check error:', error);
    }
}

// Run the test
if (process.argv.includes('--check-db')) {
    checkRecentTemplateUploads();
} else {
    console.log('🧪 Template Upload Test Options:');
    console.log('   node test-certificate-upload.js         - Test upload endpoint');
    console.log('   node test-certificate-upload.js --check-db - Check recent uploads');
    console.log('');
    testTemplateUpload();
}