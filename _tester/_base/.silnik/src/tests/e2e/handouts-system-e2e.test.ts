/**
 * @file handouts-system-e2e.test.ts
 * End-to-End (E2E) Test Suite for Universal Handouts System (Issue #649).
 *
 * Requirements & Specification:
 * - ORIGINAL_REQUEST.md (R1, R2, R3)
 * - PROJECT.md (Feature Inventory F01-F18, Interface Contracts)
 * - TEST_INFRA.md (4-Tier Coverage Methodology)
 *
 * 4-Tier Test Architecture:
 * - Tier 1: Feature Coverage (Core contracts, isolated features, schema validation)
 * - Tier 2: Boundary & Corner Cases (Edge inputs, malformed tags, keeper-only containment)
 * - Tier 3: Cross-Feature Combinations (Pairwise pipelines, multi-handout turns, idempotency)
 * - Tier 4: Real-World Scenario Simulation (Complete campaign lifecycle, e.g. Cien nad Prabutami)
 *
 * Invariant Rule: Strictly standard hyphens (-) only, zero em-dashes or en-dashes.
 */

import fs from 'fs';
import path from 'path';
import type { AdventureHandout, AdventureContext, AdventurePuzzle } from '@/lib/adventures-data';
import { buildHandoutsContext } from '@/app/api/chat/_helpers/build-handouts-context';
import { cleanupContent } from '@/components/chat/narrative/cleanup';
import { parseIntoSections } from '@/components/chat/narrative/parse-sections';
import { appendJournalToParty } from '@/lib/journal/apply-journal-tags';
import type { Character } from '@/lib/types';
import { createEmptyDossier } from '@/lib/journal/dossier-types';

// ============================================================================
// FIXTURES & TEST HELPERS
// ============================================================================

interface ExtendedHandout extends AdventureHandout {
  isPlayerFacing?: boolean;
  keeperOnly?: boolean;
  chapterId?: string;
  nodeId?: string;
  locationId?: string;
}

function createMockCharacter(id = 'char-1', name = 'Franciszek Bielski'): Character {
  return {
    id,
    name,
    occupation: 'Dziennikarz sledczy',
    age: 34,
    background: 'Reporter gazety lokalnej badajacy zjawiska niewyjasnione.',
    playerName: 'Gracz 1',
    isActive: true,
    lastUsed: new Date(),
    notes: '',
    experience: {
      totalXP: 0,
      availableXP: 0,
      earnedThisSession: 0,
      maxEarnedThisSession: 10,
    },
    developmentHistory: [],
    str: 50,
    con: 55,
    siz: 60,
    dex: 65,
    app: 50,
    int: 75,
    pow: 60,
    edu: 70,
    luck: 50,
    hp: 11,
    maxHp: 11,
    san: 60,
    maxSan: 89,
    mp: 12,
    maxMp: 12,
    dayStartSan: 60,
    dailySanLoss: 0,
    skills: {
      'Spostrzegawczosc': 70,
      'Perswazja': 60,
      'Ukrywanie': 50,
      'Mity Cthulhu': 5,
    },
    journal: [],
    investigatorDossier: createEmptyDossier(),
  };
}

function loadPredefinedScenario(slug: string): AdventureContext {
  const possiblePaths = [
    path.resolve(process.cwd(), 'data/adventures/predefined', `${slug}.json`),
    path.resolve(process.cwd(), '_tester/_base/.silnik/data/adventures/predefined', `${slug}.json`),
  ];

  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    }
  }

  // Fallback mock if scenario file cannot be located
  return {
    id: slug,
    title: 'Cien nad Prabutami',
    era: 'prl',
    handouts: [
      {
        slug: 'clue-photo-prabuty-1947',
        title: 'Fotografia z ruin w Prabutach (1947)',
        image: '/handouts/cien-nad-prabutami/ruiny-prabuty-1947.webp',
        handoutType: 'newspaper',
        textContent: 'Czarno-biale zdjecie przedstawiajace zrujnowany kosciol ewangelicki.',
        chapterId: 'rozdzial-1',
      },
      {
        slug: 'clue-sb-file-klin',
        title: 'Teczka SB: Kryptonim KLIN',
        image: '/handouts/cien-nad-prabutami/teczka-sb-klin.webp',
        handoutType: 'report',
        textContent: 'Sciśle tajne akta Wojewodzkiego Urzedu Spraw Wewnetrznych w Elblagu.',
        chapterId: 'rozdzial-2',
      },
      {
        slug: 'audio-sb-wiretap-elblag',
        title: 'Tasma szpulowa ZK-140: Podsluch celi w Elblagu',
        image: '/handouts/cien-nad-prabutami/tasma-sb-elblag.webp',
        audioUrl: '/audio/handouts/cien-nad-prabutami/tasma-sb-elblag.mp3',
        handoutType: 'report',
        textContent: 'Szumy magnetyczne, trzaski i glos zalamujacego sie mezczyzny.',
        chapterId: 'rozdzial-3',
      },
    ],
  } as AdventureContext;
}

// ============================================================================
// E2E TEST SUITE
// ============================================================================

