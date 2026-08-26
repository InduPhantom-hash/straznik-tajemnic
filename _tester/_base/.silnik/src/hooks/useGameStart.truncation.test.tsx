import { act, renderHook } from '@testing-library/react';
import { useGameStart } from './useGameStart';
import { fetchWithApiKeys } from '@/lib/api-keys-service';
import { parseSSEStream } from '@/lib/sse-parser';
import type { Message } from '@/lib/types';
import { defaultAISettings } from '@/lib/ai-settings/defaults';

jest.mock('@/lib/api-keys-service', () => ({
  fetchWithApiKeys: jest.fn(),
}));

jest.mock('@/lib/sse-parser', () => ({
  parseSSEStream: jest.fn(),
  createSseParseErrorHandler: jest.fn(() => jest.fn()),
}));

jest.mock('@/lib/posthog', () => ({
  trackEvent: jest.fn(),
}));

jest.mock('@/lib/ai-settings/cost-control', () => ({
  resetSessionTokens: jest.fn(),
}));

jest.mock('@/lib/time-manager', () => ({
  timeManager: {
    getTime: jest.fn(() => ({
      year: 1920,
      month: 10,
      day: 1,
      hour: 20,
      minute: 0,
    })),
    resetForAdventure: jest.fn(),
  },
}));

jest.mock('./useEquipmentThumbnails', () => ({
  useEquipmentThumbnails: jest.fn(() => ({
    generateThumbnailsInBackground: jest.fn(),
  })),
}));

describe('useGameStart - finishReason intra', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    jest.mocked(fetchWithApiKeys).mockResolvedValue({ ok: true } as Response);
  });

  it('zachowuje częściowe intro i przypisuje mu MAX_TOKENS', async () => {
    jest.mocked(parseSSEStream).mockImplementation(async (_response, callbacks) => {
      callbacks?.onText?.('Mgła przesuwa się nad portem...');
      callbacks?.onMetadata?.({
        type: 'metadata',
        finishReason: 'MAX_TOKENS',
      });
      return 'Mgła przesuwa się nad portem...';
    });

    let messages: Message[] = [];
    const setMessages: Parameters<typeof useGameStart>[0]['setMessages'] = (
      update
    ) => {
      messages = typeof update === 'function' ? update(messages) : update;
    };

    const props: Parameters<typeof useGameStart>[0] = {
      setHasStartedGame: jest.fn(),
      activeCharacter: null,
      characters: [],
      setActiveCharacter: jest.fn(),
      setCharacters: jest.fn(),
      pdfMemory: {},
      adventureContext: null,
      hotSeatConfig: { enabled: false, players: [] },
      setMessages,
      tts: {
        voiceEnabled: false,
        isTTSEnabled: false,
        generateVoiceForMessage: jest.fn().mockResolvedValue(undefined),
        addToQueue: jest.fn(),
        startInitialBuffering: jest.fn(),
        stopCurrentAudio: jest.fn(),
      },
      aiSettings: { ...defaultAISettings, imageGenerationEnabled: false },
    };

    const { result } = renderHook(() => useGameStart(props));

    await act(async () => {
      await result.current.handleStartGame();
    });

    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      role: 'assistant',
      content: 'Mgła przesuwa się nad portem...',
      finishReason: 'MAX_TOKENS',
    });
  });
});
