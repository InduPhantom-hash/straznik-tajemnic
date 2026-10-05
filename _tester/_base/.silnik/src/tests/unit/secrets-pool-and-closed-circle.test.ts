/**
 * Testy jednostkowe dla Issue #648 Faza 2:
 * - R1: Pula Sekretów Mike'a Shea (Secrets & Clues Pool) z 3 bezpiecznikami anty-pleasing
 * - R2: Zamknięty Krąg Śledztwa (Closed Circle Mystery) z diegetycznymi granicami (boundarySummary)
 * - R3: Kategoryzacja Poszlak: Core vs Flavor (100% pod maską i w [MYŚLI_MG], niewidzialna dla gracza w UI)
 */

import {
  buildWorldEngineDirectives,
  extractUndiscoveredSecrets,
  formatSecretsDirective,
  formatClosedCircleDirective,
  type SecretInput,
  type WorldEngineAdapterParams,
} from '@/lib/world-engine/adapter';
import {
  getGMProtocolPrompt,
  getCompactGMProtocolPrompt,
  getContextAwareGMProtocol,
} from '@/lib/prompts/gm-protocol';
import {
  type ClueEntry,
  type ClueType,
  isClueEntry,
  normalizeClueType,
} from '@/lib/journal/dossier-types';
import type { AdventureClue, Character } from '@/lib/types';
import { normalizeAdventureGraph } from '@/lib/custom-adventures-storage';
import { ensureCharacterDossier } from '@/lib/journal/dossier-migration';
import { processCharacterJournalAndDossier } from '@/lib/journal/apply-journal-tags';

