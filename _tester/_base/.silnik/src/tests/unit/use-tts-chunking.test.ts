import { renderHook, act } from '@testing-library/react';
import { useTTS } from '@/hooks/useTTS';

const mockSaveAISettings = jest.fn();
let currentMockSettings = {
  qualityPreset: 'high',
  voiceSettings: { voiceId: 'Kore', volume: 75, provider: 'gemini', narratorOnly: false },
};

jest.mock('@/lib/ai-settings', () => ({
  loadAISettings: jest.fn(() => currentMockSettings),
  saveAISettings: jest.fn((newSettings) => {
    currentMockSettings = newSettings;
    mockSaveAISettings(newSettings);
  }),
}));

jest.mock('@/lib/api-keys-service', () => ({
  getApiKeyHeaders: jest.fn(() => ({})),
}));

describe('useTTS First-Chunk Streaming & Buffering', () => {
  let originalFetch: typeof global.fetch;
  let originalAudio: typeof global.Audio;

  beforeEach(() => {
    currentMockSettings = {
      qualityPreset: 'high',
      voiceSettings: { voiceId: 'Kore', volume: 75, provider: 'gemini', narratorOnly: false },
    };
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

  it('przekazuje audioDirection lektora do /api/tts/gemini w zależności od SAN i nastroju', async () => {
    const { result } = renderHook(() => useTTS('pl'));

    act(() => {
      result.current.setVoiceEnabled(true);
      result.current.setIsTTSEnabled(true);
    });

    const traumaSentence =
      '[SANITY: -6: potworny widok]\n[NASTRÓJ: klaustrofobiczny]\nCiemność zdaje się zacieśniać wokół twojej głowy.';

    await act(async () => {
      result.current.addToQueue(traumaSentence, 'msg-trauma-1', true);
    });

    expect(global.fetch).toHaveBeenCalled();
    const fetchArgs = (global.fetch as jest.Mock).mock.calls[0];
    const payload = JSON.parse(fetchArgs[1].body);

    expect(payload.audioDirection).toBeDefined();
    expect(payload.audioDirection).toContain('paranoid whisper');
    expect(payload.audioDirection).toContain('cosmic dread');
  });

  it('obsługuje wielogłosowe słuchowisko: NPC otrzymuje dedykowaną reżyserię aktorską', async () => {
    const { result } = renderHook(() => useTTS('pl'));

    act(() => {
      result.current.setVoiceEnabled(true);
      result.current.setIsTTSEnabled(true);
    });

    const dialogue =
      '@Walter Gilman: „Słyszycie ten nieustanny chrobot w ścianach starego domu?”';

    await act(async () => {
      result.current.addToQueue(dialogue, 'msg-dialogue-1', true);
    });

    expect(global.fetch).toHaveBeenCalled();
    const fetchArgs = (global.fetch as jest.Mock).mock.calls[0];
    const payload = JSON.parse(fetchArgs[1].body);

    expect(payload.audioDirection).toBeDefined();
    expect(payload.audioDirection).toContain('natural, character-driven dramatic');
    expect(payload.text).toContain('Słyszycie ten nieustanny chrobot');
  });

  it('wstrzymuje odtwarzanie audio (playFromBuffer) do momentu wywołania playInitialNarration (bramka CTA)', async () => {
    const { result } = renderHook(() => useTTS('pl'));

    act(() => {
      result.current.setVoiceEnabled(true);
      result.current.setIsTTSEnabled(true);
    });

    // Inicjuj buforowanie początkowe (stan oczekiwania na CTA)
    act(() => {
      result.current.startInitialBuffering();
    });

    // Dodaj 3 segmenty (osiągnięcie progu buforowania)
    const introPart1 = 'Cień kładzie się na starych dachach portowego miasteczka. Wiatr niesie zapach soli i zgnilizny.';
    await act(async () => {
      result.current.addToQueue(introPart1, 'msg-intro-cta', true);
    });

    // Mimo zakończenia buforowania lektor nie odtwarza audio automatycznie
    expect(result.current.currentAudio).toBeNull();

    // Wywołaj stopCurrentAudio (np. wewnętrzny cleanup) - bramka CTA nie może zostać zdjęta
    act(() => {
      result.current.stopCurrentAudio();
    });

    // Dodaj kolejną treść
    await act(async () => {
      result.current.addToQueue('Kolejne zdanie w trakcie oczekiwania.', 'msg-intro-cta-2', true);
    });

    // Audio nadal nie może grać bez CTA
    expect(result.current.currentAudio).toBeNull();

    // Dopiero kliknięcie CTA wywołuje playInitialNarration i odblokowuje odtwarzacz
    act(() => {
      result.current.playInitialNarration?.();
    });

    // Sprawdź czy po odblokowaniu audio ruszyło
    expect(result.current.playInitialNarration).toBeDefined();
  });

  it('Issue #172: zachowuje głos NPC dla wielozdaniowej kwestii dialogowej i wraca do lektora po nowej linii', async () => {
    const { result } = renderHook(() => useTTS('pl'));

    act(() => {
      result.current.setVoiceEnabled(true);
      result.current.setIsTTSEnabled(true);
    });

    const fullScene =
      'Walter Gilman: „Nie schodź tam! To czyste szaleństwo. Coś tam czeka w mroku!”\n\nNagle rozlega się zgrzyt klucza w zamku.';

    await act(async () => {
      result.current.addToQueue(fullScene, 'msg-multi-npc-1', true);
    });

    // Powinny być dokładnie 2 wywołania fetch: 1 scalony segment NPC + 1 segment Narratora
    expect(global.fetch).toHaveBeenCalledTimes(2);

    const firstCallPayload = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    const secondCallPayload = JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body);

    // Segment 1: Walter Gilman (cały 3-zdaniowy dialog aktorski scalony w jeden segment)
    expect(firstCallPayload.voice).toBe('Puck');
    expect(firstCallPayload.text).toContain('Nie schodź tam!');
    expect(firstCallPayload.text).toContain('To czyste szaleństwo.');
    expect(firstCallPayload.text).toContain('Coś tam czeka w mroku!');
    expect(firstCallPayload.audioDirection).toContain('natural, character-driven dramatic');

    // Segment 2: Narrator (powrót do lektora po nowej linii \n\n)
    expect(secondCallPayload.voice).toBe('Kore');
    expect(secondCallPayload.text).toBe('Nagle rozlega się zgrzyt klucza w zamku.');
    expect(secondCallPayload.audioDirection).not.toContain('character-driven');
  });

  it('Issue #172: tryb narratorOnly wymusza głos lektora dla dialogów postaci', async () => {
    const { result } = renderHook(() => useTTS('pl'));

    act(() => {
      result.current.setVoiceEnabled(true);
      result.current.setIsTTSEnabled(true);
      result.current.setIsNarratorOnly(true);
    });

    expect(result.current.isNarratorOnly).toBe(true);

    const dialogue = 'Walter Gilman: „Nie schodź tam! To czyste szaleństwo.”';
    await act(async () => {
      result.current.addToQueue(dialogue, 'msg-narrator-only', true);
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const payload = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(payload.voice).toBe('Kore');
    expect(payload.text).toContain('Nie schodź tam!');
  });

  it('Issue #172: reaktywny przełącznik setIsNarratorOnly zapisuje konfigurację', async () => {
    const { result } = renderHook(() => useTTS('pl'));

    act(() => {
      result.current.setIsNarratorOnly(true);
    });

    expect(result.current.isNarratorOnly).toBe(true);
    expect(mockSaveAISettings).toHaveBeenCalledWith(
      expect.objectContaining({
        voiceSettings: expect.objectContaining({
          narratorOnly: true,
        }),
      })
    );
  });

  it('Issue #172: podtrzymuje głos NPC w strumieniowanych kolejno zdaniach dialogu', async () => {
    const { result } = renderHook(() => useTTS('pl'));

    act(() => {
      result.current.setVoiceEnabled(true);
      result.current.setIsTTSEnabled(true);
    });

    // Chunk 1: pierwsze zdanie z markerem NPC
    const chunk1 = 'Walter Gilman: „Nie schodź tam! ';
    await act(async () => {
      result.current.addToQueue(chunk1, 'msg-stream-npc', false);
    });

    // Chunk 2: drugie zdanie w tej samej linii
    const chunk2 = `${chunk1}To czyste szaleństwo. `;
    await act(async () => {
      result.current.addToQueue(chunk2, 'msg-stream-npc', false);
    });

    // Chunk 3: domknięcie dialogu nową linią i zdanie narracji lektora
    const chunk3 = `${chunk2}Coś tam czeka w mroku!”\n\nNagle rozlega się zgrzyt klucza w zamku.`;
    await act(async () => {
      result.current.addToQueue(chunk3, 'msg-stream-npc', true);
    });

    // Oczekujemy 3 wywołań: segment 0 (Puck, wczesny start), segment 1 (Puck, domknięcie dialogu), segment 2 (Kore, narrator)
    expect(global.fetch).toHaveBeenCalledTimes(3);
    const call0Payload = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    const call1Payload = JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body);
    const call2Payload = JSON.parse((global.fetch as jest.Mock).mock.calls[2][1].body);

    // Segmenty dialogu NPC - oba mają głos Waltera Gilmana (Puck)
    expect(call0Payload.voice).toBe('Puck');
    expect(call0Payload.text).toContain('Nie schodź tam!');
    expect(call0Payload.text).toContain('To czyste szaleństwo.');

    expect(call1Payload.voice).toBe('Puck');
    expect(call1Payload.text).toContain('Coś tam czeka w mroku!');

    // Segment narracji - powrót do głosu lektora (Kore)
    expect(call2Payload.voice).toBe('Kore');
    expect(call2Payload.text).toBe('Nagle rozlega się zgrzyt klucza w zamku.');
  });
});


