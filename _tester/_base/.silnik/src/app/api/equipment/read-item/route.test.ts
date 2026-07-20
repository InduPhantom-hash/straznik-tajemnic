import { POST } from './route';
import { GoogleGenAI } from '@google/genai';

jest.mock('@google/genai', () => {
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => {
      return {
        models: {
          generateContent: jest.fn().mockResolvedValue({
            text: 'Mroczny tekst dokumentu z roku 1920...',
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

function mockRequest(body: unknown, apiKeyHeader?: string): Request {
  const headersMap = new Map<string, string>();
  if (apiKeyHeader) {
    headersMap.set('x-gemini-api-key', apiKeyHeader);
  }
  return {
    headers: {
      get: (name: string) => headersMap.get(name.toLowerCase()) || null,
    },
    json: async () => body,
  } as unknown as Request;
}

describe('read-item api route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-key';
  });

  it('should return error when no api key', async () => {
    process.env.GEMINI_API_KEY = '';
    const req = mockRequest({ item: { name: 'List' } });

    const res = await POST(req as any);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain('Gemini API');
  });

  it('should generate content when parameters are valid', async () => {
    const req = mockRequest({
      item: { name: 'List' },
      character: { name: 'Marcus' },
      adventureContext: { eraLabel: '1920s' },
    });

    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.content).toBe('Mroczny tekst dokumentu z roku 1920...');
  });
});

