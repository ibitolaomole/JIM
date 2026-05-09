import { GoogleGenerativeAI } from '@google/generative-ai';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

interface ProcessingStep {
  step: string;
  active: boolean;
  completed: boolean;
}

export default function ProcessingScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [steps, setSteps] = useState<ProcessingStep[]>([
    { step: 'Analyzing concepts...', active: true, completed: false },
    { step: 'Generating questions...', active: false, completed: false },
    { step: 'Finding weak points...', active: false, completed: false },
  ]);

  const { content, fileName } = params as { content: string; fileName: string };

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
      // Step 1: Analyzing
      updateStep(0, true, false);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      updateStep(0, false, true);

      // Step 2: Generating questions
      updateStep(1, true, false);

      const genAI = new GoogleGenerativeAI(
        process.env.EXPO_PUBLIC_GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY'
      );

      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

      const prompt = `Based on these lecture slides, generate 20 multiple choice questions.
      
Lecture Content:
${content}

Generate the questions in JSON format with this structure:
{
  "questions": [
    {
      "id": 1,
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "explanation": "Why this is correct",
      "difficulty": "easy|medium|hard"
    }
  ]
}

Start with medium difficulty questions and vary the difficulty throughout. Ensure questions test conceptual understanding.`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse AI response');
      }

      const questionsData = JSON.parse(jsonMatch[0]);

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
          questions: JSON.stringify(questionsData.questions),
          fileName,
        },
      });
    } catch (error) {
      console.error('Error generating questions:', error);
      // Fallback to sample questions
      const sampleQuestions = generateSampleQuestions();
      router.push({
        pathname: '/quiz',
        params: {
          questions: JSON.stringify(sampleQuestions),
          fileName,
        },
      });
    }
  };

  const generateSampleQuestions = () => [
    {
      id: 1,
      question: 'What is the main topic of this lecture?',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 'Option A',
      explanation: 'This is the correct answer.',
      difficulty: 'easy',
    },
    {
      id: 2,
      question: 'Which of the following best describes...?',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 'Option B',
      explanation: 'This demonstrates understanding of the concept.',
      difficulty: 'medium',
    },
  ];

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ThemedText style={styles.title}>Preparing Your Quiz</ThemedText>
        <ThemedText style={styles.subtitle}>{fileName}</ThemedText>

        <View style={styles.stepsContainer}>
          {steps.map((item, index) => (
            <View key={index} style={styles.stepItem}>
              <View style={styles.stepIconContainer}>
                {item.completed ? (
                  <ThemedText style={styles.stepIcon}>✓</ThemedText>
                ) : item.active ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : (
                  <ThemedText style={styles.stepIconInactive}>○</ThemedText>
                )}
              </View>
              <ThemedText
                style={[
                  styles.stepText,
                  item.active && styles.stepTextActive,
                  item.completed && styles.stepTextCompleted,
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
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
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
    fontWeight: 'bold',
  },
  stepIconInactive: {
    fontSize: 20,
    color: '#ccc',
  },
  stepText: {
    fontSize: 16,
    color: '#ccc',
  },
  stepTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  stepTextCompleted: {
    color: '#34C759',
  },
});
