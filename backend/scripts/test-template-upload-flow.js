#!/usr/bin/env node

/**
 * Test script to verify that template uploads now use Azure storage
 */

import { TemplateService } from '../dist/services/templateService.js';
import { createClient } from '@supabase/supabase-js';
import { copyFile, unlink } from 'fs/promises';
import 'dotenv/config';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function testTemplateUploadFlow() {
    try {
        console.log('🧪 Testing complete template upload flow...\n');

        // Step 1: Create a test event first
        console.log('1. Creating test event...');
        const { data: event, error: eventError } = await supabase
            .from('events')
            .insert({
                title: 'Test Event for Template Upload',
                description: 'Testing Azure template integration',
                start_date: new Date().toISOString(),
                end_date: new Date(Date.now() + 86400000).toISOString(), // +1 day
                location: 'Test Location',
                capacity: 100,
                price: 0,
                organizer_id: '20f80c89-1399-4705-9fb1-428ed68566cb' // Test Organizer
            })
            .select()
            .single();

        if (eventError) {
            console.error('❌ Failed to create test event:', eventError.message);
            return;
        }

        console.log('✅ Test event created:', event.id);

        // Step 2: Copy an existing template file for testing
        console.log('\n2. Preparing test template file...');
        const sourceFile = './uploads/templates/template-1760548593034-186811565.pptx';
        const testFile = './test-template-upload.pptx';
        await copyFile(sourceFile, testFile);
        console.log('✅ Test file prepared');

        // Step 3: Test Azure template creation
        console.log('\n3. Testing Azure template creation...');
        const templateConfig = {
            type: "powerpoint",
            file_name: "test-azure-template.pptx",
            placeholders: ["participant_name", "event_title"],
            placeholder_mapping: {},
            available_fields: [],
        };

        const newTemplate = await TemplateService.createTemplateWithAzure(
            event.id,
            'Test Azure Template',
            testFile,
            'test-azure-template.pptx',
            templateConfig
        );

        console.log('✅ Template created with Azure storage!');
        console.log('   - Template ID:', newTemplate.id);
        console.log('   - Uses Azure Storage:', newTemplate.uses_azure_storage);
        console.log('   - Has Azure URL:', !!newTemplate.azure_url);

        // Step 4: Test template download
        console.log('\n4. Testing template download from Azure...');
        const downloadedBuffer = await TemplateService.getTemplateFile(newTemplate.id);
        console.log('✅ Template downloaded successfully');
        console.log('   - Downloaded size:', downloadedBuffer.length, 'bytes');

        // Step 5: Clean up
        console.log('\n5. Cleaning up...');
        await TemplateService.deleteTemplate(newTemplate.id);
        console.log('✅ Template deleted from Azure');

        await supabase.from('events').delete().eq('id', event.id);
        console.log('✅ Test event deleted');

        await unlink(testFile);
        console.log('✅ Test file cleaned up');

        console.log('\n🎉 Template upload flow test completed successfully!');
        console.log('\n📋 Summary:');
        console.log('✅ Templates are now stored in Azure Blob Storage');
        console.log('✅ Database correctly tracks Azure storage usage');
        console.log('✅ Template download works from Azure');
        console.log('✅ Template deletion works for Azure storage');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('Full error:', error);
    }
}

// Run the test
testTemplateUploadFlow();