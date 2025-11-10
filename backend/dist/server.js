import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { securityHeaders, sanitizeRequestBody, sanitizeQueryParams, } from "./middleware/validation.js";
// Import routes
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import eventRoutes from "./routes/events.js";
import registrationRoutes from "./routes/registrations.js";
import registrationFormRoutes from "./routes/registrationForms.js";
import formRoutes from "./routes/forms.js"; // New forms route
import attendanceRoutes from "./routes/attendance.js";
import certificateRoutes from "./routes/certificates.js";
import templateRoutes from "./routes/templates.js";
import checkinRoutes from "./routes/checkin.js";
import emailAuthRoutes from "./routes/emailAuth.js";
import staffRoutes from "./routes/staff.js";
import paymentRoutes from "./routes/payments.js";
import mapsRoutes from "./routes/maps.js";
// Import middleware
import { errorHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;
// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 150, // Limit each IP to 100 requests per windowMs
    message: {
        error: "Too many requests from this IP, please try again later.",
    },
});
// Middleware
app.use(securityHeaders); // Enhanced security headers
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
}));
app.use(limiter);
// Raw body parsing for Stripe webhooks (must be before express.json())
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
// Input sanitization middleware
app.use(sanitizeRequestBody);
app.use(sanitizeQueryParams);
app.use(requestLogger);
// Azure-based file serving for templates and certificates
app.get("/uploads/templates/:filename", async (req, res) => {
    try {
        const { filename } = req.params;
        console.log(`📥 Serving template from Azure: ${filename}`);
        // Try to download from Azure templates container
        const { azureBlobService } = await import("./config/azure.js");
        const fileBuffer = await azureBlobService.downloadTemplate(filename);
        // Set appropriate headers
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.send(fileBuffer);
    }
    catch (error) {
        console.error(`❌ Error serving template ${req.params.filename}:`, error);
        res.status(404).json({ error: "Template not found" });
    }
});
app.get("/uploads/certificates/:filename", async (req, res) => {
    try {
        const { filename } = req.params;
        console.log(`📥 Serving certificate from Azure: ${filename}`);
        // Try to download from Azure certificates container
        const { azureBlobService } = await import("./config/azure.js");
        const fileBuffer = await azureBlobService.downloadCertificate(filename);
        // Set appropriate headers based on file extension
        // Handle compressed files by checking the original extension before .gz
        let actualFilename = filename;
        if (filename.endsWith(".gz")) {
            actualFilename = filename.substring(0, filename.length - 3);
        }
        const ext = actualFilename.toLowerCase().split(".").pop();
        const contentType = ext === "png"
            ? "image/png"
            : ext === "jpg" || ext === "jpeg"
                ? "image/jpeg"
                : ext === "pdf"
                    ? "application/pdf"
                    : "application/octet-stream";
        res.setHeader("Content-Type", contentType);
        res.setHeader("Content-Disposition", `attachment; filename="${actualFilename}"`);
        res.send(fileBuffer);
    }
    catch (error) {
        console.error(`❌ Error serving certificate ${req.params.filename}:`, error);
        res.status(404).json({ error: "Certificate not found" });
    }
});
// Fallback: Static file serving for any remaining local uploads (for backwards compatibility)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
// Health check
app.get("/api/health", (req, res) => {
    res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || "1.0.0",
    });
});
// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/registration-forms", registrationFormRoutes); // Kept for backward compatibility
app.use("/api/forms", formRoutes); // New unified forms endpoint
app.use("/api/attendance", attendanceRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/checkin", checkinRoutes);
app.use("/api/email", emailAuthRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/maps", mapsRoutes);
// 404 handler
app.use("*", (req, res) => {
    res.status(404).json({
        success: false,
        error: "Route not found",
    });
});
// Error handling middleware
app.use(errorHandler);
// Graceful shutdown
const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:5173"}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
});
process.on("SIGTERM", () => {
    console.log("SIGTERM received. Shutting down gracefully...");
    server.close(() => {
        console.log("Process terminated");
    });
});
process.on("SIGINT", () => {
    console.log("SIGINT received. Shutting down gracefully...");
    server.close(() => {
        console.log("Process terminated");
    });
});
export default app;
