import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface AnswerState {
  answered: boolean;
  selected: string | null;
  isCorrect: boolean;
}

export default function QuizScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [xp, setXp] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [answerState, setAnswerState] = useState<AnswerState>({
    answered: false,
    selected: null,
    isCorrect: false,
  });

  const { questions: questionsJson } = params as { questions: string };

  useEffect(() => {
    if (questionsJson) {
      try {
        const parsed = JSON.parse(questionsJson);
        setQuestions(parsed);
      } catch (error) {
        console.error('Error parsing questions:', error);
      }
    }
  }, [questionsJson]);

  // Timer effect
  useEffect(() => {
    if (answerState.answered || questions.length === 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleTimeout();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [answerState.answered, questions.length]);

  const handleTimeout = () => {
    if (!answerState.answered) {
      setAnswerState({
        answered: true,
        selected: null,
        isCorrect: false,
      });
      setStreak(0);
    }
  };

  const handleAnswer = (option: string) => {
    if (answerState.answered) return;

    const currentQuestion = questions[currentIndex];
    const isCorrect = option === currentQuestion.correctAnswer;

    setAnswerState({
      answered: true,
      selected: option,
      isCorrect,
    });

    if (isCorrect) {
      const points = Math.max(10, 40 - timeLeft); // More points for faster answers
      setScore(score + 1);
      setStreak(streak + 1);
      setXp(xp + points);
    } else {
      setStreak(0);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setTimeLeft(30);
      setAnswerState({
        answered: false,
        selected: null,
        isCorrect: false,
      });
    } else {
      // Quiz finished
      router.push({
        pathname: '/results',
        params: {
          score: String(score),
          total: String(questions.length),
          xp: String(xp),
          streak: String(streak),
        },
      });
    }
  };

  if (questions.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Loading questions...</ThemedText>
      </ThemedView>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <ThemedView style={styles.container}>
      {/* Header with stats */}
      <View style={styles.header}>
        <View style={styles.stat}>
          <ThemedText style={styles.statLabel}>Score</ThemedText>
          <ThemedText style={styles.statValue}>{score}/{questions.length}</ThemedText>
        </View>
        <View style={styles.stat}>
          <ThemedText style={styles.statLabel}>🔥 Streak</ThemedText>
          <ThemedText style={styles.statValue}>{streak}</ThemedText>
        </View>
        <View style={styles.stat}>
          <ThemedText style={styles.statLabel}>⭐ XP</ThemedText>
          <ThemedText style={styles.statValue}>{xp}</ThemedText>
        </View>
        <View style={styles.stat}>
          <ThemedText style={styles.statLabel}>⏱️</ThemedText>
          <ThemedText
            style={[
              styles.statValue,
              timeLeft < 10 && styles.timeWarning,
            ]}
          >
            {timeLeft}s
          </ThemedText>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progress, { width: `${progress}%` }]} />
      </View>

      {/* Question counter */}
      <View style={styles.questionCounter}>
        <ThemedText style={styles.counterText}>
          Question {currentIndex + 1} of {questions.length}
        </ThemedText>
      </View>

      {/* Question */}
      <View style={styles.content}>
        <ThemedText style={styles.question}>{currentQuestion.question}</ThemedText>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option, index) => {
            const isSelected = answerState.selected === option;
            const isCorrect = option === currentQuestion.correctAnswer;
            let optionStyle = styles.option;

            if (answerState.answered) {
              if (isCorrect) {
                optionStyle = styles.optionCorrect;
              } else if (isSelected && !isCorrect) {
                optionStyle = styles.optionIncorrect;
              }
            } else if (isSelected) {
              optionStyle = styles.optionSelected;
            }

            return (
              <Pressable
                key={index}
                style={optionStyle}
                onPress={() => handleAnswer(option)}
                disabled={answerState.answered}
              >
                <ThemedText
                  style={[
                    styles.optionText,
                    answerState.answered &&
                      (isCorrect || (isSelected && !isCorrect)) &&
                      styles.optionTextActive,
                  ]}
                >
                  {option}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* Explanation */}
        {answerState.answered && (
          <View style={styles.explanation}>
            <ThemedText style={styles.explanationTitle}>
              {answerState.isCorrect ? '✓ Correct!' : '✗ Incorrect'}
            </ThemedText>
            <ThemedText style={styles.explanationText}>
              {currentQuestion.explanation}
            </ThemedText>
          </View>
        )}
      </View>

      {/* Next button */}
      {answerState.answered && (
        <Pressable style={styles.nextButton} onPress={handleNext}>
          <ThemedText style={styles.nextButtonText}>
            {currentIndex === questions.length - 1 ? 'See Results' : 'Next Question'}
          </ThemedText>
        </Pressable>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    marginTop: 8,
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  timeWarning: {
    color: '#FF3B30',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progress: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  questionCounter: {
    marginBottom: 24,
  },
  counterText: {
    fontSize: 14,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  question: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 32,
    lineHeight: 28,
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 32,
  },
  option: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#fff',
  },
  optionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  optionCorrect: {
    borderColor: '#34C759',
    backgroundColor: '#f0fdf4',
  },
  optionIncorrect: {
    borderColor: '#FF3B30',
    backgroundColor: '#fef2f2',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  optionTextActive: {
    fontWeight: '600',
  },
  explanation: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  nextButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
