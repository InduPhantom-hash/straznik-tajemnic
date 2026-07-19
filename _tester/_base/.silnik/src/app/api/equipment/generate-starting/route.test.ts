import type { NextRequest } from 'next/server';
import { POST } from './route';

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

describe('POST /api/equipment/generate-starting', () => {
  it('uses catalog metadata and the requested visual era', async () => {
    const previousKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
      const request = {
        json: async () => ({
          occupation: 'Private Investigator',
          era: '1946',
        }),
      } as NextRequest;

      const response = await POST(request);
      const payload = await response.json();
      const revolver = payload.equipment.find(
        (item: { templateId?: string }) =>
          item.templateId === 'weapon.revolver-38'
      );

      expect(response.status).toBe(200);
      expect(revolver).toMatchObject({
        visualSource: 'catalog',
        imageUrl: '/equipment/catalog/revolver-1940s.webp',
      });
    } finally {
      if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = previousKey;
    }
  });
});