describe('Issue #648 Faza 2 - R1: Pula Sekretów Mike\'a Shea (Secrets & Clues Pool)', () => {
  describe('extractUndiscoveredSecrets', () => {
    it('zwraca pustą tablicę dla null, undefined, pustej tablicy lub braku sekretów', () => {
      expect(extractUndiscoveredSecrets(null)).toEqual([]);
      expect(extractUndiscoveredSecrets(undefined)).toEqual([]);
      expect(extractUndiscoveredSecrets([])).toEqual([]);
    });

    it('obsługuje proste tablice stringów', () => {
      const secrets = [
        'Walter Corbitt żyje w zamurowanej piwnicy',
        'Dziennik Corbitta jest ukryty pod deskami podłogi',
      ];
      const result = extractUndiscoveredSecrets(secrets);
      expect(result).toHaveLength(2);
      expect(result[0]).toBe('Walter Corbitt żyje w zamurowanej piwnicy');
      expect(result[1]).toBe('Dziennik Corbitta jest ukryty pod deskami podłogi');
    });

    it('obsługuje obiekty SecretItem z polami text, description, secret, title oraz name', () => {
      const secrets: SecretInput[] = [
        { text: 'Pastor Michael Thomas uciekł do Providence' },
        { description: 'Złoty szpon pochodzi z R\'lyeh' },
        { secret: 'Rytuał w piwnicy wymaga krwi trzech ofiar' },
        { title: 'Dziennik ukryty pod deską' },
        { name: 'Klucz do skrytki w kościele' },
      ];
      const result = extractUndiscoveredSecrets(secrets);
      expect(result).toEqual([
        'Pastor Michael Thomas uciekł do Providence',
        'Złoty szpon pochodzi z R\'lyeh',
        'Rytuał w piwnicy wymaga krwi trzech ofiar',
        'Dziennik ukryty pod deską',
        'Klucz do skrytki w kościele',
      ]);
    });

    it('filtruje sekrety jawnie oznaczone jako odkryte (isDiscovered / discovered / discoveryStatus / status)', () => {
      const secrets: SecretInput[] = [
        { text: 'Nieodkryty sekret 1', isDiscovered: false },
        { text: 'Odkryty sekret 2', isDiscovered: true },
        { text: 'Odkryty sekret 3', discovered: true },
        { text: 'Odkryty sekret 4', discoveryStatus: 'discovered' } as unknown as SecretInput,
        { text: 'Odkryty sekret 5', status: 'discovered' } as unknown as SecretInput,
        { text: 'Nieodkryty sekret 6' },
      ];
      const result = extractUndiscoveredSecrets(secrets);
      expect(result).toEqual(['Nieodkryty sekret 1', 'Nieodkryty sekret 6']);
    });

    it('filtruje sekrety, które pokrywają się z już odkrytymi poszlakami w dossier gracza (tytuł, ID lub zbieżny fragment)', () => {
      const secrets: SecretInput[] = [
        'Dziennik Corbitta',
        'Zamurowana piwnica',
        'Klucz do kaplicy',
        { id: 'clue-sanatorium', text: 'Dr Mintz eksperymentował na pacjentach' },
        'List proboszcza z Bostonu',
      ];
      const discoveredTitles = [
        'dziennik corbitta',
        'clue-sanatorium',
        'Odnaleziony list proboszcza z Bostonu na parafii',
      ];
      const result = extractUndiscoveredSecrets(secrets, discoveredTitles);
      expect(result).toEqual(['Zamurowana piwnica', 'Klucz do kaplicy']);
    });

    it('nie filtruje sekretów na bazie pojedynczych słów pospolitych (np. "piwnica", "szpital") w tytułach poszlak', () => {
      const secrets: SecretInput[] = [
        'Walter Corbitt żyje w zamurowanej wnęce w piwnicy',
        'Dr Mintz przeprowadzał nielegalne sekcje w miejskim szpitalu',
      ];
      // Gracz odkrył jedynie ogólne poszlaki lokacyjne o pojedynczych nazwach:
      const discoveredTitles = ['piwnica', 'szpital'];
      const result = extractUndiscoveredSecrets(secrets, discoveredTitles);
      expect(result).toEqual([
        'Walter Corbitt żyje w zamurowanej wnęce w piwnicy',
        'Dr Mintz przeprowadzał nielegalne sekcje w miejskim szpitalu',
      ]);
    });

    it('bezpiecznie ignoruje nienormalne i numeryczne dane wejściowe bez rzucania wyjątków', () => {
      const secrets: SecretInput[] = [
        { id: 101 as unknown as string, text: 404 as unknown as string },
        { id: 'secret-ok', text: 'Prawidłowy sekret testowy' },
      ];
      const discoveredTitles = [null as unknown as string, undefined as unknown as string, 123 as unknown as string];
      const result = extractUndiscoveredSecrets(secrets, discoveredTitles);
      expect(result).toEqual(['404', 'Prawidłowy sekret testowy']);
    });

    it('deduplikuje powtórzone sekrety (case-insensitive) i pomija puste wpisy', () => {
      const secrets: SecretInput[] = [
        'Sekret A',
        '  sekret a  ',
        '',
        '   ',
        { text: 'Sekret B' },
        { text: 'sekret b' },
      ];
      const result = extractUndiscoveredSecrets(secrets);
      expect(result).toEqual(['Sekret A', 'Sekret B']);
    });
  });

  describe('formatSecretsDirective', () => {
    it('zwraca pusty ciąg, jeśli wszystkie sekrety są już odkryte lub lista jest pusta', () => {
      expect(formatSecretsDirective([])).toBe('');
      expect(formatSecretsDirective([{ text: 'Jakiś sekret', isDiscovered: true }])).toBe('');
    });

    it('formatuje tag [SEKRETY_DO_ODKRYCIA] w języku polskim z 3 bezpiecznikami anty-pleasing', () => {
      const secrets = [
        'Walter Corbitt nie umarł naturalną śmiercią',
        'W szpitalu miejskim Macario bełkocze o oczach w ścianie',
      ];
      const directive = formatSecretsDirective(secrets, { locale: 'pl' });

      expect(directive).toContain('[SEKRETY_DO_ODKRYCIA: (Pula Sekretów Mike\'a Shea):');
      expect(directive).toContain('1. Walter Corbitt nie umarł naturalną śmiercią');
      expect(directive).toContain('2. W szpitalu miejskim Macario bełkocze o oczach w ścianie');
      // 3 żelazne bezpieczniki anty-pleasing:
      expect(directive).toContain('1. Niezależność od lokacji');
      expect(directive).toContain('2. Wymóg nośnika i testu');
      expect(directive).toContain('3. Zakaz autopilota i darmowego wykładania kart');
      expect(directive).toContain('OBOWIĄZKOWO W [MYŚLI_MG]: zaplanuj sekret i jego nośnik fizyczny');
    });

    it('formatuje tag [SEKRETY_DO_ODKRYCIA] w języku angielskim (locale: en)', () => {
      const secrets = ['Corbitt resides behind cellar masonry'];
      const directive = formatSecretsDirective(secrets, { locale: 'en' });

      expect(directive).toContain('[SEKRETY_DO_ODKRYCIA: (Secrets & Clues Pool - Mike Shea):');
      expect(directive).toContain('1. Corbitt resides behind cellar masonry');
      expect(directive).toContain('1. Location Independence');
      expect(directive).toContain('2. Carrier & Skill Test Requirement');
      expect(directive).toContain('3. Anti-Pleasing & No Deduction Hijacking');
      expect(directive).toContain('MANDATORY IN [MYŚLI_MG]');
    });

    it('respektuje limit maxSecrets', () => {
      const secrets = Array.from({ length: 15 }, (_, i) => `Sekret numer ${i + 1}`);
      const directive = formatSecretsDirective(secrets, { maxSecrets: 3 });
      expect(directive).toContain('1. Sekret numer 1');
      expect(directive).toContain('2. Sekret numer 2');
      expect(directive).toContain('3. Sekret numer 3');
      expect(directive).not.toContain('4. Sekret numer 4');
    });
  });

  describe('Integracja Puli Sekretów z buildWorldEngineDirectives', () => {
    it('wstrzykuje dyrektywę sekretów, gdy przekazano secretsPool na poziomie głównym', () => {
      const params: WorldEngineAdapterParams = {
        locale: 'pl',
        secretsPool: [
          'Zleceniodawca Arthur Knott zataił wcześniejszą śmierć najemców',
          'Szeryf brał łapówki od kultu',
        ],
      };
      const directives = buildWorldEngineDirectives(params);

      expect(directives).toContain('[SEKRETY_DO_ODKRYCIA:');
      expect(directives).toContain('Arthur Knott zataił wcześniejszą śmierć najemców');
      expect(directives).toContain('Szeryf brał łapówki od kultu');
    });

    it('wstrzykuje dyrektywę sekretów, gdy przekazano secrets w adventureContext', () => {
      const params: WorldEngineAdapterParams = {
        locale: 'pl',
        adventureContext: {
          secrets: ['Kult Kaplicy Kontemplacji przeniósł się do podziemi cmentarza'],
        },
      };
      const directives = buildWorldEngineDirectives(params);

      expect(directives).toContain('[SEKRETY_DO_ODKRYCIA:');
      expect(directives).toContain('Kult Kaplicy Kontemplacji przeniósł się do podziemi cmentarza');
    });

    it('nie emituje tagu sekretów, gdy wszystkie sekrety z puli zostały już odkryte w dossier gracza', () => {
      const params: WorldEngineAdapterParams = {
        locale: 'pl',
        secretsPool: ['Znaleziony list proboszcza'],
        character: {
          id: 'char-1',
          name: 'Edward Vance',
          investigatorDossier: {
            clues: [
              {
                id: 'clue-1',
                title: 'Znaleziony list proboszcza',
                description: 'List opisujący dziwne rytuały',
                category: 'document',
                status: 'confirmed',
                clueType: 'core',
              },
            ],
            npcs: [],
            locations: [],
            notes: [],
            lastUpdated: '1924-11-12',
          },
        } as unknown as WorldEngineAdapterParams['character'],
      };
      const directives = buildWorldEngineDirectives(params);
      expect(directives).not.toContain('[SEKRETY_DO_ODKRYCIA:');
    });

    it('filtruje sekrety odkryte przez dowolną postać w drużynie wieloosobowej (Hot Seat / characters)', () => {
      const params: WorldEngineAdapterParams = {
        locale: 'pl',
        secretsPool: ['Kult Kaplicy Kontemplacji złożył w ofierze 3 policjantów'],
        character: {
          id: 'char-1',
          name: 'Edward Vance',
          investigatorDossier: { clues: [], npcs: [], locations: [], notes: [] },
        } as unknown as WorldEngineAdapterParams['character'],
        characters: [
          {
            id: 'char-2',
            name: 'Arthur Blackwood',
            investigatorDossier: {
              clues: [
                {
                  id: 'clue-ofiary',
                  title: 'Kult Kaplicy Kontemplacji złożył w ofierze 3 policjantów',
                  description: 'Akta policyjne ze zbrodni z 1912 roku',
                  category: 'document',
                  status: 'confirmed',
                },
              ],
              npcs: [],
              locations: [],
              notes: [],
            },
          } as unknown as NonNullable<WorldEngineAdapterParams['characters']>[number],
        ],
      };
      const directives = buildWorldEngineDirectives(params);
      expect(directives).not.toContain('[SEKRETY_DO_ODKRYCIA:');
    });

    it('NIE filtruje sekretów, gdy pasująca poszlaka w dossier ma discoveryStatus: unrevealed lub epistemicLayer: keeper_truth (Concordia fog of war)', () => {
      const params: WorldEngineAdapterParams = {
        locale: 'pl',
        secretsPool: ['Walter Corbitt spoczywa w zamurowanej wnęce piwnicy'],
        character: {
          id: 'char-1',
          name: 'Edward Vance',
          investigatorDossier: {
            clues: [
              {
                id: 'clue-unrevealed',
                title: 'Walter Corbitt spoczywa w zamurowanej wnęce piwnicy',
                description: 'Ukryta prawda grafu jeszcze nieodkryta przez badacza',
                category: 'document',
                status: 'confirmed',
                discoveryStatus: 'unrevealed',
                epistemicLayer: 'player_clue',
              },
            ],
            npcs: [],
            locations: [],
            notes: [],
          },
        } as unknown as WorldEngineAdapterParams['character'],
      };
      const directives = buildWorldEngineDirectives(params);
      // Sekret MUSI pozostać w dyrektywie, bo badacz go jeszcze nie odkrył:
      expect(directives).toContain('[SEKRETY_DO_ODKRYCIA:');
      expect(directives).toContain('Walter Corbitt spoczywa w zamurowanej wnęce piwnicy');
    });

    it('sprawnie sięga po fallback do adventureContext.secretsPool, gdy params.secretsPool przekazano jako pustą tablicę []', () => {
      const params: WorldEngineAdapterParams = {
        locale: 'pl',
        secretsPool: [],
        adventureContext: {
          secretsPool: ['Sekret z fallbacku adventureContext'],
        },
      };
      const directives = buildWorldEngineDirectives(params);
      expect(directives).toContain('[SEKRETY_DO_ODKRYCIA:');
      expect(directives).toContain('Sekret z fallbacku adventureContext');
    });
  });
});

