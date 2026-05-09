import { useRoute, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ResultsScreen() {
  const route = useRoute();
  const router = useRouter();

  const { score, total, xp, streak } = route.params as {
    score: string;
    total: string;
    xp: string;
    streak: string;
  };

  const scoreNum = parseInt(score);
  const totalNum = parseInt(total);
  const percentage = Math.round((scoreNum / totalNum) * 100);

  const getFeedback = () => {
    if (percentage === 100) {
      return { title: 'Perfect Score! 🎉', message: 'Outstanding performance! You mastered this content.' };
    } else if (percentage >= 80) {
      return { title: 'Great Job! 👏', message: 'You have a strong understanding of the material.' };
    } else if (percentage >= 60) {
      return { title: 'Good Effort 👍', message: 'You understood most concepts. Review the challenging areas.' };
    } else {
      return { title: 'Keep Learning 📚', message: 'Review the material and try again to improve your score.' };
    }
  };

  const feedback = getFeedback();

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ThemedText style={styles.title}>{feedback.title}</ThemedText>

        {/* Score Circle */}
        <View style={styles.scoreCircle}>
          <ThemedText style={styles.scorePercentage}>{percentage}%</ThemedText>
          <ThemedText style={styles.scoreSubtext}>{scoreNum}/{totalNum}</ThemedText>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <ThemedText style={styles.statBoxLabel}>Total XP</ThemedText>
            <ThemedText style={styles.statBoxValue}>{xp}</ThemedText>
          </View>
          <View style={styles.statBox}>
            <ThemedText style={styles.statBoxLabel}>Best Streak</ThemedText>
            <ThemedText style={styles.statBoxValue}>🔥 {streak}</ThemedText>
          </View>
        </View>

        {/* Feedback */}
        <View style={styles.feedbackBox}>
          <ThemedText style={styles.feedbackText}>{feedback.message}</ThemedText>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={styles.retryButton}
            onPress={() => router.push('/upload')}
          >
            <ThemedText style={styles.retryButtonText}>Try Another Quiz</ThemedText>
          </Pressable>

          <Pressable
            style={styles.homeButton}
            onPress={() => router.push('/')}
          >
            <ThemedText style={styles.homeButtonText}>Back to Home</ThemedText>
          </Pressable>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
  },
  scoreCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 48,
  },
  scorePercentage: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#fff',
  },
  scoreSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
    width: '100%',
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statBoxLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  statBoxValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  feedbackBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    width: '100%',
  },
  feedbackText: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  homeButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  homeButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
