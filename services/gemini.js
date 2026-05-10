const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY
);

// Store for generated content (in production, use a database)
const generatedContent = {};

const SOURCE_REFERENCE_PATTERN = /\b(?:pdf|pptx?|powerpoint|slide(?:s| deck)?|deck|document|doc(?:ument)?|file|filename|upload(?:ed|ed)?|text extraction|extraction|ocr|scanned|image text|source material|materials)\b[^\n\r]*/gi;

function sanitizeGeneratedText(text) {
  if (typeof text !== "string") {
    return text;
  }

  return text
    .replace(SOURCE_REFERENCE_PATTERN, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([?.!,;:])/g, "$1")
    .trim();
}

function sanitizeQuestionEntry(question, { difficulty, isPanicMode } = {}) {
  if (!question || typeof question !== "object") {
    return question;
  }

  const cleanedQuestion = { ...question };

  cleanedQuestion.question = sanitizeGeneratedText(cleanedQuestion.question);
  cleanedQuestion.options = Array.isArray(cleanedQuestion.options)
    ? cleanedQuestion.options.map((option) => sanitizeGeneratedText(option))
    : cleanedQuestion.options;
  cleanedQuestion.explanation = sanitizeGeneratedText(cleanedQuestion.explanation);

  const allowedDifficulty = new Set(["easy", "medium", "hard", "extreme"]);
  const selectedDifficulty = allowedDifficulty.has(difficulty) ? difficulty : "hard";

  if (isPanicMode) {
    if (!allowedDifficulty.has(cleanedQuestion.difficulty)) {
      cleanedQuestion.difficulty = selectedDifficulty;
    }
  } else if (cleanedQuestion.difficulty === "extreme") {
    cleanedQuestion.difficulty = selectedDifficulty === "easy" || selectedDifficulty === "medium" ? "medium" : "hard";
  } else if (!allowedDifficulty.has(cleanedQuestion.difficulty)) {
    cleanedQuestion.difficulty = selectedDifficulty === "easy" || selectedDifficulty === "medium" ? selectedDifficulty : "hard";
  }

  return cleanedQuestion;
}

function sanitizeQuestionSet(questions, context = {}) {
  return Array.isArray(questions)
    ? questions.map((question) => sanitizeQuestionEntry(question, context))
    : questions;
}

function cleanGeminiJsonText(text) {
  if (typeof text !== "string") {
    return text;
  }

  const withoutFences = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const firstArrayIndex = withoutFences.indexOf("[");
  const lastArrayIndex = withoutFences.lastIndexOf("]");

  if (firstArrayIndex !== -1 && lastArrayIndex !== -1 && lastArrayIndex > firstArrayIndex) {
    return withoutFences.slice(firstArrayIndex, lastArrayIndex + 1);
  }

  const firstObjectIndex = withoutFences.indexOf("{");
  const lastObjectIndex = withoutFences.lastIndexOf("}");

  if (firstObjectIndex !== -1 && lastObjectIndex !== -1 && lastObjectIndex > firstObjectIndex) {
    return withoutFences.slice(firstObjectIndex, lastObjectIndex + 1);
  }

  return withoutFences;
}

function parseGeminiJsonResponse(text) {
  const cleaned = cleanGeminiJsonText(text);
  return JSON.parse(cleaned);
}

function buildStructuredContent(fileContent, fileName) {
  return `SOURCE NAME: ${fileName || "Unknown"}
SOURCE TEXT:
${fileContent}

Use the source text above as the only basis for the task.`;
}

function buildConceptExtractionPrompt(fileContent, fileName) {
  return `You are an expert computer science educator.
Your task is to extract the key concepts, learning objectives, and testable ideas from the material.

STRICT RULES:
- Ground every concept in the provided content.
- Keep concepts factual and specific to what is actually stated in the source.
- Do not mention documents, slides, PDFs, uploads, OCR, formatting, or source material.
- Do not write questions yet.
- Do not summarize generically; extract concrete testable concepts.
- Keep the output concise and factual.

Return ONLY valid JSON in this format:
{
  "concepts": [
    {
      "concept": "...",
      "supportingFacts": ["...", "..."],
      "commonMistake": "..."
    }
  ]
}

Content from "${fileName || "Unknown"}":
${buildStructuredContent(fileContent, fileName)}`;
}

