import { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential, } from "@azure/storage-blob";
import { gzip, gunzip } from "zlib";
import { promisify } from "util";
import "dotenv/config";
const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);
const azureConfig = {
    connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING || "",
    containerName: process.env.AZURE_CONTAINER_NAME || "certificates",
    templatesContainerName: process.env.AZURE_TEMPLATES_CONTAINER_NAME || "certificate-templates",
    accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME || "",
    accountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY || "",
};
export class AzureBlobService {
    constructor() {
        if (!azureConfig.connectionString) {
            throw new Error("Azure Storage connection string is required");
        }
        this.blobServiceClient = BlobServiceClient.fromConnectionString(azureConfig.connectionString);
        this.containerName = azureConfig.containerName;
        this.templatesContainerName = azureConfig.templatesContainerName;
    }
    /**
     * Check if compression is beneficial for the file
     * PowerPoint files (.pptx) are already compressed (ZIP format), so compression may not help much
     * Canvas/image certificates could benefit from compression
     */
    shouldCompress(fileName, fileSize) {
        const ext = fileName.toLowerCase().split(".").pop();
        // Don't compress already compressed formats or small files
        if (ext === "pptx" ||
            ext === "zip" ||
            ext === "jpg" ||
            ext === "jpeg" ||
            ext === "png") {
            return false;
        }
        // Only compress files larger than 1KB to avoid overhead
        return fileSize > 1024;
    }
    async uploadCertificate(fileName, fileBuffer) {
        try {
            const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
            // Create container without public access (more secure)
            await containerClient.createIfNotExists();
            console.log("✅ Container created/exists (private access)");
            // Check if we should compress the file
            const shouldCompress = this.shouldCompress(fileName, fileBuffer.length);
            let finalBuffer = fileBuffer;
            let finalFileName = fileName;
            let contentType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
            let contentEncoding;
            if (shouldCompress) {
                console.log(`🗜️ Compressing certificate file (${fileBuffer.length} bytes)...`);
                finalBuffer = await gzipAsync(fileBuffer);
                finalFileName = fileName + ".gz";
                contentEncoding = "gzip";
                console.log(`✅ Compressed: ${fileBuffer.length} → ${finalBuffer.length} bytes (${Math.round((1 - finalBuffer.length / fileBuffer.length) * 100)}% reduction)`);
            }
            // Determine content type based on file extension
            const ext = fileName.toLowerCase().split(".").pop();
            if (ext === "png")
                contentType = "image/png";
            else if (ext === "jpg" || ext === "jpeg")
                contentType = "image/jpeg";
            else if (ext === "pdf")
                contentType = "application/pdf";
            const blockBlobClient = containerClient.getBlockBlobClient(finalFileName);
            // Upload with proper headers
            const uploadOptions = {
                blobHTTPHeaders: {
                    blobContentType: contentType,
                },
            };
            if (contentEncoding) {
                uploadOptions.blobHTTPHeaders.blobContentEncoding = contentEncoding;
            }
            await blockBlobClient.upload(finalBuffer, finalBuffer.length, uploadOptions);
            console.log("✅ Certificate uploaded successfully");
            // Return the blob URL (will be converted to SAS URL when needed)
            return blockBlobClient.url;
        }
        catch (error) {
            console.error("Error uploading certificate to Azure:", error);
            throw new Error("Failed to upload certificate to cloud storage");
        }
    }
    async downloadCertificate(fileName) {
        try {
            const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
            const blockBlobClient = containerClient.getBlockBlobClient(fileName);
            const downloadResponse = await blockBlobClient.download();
            if (!downloadResponse.readableStreamBody) {
                throw new Error("No data in blob");
            }
            const chunks = [];
            const buffer = await new Promise((resolve, reject) => {
                downloadResponse.readableStreamBody.on("data", (chunk) => {
                    chunks.push(chunk);
                });
                downloadResponse.readableStreamBody.on("end", () => {
                    resolve(Buffer.concat(chunks));
                });
                downloadResponse.readableStreamBody.on("error", reject);
            });
            // Check if file was compressed (has .gz extension or gzip content encoding)
            const contentEncoding = downloadResponse.contentEncoding;
            const isCompressed = fileName.endsWith(".gz") || contentEncoding === "gzip";
            if (isCompressed) {
                console.log(`🗜️ Decompressing downloaded file...`);
                return await gunzipAsync(buffer);
            }
            return buffer;
        }
        catch (error) {
            console.error("Error downloading certificate from Azure:", error);
            throw new Error("Failed to download certificate from cloud storage");
        }
    }
    /**
     * Upload certificate template to dedicated templates container
     */
    async uploadTemplate(fileName, fileBuffer, templateId) {
        try {
            const containerClient = this.blobServiceClient.getContainerClient(this.templatesContainerName);
            // Create templates container without public access
            await containerClient.createIfNotExists();
            console.log("✅ Templates container created/exists (private access)");
            // Use the consistent filename generation
            const templateFileName = fileName; // Use the pre-generated filename from generateTemplateFileName
            // Determine content type
            const ext = fileName.toLowerCase().split(".").pop();
            let contentType = "application/octet-stream";
            if (ext === "pptx")
                contentType =
                    "application/vnd.openxmlformats-officedocument.presentationml.presentation";
            else if (ext === "png")
                contentType = "image/png";
            else if (ext === "jpg" || ext === "jpeg")
                contentType = "image/jpeg";
            else if (ext === "pdf")
                contentType = "application/pdf";
            const blockBlobClient = containerClient.getBlockBlobClient(templateFileName);
            await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
                blobHTTPHeaders: {
                    blobContentType: contentType,
                },
                metadata: {
                    templateId: templateId,
                    originalFileName: fileName,
                    uploadedAt: new Date().toISOString(),
                },
            });
            console.log(`✅ Template uploaded successfully: ${templateFileName}`);
            return blockBlobClient.url;
        }
        catch (error) {
            console.error("Error uploading template to Azure:", error);
            throw new Error("Failed to upload template to cloud storage");
        }
    }
    /**
     * Download certificate template
     */
    async downloadTemplate(fileName) {
        try {
            const containerClient = this.blobServiceClient.getContainerClient(this.templatesContainerName);
            const blockBlobClient = containerClient.getBlockBlobClient(fileName);
            const downloadResponse = await blockBlobClient.download();
            if (!downloadResponse.readableStreamBody) {
                throw new Error("No template data in blob");
            }
            const chunks = [];
            return new Promise((resolve, reject) => {
                downloadResponse.readableStreamBody.on("data", (chunk) => {
                    chunks.push(chunk);
                });
                downloadResponse.readableStreamBody.on("end", () => {
                    resolve(Buffer.concat(chunks));
                });
                downloadResponse.readableStreamBody.on("error", reject);
            });
        }
        catch (error) {
            console.error("Error downloading template from Azure:", error);
            throw new Error("Failed to download template from cloud storage");
        }
    }
    /**
     * Delete certificate template
     */
    async deleteTemplate(fileName) {
        try {
            const containerClient = this.blobServiceClient.getContainerClient(this.templatesContainerName);
            const blockBlobClient = containerClient.getBlockBlobClient(fileName);
            const deleteResponse = await blockBlobClient.delete();
            return deleteResponse._response.status === 202;
        }
        catch (error) {
            console.error("Error deleting template from Azure:", error);
            return false;
        }
    }
    async deleteCertificate(fileName) {
        try {
            const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
            const blockBlobClient = containerClient.getBlockBlobClient(fileName);
            const deleteResponse = await blockBlobClient.delete();
            return deleteResponse._response.status === 202;
        }
        catch (error) {
            console.error("Error deleting certificate from Azure:", error);
            return false;
        }
    }
    generateFileName(eventId, participantId, extension = "pptx") {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        return `certificate-${eventId}-${participantId}-${timestamp}.${extension}`;
    }
    /**
     * Generate template file name
     */
    generateTemplateFileName(templateId, originalName) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const extension = originalName.split(".").pop();
        return `template-${templateId}-${timestamp}.${extension}`;
    }
    /**
     * Generate a secure SAS URL for certificate access
     * @param fileName - Name of the certificate file
     * @param expiryHours - How many hours the URL should be valid (default: 8760 = 1 year)
     * @param containerType - Which container to generate URL for ('certificates' or 'templates')
     * @returns Secure URL with time-limited access
     */
    async generateSASUrl(fileName, expiryHours = 8760, containerType = "certificates") {
        try {
            if (!azureConfig.accountName || !azureConfig.accountKey) {
                console.warn("⚠️ Missing Azure account credentials for SAS generation, returning basic URL");
                return this.getCertificateUrl(fileName, containerType);
            }
            // Create shared key credential
            const sharedKeyCredential = new StorageSharedKeyCredential(azureConfig.accountName, azureConfig.accountKey);
            // Set expiry time
            const expiresOn = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
            // Choose the right container
            const containerName = containerType === "templates"
                ? this.templatesContainerName
                : this.containerName;
            // Generate SAS query parameters
            const sasToken = generateBlobSASQueryParameters({
                containerName: containerName,
                blobName: fileName,
                permissions: BlobSASPermissions.parse("r"), // Read permission only
                expiresOn: expiresOn,
                startsOn: new Date(Date.now() - 5 * 60 * 1000), // Start 5 minutes ago to account for clock skew
            }, sharedKeyCredential);
            // Construct the full SAS URL
            const containerClient = this.blobServiceClient.getContainerClient(containerName);
            const blockBlobClient = containerClient.getBlockBlobClient(fileName);
            const sasUrl = `${blockBlobClient.url}?${sasToken}`;
            console.log(`✅ Generated SAS URL for ${containerType} valid for ${expiryHours} hours`);
            return sasUrl;
        }
        catch (error) {
            console.error("❌ Error generating SAS URL:", error);
            console.log("🔄 Falling back to basic URL");
            // Fallback to regular URL if SAS generation fails
            return this.getCertificateUrl(fileName, containerType);
        }
    }
    async getCertificateUrl(fileName, containerType = "certificates") {
        const containerName = containerType === "templates"
            ? this.templatesContainerName
            : this.containerName;
        const containerClient = this.blobServiceClient.getContainerClient(containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(fileName);
        return blockBlobClient.url;
    }
    /**
     * Get a secure template URL for sharing (generates SAS URL)
     * @param fileName - Name of the template file
     * @returns Secure URL for template access
     */
    async getSecureTemplateUrl(fileName) {
        return this.generateSASUrl(fileName, 8760, "templates"); // Valid for 1 year
    }
    /**
     * Get a secure certificate URL for sharing (generates SAS URL)
     * @param fileName - Name of the certificate file
     * @returns Secure URL for certificate access
     */
    async getSecureCertificateUrl(fileName) {
        return this.generateSASUrl(fileName, 8760); // Valid for 1 year
    }
}
export const azureBlobService = new AzureBlobService();
export default azureConfig;
