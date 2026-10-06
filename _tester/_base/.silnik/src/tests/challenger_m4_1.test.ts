/**
 * @file challenger_m4_1.test.ts
 * Challenger M4-1 Empirical Adversarial Test Harness (Milestone M4/M5).
 *
 * Scenarios empirically tested:
 * 1. Duet / HotSeat mode: 3 or 4 party members, mixed handout discoveries.
 *    - Shared items (without @Kto) synchronized to all investigators.
 *    - Targeted items (with @Kto: CharacterName) confined strictly to target.
 *    - Case-insensitivity, first-name matching, and unknown recipient safety.
 * 2. Category classification:
 *    - All 8 variants: mapa, plan, map, blueprint, wycinek, list, dokument, telegram.
 *    - Verifies all map and document variants receive category: 'document' and provenance: 'handout'.
 * 3. Idempotence across repeated turns:
 *    - 5 repeated turns encountering the same handout.
 *    - Strictly 1 clue in investigatorDossier.clues across all turns.
 *    - Multi-party idempotence across 4 investigators over 5 turns.
 * 4. Adversarial stress & boundary cases:
 *    - Quotes, colons, punctuation adjacency, and raw hyphen typography invariant.
 *
 * Invariant Rule: Strictly standard hyphens (-) only, zero em-dashes or en-dashes.
 */

import {
  appendJournalToParty,
  normalizeEquipmentCategory,
} from '@/lib/journal/apply-journal-tags';
import type { Character } from '@/lib/types';
import { createEmptyDossier } from '@/lib/journal/dossier-types';

function createMockCharacter(id: string, name: string): Character {
  return {
    id,
    name,
    occupation: 'Badacz',
    age: 35,
    background: 'Doświadczony śledczy badający zjawiska paranormalne.',
    playerName: `Gracz ${id}`,
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
    con: 50,
    siz: 50,
    dex: 50,
    app: 50,
    int: 70,
    pow: 60,
    edu: 70,
    luck: 50,
    hp: 10,
    maxHp: 10,
    san: 60,
    maxSan: 99,
    mp: 12,
    maxMp: 12,
    dayStartSan: 60,
    dailySanLoss: 0,
    skills: {
      'Spostrzegawczość': 65,
      'Ukrywanie': 50,
      'Mity Cthulhu': 5,
    },
    journal: [],
    investigatorDossier: createEmptyDossier(),
    equipment: [],
  };
}

