import type { NextRequest } from 'next/server';
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

function request(): NextRequest {
  return {
    headers: { get: () => 'test-key' },
    json: async () => ({
      geminiFileUri: 'gemini://adventure',
      geminiMimeType: 'application/pdf',
      fileName: 'scenario.pdf',
    }),
  } as unknown as NextRequest;
}

describe('POST /api/adventure/analyze', () => {
  beforeEach(() => jest.clearAllMocks());

  it('nie tworzy fallbacku 1920, gdy model nie ustalił roku i kraju', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        multipleAdventures: false,
        adventures: [
          {
            title: 'Scenariusz bez metadanych',
            graph: { npcs: [], locations: [], clues: [], connections: [] },
          },
        ],
      }),
    });

    const response = await POST(request());

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      code: 'ERA_METADATA_REQUIRED',
      invalidAdventures: [
        { index: 0, issues: expect.arrayContaining(['yearRange', 'country']) },
      ],
    });
  });
});