describe('Issue #648 Faza 2 - R2: Zamknięty Krąg Śledztwa (Closed Circle Mystery)', () => {
  describe('formatClosedCircleDirective', () => {
    it('zwraca pusty ciąg dla pustego lub białego boundarySummary', () => {
      expect(formatClosedCircleDirective('')).toBe('');
      expect(formatClosedCircleDirective('   ')).toBe('');
    });

    it('formatuje dyrektywę [GRANICE_SPRAWY] z wymogiem wyłącznie oporu diegetycznego i zakazem sztucznych ścian', () => {
      const boundary = 'Kamienica Corbitta i dzielnica Central Square w Bostonie';
      const directive = formatClosedCircleDirective(boundary, 'pl');

      expect(directive).toContain('[GRANICE_SPRAWY: (Zamknięty Krąg Śledztwa / Closed Circle):');
      expect(directive).toContain(boundary);
      expect(directive).toContain('WYŁĄCZNIE OPÓR DIEGETYCZNY');
      expect(directive).toContain('brak pociągów/strajk/śnieżyca, brak gotówki, telegram od klienta');
      expect(directive).toContain('BEZWZGLĘDNY ZAKAZ sztucznych ścian w UI i komunikatów o "złym kierunku"');
    });

    it('formatuje dyrektywę [GRANICE_SPRAWY] w języku angielskim (locale: en)', () => {
      const boundary = 'Corbitt Estate and Boston harbor docks';
      const directive = formatClosedCircleDirective(boundary, 'en');

      expect(directive).toContain('[GRANICE_SPRAWY: (Closed Circle Mystery):');
      expect(directive).toContain(boundary);
      expect(directive).toContain('ONLY DIEGETIC RESISTANCE');
      expect(directive).toContain('FORBID artificial UI invisible walls');
    });
  });

  describe('Integracja Closed Circle z buildWorldEngineDirectives', () => {
    it('wstrzykuje dyrektywę granic, gdy boundarySummary przekazano w parametrach adaptera', () => {
      const params: WorldEngineAdapterParams = {
        locale: 'pl',
        boundarySummary: 'Okolice jeziora zalanego mgłą; brak drogi powrotnej przed świtem',
      };
      const directives = buildWorldEngineDirectives(params);

      expect(directives).toContain('[GRANICE_SPRAWY:');
      expect(directives).toContain('Okolice jeziora zalanego mgłą');
    });

    it('wstrzykuje dyrektywę granic, gdy boundarySummary przekazano w adventureContext', () => {
      const params: WorldEngineAdapterParams = {
        locale: 'pl',
        adventureContext: {
          boundarySummary: 'Odcięta przez zamieć śnieżną stacja Arkham Sanatorium',
        },
      };
      const directives = buildWorldEngineDirectives(params);

      expect(directives).toContain('[GRANICE_SPRAWY:');
      expect(directives).toContain('Odcięta przez zamieć śnieżną stacja Arkham Sanatorium');
    });

    it('nie emituje dyrektywy granic, gdy boundarySummary nie zostało zdefiniowane', () => {
      const params: WorldEngineAdapterParams = { locale: 'pl' };
      const directives = buildWorldEngineDirectives(params);
      expect(directives).not.toContain('[GRANICE_SPRAWY:');
    });

    it('sprawnie sięga po fallback do adventureContext.boundarySummary, gdy params.boundarySummary to puste białe znaki', () => {
      const params: WorldEngineAdapterParams = {
        locale: 'pl',
        boundarySummary: '   ',
        adventureContext: {
          boundarySummary: 'Doki portowe Innsmouth; brak promów na pełne morze',
        },
      };
      const directives = buildWorldEngineDirectives(params);
      expect(directives).toContain('[GRANICE_SPRAWY:');
      expect(directives).toContain('Doki portowe Innsmouth; brak promów na pełne morze');
    });
  });
});