describe('Challenger M4-1 Empirical Adversarial Test Suite', () => {
  // ==========================================================================
  // SUITE 1: DUET / HOTSEAT PARTY SYNCHRONIZATION (3-4 INVESTIGATORS)
  // ==========================================================================
  describe('1. Duet / HotSeat Party Synchronization', () => {
    let char1: Character;
    let char2: Character;
    let char3: Character;
    let char4: Character;

    beforeEach(() => {
      char1 = createMockCharacter('char-1', 'Franciszek Bielski');
      char2 = createMockCharacter('char-2', 'Anna Zawadzka');
      char3 = createMockCharacter('char-3', 'Piotr Wiśniewski');
      char4 = createMockCharacter('char-4', 'Maria Dąbrowska');
    });

    it('1.1: 3-member party receives shared handout without recipient', () => {
      const party = [char1, char2, char3];
      const gmMessage = `
W bibliotece na stole leży stary wolumin.
[PRZEDMIOT: Ksiega Eibona: Przekład łaciński z XVI wieku | dokument]
      `.trim();

      const result = appendJournalToParty(party, char1, gmMessage, 'msg-party-3-shared');
      expect(result.changed).toBe(true);

      for (const member of result.characters) {
        const clues = member.investigatorDossier?.clues || [];
        expect(clues.length).toBe(1);
        expect(clues[0].title).toBe('Ksiega Eibona');
        expect(clues[0].provenance).toBe('handout');
        expect(clues[0].category).toBe('document');
        expect(clues[0].discoveryStatus).toBe('discovered');
      }
    });

    it('1.2: 4-member party receives shared map without recipient across all dossiers', () => {
      const party = [char1, char2, char3, char4];
      const gmMessage = `
Na ścianie kwatery wisi wielka mapa sztabowa.
[PRZEDMIOT: Mapa taktyczna garnizonu: Pozycje obronne | mapa]
      `.trim();

      const result = appendJournalToParty(party, char2, gmMessage, 'msg-party-4-map');
      expect(result.changed).toBe(true);
      expect(result.characters.length).toBe(4);

      for (const member of result.characters) {
        const clues = member.investigatorDossier?.clues || [];
        expect(clues.length).toBe(1);
        expect(clues[0].title).toBe('Mapa taktyczna garnizonu');
        expect(clues[0].provenance).toBe('handout');
        expect(clues[0].category).toBe('document');
      }
    });

    it('1.3: character-specific item (@Kto: Anna) goes ONLY to the specified recipient', () => {
      const party = [char1, char2, char3, char4];
      const gmMessage = `
Kurier wręcza Annie zapieczętowaną przesyłkę.
[PRZEDMIOT:@Anna: List rodowy: Prywatna korespondencja familii | list]
      `.trim();

      const result = appendJournalToParty(party, char1, gmMessage, 'msg-targeted-anna');
      expect(result.changed).toBe(true);

      const updatedAnna = result.characters.find((c) => c.id === 'char-2')!;
      const updatedFranciszek = result.characters.find((c) => c.id === 'char-1')!;
      const updatedPiotr = result.characters.find((c) => c.id === 'char-3')!;
      const updatedMaria = result.characters.find((c) => c.id === 'char-4')!;

      // Anna must have the targeted handout clue
      expect(updatedAnna.investigatorDossier?.clues.length).toBe(1);
      expect(updatedAnna.investigatorDossier?.clues[0].title).toBe('List rodowy');
      expect(updatedAnna.investigatorDossier?.clues[0].provenance).toBe('handout');

      // The other three investigators must NOT receive the item
      expect(updatedFranciszek.investigatorDossier?.clues.length).toBe(0);
      expect(updatedPiotr.investigatorDossier?.clues.length).toBe(0);
      expect(updatedMaria.investigatorDossier?.clues.length).toBe(0);
    });

    it('1.4: mixed turn with 1 shared item and 2 character-specific items', () => {
      const party = [char1, char2, char3, char4];
      const gmMessage = `
Przeszukujecie archiwum. Wszyscy zauważacie plan na stole, Franciszek chowa swój notatnik, a Piotr zabiera telegram.
[PRZEDMIOT: Plan ewakuacji: Szkic wyjść pożarowych | plan]
[PRZEDMIOT:@Franciszek: Dziennik służbowy: Notatki z patrolu | dokument]
[PRZEDMIOT:@Piotr: Szyfrowany telegram: Depesza z ambasady | telegram]
      `.trim();

      const result = appendJournalToParty(party, char1, gmMessage, 'msg-mixed-party');
      expect(result.changed).toBe(true);

      const f = result.characters.find((c) => c.id === 'char-1')!;
      const a = result.characters.find((c) => c.id === 'char-2')!;
      const p = result.characters.find((c) => c.id === 'char-3')!;
      const m = result.characters.find((c) => c.id === 'char-4')!;

      // Franciszek: shared plan + personal journal = 2 clues
      expect(f.investigatorDossier?.clues.length).toBe(2);
      expect(f.investigatorDossier?.clues.some((c) => c.title === 'Plan ewakuacji')).toBe(true);
      expect(f.investigatorDossier?.clues.some((c) => c.title === 'Dziennik służbowy')).toBe(true);
      expect(f.investigatorDossier?.clues.some((c) => c.title === 'Szyfrowany telegram')).toBe(false);

      // Piotr: shared plan + personal telegram = 2 clues
      expect(p.investigatorDossier?.clues.length).toBe(2);
      expect(p.investigatorDossier?.clues.some((c) => c.title === 'Plan ewakuacji')).toBe(true);
      expect(p.investigatorDossier?.clues.some((c) => c.title === 'Szyfrowany telegram')).toBe(true);
      expect(p.investigatorDossier?.clues.some((c) => c.title === 'Dziennik służbowy')).toBe(false);

      // Anna: shared plan ONLY = 1 clue
      expect(a.investigatorDossier?.clues.length).toBe(1);
      expect(a.investigatorDossier?.clues[0].title).toBe('Plan ewakuacji');

      // Maria: shared plan ONLY = 1 clue
      expect(m.investigatorDossier?.clues.length).toBe(1);
      expect(m.investigatorDossier?.clues[0].title).toBe('Plan ewakuacji');
    });

    it('1.5: 4 distinct targeted items in one turn strictly isolate to 4 investigators', () => {
      const party = [char1, char2, char3, char4];
      const gmMessage = `
[PRZEDMIOT:@Franciszek: Akta sprawy Bielskiego | dokument]
[PRZEDMIOT:@Anna: Pamiętnik Zawadzkiej | dokument]
[PRZEDMIOT:@Piotr: Raport Wiśniewskiego | dokument]
[PRZEDMIOT:@Maria: List Dąbrowskiej | dokument]
      `.trim();

      const result = appendJournalToParty(party, char1, gmMessage, 'msg-4-isolated');
      expect(result.changed).toBe(true);

      const f = result.characters.find((c) => c.id === 'char-1')!;
      const a = result.characters.find((c) => c.id === 'char-2')!;
      const p = result.characters.find((c) => c.id === 'char-3')!;
      const m = result.characters.find((c) => c.id === 'char-4')!;

      expect(f.investigatorDossier?.clues.length).toBe(1);
      expect(f.investigatorDossier?.clues[0].title).toBe('Akta sprawy Bielskiego');

      expect(a.investigatorDossier?.clues.length).toBe(1);
      expect(a.investigatorDossier?.clues[0].title).toBe('Pamiętnik Zawadzkiej');

      expect(p.investigatorDossier?.clues.length).toBe(1);
      expect(p.investigatorDossier?.clues[0].title).toBe('Raport Wiśniewskiego');

      expect(m.investigatorDossier?.clues.length).toBe(1);
      expect(m.investigatorDossier?.clues[0].title).toBe('List Dąbrowskiej');
    });

    it('1.6: case-insensitivity and whitespace in @Kto prefix resolves accurately', () => {
      const party = [char1, char2];
      const gmMessage = `
[PRZEDMIOT:@anna: Dziennik małą literą | dokument]
[PRZEDMIOT:@  FRANCISZEK  : Dziennik wielką ze spacją | dokument]
      `.trim();

      const result = appendJournalToParty(party, char1, gmMessage, 'msg-case-spacing');
      const f = result.characters.find((c) => c.id === 'char-1')!;
      const a = result.characters.find((c) => c.id === 'char-2')!;

      expect(a.investigatorDossier?.clues.some((c) => c.title === 'Dziennik małą literą')).toBe(true);
      expect(f.investigatorDossier?.clues.some((c) => c.title === 'Dziennik wielką ze spacją')).toBe(true);
      expect(a.investigatorDossier?.clues.some((c) => c.title === 'Dziennik wielką ze spacją')).toBe(false);
      expect(f.investigatorDossier?.clues.some((c) => c.title === 'Dziennik małą literą')).toBe(false);
    });

    it('1.7: full name match vs first name match resolves safely', () => {
      const party = [char1, char2];
      const gmMessage = `
[PRZEDMIOT:@Franciszek Bielski: Pełne nazwisko | dokument]
      `.trim();

      const result = appendJournalToParty(party, char2, gmMessage, 'msg-full-name');
      const f = result.characters.find((c) => c.id === 'char-1')!;
      const a = result.characters.find((c) => c.id === 'char-2')!;

      expect(f.investigatorDossier?.clues.length).toBe(1);
      expect(f.investigatorDossier?.clues[0].title).toBe('Pełne nazwisko');
      expect(a.investigatorDossier?.clues.length).toBe(0);
    });

    it('1.8: unknown recipient (@Kto: Duch) is handled gracefully without crashing or polluting party', () => {
      const party = [char1, char2];
      const gmMessage = `
[PRZEDMIOT:@NieznanyBadacz99: Tajemniczy list znikąd | list]
      `.trim();

      expect(() => appendJournalToParty(party, char1, gmMessage, 'msg-unknown-who')).not.toThrow();
      const result = appendJournalToParty(party, char1, gmMessage, 'msg-unknown-who');

      const f = result.characters.find((c) => c.id === 'char-1')!;
      const a = result.characters.find((c) => c.id === 'char-2')!;
      expect(f.investigatorDossier?.clues.length).toBe(0);
      expect(a.investigatorDossier?.clues.length).toBe(0);
    });
  });

  // ==========================================================================
  // SUITE 2: CATEGORY CLASSIFICATION FOR ALL 8 HANDOUT VARIANTS
  // ==========================================================================
  describe('2. Category Classification (mapa, plan, map, blueprint, wycinek, list, dokument, telegram)', () => {
    let char: Character;

    beforeEach(() => {
      char = createMockCharacter('char-solo', 'Franciszek Bielski');
    });

    const testVariants: Array<{
      variant: string;
      rawTag: string;
      expectedTitle: string;
    }> = [
      {
        variant: 'mapa',
        rawTag: '[PRZEDMIOT: Mapa topograficzna lasu: Szczegóły terenu | mapa]',
        expectedTitle: 'Mapa topograficzna lasu',
      },
      {
        variant: 'plan',
        rawTag: '[PRZEDMIOT: Plan kondygnacji sanatorium: Rzut parteru | plan]',
        expectedTitle: 'Plan kondygnacji sanatorium',
      },
      {
        variant: 'map',
        rawTag: '[PRZEDMIOT: City Map: Downtown grid layout | map]',
        expectedTitle: 'City Map',
      },
      {
        variant: 'blueprint',
        rawTag: '[PRZEDMIOT: Factory Blueprint: Underground conduits | blueprint]',
        expectedTitle: 'Factory Blueprint',
      },
      {
        variant: 'wycinek',
        rawTag: '[PRZEDMIOT: Wycinek prasowy: Artykuł o pożarze w porcie | wycinek]',
        expectedTitle: 'Wycinek prasowy',
      },
      {
        variant: 'list',
        rawTag: '[PRZEDMIOT: List miłosny: Pożegnalne słowa | list]',
        expectedTitle: 'List miłosny',
      },
      {
        variant: 'dokument',
        rawTag: '[PRZEDMIOT: Tajny dokument: Akta śledcze policji | dokument]',
        expectedTitle: 'Tajny dokument',
      },
      {
        variant: 'telegram',
        rawTag: '[PRZEDMIOT: Telegram z centrali: Pilna depesza telegraficzna | telegram]',
        expectedTitle: 'Telegram z centrali',
      },
    ];

    testVariants.forEach(({ variant, rawTag, expectedTitle }) => {
      it(`2.1-2.8: variant "${variant}" receives category: 'document' and provenance: 'handout'`, () => {
        const result = appendJournalToParty([char], char, rawTag, `msg-variant-${variant}`);
        expect(result.changed).toBe(true);

        const updatedChar = result.characters[0];
        const clue = updatedChar.investigatorDossier?.clues.find((c) => c.title === expectedTitle);

        expect(clue).toBeDefined();
        expect(clue?.category).toBe('document');
        expect(clue?.provenance).toBe('handout');
        expect(clue?.discoveryStatus).toBe('discovered');
      });
    });

    it('2.9: title-based heuristic without explicit category recognizes map and plan variants', () => {
      const rawTag = `
[PRZEDMIOT: Mapa starych sztolni: Wyblakły kartograficzny szkic kopalni]
[PRZEDMIOT: Plan krypty: Rzut poziomy kamiennych komór]
      `.trim();

      const result = appendJournalToParty([char], char, rawTag, 'msg-title-heuristics');
      const clues = result.characters[0].investigatorDossier?.clues || [];

      expect(clues.length).toBe(2);

      const mapClue = clues.find((c) => c.title === 'Mapa starych sztolni')!;
      expect(mapClue).toBeDefined();
      expect(mapClue.category).toBe('document');
      expect(mapClue.provenance).toBe('handout');

      const planClue = clues.find((c) => c.title === 'Plan krypty')!;
      expect(planClue).toBeDefined();
      expect(planClue.category).toBe('document');
      expect(planClue.provenance).toBe('handout');
    });

    it('2.10: uppercase and mixed casing in category tokens parse accurately', () => {
      const rawTag = `
[PRZEDMIOT: Blueprint fabryczny: Schemat turbin | BLUEPRINT]
[PRZEDMIOT: Telegram sztabowy: Depesza alarmowa | Telegram]
      `.trim();

      const result = appendJournalToParty([char], char, rawTag, 'msg-uppercase-category');
      const clues = result.characters[0].investigatorDossier?.clues || [];

      expect(clues.length).toBe(2);
      expect(clues[0].category).toBe('document');
      expect(clues[0].provenance).toBe('handout');
      expect(clues[1].category).toBe('document');
      expect(clues[1].provenance).toBe('handout');
    });

    it('2.11: normalizeEquipmentCategory maps all handout variants to "document"', () => {
      expect(normalizeEquipmentCategory('mapa', true)).toBe('document');
      expect(normalizeEquipmentCategory('plan', true)).toBe('document');
      expect(normalizeEquipmentCategory('blueprint', true)).toBe('document');
      expect(normalizeEquipmentCategory('map', true)).toBe('document');
      expect(normalizeEquipmentCategory('telegram', true)).toBe('document');
      expect(normalizeEquipmentCategory('wycinek', true)).toBe('document');
      expect(normalizeEquipmentCategory('list', true)).toBe('document');
      expect(normalizeEquipmentCategory('dokument', true)).toBe('document');
      expect(normalizeEquipmentCategory('document', true)).toBe('document');
    });
  });

  // ==========================================================================
  // SUITE 3: IDEMPOTENCE (5 REPEATED TURNS STRESS)
  // ==========================================================================
  describe('3. Idempotence Across 5 Repeated Turns', () => {
    it('3.1: 5 repeated turns encountering identical handout tag yield strictly 1 clue', () => {
      let char = createMockCharacter('char-solo', 'Franciszek Bielski');
      const rawTurn = `
W bibliotece leży ten sam list od archiwisty.
[PRZEDMIOT: List archiwisty: Ostrzeżenie przed sektą | list]
      `.trim();

      for (let turn = 1; turn <= 5; turn++) {
        const result = appendJournalToParty([char], char, rawTurn, `msg-turn-repeated-${turn}`);
        char = result.characters[0];

        const clues = char.investigatorDossier?.clues || [];
        expect(clues.length).toBe(1);
        expect(clues[0].title).toBe('List archiwisty');
        expect(clues[0].provenance).toBe('handout');
        expect(clues[0].category).toBe('document');
      }

      // Final post-condition
      expect(char.investigatorDossier?.clues.length).toBe(1);
    });

    it('3.2: 5 repeated turns across a 4-player party maintains strictly 1 clue per investigator', () => {
      let party = [
        createMockCharacter('c-1', 'Franciszek Bielski'),
        createMockCharacter('c-2', 'Anna Zawadzka'),
        createMockCharacter('c-3', 'Piotr Wiśniewski'),
        createMockCharacter('c-4', 'Maria Dąbrowska'),
      ];

      const rawShared = `
[PRZEDMIOT: Mapa kanałów miejskich: Schemat podziemi | mapa]
      `.trim();

      for (let turn = 1; turn <= 5; turn++) {
        const result = appendJournalToParty(party, party[0], rawShared, `msg-party-turn-${turn}`);
        party = result.characters;

        for (const member of party) {
          const clues = member.investigatorDossier?.clues || [];
          expect(clues.length).toBe(1);
          expect(clues[0].title).toBe('Mapa kanałów miejskich');
        }
      }

      // Verify every member has strictly 1 clue after 5 turns
      for (const member of party) {
        expect(member.investigatorDossier?.clues.length).toBe(1);
      }
    });

    it('3.3: re-encountering handout with updated description updates fact without duplicating', () => {
      let char = createMockCharacter('char-solo', 'Franciszek Bielski');

      // Turn 1: Initial discovery
      const turn1 = '[PRZEDMIOT: Raport lekarski: Wstępne oględziny | dokument]';
      const res1 = appendJournalToParty([char], char, turn1, 'msg-update-t1');
      char = res1.characters[0];
      expect(char.investigatorDossier?.clues.length).toBe(1);

      // Turn 2-4: Same tag
      for (let turn = 2; turn <= 4; turn++) {
        const res = appendJournalToParty([char], char, turn1, `msg-update-t${turn}`);
        char = res.characters[0];
        expect(char.investigatorDossier?.clues.length).toBe(1);
      }

      // Turn 5: Enriched description
      const turn5 = '[PRZEDMIOT: Raport lekarski: Pełne badanie toksykologiczne wykazujące arszenik | dokument]';
      const res5 = appendJournalToParty([char], char, turn5, 'msg-update-t5');
      char = res5.characters[0];

      // Must remain strictly 1 clue
      expect(char.investigatorDossier?.clues.length).toBe(1);
      expect(char.investigatorDossier?.clues[0].title).toBe('Raport lekarski');
      expect(char.investigatorDossier?.clues[0].provenance).toBe('handout');
    });

    it('3.4: alternating discovery of 2 handouts over 5 turns produces strictly 2 clues', () => {
      let char = createMockCharacter('char-solo', 'Franciszek Bielski');
      const tagA = '[PRZEDMIOT: Dokument A: Tajne dossier | dokument]';
      const tagB = '[PRZEDMIOT: Mapa B: Szkic sytuacyjny | mapa]';

      const sequence = [tagA, tagB, tagA, tagB, tagA];

      sequence.forEach((tag, idx) => {
        const res = appendJournalToParty([char], char, tag, `msg-alt-turn-${idx + 1}`);
        char = res.characters[0];
      });

      const clues = char.investigatorDossier?.clues || [];
      expect(clues.length).toBe(2);
      expect(clues.some((c) => c.title === 'Dokument A')).toBe(true);
      expect(clues.some((c) => c.title === 'Mapa B')).toBe(true);
    });
  });

  // ==========================================================================
  // SUITE 4: ADVERSARIAL STRESS & CORNER CASES
  // ==========================================================================
  describe('4. Adversarial Stress & Corner Cases', () => {
    it('4.1: handles quotes, colons, and hyphens in handout names without crash', () => {
      const char = createMockCharacter('char-stress', 'Franciszek Bielski');
      const exoticTag = `
[PRZEDMIOT: "Plan sektora: B-4 (Magazyn 'Arka')" | plan]
      `.trim();

      const result = appendJournalToParty([char], char, exoticTag, 'msg-exotic-chars');
      expect(result.changed).toBe(true);

      const clue = result.characters[0].investigatorDossier?.clues[0];
      expect(clue).toBeDefined();
      expect(clue?.category).toBe('document');
      expect(clue?.provenance).toBe('handout');
    });

    it('4.2: handles tag directly preceded and followed by punctuation and dice rolls', () => {
      const char = createMockCharacter('char-stress', 'Franciszek Bielski');
      const crampedTag = `[TEST: Spostrzegawczość | 35/60 (sukces)][PRZEDMIOT: Telegram: Treść alarmowa | telegram][Co robicie?]`;

      const result = appendJournalToParty([char], char, crampedTag, 'msg-cramped-tags');
      const clue = result.characters[0].investigatorDossier?.clues.find((c) => c.title === 'Telegram');

      expect(clue).toBeDefined();
      expect(clue?.category).toBe('document');
      expect(clue?.provenance).toBe('handout');
    });

    it('4.3: enforces strict hyphen invariant on all test payloads and outputs', () => {
      const char = createMockCharacter('char-stress', 'Franciszek Bielski');
      const tag = '[PRZEDMIOT: Protokół przesłuchania - Komenda MO | dokument]';

      const result = appendJournalToParty([char], char, tag, 'msg-hyphen-check');
      const clue = result.characters[0].investigatorDossier?.clues[0];
      expect(clue).toBeDefined();
      if (!clue) return;

      // Verify no em-dash or en-dash in title or description
      expect(clue.title).not.toContain('\u2013');
      expect(clue.title).not.toContain('\u2014');
      expect(clue.description).not.toContain('\u2013');
      expect(clue.description).not.toContain('\u2014');
    });
  });
});
