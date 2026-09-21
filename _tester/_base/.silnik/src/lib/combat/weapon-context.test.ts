import { buildPlayerWeaponContext, inferWeaponDamage, inferWeaponSkill, isWeapon } from './weapon-context';
import type { Character } from '@/lib/types';
import type { ResolvedEraContext } from '@/lib/era/types';

describe('weapon-context', () => {
  const sampleCharacter = {
    id: 'char-1',
    name: 'Edward Carnby',
    occupation: 'Detektyw',
    age: 35,
    background: 'Detektyw w Nowym Orleanie',
    str: 60,
    dex: 70,
    con: 50,
    app: 50,
    pow: 60,
    edu: 70,
    siz: 65,
    int: 75,
    luck: 50,
    hp: 11,
    san: 60,
    mp: 12,
    skills: {
      'Broń Palna': 65,
      'Walka Wręcz': 50,
    },
    equipment: [
      {
        id: 'eq-1',
        name: 'Rewolwer .38',
        category: 'weapon',
        modifiers: {
          damage: '1d10',
          range: '15 yards',
        },
      },
      {
        id: 'eq-2',
        name: 'Nóż myśliwski',
        category: 'weapon',
        modifiers: {
          damage: '1d4+2',
        },
      },
    ],
  } as unknown as Character;

  it('recognizes weapons correctly', () => {
    expect(isWeapon({ id: '1', name: 'Rewolwer .38', category: 'weapon' })).toBe(true);
    expect(isWeapon({ id: '2', name: 'Latarka elektryczna', category: 'tool' })).toBe(false);
  });

  it('infers weapon skill correctly', () => {
    expect(inferWeaponSkill({ name: 'Rewolwer .38' })).toBe('Broń Palna');
    expect(inferWeaponSkill({ name: 'Karabin Springfield' })).toBe('Broń Palna (Karabin)');
    expect(inferWeaponSkill({ name: 'Nóż bojowy' })).toBe('Walka Wręcz');
  });

  it('infers weapon damage and default range', () => {
    const handgun = inferWeaponDamage({ id: '1', name: 'Pistolet Colt', category: 'personal' });
    expect(handgun).toEqual({ damage: '1d10', range: '15 yards' });
  });

  it('formats weapon range in metric for PL context in buildPlayerWeaponContext', () => {
    const eraContextPl: ResolvedEraContext = {
      schemaVersion: 1,
      sceneDate: null,
      effectiveYear: 1925,
      regionProfile: 'PL',
      countryCode: 'PL',
      measurementSystem: 'metric',
      source: 'scenario-range',
      rulesVersion: '1.0',
    };

    const prompt = buildPlayerWeaponContext(sampleCharacter, eraContextPl, 'pl');
    expect(prompt).toContain('## UZBROJENIE POSTACI');
    expect(prompt).toContain('Rewolwer .38');
    expect(prompt).toContain('zasięg 15 m');
  });

  it('formats weapon range in imperial for US context in buildPlayerWeaponContext', () => {
    const eraContextUs: ResolvedEraContext = {
      schemaVersion: 1,
      sceneDate: null,
      effectiveYear: 1920,
      regionProfile: 'US',
      countryCode: 'US',
      measurementSystem: 'imperial',
      source: 'scenario-range',
      rulesVersion: '1.0',
    };

    const promptPl = buildPlayerWeaponContext(sampleCharacter, eraContextUs, 'pl');
    expect(promptPl).toContain('zasięg 15 jardów');

    const promptEn = buildPlayerWeaponContext(sampleCharacter, eraContextUs, 'en');
    expect(promptEn).toContain('zasięg 15 yards');
  });
});