describe('Issue #648 Faza 2 - Protokół MG (gm-protocol.ts)', () => {
  it('pełny protokół zawiera SEKRETY_DO_ODKRYCIA w tagu [MYŚLI_MG] oraz w przykładzie', () => {
    const prompt = getGMProtocolPrompt();

    // Tag format w MYŚLI_MG:
    expect(prompt).toContain('SEKRETY_DO_ODKRYCIA: zaplanowany sekret z puli i jego nośnik fizyczny');
    // Przykład użycia w MYŚLI_MG:
    expect(prompt).toContain('SEKRETY_DO_ODKRYCIA: list w biurku z pieczęcią loży, ujawnię po teście Ślusarstwa');
  });

  it('pełny protokół zawiera dedykowaną sekcję J o Puli Sekretów z 3 bezpiecznikami anty-pleasing', () => {
    const prompt = getGMProtocolPrompt();

    expect(prompt).toContain('#### J. PULA SEKRETÓW MIKE\'A SHEA (SECRETS & CLUES POOL) I 3 BEZPIECZNIKI ANTY-PLEASING');
    // Bezpiecznik 1:
    expect(prompt).toContain('Niezależność od lokacji (Location Independence)');
    // Bezpiecznik 2:
    expect(prompt).toContain('Wymóg nośnika i testu (Carrier & Skill Test Requirement)');
    // Bezpiecznik 3:
    expect(prompt).toContain('Zakaz autopilota i darmowego wykładania kart (Anti-Pleasing / No Deduction Hijacking)');
  });

  it('pełny protokół zawiera dedykowaną sekcję K o Zamkniętym Kręgu Śledztwa (Closed Circle)', () => {
    const prompt = getGMProtocolPrompt();

    expect(prompt).toContain('#### K. ZAMKNIĘTY KRĄG ŚLEDZTWA (CLOSED CIRCLE MYSTERY - SETH SKORKOWSKY)');
    expect(prompt).toContain('Wyłącznie opór diegetyczny');
    expect(prompt).toContain('Zakaz sztucznych ścian w UI');
    expect(prompt).toContain('BEZWZGLĘDNY ZAKAZ komunikatów o „złym kierunku”');
  });

  it('pełny protokół zawiera sekcję L o kategoryzacji poszlak Core vs Flavor pod maską', () => {
    const prompt = getGMProtocolPrompt();

    expect(prompt).toContain('#### L. KATEGORYZACJA POSZLAK CORE VS FLAVOR (POD MASKĄ)');
    expect(prompt).toContain('Poszlaki Core:');
    expect(prompt).toContain('Poszlaki Flavor:');
    expect(prompt).toContain('Niewidzialność dla gracza:');
    expect(prompt).toContain('bez żadnych spoilerujących etykiet „Core” czy „Flavor”');
  });

  it('kompaktowy protokół zawiera przypomnienia o Puli Sekretów, Closed Circle i Core vs Flavor', () => {
    const compactPrompt = getCompactGMProtocolPrompt();

    expect(compactPrompt).toContain('SEKRETY_DO_ODKRYCIA: zaplanowany sekret i nośnik');
    expect(compactPrompt).toContain('PULA SEKRETÓW & 3 BEZPIECZNIKI ANTY-PLEASING');
    expect(compactPrompt).toContain('ZAMKNIĘTY KRĄG ŚLEDZTWA (Closed Circle)');
    expect(compactPrompt).toContain('KATEGORYZACJA POSZLAK CORE VS FLAVOR');
  });

  it('getContextAwareGMProtocol przełącza wersję po progu tur, zachowując wytyczne', () => {
    const full = getContextAwareGMProtocol(5);
    const compact = getContextAwareGMProtocol(15);

    expect(full).toContain('PULA SEKRETÓW MIKE\'A SHEA');
    expect(compact).toContain('PULA SEKRETÓW & 3 BEZPIECZNIKI ANTY-PLEASING');
  });
});

