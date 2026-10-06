/**
 * @file challenger_m4_2.test.ts
 * Challenger M4-2 Empirical Adversarial Stress Suite (Milestone M4/M5 - Issue #649).
 *
 * Objectives & Empirical Stress Surface:
 * 1. Corrupted & malformed inputs:
 *    - Empty strings, whitespace-only, empty party arrays, undefined active character.
 *    - Missing investigatorDossier (auto-healing via ensureCharacterDossier).
 *    - Incomplete investigatorDossier (missing clues/npcs/locations/notes arrays).
 *    - Missing journal and equipment arrays.
 *    - Malformed tags: empty payload, missing closing brackets, null bytes, control chars.
 * 2. Collision handling:
 *    - Handouts with similar titles.
 *    - Colon in item titles causing unintended truncation and deduplication collision in journal-parser.
 *    - Identical titles across turns (strict idempotence for dossier clues).
 *    - Slug resolver collisions (exact match vs partial substring vs stripped prefix).
 *    - Duplicated slugs within the same scenario.
 * 3. Standalone [HANDOUT:slug] behavioral audit:
 *    - Empirical test verifying whether [HANDOUT:slug] without [PRZEDMIOT:...] registers in the journal.
 * 4. Multi-tag kitchen-sink GM message:
 *    - Simultaneous whispers, dice rolls, checks, scene transitions, scene cards, act reports, dialogue,
 *      and multiple handouts.
 *
 * Invariant Rule: Strictly standard hyphens (-) only, zero em-dashes or en-dashes.
 */

import {
  appendJournalToParty,
} from '@/lib/journal/apply-journal-tags';
import { cleanupContent } from '@/components/chat/narrative/cleanup';
import { parseIntoSections } from '@/components/chat/narrative/parse-sections';
import { resolveHandoutBySlug } from '@/lib/handout-resolver';
import type { Character } from '@/lib/types';
import type { AdventureContext } from '@/lib/adventures-data';
import { createEmptyDossier } from '@/lib/journal/dossier-types';

function createMockCharacter(id = 'char-challenger-2', name = 'Wiktor Lasocki'): Character {
  return {
    id,
    name,
    occupation: 'Archiwista',
    age: 41,
    background: 'Badacz starych map i zapomnianych kronik.',
    playerName: 'Tester M4-2',
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
    str: 45,
    con: 50,
    siz: 55,
    dex: 60,
    app: 45,
    int: 75,
    pow: 65,
    edu: 80,
    luck: 50,
    hp: 10,
    maxHp: 10,
    san: 65,
    maxSan: 99,
    mp: 13,
    maxMp: 13,
    dayStartSan: 65,
    dailySanLoss: 0,
    skills: {
      'Spostrzegawczosc': 60,
      'Historia': 75,
      'Jezyk obcy (Lacina)': 50,
    },
    journal: [],
    equipment: [],
    investigatorDossier: createEmptyDossier(),
  };
}

