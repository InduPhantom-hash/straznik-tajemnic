import { renderHook, act } from '@testing-library/react';
import { useChat } from './useChat';

// Mock dependencies
jest.mock('@/lib/ai-settings', () => ({
  loadAISettings: jest.fn(() => ({})),
  getGameMasterPrompt: jest.fn(() => ''),
}));

jest.mock('@/lib/telemetry', () => ({
  logApiEvent: jest.fn().mockResolvedValue(undefined),
  trackEvent: jest.fn(),
}));

jest.mock('@/lib/time-manager', () => ({
  timeManager: {
    getTime: jest.fn(() => ({ year: 1920, month: 10, day: 1, hour: 20, minute: 0 })),
  },
}));

describe('useChat - sessionEndStatus (LOG-01)', () => {
  const defaultOptions = {
    pdfMemory: { rulesUrl: undefined, moduleUrl: undefined },
    activeCharacter: { id: 'char-1', name: 'Edward Carnby', skills: {} } as any,
    characters: [],
    setCharacters: jest.fn(),
    setActiveCharacter: jest.fn(),
    voiceEnabled: false,
    isTTSEnabled: false,
    generateVoiceForMessage: jest.fn().mockResolvedValue(undefined),
    addToQueue: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
  });

  it('inicjalizuje stan w trybie idle', () => {
    const { result } = renderHook(() => useChat(defaultOptions));
    expect(result.current.sessionEndStatus).toBe('idle');
    expect(result.current.isSessionEnded).toBe(false);
  });

  it('przechodzi do stanu awaiting_player_closure po wysłaniu sygnału [KONIEC_SESJI]', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => {
          const encoder = new TextEncoder();
          let done = false;
          return {
            read: () => {
              if (done) return Promise.resolve({ done: true, value: undefined });
              done = true;
              return Promise.resolve({
                done: false,
                value: encoder.encode('data: {"type":"text","content":"Zamykasz historię..."}\n\n'),
              });
            },
          };
        },
      },
    });

    const { result } = renderHook(() => useChat(defaultOptions));

    await act(async () => {
      await result.current.handleSendMessage('[KONIEC_SESJI]');
    });

    expect(result.current.sessionEndStatus).toBe('awaiting_player_closure');
    expect(result.current.isSessionEnded).toBe(false);
  });

  it('resetuje stan do idle po wyczyszczeniu wiadomości', () => {
    const { result } = renderHook(() => useChat(defaultOptions));

    act(() => {
      result.current.setMessages([]);
    });

    expect(result.current.sessionEndStatus).toBe('idle');
    expect(result.current.isSessionEnded).toBe(false);
  });
});
