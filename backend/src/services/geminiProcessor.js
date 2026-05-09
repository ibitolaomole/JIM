const { GoogleGenerativeAI } = require("@google/generative-ai");
const env = require("../config/env");
const fs = require("fs");

const genAI = new GoogleGenerativeAI(env.geminiApiKey);

/**
 * Process a PPT file with Gemini and generate questions
 * @param {Buffer} fileBuffer - The PPT file as a buffer
 * @param {string} fileName - Original file name
 * @returns {Promise<Object>} Generated questions and metadata
 */
async function processPPTWithGemini(fileBuffer, fileName) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Convert buffer to base64
    const base64Data = fileBuffer.toString("base64");

    // Determine mime type based on file extension
    let mimeType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    if (fileName.endsWith(".ppt")) {
      mimeType = "application/vnd.ms-powerpoint";
    }

    const prompt = `You are an educational content expert. Analyze this PowerPoint presentation and generate:
1. A list of 5-10 multiple choice questions based on the content
2. Each question should have 4 options (A, B, C, D)
3. Include the correct answer for each question
4. Generate questions that test understanding, not just recall

Return the response as a JSON object with this structure:
{
  "questions": [
    {
      "id": 1,
      "question": "Question text",
      "options": {
        "A": "Option A",
        "B": "Option B",
        "C": "Option C",
        "D": "Option D"
      },
      "correct_answer": "A",
      "explanation": "Why this is correct"
    }
  ]
}`;

    const response = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      },
      prompt,
    ]);

    const responseText = response.response.text();
    
    // Extract JSON from response (in case there's extra text)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const generatedQuestions = jsonMatch
      ? JSON.parse(jsonMatch[0])
      : { questions: [] };

    return {
      success: true,
      fileName: fileName,
      generatedQuestions: generatedQuestions,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error processing PPT with Gemini:", error);
    return {
      success: false,
      error: error.message,
      fileName: fileName,
    };
  }
}

module.exports = {
  processPPTWithGemini,
};