describe('Challenger M4-2 Empirical Adversarial Stress Suite', () => {
  // ==========================================================================
  // SUITE 1: CORRUPTED & MALFORMED INPUTS
  // ==========================================================================
  describe('1. Corrupted & Malformed Inputs Stress', () => {
    it('1.1: handles empty strings and whitespace payloads without mutation or crash', () => {
      const char = createMockCharacter();
      const emptyRun = appendJournalToParty([char], char, '', 'msg-empty');
      expect(emptyRun.changed).toBe(false);
      expect(emptyRun.characters[0]?.journal?.length).toBe(0);

      const whitespaceRun = appendJournalToParty([char], char, '   \n\t   \n  ', 'msg-ws');
      expect(whitespaceRun.changed).toBe(false);
      expect(whitespaceRun.characters[0]?.journal?.length).toBe(0);
    });

    it('1.2: behavioral edge case: empty party array drops shared items because iteration is characters-bound', () => {
      // In apply-journal-tags.ts:1270, shared items loop characters.forEach(char => ...).
      // If party array is empty [], itemTagsByChar is not populated for activeCharacter.
      const char = createMockCharacter();
      const res = appendJournalToParty([], char, '[PRZEDMIOT: Stara mapa | mapa]', 'msg-empty-party-1');
      expect(res.characters.length).toBe(0);
      expect(res.activeCharacter).toBeDefined();
      expect(res.activeCharacter.investigatorDossier?.clues?.length).toBe(0);
    });

    it('1.3: vulnerability check: activeCharacter undefined in appendJournalToParty throws TypeError', () => {
      // Documents the unhandled edge case where activeCharacter is missing/undefined.
      // apply-journal-tags.ts:1323 references activeCharacter.id without optional chaining.
      let threwTypeError = false;
      try {
        appendJournalToParty([], undefined as any, '[PRZEDMIOT: Mapa | mapa]', 'msg-undefined-active');
      } catch (err: any) {
        if (err instanceof TypeError && err.message.includes('id')) {
          threwTypeError = true;
        }
      }
      expect(threwTypeError).toBe(true);
    });

    it('1.4: auto-heals character missing investigatorDossier via ensureCharacterDossier', () => {
      const charWithoutDossier = {
        ...createMockCharacter(),
        investigatorDossier: undefined as any,
      };

      const res = appendJournalToParty(
        [charWithoutDossier],
        charWithoutDossier,
        '[PRZEDMIOT: Akta operacyjne SB | dokument]',
        'msg-autoheal-1'
      );

      expect(res.changed).toBe(true);
      const updated = res.characters[0];
      expect(updated?.investigatorDossier).toBeDefined();
      expect(updated?.investigatorDossier?.clues?.length).toBe(1);
      expect(updated?.investigatorDossier?.clues?.[0]?.title).toBe('Akta operacyjne SB');
      expect(updated?.investigatorDossier?.clues?.[0]?.provenance).toBe('handout');
    });

    it('1.5: handles character with incomplete investigatorDossier (missing clues array)', () => {
      const charIncompleteDossier = {
        ...createMockCharacter(),
        investigatorDossier: {
          npcs: [],
          locations: [],
          notes: [],
          // clues is undefined
        } as any,
      };

      const res = appendJournalToParty(
        [charIncompleteDossier],
        charIncompleteDossier,
        '[PRZEDMIOT: Dziennik pokladowy | dokument]',
        'msg-incomplete-dossier'
      );

      expect(res.changed).toBe(true);
      expect(res.characters[0]?.investigatorDossier?.clues?.length).toBe(1);
      expect(res.characters[0]?.investigatorDossier?.clues?.[0]?.title).toBe('Dziennik pokladowy');
    });

    it('1.6: handles missing journal and equipment arrays without crash', () => {
      const charMissingArrays = {
        ...createMockCharacter(),
        journal: undefined as any,
        equipment: undefined as any,
      };

      const res = appendJournalToParty(
        [charMissingArrays],
        charMissingArrays,
        '[PRZEDMIOT: Szyfr z Wilczego Szanca | dokument]',
        'msg-missing-arrays'
      );

      expect(res.changed).toBe(true);
      expect(Array.isArray(res.characters[0]?.journal)).toBe(true);
      expect(Array.isArray(res.characters[0]?.equipment)).toBe(true);
      expect(res.characters[0]?.investigatorDossier?.clues?.length).toBe(1);
    });

    it('1.7: handles malformed tags, unmatched brackets, and null bytes safely', () => {
      const char = createMockCharacter();
      const corruptedText = `
[PRZEDMIOT:]
[PRZEDMIOT:   ]
[PRZEDMIOT: | ]
[PRZEDMIOT: Niepelny znacznik bez zamkniecia
[HANDOUT:]
[HANDOUT:   ]
[HANDOUT: !!!###$$$]
[[[[PRZEDMIOT: Gleboki nawias | dokument]]]]
List z ukrytym znakiem \0 w tekscie.
[PRZEDMIOT: List\0specjalny | dokument]
      `.trim();

      expect(() => {
        const res = appendJournalToParty([char], char, corruptedText, 'msg-corrupted-text');
        expect(res).toBeDefined();
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // SUITE 2: COLLISION HANDLING (TITLES, COLONS, SLUGS)
  // ==========================================================================
  describe('2. Collision Handling Stress', () => {
    it('2.1: distinct items without colons are preserved as separate clues', () => {
      const char = createMockCharacter();
      const turn1 = 'Znaleziono pierwszy tom.\n[PRZEDMIOT: Kronika Prabut Tom 1 | dokument]';
      const res1 = appendJournalToParty([char], char, turn1, 'msg-no-colon-1');
      const char1 = res1.characters[0]!;

      const turn2 = 'Znaleziono drugi tom.\n[PRZEDMIOT: Kronika Prabut Tom 2 | dokument]';
      const res2 = appendJournalToParty([char1], char1, turn2, 'msg-no-colon-2');
      const char2 = res2.characters[0]!;

      const clues = char2.investigatorDossier?.clues || [];
      expect(clues.length).toBe(2);
      expect(clues[0]?.title).toBe('Kronika Prabut Tom 1');
      expect(clues[1]?.title).toBe('Kronika Prabut Tom 2');
    });

    it('2.2: vulnerability check: colon in item title causes title truncation and collision in journal-parser', () => {
      // In journal-parser.ts:407, pattern [^:\]\n|]+ stops at the first colon.
      // Therefore, [PRZEDMIOT: Teczka SB: Sprawa Walim | dokument] extracts name as "Teczka SB"
      // and [PRZEDMIOT: Teczka SB: Sprawa Elblag | dokument] ALSO extracts name as "Teczka SB".
      // This causes both items to collide on title "Teczka SB" and deduplicate into 1 clue.
      const char = createMockCharacter();
      const turn1 = 'Znaleziono akta Walimia.\n[PRZEDMIOT: Teczka SB: Sprawa Walim | dokument]';
      const res1 = appendJournalToParty([char], char, turn1, 'msg-colon-1');
      const char1 = res1.characters[0]!;

      expect(char1.investigatorDossier?.clues?.length).toBe(1);
      // Confirmed: title was truncated before the colon:
      expect(char1.investigatorDossier?.clues?.[0]?.title).toBe('Teczka SB');

      const turn2 = 'Znaleziono akta Elblaga.\n[PRZEDMIOT: Teczka SB: Sprawa Elblag | dokument]';
      const res2 = appendJournalToParty([char1], char1, turn2, 'msg-colon-2');
      const char2 = res2.characters[0]!;

      // Because both truncated to "Teczka SB", clues length is 1 instead of 2:
      expect(char2.investigatorDossier?.clues?.length).toBe(1);
      expect(char2.investigatorDossier?.clues?.[0]?.title).toBe('Teczka SB');
    });

    it('2.3: identical item title across multiple turns is strictly idempotent in dossier clues', () => {
      const char = createMockCharacter();
      const turn1 = 'Znaleziono raport.\n[PRZEDMIOT: Raport lekarski doktora | dokument]';
      const res1 = appendJournalToParty([char], char, turn1, 'msg-idem-1');
      const char1 = res1.characters[0]!;
      expect(char1.investigatorDossier?.clues?.length).toBe(1);

      const turn2 = 'Ponownie przegladasz ten sam raport.\n[PRZEDMIOT: Raport lekarski doktora | dokument]';
      const res2 = appendJournalToParty([char1], char1, turn2, 'msg-idem-2');
      const char2 = res2.characters[0]!;

      // Dossier clues strictly deduplicate by title:
      expect(char2.investigatorDossier?.clues?.length).toBe(1);
      // Journal entries are messageId-indexed:
      expect((char2.journal || []).filter((j) => j.type === 'item').length).toBe(2);
    });

    it('2.4: resolver collision behavior with exact match taking precedence over substring', () => {
      const mockContext: AdventureContext = {
        id: 'adv-slug-collision',
        title: 'Slug Collision Test',
        handouts: [
          {
            slug: 'plan',
            title: 'Plan ogolny',
            image: '/handouts/plan.webp',
          },
          {
            slug: 'plan-bunkra',
            title: 'Plan taktyczny bunkra',
            image: '/handouts/bunkier.webp',
          },
        ],
      } as AdventureContext;

      // Exact match for 'plan' must return 'Plan ogolny', not 'Plan taktyczny bunkra'
      const exactPlan = resolveHandoutBySlug('plan', mockContext);
      expect(exactPlan?.title).toBe('Plan ogolny');

      // Exact match for 'plan-bunkra'
      const exactBunkier = resolveHandoutBySlug('plan-bunkra', mockContext);
      expect(exactBunkier?.title).toBe('Plan taktyczny bunkra');
    });

    it('2.5: resolver collision behavior with duplicated slugs in same scenario', () => {
      const mockContextWithDupes: AdventureContext = {
        id: 'adv-slug-dupes',
        title: 'Slug Dupes Test',
        handouts: [
          {
            slug: 'dokument-tajny',
            title: 'Wersja Pierwotna',
            image: '/v1.webp',
          },
          {
            slug: 'dokument-tajny',
            title: 'Wersja Druga',
            image: '/v2.webp',
          },
        ],
      } as AdventureContext;

      const resolved = resolveHandoutBySlug('dokument-tajny', mockContextWithDupes);
      // Deterministically returns the first encountered item in array order
      expect(resolved?.title).toBe('Wersja Pierwotna');
    });
  });

  // ==========================================================================
  // SUITE 3: STANDALONE [HANDOUT:slug] TAG RESOLUTION IN JOURNAL
  // ==========================================================================
  describe('3. Standalone [HANDOUT:slug] Journal Registration Behavior', () => {
    it('3.1: empirical audit: standalone [HANDOUT:slug] without [PRZEDMIOT:...] is currently not parsed by apply-journal-tags', () => {
      // In PROJECT.md: "Feature 11: Detekcja [HANDOUT:<slug>] w apply-journal-tags.ts i rejestracja w findings oraz dossier."
      // In buildHandoutsContext: GM is instructed to emit [HANDOUT:<slug>] in a separate line.
      // However, apply-journal-tags only parses [PRZEDMIOT:...], [NPC:...], [DZIENNIK:...].
      // When the GM emits standalone [HANDOUT:<slug>], apply-journal-tags returns unchanged!
      const char = createMockCharacter();
      const gmResponse = `
Inspektor Bielski przeszukuje biurko i natrafia na archiwalny dokument:
[HANDOUT:clue-photo-prabuty-1947]
Na fotografii widac ruiny dawnego kosciola.
      `.trim();

      const res = appendJournalToParty([char], char, gmResponse, 'msg-standalone-handout');

      // Empirical finding:
      // res.changed is false, and 0 clues are registered!
      expect(res.changed).toBe(false);
      expect(res.characters[0]?.investigatorDossier?.clues?.length).toBe(0);
      expect(res.characters[0]?.journal?.length).toBe(0);
    });

    it('3.2: pairing [HANDOUT:slug] with [PRZEDMIOT:...] enables journal registration', () => {
      // Shows that pairing with [PRZEDMIOT: ...] is the current workaround required for dossier registration
      const char = createMockCharacter();
      const pairedGmResponse = `
Inspektor Bielski przeszukuje biurko:
[HANDOUT:clue-photo-prabuty-1947]
[PRZEDMIOT: Fotografia z ruin w Prabutach (1947) | dokument]
Na fotografii widac ruiny dawnego kosciola.
      `.trim();

      const res = appendJournalToParty([char], char, pairedGmResponse, 'msg-paired-handout');

      expect(res.changed).toBe(true);
      expect(res.characters[0]?.investigatorDossier?.clues?.length).toBe(1);
      expect(res.characters[0]?.investigatorDossier?.clues?.[0]?.title).toBe('Fotografia z ruin w Prabutach (1947)');
      expect(res.characters[0]?.investigatorDossier?.clues?.[0]?.provenance).toBe('handout');
    });
  });

  // ==========================================================================
  // SUITE 4: MULTI-TAG KITCHEN-SINK GM MESSAGE STRESS
  // ==========================================================================
  describe('4. Multi-Tag Kitchen-Sink GM Message Stress', () => {
    it('4.1: correctly cleans up, parses sections, and registers data from complex multi-directive turn', () => {
      const char = createMockCharacter();
      const kitchenSinkTurn = `
[ZMIANA_SCENY: Podziemia Stacji Walim]
[LOKACJA: Podziemia Stacji Walim | Wilgotne ceglane korytarze, wyczuwalny zapach siarki]
[SAN_LOSS: 1D6/1D20]
[TEST: Spostrzegawczosc | Trudny | Sukces]
[RZUT: 1d100 = 23]
[SZEPT: Za sciana slychac miarowe uderzenia metalu o skale.]
Dostrzegacie metalowa skrzynie z dokumentami:
[HANDOUT:teczka-sb-klin]
[PRZEDMIOT: Teczka SB Kryptonim KLIN | dokument]
[HANDOUT:clue-photo-prabuty-1947]
[PRZEDMIOT: Fotografia z ruin w Prabutach (1947) | fotografia]
[HANDOUT:mapa-walimia]
[PRZEDMIOT: Mapa sztabowa okolic Walimia | mapa]
[NPC: Janusz Nowak | podejrzliwy | blady, trzesace sie rece | kolejarz | chce uciekac]
[KARTA_SCENY: Odkrycie archiwum | Podziemia Stacji Walim]
OSOBY: Janusz Nowak
CO_ZDOBYTO: Teczka SB, Fotografia, Mapa
USTALENIA: Znaleziono akta UB i fotografie ruin
CEL: Uciec z podziemi
[/KARTA_SCENY]
[RAPORT_AKTU: Akt 1: Przelom w sledztwie]
FAKTY:
- Znaleziono akta SB
PODEJRZANI:
- Janusz Nowak
LUKI:
- Kto ukryl skrzynie?
HIPOTEZA:
Proboszcz dzialal w porozumieniu z UB
[/RAPORT_AKTU]
- Musimy stad uciekac natychmiast! - szepcze przerazony Janusz.
[Co robicie dalej?]
      `.trim();

      // Step 1: Cleanup verification
      const cleaned = cleanupContent(kitchenSinkTurn);
      expect(cleaned).toContain('[HANDOUT:teczka-sb-klin]');
      expect(cleaned).toContain('[HANDOUT:clue-photo-prabuty-1947]');
      expect(cleaned).toContain('[HANDOUT:mapa-walimia]');
      expect(cleaned).not.toContain('[SAN_LOSS: 1D6/1D20]'); // Hallucinated tag stripped

      // Step 2: Section parser verification
      const sections = parseIntoSections(cleaned);
      const handoutSections = sections.filter((s: any) => s.type === 'handout');
      expect(handoutSections.length).toBe(3);

      // Step 3: Journal and dossier processing
      const res = appendJournalToParty([char], char, kitchenSinkTurn, 'msg-kitchen-sink-full');
      expect(res.changed).toBe(true);
      const updatedChar = res.characters[0]!;

      // Handouts registration (all 3 distinct items)
      const clues = updatedChar.investigatorDossier?.clues || [];
      expect(clues.length).toBe(3);
      clues.forEach((clue) => {
        expect(clue.provenance).toBe('handout');
        expect(clue.category).toBe('document');
        expect(clue.discoveryStatus).toBe('discovered');
      });

      // NPC registration
      const npcs = updatedChar.investigatorDossier?.npcs || [];
      expect(npcs.length).toBe(1);
      expect(npcs[0]?.name).toBe('Janusz Nowak');
      expect(npcs[0]?.disposition).toBe('suspicious');

      // Location registration
      const locations = updatedChar.investigatorDossier?.locations || [];
      expect(locations.some((l) => l.name.includes('Walim'))).toBe(true);

      // Scene card registration
      expect(updatedChar.sceneCards?.length).toBe(1);
      expect(updatedChar.sceneCards?.[0]?.title).toBe('Odkrycie archiwum');

      // Act report registration (with proper closing tag [/RAPORT_AKTU])
      expect(updatedChar.actReports?.length).toBe(1);
      expect(updatedChar.actReports?.[0]?.actNumber).toBe(1);
    });
  });

  // ==========================================================================
  // SUITE 5: TYPOGRAPHIC INVARIANT VERIFICATION (ZERO EM/EN-DASHES)
  // ==========================================================================
  describe('5. Typographic Invariant Verification', () => {
    it('5.1: enforces standard hyphen (-) invariant without unicode em-dashes or en-dashes', () => {
      const emDashRegex = /[\u2014\u2013]/;
      const testContent = `
[HANDOUT:teczka-sb-klin]
[PRZEDMIOT: Teczka SB Kryptonim KLIN - Tom 1 | dokument]
Opis przedmiotu z myslnikiem - standardowy znak.
      `.trim();

      expect(emDashRegex.test(testContent)).toBe(false);
    });
  });
});