describe('Issue #648 Faza 2 - R3: Kategoryzacja Poszlak Core vs Flavor pod maską', () => {
  describe('Struktury danych i walidacja isClueEntry', () => {
    it('isClueEntry poprawnie akceptuje obiekty z clueType "core" i "flavor"', () => {
      const coreClue: ClueEntry = {
        id: 'clue-core-1',
        title: 'Klucz do piwnicy Corbitta',
        description: 'Mosiężny stary klucz z numerem 13',
        category: 'forensic',
        status: 'confirmed',
        clueType: 'core',
      };
      const flavorClue: ClueEntry = {
        id: 'clue-flavor-1',
        title: 'Zakurzone firanki w salonie',
        description: 'Aksamitne zasłony ze śladami moli',
        category: 'document',
        status: 'confirmed',
        clueType: 'flavor',
      };

      expect(isClueEntry(coreClue)).toBe(true);
      expect(isClueEntry(flavorClue)).toBe(true);
    });

    it('isClueEntry akceptuje obiekty bez jawnego clueType (wsteczna kompatybilność)', () => {
      const legacyClue = {
        id: 'clue-legacy',
        title: 'Stara fotografia',
        description: 'Portret z 1880 roku',
        category: 'document',
        status: 'unconfirmed',
      };
      expect(isClueEntry(legacyClue)).toBe(true);
    });

    it('isClueEntry akceptuje obiekty z clueType null (format typowy dla serializacji JSON)', () => {
      const clueWithNull = {
        id: 'clue-null',
        title: 'Brak typu',
        category: 'document',
        status: 'confirmed',
        clueType: null,
      };
      expect(isClueEntry(clueWithNull)).toBe(true);
    });

    it('isClueEntry odrzuca obiekt z nieprawidłowym clueType', () => {
      const invalidClue = {
        id: 'clue-invalid',
        title: 'Nieprawidłowa poszlaka',
        category: 'document',
        status: 'confirmed',
        clueType: 'invalid_type',
      };
      expect(isClueEntry(invalidClue)).toBe(false);
    });

    it('isClueEntry akceptuje obiekty z clueType o innej wielkości liter (np. "Core", "FLAVOR") i ze spacjami (" core ")', () => {
      const clueCoreUpper = {
        id: 'clue-upper',
        title: 'Akta',
        category: 'document',
        status: 'confirmed',
        clueType: 'Core',
      };
      const clueFlavorUpper = {
        id: 'clue-flavor-upper',
        title: 'Tło',
        category: 'document',
        status: 'confirmed',
        clueType: '  FLAVOR  ',
      };
      expect(isClueEntry(clueCoreUpper)).toBe(true);
      expect(isClueEntry(clueFlavorUpper)).toBe(true);
    });

    it('ensureCharacterDossier nie odrzuca poszlak z clueType "Core" i poprawnie normalizuje je w cleanedClues', () => {
      const character = {
        id: 'char-1',
        name: 'Edward Vance',
        investigatorDossier: {
          clues: [
            {
              id: 'clue-c1',
              title: 'Dziennik kultu',
              description: 'Opis',
              category: 'document',
              status: 'confirmed',
              clueType: 'Core',
            },
          ],
          npcs: [],
          locations: [],
          notes: [],
        },
      } as unknown as Character;

      const ensured = ensureCharacterDossier(character);
      expect(ensured.investigatorDossier.clues).toHaveLength(1);
      expect(ensured.investigatorDossier.clues[0]?.clueType).toBe('core');
    });

    it('processCharacterJournalAndDossier uzupełnia clueType na istniejących poszlakach legacy przy aktualizacji', () => {
      const character = {
        id: 'char-1',
        name: 'Edward Vance',
        investigatorDossier: {
          clues: [
            {
              id: 'clue-legacy-key',
              title: 'Kluczowy list adwokata',
              description: 'Stary opis',
              category: 'document',
              status: 'unconfirmed',
              // brak clueType (poszlaka legacy)
            },
          ],
          npcs: [],
          locations: [],
          notes: [],
        },
      } as unknown as Character;

      const journalEntries = [
        {
          id: 'j-1',
          type: 'clue' as const,
          title: 'Kluczowy list adwokata',
          content: 'Uaktualniony fakt',
        },
      ];

      const res = processCharacterJournalAndDossier(character, journalEntries, [], null, 'msg-1');
      const updatedClue = res.character.investigatorDossier?.clues?.find((c) => c.id === 'clue-legacy-key');
      expect(updatedClue?.clueType).toBe('core');
    });
  });

  describe('normalizeClueType', () => {
    it('zachowuje i normalizuje jawny clueType "core" lub "flavor" niezależnie od wielkości liter', () => {
      expect(normalizeClueType({ clueType: 'core' })).toBe('core');
      expect(normalizeClueType({ clueType: 'flavor' })).toBe('flavor');
      expect(normalizeClueType({ clueType: 'Core' })).toBe('core');
      expect(normalizeClueType({ clueType: 'CORE' })).toBe('core');
      expect(normalizeClueType({ clueType: 'Flavor' })).toBe('flavor');
      expect(normalizeClueType({ clueType: 'FLAVOR' })).toBe('flavor');
    });

    it('obsługuje bezpośrednie przekazanie stringa jako typu poszlaki', () => {
      expect(normalizeClueType('core')).toBe('core');
      expect(normalizeClueType('Core')).toBe('core');
      expect(normalizeClueType('FLAVOR')).toBe('flavor');
    });

    it('klasyfikuje jako "core", gdy isKeyClue: true lub istnieje targetNodeId', () => {
      expect(normalizeClueType({ isKeyClue: true })).toBe('core');
      expect(normalizeClueType({ targetNodeId: 'node-piwnica' })).toBe('core');
    });

    it('klasyfikuje jako "core" na podstawie tagów "core", "kluczowa" lub "key"', () => {
      expect(normalizeClueType({ tags: ['poszlaka', 'kluczowa'] })).toBe('core');
      expect(normalizeClueType({ tags: ['core-clue'] })).toBe('core');
      expect(normalizeClueType({ tags: ['key'] })).toBe('core');
    });

    it('klasyfikuje jako "core" na podstawie słów kluczowych w tytule lub nazwie', () => {
      expect(normalizeClueType({ title: 'Kluczowy dowód zbrodni' })).toBe('core');
      expect(normalizeClueType({ name: 'Główny rejestr zgonów' })).toBe('core');
    });

    it('domyślnie przyjmuje "flavor" dla poszlak drugorzędnych bez krytycznych wskaźników', () => {
      expect(normalizeClueType({ title: 'Zapach stęchłego tytoniu' })).toBe('flavor');
      expect(normalizeClueType(null)).toBe('flavor');
      expect(normalizeClueType(undefined)).toBe('flavor');
    });
  });

  describe('Normalizacja w custom-adventures-storage.ts', () => {
    it('normalizuje clueType w AdventureClue przypisując core dla poszlak z targetNodeId i flavor dla pozostałych gdy zażądano inferClueType', () => {
      const rawClues: Partial<AdventureClue>[] = [
        {
          id: 'clue-1',
          name: 'Adres kryjówki',
          description: 'Prowadzi prosto do meliny kultystów',
          targetNodeId: 'node-melina',
        },
        {
          id: 'clue-2',
          name: 'Pusta butelka po ginie',
          description: 'Zwykły śmieć w kącie',
        },
      ];

      const normalized = normalizeAdventureGraph(
        {
          clues: rawClues as AdventureClue[],
          nodes: [{ id: 'node-melina', name: 'Melina', type: 'location', leadInClueIds: [], leadOutClueIds: [] }],
        },
        { inferClueType: true }
      );

      const clue1 = normalized.clues.find((c) => c.id === 'clue-1');
      const clue2 = normalized.clues.find((c) => c.id === 'clue-2');

      expect(clue1?.clueType).toBe('core');
      expect(clue2?.clueType).toBe('flavor');
    });

    it('domyślnie zachowuje struktury grafu bezstratnie (brak wstrzykiwania clueType dla legacy poszlak bez opcji inferClueType)', () => {
      const rawClues: Partial<AdventureClue>[] = [
        {
          id: 'clue-legacy',
          name: 'Stary wycinek prasowy',
          description: 'Bez jawnego typu',
        },
      ];

      const normalized = normalizeAdventureGraph({
        clues: rawClues as AdventureClue[],
      });

      const clue = normalized.clues.find((c) => c.id === 'clue-legacy');
      expect(clue?.clueType).toBeUndefined();
    });

    it('zachowuje jawnie zdefiniowany clueType w AdventureClue', () => {
      const rawClues: Partial<AdventureClue>[] = [
        {
          id: 'clue-explicit-flavor',
          name: 'Herbata miętowa',
          description: 'Aromat na stole',
          clueType: 'flavor',
          targetNodeId: 'node-kitchen',
        },
      ];

      const normalized = normalizeAdventureGraph({
        clues: rawClues as AdventureClue[],
        nodes: [{ id: 'node-kitchen', name: 'Kuchnia', type: 'location', leadInClueIds: [], leadOutClueIds: [] }],
      });

      const clue = normalized.clues.find((c) => c.id === 'clue-explicit-flavor');
      expect(clue?.clueType).toBe('flavor');
    });

    it('normalizuje wielkość liter dla jawnego clueType w AdventureClue (np. "Core" -> "core")', () => {
      const rawClues = [
        {
          id: 'clue-upper-core',
          name: 'Stary list',
          description: 'Pismo adwokata',
          clueType: 'Core' as unknown as ClueType,
        },
      ];

      const normalized = normalizeAdventureGraph({
        clues: rawClues as AdventureClue[],
      });

      const clue = normalized.clues.find((c) => c.id === 'clue-upper-core');
      expect(clue?.clueType).toBe('core');
    });
  });

  describe('Niewidzialność dla Gracza (Zero Spoilerów w UI)', () => {
    it('poszlaka w dossier zachowuje clueType pod maską, ale nie zawiera spoilerujących etykiet w tytule ani opisie', () => {
      const clue: ClueEntry = {
        id: 'clue-tested',
        title: 'Mosiężny klucz do sieni',
        description: 'Ciężki klucz z numerem 4',
        category: 'forensic',
        status: 'confirmed',
        clueType: 'core',
      };

      // Tytuł i opis nie mogą zawierać spoilerujących wtrętów "Core" / "Flavor":
      expect(clue.title).not.toMatch(/\b(core|flavor)\b/i);
      expect(clue.description).not.toMatch(/\b(core|flavor)\b/i);
      // Typ jest dostępny pod maską:
      expect(clue.clueType).toBe('core');
    });
  });
});

