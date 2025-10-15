#!/usr/bin/env node

/**
 * Script to migrate existing certificate templates to Azure Blob Storage
 * This script will:
 * 1. Run the database migration to add Azure columns
 * 2. Upload all existing templates to Azure
 * 3. Update database records with Azure URLs
 * 4. Optionally clean up local files
 */

import { TemplateService } from '../src/services/templateService.js';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFile } from 'fs/promises';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function runMigration() {
    try {
        console.log('🚀 Running database migration...');

        const migrationPath = join(__dirname, '../../database/migrations/009_add_template_azure_url.sql');
        const migrationSQL = await readFile(migrationPath, 'utf-8');

        // Execute migration
        const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

        if (error) {
            console.error('❌ Migration failed:', error);
            return false;
        }

        console.log('✅ Database migration completed successfully');
        return true;
    } catch (error) {
        console.error('❌ Error running migration:', error);
        return false;
    }
}

async function migrateTemplates() {
    try {
        console.log('📦 Starting template migration to Azure...');

        const result = await TemplateService.migrateAllTemplatesToAzure();

        console.log('\n📊 Migration Summary:');
        console.log(`✅ Successfully migrated: ${result.success} templates`);
        console.log(`❌ Failed to migrate: ${result.failed} templates`);
        console.log(`⏭️ Skipped (already migrated): ${result.skipped} templates`);

        if (result.failed > 0) {
            console.log('\n⚠️ Some templates failed to migrate. Check the logs above for details.');
            return false;
        }

        console.log('\n🎉 All templates migrated successfully!');
        return true;
    } catch (error) {
        console.error('❌ Error during template migration:', error);
        return false;
    }
}

async function verifyAzureConfig() {
    const requiredVars = [
        'AZURE_STORAGE_CONNECTION_STRING',
        'AZURE_STORAGE_ACCOUNT_NAME',
        'AZURE_STORAGE_ACCOUNT_KEY',
        'AZURE_CONTAINER_NAME',
        'AZURE_TEMPLATES_CONTAINER_NAME'
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);

    if (missing.length > 0) {
        console.error('❌ Missing required Azure environment variables:');
        missing.forEach(varName => console.error(`   - ${varName}`));
        console.error('\nPlease set these variables in your .env file and try again.');
        return false;
    }

    console.log('✅ Azure configuration verified');
    return true;
}

async function main() {
    console.log('🔧 Certificate Template Azure Migration Tool\n');

    // Verify configuration
    if (!await verifyAzureConfig()) {
        process.exit(1);
    }

    // Run database migration
    if (!await runMigration()) {
        console.error('❌ Database migration failed. Aborting template migration.');
        process.exit(1);
    }

    // Migrate templates
    if (!await migrateTemplates()) {
        console.error('❌ Template migration completed with errors.');
        process.exit(1);
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Update your application to use Azure storage for new templates');
    console.log('2. Test template loading and certificate generation');
    console.log('3. Consider cleaning up local template files if migration was successful');
    console.log('4. Monitor Azure storage usage and costs');
}

// Handle CLI arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Certificate Template Azure Migration Tool

Usage: node migrate-templates.js [options]

Options:
  --help, -h     Show this help message
  --dry-run      Show what would be migrated without making changes
  --force        Force migration even if some templates already use Azure

Environment Variables Required:
  AZURE_STORAGE_CONNECTION_STRING
  AZURE_STORAGE_ACCOUNT_NAME
  AZURE_STORAGE_ACCOUNT_KEY
  AZURE_CONTAINER_NAME
  AZURE_TEMPLATES_CONTAINER_NAME
  SUPABASE_URL
  SUPABASE_SERVICE_KEY
`);
    process.exit(0);
}

if (args.includes('--dry-run')) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
    // TODO: Implement dry run logic
    process.exit(0);
}

// Run the migration
main().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
});