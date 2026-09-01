import type { NextRequest } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { resolveEraContext } from '@/lib/era';
import { clearHistoricalResearchCache } from '@/lib/world-setup';
import { POST } from './route';

const mockGenerateContent = jest.fn();

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: { generateContent: mockGenerateContent },
  })),
}));

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

function request(body: unknown): NextRequest {
  return {
    json: async () => body,
    headers: { get: () => 'test-key' },
  } as unknown as NextRequest;
}

describe('POST /api/adventure/setup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearHistoricalResearchCache();
  });

  it('odrzuca brak dokładnego kraju przed wywołaniem modelu', async () => {
    const eraContext = resolveEraContext({
      userSelection: { year: 1973 },
    });
    const response = await POST(
      request({ adventureText: 'Test', eraContext, characters: [] })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: 'COUNTRY_REQUIRED',
    });
    expect(GoogleGenAI).not.toHaveBeenCalled();
  });

  it('zwraca 422, gdy model nie zbudował krytycznego grafu przygody', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        conflicts: [],
        setupAsymmetry: {},
      }),
    });
    const eraContext = resolveEraContext({
      userSelection: { year: 1973, country: 'Polska' },
    });
    const response = await POST(
      request({ adventureText: 'Test', eraContext, characters: [] })
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      code: 'WORLD_SETUP_BLOCKED',
      worldSetup: {
        eraContext: { effectiveYear: 1973, countryCode: 'PL' },
        phaseResults: expect.arrayContaining([
          expect.objectContaining({
            phase: 'adventure-graph',
            status: 'failed',
            critical: true,
          }),
        ]),
      },
    });
  });

  it('odrzuca szeroki zakres własnego scenariusza bez wyboru roku', async () => {
    const eraContext = resolveEraContext({
      userSelection: { year: 1983, country: 'Polska' },
    });
    const response = await POST(
      request({
        adventureText: 'Test',
        eraContext,
        characters: [],
        isCustomScenario: true,
        scenarioYearRange: '1983-1999',
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: 'YEAR_SELECTION_REQUIRED',
    });
    expect(GoogleGenAI).not.toHaveBeenCalled();
  });

  it('przepuszcza neutralny fallback researchu, gdy graf jest poprawny', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        conflicts: [
          {
            resource: 'Archiwum',
            factions: [
              { id: 'a', name: 'A', description: '', goal: '', motivation: '' },
              { id: 'b', name: 'B', description: '', goal: '', motivation: '' },
            ],
          },
        ],
        setupAsymmetry: {},
      }),
    });
    const eraContext = resolveEraContext({
      userSelection: { year: 1973, country: 'Polska' },
    });
    const response = await POST(
      request({ adventureText: 'Test', eraContext, characters: [] })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      worldSetup: {
        phaseResults: expect.arrayContaining([
          expect.objectContaining({
            phase: 'historical-research',
            status: 'degraded',
            critical: false,
          }),
        ]),
      },
    });
  });

  it('wykonuje Google Search tylko w preflight i zapisuje dopuszczone źródła', async () => {
    mockGenerateContent
      .mockResolvedValueOnce({
        text: 'Kontekst z archiwum.',
        candidates: [{
          groundingMetadata: {
            groundingChunks: [{
              web: {
                domain: 'nac.gov.pl',
                title: 'Narodowe Archiwum Cyfrowe',
                uri: 'https://nac.gov.pl/example',
              },
            }],
          },
        }],
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({
          conflicts: [{
            resource: 'Archiwum',
            factions: [
              { id: 'a', name: 'A', description: '', goal: '', motivation: '' },
              { id: 'b', name: 'B', description: '', goal: '', motivation: '' },
            ],
          }],
          setupAsymmetry: {},
        }),
      });
    const eraContext = resolveEraContext({
      userSelection: { year: 1973, country: 'Polska' },
    });

    const response = await POST(
      request({ adventureText: 'Test', eraContext, characters: [] })
    );

    expect(response.status).toBe(200);
    expect(mockGenerateContent).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        config: expect.objectContaining({ tools: [{ googleSearch: {} }] }),
      })
    );
    await expect(response.json()).resolves.toMatchObject({
      worldSetup: {
        sources: [expect.objectContaining({
          url: 'https://nac.gov.pl/example',
          verificationStatus: 'verified',
        })],
        phaseResults: expect.arrayContaining([
          expect.objectContaining({
            phase: 'historical-research',
            status: 'passed',
          }),
        ]),
      },
    });
  });
});
