const mockGenerateContentStream = jest.fn();
const mockGenerateContent = jest.fn();

jest.mock('@google/genai', () => {
  const actual = jest.requireActual<typeof import('@google/genai')>(
    '@google/genai'
  );

  return {
    ...actual,
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      models: {
        generateContentStream: mockGenerateContentStream,
        generateContent: mockGenerateContent,
      },
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
    mockGenerateContent.mockReset();
  });

  it.each(['legacy', 'options'] as const)('blocks %s document attachments before any SDK request', async (location) => {
    const fileAttachments = [{ fileUri: 'https://example.invalid/synthetic.pdf', mimeType: 'application/pdf' }];
    const provider = new GeminiChatProvider('synthetic-key', 'gemini-test');
    const withDocument: ChatCompletionRequest = location === 'legacy'
      ? { ...request, fileAttachments }
      : { ...request, geminiOptions: { fileAttachments } };
    await expect(provider.chat(withDocument)).rejects.toThrow('DOCUMENT_MODEL_USE_BLOCKED');
    expect(mockGenerateContentStream).not.toHaveBeenCalled();
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

  it('ignoruje błąd SDK Incomplete JSON segment at the end jeśli treść narracji została już wyemitowana', async () => {
    mockGenerateContentStream.mockResolvedValue(
      (async function* () {
        yield { text: 'Wkraczasz do ruin kościoła w Prabutach.' };
        throw new Error('Incomplete JSON segment at the end');
      })()
    );

    const provider = new GeminiChatProvider('test-key', 'gemini-test');
    const result = await provider.streamChat(request);

    const text: string[] = [];
    for await (const chunk of result.stream) {
      text.push(chunk.text);
    }

    expect(text).toEqual(['Wkraczasz do ruin kościoła w Prabutach.']);
  });

  it('ponawia zapytanie (retry) gdy błąd Incomplete JSON segment at the end wystąpi przed emisją jakichkolwiek danych', async () => {
    mockGenerateContentStream
      .mockResolvedValueOnce(
        (async function* () {
          throw new Error('Incomplete JSON segment at the end');
        })()
      )
      .mockResolvedValueOnce(
        (async function* () {
          yield { text: 'Scena po retry.' };
        })()
      );

    const provider = new GeminiChatProvider('test-key', 'gemini-test');
    const result = await provider.streamChat(request);

    const text: string[] = [];
    for await (const chunk of result.stream) {
      text.push(chunk.text);
    }

    expect(text).toEqual(['Scena po retry.']);
    expect(mockGenerateContentStream).toHaveBeenCalledTimes(2);
  });


  it('zwraca kompletny tekst i metadane tokenów przez unarne generateContent w chat()', async () => {
    mockGenerateContent.mockResolvedValue({
      text: '{"name":"John Doe","birthplace":"Boston"}',
      usageMetadata: {
        totalTokenCount: 150,
        promptTokenCount: 100,
        candidatesTokenCount: 50,
      },
    });

    const provider = new GeminiChatProvider('test-key', 'gemini-test');
    const result = await provider.chat(request);

    expect(result.text).toBe('{"name":"John Doe","birthplace":"Boston"}');
    expect(result.usage).toMatchObject({
      totalTokens: 150,
      promptTokens: 100,
      completionTokens: 50,
    });
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(mockGenerateContentStream).not.toHaveBeenCalled();
  });

  it('ponawia zapytanie na tym samym modelu przy błędzie 429 (Too Many Requests) z exponential backoff przed zmianą modelu w kaskadzie', async () => {
    mockGenerateContentStream
      .mockRejectedValueOnce(new Error('429 RESOURCE_EXHAUSTED: Quota exceeded'))
      .mockResolvedValueOnce(
        streamResponse([
          { text: 'Odpowiedź po udanym ponowieniu 429.' },
        ])
      );

    const provider = new GeminiChatProvider('test-key', 'gemini-test');
    const result = await provider.streamChat(request);

    const text: string[] = [];
    for await (const chunk of result.stream) {
      text.push(chunk.text);
    }

    expect(text).toEqual(['Odpowiedź po udanym ponowieniu 429.']);
    expect(mockGenerateContentStream).toHaveBeenCalledTimes(2);
    // Sprawdź, czy wywołano 2 razy dla tego samego początkowego modelu 'gemini-test'
    expect(mockGenerateContentStream.mock.calls[0][0].model).toBe('gemini-test');
    expect(mockGenerateContentStream.mock.calls[1][0].model).toBe('gemini-test');
  });

  it('ponawia zapytanie w chat() przy błędzie 503 (Service Unavailable) z exponential backoff przed przejściem do fallbacku', async () => {
    mockGenerateContent
      .mockRejectedValueOnce(new Error('503 Service Unavailable: The model is overloaded.'))
      .mockResolvedValueOnce({
        text: '{"status":"ok"}',
        usageMetadata: { totalTokenCount: 50 },
      });

    const provider = new GeminiChatProvider('test-key', 'gemini-test');
    const result = await provider.chat(request);

    expect(result.text).toBe('{"status":"ok"}');
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(mockGenerateContent.mock.calls[0][0].model).toBe('gemini-test');
    expect(mockGenerateContent.mock.calls[1][0].model).toBe('gemini-test');
  });

  describe('Google API sampling & thinking deprecation migration', () => {
    it('nie dołącza temperature, topP, topK ani thinkingBudget dla nowoczesnych modeli Gemini 3.x', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Odpowiedź testowa',
        usageMetadata: { totalTokenCount: 20 },
      });

      const provider = new GeminiChatProvider('test-key', 'gemini-3.8-flash');
      const req: ChatCompletionRequest = {
        ...request,
        temperature: 0.8,
        topP: 0.95,
        geminiOptions: {
          topK: 40,
          thinkingLevel: 'high',
        },
      };

      await provider.chat(req);

      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      const callConfig = mockGenerateContent.mock.calls[0][0].config;

      // Parametry samplingu muszą być wycięte dla Gemini 3.x
      expect(callConfig.temperature).toBeUndefined();
      expect(callConfig.topP).toBeUndefined();
      expect(callConfig.topK).toBeUndefined();

      // thinkingConfig musi używać thinkingLevel z enum SDK (HIGH), bez thinkingBudget
      expect(callConfig.thinkingConfig).toEqual({ thinkingLevel: 'HIGH' });
      expect(callConfig.thinkingConfig?.thinkingBudget).toBeUndefined();
    });

    it('poprawnie obsługuje thinkingLevel minimal dla nowoczesnych modeli', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Odpowiedź minimal',
      });

      const provider = new GeminiChatProvider('test-key', 'gemini-3.8-flash');
      const req: ChatCompletionRequest = {
        ...request,
        geminiOptions: {
          thinkingLevel: 'minimal',
        },
      };

      await provider.chat(req);

      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      const callConfig = mockGenerateContent.mock.calls[0][0].config;
      expect(callConfig.thinkingConfig).toEqual({ thinkingLevel: 'MINIMAL' });
    });

    it('dołącza temperature, topP, topK oraz thinkingBudget=0 dla starszych modeli (gemini-2.5)', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Odpowiedź legacy',
      });

      const provider = new GeminiChatProvider('test-key', 'gemini-2.5-flash');
      const req: ChatCompletionRequest = {
        ...request,
        temperature: 0.7,
        topP: 0.9,
        geminiOptions: {
          topK: 20,
        },
      };

      await provider.chat(req);

      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      const callConfig = mockGenerateContent.mock.calls[0][0].config;

      // Parametry samplingu zachowane dla legacy
      expect(callConfig.temperature).toBe(0.7);
      expect(callConfig.topP).toBe(0.9);
      expect(callConfig.topK).toBe(20);

      // Dla 2.5 thinkingBudget=0 wyłączone
      expect(callConfig.thinkingConfig).toEqual({ thinkingBudget: 0 });
    });
  });
});
