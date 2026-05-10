/**
 * Centralized configuration for the JIM app
 * Environment variables and API endpoints accessible across all pages
 */

// API Keys (Expo public keys only, prefixed with EXPO_PUBLIC_)
export const API_KEYS = {
  GEMINI: process.env.EXPO_PUBLIC_GEMINI_API_KEY || 'AIzaSyAkwgF7fjJXWFblaaBl5zUmJUC8S5yATCQ',
  ELEVENLABS: process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY || '',
};

// ElevenLabs Configuration
export const ELEVENLABS_CONFIG = {
  API_KEY: API_KEYS.ELEVENLABS,
  VOICE_ID: process.env.ELEVENLABS_VOICE_ID || 'CwhRBWXzGAHq8TQ4Fs17',
  GREETING_TEXT: 'Alright… let\'s see how cooked you are for this exam.',
};

// Backend Configuration
export const BACKEND_CONFIG = {
  HOST: 'localhost',
  PORT: 3000,
  BASE_URL: `http://localhost:3000`,
  ENDPOINTS: {
    HEALTH: '/api/health',
    ELEVENLABS_VOICES: '/api/elevenlabs/voices',
    ELEVENLABS_TTS: '/api/elevenlabs/tts',
    JIM: '/api/jim',
    EXTRACT: '/api/extract',
    QUESTIONS: (contentId: string) => `/api/questions/${contentId}`,
    STORY: (contentId: string) => `/api/story/${contentId}`,
  },
};

// Quiz Configuration
export const QUIZ_CONFIG = {
  DIFFICULTIES: {
    EASY: 5,
    MEDIUM: 10,
    HARD: 20,
  },
  DIFFICULTY_LABELS: {
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
  },
  DIFFICULTY_COLORS: {
    easy: '#34C759',
    medium: '#f3aa21',
    hard: '#F44336',
    extreme: '#8B0000',
  },
};

// File Upload Configuration
export const FILE_CONFIG = {
  ACCEPTED_TYPES: [
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/pdf',
    'text/plain',
  ],
  MIME_TYPES: {
    PPTX: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    PDF: 'application/pdf',
    TXT: 'text/plain',
  },
  CACHE_TIMEOUT_MS: 3600000, // 1 hour
};

// API Helper Functions
export const getBackendUrl = (endpoint: string): string => {
  return `${BACKEND_CONFIG.BASE_URL}${endpoint}`;
};

export const getQuestionUrl = (contentId: string): string => {
  return getBackendUrl(BACKEND_CONFIG.ENDPOINTS.QUESTIONS(contentId));
};

export const getStoryUrl = (contentId: string): string => {
  return getBackendUrl(BACKEND_CONFIG.ENDPOINTS.STORY(contentId));
};

export const getJimEndpoint = (): string => {
  return getBackendUrl(BACKEND_CONFIG.ENDPOINTS.JIM);
};

export const getExtractEndpoint = (): string => {
  return getBackendUrl(BACKEND_CONFIG.ENDPOINTS.EXTRACT);
};