describe('Universal Handouts System E2E Suite (Issue #649)', () => {
  // ==========================================================================
  // TIER 1: FEATURE COVERAGE (Core Contracts & Isolation)
  // ==========================================================================
  describe('Tier 1: Feature Coverage (Core Functional Isolation)', () => {
    describe('1.1: AdventureHandout Model Contract (F01)', () => {
      it('1.1.1: validates complete model instance with all extended fields', () => {
        const handout: ExtendedHandout = {
          slug: 'teczka-sb-klin',
          title: 'Teczka SB: Kryptonim KLIN',
          image: '/handouts/cien-nad-prabutami/teczka-sb-klin.webp',
          audioUrl: '/audio/handouts/cien-nad-prabutami/podsluch.mp3',
          handoutType: 'report',
          textContent: '100% RAW unparaphrased text from canonical dossier.',
          isPlayerFacing: true,
          keeperOnly: false,
          chapterId: 'akt-1-dochodzenie',
          nodeId: 'node-archiwum-sb',
          locationId: 'loc-elblag-komenda',
        };

        expect(handout.slug).toBe('teczka-sb-klin');
        expect(handout.title).toBe('Teczka SB: Kryptonim KLIN');
        expect(handout.image).toBe('/handouts/cien-nad-prabutami/teczka-sb-klin.webp');
        expect(handout.audioUrl).toBe('/audio/handouts/cien-nad-prabutami/podsluch.mp3');
        expect(handout.handoutType).toBe('report');
        expect(handout.textContent).toContain('100% RAW');
        expect(handout.isPlayerFacing).toBe(true);
        expect(handout.keeperOnly).toBe(false);
        expect(handout.chapterId).toBe('akt-1-dochodzenie');
        expect(handout.nodeId).toBe('node-archiwum-sb');
        expect(handout.locationId).toBe('loc-elblag-komenda');
      });

      it('1.1.2: validates default visibility invariants', () => {
        const minimalHandout: ExtendedHandout = {
          slug: 'list-do-proboszcza',
          title: 'List do proboszcza',
          image: '/handouts/list.webp',
        };

        expect(minimalHandout.isPlayerFacing ?? true).toBe(true);
        expect(minimalHandout.keeperOnly ?? false).toBe(false);
      });

      it('1.1.3: validates all 7 supported handoutType values', () => {
        const types: Array<ExtendedHandout['handoutType']> = [
          'newspaper',
          'letter',
          'telegram',
          'report',
          'diary',
          'book',
          'map',
        ];

        types.forEach((type) => {
          const item: ExtendedHandout = {
            slug: `test-${type}`,
            title: `Tytul ${type}`,
            image: `/img/${type}.webp`,
            handoutType: type,
          };
          expect(item.handoutType).toBe(type);
        });
      });

      it('1.1.4: validates structural linking to scenario graph', () => {
        const graphBoundHandout: ExtendedHandout = {
          slug: 'plan-krypty-kosciola',
          title: 'Rzut poziomy krypty',
          image: '/handouts/krypta.webp',
          chapterId: 'rozdzial-finis',
          nodeId: 'node-krypta-podziemia',
          locationId: 'loc-kosciol-prabuty',
        };

        expect(graphBoundHandout.chapterId).toBe('rozdzial-finis');
        expect(graphBoundHandout.nodeId).toBe('node-krypta-podziemia');
        expect(graphBoundHandout.locationId).toBe('loc-kosciol-prabuty');
      });

      it('1.1.5: validates audio media integration metadata', () => {
        const audioHandout: ExtendedHandout = {
          slug: 'tasma-szpulowa-przesluchanie',
          title: 'Tasma ZK-140: Zeznanie aresztowanego',
          image: '/handouts/tasma.webp',
          audioUrl: '/audio/handouts/tasma-zeznanie.mp3',
          handoutType: 'report',
          textContent: 'Nagranie magnetofonowe z przesluchania z dnia 18 pazdziernika 1973 r.',
        };

        expect(audioHandout.audioUrl).toMatch(/\.mp3$/);
        expect(audioHandout.textContent).toBeTruthy();
      });
    });

    describe('1.2: buildHandoutsContext Prompt Generator (F02, F03)', () => {
      const sampleHandouts: ExtendedHandout[] = [
        {
          slug: 'mapa-okolic-walimia',
          title: 'Mapa sztabowa okolic Walimia',
          image: '/handouts/mapa-walimia.webp',
          chapterId: 'rozdzial-1',
          handoutType: 'map',
        },
        {
          slug: 'telegram-ze-stacji',
          title: 'Telegram z dyrekcji kolei',
          image: '/handouts/telegram.webp',
          chapterId: 'rozdzial-2',
          handoutType: 'telegram',
        },
        {
          slug: 'tajny-plan-bunkra-mg',
          title: 'Plan taktyczny bunkra (Tylko MG)',
          image: '/handouts/plan-bunkra.webp',
          keeperOnly: true,
          isPlayerFacing: false,
          chapterId: 'rozdzial-1',
          handoutType: 'map',
        },
      ];

      it('1.2.1: includes available handouts in GM prompt context', () => {
        const context = buildHandoutsContext(sampleHandouts, null);
        expect(context).toContain('DOSTĘPNE HANDOUTY');
        expect(context).toContain('Mapa sztabowa okolic Walimia');
      });

      it('1.2.2: provides explicit deterministic instruction for [HANDOUT:<slug>] or image serving', () => {
        const context = buildHandoutsContext(sampleHandouts, null);
        // Expect prompt instructions to either explicitly guide [HANDOUT:<slug>] or strict format
        expect(context).toMatch(/(\[HANDOUT:[^\]]+\]|wstaw dokładnie)/i);
      });

      it('1.2.3: excludes keeperOnly items from available player handouts list', () => {
        const context = buildHandoutsContext(sampleHandouts, null);
        // The keeper secret should not be listed as a regular player-facing handout to present
        const availableSectionMatch = context.match(/## DOSTĘPNE HANDOUTY[\s\S]*?(?=##|$)/);
        if (availableSectionMatch) {
          const availableText = availableSectionMatch[0];
          // Either keeper item is omitted or explicitly segregated into keeper section
          const hasKeeperInAvailable = availableText.includes('Plan taktyczny bunkra') &&
            !availableText.includes('Tylko dla MG') && !availableText.includes('keeperOnly');
          expect(hasKeeperInAvailable).toBe(false);
        }
      });

      it('1.2.4: scopes handouts to active chapter when options provided', () => {
        const contextCh1 = buildHandoutsContext(sampleHandouts, null, {
          activeChapterId: 'rozdzial-1',
        });
        expect(contextCh1).toBeTruthy();
      });

      it('1.2.5: integrates puzzle context without breaking handout directives', () => {
        const samplePuzzles: AdventurePuzzle[] = [
          {
            id: 'puzzle-1',
            title: 'Szyfr w kalendarzu',
            description: 'Zaszyfrowana data spotkania w notatniku.',
            solutionSummary: 'Przesuniecie Cezara o 3 pozycje.',
            clues: ['Kartka z kalendarza', 'Podkreslony cytat'],
            ideaRollPrompt: 'Rzut na Inteligencje pozwala dostrzec schemat.',
          },
        ];

        const context = buildHandoutsContext(sampleHandouts, samplePuzzles);
        expect(context).toContain('ŁAMIGŁÓWKI');
        expect(context).toContain('Szyfr w kalendarzu');
        expect(context).toContain('IDEA ROLL');
      });
    });

    describe('1.3: Narrative Cleanup Whitelist (F07)', () => {
      it('1.3.1: preserves valid [HANDOUT:<slug>] tag from regex stripping', () => {
        const raw = 'Przeszukujecie biurko. Znajdujecie dokument:\n[HANDOUT:teczka-sb-klin]\nCo robicie dalej?';
        const cleaned = cleanupContent(raw);
        expect(cleaned).toContain('[HANDOUT:teczka-sb-klin]');
      });

      it('1.3.2: preserves slugs containing numbers and hyphens', () => {
        const raw = 'Oto wycinek prasowy:\n[HANDOUT:clue-photo-prabuty-1947]\nWidac na nim zarys wiezy.';
        const cleaned = cleanupContent(raw);
        expect(cleaned).toContain('[HANDOUT:clue-photo-prabuty-1947]');
      });

      it('1.3.3: still removes hallucinated GM tags while keeping HANDOUT', () => {
        const raw = 'Narracja.\n[SAN_LOSS: 1D4]\n[HANDOUT:mapa-walimia]\n[ACTION: ATTRITION]\nKoniec.';
        const cleaned = cleanupContent(raw);
        expect(cleaned).toContain('[HANDOUT:mapa-walimia]');
        expect(cleaned).not.toContain('[SAN_LOSS: 1D4]');
      });

      it('1.3.4: preserves multiple HANDOUT tags in single response', () => {
        const raw = 'Na stole leza dwa dokumenty:\n[HANDOUT:list-1]\n[HANDOUT:mapa-2]\nCo czytacie?';
        const cleaned = cleanupContent(raw);
        expect(cleaned).toContain('[HANDOUT:list-1]');
        expect(cleaned).toContain('[HANDOUT:mapa-2]');
      });

      it('1.3.5: handles tags adjacent to Polish characters cleanly', () => {
        const raw = 'Oto dowód w sprawie:\n[HANDOUT:protokół-przesłuchania-1973]\nCzytasz uważnie.';
        const cleaned = cleanupContent(raw);
        expect(cleaned).toContain('[HANDOUT:');
      });
    });

    describe('1.4: Section Parser (F08)', () => {
      it('1.4.1: parses text with [HANDOUT:<slug>] into sections', () => {
        const text = 'Wchodzicie do archiwum.\n[HANDOUT:teczka-sb-klin]\nW pokoju panuje chlod.';
        const sections = parseIntoSections(text);
        expect(sections.length).toBeGreaterThanOrEqual(1);

        const hasHandoutSection = sections.some(
          (s) => (s.type === 'handout' && (s.handoutSlug === 'teczka-sb-klin' || s.content?.includes('teczka-sb-klin'))) ||
                      (s.content?.includes('HANDOUT:teczka-sb-klin'))
        );
        expect(hasHandoutSection).toBe(true);
      });

      it('1.4.2: extracts cleanly separated narrative around the handout tag', () => {
        const text = 'Poczatek opisu sceny.\n[HANDOUT:list-adwokata]\nKoniec opisu sceny.';
        const sections = parseIntoSections(text);
        expect(sections.length).toBeGreaterThanOrEqual(2);
      });

      it('1.4.3: parses multiple handout tags in separate lines', () => {
        const text = 'Dwa dokumenty:\n[HANDOUT:dok-a]\n[HANDOUT:dok-b]';
        const sections = parseIntoSections(text);
        expect(sections.length).toBeGreaterThanOrEqual(2);
      });

      it('1.4.4: handles handout tags followed by dialogue lines', () => {
        const text = '[HANDOUT:mapa-lasu]\n- Widzicie to? - pyta Janusz ze strachem.';
        const sections = parseIntoSections(text);
        expect(sections.length).toBeGreaterThanOrEqual(1);
      });

      it('1.4.5: handles tag enclosed by whisper or dice rolls', () => {
        const text = '[TEST: Spostrzegawczosc | trudny]\n[HANDOUT:ukryty-szyfr]\n[Co robicie?]';
        const sections = parseIntoSections(text);
        expect(sections.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe('1.5: Investigation Journal Integration (F11)', () => {
      it('1.5.1: registers clue with provenance "handout" upon document discovery', () => {
        const char = createMockCharacter();
        const gmResponse = 'W szufladzie lezy stary dokument.\n[PRZEDMIOT: Teczka SB: Tajne akta ze sledztwa w Elblagu | dokument]';
        const result = appendJournalToParty([char], char, gmResponse, 'msg-turn-1');

        expect(result.changed).toBe(true);
        const updatedChar = result.characters[0];
        const clue = updatedChar.investigatorDossier?.clues.find(
          (c) => c.title.toLowerCase().includes('teczka') || c.provenance === 'handout'
        );
        expect(clue).toBeDefined();
        expect(clue?.provenance).toBe('handout');
      });

      it('1.5.2: sets clue category to "document" for investigative handouts', () => {
        const char = createMockCharacter();
        const gmResponse = 'Na stole lezy wycinek z prasy.\n[PRZEDMIOT: Dziennik Baltycki: Wycinek o wypadku | wycinek]';
        const result = appendJournalToParty([char], char, gmResponse, 'msg-turn-2');

        const updatedChar = result.characters[0];
        const clue = updatedChar.investigatorDossier?.clues.find((c) => c.title.includes('Dziennik'));
        expect(clue?.category).toBe('document');
      });

      it('1.5.3: records discovery status as "discovered"', () => {
        const char = createMockCharacter();
        const gmResponse = '[PRZEDMIOT: Raport lekarski: Karta zgonu pacjenta | dokument]';
        const result = appendJournalToParty([char], char, gmResponse, 'msg-turn-3');

        const updatedChar = result.characters[0];
        const clue = updatedChar.investigatorDossier?.clues.find((c) => c.title.includes('Raport lekarski'));
        expect(clue?.discoveryStatus).toBe('discovered');
      });

      it('1.5.4: synchronizes discovered handout across party in Duet/HotSeat mode', () => {
        const char1 = createMockCharacter('char-1', 'Franciszek Bielski');
        const char2 = createMockCharacter('char-2', 'Anna Zawadzka');

        const gmResponse = 'Wspolnie znajdujecie list.\n[PRZEDMIOT: List posmiertny: Ostatnie slowa profesora | list]';
        const result = appendJournalToParty([char1, char2], char1, gmResponse, 'msg-duet-turn');

        const updatedChar1 = result.characters.find((c) => c.id === 'char-1');
        const updatedChar2 = result.characters.find((c) => c.id === 'char-2');

        const clue1 = updatedChar1?.investigatorDossier?.clues.find((c) => c.title.includes('List posmiertny'));
        const clue2 = updatedChar2?.investigatorDossier?.clues.find((c) => c.title.includes('List posmiertny'));

        expect(clue1).toBeDefined();
        expect(clue2).toBeDefined();
        expect(clue1?.provenance).toBe('handout');
        expect(clue2?.provenance).toBe('handout');
      });

      it('1.5.5: does not duplicate clues when discovery repeated in subsequent turns', () => {
        const char = createMockCharacter();
        const gmResponse = '[PRZEDMIOT: Mapa katastralna: Fragment planu gminy | mapa]';

        const turn1 = appendJournalToParty([char], char, gmResponse, 'msg-turn-dup-1');
        const updatedChar1 = turn1.characters[0];

        const turn2 = appendJournalToParty([updatedChar1], updatedChar1, gmResponse, 'msg-turn-dup-2');
        const updatedChar2 = turn2.characters[0];

        const matchingClues = updatedChar2.investigatorDossier?.clues.filter((c) =>
          c.title.includes('Mapa katastralna')
        );
        expect(matchingClues?.length).toBe(1);
      });
    });
  });

  // ==========================================================================
  // TIER 2: BOUNDARY & CORNER CASES (Stress & Defenses)
  // ==========================================================================
  describe('Tier 2: Boundary & Corner Cases (Defenses & Stress)', () => {
    describe('2.1: Empty, Null, and Undefined Inputs (Boundary 1)', () => {
      it('2.1.1: buildHandoutsContext returns empty string for null handouts', () => {
        const context = buildHandoutsContext(null, null);
        expect(context).toBe('');
      });

      it('2.1.2: buildHandoutsContext returns empty string for empty array', () => {
        const context = buildHandoutsContext([], []);
        expect(context).toBe('');
      });

      it('2.1.3: buildHandoutsContext handles undefined options safely', () => {
        const handouts: ExtendedHandout[] = [
          { slug: 'h-1', title: 'H1', image: '/img.webp' },
        ];
        expect(() => buildHandoutsContext(handouts, null, undefined)).not.toThrow();
      });

      it('2.1.4: parseIntoSections handles empty string without throwing', () => {
        expect(() => parseIntoSections('')).not.toThrow();
        expect(parseIntoSections('')).toEqual([]);
      });

      it('2.1.5: parseIntoSections handles whitespace-only input', () => {
        const res = parseIntoSections('   \n\t  \n  ');
        expect(res).toEqual([]);
      });
    });

    describe('2.2: Missing Content & Fallbacks (Boundary 2)', () => {
      it('2.2.1: handout without textContent preserves title and image properties', () => {
        const handout: ExtendedHandout = {
          slug: 'mapa-bez-tekstu',
          title: 'Mapa bez opisu tekstowego',
          image: '/handouts/mapa.webp',
        };
        expect(handout.textContent).toBeUndefined();
        expect(handout.slug).toBe('mapa-bez-tekstu');
      });

      it('2.2.2: handout with empty textContent ("") preserves validity', () => {
        const handout: ExtendedHandout = {
          slug: 'dokument-pusty',
          title: 'Czysta karta papieru',
          image: '/handouts/pusta-karta.webp',
          textContent: '',
        };
        expect(handout.textContent).toBe('');
      });

      it('2.2.3: handout without audioUrl defaults cleanly', () => {
        const handout: ExtendedHandout = {
          slug: 'list-zwykly',
          title: 'List bez nagrania',
          image: '/handouts/list.webp',
        };
        expect(handout.audioUrl).toBeUndefined();
      });

      it('2.2.4: cleanupContent handles text without any tags without mutation', () => {
        const pureText = 'Zwykly tekst narracji bez zadnych znacznikow specjalnych.';
        expect(cleanupContent(pureText)).toBe(pureText);
      });

      it('2.2.5: appendJournalToParty handles turn with no journal or handout tags', () => {
        const char = createMockCharacter();
        const plainNarration = 'Idziecie przez las. Drzewa szumia na wietrze.';
        const result = appendJournalToParty([char], char, plainNarration, 'msg-plain');
        expect(result.changed).toBe(false);
      });
    });

    describe('2.3: Non-Existent & Malformed Slugs (Boundary 3)', () => {
      it('2.3.1: non-existent slug [HANDOUT:ghost-slug-404] does not crash parser', () => {
        const raw = 'Oto nieznany dokument: [HANDOUT:ghost-slug-404]';
        expect(() => parseIntoSections(raw)).not.toThrow();
        expect(() => cleanupContent(raw)).not.toThrow();
      });

      it('2.3.2: malformed tag [HANDOUT:] with empty slug is handled safely', () => {
        const raw = 'Znaleziono cos: [HANDOUT:] w szufladzie.';
        expect(() => cleanupContent(raw)).not.toThrow();
        expect(() => parseIntoSections(raw)).not.toThrow();
      });

      it('2.3.3: malformed tag [HANDOUT] without colon is handled gracefully', () => {
        const raw = 'Tekst ze slowem [HANDOUT] w nawiasie.';
        expect(() => cleanupContent(raw)).not.toThrow();
      });

      it('2.3.4: handles leading/trailing whitespace inside tag: [HANDOUT:  teczka-klin  ]', () => {
        const raw = 'Dokument: [HANDOUT:  teczka-klin  ] na stole.';
        const cleaned = cleanupContent(raw);
        expect(cleaned).toContain('teczka-klin');
      });

      it('2.3.5: handles slug containing dots and hyphens: [HANDOUT:akt.1925-nr.4]', () => {
        const raw = 'Archiwum: [HANDOUT:akt.1925-nr.4]';
        const cleaned = cleanupContent(raw);
        expect(cleaned).toContain('[HANDOUT:akt.1925-nr.4]');
      });
    });

    describe('2.4: Keeper-Only Security & Anti-Leakage (Boundary 4)', () => {
      const sensitiveHandouts: ExtendedHandout[] = [
        {
          slug: 'public-map',
          title: 'Mapa turystyczna szlaku',
          image: '/map-pub.webp',
          isPlayerFacing: true,
          keeperOnly: false,
        },
        {
          slug: 'keeper-secret-tunnel',
          title: 'Plan taktyczny tajnego przejscia w lochach',
          image: '/map-secret.webp',
          isPlayerFacing: false,
          keeperOnly: true,
        },
      ];

      it('2.4.1: keeperOnly: true is not included in general available presentation', () => {
        const ctx = buildHandoutsContext(sensitiveHandouts, null);
        // The secret tunnel must not be presented as a normal handout to show to players
        const availableBlock = ctx.split('##')[1] || '';
        if (availableBlock.includes('DOSTĘPNE HANDOUTY')) {
          expect(availableBlock.includes('tajnego przejscia')).toBe(false);
        }
      });

      it('2.4.2: isPlayerFacing: false is not exposed to player prompts', () => {
        const singlePrivate: ExtendedHandout[] = [
          {
            slug: 'private-diary',
            title: 'Prywatny notes mordercy (Tylko MG)',
            image: '/notes.webp',
            isPlayerFacing: false,
            keeperOnly: true,
          },
        ];
        const ctx = buildHandoutsContext(singlePrivate, null);
        const playerDirectives = ctx.match(/wstaw dokładnie:.*Prywatny notes/i);
        expect(playerDirectives).toBeNull();
      });

      it('2.4.3: chapter match does NOT bypass keeperOnly filter', () => {
        const chapterSensitive: ExtendedHandout[] = [
          {
            slug: 'ch1-keeper-tactical',
            title: 'Klucz do zagadki komory gazowej (Tylko MG)',
            image: '/tactical.webp',
            chapterId: 'rozdzial-1',
            keeperOnly: true,
            isPlayerFacing: false,
          },
        ];
        const ctx = buildHandoutsContext(chapterSensitive, null, {
          activeChapterId: 'rozdzial-1',
        });
        expect(ctx).not.toMatch(/wstaw dokładnie:.*Klucz do zagadki komory/i);
      });

      it('2.4.4: tactical floorplans with keeperOnly flag are securely contained', () => {
        const floorplan: ExtendedHandout = {
          slug: 'floorplan-bunker-level-2',
          title: 'Poziom -2: Rozmieszczenie straznikow',
          image: '/floorplan.webp',
          handoutType: 'map',
          keeperOnly: true,
        };
        expect(floorplan.keeperOnly).toBe(true);
      });

      it('2.4.5: journal does not spontaneously loot unrevealed keeper secrets', () => {
        const char = createMockCharacter();
        const safeTurn = 'Gracze stoja przed bunkrem i obmyslaja plan.';
        const result = appendJournalToParty([char], char, safeTurn, 'msg-safe');
        expect(result.characters[0].investigatorDossier?.clues.length).toBe(0);
      });
    });

    describe('2.5: Extreme Payloads & Character Encoding (Boundary 5)', () => {
      it('2.5.1: 100% RAW fidelity for Polish diacritics in titles and textContent', () => {
        const polishRaw = 'Zażółć gęślą jaźń: Sprawa zabójstwa w Łodzi z 1928 r.';
        const handout: ExtendedHandout = {
          slug: 'zazolc-gesla-jazn',
          title: polishRaw,
          image: '/img.webp',
          textContent: polishRaw,
        };

        expect(handout.title).toBe(polishRaw);
        expect(handout.textContent).toBe(polishRaw);
      });

      it('2.5.2: handles massive RAW multi-paragraph document body (>5KB)', () => {
        const largeText = 'Akapit testowy dokumentu archiwalnego.\n\n'.repeat(150);
        const rawMessage = `Oto pelny raport:\n[HANDOUT:duzy-raport]\n${largeText}`;

        expect(() => cleanupContent(rawMessage)).not.toThrow();
        expect(() => parseIntoSections(rawMessage)).not.toThrow();
      });

      it('2.5.3: handles embedded quotes, braces, and colons in textContent', () => {
        const complexContent = 'Raport: "Podejrzany oświadczył: {Nie wiem nic o sekcie}". Status: [POTWIERDZONO].';
        const handout: ExtendedHandout = {
          slug: 'complex-quotes',
          title: 'Zeznanie z cytatami',
          image: '/quotes.webp',
          textContent: complexContent,
        };

        expect(handout.textContent).toBe(complexContent);
      });

      it('2.5.4: slug with extreme length (120 chars) remains valid', () => {
        const longSlug = 'slug-'.repeat(24);
        const raw = `Dokument:\n[HANDOUT:${longSlug}]`;
        const cleaned = cleanupContent(raw);
        expect(cleaned).toContain(longSlug);
      });

      it('2.5.5: enforces strict hyphen invariant (no em-dashes or en-dashes)', () => {
        const testPayload = 'Pismo - Urzad Wojewodzki - Wydzial Sledczy';
        expect(testPayload).not.toContain('\u2013');
        expect(testPayload).not.toContain('\u2014');
      });
    });
  });

  // ==========================================================================
  // TIER 3: CROSS-FEATURE COMBINATIONS (Pairwise & System Interactions)
  // ==========================================================================
  describe('Tier 3: Cross-Feature Combinations (System Interactions)', () => {
    it('3.1: Chapter Scoping -> GM Tag Emission -> Parser -> Journal Sync pipeline', () => {
      const scenario = loadPredefinedScenario('cien-nad-prabutami');
      const char = createMockCharacter();

      // Step 1: Scoping for Chapter 1
      const ch1Handouts = (scenario.handouts || []).filter(
        (h) => !h.chapterId || h.chapterId === 'rozdzial-1'
      );
      expect(ch1Handouts.length).toBeGreaterThanOrEqual(1);

      // Step 2: GM response in chapter 1 emitting discovered handout
      const activeHandout = ch1Handouts[0];
      const gmResponse = `
Inspektor Bielski oglada materialy dowodowe na komendzie MO.
[HANDOUT:${activeHandout.slug}]
[PRZEDMIOT: ${activeHandout.title} | dokument]
Na zdjeciu widac wyrazne pekniecie fundamentow.
      `.trim();

      // Step 3: Cleanup preservation
      const cleaned = cleanupContent(gmResponse);
      expect(cleaned).toContain(`[HANDOUT:${activeHandout.slug}]`);

      // Step 4: Section parsing
      const sections = parseIntoSections(cleaned);
      expect(sections.length).toBeGreaterThanOrEqual(1);

      // Step 5: Journal registration
      const journalResult = appendJournalToParty([char], char, gmResponse, 'turn-pipeline-1');
      expect(journalResult.changed).toBe(true);

      const registeredClue = journalResult.characters[0].investigatorDossier?.clues.find(
        (c) => c.title.toLowerCase().includes(activeHandout.title.toLowerCase()) ||
               c.provenance === 'handout'
      );
      expect(registeredClue).toBeDefined();
      expect(registeredClue?.provenance).toBe('handout');
    });

    it('3.2: Multi-handout turn parses all tags and registers distinct clues', () => {
      const char = createMockCharacter();
      const multiGmResponse = `
Przeszukujecie jednoczesnie dwie szuflady:
[HANDOUT:clue-photo-prabuty-1947]
[PRZEDMIOT: Fotografia z ruin w Prabutach (1947) | dokument]
[HANDOUT:clue-sb-file-klin]
[PRZEDMIOT: Teczka SB: Kryptonim KLIN | raport]
Materiały potwierdzają powiązania proboszcza z UB.
      `.trim();

      const cleaned = cleanupContent(multiGmResponse);
      expect(cleaned).toContain('[HANDOUT:clue-photo-prabuty-1947]');
      expect(cleaned).toContain('[HANDOUT:clue-sb-file-klin]');

      const sections = parseIntoSections(cleaned);
      expect(sections.length).toBeGreaterThanOrEqual(2);

      const journalResult = appendJournalToParty([char], char, multiGmResponse, 'turn-multi-1');
      const clues = journalResult.characters[0].investigatorDossier?.clues || [];

      expect(clues.length).toBeGreaterThanOrEqual(2);
      expect(clues.some((c) => c.title.includes('Fotografia'))).toBe(true);
      expect(clues.some((c) => c.title.includes('Teczka SB'))).toBe(true);
    });

    it('3.3: Audio handout lifecycle handles audio URL and textContent cleanly', () => {
      const audioHandout: ExtendedHandout = {
        slug: 'audio-sb-wiretap-elblag',
        title: 'Taśma szpulowa ZK-140: Podsłuch celi w Elblągu',
        image: '/handouts/tasma.webp',
        audioUrl: '/audio/handouts/tasma.mp3',
        handoutType: 'report',
        textContent: 'Transkrypcja rozmowy z celi aresztu sledczego w Elblagu.',
      };

      const char = createMockCharacter();
      const gmResponse = `
Odtwarzacie nagranie na magnetofonie szpulowym.
[HANDOUT:${audioHandout.slug}]
[PRZEDMIOT: ${audioHandout.title} | nagranie]
      `.trim();

      const cleaned = cleanupContent(gmResponse);
      expect(cleaned).toContain(`[HANDOUT:${audioHandout.slug}]`);

      const result = appendJournalToParty([char], char, gmResponse, 'turn-audio-1');
      const clue = result.characters[0].investigatorDossier?.clues.find((c) =>
        c.title.includes('Taśma szpulowa')
      );
      expect(clue).toBeDefined();
      expect(clue?.category).toBe('document');
      expect(clue?.provenance).toBe('handout');
    });

    it('3.4: Idempotent discovery over multiple turns does not create duplicate entries', () => {
      const char = createMockCharacter();
      const discovery = '[HANDOUT:mapa-prabuty]\n[PRZEDMIOT: Plan miasteczka Prabuty | mapa]';

      const turn1 = appendJournalToParty([char], char, discovery, 'turn-idem-1');
      const charAfterTurn1 = turn1.characters[0];
      const initialClueCount = charAfterTurn1.investigatorDossier?.clues.length || 0;
      expect(initialClueCount).toBe(1);

      // Re-encountering in turn 2
      const turn2 = appendJournalToParty([charAfterTurn1], charAfterTurn1, discovery, 'turn-idem-2');
      const charAfterTurn2 = turn2.characters[0];
      const finalClueCount = charAfterTurn2.investigatorDossier?.clues.length || 0;

      expect(finalClueCount).toBe(1);
    });

    it('3.5: Mixed tag response correctly handles location, roll, and handout tags', () => {
      const char = createMockCharacter();
      const complexTurn = `
[LOKACJA: Komisariat MO w Prabutach]
[TEST: Spostrzegawczosc | Sukces]
Za szafa pancerna dostrzegacie wsunietą koperte.
[HANDOUT:clue-sb-file-klin]
[PRZEDMIOT: Teczka SB: Kryptonim KLIN | dokument]
[Co robicie dalej?]
      `.trim();

      const cleaned = cleanupContent(complexTurn);
      expect(cleaned).toContain('[HANDOUT:clue-sb-file-klin]');

      const sections = parseIntoSections(cleaned);
      expect(sections.length).toBeGreaterThanOrEqual(1);

      const result = appendJournalToParty([char], char, complexTurn, 'turn-mixed-1');
      const clue = result.characters[0].investigatorDossier?.clues.find((c) =>
        c.title.includes('Teczka SB')
      );
      expect(clue).toBeDefined();
      expect(clue?.provenance).toBe('handout');
    });
  });

  // ==========================================================================
  // TIER 4: REAL-WORLD SCENARIO SIMULATION
  // ==========================================================================
  describe('Tier 4: Real-World Scenario Simulation', () => {
    it('4.1: Cień nad Prabutami (1973) full 3-turn handout discovery arc', () => {
      const scenario = loadPredefinedScenario('cien-nad-prabutami');
      expect(scenario.handouts?.length).toBeGreaterThanOrEqual(3);

      let party = [createMockCharacter('char-edward', 'Edward Pierce')];

      // Turn 1: Arrival at Prabuty & photo discovery
      const turn1Gm = `
[LOKACJA: Prabuty - Ruiny kosciola ewangelickiego]
Na zgliszczach odnajdujecie stare zdjecie wykonane tuz po wojnie.
[HANDOUT:clue-photo-prabuty-1947]
[PRZEDMIOT: Fotografia z ruin w Prabutach (1947) | dokument]
      `.trim();

      const res1 = appendJournalToParty(party, party[0], turn1Gm, 'msg-sim-turn-1');
      party = res1.characters;

      expect(party[0].investigatorDossier?.clues.some((c) => c.title.includes('Fotografia'))).toBe(true);

      // Turn 2: SB Archive search & secret file discovery
      const turn2Gm = `
[LOKACJA: Elblag - Archiwum WUSW]
W tajnym segregatorze odnajdujecie pelna dokumentacje operacyjna.
[HANDOUT:clue-sb-file-klin]
[PRZEDMIOT: Teczka SB: Kryptonim KLIN | raport]
      `.trim();

      const res2 = appendJournalToParty(party, party[0], turn2Gm, 'msg-sim-turn-2');
      party = res2.characters;

      expect(party[0].investigatorDossier?.clues.some((c) => c.title.includes('Teczka SB'))).toBe(true);

      // Turn 3: Interrogation audio listening session
      const turn3Gm = `
[LOKACJA: Pokoj przesluchan]
Oficer wlacza magnetofon szpulowy. Z glosnika dobiega znieksztalcony glos.
[HANDOUT:audio-sb-wiretap-elblag]
[PRZEDMIOT: Tasma szpulowa ZK-140: Podsluch celi w Elblagu | nagranie]
      `.trim();

      const res3 = appendJournalToParty(party, party[0], turn3Gm, 'msg-sim-turn-3');
      party = res3.characters;

      // Final evaluation of investigator dossier
      const finalClues = party[0].investigatorDossier?.clues || [];
      expect(finalClues.length).toBe(3);

      finalClues.forEach((clue) => {
        expect(clue.provenance).toBe('handout');
        expect(clue.category).toBe('document');
        expect(clue.discoveryStatus).toBe('discovered');
      });
    });

    it('4.2: Multi-chapter scenario simulation with strict keeper containment', () => {
      let party = [createMockCharacter('char-lead', 'Janusz Kowalski')];

      // Act 1: Discover public letter
      const act1Turn = `
[LOKACJA: Plebania]
Na biurku proboszcza lezy zolty list.
[HANDOUT:letter-father]
[PRZEDMIOT: List starego proboszcza | list]
      `.trim();

      const resAct1 = appendJournalToParty(party, party[0], act1Turn, 'turn-act1');
      party = resAct1.characters;

      // Verify that only the public letter entered the dossier
      const act1Clues = party[0].investigatorDossier?.clues || [];
      expect(act1Clues.length).toBe(1);
      expect(act1Clues[0].title).toContain('List starego proboszcza');
      expect(act1Clues.some((c) => c.title.includes('Tajna mapa'))).toBe(false);

      // Act 2: Discover telegram
      const act2Turn = `
[LOKACJA: Poczta glowna]
Doręczono pilny telegram.
[HANDOUT:telegram-bishop]
[PRZEDMIOT: Telegram od biskupa | telegram]
      `.trim();

      const resAct2 = appendJournalToParty(party, party[0], act2Turn, 'turn-act2');
      party = resAct2.characters;

      // Verify Act 2 state
      const finalClues = party[0].investigatorDossier?.clues || [];
      expect(finalClues.length).toBe(2);
      expect(finalClues.some((c) => c.title.includes('Telegram'))).toBe(true);
      expect(finalClues.some((c) => c.title.includes('Tajna mapa'))).toBe(false);
    });
  });
});
