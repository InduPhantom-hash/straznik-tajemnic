import { TextDecoder, TextEncoder } from 'node:util';
import { ReadableStream as NodeReadableStream } from 'node:stream/web';
import { parseSSEStream, collectSSEText, createSseParseErrorHandler } from './sse-parser';
import * as Sentry from '@sentry/nextjs';

Object.assign(globalThis, {
  TextDecoder,
  TextEncoder,
  ReadableStream: NodeReadableStream,
});

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}));

function createMockStreamResponse(chunks: string[], throwAtEnd = false): Response {
  const encoder = new TextEncoder();
  let index = 0;

  const stream = new NodeReadableStream({
    async pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index]));
        index++;
      } else {
        if (throwAtEnd) {
          controller.error(new Error('Network stream aborted'));
        } else {
          controller.close();
        }
      }
    },
  });

  return {
    body: stream as unknown as ReadableStream<Uint8Array>,
  } as unknown as Response;
}

describe('sse-parser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseSSEStream', () => {
    it('poprawnie przetwarza kompletne zdarzenia tekstowe i metadane', async () => {
      const chunks = [
        'data: {"type":"text","content":"Wkraczasz do "}\n\n',
        'data: {"type":"text","content":"posępnego dworu."}\n\n',
        'data: {"type":"metadata","finishReason":"STOP","illustrations":[]}\n\n',
      ];
      const response = createMockStreamResponse(chunks);

      const onText = jest.fn();
      const onMetadata = jest.fn();

      const fullText = await parseSSEStream(response, { onText, onMetadata });

      expect(fullText).toBe('Wkraczasz do posępnego dworu.');
      expect(onText).toHaveBeenCalledTimes(2);
      expect(onText).toHaveBeenNthCalledWith(1, 'Wkraczasz do ');
      expect(onText).toHaveBeenNthCalledWith(2, 'Wkraczasz do posępnego dworu.');

      expect(onMetadata).toHaveBeenCalledTimes(1);
      expect(onMetadata).toHaveBeenCalledWith({
        type: 'metadata',
        finishReason: 'STOP',
        illustrations: [],
      });
    });

    it('radzi sobie z podziałem linii i tokenów JSON na granicy chunków TCP', async () => {
      const chunks = [
        'data: {"type":"text","con',
        'tent":"Tajemnicza postać zbli',
        'ża się."}\n\ndata: {"type":"metadata","finishReason":"MAX_TOKENS"}\n\n',
      ];
      const response = createMockStreamResponse(chunks);

      const onText = jest.fn();
      const onMetadata = jest.fn();

      const fullText = await parseSSEStream(response, { onText, onMetadata });

      expect(fullText).toBe('Tajemnicza postać zbliża się.');
      expect(onText).toHaveBeenCalledWith('Tajemnicza postać zbliża się.');
      expect(onMetadata).toHaveBeenCalledWith({
        type: 'metadata',
        finishReason: 'MAX_TOKENS',
      });
    });

    it('obsługuje flush bufora bez końcowego znaku nowej linii', async () => {
      const chunks = [
        'data: {"type":"text","content":"Pojedyncza linia bez entera"}',
      ];
      const response = createMockStreamResponse(chunks);

      const onText = jest.fn();
      const fullText = await parseSSEStream(response, { onText });

      expect(fullText).toBe('Pojedyncza linia bez entera');
      expect(onText).toHaveBeenCalledWith('Pojedyncza linia bez entera');
    });

    it('ignoruje linie niebędące formatem data:', async () => {
      const chunks = [
        ': ping\n\n',
        'event: message\n\n',
        'data: {"type":"text","content":"Prawdziwa treść"}\n\n',
      ];
      const response = createMockStreamResponse(chunks);

      const onText = jest.fn();
      const fullText = await parseSSEStream(response, { onText });

      expect(fullText).toBe('Prawdziwa treść');
      expect(onText).toHaveBeenCalledTimes(1);
    });

    it('wywołuje onParseError przy uszkodzonym JSON i kontynuuje przetwarzanie kolejnych linii', async () => {
      const chunks = [
        'data: {niepoprawny json}\n\n',
        'data: {"type":"text","content":"Poprawny tekst"}\n\n',
      ];
      const response = createMockStreamResponse(chunks);

      const onParseError = jest.fn();
      const onText = jest.fn();

      const fullText = await parseSSEStream(response, { onText, onParseError });

      expect(onParseError).toHaveBeenCalledTimes(1);
      expect(onParseError).toHaveBeenCalledWith(
        expect.any(SyntaxError),
        'data: {niepoprawny json}'
      );
      expect(fullText).toBe('Poprawny tekst');
    });

    it('zwalnia blokadę czytnika (releaseLock) nawet w przypadku błędu strumienia', async () => {
      const chunks = ['data: {"type":"text","content":"Początek"}\n\n'];
      const response = createMockStreamResponse(chunks, true);

      await expect(parseSSEStream(response)).rejects.toThrow('Network stream aborted');
      const newReader = response.body?.getReader();
      expect(newReader).toBeDefined();
      newReader?.releaseLock();
    });

    it('rzuca błąd gdy response.body jest puste', async () => {
      const emptyResponse = {
        body: null,
      } as unknown as Response;

      await expect(parseSSEStream(emptyResponse)).rejects.toThrow(
        'Nie udało się utworzyć czytnika strumienia.'
      );
    });
  });

  describe('collectSSEText', () => {
    it('zwraca połączony tekst ze wszystkich chunków tekstu', async () => {
      const chunks = [
        'data: {"type":"text","content":"Część 1. "}\n\n',
        'data: {"type":"text","content":"Część 2."}\n\n',
        'data: {"type":"metadata","finishReason":"STOP"}\n\n',
      ];
      const response = createMockStreamResponse(chunks);

      const result = await collectSSEText(response);
      expect(result).toBe('Część 1. Część 2.');
    });
  });

  describe('createSseParseErrorHandler', () => {
    it('ignoruje błędy SyntaxError (częściowe chunki bufora)', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const handler = createSseParseErrorHandler({
        endpoint: '/api/chat',
        hook: 'useChat',
      });

      handler(new SyntaxError('Unexpected token in JSON'), 'data: {"partial');

      expect(consoleSpy).not.toHaveBeenCalled();
      expect(Sentry.captureException).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('eskaluje inne wyjątki do Sentry i konsoli (np. błędy w callbackach)', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const handler = createSseParseErrorHandler({
        endpoint: '/api/chat',
        hook: 'useChat',
      });

      const runtimeError = new TypeError('Cannot read property of undefined');
      handler(runtimeError, 'data: {"type":"metadata"}');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[useChat] Błąd w callbacku SSE (/api/chat):',
        runtimeError,
        { rawLine: 'data: {"type":"metadata"}' }
      );
      expect(Sentry.captureException).toHaveBeenCalledWith(
        runtimeError,
        expect.objectContaining({
          tags: { feature: 'chat-sse', hook: 'useChat' },
          extra: { endpoint: '/api/chat', rawLine: 'data: {"type":"metadata"}' },
        })
      );
      consoleSpy.mockRestore();
    });
  });
});
