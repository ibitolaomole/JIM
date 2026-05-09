const express = require("express");
const path = require("path");
const { uploadPpt, uploadDir } = require("../middleware/uploadPpt");

const router = express.Router();

router.post("/upload", uploadPpt.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded. Send file in form-data field named 'file'.",
    });
  }

  return res.status(201).json({
    success: true,
    message: "File uploaded successfully",
    file: {
      originalName: req.file.originalname,
      savedAs: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      storedIn: uploadDir,
      relativePath: path.posix.join("data", "ppt", req.file.filename),
    },
  });
});

router.use((err, _req, res, _next) => {
  return res.status(400).json({
    success: false,
    message: err.message || "Upload failed",
  });
});

module.exports = router;
