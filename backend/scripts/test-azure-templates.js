#!/usr/bin/env node

/**
 * Simple test script to verify Azure template upload functionality
 * This creates a test event and uploads a template to verify Azure integration
 */

import { createClient } from '@supabase/supabase-js';
import { TemplateService } from '../dist/services/templateService.js';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import 'dotenv/config';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function createTestPPTX() {
    // Create a minimal test PowerPoint file content
    const testContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:slide>
    <p:cSld>
      <p:spTree>
        <p:sp>
          <p:txBody>
            <a:p>
              <a:r>
                <a:t>{{participant_name}} has completed {{event_title}}</a:t>
              </a:r>
            </a:p>
          </p:txBody>
        </p:sp>
      </p:spTree>
    </p:cSld>
  </p:slide>
</p:presentation>`;

    const testFilePath = join(process.cwd(), 'test-template.pptx');
    await writeFile(testFilePath, testContent);
    return testFilePath;
}

async function testAzureTemplateUpload() {
    try {
        console.log('🧪 Testing Azure template upload functionality...\n');

        // Verify Azure configuration
        const requiredVars = [
            'AZURE_STORAGE_CONNECTION_STRING',
            'AZURE_TEMPLATES_CONTAINER_NAME',
            'SUPABASE_URL',
            'SUPABASE_SERVICE_KEY'
        ];

        const missing = requiredVars.filter(varName => !process.env[varName]);
        if (missing.length > 0) {
            console.error('❌ Missing required environment variables:');
            missing.forEach(varName => console.error(`   - ${varName}`));
            return false;
        }

        console.log('✅ Environment variables verified');

        // Create test PPTX file
        console.log('📄 Creating test PowerPoint template...');
        const testFilePath = await createTestPPTX();
        console.log('✅ Test template created');

        // Create test template configuration
        const templateConfig = {
            type: "powerpoint",
            file_name: "test-template.pptx",
            placeholders: ["participant_name", "event_title"],
            placeholder_mapping: {},
            available_fields: [],
        };

        console.log('📤 Testing Azure upload...');

        // Test template creation with Azure
        const newTemplate = await TemplateService.createTemplateWithAzure(
            'test-event-id',
            'Test Template',
            testFilePath,
            'test-template.pptx',
            templateConfig
        );

        console.log('✅ Template uploaded to Azure successfully!');
        console.log('📋 Template details:');
        console.log(`   - ID: ${newTemplate.id}`);
        console.log(`   - Uses Azure: ${newTemplate.uses_azure_storage}`);
        console.log(`   - Azure URL: ${newTemplate.azure_url ? 'Set' : 'Not set'}`);

        // Test template download
        console.log('\n📥 Testing template download from Azure...');
        const downloadedBuffer = await TemplateService.getTemplateFile(newTemplate.id);
        console.log(`✅ Template downloaded successfully (${downloadedBuffer.length} bytes)`);

        // Cleanup test template
        console.log('\n🗑️ Cleaning up test template...');
        await TemplateService.deleteTemplate(newTemplate.id);
        console.log('✅ Test template deleted from Azure');

        // Cleanup local file
        await unlink(testFilePath);
        console.log('✅ Local test file cleaned up');

        console.log('\n🎉 Azure template integration test completed successfully!');
        return true;

    } catch (error) {
        console.error('\n❌ Test failed:', error);
        return false;
    }
}

async function main() {
    console.log('🔧 Azure Template Upload Test\n');

    const success = await testAzureTemplateUpload();

    if (success) {
        console.log('\n✅ All tests passed! Azure template storage is working correctly.');
        process.exit(0);
    } else {
        console.log('\n❌ Tests failed. Please check the errors above.');
        process.exit(1);
    }
}

// Run the test
main().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
});