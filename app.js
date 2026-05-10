const express = require("express");
const cors = require("cors");
const multer = require("multer");

const app = express();
const healthRoutes = require("./routes/health");
const elevenLabsRoutes = require("./routes/elevenlabs");
const extractRoutes = require("./routes/extract");
const jimRoutes = require("./routes/jim");

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Middleware for parsing multipart file uploads
const upload = multer({ dest: "uploads/" });

// Routes
app.get("/", (_req, res) => {
  res.status(200).json({ message: "Backend API is running" });
});

app.use("/api", healthRoutes);
app.use("/api", elevenLabsRoutes);
// OCR extract route (accepts multipart file upload)
app.use("/api", upload.single("file"), extractRoutes);
app.use("/api", upload.single("file"), jimRoutes);

module.exports = app;
