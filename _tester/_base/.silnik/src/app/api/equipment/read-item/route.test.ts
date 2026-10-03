import { POST } from './route';
import { GoogleGenAI } from '@google/genai';
import type { NextRequest } from 'next/server';
import { resolveEraContext } from '@/lib/era';

jest.mock('@google/genai', () => {
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => {
      return {
        models: {
          generateContent: jest.fn().mockResolvedValue({
            text: 'Mroczny tekst dokumentu z roku 1973...',
          }),
        },
      };
    }),
  };
});

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

function mockRequest(body: unknown, apiKeyHeader?: string): NextRequest {
  const headersMap = new Map<string, string>();
  if (apiKeyHeader) {
    headersMap.set('x-gemini-api-key', apiKeyHeader);
  }
  return {
    headers: {
      get: (name: string) => headersMap.get(name.toLowerCase()) || null,
    },
    json: async () => body,
  } as unknown as NextRequest;
}

describe('read-item api route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-key';
  });

  it('should return error when no api key', async () => {
    process.env.GEMINI_API_KEY = '';
    const req = mockRequest({ item: { name: 'List' } });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain('Gemini API');
  });

  it('should generate content when parameters are valid', async () => {
    const req = mockRequest({
      item: { name: 'List' },
      character: { name: 'Marcus' },
      adventureContext: { eraLabel: 'Polska 1973' },
      eraContext: resolveEraContext({
        userSelection: { year: 1973, country: 'Polska' },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.content).toBe('Mroczny tekst dokumentu z roku 1973...');
  });

  it('odrzuca brak dokładnego kontekstu epoki przed wywołaniem modelu', async () => {
    const req = mockRequest({ item: { name: 'List' } });

    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(GoogleGenAI).not.toHaveBeenCalled();
  });

  it('zwraca kod 402 i BYOK_CREDITS_DEPLETED gdy Google GenAI zgłosi wyczerpanie środków', async () => {
    const mockGenerateContent = jest.fn().mockRejectedValue(
      new Error(
        '{"error":{"code":402,"message":"Your prepayment credits are depleted. Please go to AI Studio at https://ai.studio/projects to manage your project and billing. Learn more at https://ai.google.dev/gemini-api/docs/billing#prepay. ","status":"RESOURCE_EXHAUSTED"}}'
      )
    );
    (GoogleGenAI as unknown as jest.Mock).mockImplementationOnce(() => ({
      models: { generateContent: mockGenerateContent },
    }));

    const req = mockRequest({
      item: { name: 'Notatnik i ołówek' },
      eraContext: resolveEraContext({
        userSelection: { year: 1924, country: 'USA' },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(402);
    const data = await res.json();
    expect(data.code).toBe('BYOK_CREDITS_DEPLETED');
    expect(data.error).toContain('środki przedpłacone');
    expect(data.error).not.toContain('{"error":');
  });

  it('zwraca kod 429 i BYOK_QUOTA_EXCEEDED gdy Google GenAI zgłosi przekroczenie limitu zapytań', async () => {
    const mockGenerateContent = jest.fn().mockRejectedValue({
      status: 429,
      message: 'RESOURCE_EXHAUSTED: Quota exceeded for quota metric',
    });
    (GoogleGenAI as unknown as jest.Mock).mockImplementationOnce(() => ({
      models: { generateContent: mockGenerateContent },
    }));

    const req = mockRequest({
      item: { name: 'Notatnik i ołówek' },
      eraContext: resolveEraContext({
        userSelection: { year: 1924, country: 'USA' },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.code).toBe('BYOK_QUOTA_EXCEEDED');
    expect(data.error).toContain('limit zapytań');
  });
});

