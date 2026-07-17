'use client';

import { useState, useCallback } from 'react';

/**
 * Hook ładujący listę głosów Google TTS (M5 sesja 146: drop ElevenLabs per D2).
 *
 * Brak useEffect - orkiestrator (`useSettingsModal`) triggeruje load po
 * inicjalizacji settings.
 *
 * Wyodrębniony z `useSettingsModal.ts` (linie 100-137) jako część IND-31.
 */

export interface AvailableVoice {
  voiceId: string;
  name: string;
  description: string;
  category: string;
  language: string;
  type?: string;
  displayName?: string;
  genderPL?: string;
}

export interface UseVoiceLoadersReturn {
  availableVoices: AvailableVoice[];
  loadAvailableVoices: () => Promise<void>;
}

export function useVoiceLoaders(): UseVoiceLoadersReturn {
  const [availableVoices, setAvailableVoices] = useState<AvailableVoice[]>([]);

  const loadAvailableVoices = useCallback(async () => {
    try {
      const { googleTTSService } = await import('@/lib/google-tts-service');
      const voices = await googleTTSService.getAvailableVoices();
      setAvailableVoices(voices);
    } catch (error) {
      console.error('Failed to load voices:', error);
      // Fallback voices
      setAvailableVoices([
        {
          voiceId: 'pl-PL-Wavenet-G',
          name: 'Wavenet-G',
          description: 'Głęboki, męski głos narratora',
          category: 'narrator',
          language: 'pl-PL',
          type: 'Wavenet',
        },
        {
          voiceId: 'pl-PL-Wavenet-F',
          name: 'Wavenet-F',
          description: 'Elegancki, kobiecy głos',
          category: 'character',
          language: 'pl-PL',
          type: 'Wavenet',
        },
      ]);
    }
  }, []);

  return {
    availableVoices,
    loadAvailableVoices,
  };
}
