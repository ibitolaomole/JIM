function getApiKey() {
  return (
    process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY ||
    process.env.ELEVENLABS_API_KEY ||
    process.env.XI_API_KEY ||
    ""
  );
}

function getDefaultVoiceId() {
  return process.env.ELEVENLABS_VOICE_ID || "CwhRBWXzGAHq8TQ4Fs17";
}

async function buildElevenLabsError(response) {
  let detail = "";

  try {
    const payload = await response.json();
    if (typeof payload?.detail === "string") {
      detail = payload.detail;
    } else if (typeof payload?.detail?.message === "string") {
      detail = payload.detail.message;
    } else if (typeof payload?.message === "string") {
      detail = payload.message;
    }
  } catch (_error) {
    // Ignore JSON parse errors and fall back to status text.
  }

  if (response.status === 402) {
    return new Error(
      `ElevenLabs API error: 402 Payment Required. Your account likely has no credits or an inactive plan${detail ? ` (${detail})` : ""}.`
    );
  }

  return new Error(
    `ElevenLabs API error: ${response.status} ${response.statusText}${detail ? ` (${detail})` : ""}`
  );
}

async function fetchVoices() {
  const apiKey = getApiKey();

  if (!apiKey) {
    return {
      configured: false,
      working: false,
      message: "Missing EXPO_PUBLIC_ELEVENLABS_API_KEY, ELEVENLABS_API_KEY, or XI_API_KEY",
      voices: [],
    };
  }

  const response = await fetch("https://api.elevenlabs.io/v1/voices", {
    method: "GET",
    headers: {
      "xi-api-key": apiKey,
    },
  });

  if (!response.ok) {
    throw await buildElevenLabsError(response);
  }

  const payload = await response.json();
  const voices = Array.isArray(payload.voices) ? payload.voices : [];

  return {
    configured: true,
    working: true,
    voiceCount: voices.length,
    voices,
    defaultVoiceId: getDefaultVoiceId(),
  };
}

async function generateSpeech({ text, voiceId, modelId, outputFormat }) {
  const selectedVoiceId = voiceId || getDefaultVoiceId();

  if (!selectedVoiceId) {
    throw new Error("Missing ELEVENLABS_VOICE_ID");
  }

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": getApiKey(),
      Accept: outputFormat || "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: modelId || "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  });

  if (!response.ok) {
    throw await buildElevenLabsError(response);
  }

  const audio = await response.arrayBuffer();
  return Buffer.from(audio);
}

/**
 * Convert text to speech using ElevenLabs API (React Native compatible)
 * @param {string} text - The text to convert to speech
 * @param {string} voiceId - Optional voice ID (defaults to env variable)
 * @returns {Promise<Blob>} - Audio blob
 */
async function textToSpeechBlob(text, voiceId = null) {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('Missing EXPO_PUBLIC_ELEVENLABS_API_KEY, ELEVENLABS_API_KEY, or XI_API_KEY');
    }

    const voice = voiceId || getDefaultVoiceId() || 'CwhRBWXzGAHq8TQ4Fs17';

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: text,
          voice_settings: {
            use_speaker_boost: true,
            stability: 1,
            style: 0.71,
          },
        }),
      }
    );

    if (!response.ok) {
      throw await buildElevenLabsError(response);
    }

    return await response.blob();
  } catch (error) {
    console.warn('ElevenLabs error:', error.message);
    throw error;
  }
}

/**
 * Play text as speech in React Native (requires expo-av)
 * @param {string} text - The text to play
 * @param {string} voiceId - Optional voice ID
 */
async function playTextToSpeech(text, voiceId = null) {
  let audioUri = null;
  const fallbackToDeviceSpeech = async (reason) => {
    const Speech = await import('expo-speech');
    await new Promise((resolve, reject) => {
      Speech.speak(text, {
        onDone: resolve,
        onStopped: resolve,
        onError: reject,
      });
    });
  };

  try {
    // Dynamically import expo-av only when needed (React Native)
    const { Audio } = await import('expo-av');

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      staysActiveInBackground: false,
      playThroughEarpieceAndroid: false,
    });

    const audioBlob = await textToSpeechBlob(text, voiceId);
    if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
      throw new Error('URL.createObjectURL is unavailable in this runtime');
    }
    audioUri = URL.createObjectURL(audioBlob);

    // Create and play sound
    const sound = new Audio.Sound();
    await sound.loadAsync({ uri: audioUri });
    await sound.playAsync();

    // Clean up after playback
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) {
        if (audioUri && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
          URL.revokeObjectURL(audioUri);
        }
        sound.unloadAsync().catch(err => console.warn('Error unloading sound:', err));
      }
    });
  } catch (error) {
    if (audioUri && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(audioUri);
    }

    const message = typeof error?.message === 'string' ? error.message : String(error);

    try {
      await fallbackToDeviceSpeech(message);
      return;
    } catch (fallbackError) {
      console.warn('Device speech fallback failed:', fallbackError?.message || fallbackError);
    }

    console.warn('ElevenLabs playback error:', message);
    throw error;
  }
}

/**
 * Play exam greeting
 */
async function playGreeting() {
  try {
    await playTextToSpeech('Alright… let\'s see how cooked you are for this exam.', null);
  } catch (error) {
    // Log but don't re-throw during startup so app doesn't hang
    console.debug('Greeting playback unavailable in this environment:', error?.message || String(error));
  }
}

module.exports = {
  fetchVoices,
  generateSpeech,
  getApiKey,
  getDefaultVoiceId,
  textToSpeechBlob,
  playTextToSpeech,
  playGreeting,
};