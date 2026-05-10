const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// multer setup
const upload = multer({ dest: path.join(__dirname, '..', 'uploads') });

// Lazy require tesseract when route is called to avoid startup overhead
router.post('/extract', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded for OCR' });
    }

    // Use tesseract.js to OCR the uploaded file
    const { createWorker } = require('tesseract.js');
    const worker = createWorker({
      logger: (m) => {
        // Optional: console.log('TESSERACT:', m);
      },
    });

    await worker.load();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');

    const { data } = await worker.recognize(file.path);
    await worker.terminate();

    const text = typeof data?.text === 'string' ? data.text.trim() : '';

    return res.status(200).json({ text });
  } catch (error) {
    console.error('OCR extract error:', error);
    return res.status(500).json({ error: error.message || String(error) });
  }
});

module.exports = router;
