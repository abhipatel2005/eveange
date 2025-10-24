#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function fixCorruptedTemplates() {
    console.log('🔧 Fixing Corrupted Template Records');
    console.log('====================================');
    console.log('');

    try {
        // Find all templates that don't have proper storage configuration
        console.log('🔍 Searching for corrupted templates...');

        const { data: templates, error } = await supabase
            .from('certificate_templates')
            .select('*')
            .or('uses_azure_storage.is.null,and(uses_azure_storage.eq.false,template->file_path.is.null),and(uses_azure_storage.eq.true,azure_url.is.null)');

        if (error) {
            console.error('❌ Error fetching templates:', error);
            return;
        }

        if (!templates || templates.length === 0) {
            console.log('✅ No corrupted templates found!');
            return;
        }

        console.log(`📋 Found ${templates.length} corrupted templates:`);

        for (const template of templates) {
            console.log(`\n🔍 Template: ${template.name} (ID: ${template.id})`);
            console.log(`   Event ID: ${template.event_id}`);
            console.log(`   Uses Azure: ${template.uses_azure_storage}`);
            console.log(`   Azure URL: ${template.azure_url ? 'Set' : 'Missing'}`);
            console.log(`   File Path: ${template.template?.file_path ? 'Set' : 'Missing'}`);

            // Determine the fix needed
            if (template.uses_azure_storage === true && !template.azure_url) {
                console.log('   ❌ ISSUE: Marked as Azure storage but no azure_url');
                console.log('   🔧 FIX: Will delete this corrupted record');

                // Delete the corrupted record
                const { error: deleteError } = await supabase
                    .from('certificate_templates')
                    .delete()
                    .eq('id', template.id);

                if (deleteError) {
                    console.log('   ❌ Failed to delete:', deleteError.message);
                } else {
                    console.log('   ✅ Corrupted template deleted');
                }

            } else if (template.uses_azure_storage === false && !template.template?.file_path) {
                console.log('   ❌ ISSUE: Marked as local storage but no file_path');
                console.log('   🔧 FIX: Will delete this corrupted record');

                // Delete the corrupted record
                const { error: deleteError } = await supabase
                    .from('certificate_templates')
                    .delete()
                    .eq('id', template.id);

                if (deleteError) {
                    console.log('   ❌ Failed to delete:', deleteError.message);
                } else {
                    console.log('   ✅ Corrupted template deleted');
                }

            } else if (template.uses_azure_storage === null) {
                console.log('   ❌ ISSUE: uses_azure_storage is null');
                console.log('   🔧 FIX: Will set to false (local storage) as default');

                // Update to use local storage as default
                const updatedTemplate = {
                    ...template.template,
                    type: template.template?.type || 'powerpoint',
                    file_name: template.template?.file_name || 'template.pptx'
                };

                const { error: updateError } = await supabase
                    .from('certificate_templates')
                    .update({
                        uses_azure_storage: false,
                        template: updatedTemplate,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', template.id);

                if (updateError) {
                    console.log('   ❌ Failed to update:', updateError.message);
                } else {
                    console.log('   ✅ Template updated to use local storage');
                }
            }
        }

        console.log('\n🎉 Template cleanup completed!');
        console.log('');
        console.log('📝 Recommendations:');
        console.log('- Upload new templates through the UI to ensure proper Azure storage');
        console.log('- The fixed templates may still need file uploads to work properly');

    } catch (error) {
        console.error('❌ Cleanup operation error:', error);
    }
}

fixCorruptedTemplates().catch(console.error);