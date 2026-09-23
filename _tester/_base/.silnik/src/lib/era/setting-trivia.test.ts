import { getSettingTrivia, getSafeDossierIntro } from './setting-trivia';
import type { AdventureContext } from '@/lib/types';
import type { ResolvedEraContext } from '@/lib/era';

describe('setting-trivia', () => {
  it('używa dedykowanych ciekawostek z adventureContext gdy są podane', () => {
    const mockAdventure: AdventureContext = {
      title: 'Cień nad Prabutami',
      location: 'Prabuty',
      country: 'Polska',
      settingTrivia: [
        'Ciekawostka o SB i inwigilacji w PRL.',
        'Dowody tożsamości w PRL były obowiązkowe.',
      ],
    };

    const trivia = getSettingTrivia(mockAdventure, null, 'pl');
    expect(trivia.title).toBe('Realia Epoki i Świata');
    expect(trivia.facts).toHaveLength(2);
    expect(trivia.facts[0]).toBe('Ciekawostka o SB i inwigilacji w PRL.');
  });

  it('dobiera fakty dla USA 1920s w fallbacku', () => {
    const trivia = getSettingTrivia(null, {
      schemaVersion: 1,
      sceneDate: '1925-05-12',
      effectiveYear: 1925,
      countryCode: 'US',
      regionProfile: 'US',
      source: 'scenario-range',
      rulesVersion: '1.0.0',
    });

    expect(trivia.title).toBe('Realia Epoki i Świata');
    expect(trivia.subtitle).toContain('USA, lata 20.');
    expect(trivia.facts.some((f) => f.includes('prohibicja'))).toBe(true);
  });

  it('dobiera fakty dla PRL w fallbacku', () => {
    const trivia = getSettingTrivia({
      title: 'Przygoda PRL',
      activeSceneYear: 1974,
      country: 'Polska',
    });

    expect(trivia.subtitle).toContain('PRL, lata 70.');
    expect(trivia.facts.some((f) => f.includes('meldunkowej'))).toBe(true);
  });

  it('obsługuje język angielski (en)', () => {
    const trivia = getSettingTrivia(null, {
      schemaVersion: 1,
      sceneDate: '1925-05-12',
      effectiveYear: 1925,
      countryCode: 'US',
      regionProfile: 'US',
      source: 'scenario-range',
      rulesVersion: '1.0.0',
    }, 'en');

    expect(trivia.title).toBe('Era & World Context');
    expect(trivia.subtitle).toContain('USA 1920s');
    expect(trivia.facts.some((f) => f.includes('Prohibition'))).toBe(true);
  });

  describe('getSafeDossierIntro', () => {
    it('preferuje investigatorIntro nad description', () => {
      const adv: AdventureContext = {
        title: 'Test',
        description: 'Długi opis ze spoilerem o potworze Cthulhu.',
        investigatorIntro: 'Krótki bezpieczny zarys śledztwa.',
      };
      expect(getSafeDossierIntro(adv)).toBe('Krótki bezpieczny zarys śledztwa.');
    });

    it('przycina opis do pierwszych zdań, gdy brak investigatorIntro', () => {
      const adv: AdventureContext = {
        title: 'Test',
        description: 'Pierwsze zdanie wprowadza sprawę. Drugie zdanie mówi o zleceniu. Trzecie zdanie zdradza tajemnicę kultu.',
      };
      const intro = getSafeDossierIntro(adv);
      expect(intro).toBe('Pierwsze zdanie wprowadza sprawę. Drugie zdanie mówi o zleceniu.');
    });
  });
});
