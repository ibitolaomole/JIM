import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

interface StoryEnding {
  tier: string;
  title: string;
  subtitle: string;
  story: string;
  nextAction: string;
  learningState: string;
}

export default function ResultsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const {
    score,
    total,
    streak,
    gameOver,
    isPanicMode,
    difficulty,
    finalDifficulty,
    highestDifficulty,
    adaptationCount,
    extremeUnlocked,
  } = params as {
    score: string;
    total: string;
    streak: string;
    gameOver?: string;
    isPanicMode?: string;
    difficulty?: string;
    finalDifficulty?: string;
    highestDifficulty?: string;
    adaptationCount?: string;
    extremeUnlocked?: string;
  };

  const scoreNum = parseInt(score, 10) || 0;
  const totalNum = parseInt(total, 10) || 0;
  const percentage = totalNum > 0 ? Math.round((scoreNum / totalNum) * 100) : 0;
  const reviewCount = Math.max(totalNum - scoreNum, 0);
  const isPerfectScore = totalNum > 0 && scoreNum === totalNum;
  const isExtremePanicMode = isPanicMode === 'true';
  const bestStreak = parseInt(streak, 10) || 0;
  const adjustments = parseInt(adaptationCount || '0', 10) || 0;
  const peakDifficulty = highestDifficulty || difficulty || 'medium';
  const endingDifficulty = finalDifficulty || difficulty || 'medium';
  const unlockedExtreme = extremeUnlocked === 'true' || peakDifficulty === 'extreme';
  const getDifficultyColor = (diff?: string) => {
    switch (diff) {
      case 'easy':
        return '#34C759';
      case 'medium':
        return '#f3aa21';
      case 'hard':
        return '#F44336';
      case 'extreme':
        return '#8B0000';

    }
  };
  const getDifficultySoftColor = (diff?: string) => {
    switch (diff) {
      case 'easy':
        return '#EAF8EF';
      case 'medium':
        return '#FFF3EA';
      case 'hard':
        return '#FFF0EE';
      case 'extreme':
        return '#FFF0F0';
      default:
        return '#FFF0EE';
    }
  };
  const modeColor = getDifficultyColor(difficulty);
  const modeSoftColor = getDifficultySoftColor(difficulty);
  const formatDifficulty = (diff?: string) => {
    if (diff === 'extreme') return 'Extreme';
    if (diff === 'hard') return '30 Questions';
    if (diff === 'medium') return '10 Questions';
    if (diff === 'easy') return '5 Questions';
    return 'Medium';
  };
  const getGameOverMessage = () => {
    if (isPerfectScore) {
      return 'You finished perfectly. Your health dropped to zero, but every answer was correct, so this run still counts as a clean sweep.';
    }

    if (percentage >= 70) {
      return 'You made it through with a solid score. Your health ran out before the session could continue, but the result still shows strong progress.';
    }

    return 'Your health ran out. Review the material, then come back for another run.';
  };

  if (gameOver === 'true') {
    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.gameOverContent}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.gameOverPanel,
              { backgroundColor: modeSoftColor, borderColor: modeColor },
            ]}
          >
            <View style={styles.gameOverTopRow}>
              <ThemedText style={[styles.gameOverEyebrow, { color: modeColor }]}>Session ended</ThemedText>
              <ThemedText
                style={[
                  styles.gameOverModePill,
                  { color: modeColor, backgroundColor: '#fff' },
                ]}
              >
                {formatDifficulty(difficulty)}
              </ThemedText>
            </View>
            <ThemedText style={styles.gameOverTitle}>Reset and try again!</ThemedText>
            <ThemedText style={styles.gameOverMessage}>
              {getGameOverMessage()}
            </ThemedText>
          </View>

          <View style={styles.gameOverStats}>
            <View style={styles.gameOverStatBox}>
              <ThemedText style={styles.gameOverStatLabel}>Score</ThemedText>
              <ThemedText style={[styles.gameOverStatValue, { color: modeColor }]}>
                {scoreNum}/{totalNum}
              </ThemedText>
            </View>
            <View style={styles.gameOverStatBox}>
              <ThemedText style={styles.gameOverStatLabel}>Best Streak</ThemedText>
              <ThemedText style={[styles.gameOverStatValue, { color: modeColor }]}>
                {bestStreak}
              </ThemedText>
            </View>
          </View>

          <View style={styles.gameOverEngineCard}>
            <ThemedText style={[styles.gameOverEngineLabel, { color: modeColor }]}>
              Learning State
            </ThemedText>
            <ThemedText style={styles.gameOverEngineText}>
              {isPerfectScore
                ? `Perfect run at ${formatDifficulty(peakDifficulty)}. Every answer landed correctly, with ${adjustments} adaptive ${adjustments === 1 ? 'adjustment' : 'adjustments'} shaping the session.`
                : adjustments === 0
                  ? `Try improving at ${formatDifficulty(peakDifficulty)} with additional practice.`
                  : `Try improving at ${formatDifficulty(peakDifficulty)} by making ${adjustments} ${adjustments === 1 ? 'adjustment' : 'adjustments'}.`}
            </ThemedText>
          </View>

          <Pressable
            style={[styles.restartButton, { backgroundColor: modeColor }]}
            onPress={() => router.push('/upload')}
          >
            <ThemedText style={styles.restartButtonText}>Try Again</ThemedText>
          </Pressable>

          <Pressable style={styles.homeButton} onPress={() => router.push('/')}>
            <ThemedText style={styles.homeButtonText}>Home</ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const getStoryEnding = (): StoryEnding => {
    if (isExtremePanicMode) {
      return {
        tier: 'Extreme Panic Mode',
        title: 'Extreme Run Complete',
        subtitle: 'Maximum difficulty selected',
        story:
          'You took the hardest route. Review anything missed, then run it back while the pressure is still fresh.',
        nextAction: 'Try Extreme Again',
        learningState: percentage >= 70 ? 'Pressure-Proven' : 'Pressure Training',
      };
    }

    if (isPerfectScore) {
      return {
        tier: 'Perfect Run',
        title: 'Every Answer Was Right',
        subtitle: 'Complete accuracy across all selections',
        story:
          'You answered every question correctly. The full set of selections was locked in, and your understanding held up from start to finish.',
        nextAction: 'Start a Harder Set',
        learningState: 'Perfect Run: Locked In',
      };
    }

    if (percentage >= 85) {
      return {
        tier: 'Expert Level',
        title: 'Strong Performance',
        subtitle: 'Deep understanding detected',
        story:
          "Your core concepts are locked in. You're thinking critically about the material, not just memorizing it.",
        nextAction: 'Challenge Yourself',
        learningState: 'Mastery Profile: Strong',
      };
    }

    if (percentage >= 70) {
      return {
        tier: 'Proficient',
        title: 'Solid Foundation',
        subtitle: 'Learning patterns forming',
        story:
          'You have the key ideas in place. A little focused review will tighten the weaker connections.',
        nextAction: 'Review & Strengthen',
        learningState: 'Mastery Profile: Building',
      };
    }

    return {
      tier: 'Foundation Phase',
      title: 'Keep Building',
      subtitle: 'Key ideas need review',
      story:
        'This material pushed back. Start with the fundamentals, review the explanations, and rebuild from the parts that felt uncertain.',
      nextAction: 'Master Fundamentals',
      learningState: 'Mastery Profile: Foundation',
    };
  };

  const storyEnding = getStoryEnding();

  return (
    <SafeAreaView style={styles.screen}>
      <ThemedView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <ThemedText
              style={[
                styles.tierPill,
                { color: modeColor, backgroundColor: modeSoftColor },
              ]}
            >
              {storyEnding.tier}
            </ThemedText>
            <ThemedText style={styles.title}>{storyEnding.title}</ThemedText>
            <ThemedText style={styles.subtitle}>{storyEnding.subtitle}</ThemedText>
          </View>

          <View style={[styles.scorePanel, { backgroundColor: modeSoftColor }]}>
            <View style={styles.scoreRow}>
              <View>
                <ThemedText style={styles.scoreLabel}>Accuracy</ThemedText>
                <ThemedText style={[styles.scoreValue, { color: modeColor }]}>
                  {percentage}%
                </ThemedText>
              </View>
              <View style={styles.scoreFraction}>
                <ThemedText style={styles.scoreFractionValue}>
                  {scoreNum}/{totalNum}
                </ThemedText>
                <ThemedText style={styles.scoreFractionLabel}>
                  {isPerfectScore ? 'all correct' : 'correct'}
                </ThemedText>
              </View>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${percentage}%`, backgroundColor: modeColor },
                ]}
              />
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <ThemedText style={styles.statNumber}>{reviewCount}</ThemedText>
              <ThemedText style={styles.statLabel}>To Review</ThemedText>
            </View>
            <View style={styles.statCard}>
              <ThemedText style={[styles.statNumber, { color: modeColor }]}>
                {bestStreak}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Best Streak</ThemedText>
            </View>
            <View style={styles.statCard}>
              <ThemedText style={[styles.statNumber, { color: modeColor }]}>
                {formatDifficulty(peakDifficulty)}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Peak Level</ThemedText>
            </View>
          </View>

          <View style={styles.feedbackPanel}>
            <ThemedText style={[styles.feedbackLabel, { color: modeColor }]}>
              Learning State · {storyEnding.learningState}
            </ThemedText>
            <ThemedText style={styles.storyText}>{storyEnding.story}</ThemedText>
          </View>

          <View style={styles.actions}>
            <Pressable
              style={[styles.primaryButton, { backgroundColor: modeColor }]}
              onPress={() => router.push('/upload')}
            >
              <ThemedText style={styles.primaryButtonText}>{storyEnding.nextAction}</ThemedText>
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={() => router.push('/')}>
              <ThemedText style={styles.secondaryButtonText}>Back Home</ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 32,
  },
  header: {
    marginTop: 0,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  tierPill: {
    borderRadius: 999,
    overflow: 'hidden',
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginBottom: 14,
    fontSize: 12,
    fontFamily: 'tt_interphases_pro_extrabold',
  },
  title: {
    fontSize: 34,
    fontFamily: 'tt_interphases_pro_extrabold',
    color: '#111',
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 18,
    lineHeight: 22,
    fontFamily: 'tt_interphases_pro_regular',
  },
  scorePanel: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 18,
  },
  scoreLabel: {
    fontSize: 13,
    color: '#555',
    marginBottom: 0,
    fontFamily: 'tt_interphases_pro_extrabold',
  },
  scoreValue: {
    fontSize: 56,
    lineHeight: 60,
    fontFamily: 'tt_interphases_pro_extrabold',
  },
  scoreFraction: {
    minWidth: 86,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  scoreFractionValue: {
    fontSize: 20,
    color: '#111',
    fontFamily: 'tt_interphases_pro_extrabold',
  },
  scoreFractionLabel: {
    fontSize: 13,
    color: '#777',
    marginTop: 3,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    minHeight: 108,
    borderRadius: 16,
    padding: 14,
    justifyContent: 'center',
    backgroundColor: '#F7F7F7',
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  statNumber: {
    fontSize: 15,
    color: '#111',
    fontFamily: 'tt_interphases_pro_extrabold',
  },
  statLabel: {
    fontSize: 13,
    color: '#777',
    marginTop: 6,
    fontFamily: 'tt_interphases_pro_extrabold',
  },
  feedbackPanel: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  feedbackLabel: {
    fontSize: 16,
    color: '#777',
    marginBottom: 10,
    fontFamily: 'tt_interphases_pro_extrabold',
  },
  storyText: {
    fontSize: 15,
    color: '#252525',
    lineHeight: 23,
    fontFamily: 'tt_interphases_pro_regular',
  },
  actions: {
    gap: 10,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'tt_interphases_pro_extrabold',
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E7E7E7',
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 15,
    fontFamily: 'tt_interphases_pro_extrabold',
  },
  gameOverContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 32,
    justifyContent: 'center',
  },
  gameOverPanel: {
    borderRadius: 18,
    padding: 20,
    marginBottom: 12,
    backgroundColor: '#FFF0EE',
    borderWidth: 1.5,
    borderColor: '#FFD7D2',
  },
  gameOverTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  gameOverEyebrow: {
    fontSize: 16,
    color: '#D92D20',
    fontFamily: 'tt_interphases_pro_extrabold',
  },
  gameOverModePill: {
    overflow: 'hidden',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontSize: 11,
    fontFamily: 'tt_interphases_pro_extrabold',
  },
  gameOverTitle: {
    fontSize: 30,
    lineHeight: 34,
    fontFamily: 'tt_interphases_pro_extrabold',
    color: '#111',
    marginBottom: 12,
  },
  gameOverMessage: {
    fontSize: 15,
    color: '#555',
    lineHeight: 23,
  },
  gameOverStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  gameOverStatBox: {
    flex: 1,
    minHeight: 116,
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    padding: 16,
    paddingTop: 22,
    justifyContent: 'flex-start',
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  gameOverStatLabel: {
    fontSize: 15,
    color: '#777',
    marginBottom: 8,
    fontFamily: 'tt_interphases_pro_extrabold',
  },
  gameOverStatValue: {
    fontSize: 25,
    marginTop: 0,
    color: '#D92D20',
    fontFamily: 'tt_interphases_pro_extrabold',
  },
  gameOverEngineCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  gameOverEngineLabel: {
    fontSize: 16,
    fontFamily: 'tt_interphases_pro_extrabold',
    marginBottom: 6,
  },
  gameOverEngineText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 20,
    fontFamily: 'tt_interphases_pro_regular',
  },
  restartButton: {
    minHeight: 58,
    backgroundColor: '#D92D20',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  restartButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'tt_interphases_pro_extrabold',
  },
  homeButton: {
    minHeight: 58,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E7E7E7',
    marginTop: 10,
  },
  homeButtonText: {
    color: '#333',
    fontSize: 16,
    fontFamily: 'tt_interphases_pro_extrabold',
  },
});
