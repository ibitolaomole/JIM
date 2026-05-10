import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>        
        <ThemedText style={styles.description}>
          Upload lecture slides, past papers, or text files and generate adaptive quizzes tailored to your understanding.
        </ThemedText>

        <Pressable
          style={styles.button}
          onPress={() => router.push('/upload')}
        >
          <ThemedText style={styles.buttonText}>Get Started</ThemedText>
        </Pressable>

        <Pressable
          style={styles.panicButton}
          onPress={() => router.push({
            pathname: '/upload',
            params: { isPanicMode: 'true' }
          })}
        >
          <ThemedText style={styles.buttonText}>Exam Panic Mode</ThemedText>
        </Pressable>
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
    paddingHorizontal: 20,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },

  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#888',
    marginBottom: 48,
    lineHeight: 24,
    fontFamily: 'tt_interphases_pro_regular',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 50,
    width: '100%',
    alignItems: 'center',
  },
  panicButton: {
    backgroundColor: '#34C759',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 50,
    width: '100%',
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'tt_interphases_pro_extrabold',
  },
});
    