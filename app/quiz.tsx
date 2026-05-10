import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import ResultsScreen from './results';

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
}

interface AnswerState {
  answered: boolean;
  selected: string | null;
  isCorrect: boolean;
}

export default function QuizScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [hp, setHp] = useState(100);
  const [timeLeft, setTimeLeft] = useState(30);
  const [currentDifficulty, setCurrentDifficulty] = useState<'easy' | 'medium' | 'hard' | 'extreme'>('medium');
  const [answerState, setAnswerState] = useState<AnswerState>({
    answered: false,
    selected: null,
    isCorrect: false,
  });

  // Animation references
  const hpAnimValue = useRef(new Animated.Value(100)).current;

  const { questions: questionsJson, isPanicMode, questionCount, difficulty } = params as { questions: string; isPanicMode?: string; questionCount: string; difficulty?: string };
  // If the router params indicate the session ended, render the results/session-ended UI
  const rawParams = params as any;
  if (rawParams && (rawParams.gameOver === 'true' || rawParams.sessionEnded === 'true')) {
    return <ResultsScreen />;
  }
  const totalQuestions = parseInt(questionCount, 10) || 20;
  const isPanic = isPanicMode === 'true';
  const initialDifficulty: 'easy' | 'medium' | 'hard' | 'extreme' = isPanic
    ? 'hard'
    : difficulty === 'hard'
      ? 'hard'
      : 'medium';

  // Helper function to get health color
  const getHealthColor = (healthPoints: number) => {
    if (healthPoints > 70) return '#34C759'; // Green - stable
    if (healthPoints > 40) return '#FFB800'; // Yellow - struggling
    return '#FF453A'; // Red - critical
  };

  // Helper function to get performance status
  const getStatusLabel = (performance: number) => {
    const accuracy = (score / Math.max(1, questionsAnswered)) * 100;
    if (accuracy >= 80) return 'COGNITIVE STABILITY: EXCELLENT';
    if (accuracy >= 60) return 'COGNITIVE STABILITY: STABLE';
    if (accuracy >= 40) return 'COGNITIVE STABILITY: CHALLENGED';
    return 'COGNITIVE STABILITY: CRITICAL';
  };

  // Helper function to get background gradient colors
  const getBackgroundGradient = (): readonly [string, string, ...string[]] => {
    const accuracy = (score / Math.max(1, questionsAnswered)) * 100;
    if (questionsAnswered === 0) {
      return ['#ffffff', '#f5f5f5']; // Neutral start
    }
    if (accuracy >= 70) {
      return ['#ffffff', '#f0f8ff']; // Blue gradient - doing well
    }
    if (accuracy >= 40) {
      return ['#ffffff', '#fffef0']; // Amber gradient - struggling
    }
    return ['#ffffff', '#fef2f2']; // Red gradient - critical
  };

  // Animate HP changes
  useEffect(() => {
    Animated.timing(hpAnimValue, {
      toValue: hp,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [hp]);

  useEffect(() => {
    if (questionsJson) {
      try {
        const parsed = JSON.parse(questionsJson);
        setAllQuestions(parsed);
        setCurrentDifficulty(initialDifficulty);
        const firstQuestion = parsed.find((q: Question) => q.difficulty === initialDifficulty) || parsed[0];
        setCurrentQuestion(firstQuestion);
      } catch (error) {
        console.error('Error parsing questions:', error);
      }
    }
  }, [questionsJson, initialDifficulty]);

  // Timer effect
  useEffect(() => {
    if (answerState.answered || !currentQuestion) return;

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
  }, [answerState.answered, currentQuestion]);

  // Auto-progress to next question after delay
  useEffect(() => {
    if (answerState.answered) {
      const timer = setTimeout(() => {
        getNextQuestion();
      }, 2000); // 2 second delay to show feedback

      return () => clearTimeout(timer);
    }
  }, [answerState.answered]);

  const handleTimeout = () => {
    if (!answerState.answered) {
      setAnswerState({
        answered: true,
        selected: null,
        isCorrect: false,
      });
      setStreak(0);
      // Lose HP for timeout (no selection)
      const hpLoss = 20; // More severe penalty for not answering
      setHp(Math.max(0, hp - hpLoss));
      setCurrentDifficulty(getAdaptiveDifficulty(currentDifficulty, false));
    }
  };

  const handleAnswer = (option: string) => {
    if (answerState.answered || !currentQuestion) return;

    const isCorrect = option === currentQuestion.correctAnswer;

    setAnswerState({
      answered: true,
      selected: option,
      isCorrect,
    });

    if (isCorrect) {
      setScore(score + 1);
      setStreak(streak + 1);
      // HP gains on correct
      setHp(Math.min(100, hp + 15)); // Recover 15 HP
      setCurrentDifficulty(getAdaptiveDifficulty(currentDifficulty, true));
    } else {
      setStreak(0);
      // Lose HP on incorrect
      const hpLoss = 15 + (5 * (currentDifficulty === 'hard' ? 1 : currentDifficulty === 'extreme' ? 2 : currentDifficulty === 'medium' ? 0.5 : 0)); // Lose 15-25 HP based on difficulty
      setHp(Math.max(0, hp - hpLoss));
      setCurrentDifficulty(getAdaptiveDifficulty(currentDifficulty, false));
    }
  };

  const getAdaptiveDifficulty = (current: 'easy' | 'medium' | 'hard' | 'extreme', shouldIncrease: boolean) => {
    if (shouldIncrease) {
      // Increase difficulty when user answers correctly
      if (current === 'easy') return 'medium';
      if (current === 'medium') return 'hard';
      if (current === 'hard') return 'extreme';
      return 'extreme'; // Stay at extreme
    } else {
      // Decrease difficulty when user answers incorrectly
      if (current === 'extreme') return 'hard';
      if (current === 'hard') return 'medium';
      if (current === 'medium') return 'easy';
      return 'easy'; // Stay at easy
    }
  };

  const getNextQuestion = () => {
    if (hp <= 0) {
      // Game Over - HP depleted
      router.push({
        pathname: '/results',
        params: {
          score: String(score),
          total: String(questionsAnswered + 1),
          streak: String(streak),
          difficulty: difficulty || currentDifficulty,
          gameOver: 'true',
          isPanicMode: isPanic ? 'true' : 'false',
        },
      });
      return;
    }

    if (questionsAnswered >= totalQuestions - 1) {
      // Quiz finished
      router.push({
        pathname: '/results',
        params: {
          score: String(score),
          total: String(totalQuestions),
          streak: String(streak),
          difficulty: difficulty || currentDifficulty,
          isPanicMode: isPanic ? 'true' : 'false',
        },
      });
      return;
    }

    // Get questions matching the new difficulty
    const difficultQuestions = allQuestions.filter(
      (q: Question) => q.difficulty === currentDifficulty && q.id !== currentQuestion?.id
    );

    if (difficultQuestions.length > 0) {
      const randomQuestion = difficultQuestions[Math.floor(Math.random() * difficultQuestions.length)];
      setCurrentQuestion(randomQuestion);
    } else {
      // Fallback to any different question
      const fallbackQuestions = allQuestions.filter((q: Question) => q.id !== currentQuestion?.id);
      const pool = fallbackQuestions.length > 0 ? fallbackQuestions : allQuestions;
      const randomQuestion = pool[Math.floor(Math.random() * pool.length)];
      setCurrentQuestion(randomQuestion);
    }

    setQuestionsAnswered(questionsAnswered + 1);
    setTimeLeft(30);
    setAnswerState({
      answered: false,
      selected: null,
      isCorrect: false,
    });
  };

  if (!currentQuestion) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Loading questions...</ThemedText>
      </ThemedView>
    );
  }

  const progress = ((questionsAnswered + 1) / totalQuestions) * 100;
  const difficultyColor =
    currentDifficulty === 'easy'
      ? '#34C759'
      : currentDifficulty === 'medium'
        ? '#f3aa21'
        : currentDifficulty === 'hard'
          ? '#F44336'
          : '#8B0000'; // Dark red for extreme
  const healthColor = getHealthColor(hp);
  const backgroundColors = getBackgroundGradient();
  const statusLabel = getStatusLabel(hp);

  return (
    <LinearGradient colors={backgroundColors} style={styles.gradient}>
      <ThemedView style={styles.container}>
      
      {/* HP Bar Section - Dynamic & Glowing */}
      <View style={[styles.hpSection, { borderColor: healthColor }]}>
        <View style={styles.hpHeader}>
          <ThemedText style={styles.hpLabel}>Current Health</ThemedText>
          <ThemedText style={[styles.hpValue, { color: healthColor }]}>{Math.ceil(hp)}/100</ThemedText>
        </View>
        <View style={[styles.hpBarContainer, { borderColor: healthColor }]}>
          <Animated.View
            style={[
              styles.hpBar,
              {
                width: hpAnimValue.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
                backgroundColor: healthColor,
              },
              hp < 30 && styles.hpPulse,
            ]}
          />
        </View>
        <ThemedText style={[styles.statusLabel, { color: healthColor }]}>
          {statusLabel}
        </ThemedText>
      </View>

      {/* Compact Stats HUD */}
      <View style={styles.header}>
        <View style={styles.stat}>
          <ThemedText style={styles.statLabel}>Score</ThemedText>
          <ThemedText style={styles.statValue}>{score}/{totalQuestions}</ThemedText>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <ThemedText style={styles.statLabel}>Streak</ThemedText>
          <ThemedText style={[styles.statValue, streak > 0 && { color: '#34C759' }]}>{streak}</ThemedText>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <ThemedText style={styles.statLabel}>Time</ThemedText>
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

      {/* Question counter and difficulty indicator */}
      <View style={styles.questionCounter}>
        <ThemedText style={styles.counterText}>
          Question {questionsAnswered + 1}/{totalQuestions}
        </ThemedText>
        <View style={[styles.difficultyBadge, { borderColor: difficultyColor }]}>
          <ThemedText style={[styles.difficultyText, { color: difficultyColor }]}>
            {currentDifficulty === 'easy'
              ? 'Easy'
              : currentDifficulty === 'medium'
                ? 'Medium'
                  : currentDifficulty === 'hard'
                  ? 'Hard'
                  : 'Extreme'}
          </ThemedText>
        </View>
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

            const optionLetters = ['A', 'B', 'C', 'D'];
            return (
              <Pressable
                key={index}
                style={optionStyle}
                onPress={() => handleAnswer(option)}
                disabled={answerState.answered}
              >
                <View style={styles.optionContent}>
                  <View
                    style={[
                      styles.optionIndicator,
                      answerState.answered && isCorrect && styles.optionIndicatorCorrect,
                      answerState.answered && isSelected && !isCorrect && styles.optionIndicatorIncorrect,
                      !answerState.answered && isSelected && styles.optionIndicatorFilled,
                    ]}
                  >
                    <ThemedText style={styles.optionLetter}>{optionLetters[index]}</ThemedText>
                  </View>
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
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      </ThemedView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    marginTop: 50,
  },
  hpSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    marginBottom: 12,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  hpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  hpLabel: {
    fontSize: 14,
    fontFamily: 'tt_interphases_pro_extrabold',
    color: '#000',
  },
  hpValue: {
    fontSize: 16,
    fontFamily: 'tt_interphases_pro_extrabold',
  },
  hpBarContainer: {
    height: 28,
    backgroundColor: '#e0e0e0',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
  },
  hpBar: {
    height: '100%',
    borderRadius: 12,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  hpPulse: {
    shadowOpacity: 0.4,
  },
  statusLabel: {
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
    letterSpacing: 0.5,
    fontFamily: 'tt_interphases_pro_demibold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e0e0e0',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'tt_interphases_pro_regular',
    letterSpacing: 0.3,
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'tt_interphases_pro_extrabold',
    color: '#000',
    marginTop: 4,
  },
  timeWarning: {
    color: '#FF3B30',
  },
  questionCounter: {
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  counterText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'tt_interphases_pro_regular',
  },
  difficultyBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  difficultyText: {
    fontSize: 11,
    fontFamily: 'tt_interphases_pro_extrabold',
    letterSpacing: 0.4,
  },
  content: {
    flex: 1,
  },
  question: {
    fontSize: 18,
    fontFamily: 'tt_interphases_pro_extrabold',
    color: '#000',
    marginBottom: 28,
    lineHeight: 26,
    letterSpacing: 0.2,
    marginTop: 0,
  },
  optionsContainer: {
    gap: 12,
  },
  option: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 0,
  },
  optionIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  optionIndicatorFilled: {
    borderColor: '#007AFF',
    backgroundColor: '#e3f2fd',
  },
  optionIndicatorCorrect: {
    borderColor: '#34C759',
    backgroundColor: '#dcfce7',
  },
  optionIndicatorIncorrect: {
    borderColor: '#FF3B30',
    backgroundColor: '#fee2e2',
  },
  optionLetter: {
    fontSize: 14,
    fontFamily: 'tt_interphases_pro_extrabold',
    color: '#666',
  },
  optionSelected: {
    borderColor: '#007AFF',
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  optionCorrect: {
    borderColor: '#34C759',
    backgroundColor: '#dcfce7',
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  optionIncorrect: {
    borderColor: '#FF3B30',
    backgroundColor: '#fee2e2',
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  optionText: {
    fontSize: 16,
    color: '#1a1a1a',
    fontFamily: 'tt_interphases_pro_regular',
    flex: 1,
    lineHeight: 22,
  },
  optionTextActive: {
    fontFamily: 'tt_interphases_pro_extrabold',
  },
  
});
