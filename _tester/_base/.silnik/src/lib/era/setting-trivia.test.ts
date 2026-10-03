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

    it('Czerwona Pętla Repro: odrzuca techniczny żargon ekstrakcji PDF i generuje nastrojowy pattern fabularny', () => {
      const technicalAdv: AdventureContext = {
        title: 'Krakowska Enigma',
        location: 'Warszawa',
        country: 'Polska',
        activeSceneYear: 1921,
        eraLabel: 'Lata 20. XX w.',
        initialWeather: 'Chłodna jesienna mgła spowijająca ulice',
        description: 'Autorski scenariusz d100 wyekstrahowany w trybie lokalnym z pliku "Zew_Cthulhu_7ed._Krakowska_Enigma.pdf". Dokument zawiera 28 stron, 2 kluczowych postaci dramatu oraz 2 zidentyfikowanych poszlak i rekwizytów.',
      };

      const intro = getSafeDossierIntro(technicalAdv, {
        character: { name: 'Jan', occupation: 'Dziennikarz' },
        locale: 'pl',
      });

      // Nie może zawierać żargonu ekstrakcji
      expect(intro).not.toMatch(/wyekstrahowan/i);
      expect(intro).not.toMatch(/plik/i);
      expect(intro).not.toMatch(/stron/i);
      expect(intro).not.toMatch(/rekwizyt/i);

      // Musi zawierać elementy nastrojowego patternu
      expect(intro).toContain('Krakowska Enigma');
      expect(intro).toContain('Warszawa');
      expect(intro).toContain('1921');
      expect(intro).toContain('Dziennikarz');
    });

    it('obsługuje wersję angielską patternu (en) i Badacza', () => {
      const technicalAdv: AdventureContext = {
        title: 'Krakowska Enigma',
        location: 'Warsaw',
        country: 'Poland',
        activeSceneYear: 1921,
        eraLabel: '1920s',
        description: 'Custom d100 scenario extracted in local mode from file. Document contains 28 pages.',
      };

      const intro = getSafeDossierIntro(technicalAdv, {
        character: { name: 'John', occupation: 'Private Investigator' },
        locale: 'en',
      });

      expect(intro).not.toContain('extracted');
      expect(intro).not.toContain('pages');
      expect(intro).toContain('Krakowska Enigma');
      expect(intro).toContain('Warsaw');
      expect(intro).toContain('1921');
      expect(intro).toContain('Private Investigator');
    });

    it('obsługuje tryb Duet z wieloma postaciami w PL i EN', () => {
      const adv: AdventureContext = {
        title: 'Mroczny Rytuał',
        location: 'Kraków',
        activeSceneYear: 1928,
        description: 'Autorski scenariusz d100 wyekstrahowany z pliku.',
      };

      const introPl = getSafeDossierIntro(adv, {
        characters: [
          { name: 'Jan', occupation: 'Detektyw' },
          { name: 'Maria', occupation: 'Dziennikarka' },
        ],
        locale: 'pl',
      });
      expect(introPl).toContain('Wraz z towarzyszem podejmujecie wspólne śledztwo');
      expect(introPl).toContain('Mroczny Rytuał');

      const introEn = getSafeDossierIntro(adv, {
        characters: [
          { name: 'John', occupation: 'Detective' },
          { name: 'Mary', occupation: 'Journalist' },
        ],
        locale: 'en',
      });
      expect(introEn).toContain('Together with your partner, you undertake the investigation');
      expect(introEn).toContain('Mroczny Rytuał');
    });

    it('generuje zgrabny fallback gdy brak wybranej postaci', () => {
      const adv: AdventureContext = {
        title: 'Tajemnica Bostonu',
        location: 'Boston',
        activeSceneYear: 1923,
      };

      const introPl = getSafeDossierIntro(adv, { locale: 'pl' });
      expect(introPl).toContain('Przed Badaczami staje zagadkowa sprawa');
      expect(introPl).toContain('Tajemnica Bostonu');

      const introEn = getSafeDossierIntro(adv, { locale: 'en' });
      expect(introEn).toContain('The Investigators are drawn into the perplexing case');
      expect(introEn).toContain('Tajemnica Bostonu');
    });

    it('rozpoznaje pory roku z daty startDate (np. jesień i wiosna)', () => {
      const autumnAdv: AdventureContext = {
        title: 'Sprawa Jesienna',
        location: 'Londyn',
        startDate: '1924-10-15',
      };
      expect(getSafeDossierIntro(autumnAdv, { locale: 'pl' })).toContain('Jesień 1924 roku');
      expect(getSafeDossierIntro(autumnAdv, { locale: 'en' })).toContain('Autumn 1924');

      const springAdv: AdventureContext = {
        title: 'Sprawa Wiosenna',
        location: 'Paryż',
        startDate: '1925-04-10',
      };
      expect(getSafeDossierIntro(springAdv, { locale: 'pl' })).toContain('Wiosna 1925 roku');
      expect(getSafeDossierIntro(springAdv, { locale: 'en' })).toContain('Spring 1925');
    });
  });
});
