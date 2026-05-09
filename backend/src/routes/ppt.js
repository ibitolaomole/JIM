const express = require("express");
const multer = require("multer");
const { processPPTWithGemini } = require("../services/geminiProcessor");

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(), // Store in memory for processing
  fileFilter: (req, file, cb) => {
    // Only accept PowerPoint files
    const allowedMimes = [
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.ms-powerpoint",
    ];
    const allowedExtensions = [".pptx", ".ppt"];

    const hasValidMime = allowedMimes.includes(file.mimetype);
    const hasValidExt = allowedExtensions.some((ext) =>
      file.originalname.toLowerCase().endsWith(ext)
    );

    if (hasValidMime || hasValidExt) {
      cb(null, true);
    } else {
      cb(new Error("Only PowerPoint files (.ppt, .pptx) are allowed"));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

/**
 * POST /api/ppt/upload
 * Upload a PowerPoint file and generate questions using Gemini AI
 */
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // Process the file with Gemini
    const result = await processPPTWithGemini(
      req.file.buffer,
      req.file.originalname
    );

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json({
        success: false,
        message: "Error processing PPT file",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Error in PPT upload endpoint:", error);
    res.status(500).json({
      success: false,
      message: "Server error processing file",
      error: error.message,
    });
  }
});

module.exports = router;
