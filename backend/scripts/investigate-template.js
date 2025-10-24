#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function investigateTemplate() {
    const templateId = '54920887-ba9d-48a7-aac5-3758bd2b8dd2';

    console.log('🔍 Investigating Template Issue');
    console.log('================================');
    console.log(`Template ID: ${templateId}`);
    console.log('');

    try {
        // Get the template record
        const { data: template, error } = await supabase
            .from('certificate_templates')
            .select('*')
            .eq('id', templateId)
            .single();

        if (error) {
            console.error('❌ Error fetching template:', error);
            return;
        }

        if (!template) {
            console.log('❌ Template not found in database');
            return;
        }

        console.log('📋 Template Record:');
        console.log('==================');
        console.log('ID:', template.id);
        console.log('Name:', template.name);
        console.log('Event ID:', template.event_id);
        console.log('Uses Azure Storage:', template.uses_azure_storage);
        console.log('Azure URL:', template.azure_url);
        console.log('Created At:', template.created_at);
        console.log('Updated At:', template.updated_at);
        console.log('');

        console.log('📄 Template Config:');
        console.log('===================');
        if (template.template) {
            console.log('Type:', template.template.type);
            console.log('File Name:', template.template.file_name);
            console.log('File Path:', template.template.file_path);
            console.log('Azure File Name:', template.template.azure_file_name);
            console.log('Placeholders:', template.template.placeholders?.length || 0);
        } else {
            console.log('❌ No template config found');
        }
        console.log('');

        console.log('🔧 Issue Analysis:');
        console.log('==================');

        if (template.uses_azure_storage) {
            if (template.azure_url) {
                console.log('✅ Template marked as Azure storage with URL');
                // Check if Azure filename exists
                const azureFileName = template.template?.azure_file_name;
                if (azureFileName) {
                    console.log('✅ Azure filename available:', azureFileName);
                } else {
                    console.log('⚠️ No azure_file_name in template config');
                    console.log('   Will try to generate filename from template data');
                }
            } else {
                console.log('❌ Template marked as Azure storage but no azure_url');
                console.log('   This is the ROOT CAUSE of the error');
            }
        } else {
            console.log('📁 Template uses local storage');
            if (template.template?.file_path) {
                console.log('✅ Local file path available:', template.template.file_path);
            } else {
                console.log('❌ No file_path in template config');
                console.log('   This is the ROOT CAUSE of the error');
            }
        }

        console.log('');
        console.log('🛠️ Suggested Fix:');
        console.log('=================');

        if (template.uses_azure_storage && !template.azure_url) {
            console.log('Option 1: Migrate template to Azure storage');
            console.log('Option 2: Update uses_azure_storage to false and add file_path');
        } else if (!template.uses_azure_storage && !template.template?.file_path) {
            console.log('Option 1: Add valid local file_path to template config');
            console.log('Option 2: Migrate template to Azure storage');
        }

    } catch (error) {
        console.error('❌ Investigation error:', error);
    }
}

investigateTemplate().catch(console.error);