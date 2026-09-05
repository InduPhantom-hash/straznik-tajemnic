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

  it('poprawnie zarządza stanem isInitialBuffering i czeka na zbuforowanie 3 segmentów', async () => {
    const { result } = renderHook(() => useTTS('pl'));

    act(() => {
      result.current.setVoiceEnabled(true);
      result.current.setIsTTSEnabled(true);
    });

    act(() => {
      result.current.startInitialBuffering();
    });

    expect(result.current.isInitialBuffering).toBe(true);

    // 1. zdanie: segment 0
    const sentence1 =
      'Wchodzisz do zamglonego holu starego uniwersytetu Miskatonic w Arkham.';
    await act(async () => {
      result.current.addToQueue(sentence1, 'msg-intro-2', false);
    });

    // Po 1. zdaniu w trakcie streamingu (flush = false) buforowanie wciąż trwa (target = 3)
    expect(result.current.isInitialBuffering).toBe(true);

    // 2. zdanie: przekracza STREAMING_SEGMENT_TARGET_CHARS (100 znaków) -> segment 1
    const sentence2 =
      `${sentence1} Ciężkie dębowe drzwi zatrzasnęły się za tobą z głuchym, niepokojącym łomotem echującym w pustych korytarzach biblioteki.`;
    await act(async () => {
      result.current.addToQueue(sentence2, 'msg-intro-2', false);
    });

    // Wciąż mamy tylko 2 segmenty, więc buforowanie nadal trwa
    expect(result.current.isInitialBuffering).toBe(true);

    // 3. zdanie: segment 2 (osiągamy 3 segmenty w buforze)
    const sentence3 =
      `${sentence2} Na marmurowej posadzce dostrzegasz zaschnięte ślady stóp prowadzące w stronę zakazanego działu rzadkich ksiąg.`;
    await act(async () => {
      result.current.addToQueue(sentence3, 'msg-intro-2', false);
    });

    // Osiągnięto cel 3 segmentów: buforowanie zwalnia blokadę
    expect(result.current.isInitialBuffering).toBe(false);
  });

  it('waitForInitialBuffer rozwiązuje obietnicę po zbuforowaniu segmentów lub zakończeniu strumienia (flush)', async () => {
    const { result } = renderHook(() => useTTS('pl'));

    act(() => {
      result.current.setVoiceEnabled(true);
      result.current.setIsTTSEnabled(true);
    });

    act(() => {
      result.current.startInitialBuffering();
    });

    let bufferResolved = false;
    const waitPromise = act(async () => {
      await result.current.waitForInitialBuffer(5000);
      bufferResolved = true;
    });

    expect(bufferResolved).toBe(false);

    // Krótkie intro: tylko 1 zdanie, ale natychmiastowy flush (koniec odpowiedzi)
    const shortIntro = 'Zapada zmrok nad portowym miastem Innsmouth.';
    await act(async () => {
      result.current.addToQueue(shortIntro, 'msg-intro-short', true);
    });

    await waitPromise;
    expect(bufferResolved).toBe(true);
    expect(result.current.isInitialBuffering).toBe(false);
  });
});
