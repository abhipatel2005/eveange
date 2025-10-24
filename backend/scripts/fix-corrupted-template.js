#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { azureBlobService } from '../src/config/azure.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function fixCorruptedTemplate() {
    const templateId = '54920887-ba9d-48a7-aac5-3758bd2b8dd2';

    console.log('🔧 Fixing Corrupted Template');
    console.log('============================');
    console.log(`Template ID: ${templateId}`);
    console.log('');

    try {
        // Get the template record
        const { data: template, error } = await supabase
            .from('certificate_templates')
            .select('*')
            .eq('id', templateId)
            .single();

        if (error || !template) {
            console.log('❌ Template not found');
            return;
        }

        console.log('📋 Current state: uses_azure_storage =', template.uses_azure_storage);
        console.log('📋 Current state: azure_url =', template.azure_url);
        console.log('📋 Current state: file_path =', template.template?.file_path);
        console.log('');

        // Try to find the template in Azure storage
        console.log('🔍 Checking if template exists in Azure...');

        try {
            // Generate potential Azure filename
            const originalFileName = template.template?.file_name || 'template.pptx';
            const azureFileName = azureBlobService.generateTemplateFileName(templateId, originalFileName);

            console.log('📁 Trying Azure filename:', azureFileName);

            // Try to download from Azure
            const templateBuffer = await azureBlobService.downloadTemplate(azureFileName);

            if (templateBuffer && templateBuffer.length > 0) {
                console.log(`✅ Found template in Azure! Size: ${templateBuffer.length} bytes`);

                // Generate secure URL
                const secureUrl = await azureBlobService.getSecureTemplateUrl(azureFileName);

                // Update the database record
                const { error: updateError } = await supabase
                    .from('certificate_templates')
                    .update({
                        uses_azure_storage: true,
                        azure_url: secureUrl,
                        template: {
                            ...template.template,
                            azure_file_name: azureFileName,
                            type: 'powerpoint',
                            file_name: originalFileName
                        },
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', templateId);

                if (updateError) {
                    console.error('❌ Error updating template:', updateError);
                } else {
                    console.log('✅ Template record updated successfully!');
                    console.log('   - uses_azure_storage: true');
                    console.log('   - azure_url: Set');
                    console.log('   - azure_file_name: Set');
                    console.log('');
                    console.log('🎉 Template should now work for certificate generation!');
                }

                return;
            }
        } catch (azureError) {
            console.log('❌ Template not found in Azure storage');
            console.log('Error:', azureError.message);
        }

        // If not found in Azure, check if there's a local file
        console.log('');
        console.log('🔍 Checking for local file...');

        const localPath = `D:\\eveange\\backend\\uploads\\templates\\template-1760549613882-268720746.pptx`;
        try {
            const fs = await import('fs/promises');
            await fs.access(localPath);

            console.log('✅ Found local file:', localPath);

            // Update template to use local path
            const { error: updateError } = await supabase
                .from('certificate_templates')
                .update({
                    uses_azure_storage: false,
                    template: {
                        ...template.template,
                        file_path: localPath,
                        type: 'powerpoint',
                        file_name: 'template-1760549613882-268720746.pptx'
                    },
                    updated_at: new Date().toISOString()
                })
                .eq('id', templateId);

            if (updateError) {
                console.error('❌ Error updating template:', updateError);
            } else {
                console.log('✅ Template record updated to use local file!');
                console.log('🎉 Template should now work for certificate generation!');
            }

        } catch (localError) {
            console.log('❌ Local file not found either');
            console.log('');
            console.log('🗑️ RECOMMENDATION: Delete this corrupted template');
            console.log('   The template file no longer exists in either location');
            console.log('');
            console.log('To delete the template, run:');
            console.log(`   DELETE FROM certificate_templates WHERE id = '${templateId}';`);
            console.log('');
            console.log('Or create a new template upload to replace it.');
        }

    } catch (error) {
        console.error('❌ Fix operation error:', error);
    }
}

fixCorruptedTemplate().catch(console.error);