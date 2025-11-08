import { createClient } from "@supabase/supabase-js";
import { azureBlobService } from "../config/azure.js";
import fs from "fs/promises";
import crypto from "crypto";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
export class TemplateService {
    /**
     * Upload template to Azure and store URL in database
     */
    static async uploadTemplateToAzure(templateId, filePath, originalFileName) {
        try {
            console.log(`📤 Uploading template ${templateId} to Azure...`);
            // Read the template file
            const fileBuffer = await fs.readFile(filePath);
            // Generate Azure file name
            const azureFileName = azureBlobService.generateTemplateFileName(templateId, originalFileName);
            // Upload to Azure
            const azureUrl = await azureBlobService.uploadTemplate(azureFileName, fileBuffer, templateId);
            // Generate secure SAS URL
            const secureUrl = await azureBlobService.getSecureTemplateUrl(azureFileName);
            console.log(`✅ Template uploaded to Azure successfully`);
            return { azureUrl: secureUrl, azureFileName };
        }
        catch (error) {
            console.error("❌ Error uploading template to Azure:", error);
            throw new Error("Failed to upload template to cloud storage");
        }
    }
    /**
     * Download template from Azure storage
     */
    static async downloadTemplateFromAzure(azureFileName) {
        try {
            console.log(`📥 Downloading template from Azure: ${azureFileName}`);
            return await azureBlobService.downloadTemplate(azureFileName);
        }
        catch (error) {
            console.error("❌ Error downloading template from Azure:", error);
            throw new Error("Failed to download template from cloud storage");
        }
    }
    /**
     * Migrate existing template to Azure storage
     */
    static async migrateTemplateToAzure(templateId) {
        try {
            console.log(`🔄 Migrating template ${templateId} to Azure...`);
            // Get existing template data
            const { data: template, error } = await supabase
                .from("certificate_templates")
                .select("*")
                .eq("id", templateId)
                .single();
            if (error || !template) {
                throw new Error(`Template ${templateId} not found`);
            }
            // Skip if already using Azure storage
            if (template.uses_azure_storage) {
                console.log(`✅ Template ${templateId} already uses Azure storage`);
                return true;
            }
            // Check if local file exists
            const localFilePath = template.template?.file_path;
            if (!localFilePath) {
                throw new Error("Template has no local file path");
            }
            try {
                await fs.access(localFilePath);
            }
            catch {
                throw new Error(`Local template file not found: ${localFilePath}`);
            }
            // Upload to Azure
            const azureUrl = await this.uploadTemplateToAzure(templateId, localFilePath, template.template.file_name);
            // Update database record
            const { error: updateError } = await supabase
                .from("certificate_templates")
                .update({
                azure_url: azureUrl,
                uses_azure_storage: true,
                updated_at: new Date().toISOString(),
            })
                .eq("id", templateId);
            if (updateError) {
                throw new Error(`Failed to update template record: ${updateError.message}`);
            }
            // Optionally remove local file after successful migration
            // Uncomment the following lines if you want to clean up local files
            // try {
            //   await fs.unlink(localFilePath);
            //   console.log(`🗑️ Cleaned up local file: ${localFilePath}`);
            // } catch (cleanupError) {
            //   console.warn(`⚠️ Could not clean up local file: ${cleanupError}`);
            // }
            console.log(`✅ Template ${templateId} migrated to Azure successfully`);
            return true;
        }
        catch (error) {
            console.error(`❌ Error migrating template ${templateId} to Azure:`, error);
            return false;
        }
    }
    /**
     * Create new template with direct Azure upload (no local storage)
     */
    static async createTemplateWithAzure(eventId, templateName, fileBuffer, originalFileName, templateConfig) {
        try {
            console.log(`📝 Creating new template with direct Azure upload...`);
            // Generate template ID
            const templateId = crypto.randomUUID();
            // Generate Azure file name
            const azureFileName = azureBlobService.generateTemplateFileName(templateId, originalFileName);
            // Upload directly to Azure from buffer
            console.log(`📤 Uploading template ${templateId} directly to Azure...`);
            const azureUrl = await azureBlobService.uploadTemplate(azureFileName, fileBuffer, templateId);
            // Generate secure SAS URL
            const secureUrl = await azureBlobService.getSecureTemplateUrl(azureFileName);
            // Create database record with ALL columns properly populated
            const { data: newTemplate, error: createError } = await supabase
                .from("certificate_templates")
                .insert({
                id: templateId,
                event_id: eventId,
                name: templateName,
                type: templateConfig.type || "powerpoint", // Individual column
                template: {
                    azure_file_name: azureFileName,
                    file_name: originalFileName,
                    type: templateConfig.type || "powerpoint",
                    ...templateConfig,
                }, // JSONB column with template configuration
                azure_url: secureUrl, // Individual column for Azure URL
                uses_azure_storage: true, // Individual column for storage type
                extracted_placeholders: templateConfig.placeholders || [], // Individual column
                placeholder_mapping: templateConfig.placeholder_mapping || {}, // Individual column
                file_path: null, // No local file path for Azure storage
            })
                .select("*")
                .single();
            if (createError) {
                // Clean up Azure blob if database insert fails
                try {
                    await azureBlobService.deleteTemplate(azureFileName);
                }
                catch (cleanupError) {
                    console.error("Error cleaning up Azure blob:", cleanupError);
                }
                throw new Error(`Failed to create template: ${createError.message}`);
            }
            console.log(`✅ Template created successfully with direct Azure upload`);
            return newTemplate;
        }
        catch (error) {
            console.error("❌ Error creating template with Azure:", error);
            throw error;
        }
    }
    /**
     * Get template file (from Azure or local storage)
     */
    static async getTemplateFile(templateId) {
        try {
            // Get template data
            const { data: template, error } = await supabase
                .from("certificate_templates")
                .select("*")
                .eq("id", templateId)
                .single();
            if (error || !template) {
                throw new Error(`Template ${templateId} not found`);
            }
            if (template.uses_azure_storage && template.azure_url) {
                // Use stored Azure filename if available, otherwise generate it
                const azureFileName = template.template?.azure_file_name ||
                    azureBlobService.generateTemplateFileName(templateId, template.template.file_name);
                return await this.downloadTemplateFromAzure(azureFileName);
            }
            else if (template.template?.file_path) {
                // Read from local filesystem
                return await fs.readFile(template.template.file_path);
            }
            else {
                throw new Error("Template has no valid file path or Azure URL");
            }
        }
        catch (error) {
            console.error(`❌ Error getting template file ${templateId}:`, error);
            throw error;
        }
    }
    /**
     * Delete template (from both database and storage)
     */
    static async deleteTemplate(templateId) {
        try {
            console.log(`🗑️ Deleting template ${templateId}...`);
            // Get template data first
            const { data: template, error } = await supabase
                .from("certificate_templates")
                .select("*")
                .eq("id", templateId)
                .single();
            if (error || !template) {
                throw new Error(`Template ${templateId} not found`);
            }
            // Delete from storage
            if (template.uses_azure_storage) {
                const azureFileName = template.template?.azure_file_name ||
                    azureBlobService.generateTemplateFileName(templateId, template.template.file_name);
                await azureBlobService.deleteTemplate(azureFileName);
                console.log(`✅ Template deleted from Azure storage`);
            }
            else if (template.template?.file_path) {
                try {
                    await fs.unlink(template.template.file_path);
                    console.log(`✅ Template deleted from local storage`);
                }
                catch (fileError) {
                    console.warn(`⚠️ Could not delete local file: ${fileError}`);
                }
            }
            // Delete from database
            const { error: deleteError } = await supabase
                .from("certificate_templates")
                .delete()
                .eq("id", templateId);
            if (deleteError) {
                throw new Error(`Failed to delete template from database: ${deleteError.message}`);
            }
            console.log(`✅ Template ${templateId} deleted successfully`);
            return true;
        }
        catch (error) {
            console.error(`❌ Error deleting template ${templateId}:`, error);
            return false;
        }
    }
    /**
     * Migrate all existing templates to Azure storage
     */
    static async migrateAllTemplatesToAzure() {
        try {
            console.log(`🚀 Starting migration of all templates to Azure...`);
            const { data: templates, error } = await supabase
                .from("certificate_templates")
                .select("id, uses_azure_storage")
                .eq("uses_azure_storage", false);
            if (error) {
                throw new Error(`Failed to fetch templates: ${error.message}`);
            }
            if (!templates || templates.length === 0) {
                console.log(`✅ No templates need migration`);
                return { success: 0, failed: 0, skipped: 0 };
            }
            let success = 0;
            let failed = 0;
            let skipped = 0;
            for (const template of templates) {
                try {
                    const migrated = await this.migrateTemplateToAzure(template.id);
                    if (migrated) {
                        success++;
                    }
                    else {
                        failed++;
                    }
                }
                catch (error) {
                    console.error(`❌ Failed to migrate template ${template.id}:`, error);
                    failed++;
                }
            }
            console.log(`✅ Migration completed: ${success} success, ${failed} failed, ${skipped} skipped`);
            return { success, failed, skipped };
        }
        catch (error) {
            console.error(`❌ Error during bulk template migration:`, error);
            throw error;
        }
    }
}
