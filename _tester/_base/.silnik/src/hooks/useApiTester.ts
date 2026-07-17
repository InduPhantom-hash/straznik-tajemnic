'use client';

import { useState, useCallback } from 'react';

/**
 * Hook do testowania 6 zewnętrznych API (gemini, googleTTS, replicate, cloudSessions,
 * elevenlabs, openai). Aktualizuje wyniki w `testResults`.
 *
 * Uwagi architektoniczne:
 * - `loadAvailableVoices` callback - po pomyślnym teście googleTTS hook musi odświeżyć
 *   listę głosów; konsument przekazuje tę funkcję bo trzyma state list.
 * - `setIsLoading` w return - wymóg `tts-settings.tsx` który kontroluje loading state
 *   wewnętrznie.
 *
 * Wyodrębniony z `settings-modal.tsx` (linie 358-485) jako część IND-17.
 */

export interface TestResults {
  gemini: boolean | null;
  googleTTS: boolean | null;
  replicate: boolean | null;
  cloudSessions: boolean | null;
  // M5+M6 sesja 146: elevenlabs + openai DROPPED per D2.
}

export interface UseApiTesterReturn {
  testResults: TestResults;
  isLoading: boolean;
  /** Dispatch - wymóg sub-komponentu TTSSettings (linia 23) */
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  testAPI: (apiType: string) => Promise<void>;
  testAllAPIs: () => Promise<void>;
  getTestResultIcon: (result: boolean | null) => string;
  getTestResultColor: (result: boolean | null) => string;
}

export interface UseApiTesterOptions {
  /**
   * Getter callback dla live klucza Gemini z formularza (IND-30 sesja 21).
   * Bez tego `checkAPIStatus` czyta localStorage, omijając wpisany ale niezapisany klucz.
   */
  getGeminiApiKey?: () => string;
  /** Wywoływane po pomyślnym teście googleTTS - odświeża listę głosów w konsumencie. */
  loadAvailableVoices?: () => Promise<void>;
}

const initialResults: TestResults = {
  gemini: null,
  googleTTS: null,
  replicate: null,
  cloudSessions: null,
};

export function useApiTester(options: UseApiTesterOptions): UseApiTesterReturn {
  const { getGeminiApiKey, loadAvailableVoices } = options;

  const [testResults, setTestResults] = useState<TestResults>(initialResults);
  const [isLoading, setIsLoading] = useState(false);

  const testAPI = useCallback(
    async (apiType: string) => {
      setIsLoading(true);
      try {
        let response;
        switch (apiType) {
          case 'gemini': {
            const { geminiService } = await import('@/lib/gemini-service');
            const liveKey = getGeminiApiKey?.();
            const result = await geminiService.checkAPIStatus(liveKey);
            setTestResults((prev) => ({ ...prev, gemini: result }));
            setIsLoading(false);
            return;
          }

          case 'googleTTS':
            response = await fetch('/api/ai/google-tts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'voice',
                text: 'test',
                voiceId: 'pl-PL-Wavenet-A',
              }),
            });
            break;

          case 'replicate':
            response = await fetch('/api/replicate-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'test' }),
            });
            break;

          case 'cloudSessions':
            response = await fetch('/api/session/cloud?test=true', {
              method: 'GET',
            });
            break;

          // M5+M6 sesja 146: case 'elevenlabs' + 'openai' DROPPED per D2.

          default:
            setIsLoading(false);
            return;
        }

        setTestResults((prev) => ({ ...prev, [apiType]: response.ok }));

        if (apiType === 'googleTTS' && response.ok && loadAvailableVoices) {
          await loadAvailableVoices();
        }
      } catch {
        setTestResults((prev) => ({ ...prev, [apiType]: false }));
      } finally {
        setIsLoading(false);
      }
    },
    [getGeminiApiKey, loadAvailableVoices]
  );

  const testAllAPIs = useCallback(async () => {
    await testAPI('gemini');
    await testAPI('googleTTS');
    await testAPI('replicate');
    await testAPI('cloudSessions');
  }, [testAPI]);

  const getTestResultIcon = useCallback((result: boolean | null) => {
    if (result === null) return '⚪';
    return result ? '✅' : '❌';
  }, []);

  const getTestResultColor = useCallback((result: boolean | null) => {
    if (result === null) return 'text-muted-foreground';
    return result ? 'text-green-400' : 'text-red-400';
  }, []);

  return {
    testResults,
    isLoading,
    setIsLoading,
    testAPI,
    testAllAPIs,
    getTestResultIcon,
    getTestResultColor,
  };
}