describe('Issue #648 Faza 2 - Testy Adwersarskie i Odpornościowe (Adversarial Robustness)', () => {
  it('bezpiecznie radzi sobie z ekstremalnymi ciągami znaków i znakami specjalnymi w boundarySummary', () => {
    const maliciousBoundary = '<script>alert("xss")</script> & DROP TABLE locations; 🌲 \u0000 ąęśćółźż';
    const directive = formatClosedCircleDirective(maliciousBoundary);

    expect(directive).toContain(maliciousBoundary);
    expect(directive).toContain('[GRANICE_SPRAWY:');
  });

  it('bezpiecznie obsługuje zamrożone obiekty w secretsPool', () => {
    const frozenSecret = Object.freeze({
      text: Object.freeze('Zamrożony sekret z R\'lyeh'),
      isDiscovered: false,
    });
    const directive = formatSecretsDirective([frozenSecret]);
    expect(directive).toContain('Zamrożony sekret z R\'lyeh');
  });

  it('wstrzykuje oba moduły (Granice + Sekrety) jednocześnie w buildWorldEngineDirectives bez konfliktów formatowania', () => {
    const params: WorldEngineAdapterParams = {
      locale: 'pl',
      boundarySummary: 'Dzielnica North End, Boston',
      secretsPool: [
        'Walter Corbitt nie żyje, lecz spoczywa w letargu',
        'Kaplica Kontemplacji została zamknięta w 1912 roku',
      ],
    };

    const result = buildWorldEngineDirectives(params);

    expect(result).toContain('[GRANICE_SPRAWY: (Zamknięty Krąg Śledztwa / Closed Circle): Dzielnica North End, Boston');
    expect(result).toContain('[SEKRETY_DO_ODKRYCIA: (Pula Sekretów Mike\'a Shea): 1. Walter Corbitt nie żyje, lecz spoczywa w letargu | 2. Kaplica Kontemplacji została zamknięta w 1912 roku');
  });
});
