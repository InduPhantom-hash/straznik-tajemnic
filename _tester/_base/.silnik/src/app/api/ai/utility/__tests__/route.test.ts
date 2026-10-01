import { TextEncoder, TextDecoder } from 'node:util';
import { ReadableStream as NodeReadableStream } from 'node:stream/web';
import type { NextRequest } from 'next/server';

class MockResponse {
  body: ReadableStream<Uint8Array> | null;
  status: number;
  headers: Headers;

  constructor(body: ReadableStream<Uint8Array> | null, init?: { status?: number; headers?: Record<string, string> }) {
    this.body = body;
    this.status = init?.status ?? 200;
    this.headers = new Headers(init?.headers);
  }

  async text() {
    if (!this.body) return '';
    const reader = this.body.getReader();
    const decoder = new TextDecoder();
    let result = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += decoder.decode(value, { stream: true });
    }
    return result;
  }
}

Object.assign(globalThis, {
  TextDecoder,
  TextEncoder,
  ReadableStream: NodeReadableStream,
});

if (typeof globalThis.Response === 'undefined') {
  Object.defineProperty(globalThis, 'Response', { value: MockResponse });
}

import { POST } from '../route';

const mockChat = jest.fn();

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

jest.mock('@/lib/ai-providers', () => ({
  GeminiChatProvider: jest.fn().mockImplementation(() => ({
    chat: mockChat,
  })),
}));

function createMockRequest(body: unknown, headers: Record<string, string> = {}) {
  return {
    headers: {
      get: (key: string) => headers[key] ?? null,
    },
    json: async () => body,
  } as unknown as NextRequest;
}

describe('POST /api/ai/utility', () => {
  beforeEach(() => {
    mockChat.mockReset();
    delete process.env.GEMINI_API_KEY;
  });

  it('zwraca 401 gdy brak klucza API w nagłówku i w env', async () => {
    const req = createMockRequest({ message: 'Wygeneruj dane' });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.code).toBe('BYOK_KEY_MISSING');
  });

  it('zwraca 400 gdy treść wiadomości jest pusta', async () => {
    const req = createMockRequest(
      { message: '' },
      { 'X-Gemini-Api-Key': 'test-key' }
    );

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Brak promptu');
  });

  it('wywołuje provider.chat i zwraca odpowiedź w formacie SSE', async () => {
    mockChat.mockResolvedValue({
      text: '{"name": "Arthur Pendelton", "birthplace": "Boston"}',
      usage: null,
    });

    const req = createMockRequest(
      {
        message: 'Wygeneruj postać',
        json: true,
        responseMimeType: 'application/json',
      },
      { 'X-Gemini-Api-Key': 'test-key' }
    );

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');

    const bodyText = await res.text();
    expect(bodyText).toContain(
      'data: {"type":"text","content":"{\\"name\\": \\"Arthur Pendelton\\", \\"birthplace\\": \\"Boston\\"}"}\n\n'
    );
    expect(bodyText).toContain('data: {"type":"metadata"}\n\n');

    expect(mockChat).toHaveBeenCalledWith(
      expect.objectContaining({
        userMessage: 'Wygeneruj postać',
        geminiOptions: expect.objectContaining({
          responseMimeType: 'application/json',
        }),
      })
    );
  });
});
