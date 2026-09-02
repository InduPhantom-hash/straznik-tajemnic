import { act, renderHook } from '@testing-library/react';
import { useGameStart } from './useGameStart';
import { fetchWithApiKeys } from '@/lib/api-keys-service';
import { parseSSEStream } from '@/lib/sse-parser';
import type { Message } from '@/lib/types';
import { defaultAISettings } from '@/lib/ai-settings/defaults';
import type { WorldSetupBundleV1 } from '@/lib/world-setup';

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
  });

  it('zachowuje częściowe intro i przypisuje mu MAX_TOKENS', async () => {
    const worldSetup: WorldSetupBundleV1 = {
      schemaVersion: 1,
      id: 'world-prabuty',
      scenarioId: 'cien-nad-prabutami',
      adventureTitle: 'Cień nad Prabutami',
      createdAt: '2026-09-01T10:00:00.000Z',
      canonRevision: 1,
      eraContext: {
        schemaVersion: 1,
        sceneDate: null,
        effectiveYear: 1973,
        countryCode: 'PL',
        regionProfile: 'PL',
        source: 'scenario-range',
        rulesVersion: '1.0.0',
      },
      eraManifestId: 'pl-1973-1974',
      adventureGraph: {},
      factions: [],
      npcs: [],
      locations: [],
      items: [],
      events: [],
      openingScene: {},
      nearestBranches: [],
      adventureContent: 'Treść',
      supplementalInformation: [],
      sources: [],
      knowledgeGaps: [],
      exceptions: [],
      phaseResults: [
        {
          phase: 'era',
          status: 'passed',
          critical: true,
          retryable: false,
          durationMs: 0,
          estimatedCostUsd: 0,
        },
      ],
    };
    jest
      .mocked(fetchWithApiKeys)
      .mockResolvedValueOnce({ ok: true } as Response);
    jest
      .mocked(parseSSEStream)
      .mockImplementation(async (_response, callbacks) => {
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
      adventureContext: {
        id: 'cien-nad-prabutami',
        title: 'Cień nad Prabutami',
        yearRange: '1973-1974',
        country: 'Polska',
      },
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
    expect(fetchWithApiKeys).toHaveBeenCalledTimes(1);
    expect(fetchWithApiKeys).toHaveBeenCalledWith(
      '/api/chat',
      expect.any(Object)
    );
    expect(
      JSON.parse(localStorage.getItem('world_setup_v1') || '{}')
    ).toMatchObject({
      scenarioId: 'cien-nad-prabutami',
      eraContext: { effectiveYear: 1973, countryCode: 'PL' },
    });
  });

  it('nie wywołuje czatu, gdy preflight nie przechodzi', async () => {
    jest.mocked(fetchWithApiKeys).mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({
        error: 'Własny scenariusz wymaga dokładnego kraju.',
      }),
    } as Response);

    let messages: Message[] = [];
    const setMessages: Parameters<typeof useGameStart>[0]['setMessages'] = (
      update
    ) => {
      messages = typeof update === 'function' ? update(messages) : update;
    };
    const setHasStartedGame = jest.fn();
    const props: Parameters<typeof useGameStart>[0] = {
      setHasStartedGame,
      activeCharacter: null,
      characters: [],
      setActiveCharacter: jest.fn(),
      setCharacters: jest.fn(),
      pdfMemory: {},
      adventureContext: {
        id: 'custom',
        title: 'Własna przygoda',
        isCustom: true,
        yearRange: '1973',
      },
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
    await act(async () => result.current.handleStartGame());

    expect(fetchWithApiKeys).toHaveBeenCalledTimes(1);
    expect(setHasStartedGame).toHaveBeenCalledWith(false);
    expect(messages[0]?.content).toContain('nie przeszło bramki');
    expect(localStorage.getItem('has_started_game')).toBeNull();
  });
});
