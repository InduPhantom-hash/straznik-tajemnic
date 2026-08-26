import {
  createEraFingerprint,
  EraResolutionError,
  resolveEraContext,
  resolveEraRegion,
} from './resolve-era-context';
import { findEraRuleProfiles, isAvailableInEra } from './registry';

function expectEraError(
  run: () => unknown,
  code: EraResolutionError['code']
): void {
  try {
    run();
    throw new Error(`Oczekiwano błędu epoki ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(EraResolutionError);
    expect((error as EraResolutionError).code).toBe(code);
  }
}

describe('resolveEraContext', () => {
  it('stawia aktualny rok sceny ponad zakresem scenariusza i wyborem użytkownika', () => {
    const result = resolveEraContext({
      sceneDate: { year: 2001, month: 11, day: 14 },
      adventure: {
        yearRange: '1920-1925',
        country: 'Polska',
        era: 'modern',
        eraLabel: 'Współczesność',
      },
      userSelection: { year: 1995, country: 'USA' },
    });

    expect(result).toMatchObject({
      schemaVersion: 1,
      sceneDate: '2001-11-14',
      effectiveYear: 2001,
      countryCode: 'PL',
      regionProfile: 'PL',
      source: 'scene-time',
      rulesVersion: '1.0.0',
    });
  });

  it('używa pierwszego roku scenariusza, gdy zegar sceny nie jest dostępny', () => {
    const result = resolveEraContext({
      adventure: {
        yearRange: '1973-1974',
        country: 'Polska',
        era: 'modern',
      },
      userSelection: { year: 2001 },
    });

    expect(result.effectiveYear).toBe(1973);
    expect(result.source).toBe('scenario-range');
  });

  it('korzysta z jawnego wyboru użytkownika bez cichego fallbacku', () => {
    const result = resolveEraContext({
      userSelection: { year: 1995, country: 'United Kingdom' },
    });

    expect(result).toMatchObject({
      effectiveYear: 1995,
      countryCode: 'GB',
      regionProfile: 'GB',
      source: 'user-selection',
    });
  });

  it('ignoruje legacy era i eraLabel jako źródła roku', () => {
    expectEraError(
      () =>
        resolveEraContext({
          adventure: { era: 'classic', eraLabel: 'Klasyczne lata 20.' },
        }),
      'MISSING_YEAR'
    );
  });

  it('nie zamienia braku roku na 1920', () => {
    expectEraError(
      () => resolveEraContext({ adventure: { country: 'Polska' } }),
      'MISSING_YEAR'
    );
  });

  it('wymaga jawnego profilu dla przyszłości poza rejestrem', () => {
    expectEraError(
      () =>
        resolveEraContext({
          sceneDate: { year: 2035 },
          adventure: { country: 'Polska' },
        }),
      'CUSTOM_PROFILE_REQUIRED'
    );
  });

  it('przyjmuje przyszły rok z jawnym profilem custom', () => {
    const result = resolveEraContext({
      sceneDate: { year: 2035 },
      customProfile: {
        id: 'future-cyberpunk-2035',
        year: 2035,
        country: 'PL',
        rulesVersion: 'future-1.0.0',
      },
    });

    expect(result).toMatchObject({
      effectiveYear: 2035,
      customProfileId: 'future-cyberpunk-2035',
      rulesVersion: 'future-1.0.0',
    });
  });

  it('tworzy różne fingerprinty dla roku, regionu i wersji reguł', () => {
    const pl2001 = resolveEraContext({
      userSelection: { year: 2001, country: 'PL' },
    });
    const us2001 = resolveEraContext({
      userSelection: { year: 2001, country: 'US' },
    });
    const pl1995 = resolveEraContext({
      userSelection: { year: 1995, country: 'PL' },
    });

    expect(createEraFingerprint(pl2001)).not.toBe(createEraFingerprint(us2001));
    expect(createEraFingerprint(pl2001)).not.toBe(createEraFingerprint(pl1995));
  });
});

describe('resolveEraRegion', () => {
  it.each([
    ['Polska', 'PL', 'PL'],
    ['United States', 'US', 'US'],
    ['Wielka Brytania', 'GB', 'GB'],
    ['DE', 'DE', 'GLOBAL'],
    ['Nieznany kraj', 'ZZ', 'GLOBAL'],
  ])('mapuje %s na kod %s i profil %s', (input, countryCode, regionProfile) => {
    expect(resolveEraRegion(input)).toEqual({ countryCode, regionProfile });
  });
});

describe('rejestr reguł epoki', () => {
  it('rozróżnia ten sam rok w Polsce i USA', () => {
    expect(
      findEraRuleProfiles(1973, 'PL').map((profile) => profile.id)
    ).toEqual(['pl-1973']);
    expect(findEraRuleProfiles(1973, 'US')).toEqual([]);
  });

  it('sprawdza domknięte granice validFrom i validTo', () => {
    const window = { validFrom: 2000, validTo: 2006, regions: ['PL'] as const };
    expect(isAvailableInEra(window, 2000, 'PL')).toBe(true);
    expect(isAvailableInEra(window, 2006, 'PL')).toBe(true);
    expect(isAvailableInEra(window, 2007, 'PL')).toBe(false);
    expect(isAvailableInEra(window, 2001, 'US')).toBe(false);
  });
});
