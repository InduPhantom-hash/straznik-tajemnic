import { resolveEraContext } from '@/lib/era';
import type { VisualSceneSpec } from './types';
import {
  assertExactEraContext,
  validateVisualSceneSpec,
  WorldSetupValidationError,
} from './validation';

const eraContext = resolveEraContext({
  userSelection: { year: 2001, country: 'Polska' },
});

describe('world setup validation', () => {
  it('blocks a custom scenario without an exact country', () => {
    const unknownCountry = resolveEraContext({
      userSelection: { year: 2001 },
    });
    expect(() => assertExactEraContext(unknownCountry)).toThrow(
      expect.objectContaining<Partial<WorldSetupValidationError>>({ code: 'COUNTRY_REQUIRED' })
    );
  });

  it('rejects office equipment placed on a car dashboard', () => {
    const spec: VisualSceneSpec = {
      schemaVersion: 1,
      subject: 'Samochód na ulicy',
      location: 'Polska, małe miasto',
      eraContext,
      entities: [
        { id: 'car', name: 'samochód kombi', kind: 'vehicle' },
        { id: 'monitor', name: 'monitor komputerowy CRT', kind: 'equipment' },
      ],
      spatialRelations: [
        { subjectId: 'monitor', relation: 'on', objectId: 'car' },
      ],
      forbidden: ['sprzęt biurowy w samochodzie'],
    };

    expect(validateVisualSceneSpec(spec)).toEqual([
      expect.stringContaining('wnętrze biura w samochodzie'),
    ]);
  });

  it('accepts a computer visible through a separate office window behind the car', () => {
    const spec: VisualSceneSpec = {
      schemaVersion: 1,
      subject: 'Samochód przed biurem',
      location: 'Polska, małe miasto',
      eraContext,
      entities: [
        { id: 'car', name: 'samochód kombi', kind: 'vehicle' },
        { id: 'office', name: 'biuro', kind: 'building' },
        { id: 'monitor', name: 'monitor komputerowy CRT', kind: 'equipment', placement: 'na biurku w zamkniętym biurze' },
      ],
      spatialRelations: [
        { subjectId: 'monitor', relation: 'inside', objectId: 'office' },
        { subjectId: 'office', relation: 'behind', objectId: 'car' },
      ],
      forbidden: ['sprzęt biurowy we wnętrzu samochodu'],
    };

    expect(validateVisualSceneSpec(spec)).toEqual([]);
  });
});
