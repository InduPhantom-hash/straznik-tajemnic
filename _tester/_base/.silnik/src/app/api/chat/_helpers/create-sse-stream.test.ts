import { createSseStream } from './create-sse-stream';
import { TextDecoder, TextEncoder } from 'node:util';
import { ReadableStream as NodeReadableStream } from 'node:stream/web';
import { parseAIResponse } from '@/lib/response-parser';
import { logApiEvent } from '@/lib/telemetry';
import type { ParsedResponse } from '@/lib/parsers/types';
import type { StreamChunk } from '@/lib/ai-providers/types';

Object.assign(globalThis, {
  TextDecoder,
  TextEncoder,
  ReadableStream: NodeReadableStream,
});

jest.mock('@/lib/response-parser', () => ({
  parseAIResponse: jest.fn(),
}));

jest.mock('@/lib/telemetry', () => ({
  logApiEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/vector-db/conversation-memory', () => ({
  conversationMemory: { saveConversationTurn: jest.fn() },
}));

jest.mock('@/lib/director-state', () => ({
  updateDirectorState: jest.fn(),
}));

jest.mock('@/lib/user-usage', () => ({
  recordUserUsage: jest.fn().mockResolvedValue(undefined),
}));

function parsedResponse(rawText: string): ParsedResponse {
  return {
    events: [],
    combat: null,
    dialogues: [],
    illustrations: [],
    sfx: [],
    journalEntries: [],
    skillTests: [],
    skillResults: [],
    timeUpdate: null,
    rawText,
  };
}

async function* streamChunks(...texts: string[]): AsyncGenerator<StreamChunk> {
  for (const text of texts) {
    yield { text };
  }
}

async function readStream(stream: ReadableStream): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let output = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) return output;
    output += decoder.decode(value, { stream: true });
  }
}

describe('createSseStream', () => {
  beforeEach(() => {
    jest.mocked(parseAIResponse).mockImplementation(parsedResponse);
    jest.mocked(logApiEvent).mockClear();
  });

  it.each([
    ['MAX_TOKENS', 'MAX_TOKENS'],
    ['STOP', 'STOP'],
    ['brak finishReason', undefined],
  ])(
    'dodaje %s do końcowych metadanych bez utraty częściowego tekstu',
    async (_label, finishReason) => {
      const getFinishReason = jest.fn(() => finishReason);
      const stream = createSseStream({
        providerStream: streamChunks('Urwany ', 'fragment'),
        getUsage: async () => ({
          totalTokens: 42,
          promptTokens: 12,
          completionTokens: 30,
          model: 'gemini-test',
        }),
        getFinishReason,
        message: 'Kontynuuj scenę.',
        modelId: 'gemini-test',
        traceId: 'trace-test',
        timer: { elapsed: () => 123 },
        embeddingDim: 768,
        ragVersion: 'v1',
        userId: 'local',
      });

      const events = (await readStream(stream))
        .trim()
        .split('\n\n')
        .map((event) => JSON.parse(event.slice('data: '.length)) as Record<string, unknown>);

      expect(events).toEqual(
        expect.arrayContaining([
          { type: 'text', content: 'Urwany ' },
          { type: 'text', content: 'fragment' },
        ])
      );

      const metadata = events.at(-1);
      expect(metadata).toMatchObject({ type: 'metadata' });
      if (finishReason) {
        expect(metadata).toMatchObject({
          finishReason,
          telemetry: { finishReason },
        });
      } else {
        expect(metadata).not.toHaveProperty('finishReason');
        expect(metadata).not.toHaveProperty('telemetry.finishReason');
      }
      expect(getFinishReason).toHaveBeenCalledTimes(1);
      expect(logApiEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({ finishReason: finishReason ?? null }),
        })
      );
    }
  );
});
