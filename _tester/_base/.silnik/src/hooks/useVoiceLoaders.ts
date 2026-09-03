'use client';

import { useState, useCallback } from 'react';
import { GEMINI_VOICES } from '@/lib/gemini-voices';

/**
 * Hook dostarczający listę dostępnych głosów TTS dla modalu ustawień.
 * Korzysta z deterministycznego katalogu Gemini TTS (offline-first).
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
  const [availableVoices, setAvailableVoices] = useState<AvailableVoice[]>(() =>
    GEMINI_VOICES.map((v) => ({
      voiceId: v.voiceId,
      name: v.name,
      description: v.description,
      category: v.role,
      language: 'pl-PL',
      type: 'Gemini',
    }))
  );

  const loadAvailableVoices = useCallback(async () => {
    setAvailableVoices(
      GEMINI_VOICES.map((v) => ({
        voiceId: v.voiceId,
        name: v.name,
        description: v.description,
        category: v.role,
        language: 'pl-PL',
        type: 'Gemini',
      }))
    );
  }, []);

  return {
    availableVoices,
    loadAvailableVoices,
  };
}
