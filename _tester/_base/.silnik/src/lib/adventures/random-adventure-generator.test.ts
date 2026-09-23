import {
  generateSurpriseAdventure,
  SurpriseAdventureSeed,
} from './random-adventure-generator';
import { getSettingTrivia, getSafeDossierIntro } from '../era/setting-trivia';

describe('random-adventure-generator', () => {
  const allEras: Array<'classic' | 'gaslight' | 'noir' | 'prl' | 'modern'> = [
    'classic',
    'gaslight',
    'noir',
    'prl',
    'modern',
  ];

  it('generuje przygodę z kompletnymi polami, w tym investigatorIntro i settingTrivia', () => {
    const adv = generateSurpriseAdventure();

    expect(adv.id).toMatch(/^custom-surprise-/);
    expect(adv.title).toBeTruthy();
    expect(adv.investigatorIntro).toBeTruthy();
    expect(adv.description).toBeTruthy();
    expect(Array.isArray(adv.settingTrivia)).toBe(true);
    expect((adv.settingTrivia || []).length).toBeGreaterThanOrEqual(3);
    expect(typeof adv.activeSceneYear).toBe('number');
    expect(adv.graph?.npcs.length).toBeGreaterThan(0);
    expect(adv.graph?.locations.length).toBeGreaterThan(0);
    expect(adv.graph?.clues.length).toBeGreaterThan(0);
  });

  describe.each(allEras)('era: %s', (era) => {
    it(`generuje poprawną przygodę dla ery ${era} wraz z ciekawostkami epoki`, () => {
      const adv = generateSurpriseAdventure(era);

      expect(adv.era).toBe(era);
      expect(adv.investigatorIntro).toBeTruthy();
      expect(adv.settingTrivia?.length).toBeGreaterThanOrEqual(3);

      // Weryfikacja integracji z getSettingTrivia
      const trivia = getSettingTrivia(adv, null, 'pl');
      expect(trivia.facts).toEqual(adv.settingTrivia);
      expect(trivia.facts.length).toBeGreaterThanOrEqual(3);

      // Weryfikacja integracji z getSafeDossierIntro
      const safeIntro = getSafeDossierIntro(adv);
      expect(safeIntro).toBe(adv.investigatorIntro);
    });
  });

  it('poprawnie ustawia activeSceneYear dla poszczególnych epok', () => {
    const classic = generateSurpriseAdventure('classic');
    expect(classic.activeSceneYear).toBe(1925);

    const gaslight = generateSurpriseAdventure('gaslight');
    expect(gaslight.activeSceneYear).toBe(1892);

    const noir = generateSurpriseAdventure('noir');
    expect(noir.activeSceneYear).toBe(1937);

    const prl = generateSurpriseAdventure('prl');
    expect(prl.activeSceneYear).toBe(1976);

    const modern = generateSurpriseAdventure('modern');
    expect(modern.activeSceneYear).toBe(2024);
  });
});
