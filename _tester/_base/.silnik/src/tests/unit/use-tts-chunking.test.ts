import { renderHook, act } from '@testing-library/react';
import { useTTS } from '@/hooks/useTTS';
import { loadAISettings } from '@/lib/ai-settings';

jest.mock('@/lib/ai-settings', () => ({
  loadAISettings: jest.fn(() => ({
    qualityPreset: 'high',
    voiceSettings: { voiceId: 'Kore', volume: 75, provider: 'gemini' },
  })),
}));

jest.mock('@/lib/api-keys-service', () => ({
  getApiKeyHeaders: jest.fn(() => ({})),
}));

describe('useTTS First-Chunk Streaming & Buffering', () => {
  let originalFetch: typeof global.fetch;
  let originalAudio: typeof global.Audio;

  beforeEach(() => {
    originalFetch = global.fetch;
    originalAudio = global.Audio;

    class MockAudio {
      src = '';
      volume = 1;
      currentTime = 0;
      paused = true;
      play = jest.fn().mockResolvedValue(undefined);
      pause = jest.fn();
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(src?: string) {
        if (src) this.src = src;
      }
    }
    global.Audio = MockAudio as unknown as typeof Audio;

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, audioUrl: 'blob:mock-audio-chunk-1' }),
    } as Response);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.Audio = originalAudio;
    jest.clearAllMocks();
  });

  it('wypycha pierwsze zdanie narracji natychmiast na presecie HIGH bez czekania na flush', async () => {
    const { result } = renderHook(() => useTTS('pl'));

    act(() => {
      result.current.setVoiceEnabled(true);
      result.current.setIsTTSEnabled(true);
    });

    const firstSentence =
      'Deszcz bębnił bezlitośnie o dach czarnego packarda zaparkowanego na przedmieściach.';

    await act(async () => {
      // Symulacja nadejścia pierwszego pełnego zdania podczas strumieniowania (flush = false)
      result.current.addToQueue(firstSentence, 'msg-intro-1', false);
    });

    // Powinno natychmiast wywołać fetch dla pierwszego zdania
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const fetchArgs = (global.fetch as jest.Mock).mock.calls[0];
    expect(fetchArgs[0]).toBe('/api/tts/gemini');
    const payload = JSON.parse(fetchArgs[1].body);
    expect(payload.text).toContain('Deszcz bębnił bezlitośnie');
  });

  it('poprawnie zarządza stanem isInitialBuffering', async () => {
    const { result } = renderHook(() => useTTS('pl'));

    act(() => {
      result.current.setVoiceEnabled(true);
      result.current.setIsTTSEnabled(true);
    });

    act(() => {
      result.current.startInitialBuffering();
    });

    expect(result.current.isInitialBuffering).toBe(true);

    const firstSentence =
      'Wchodzisz do zamglonego holu starego uniwersytetu Miskatonic w Arkham.';

    await act(async () => {
      result.current.addToQueue(firstSentence, 'msg-intro-2', false);
    });

    // Po otrzymaniu audio z API flaga buforowania opada
    expect(result.current.isInitialBuffering).toBe(false);
  });
});
