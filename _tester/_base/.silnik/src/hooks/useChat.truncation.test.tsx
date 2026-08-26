import { act, renderHook, waitFor } from '@testing-library/react';
import { useChat } from './useChat';
import { fetchWithApiKeys } from '@/lib/api-keys-service';
import { parseSSEStream } from '@/lib/sse-parser';
import type { GameTime } from '@/lib/types';
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

jest.mock('@/lib/time-manager', () => ({
  timeManager: {
    getTime: jest.fn(() => ({
      year: 1920,
      month: 10,
      day: 1,
      hour: 20,
      minute: 0,
    })),
    setTime: jest.fn(),
  },
}));

jest.mock('@/lib/persistent-media-cache', () => ({
  persistentMediaCache: {
    isAvailable: jest.fn(() => false),
  },
}));

const partialGameTime: GameTime = {
  year: 1920,
  month: 10,
  day: 1,
  hour: 20,
  minute: 5,
};

const defaultOptions: Parameters<typeof useChat>[0] = {
  pdfMemory: {},
  activeCharacter: null,
  characters: [],
  setCharacters: jest.fn(),
  setActiveCharacter: jest.fn(),
  voiceEnabled: false,
  isTTSEnabled: false,
  generateVoiceForMessage: jest.fn().mockResolvedValue(undefined),
  addToQueue: jest.fn(),
  aiSettings: { ...defaultAISettings, imageGenerationEnabled: false },
};

describe('useChat - finishReason', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    jest.mocked(fetchWithApiKeys).mockResolvedValue({ ok: true } as Response);
  });

  it.each(['MAX_TOKENS', 'STOP'])(
    'zapisuje %s na właściwej wiadomości i zachowuje efekty partialu',
    async (finishReason) => {
      jest.mocked(parseSSEStream).mockImplementation(async (_response, callbacks) => {
        callbacks?.onText?.('Urwany fragment narracji');
        callbacks?.onMetadata?.({
          type: 'metadata',
          finishReason,
          timeUpdate: partialGameTime,
        });
        return 'Urwany fragment narracji';
      });

      const { result } = renderHook(() => useChat(defaultOptions));

      await act(async () => {
        await result.current.handleSendMessage('Rozglądam się.');
      });

      const userMessage = result.current.messages.find(
        (message) => message.role === 'user'
      );
      const assistantMessage = result.current.messages.find(
        (message) => message.role === 'assistant'
      );

      expect(userMessage?.finishReason).toBeUndefined();
      expect(assistantMessage).toMatchObject({
        content: 'Urwany fragment narracji',
        finishReason,
        gameTime: partialGameTime,
      });

      await waitFor(() => {
        const persisted = JSON.parse(
          localStorage.getItem('zew_chat_messages') ?? '[]'
        ) as Array<Record<string, unknown>>;
        expect(
          persisted.find((message) => message.role === 'assistant')
        ).toMatchObject({
          content: 'Urwany fragment narracji',
          finishReason,
        });
      });
    }
  );

  it('odtwarza status ucięcia ze starego localStorage bez migracji', () => {
    localStorage.setItem(
      'zew_chat_messages',
      JSON.stringify([
        {
          id: 'assistant-partial',
          role: 'assistant',
          content: 'Niedokończona scena',
          timestamp: '2026-08-23T12:00:00.000Z',
          finishReason: 'MAX_TOKENS',
          continuationRequested: false,
        },
      ])
    );

    const { result } = renderHook(() => useChat(defaultOptions));

    expect(result.current.messages[0]).toMatchObject({
      id: 'assistant-partial',
      finishReason: 'MAX_TOKENS',
      continuationRequested: false,
    });
    expect(result.current.messages[0].timestamp).toBeInstanceOf(Date);
  });

  it('wysyła jedną ukrytą kontynuację bez dymku gracza i nie czyta partialu ponownie', async () => {
    localStorage.setItem(
      'zew_chat_messages',
      JSON.stringify([
        {
          id: 'assistant-partial',
          role: 'assistant',
          content: 'Stary urwany fragment',
          timestamp: '2026-08-23T12:00:00.000Z',
          finishReason: 'MAX_TOKENS',
        },
      ])
    );

    jest.mocked(parseSSEStream).mockImplementation(async (_response, callbacks) => {
      callbacks?.onText?.('Nowe dokończenie sceny.');
      callbacks?.onMetadata?.({ type: 'metadata', finishReason: 'STOP' });
      return 'Nowe dokończenie sceny.';
    });

    const generateVoiceForMessage = jest
      .fn()
      .mockResolvedValue(undefined);
    const addToQueue = jest.fn();
    const options: Parameters<typeof useChat>[0] = {
      ...defaultOptions,
      voiceEnabled: true,
      isTTSEnabled: true,
      generateVoiceForMessage,
      addToQueue,
    };
    const { result } = renderHook(() => useChat(options));

    await act(async () => {
      await Promise.all([
        result.current.handleContinueNarration?.('assistant-partial'),
        result.current.handleContinueNarration?.('assistant-partial'),
      ]);
    });

    expect(fetchWithApiKeys).toHaveBeenCalledTimes(1);
    const request = jest.mocked(fetchWithApiKeys).mock.calls[0][1];
    const body = JSON.parse(String(request?.body)) as {
      message: string;
      messages: Array<Record<string, unknown>>;
    };

    expect(body.message).toContain('Dokończ poprzednią, urwaną wypowiedź');
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0]).toMatchObject({
      id: 'assistant-partial',
      role: 'assistant',
      content: 'Stary urwany fragment',
      continuationRequested: true,
    });
    expect(body.messages[0].content).not.toContain(
      'Dokończ poprzednią, urwaną wypowiedź'
    );

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages.filter((message) => message.role === 'user')).toHaveLength(0);
    expect(result.current.messages[0].continuationRequested).toBe(true);
    expect(result.current.messages[1]).toMatchObject({
      role: 'assistant',
      content: 'Nowe dokończenie sceny.',
      finishReason: 'STOP',
    });
    expect(generateVoiceForMessage).toHaveBeenCalledTimes(1);
    expect(generateVoiceForMessage).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'Nowe dokończenie sceny.' }),
      expect.arrayContaining([
        expect.objectContaining({ content: 'Stary urwany fragment' }),
      ])
    );
    expect(addToQueue).toHaveBeenCalledWith(
      'Nowe dokończenie sceny.',
      result.current.messages[1].id
    );
    expect(addToQueue).not.toHaveBeenCalledWith(
      'Stary urwany fragment',
      expect.any(String)
    );
  });
});
