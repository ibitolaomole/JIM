import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Font from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { playGreeting } from '@/services/elevenlabs';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          'tt_interphases_pro': require('@/assets/fonts/TTInterphasesPro-Regular.ttf'),
          'tt_interphases_pro_extrabold': require('@/assets/fonts/TTInterphasesPro-ExtraBold.ttf'),
        });
      } catch (e) {
        console.warn('Error loading fonts:', e);
      } finally {
        setFontsLoaded(true);
      }
    }

    loadFonts();
  }, []);

  useEffect(() => {
    if (!fontsLoaded) {
      return;
    }

    const timeoutId = setTimeout(() => {
      // Attempt greeting playback non-blocking; suppress hard errors in startup
      playGreeting()
        .catch((err) => {
          // Silently log; don't let this block app startup
          console.debug('Greeting playback skipped:', err?.message || String(err));
        });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="upload" options={{ headerShown: false }} />
        <Stack.Screen name="question-count" options={{ headerShown: false }} />
        <Stack.Screen name="panic-mode" options={{ headerShown: false }} />
        <Stack.Screen name="processing" options={{ headerShown: false }} />
        <Stack.Screen name="quiz" options={{ headerShown: false }} />
        <Stack.Screen name="results" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="dark" backgroundColor="#fff" />
    </ThemeProvider>
  );
}
