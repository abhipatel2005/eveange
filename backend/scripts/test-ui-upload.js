const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

// Simulate the certificate controller uploadTemplate endpoint
const app = express();

// Configure multer for template uploads (same as certificate controller)
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadPath = path.join(process.cwd(), "uploads", "templates");
        await fs.mkdir(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(
            null,
            file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
        );
    },
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = [".pptx", ".png", ".jpg", ".jpeg"];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(
                new Error(
                    "Only PowerPoint (.pptx) and image files (.png, .jpg, .jpeg) are allowed"
                )
            );
        }
    },
});

app.use(express.json());

// Test endpoint to simulate template upload
app.post('/test-upload', upload.single('template'), async (req, res) => {
    try {
        console.log('📋 Testing Template Upload Process...');
        console.log('File uploaded to:', req.file.path);
        console.log('Original filename:', req.file.originalname);
        console.log('File size:', req.file.size, 'bytes');

        // Check if file was actually uploaded to local uploads folder
        const localPath = req.file.path;
        const stats = await fs.stat(localPath);

        if (stats.size > 0) {
            console.log('❌ ISSUE DETECTED: File was uploaded to local uploads folder!');
            console.log('   Local path:', localPath);
            console.log('   File size:', stats.size, 'bytes');
            console.log('   This indicates the UI is still using local storage');
        } else {
            console.log('✅ File upload to local folder seems minimal');
        }

        // Clean up the test file
        await fs.unlink(localPath);
        console.log('🗑️ Cleaned up test file');

        res.json({
            success: true,
            message: 'Test upload completed',
            uploadedTo: 'local',
            path: localPath,
            size: stats.size
        });

    } catch (error) {
        console.error('❌ Test upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = 3333;
app.listen(PORT, () => {
    console.log(`🧪 Test server running on port ${PORT}`);
    console.log(`Test upload with: curl -X POST -F "template=@test-file.pptx" http://localhost:${PORT}/test-upload`);
});