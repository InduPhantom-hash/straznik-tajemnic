import { renderHook, act } from '@testing-library/react';
import { TextEncoder, TextDecoder } from 'util';
import type { Character } from '@/lib/types';
import { useChat } from './useChat';

if (typeof global.TextEncoder === 'undefined') {
  Object.defineProperty(global, 'TextEncoder', { value: TextEncoder });
}
if (typeof global.TextDecoder === 'undefined') {
  Object.defineProperty(global, 'TextDecoder', { value: TextDecoder });
}

// Mock dependencies
jest.mock('@/lib/ai-settings', () => ({
  loadAISettings: jest.fn(() => ({})),
  getGameMasterPrompt: jest.fn(() => ''),
}));

jest.mock('@/lib/telemetry', () => ({
  logApiEvent: jest.fn().mockResolvedValue(undefined),
  trackEvent: jest.fn(),
}));

jest.mock('@/lib/api-keys-service', () => ({
  fetchWithApiKeys: (url: string, init?: RequestInit) => global.fetch(url, init),
  hasRequiredKeys: jest.fn(() => true),
  isPureTextMode: jest.fn(() => false),
  getApiKeyHeaders: jest.fn(() => ({})),
}));

jest.mock('@/lib/time-manager', () => ({
  timeManager: {
    getTime: jest.fn(() => ({ year: 1920, month: 9, day: 1, hour: 20, minute: 0 })),
  },
}));

describe('useChat - stopGeneration (Issue #571)', () => {
  const defaultOptions = {
    pdfMemory: { rulesUrl: undefined, moduleUrl: undefined },
    activeCharacter: { id: 'char-1', name: 'Edward Carnby', skills: {} } as Character,
    characters: [],
    setCharacters: jest.fn(),
    setActiveCharacter: jest.fn(),
    voiceEnabled: false,
    isTTSEnabled: false,
    generateVoiceForMessage: jest.fn().mockResolvedValue(undefined),
    addToQueue: jest.fn(),
    stopCurrentAudio: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
  });

  it('stopGeneration przerywa trwające zapytanie, cofa dymki z czatu i przywraca treść wiadomości gracza', async () => {
    let capturedSignal: AbortSignal | null | undefined;
    let rejectStream: ((err: unknown) => void) | undefined;

    global.fetch = jest.fn().mockImplementation((_url: string, init?: RequestInit) => {
      capturedSignal = init?.signal;
      return Promise.resolve({
        ok: true,
        body: {
          getReader: () => ({
            read: () =>
              new Promise((_resolve, reject) => {
                rejectStream = reject;
                if (capturedSignal?.aborted) {
                  reject(new DOMException('The user aborted a request.', 'AbortError'));
                } else if (capturedSignal) {
                  capturedSignal.addEventListener('abort', () => {
                    reject(new DOMException('The user aborted a request.', 'AbortError'));
                  });
                }
              }),
            releaseLock: () => {},
          }),
        },
      } as unknown as Response);
    });

    const { result } = renderHook(() => useChat(defaultOptions));

    // Rozpoczynamy wysyłanie wiadomości gracza
    let sendPromise: Promise<unknown>;
    act(() => {
      sendPromise = result.current.handleSendMessage('Idę zbadać piwnicę.');
    });

    // W trakcie zapytania isLoading powinno być true
    expect(result.current.isLoading).toBe(true);
    expect(capturedSignal).toBeDefined();
    expect(capturedSignal?.aborted).toBe(false);

    // Gracz klika "Zatrzymaj"
    act(() => {
      result.current.stopGeneration();
    });

    // Sygnał abort powinien być wyzwolony
    expect(capturedSignal?.aborted).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(defaultOptions.stopCurrentAudio).toHaveBeenCalled();

    // Czekamy na zakończenie sendPromise
    await act(async () => {
      try {
        await sendPromise;
      } catch {
        // Ignorujemy błąd abortu
      }
    });

    // Przerwany dymek asystenta oraz wiadomość gracza powinny zniknąć z czatu
    expect(result.current.messages).toEqual([]);
    // Treść wiadomości gracza powinna wrócić do newMessage
    expect(result.current.newMessage).toBe('Idę zbadać piwnicę.');
  });
});
