const mockGenerateContentStream = jest.fn();

jest.mock('@google/genai', () => {
  const actual = jest.requireActual<typeof import('@google/genai')>(
    '@google/genai'
  );

  return {
    ...actual,
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      models: { generateContentStream: mockGenerateContentStream },
    })),
  };
});

import { GeminiChatProvider } from './gemini-provider';
import type { ChatCompletionRequest } from './types';

const request: ChatCompletionRequest = {
  systemPrompt: 'Prowadź sesję.',
  messages: [],
  userMessage: 'Rozglądam się.',
  temperature: 0.7,
  topP: 0.9,
  maxOutputTokens: 256,
};

function streamResponse(chunks: Array<Record<string, unknown>>) {
  return (async function* () {
    for (const chunk of chunks) {
      yield chunk;
    }
  })();
}

describe('GeminiChatProvider.finishReason', () => {
  beforeEach(() => {
    mockGenerateContentStream.mockReset();
  });

  it('udostępnia MAX_TOKENS dopiero po skonsumowaniu częściowej odpowiedzi', async () => {
    mockGenerateContentStream.mockResolvedValue(
      streamResponse([
        { text: 'Urwany fragment', candidates: [{ finishReason: 'MAX_TOKENS' }] },
      ])
    );

    const provider = new GeminiChatProvider('test-key', 'gemini-test');
    const result = await provider.streamChat(request);

    expect(result.getFinishReason()).toBeUndefined();

    const text: string[] = [];
    for await (const chunk of result.stream) {
      text.push(chunk.text);
    }

    expect(text).toEqual(['Urwany fragment']);
    expect(result.getFinishReason()).toBe('MAX_TOKENS');
  });
});
