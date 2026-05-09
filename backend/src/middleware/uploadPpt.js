const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadDir = path.resolve(__dirname, "../../data/ppt");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, "_");
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowedMimes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ];
  const allowedExtensions = [".pdf", ".pptx"];

  const ext = path.extname(file.originalname).toLowerCase();
  const isAllowed = allowedMimes.includes(file.mimetype) || allowedExtensions.includes(ext);

  if (!isAllowed) {
    return cb(new Error("Only .pptx and .pdf files are allowed"));
  }

  return cb(null, true);
};

const uploadPpt = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

module.exports = {
  uploadPpt,
  uploadDir,
};
