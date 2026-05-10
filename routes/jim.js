const express = require("express");
const router = express.Router();
const { generateQuestionsAndStory, getQuestions, getStory } = require("../services/gemini");

// POST - Get the ppt file from the front-end
// Express creates the route and multer handles uploads
// Send the ppt file to Gemini in backend
router.post("/jim", async (req, res) => {
  try {
    const file = req.file;
    const { content, fileName, questionCount = 10, difficulty = 'hard', isPanicMode = false } = req.body;

    if (!file && !content) {
      return res.status(400).json({ error: "No file or content provided" });
    }

    // Use provided extracted content, or reject empty payloads.
    const fileContent = typeof content === "string" ? content.trim() : "";

    if (!fileContent) {
      return res.status(400).json({ error: "No valid extracted content to process" });
    }

    // Send to Gemini and generate questions/story
    const result = await generateQuestionsAndStory(
      fileContent, 
      fileName || (file && file.originalname) || "Uploaded file",
      parseInt(questionCount, 10) || 10,
      difficulty || 'hard',
      isPanicMode === true || isPanicMode === 'true'
    );

    res.status(200).json({
      message: "File processed successfully",
      contentId: result.contentId,
      questions: result.questions,
      story: result.story,
    });
  } catch (error) {
    console.error("Error processing file:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET - Get the generated questions from the backend
router.get("/questions/:contentId", (req, res) => {
  try {
    const { contentId } = req.params;
    const questions = getQuestions(contentId);
    res.status(200).json({ questions });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// GET - Get the generated story from the backend
router.get("/story/:contentId", (req, res) => {
  try {
    const { contentId } = req.params;
    const story = getStory(contentId);
    res.status(200).json({ story });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

module.exports = router;
