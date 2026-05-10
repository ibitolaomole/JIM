const express = require("express");
const router = express.Router();

const { fetchVoices, generateSpeech, getDefaultVoiceId } = require("../services/elevenlabs");

router.get("/elevenlabs/health", async (_req, res) => {
  try {
    const result = await fetchVoices();
    res.status(200).json({
      status: result.working ? "OK" : "NOT_CONFIGURED",
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      working: false,
      configured: true,
      message: error.message,
    });
  }
});

router.get("/elevenlabs/voices", async (_req, res) => {
  try {
    const result = await fetchVoices();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

router.post("/elevenlabs/tts", async (req, res) => {
  try {
    const { text, voiceId, modelId, outputFormat } = req.body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Missing text" });
    }

    const audioBuffer = await generateSpeech({
      text: text.trim(),
      voiceId: voiceId || getDefaultVoiceId(),
      modelId,
      outputFormat,
    });

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", "inline; filename=elevenlabs-speech.mp3");
    res.status(200).send(audioBuffer);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

module.exports = router;