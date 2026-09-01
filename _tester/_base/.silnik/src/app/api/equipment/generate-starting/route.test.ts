import type { NextRequest } from 'next/server';
import { POST } from './route';
import {
  OCCUPATION_EQUIPMENT,
  OCCUPATION_EQUIPMENT_ALIASES,
  getStartingEquipmentForOccupation,
} from '@/lib/equipment-data';

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

  it('rejects a request without an explicit era', async () => {
    const request = {
      json: async () => ({ occupation: 'journalist' }),
    } as NextRequest;

    const response = await POST(request);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Exact era or year is required',
    });
  });

  it('maps every Character Wizard occupation without falling back to default', () => {
    const occupationIds = [
      'antiquarian', 'artist', 'athlete', 'author', 'clergy', 'criminal',
      'dilettante', 'doctor', 'drifter', 'engineer', 'entertainer', 'farmer',
      'hacker', 'journalist', 'lawyer', 'librarian', 'military', 'nurse',
      'parapsychologist', 'pilot', 'police_detective', 'police_officer',
      'private_investigator', 'professor', 'sailor', 'scientist', 'soldier',
      'spy', 'tribe_member',
    ];

    expect(Object.keys(OCCUPATION_EQUIPMENT_ALIASES).sort()).toEqual(
      [...occupationIds].sort()
    );
    for (const occupationId of occupationIds) {
      expect(getStartingEquipmentForOccupation(occupationId)).toEqual(
        OCCUPATION_EQUIPMENT[OCCUPATION_EQUIPMENT_ALIASES[occupationId]]
      );
      expect(getStartingEquipmentForOccupation(occupationId)).not.toEqual(
        OCCUPATION_EQUIPMENT.default
      );
    }
  });

  it('uses the dedicated detective kits instead of the criminal kit', () => {
    expect(getStartingEquipmentForOccupation('police_detective')).toEqual(
      OCCUPATION_EQUIPMENT['Police Detective']
    );
    expect(getStartingEquipmentForOccupation('private_investigator')).toEqual(
      OCCUPATION_EQUIPMENT['Private Investigator']
    );
  });
});