function buildQuestionGenerationPrompt(concepts, fileName) {
  return `You are an expert computer science educator.
Your task is to generate 10 multiple-choice questions that test understanding of the extracted concepts.

STRICT RULES:
- Every question must be derived from a specific extracted concept.
- Every correct answer must be a factual statement directly supported by the source content.
- The correct answer must reflect what is explicitly shown or stated in the pptx, pdf, or txt content.
- Do not infer beyond the source material.
- If the source does not support a question with a factual answer, do not generate that question.
- Do not ask meta questions like "which statement is supported by the material".
- Do not refer to documents, slides, PDFs, uploads, OCR, formatting, or source material.
- Do not ask recognition or lookup questions.
- Prefer how, why, what happens if, compare, apply, and scenario-based questions.
- Keep distractors plausible but clearly wrong based on the source content.
- Place the factual correct answer in one of the four options.
- Set "correctAnswer" to the exact text of that correct option, not a letter like A, B, C, or D.
- Do not make "correctAnswer" a label or index; it must exactly match one option string.
- Return only questions that can be answered from the concepts below and verified against the source.

EXTRACTED CONCEPTS:
${JSON.stringify(concepts, null, 2)}

Return ONLY valid JSON in this format:
[
  {
    "question": "...",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": "The exact text of the correct option"
  }
]

Content from "${fileName || "Unknown"}".`;
}

async function generateQuestionsAndStory(fileContent, fileName, questionCount = 10, difficulty = 'hard', isPanicMode = false) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    let questions;

    if (isPanicMode) {
      // Use panic mode generation for adaptive difficulty
      questions = await generatePanicModeQuestions(fileContent, fileName, questionCount);
    } else {
      // Generate questions based on difficulty level
      const difficultyBand =
        difficulty === 'easy'
          ? 'Generate EASY and MEDIUM questions only. Do not generate HARD or EXTREME questions.'
          : difficulty === 'medium'
            ? 'Generate MEDIUM questions only. Do not generate HARD or EXTREME questions.'
            : difficulty === 'hard'
              ? 'Generate HARD questions only. Do not generate EXTREME questions. EXTREME is reserved for panic mode.'
              : 'Generate questions that match the selected learning mode. Do not generate EXTREME questions unless panic mode is enabled.';

      const prompt = `You are an expert educator creating progressive learning questions. Generate EXACTLY ${questionCount} questions that assess understanding of academic concepts, theories, methods, and learning objectives.

DIFFICULTY MAPPING:
- EASY: Fundamental concepts, direct recall with light reasoning
- MEDIUM: Core concepts with application, requires connecting ideas
- HARD: Application, analysis, requires deep understanding
- EXTREME: Synthesis, edge cases, expert-level thinking

QUESTION DESIGN:
1. Vary formats: "What is...", "Which statement...", "How would...", "According to..."
2. All options must be conceptually related to the subject matter - no generic fillers
3. Mix: 25% definition, 40% application, 35% analysis
4. Distractors are realistic misconceptions, not obvious
5. Natural language - sounds like actual learning material
6. Explanations teach why, not just confirm correct answer
7. ${difficultyBand}

CONTENT GROUNDING RULES:
- Every question must cite or directly use a named concept, theory, method, process, definition, event, person, or example that appears in the subject matter.
- Do NOT ask about formatting artifacts, repeated newline characters, structure, punctuation, whitespace, the existence/absence of text, or which statements appear in the material.
- Do NOT write generic questions such as "What is the main concept discussed?" or "Analyzing the provided content...".
- Do NOT invent facts. If the material is too short, generate fewer high-quality grounded questions rather than generic questions.

Generate in JSON format with "questions" array:
{
  "questions": [
    {
      "id": 1,
      "question": "Which of the following accurately represents [concept]?",
      "options": ["Common misconception", "Partially correct", "Correct and complete", "Related but incorrect"],
      "correctAnswer": "Correct and complete",
      "explanation": "The correct answer reflects [concept]. This is because [specific reasoning].",
      "difficulty": "${difficulty}"
    }
  ]
}

PROVIDED CONTENT:
---START---
${fileContent}
---END---

Return ONLY valid JSON, no additional text.`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      questions = sanitizeQuestionSet(parseGeminiJsonResponse(responseText), {
        difficulty,
        isPanicMode,
      });
    }

    // Generate story/summary
    const storyPrompt = `Create an engaging educational story or narrative that summarizes the key concepts from the content below. Make it interesting and easy to remember.
  Do not mention files, filenames, slides, decks, uploads, PDFs, PPTX, OCR, text extraction, document processing, or the existence of the source material.

Content:
${fileContent}`;

    const storyResult = await model.generateContent(storyPrompt);
    const story = storyResult.response.text();

    // Generate a unique ID for this content
    const contentId = Date.now().toString();
    generatedContent[contentId] = {
      questions,
      story,
      fileName,
      difficulty,
      isPanicMode,
      createdAt: new Date(),
    };

    return {
      contentId,
      questions,
      story,
    };
  } catch (error) {
    console.error("Error generating content with Gemini:", error);
    throw new Error(`Failed to generate questions and story: ${error.message}`);
  }
}

