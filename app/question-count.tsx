import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { QUIZ_CONFIG } from '@/config';

export default function QuestionCountScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const { content, fileName, mimeType } = params as { 
    content: string; 
    fileName: string;
    mimeType?: string;
  };

  const handleSelectCount = (count: number) => {
    const getDifficulty = (count: number) => {
      if (count === 5) return 'easy';
      if (count === 10) return 'medium';
      if (count === 20) return 'hard';
      return 'hard'; // 40 questions also at hard difficulty
    };
    
    router.push({
      pathname: '/processing',
      params: {
        fileName,
        content,
        questionCount: count.toString(),
        difficulty: getDifficulty(count),
        mimeType: mimeType || 'text/plain',
        isPanicMode: 'false',
      },
    });
  };

  return (
    <ThemedView style={styles.container}>
      <Pressable 
        style={styles.backButtonContainer}
        onPress={() => router.back()}
      >
        <ThemedText style={styles.backButton}>← Back</ThemedText>
      </Pressable>

      <View style={styles.content}>
        <ThemedText style={styles.subtitle}>
          Choose a Revision Mode for <ThemedText style={{ fontFamily: 'tt_interphases_pro_extrabold', color: '#787878' }}>{fileName}</ThemedText>
        </ThemedText>

        <View style={styles.buttonContainer}>
          <Pressable
            style={({ pressed }) => [styles.optionButton, styles.easyButton, pressed && styles.pressed]}
            onPress={() => handleSelectCount(5)}
          >
            <ThemedText style={styles.optionLabel}>5 Easy Questions</ThemedText>
            <ThemedText style={styles.optionDescription}>Build your foundation with core concepts. Fixed difficulty - steady learning pace to reinforce understanding.</ThemedText>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.optionButton, styles.mediumButton, pressed && styles.pressed]}
            onPress={() => handleSelectCount(10)}
          >
            <ThemedText style={styles.optionLabel}>10 Medium Questions</ThemedText>
            <ThemedText style={styles.optionDescription}>Challenge yourself with deeper concepts. Fixed difficulty - consistent medium questions throughout the session.</ThemedText>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.optionButton, styles.hardButton, pressed && styles.pressed]}
            onPress={() => handleSelectCount(20)}
          >
            <ThemedText style={styles.optionLabel}>20 Hard Questions</ThemedText>
            <ThemedText style={styles.optionDescription}>Ultimate mastery challenge. Fixed difficulty level where unrelenting hard questions shown from start to finish.</ThemedText>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.optionButton, styles.extremeButton, pressed && styles.pressed]}
            onPress={() => handleSelectCount(40)}
          >
            <ThemedText style={styles.optionLabel}>40 Comprehensive Questions</ThemedText>
            <ThemedText style={styles.optionDescription}>Deep mastery mode. Comprehensive coverage of all topics from your file with detailed questions spanning the full range of concepts.</ThemedText>
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
    paddingTop: 0,
  },
  backButtonContainer: {
    paddingLeft: 16,
    paddingVertical: 12,
    paddingTop: 16,
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
    fontFamily: 'tt_interphases_pro_extrabold',
    marginBottom: -50,
    marginTop: 50,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#000',
    marginBottom: 32,
    textAlign: 'center',
    fontFamily: 'tt_interphases_pro_extrabold',
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  optionButton: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  easyButton: {
    backgroundColor: QUIZ_CONFIG.DIFFICULTY_COLORS.easy,
  },
  mediumButton: {
    backgroundColor: QUIZ_CONFIG.DIFFICULTY_COLORS.medium,
  },
  hardButton: {
    backgroundColor: QUIZ_CONFIG.DIFFICULTY_COLORS.hard,
  },
  extremeButton: {
    backgroundColor: '#8B0000',
  },
  pressed: {
    elevation: 8,
    shadowOpacity: 0.25,
    transform: [{ scale: 0.98 }],
  },
  optionNumber: {
    fontSize: 48,
    fontFamily: 'tt_interphases_pro_extrabold',
    color: '#fff',
  },
  optionLabel: {
    fontSize: 18,
    marginTop: 4,
    color: '#fff',
    fontFamily: 'tt_interphases_pro_extrabold',
  },
  optionDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 8,
    lineHeight: 20,
    fontFamily: 'tt_interphases_pro_regular',
  },
});
