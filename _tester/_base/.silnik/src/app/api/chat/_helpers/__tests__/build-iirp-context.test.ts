import {
  buildIIRPWeaponLawContext,
  isIIRPSetting,
  buildAdditionalContext,
} from '../build-context';
import type { GameContext } from '@/lib/prompt-section-parser';
import type { Character } from '@/lib/types';
import type { ResolvedEraContext } from '@/lib/era/types';

describe('buildIIRPWeaponLawContext (Podrecznik Badacza CoC 7ed, s. 214-216)', () => {
  it('generuje poprawny kontekst prawny po polsku', () => {
    const section = buildIIRPWeaponLawContext('1920s-poland', 'Warszawa', 'pl');

    expect(section).toContain('PRAWO I POSIADANIE BRONI W II RZECZYPOSPOLITEJ');
    expect(section).toContain('Dekret z 25 stycznia 1919 r.');
    expect(section).toContain('Starosta Powiatowy');
    expect(section).toContain('Komisarz Rządu');
    expect(section).toContain('Pas graniczny (20 km)');
    expect(section).toContain('KOP');
    expect(section).toContain('Policji Państwowej');
    expect(section).toContain('Mauser wz. 29');
  });

  it('generuje symetryczny kontekst prawny po angielsku', () => {
    const section = buildIIRPWeaponLawContext('1920s-poland', 'Warsaw', 'en');

    expect(section).toContain('WEAPON LAWS & FIREARMS IN INTERWAR POLAND');
    expect(section).toContain('Decree of January 25, 1919');
    expect(section).toContain('Starosta Discretion');
    expect(section).toContain('Border Zone (20 km)');
    expect(section).toContain('KOP');
    expect(section).toContain('Policja Panstwowa');
  });
});

describe('isIIRPSetting', () => {
  it('rozpoznaje epoke 1920s-poland oraz 1920s-pl', () => {
    expect(isIIRPSetting('1920s-poland')).toBe(true);
    expect(isIIRPSetting('1920s-pl')).toBe(true);
    expect(isIIRPSetting('iirp')).toBe(true);
  });

  it('rozpoznaje postac osadzona w II RP', () => {
    const mockChar = {
      id: 'char-1',
      name: 'Jan Kowalski',
      era: '1920s-poland',
    } as Character;

    expect(isIIRPSetting(undefined, undefined, undefined, [mockChar])).toBe(true);
  });

  it('rozpoznaje ResolvedEraContext dla Polski z okresu miedzywojennego', () => {
    const mockResolvedContext: ResolvedEraContext = {
      schemaVersion: 1,
      sceneDate: '1925-06-15',
      effectiveYear: 1925,
      countryCode: 'PL',
      regionProfile: 'PL',
      source: 'scene-time',
      rulesVersion: '1.0.0',
    };

    expect(isIIRPSetting(undefined, undefined, mockResolvedContext)).toBe(true);
  });

  it('rozpoznaje polska lokacje w polaczeniu z era 1920s', () => {
    expect(isIIRPSetting('1920s', 'Warszawa, Dworzec Główny')).toBe(true);
    expect(isIIRPSetting('1920s', 'Kraków, Rynek')).toBe(true);
  });

  it('zwraca false dla klasycznego USA 1920s lub er wspolczesnych', () => {
    expect(isIIRPSetting('1920s', 'Boston, MA')).toBe(false);
    expect(isIIRPSetting('modern', 'Warszawa')).toBe(false);
    expect(isIIRPSetting('1920s-us')).toBe(false);
  });
});

describe('buildAdditionalContext z prawem o broni II RP', () => {
  const dummyGameContext: GameContext = {
    mode: 'investigation',
    hasNPCs: false,
    recentSANLoss: false,
    findingDocument: false,
    inDarkness: false,
    nightTime: false,
  };

  it('automatycznie wstrzykuje sekcje prawa o broni w erze 1920s-poland', () => {
    const result = buildAdditionalContext({
      timePromptSection: 'Time Section',
      gmProtocol: 'GM Protocol',
      gameContext: dummyGameContext,
      resolvedCachedContent: null,
      era: '1920s-poland',
      currentLocation: 'Warszawa',
    });

    const hasWeaponLaw = result.some((section) =>
      section.includes('PRAWO I POSIADANIE BRONI W II RZECZYPOSPOLITEJ')
    );
    expect(hasWeaponLaw).toBe(true);
  });

  it('nie wstrzykuje sekcji prawa o broni w erze 1920s USA', () => {
    const result = buildAdditionalContext({
      timePromptSection: 'Time Section',
      gmProtocol: 'GM Protocol',
      gameContext: dummyGameContext,
      resolvedCachedContent: null,
      era: '1920s',
      currentLocation: 'Arkham, MA',
    });

    const hasWeaponLaw = result.some((section) =>
      section.includes('PRAWO I POSIADANIE BRONI W II RZECZYPOSPOLITEJ')
    );
    expect(hasWeaponLaw).toBe(false);
  });

  it('pozwala na bezposrednie nadpisanie sekcji przez iirpWeaponLawSection', () => {
    const customSection = '## NIESTANDARDOVE PRAWO O BRONI';
    const result = buildAdditionalContext({
      timePromptSection: 'Time Section',
      gmProtocol: 'GM Protocol',
      gameContext: dummyGameContext,
      resolvedCachedContent: null,
      iirpWeaponLawSection: customSection,
    });

    expect(result).toContain(customSection);
  });
});
