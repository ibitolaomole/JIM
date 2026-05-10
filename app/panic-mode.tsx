import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function PanicModeScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const { content, fileName, mimeType } = params as { 
    content: string; 
    fileName: string; 
    mimeType?: string;
  };

  const handleSelectCount = (count: number, difficulty: 'medium' | 'hard' | 'extreme') => {
    router.push({
      pathname: '/processing',
      params: {
        fileName,
        content,
        questionCount: count.toString(),
        difficulty,
        mimeType: mimeType || 'text/plain',
        isPanicMode: 'true',
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
          Choose a Panic Mode for <ThemedText style={{ fontFamily: 'tt_interphases_pro_extrabold', color: '#787878' }}>{fileName}</ThemedText>
        </ThemedText>

        <View style={styles.buttonContainer}>
          <Pressable
            style={({ pressed }) => [styles.optionButton, styles.mediumButton, pressed && styles.pressed]}
            onPress={() => handleSelectCount(10, 'medium')}
          >
            <ThemedText style={styles.optionLabel}>10 Medium Questions</ThemedText>
            <ThemedText style={styles.optionDescription}>Challenge yourself with deeper concepts. Fixed difficulty level. - consistent medium questions throughout the session</ThemedText>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.optionButton, styles.hardButton, pressed && styles.pressed]}
            onPress={() => handleSelectCount(20, 'hard')}
          >
            <ThemedText style={styles.optionLabel}>20 Hard Questions</ThemedText>
            <ThemedText style={styles.optionDescription}>Ultimate mastery challenge. Fixed difficulty level where unrelenting hard questions shown from start to finish.</ThemedText>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.optionButton, styles.extremeButton, pressed && styles.pressed]}
            onPress={() => handleSelectCount(30, 'extreme')}
          >
            <ThemedText style={styles.optionLabel}>30 Extremely Hard Questions</ThemedText>
            <ThemedText style={styles.optionDescription}>The final frontier. The most fixed difficulty level with the most demanding questions. Beware...</ThemedText>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.optionButton, styles.maxButton, pressed && styles.pressed]}
            onPress={() => handleSelectCount(40, 'extreme')}
          >
            <ThemedText style={styles.optionLabel}>40 Maximum Questions</ThemedText>
            <ThemedText style={styles.optionDescription}>The absolute peak. Maximum extreme difficulty with comprehensive coverage of all concepts from your file. Complete mastery or bust.</ThemedText>
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
  mediumButton: {
    backgroundColor: '#f3aa21',
  },
  hardButton: {
    backgroundColor: '#F44336',
  },
  extremeButton: {
    backgroundColor: '#8B0000',
  },
  maxButton: {
    backgroundColor: '#660000',
  },
  pressed: {
    elevation: 8,
    shadowOpacity: 0.25,
    transform: [{ scale: 0.98 }],
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
