import * as FileSystem from 'expo-file-system/legacy';
import { useLocalSearchParams, useRouter } from 'expo-router';
import JSZip from 'jszip';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { QUIZ_CONFIG, getExtractEndpoint, getJimEndpoint } from '@/config';

interface ProcessingStep {
  step: string;
  active: boolean;
  completed: boolean;
}

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
}

export default function ProcessingScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  
  const { content: paramContent, fileName, fileUri, questionCount, difficulty, mimeType, isPanicMode } = params as { content?: string; fileName?: string; fileUri?: string; questionCount?: string; difficulty?: string; mimeType?: string; isPanicMode?: string };
  
  const [steps, setSteps] = useState<ProcessingStep[]>(
    isPanicMode === 'true' 
      ? [
          { step: 'Identifying weak areas...', active: true, completed: false },
          { step: 'Generating rapid-fire questions...', active: false, completed: false },
          { step: 'Preparing for exam...', active: false, completed: false },
        ]
      : [
          { step: 'Analysing concepts...', active: true, completed: false },
          { step: 'Generating questions...', active: false, completed: false },
          { step: 'Finding weak points...', active: false, completed: false },
        ]
  );

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'easy':
        return '#34C759';
      case 'medium':
        return '#f3aa21';
      case 'hard':
        return QUIZ_CONFIG.DIFFICULTY_COLORS.hard;
      case 'extreme':
        return QUIZ_CONFIG.DIFFICULTY_COLORS.extreme;
      default:
        return QUIZ_CONFIG.DIFFICULTY_COLORS.hard;
    }
  };

  const difficultyColor = getDifficultyColor(difficulty || 'hard');
  let runtimeContent: string = String(paramContent || '');

  const SOURCE_REFERENCE_PATTERN = /\b(?:pdf|pptx?|powerpoint|slide(?:s| deck)?|deck|document|doc(?:ument)?|file|filename|upload(?:ed|ed)?|text extraction|extraction|ocr|scanned|image text|source material|materials)\b[^\n\r]*/gi;

  const base64ToUint8Array = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);

    for (let index = 0; index < binaryString.length; index++) {
      bytes[index] = binaryString.charCodeAt(index);
    }

    return bytes;
  };

  const decodeBase64ToUtf8 = (base64: string) => {
    try {
      const bytes = base64ToUint8Array(base64);
      if (typeof TextDecoder !== 'undefined') {
        return new TextDecoder('utf-8').decode(bytes);
      }

      // Fallback for environments without TextDecoder
      let result = '';
      for (let i = 0; i < bytes.length; i++) {
        result += String.fromCharCode(bytes[i]);
      }
      return result;
    } catch (e) {
      console.warn('Processing: decodeBase64ToUtf8 failed', e);
      return '';
    }
  };

  const normalizeFilePath = (uri: string) => {
    // Remove file:// scheme if present
    if (uri.startsWith('file://')) {
      return uri.slice(7); // Remove 'file://'
    }
    return uri;
  };

  const extractPdfText = async (uri: string) => {
    try {
      console.log('Processing: PDF extraction starting for', uri);
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      console.log('Processing: PDF base64 read, length:', base64.length);

      const pdfjsLib: any = await import('pdfjs-dist/legacy/build/pdf.mjs');
      console.log('Processing: pdfjs-dist loaded, getDocument available?', typeof pdfjsLib.getDocument);

      const loadingTask = pdfjsLib.getDocument({
        data: base64ToUint8Array(base64),
        useWorkerFetch: false,
        isEvalSupported: false,
      });
      console.log('Processing: PDF loading task created');

      const pdf = await loadingTask.promise;
      console.log('Processing: PDF document loaded, pages:', pdf.numPages);

      if (!pdf.numPages || pdf.numPages === 0) {
        console.warn('Processing: PDF has no pages');
        return '';
      }

      const pageTexts: string[] = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        try {
          const page = await pdf.getPage(pageNumber);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();

          console.log('Processing: PDF page', pageNumber, 'text length:', pageText.length, 'first 200 chars:', pageText.slice(0, 200));

          if (pageText) {
            pageTexts.push(pageText);
          }
        } catch (pageError) {
          console.error('Processing: PDF page', pageNumber, 'extraction error:', String(pageError));
        }
      }

      const result = pageTexts.join('\n').trim();
      console.log('Processing: PDF extraction complete, total length:', result.length, 'pages extracted:', pageTexts.length);
      return result;
    } catch (pdfError) {
      console.error('Processing: PDF extraction failed:', String(pdfError));
      return '';
    }
  };

  const isQuotaError = (error: unknown) =>
    error instanceof Error && /429|quota|resource exhausted|rate limit/i.test(error.message);

  const normalizeDifficulty = (value: Question['difficulty']): Question['difficulty'] => {
    if (isPanicMode === 'true') {
      return value === 'easy' || value === 'medium' ? 'hard' : value;
    }

    if (difficulty === 'easy') {
      return value === 'hard' || value === 'extreme' ? 'medium' : value;
    }

    if (difficulty === 'medium') {
      return value === 'hard' || value === 'extreme' ? 'medium' : value;
    }

    if (difficulty === 'hard') {
      return value === 'extreme' ? 'hard' : value;
    }

    return value === 'hard' || value === 'extreme' ? 'medium' : value;
  };

  useEffect(() => {
    generateQuestions();
  }, []);

  const updateStep = (index: number, active: boolean, completed: boolean) => {
    setSteps((prev) => {
      const newSteps = [...prev];
      newSteps[index] = { ...newSteps[index], active, completed };
      return newSteps;
    });
  };

  const generateQuestions = async () => {
    try {
      // Diagnostic: log incoming params and sizes to help debug PDF/PPTX routing issues
      try {
        console.log('Processing: params', JSON.stringify({ fileName, mimeType, questionCount, isPanicMode, fileUri, contentLength: paramContent ? paramContent.length : 0 }));
      } catch (e) {
        /* ignore logging errors */
      }

      // If a fileUri was provided, read the file from disk and convert to the appropriate content form
      let content = paramContent || '';
      runtimeContent = content;
      if (fileUri) {
        try {
          const fileUriStr = normalizeFilePath(String(fileUri));
          console.log('Processing: fileUri provided (normalized):', fileUriStr);

          // Check if file exists before attempting to read
          const fileExists = await FileSystem.getInfoAsync(fileUriStr);
          console.log('Processing: file exists check:', fileExists.exists, 'size:', (fileExists as any).size);

          if (!fileExists.exists) {
            console.error('Processing: file does not exist at path:', fileUriStr);
            throw new Error(`File does not exist at ${fileUriStr}`);
          }

          const info = await FileSystem.getInfoAsync(fileUriStr);
          console.log('Processing: fileUri info', JSON.stringify({ fileUri: fileUriStr, size: (info as any).size || 0 }));

          if (mimeType === 'application/pdf') {
            // Extract readable text from the PDF so generation is grounded in the actual file content.
            console.log('Processing: Detected PDF file, calling extractPdfText');
            content = await extractPdfText(fileUriStr);
            console.log('Processing: extractPdfText returned, content length:', content.length);
            runtimeContent = content;
          } else if ((fileName && fileName.toLowerCase().endsWith('.pptx')) || (mimeType && mimeType.includes('presentation'))) {
            // Extract text from PPTX using JSZip
            try {
              const base64 = await FileSystem.readAsStringAsync(fileUriStr, { encoding: 'base64' });
              const binaryString = atob(base64);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              const arrayBuffer = bytes.buffer;
              const zip = new JSZip();
              await zip.loadAsync(arrayBuffer);

              // Log zip structure for debugging
              const zipKeys = Object.keys(zip.files).slice(0, 20);
              console.log('Processing: PPTX zip files (first 20):', zipKeys);

              let slidesFolder = zip.folder('ppt/slides');
              console.log('Processing: PPTX ppt/slides found?', !!slidesFolder);

              if (!slidesFolder) {
                // Try alternative paths
                slidesFolder = zip.folder('ppt\\slides');
                console.log('Processing: PPTX ppt\\slides found?', !!slidesFolder);
              }

              const snippets: string[] = [];
              if (slidesFolder) {
                const allSlideFiles = Object.keys(slidesFolder.files);
                console.log('Processing: PPTX all files in slides folder:', allSlideFiles.length, allSlideFiles.slice(0, 5));

                const slideFiles = allSlideFiles
                  .filter((file) => file.endsWith('.xml') && !file.includes('_rels') && !file.startsWith('.'))
                  .sort();

                console.log('Processing: PPTX slideFiles after filter', slideFiles.length, slideFiles.slice(0, 5));

                for (let i = 0; i < slideFiles.length; i++) {
                  const xml = await slidesFolder.file(slideFiles[i])?.async('text') || '';
                  console.log('Processing: PPTX slide', i, 'XML length:', xml.length, 'first 500 chars:', xml.slice(0, 500));
                  const textMatches = xml.match(/<a:t>([^<]+)<\/a:t>/g) || [];
                  const slideText = textMatches.map((match) => match.replace(/<a:t>|<\/a:t>/g, ''));
                  console.log('Processing: PPTX slide', i, 'text matches:', textMatches.length, 'extracted text:', slideText.join(' ').slice(0, 200));
                  snippets.push(slideText.join(' '));
                }
              } else {
                console.warn('Processing: PPTX slidesFolder not found in archive at either path');
              }
              content = snippets.join('\n');
              console.log('Processing: PPTX extraction complete, total content length:', content.length, 'snippets:', snippets.length);
              runtimeContent = content;
            } catch (pptxError) {
              console.error('Processing: PPTX extraction error:', String(pptxError));
              content = '';
            }
          } else {
            // Treat as plain text
            try {
              console.log('Processing: Reading plain text file from', fileUriStr);
              let txt = '';
              try {
                txt = await FileSystem.readAsStringAsync(fileUriStr, { encoding: FileSystem.EncodingType.UTF8 });
              } catch (readErr) {
                console.warn('Processing: readAsStringAsync UTF8 failed, will try base64 fallback', String(readErr));
                // fall through to base64 fallback below
              }

              if (!txt || !txt.trim()) {
                // Try reading as base64 and decode to UTF-8 (handles files with different encodings)
                try {
                  const base64 = await FileSystem.readAsStringAsync(fileUriStr, { encoding: 'base64' as any });
                  const decoded = decodeBase64ToUtf8(base64 || '');
                  if (decoded && decoded.trim()) {
                    txt = decoded;
                    console.log('Processing: Plain text base64 decoded successfully, length:', txt.length);
                  }
                } catch (baseErr) {
                  console.warn('Processing: base64 fallback failed', String(baseErr));
                }
              }

              if (txt && txt.trim()) {
                console.log('Processing: Plain text file read successfully, length:', txt.length, 'first 300 chars:', txt.slice(0, 300));
                content = txt;
                runtimeContent = content;
              } else {
                console.warn('Processing: Plain text read returned empty for', fileUriStr);
                content = '';
              }
            } catch (e) {
              console.error('Processing: could not read text file, error:', String(e), 'fileUri:', fileUriStr);
              content = '';
            }
          }
        } catch (e) {
          console.error('Processing: error reading fileUri', String(e), 'fileUri:', fileUri, 'mimeType:', mimeType);
        }
      } else {
        console.warn('Processing: NO fileUri provided, content will be empty. paramContent length:', paramContent ? paramContent.length : 0);
      }

      if (!content || !content.trim()) {
        // Attempt server-side OCR if a fileUri is available
        if (fileUri) {
          try {
            console.log('Processing: No text found - attempting server-side OCR');
            const fileUriStr = normalizeFilePath(String(fileUri));

            const formData: any = new FormData();
            const name = fileName || fileUriStr.split('/').pop() || 'upload';
            const type = mimeType || 'application/pdf';

            formData.append('file', {
              uri: fileUriStr,
              name,
              type,
            });

            const extractResp = await fetch(getExtractEndpoint(), {
              method: 'POST',
              body: formData,
            });

            if (extractResp.ok) {
              const json = await extractResp.json();
              if (json.text && typeof json.text === 'string' && json.text.trim().length > 0) {
                content = json.text.trim();
                runtimeContent = content;
                console.log('Processing: OCR succeeded, content length:', content.length);
              }
            } else {
              console.warn('Processing: OCR endpoint returned', extractResp.status);
            }
          } catch (ocrErr) {
            console.warn('Processing: OCR attempt failed:', String(ocrErr));
          }
        }

        if (!content || !content.trim()) {
          const errorMsg = `Unable to extract text from "${fileName}". This file may be image-based or scanned. Try:\n1. Convert your PDF/PPTX using Google Docs OCR (upload to Google Drive, open with Google Docs, download as PPTX/PDF)\n2. Use an online OCR tool like ILovePDF or Smallpdf\n3. Use plain text (.txt) with the content manually copied\n`;
          throw new Error(errorMsg);
        }
      }

      // Step 1: Analyzing
      updateStep(0, true, false);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      updateStep(0, false, true);

      // Step 2: Generating questions
      updateStep(1, true, false);

      const numQuestions = parseInt(String(questionCount || '10'), 10) || 10;
      const isPanic = isPanicMode === 'true';

      // Call backend to generate questions
        const backendResponse = await fetch(getJimEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content,
          fileName: fileName || 'Uploaded file',
          questionCount: numQuestions,
          difficulty: difficulty || 'hard',
          isPanicMode: isPanic,
        }),
      });

      if (!backendResponse.ok) {
        const errorData = await backendResponse.json();
        throw new Error(errorData.error || `Backend error: ${backendResponse.status}`);
      }

      const result = await backendResponse.json();
      const generatedQuestions = sanitizeQuestions(result.questions || []);

      if (generatedQuestions.length === 0) {
        throw new Error('AI response did not include grounded questions');
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      updateStep(1, false, true);

      // Step 3: Finding weak points
      updateStep(2, true, false);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      updateStep(2, false, true);

      // Navigate to quiz
      router.push({
        pathname: '/quiz',
        params: {
          questions: JSON.stringify(generatedQuestions),
          fileName,
          questionCount,
          difficulty,
          isPanicMode: isPanicMode ? 'true' : 'false',
        },
      });
      // Cleanup cached file if we created one in cacheDirectory
      try {
        const normalizedFileUri = fileUri ? normalizeFilePath(String(fileUri)) : '';
        const cacheDir = String(FileSystem.cacheDirectory || '');
        if (normalizedFileUri && cacheDir && normalizedFileUri.startsWith(cacheDir)) {
          await FileSystem.deleteAsync(normalizedFileUri, { idempotent: true });
          console.log('Processing: deleted cached file', normalizedFileUri);
        }
      } catch (e) {
        console.warn('Processing: failed to delete cached file', e);
      }
    } catch (error) {
      if (!isQuotaError(error)) {
        console.warn('Error generating questions, using fallback quiz:', error);
      }
      const fallbackQuestions = generateFallbackQuestions();
      router.push({
        pathname: '/quiz',
        params: {
          questions: JSON.stringify(fallbackQuestions),
          fileName,
          questionCount,
          difficulty,
          isPanicMode: isPanicMode ? 'true' : 'false',
        },
      });
      // Cleanup cached file even on fallback
      try {
        const cacheDir = String(FileSystem.cacheDirectory || '');
        if (fileUri && cacheDir && String(fileUri).startsWith(cacheDir)) {
          await FileSystem.deleteAsync(String(fileUri), { idempotent: true });
          console.log('Processing: deleted cached file (fallback)', fileUri);
        }
      } catch (e) {
        console.warn('Processing: failed to delete cached file (fallback)', e);
      }
    }
  };

  const sanitizeQuestions = (questions: Question[] | undefined) => {
    if (!Array.isArray(questions)) {
      return [];
    }

    const normalizeText = (value: string) =>
      value
        .replace(SOURCE_REFERENCE_PATTERN, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/\s+([?.!,;:])/g, '$1')
        .trim();

    return questions
      .map((question) => ({
        ...question,
        question: normalizeText(question.question),
        options: question.options.map((option) => normalizeText(option)),
        explanation: normalizeText(question.explanation),
        difficulty: normalizeDifficulty(question.difficulty),
      }))
      .filter((question) => question.question.length > 0 && question.options.length >= 2);
  };

  const getTextSnippets = () => {
    if (mimeType === 'application/pdf') {
      return [] as string[];
    }

    const source = runtimeContent || '';
    return source
      .split(/\n+/)
      .map((line: string) => line.replace(/\s+/g, ' ').trim())
      .filter((line: string) => line.length >= 35)
      .filter((line: string) => /[A-Za-z]{4,}/.test(line))
      .filter((line: string) => !/^[\W_]+$/.test(line))
      .slice(0, 12);
  };

  const getFallbackDifficulty = (index: number): Question['difficulty'] => {
    if (isPanicMode === 'true') {
      return index % 2 === 0 ? 'hard' : 'extreme';
    }

    if (difficulty === 'easy' || difficulty === 'medium' || difficulty === 'hard' || difficulty === 'extreme') {
      return difficulty;
    }

    return index % 3 === 0 ? 'hard' : index % 2 === 0 ? 'medium' : 'easy';
  };

  const getTopicKey = (name?: string, sourceText?: string) => {
    const haystack = `${name || ''} ${sourceText || ''}`.toLowerCase();

    if (haystack.includes('pso')) return 'pso';
    if (haystack.includes('minmax') || haystack.includes('minimax')) return 'minimax';
    if (haystack.includes('relational') || haystack.includes('algebra')) return 'relational-algebra';
    if (haystack.includes('sql')) return 'sql';
    if (haystack.includes('nosql')) return 'nosql';
    if (haystack.includes('jquery')) return 'jquery';
    return 'generic';
  };

  const getFallbackContentForFile = (name?: string) => {
    const file = String(name || '').toLowerCase();

    if (file.includes('comp5390') || file.includes('minimax')) {
      return 'Minimax tree, MAX and MIN nodes, leaf values, root value, terminal evaluation.';
    }

    if (file.includes('pso')) {
      return 'Particle swarm optimisation, particle position, velocity, personal best, global best, fitness.';
    }

    if (file.includes('sql')) {
      return 'SQL queries, joins, relational data, tables, rows, columns, database operations.';
    }

    if (file.includes('nosql')) {
      return 'NoSQL databases, flexible schema, scalability, document stores, key-value stores.';
    }

    if (file.includes('jquery')) {
      return 'jQuery, DOM manipulation, events, selectors, web interactions.';
    }

    return '';
  };

  const buildFileAwareFallback = (
    topicKey: string,
    panicMode: boolean,
    snippets: string[]
  ): Question[] | null => {
    const introDifficulty: Question['difficulty'] = panicMode ? 'hard' : 'medium';
    const followUpDifficulty: Question['difficulty'] = panicMode ? 'extreme' : 'hard';

    const banks: Record<string, Question[]> = {
      pso: [
        {
          id: 1,
          question: panicMode
            ? 'In PSO, what does a particle keep as its personal best?'
            : 'Which answer best describes the role of a particle\'s personal best in particle swarm optimisation?',
          options: [
            'The best position that specific particle has found so far',
            'The worst position found by the whole swarm',
            'The current random seed used by the algorithm',
            'The final answer before any iteration starts',
          ],
          correctAnswer: 'The best position that specific particle has found so far',
          explanation: panicMode
            ? 'Personal best stores the best solution seen by one particle.'
            : 'Each particle remembers its own best position so it can return toward promising areas of the search space.',
          difficulty: introDifficulty,
        },
        {
          id: 2,
          question: panicMode
            ? 'What does PSO velocity update help control?'
            : 'What is the main purpose of updating velocity in PSO?',
          options: [
            'How far and in what direction the particle moves next',
            'How many leaf nodes exist in the problem',
            'Which SQL query should be executed',
            'The number of classes in the worksheet',
          ],
          correctAnswer: 'How far and in what direction the particle moves next',
          explanation: panicMode
            ? 'Velocity drives the next movement step.'
            : 'Velocity determines the next movement step and balances exploration with exploitation.',
          difficulty: followUpDifficulty,
        },
        {
          id: 3,
          question: panicMode
            ? 'What does the global best represent?'
            : 'Which statement best defines the global best in the PSO worksheet?',
          options: [
            'The best position found by any particle in the swarm',
            'The average of all particle positions',
            'The particle with the largest velocity only',
            'The first random position generated',
          ],
          correctAnswer: 'The best position found by any particle in the swarm',
          explanation: panicMode
            ? 'Global best is the swarm-wide best solution so far.'
            : 'The global best tracks the strongest solution discovered by any particle across the entire swarm.',
          difficulty: introDifficulty,
        },
        {
        id: 4,
       
          question: panicMode
            ? 'What is the main goal of PSO?'
            : 'What is the primary objective of particle swarm optimisation?',
          options: [
            'To find an optimal solution to a problem by simulating social behavior',
            'To sort a list of numbers in ascending order',
            'To execute SQL queries more efficiently',
            'To create animations on a slide deck',
          ],
          correctAnswer: 'To find an optimal solution to a problem by simulating social behavior',
          explanation: panicMode
            ? 'PSO aims to optimise solutions through collective behavior.'
            : 'PSO is designed to find optimal or near-optimal solutions by simulating the social behavior of particles in a swarm.',
          difficulty: followUpDifficulty,
        },
        { id: 5,
        
          question: panicMode
            ? 'How do particles in PSO influence each other?'
            : 'In particle swarm optimisation, how do particles typically influence each other\'s movement?',
          options: [
            'By sharing information about their personal best and the global best positions',
            'By directly exchanging their velocity values',
            'By merging into a single particle when they get close',
            'By competing to delete each other\'s positions',
          ],
          correctAnswer: 'By sharing information about their personal best and the global best positions',
          explanation: panicMode
            ? 'Particles share their best findings to guide the swarm.'
            : 'Particles communicate by sharing their personal best and the global best positions, which influences their movement decisions.',
          difficulty: introDifficulty,
        },
        { id : 6,
          question: panicMode
            ? 'What role does randomness play in PSO?'
            : 'What is the purpose of incorporating randomness into the velocity update in PSO?',
          options: [
            'To help particles explore the search space and avoid local optima',
            'To determine the final answer before any iterations',
            'To randomly delete half of the particles each iteration',
            'To shuffle the order of questions in the quiz',
          ],
          correctAnswer: 'To help particles explore the search space and avoid local optima',
          explanation: panicMode
            ? 'Randomness encourages exploration and prevents premature convergence.'
            : 'Randomness in velocity updates allows particles to explore new areas of the search space, helping to avoid getting stuck in local optima.',
          difficulty: followUpDifficulty,
        },
        { id: 7,
          question: panicMode
            ? 'What is a common stopping criterion for PSO?'
            : 'Which of the following is a common stopping criterion for particle swarm optimization?',
          options: [
            'A maximum number of iterations or a satisfactory fitness level',
            'When all particles converge to the same position',
            'After exactly 10 iterations regardless of progress',
            'When the global best has not improved for 5 iterations',
          ],
          correctAnswer: 'A maximum number of iterations or a satisfactory fitness level',
          explanation: panicMode
            ? 'PSO typically stops after a set number of iterations or when a good solution is found.'
            : 'Common stopping criteria for PSO include reaching a maximum number of iterations or achieving a satisfactory fitness level.',
          difficulty: introDifficulty,
        },
        { id: 8,
          question: panicMode
            ? 'Which of these is NOT a typical application of PSO?'
            : 'Which of the following is generally NOT an application of particle swarm optimization?',
          options: [
            'Sorting a list of numbers',
            'Optimizing hyperparameters in machine learning',
            'Solving complex engineering design problems',
            'Finding optimal routes in logistics',
          ],
          correctAnswer: 'Sorting a list of numbers',
          explanation: panicMode
            ? 'PSO is not designed for simple sorting tasks.'
            : 'While PSO is used for optimization problems, it is not typically applied to simple sorting tasks, which are better handled by specific sorting algorithms.',
          difficulty: followUpDifficulty,
        },
        { id: 9,
          question: panicMode
            ? 'How does PSO differ from genetic algorithms?'
            : 'Which statement best describes a key difference between particle swarm optimization and genetic algorithms?',
          options: [
            'PSO simulates social behavior of particles, while genetic algorithms simulate natural selection and genetics',
            'PSO uses crossover and mutation operators, while genetic algorithms do not',
            'Genetic algorithms require a population of solutions, while PSO does not',
            'PSO is only used for continuous optimization, while genetic algorithms are only for discrete problems',
      ],
          correctAnswer: 'PSO simulates social behavior of particles, while genetic algorithms simulate natural selection and genetics',
          explanation: panicMode
            ? 'PSO is based on social behavior, while genetic algorithms are based on evolutionary principles.'
            : 'PSO simulates the social behavior of particles in a swarm, while genetic algorithms are inspired by the process of natural selection and genetics.',
          difficulty: introDifficulty,
        },
        {
          id: 10,
          question: panicMode
            ? 'What is the "fitness" of a particle in PSO?'
            : 'In particle swarm optimization, what does the "fitness" of a particle represent?',
          options: [
            'A measure of how good the particle\'s current position is with respect to the optimization objective',
            'The speed at which the particle is moving',
            'The number of iterations since the particle last updated its personal best',
            'The distance between the particle and the global best',
          ],
          correctAnswer: 'A measure of how good the particle\'s current position is with respect to the optimization objective',
          explanation: panicMode
            ? 'Fitness evaluates how well a solution meets the optimization goal.'
            : 'The fitness of a particle indicates how well its current position solves the optimization problem, guiding its movement toward better solutions.',
          difficulty: followUpDifficulty,
        }
      ],
      minimax: [
        {
          id: 1,
          question: panicMode
            ? 'At a MAX node, what value is chosen?'
            : 'In the minimax tree, what does a MAX node do when evaluating its children?',
          options: [
            'Selects the highest child value',
            'Selects the lowest child value',
            'Deletes all leaf nodes',
            'Averages the child values',
          ],
          correctAnswer: 'Selects the highest child value',
          explanation: panicMode
            ? 'MAX keeps the best available score.'
            : 'MAX nodes choose the highest value among their children to represent the best outcome for the maximizing player.',
          difficulty: introDifficulty,
        },
        {
          id: 2,
          question: panicMode
            ? 'What is stored at the leaf nodes?'
            : 'What do the leaf nodes represent in the minimax template?',
          options: [
            'Terminal evaluation values',
            'A list of SQL tables',
            'Random velocity values',
            'The number of iterations left',
          ],
          correctAnswer: 'Terminal evaluation values',
          explanation: panicMode
            ? 'Leaf nodes hold the final scores used by minimax.'
            : 'The leaf nodes contain the terminal values that are propagated upward through MAX and MIN levels.',
          difficulty: followUpDifficulty,
        },
        {
          id: 3,
          question: panicMode
            ? 'What does the root A return after minimax runs?'
            : 'What does the root node A represent after the minimax calculation is complete?',
          options: [
            'The final minimax value for the tree',
            'A blank placeholder that is ignored',
            'The middle child value only',
            'The total number of nodes in the tree',
          ],
          correctAnswer: 'The final minimax value for the tree',
          explanation: panicMode
            ? 'The root stores the propagated game value.'
            : 'The root node ends up with the final minimax value after values are propagated from the leaves.',
          difficulty: introDifficulty,
        },
      ],
      sql: [
        {
          id: 1,
          question: panicMode
            ? 'What does SQL primarily do?'
            : 'Which answer best describes the purpose of SQL in a database course?',
          options: [
            'Query and manage relational data',
            'Draw pixel art on a slide',
            'Compile Python into machine code',
            'Replace file uploads with audio',
          ],
          correctAnswer: 'Query and manage relational data',
          explanation: panicMode
            ? 'SQL is the language for relational databases.'
            : 'SQL is used to query, insert, update, and manage data in relational databases.',
          difficulty: introDifficulty,
        },
        {
          id: 2,
          question: panicMode
            ? 'What does a JOIN combine?'
            : 'What is the main idea behind a SQL JOIN?',
          options: [
            'Rows from related tables based on matching values',
            'Two unrelated PDFs into one slide',
            'A particle and its velocity vector',
            'The maximum and minimum leaf nodes',
          ],
          correctAnswer: 'Rows from related tables based on matching values',
          explanation: panicMode
            ? 'JOIN connects tables through shared keys.'
            : 'A JOIN combines rows from related tables using matching key columns.',
          difficulty: followUpDifficulty,
        },
      ],
      'relational-algebra': [
        {
          id: 1,
          question: panicMode
            ? 'What does selection usually do?'
            : 'In relational algebra, what does selection filter?',
          options: [
            'Rows that satisfy a condition',
            'The entire database engine',
            'Slide animations only',
            'The swarm velocity values',
          ],
          correctAnswer: 'Rows that satisfy a condition',
          explanation: panicMode
            ? 'Selection keeps matching tuples only.'
            : 'Selection returns the rows that satisfy the given predicate or condition.',
          difficulty: introDifficulty,
        },
        {
          id: 2,
          question: panicMode
            ? 'What does projection keep?'
            : 'What is the purpose of projection in relational algebra?',
          options: [
            'Chosen columns or attributes',
            'Only the leaf nodes',
            'Only the current file name',
            'The best particle velocity',
          ],
          correctAnswer: 'Chosen columns or attributes',
          explanation: panicMode
            ? 'Projection keeps the attributes you want.'
            : 'Projection returns only the selected columns from a relation.',
          difficulty: followUpDifficulty,
        },
      ],
      nosql: [
        {
          id: 1,
          question: panicMode
            ? 'What is a common strength of NoSQL databases?'
            : 'Which answer best reflects a common advantage of NoSQL databases?',
          options: [
            'Flexible schema and scalability',
            'Always requiring one fixed table shape',
            'Only working for tree algorithms',
            'Being limited to one slide per file',
          ],
          correctAnswer: 'Flexible schema and scalability',
          explanation: panicMode
            ? 'NoSQL is often chosen for flexible and scalable storage.'
            : 'NoSQL systems are often used when flexible schema design and horizontal scaling matter.',
          difficulty: introDifficulty,
        },
      ],
      jquery: [
  {
    id: 1,
    question: panicMode
      ? 'What is jQuery mainly used for?'
      : 'What is the main purpose of jQuery in a web project?',
    options: [
      'Simplifying DOM manipulation and event handling',
      'Training particle swarms',
      'Replacing PDF extraction',
      'Running minimax search',
    ],
    correctAnswer: 'Simplifying DOM manipulation and event handling',
    explanation: panicMode
      ? 'jQuery helps developers manipulate web pages and handle events quickly.'
      : 'jQuery simplifies DOM manipulation, animations, AJAX calls, and event handling in web applications.',
    difficulty: introDifficulty,
  },
  {
    id: 2,
    question: panicMode
      ? 'What does a jQuery selector do?'
      : 'In jQuery, what is the purpose of a selector?',
    options: [
      'To select and manipulate specific HTML elements',
      'To choose which PDF to extract',
      'To determine the best particle velocity',
      'To select the minimax leaf nodes',
    ],
    correctAnswer: 'To select and manipulate specific HTML elements',
    explanation: panicMode
      ? 'Selectors target specific elements for manipulation.'
      : 'jQuery selectors are used to find and select HTML elements based on their id, class, type, attributes, and more for further manipulation.',
    difficulty: followUpDifficulty,
  },
  {
    id: 3,
    question: panicMode
      ? 'What is a common use of jQuery events?'
      : 'Which of the following is a common use case for jQuery event handling?',
    options: [
      'Responding to user interactions like clicks and form submissions',
      'Extracting text from PDFs',
      'Running server-side OCR',
      'Calculating minimax values',
    ],
    correctAnswer: 'Responding to user interactions like clicks and form submissions',
    explanation: panicMode
      ? 'jQuery events allow developers to respond to user actions on the web page.'
      : 'jQuery provides an easy way to attach event handlers to elements, allowing developers to create interactive web pages that respond to user actions such as clicks, hovers, and form submissions.',
    difficulty: followUpDifficulty,
  },
  {
    id: 4,
    question: panicMode
      ? 'How does jQuery simplify AJAX calls?'
      : 'In what way does jQuery make AJAX calls easier for developers?',
    options: [
      'By providing a simple syntax and handling cross-browser issues',
      'By replacing the need for any JavaScript code',
      'By automatically generating quiz questions',
      'By optimizing PDF text extraction',
    ],
    correctAnswer: 'By providing a simple syntax and handling cross-browser issues',
    explanation: panicMode
      ? 'jQuery\'s AJAX methods abstract away complexities and inconsistencies across browsers.'
      : 'jQuery offers methods like $.ajax(), $.get(), and $.post() that provide a simple interface for making asynchronous HTTP requests, while also managing cross-browser compatibility issues.',
    difficulty: followUpDifficulty, 
  },
  {
  id: 5,
  question: panicMode
    ? 'What is a common criticism of jQuery in modern web development?'
    : 'Which of the following is a common criticism of using jQuery in modern web development?',
  options: [
    'It can add unnecessary overhead when native JavaScript can achieve the same results',
    'It is the only way to manipulate the DOM',
    'It is required for all PDF text extraction',
    'It is necessary for running minimax algorithms',
  ],
  correctAnswer: 'It can add unnecessary overhead when native JavaScript can achieve the same results',
  explanation: panicMode
    ? 'Some developers criticize jQuery for adding extra weight to projects when modern JavaScript can often do the same things more efficiently.'
    : 'With advancements in native JavaScript and browser APIs, some developers feel that jQuery can be an unnecessary dependency that adds extra weight to web projects, especially if only a few of its features are used.',
  difficulty: followUpDifficulty,
},

],
    };

    return banks[topicKey] || banks.generic;
  };

  const generateFallbackQuestions = () => {
    const numQuestions = parseInt(String(questionCount || '10'), 10) || 10;
    const snippets = getTextSnippets();
    const topicKey = getTopicKey(fileName, runtimeContent);
    const fileAwareQuestions = buildFileAwareFallback(topicKey, isPanicMode === 'true', snippets);

    if (fileAwareQuestions && fileAwareQuestions.length > 0) {
      return fileAwareQuestions;
    }

    if (snippets.length === 0) {
      const baseExplanation =
        'Good quiz questions should measure understanding of the main idea, method, or theory rather than formatting or presentation details.';

      const ocrNote =
        mimeType === 'application/pdf'
          ? ' Note: The selected PDF appears to be scanned or image-only so text extraction returned no readable text. To get source-based questions, run OCR (e.g., Tesseract or a commercial OCR service) to extract text before generating questions.'
          : '';

      return [
        {
          id: 1,
          question: 'Which answer best reflects a core idea, method, or theory that deserves review before moving on?',
          options: [
            'The option that best explains the central concept in academic terms',
            'A random detail that does not affect understanding',
            'A formatting cue rather than a subject-matter idea',
            'A choice that ignores the learning objective entirely',
          ],
          correctAnswer: 'The option that best explains the central concept in academic terms',
          explanation: baseExplanation + ocrNote,
          difficulty: getFallbackDifficulty(0),
        },
      ];
    }

    const questions: Question[] = [];
    
    for (let i = 1; i <= numQuestions; i++) {
      const snippet = snippets[(i - 1) % snippets.length];
      const distractors = snippets
        .filter((candidate: string) => candidate !== snippet)
        .slice(0, 3);
      const options = [
        snippet,
        distractors[0] || 'A related but less accurate concept',
        distractors[1] || 'A partially correct application of the idea',
        distractors[2] || 'A broader topic that is not the best fit',
      ];

      questions.push({
        id: i,
        question: 'Which option best represents the concept or idea being tested?',
        options,
        correctAnswer: snippet,
        explanation: `This answer best matches the concept being tested: "${snippet}"`,
        difficulty: getFallbackDifficulty(i - 1),
      });
    }
    
    return questions;
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ThemedText style={styles.subtitle}>{fileName}</ThemedText>

        <View style={styles.stepsContainer}>
          {steps.map((item, index) => (
            <View key={index} style={styles.stepItem}>
              <View style={[styles.stepIconContainer, { borderColor: difficultyColor, borderWidth: item.active ? 2 : 0 }]}>
                {item.completed ? (
                  <ThemedText style={[styles.stepIcon, { color: difficultyColor }]}>✓</ThemedText>
                ) : item.active ? (
                  <ActivityIndicator size="small" color={difficultyColor} />
                ) : (
                  <ThemedText style={styles.stepIconInactive}>○</ThemedText>
                )}
              </View>
              <ThemedText
                style={[
                  styles.stepText,
                  item.active && [styles.stepTextActive, { color: difficultyColor }],
                  item.completed && [styles.stepTextCompleted, { color: difficultyColor }],
                ]}
              >
                {item.step}
              </ThemedText>
            </View>
          ))}
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: 'tt_interphases_pro_extrabold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'tt_interphases_pro_regular',
    marginBottom: 48,
    textAlign: 'center',
  },
  stepsContainer: {
    width: '100%',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  stepIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepIcon: {
    fontSize: 20,
    color: '#34C759',
    fontFamily: 'tt_interphases_pro_extrabold',
  },
  stepIconInactive: {
    fontSize: 20,
    color: '#ccc',
    fontFamily: 'tt_interphases_pro_regular',
  },
  stepText: {
    fontSize: 16,
    color: '#ccc',
    fontFamily: 'tt_interphases_pro_regular',
  },
  stepTextActive: {
    color: '#007AFF',
    fontFamily: 'tt_interphases_pro_extrabold',
  },
  stepTextCompleted: {
    color: '#34C759',
    fontFamily: 'tt_interphases_pro_extrabold',
  },
});