function getQuestions(contentId) {
  if (generatedContent[contentId]) {
    return generatedContent[contentId].questions;
  }
  throw new Error("Content not found");
}

function getStory(contentId) {
  if (generatedContent[contentId]) {
    return generatedContent[contentId].story;
  }
  throw new Error("Content not found");
}

async function generatePanicModeQuestions(fileContent, fileName, questionCount = 20) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Generate rapid-fire questions focusing on weak areas and repeated topics
      const panicPrompt = `You are an exam prep expert. Generate ${questionCount} rapid-fire multiple-choice questions that:
  1. Focus on the most important academic concepts, theories, methods, and learning objectives
  2. Include repeated or emphasized subject-matter ideas when relevant
  3. Target likely exam material and real understanding, not wording lookup
  4. Are progressively challenging
  5. Cover areas that students typically struggle with
  6. Do not mention files, filenames, slides, decks, uploads, PDFs, PPTX, OCR, text extraction, document processing, templates, TODO comments, code scaffolding, or the existence of the source material in any question, option, or explanation
  7. Do not ask which statements appear in the material, which option matches the material, or similar document-comparison questions
  8. Write the questions so they stand alone as normal educational quiz questions
  9. Make the correct answer a factual statement explicitly supported by the source content
  10. Do not generate a question unless the correct answer can be verified from the pptx, pdf, or txt content
  11. Set "correctAnswer" to the exact text of the correct option, not a letter like A, B, C, or D

Content from "${fileName}":
${buildStructuredContent(fileContent, fileName)}

Return ONLY valid JSON in this format:
[
  {
    "question": "...",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": "The exact text of the correct option",
    "explanation": "Brief explanation of why this matters for the exam"
  }
]`;

    const result = await model.generateContent(panicPrompt);
    const questionsText = result.response.text();
    const questions = sanitizeQuestionSet(parseGeminiJsonResponse(questionsText));

    const contentId = Date.now().toString();
    generatedContent[contentId] = {
      questions,
      fileName,
      isPanicMode: true,
      createdAt: new Date(),
    };

    return {
      contentId,
      questions,
      isPanicMode: true,
    };
  } catch (error) {
    console.error("Error generating panic mode questions:", error);
    throw new Error(`Failed to generate panic mode questions: ${error.message}`);
  }
}

/**
 * Generates story continuation based on quiz performance
 * @param {string} storyDirection - "Positive" or "Negative" direction for story continuation
 * @param {string} currentStory - The current story text content
 * @returns {Promise<string>} - The updated story with continuation
 */
async function textCreator(storyDirection, currentStory) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    let prompt = "";
    if (storyDirection === "Positive") {
      prompt =
        "Read the following story and continue it with one paragraph that insinuates a good start to the next part. Make it engaging and coherent with the existing narrative.";
    } else {
      prompt =
        "Read the following story and continue it with one paragraph that insinuates a bad or challenging start to the next part. Make it engaging and coherent with the existing narrative.";
    }

    const fullPrompt = `${prompt}\n\nCurrent Story:\n${currentStory}`;

    const response = await model.generateContent(fullPrompt);
    const continuedText = response.response.text();

    return continuedText;
  } catch (error) {
    console.error("Error generating story continuation:", error);
    throw new Error(
      `Failed to generate story continuation: ${error.message}`
    );
  }
}

module.exports = {
  generateQuestionsAndStory,
  generatePanicModeQuestions,
  getQuestions,
  getStory,
  textCreator,
  generatedContent,
};
