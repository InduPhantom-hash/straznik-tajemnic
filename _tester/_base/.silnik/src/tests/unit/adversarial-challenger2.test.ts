import {
  resolveTestValue,
  resolveSkillBaseValue,
  UNKNOWN_SKILL_BASE,
} from '@/lib/skill-test-resolver';
import { extractSkillTests } from '@/lib/parsers/mechanics-parser';
import { extractGMMetadata } from '@/lib/parsers/index';
import { TAG_GM_THOUGHTS_PATTERN } from '@/lib/parsers/patterns';
import { cleanupContent } from '@/components/chat/narrative/cleanup';
import { formatNarrative } from '@/components/chat/narrative/formatter';
import {
  sanitizeMechanicalTags,
  sanitizeDiegeticProse,
} from '@/lib/parsers/text-cleaner';
import { getGMProtocolPrompt } from '@/lib/prompts/gm-protocol';
import type { Character } from '@/lib/types';

describe('EMPIRICAL CHALLENGER 2: R3, R4 & Parser/Prompt Integration', () => {
  // =========================================================================
  // SUITE 1: resolveTestValue & resolveSkillBaseValue (R4 Skill Diversity)
  // =========================================================================
  describe('SUITE 1: resolveTestValue with adversarial character sheets and rare skill groups', () => {
    const standardChar: Character = {
      id: 'char-std',
      name: 'Dr Franciszek Walczak',
      san: 55,
      str: 60,
      dex: 65,
      con: 50,
      app: 45,
      pow: 55,
      edu: 80,
      siz: 70,
      int: 85,
      luck: 50,
      skills: {
        'Urok Osobisty': 65,
        'Ślusarstwo': 50,
        'Medycyna': 75,
        'Księgowość': 60,
        'Prawo': 70,
        'Gadanina': 55,
        'Zastraszanie': 45,
      },
    } as unknown as Character;

    const objectSkillChar: Character = {
      id: 'char-obj',
      name: 'Antoni Nowak',
      san: 40,
      skills: {
        'Urok': { value: 65, markedForImprovement: false },
        'Ślusarstwo': { value: 50, markedForImprovement: true },
        'Medycyna': { value: 75, markedForImprovement: false },
        'Księgowość': { value: 60, markedForImprovement: false },
        'Prawo': { value: 70, markedForImprovement: false },
        'Gadanina': { value: 55, markedForImprovement: false },
        'Zastraszanie': { value: 45, markedForImprovement: false },
      },
    } as unknown as Character;

    const reversedSynonymChar: Character = {
      id: 'char-rev',
      name: 'Stanisław "Szperacz" Rybicki',
      san: 50,
      skills: {
        'Wytrychy': 52,
        'Szybka gadka': 58,
        'Finanse': 62,
        'Groźby': 48,
        'Czar': 66,
        'Diagnostyka': 76,
        'Znajomość prawa': 72,
      },
    } as unknown as Character;

    const strippedDiacriticsChar: Character = {
      id: 'char-ascii',
      name: 'Jan Brzoza',
      san: 60,
      skills: {
        'slusarstwo': 44,
        'ksiegowosc': 54,
        'urok osobisty': 64,
        'gadanina': 52,
        'zastraszanie': 42,
        'prawo': 68,
        'medycyna': 72,
      },
    } as unknown as Character;

    const emptyChar: Character = {
      id: 'char-empty',
      name: 'Nowicjusz',
      san: 50,
      skills: {},
    } as unknown as Character;

    describe('1.1 All 7 Rare Skill Groups and Canonical/Synonym matching', () => {
      it('Urok: resolves canonical names and synonyms (czar, wdzięk, urok osobisty, charm)', () => {
        expect(resolveTestValue('Urok', standardChar)).toBe(65);
        expect(resolveTestValue('Urok Osobisty', standardChar)).toBe(65);
        expect(resolveTestValue('czar', standardChar)).toBe(65);
        expect(resolveTestValue('wdzięk', standardChar)).toBe(65);
        expect(resolveTestValue('wdziek', standardChar)).toBe(65);
        expect(resolveTestValue('charm', standardChar)).toBe(65);
      });

      it('Gadanina: resolves canonical names and synonyms (szybka gadka, bajerowanie, nawijka, fast talk)', () => {
        expect(resolveTestValue('Gadanina', standardChar)).toBe(55);
        expect(resolveTestValue('szybka gadka', standardChar)).toBe(55);
        expect(resolveTestValue('bajerowanie', standardChar)).toBe(55);
        expect(resolveTestValue('nawijka', standardChar)).toBe(55);
        expect(resolveTestValue('fast talk', standardChar)).toBe(55);
      });

      it('Zastraszanie: resolves canonical names and synonyms (groźby, grozba, grozenie, intymidacja, intimidate)', () => {
        expect(resolveTestValue('Zastraszanie', standardChar)).toBe(45);
        expect(resolveTestValue('groźby', standardChar)).toBe(45);
        expect(resolveTestValue('grozba', standardChar)).toBe(45);
        expect(resolveTestValue('grożenie', standardChar)).toBe(45);
        expect(resolveTestValue('intymidacja', standardChar)).toBe(45);
        expect(resolveTestValue('intimidate', standardChar)).toBe(45);
      });

      it('Ślusarstwo: resolves canonical names and synonyms (wytrychy, otwieranie zamków, włamywanie, locksmith)', () => {
        expect(resolveTestValue('Ślusarstwo', standardChar)).toBe(50);
        expect(resolveTestValue('wytrychy', standardChar)).toBe(50);
        expect(resolveTestValue('otwieranie zamków', standardChar)).toBe(50);
        expect(resolveTestValue('otwieranie zamkow', standardChar)).toBe(50);
        expect(resolveTestValue('włamywanie', standardChar)).toBe(50);
        expect(resolveTestValue('wlamywanie', standardChar)).toBe(50);
        expect(resolveTestValue('locksmith', standardChar)).toBe(50);
      });

      it('Księgowość: resolves canonical names and synonyms (finanse, rachunkowość, audyt, accounting)', () => {
        expect(resolveTestValue('Księgowość', standardChar)).toBe(60);
        expect(resolveTestValue('finanse', standardChar)).toBe(60);
        expect(resolveTestValue('rachunkowość', standardChar)).toBe(60);
        expect(resolveTestValue('rachunkowosc', standardChar)).toBe(60);
        expect(resolveTestValue('audyt', standardChar)).toBe(60);
        expect(resolveTestValue('accounting', standardChar)).toBe(60);
      });

      it('Prawo: resolves canonical names and synonyms (znajomość prawa, przepisy prawne, law)', () => {
        expect(resolveTestValue('Prawo', standardChar)).toBe(70);
        expect(resolveTestValue('znajomość prawa', standardChar)).toBe(70);
        expect(resolveTestValue('znajomosc prawa', standardChar)).toBe(70);
        expect(resolveTestValue('przepisy prawne', standardChar)).toBe(70);
        expect(resolveTestValue('law', standardChar)).toBe(70);
      });

      it('Medycyna: resolves canonical names and synonyms (diagnostyka, sztuka lekarska, leczenie, medicine)', () => {
        expect(resolveTestValue('Medycyna', standardChar)).toBe(75);
        expect(resolveTestValue('diagnostyka', standardChar)).toBe(75);
        expect(resolveTestValue('sztuka lekarska', standardChar)).toBe(75);
        expect(resolveTestValue('leczenie', standardChar)).toBe(75);
        expect(resolveTestValue('medicine', standardChar)).toBe(75);
      });
    });

    describe('1.2 Adversarial Casing, Diacritics and Whitespace Resilience', () => {
      it('handles UPPERCASE, lowercase, and MixedCase input', () => {
        expect(resolveTestValue('WYTRYCHY', standardChar)).toBe(50);
        expect(resolveTestValue('wytrychy', standardChar)).toBe(50);
        expect(resolveTestValue('Wytrychy', standardChar)).toBe(50);

        expect(resolveTestValue('FINANSE', standardChar)).toBe(60);
        expect(resolveTestValue('finanse', standardChar)).toBe(60);

        expect(resolveTestValue('CZAR', standardChar)).toBe(65);
        expect(resolveTestValue('DIAGNOSTYKA', standardChar)).toBe(75);
        expect(resolveTestValue('ZNAJOMOŚĆ PRAWA', standardChar)).toBe(70);
        expect(resolveTestValue('SZYBKA GADKA', standardChar)).toBe(55);
        expect(resolveTestValue('GROŹBY', standardChar)).toBe(45);
      });

      it('handles diacritic variations (with vs without Polish diacritics)', () => {
        expect(resolveTestValue('slusarstwo', standardChar)).toBe(50);
        expect(resolveTestValue('Ślusarstwo', standardChar)).toBe(50);
        expect(resolveTestValue('ksiegowosc', standardChar)).toBe(60);
        expect(resolveTestValue('Księgowość', standardChar)).toBe(60);
        expect(resolveTestValue('grozby', standardChar)).toBe(45);
        expect(resolveTestValue('groźby', standardChar)).toBe(45);
      });

      it('handles irregular and extra whitespace', () => {
        expect(resolveTestValue('   szybka     gadka   ', standardChar)).toBe(55);
        expect(resolveTestValue('  znajomość    prawa ', standardChar)).toBe(70);
        expect(resolveTestValue('\tsztuka   lekarska\n', standardChar)).toBe(75);
      });
    });

    describe('1.3 Adversarial Character Sheet Structures', () => {
      it('handles SkillData objects { value: N } seamlessly', () => {
        expect(resolveTestValue('Urok', objectSkillChar)).toBe(65);
        expect(resolveTestValue('Ślusarstwo', objectSkillChar)).toBe(50);
        expect(resolveTestValue('wytrychy', objectSkillChar)).toBe(50);
        expect(resolveTestValue('Medycyna', objectSkillChar)).toBe(75);
        expect(resolveTestValue('diagnostyka', objectSkillChar)).toBe(75);
        expect(resolveTestValue('Księgowość', objectSkillChar)).toBe(60);
        expect(resolveTestValue('finanse', objectSkillChar)).toBe(60);
        expect(resolveTestValue('Prawo', objectSkillChar)).toBe(70);
        expect(resolveTestValue('znajomość prawa', objectSkillChar)).toBe(70);
        expect(resolveTestValue('Gadanina', objectSkillChar)).toBe(55);
        expect(resolveTestValue('szybka gadka', objectSkillChar)).toBe(55);
        expect(resolveTestValue('Zastraszanie', objectSkillChar)).toBe(45);
        expect(resolveTestValue('groźby', objectSkillChar)).toBe(45);
      });

      it('handles sheets where character sheet has synonym keys and AI asks for standard CoC names (Reverse lookup)', () => {
        expect(resolveTestValue('Ślusarstwo', reversedSynonymChar)).toBe(52);
        expect(resolveTestValue('Gadanina', reversedSynonymChar)).toBe(58);
        expect(resolveTestValue('Księgowość', reversedSynonymChar)).toBe(62);
        expect(resolveTestValue('Zastraszanie', reversedSynonymChar)).toBe(48);
        expect(resolveTestValue('Urok', reversedSynonymChar)).toBe(66);
        expect(resolveTestValue('Urok Osobisty', reversedSynonymChar)).toBe(66);
        expect(resolveTestValue('Medycyna', reversedSynonymChar)).toBe(76);
        expect(resolveTestValue('Prawo', reversedSynonymChar)).toBe(72);
      });

      it('handles sheets where character sheet keys have stripped diacritics', () => {
        expect(resolveTestValue('Ślusarstwo', strippedDiacriticsChar)).toBe(44);
        expect(resolveTestValue('Księgowość', strippedDiacriticsChar)).toBe(54);
        expect(resolveTestValue('Urok', strippedDiacriticsChar)).toBe(64);
        expect(resolveTestValue('Gadanina', strippedDiacriticsChar)).toBe(52);
        expect(resolveTestValue('Zastraszanie', strippedDiacriticsChar)).toBe(42);
        expect(resolveTestValue('Prawo', strippedDiacriticsChar)).toBe(68);
        expect(resolveTestValue('Medycyna', strippedDiacriticsChar)).toBe(72);
      });

      it('returns null safely for null or empty character or empty query', () => {
        expect(resolveTestValue('', standardChar)).toBeNull();
        expect(resolveTestValue('Ślusarstwo', null)).toBeNull();
        expect(resolveTestValue('Ślusarstwo', emptyChar)).toBeNull();
      });
    });

    describe('1.4 Unknown Skills Fallback (UNKNOWN_SKILL_BASE = 15%) and BASE_SKILLS fallback', () => {
      it('returns null from resolveTestValue for skills not present on character sheet', () => {
        expect(resolveTestValue('Krojenie Cebuli', standardChar)).toBeNull();
        expect(resolveTestValue('Nawigacja Kosmiczna', standardChar)).toBeNull();
      });

      it('returns base value from BASE_SKILLS via resolveSkillBaseValue when skill is missing from character', () => {
        // Ślusarstwo = 1, Medycyna = 1, Gadanina = 5, Księgowość = 5, Prawo = 5, Urok Osobisty = 15, Zastraszanie = 15
        expect(resolveSkillBaseValue('Ślusarstwo')).toBe(1);
        expect(resolveSkillBaseValue('wytrychy')).toBe(1);
        expect(resolveSkillBaseValue('Medycyna')).toBe(1);
        expect(resolveSkillBaseValue('diagnostyka')).toBe(1);
        expect(resolveSkillBaseValue('Gadanina')).toBe(5);
        expect(resolveSkillBaseValue('szybka gadka')).toBe(5);
        expect(resolveSkillBaseValue('Księgowość')).toBe(5);
        expect(resolveSkillBaseValue('finanse')).toBe(5);
        expect(resolveSkillBaseValue('Prawo')).toBe(5);
        expect(resolveSkillBaseValue('znajomość prawa')).toBe(5);
        expect(resolveSkillBaseValue('Urok')).toBe(15);
        expect(resolveSkillBaseValue('czar')).toBe(15);
        expect(resolveSkillBaseValue('Zastraszanie')).toBe(15);
        expect(resolveSkillBaseValue('groźby')).toBe(15);
      });

      it('falls back to UNKNOWN_SKILL_BASE (15%) when skill is not on sheet and not in BASE_SKILLS', () => {
        const unknownSkill = 'Telekineza Parapsychologiczna';
        const resolvedOnSheet = resolveTestValue(unknownSkill, standardChar);
        const resolvedInBase = resolveSkillBaseValue(unknownSkill);
        const finalValue = resolvedOnSheet ?? resolvedInBase ?? UNKNOWN_SKILL_BASE;

        expect(resolvedOnSheet).toBeNull();
        expect(resolvedInBase).toBeNull();
        expect(finalValue).toBe(15);
        expect(UNKNOWN_SKILL_BASE).toBe(15);
      });
    });
  });

  // =========================================================================
  // SUITE 2: Regex Compatibility for Combined Tests (mechanics-parser.ts)
  // =========================================================================
  describe('SUITE 2: mechanics-parser.ts combined test extraction and operator LUB verification', () => {
    it('handles [TEST: Spostrzegawczość LUB Ślusarstwo | zwykły | | Szukasz skrytki]', () => {
      const text =
        'Zaglądasz pod biurko.\n[TEST: Spostrzegawczość LUB Ślusarstwo | zwykły | | Szukasz ukrytego mechanizmu]';
      const tests = extractSkillTests(text);

      expect(tests).toHaveLength(1);
      const t = tests[0];
      expect(t.skillName).toBe('Spostrzegawczość LUB Ślusarstwo');
      expect(t.difficulty).toBe('zwykly');
      expect(t.justification).toBe('Szukasz ukrytego mechanizmu');
      expect(t.combined).toBeDefined();
      expect(t.combined?.operator).toBe('OR');
      expect(t.combined?.skills).toHaveLength(2);
      expect(t.combined?.skills[0].skillName).toBe('Spostrzegawczość');
      expect(t.combined?.skills[1].skillName).toBe('Ślusarstwo');
    });

    it('handles [TEST: Perswazja LUB Prawo | trudny | | Negocjacje z prokuratorem]', () => {
      const text =
        'Prokurator spogląda chłodno.\n[TEST: Perswazja LUB Prawo | trudny | | Przekonujesz o legalności działań]';
      const tests = extractSkillTests(text);

      expect(tests).toHaveLength(1);
      const t = tests[0];
      expect(t.skillName).toBe('Perswazja LUB Prawo');
      expect(t.difficulty).toBe('trudny');
      expect(t.combined?.operator).toBe('OR');
      expect(t.combined?.skills).toEqual([
        { skillName: 'Perswazja', skillValue: 0 },
        { skillName: 'Prawo', skillValue: 0 },
      ]);
    });

    it('handles multi-skill combined test [TEST: Urok LUB Gadanina LUB Zastraszanie LUB Perswazja | zwykły | | Przełamanie oporu]', () => {
      const text =
        '[TEST: Urok LUB Gadanina LUB Zastraszanie LUB Perswazja | zwykły | | Złamanie oporu świadka]';
      const tests = extractSkillTests(text);

      expect(tests).toHaveLength(1);
      const t = tests[0];
      expect(t.combined?.operator).toBe('OR');
      expect(t.combined?.skills).toHaveLength(4);
      expect(t.combined?.skills.map((s) => s.skillName)).toEqual([
        'Urok',
        'Gadanina',
        'Zastraszanie',
        'Perswazja',
      ]);
    });

    it('handles addressed character combined tests [TEST:@Franciszek: Spostrzegawczość LUB Ślusarstwo | ...]', () => {
      const text =
        '[TEST:@Franciszek Walczak: Spostrzegawczość LUB Ślusarstwo | zwykły | Ciemność:-1 | Otwieranie kasetki]';
      const tests = extractSkillTests(text);

      expect(tests).toHaveLength(1);
      const t = tests[0];
      expect(t.characterName).toBe('Franciszek Walczak');
      expect(t.skillName).toBe('Spostrzegawczość LUB Ślusarstwo');
      expect(t.modifiers).toEqual([
        { type: 'penalty', reason: 'Ciemność', count: 1 },
      ]);
      expect(t.combined?.operator).toBe('OR');
      expect(t.combined?.skills.map((s) => s.skillName)).toEqual([
        'Spostrzegawczość',
        'Ślusarstwo',
      ]);
    });

    it('handles AND operator [TEST: Elektryka I Mechanika | zwykły | | ...] as combined operator AND', () => {
      const text =
        '[TEST: Elektryka I Mechanika | zwykły | | Naprawa generatora]';
      const tests = extractSkillTests(text);

      expect(tests).toHaveLength(1);
      expect(tests[0].combined?.operator).toBe('AND');
      expect(tests[0].combined?.skills.map((s) => s.skillName)).toEqual([
        'Elektryka',
        'Mechanika',
      ]);
    });

    it('simulates useChat runtime resolution of OR combined test taking max skill value', () => {
      const testCharacter: Character = {
        id: 'char-1',
        skills: {
          'Spostrzegawczość': 25,
          'Ślusarstwo': 50,
          'Perswazja': 10,
          'Prawo': 70,
        },
      } as unknown as Character;

      const [test] = extractSkillTests(
        '[TEST: Spostrzegawczość LUB Ślusarstwo | zwykły | | Test]'
      );
      expect(test.combined).toBeDefined();

      const resolvedSkills = test.combined!.skills.map((sub) => ({
        skillName: sub.skillName,
        skillValue:
          resolveTestValue(sub.skillName, testCharacter) ??
          resolveSkillBaseValue(sub.skillName) ??
          UNKNOWN_SKILL_BASE,
      }));

      const resolvedSkillValue =
        test.combined!.operator === 'OR'
          ? Math.max(...resolvedSkills.map((s) => s.skillValue))
          : Math.min(...resolvedSkills.map((s) => s.skillValue));

      expect(resolvedSkills).toEqual([
        { skillName: 'Spostrzegawczość', skillValue: 25 },
        { skillName: 'Ślusarstwo', skillValue: 50 },
      ]);
      expect(resolvedSkillValue).toBe(50);
    });

    it('empirically verifies why slash / is invalid and LUB is strictly required in gm-protocol', () => {
      // If AI were to emit slash instead of LUB:
      const badText =
        '[TEST: Spostrzegawczość / Ślusarstwo | zwykły | | Otwieranie]';
      const [badTest] = extractSkillTests(badText);

      // mechanics-parser DOES NOT split on slash, so combined is undefined!
      expect(badTest.combined).toBeUndefined();
      expect(badTest.skillName).toBe('Spostrzegawczość / Ślusarstwo');

      // Without combined OR logic, resolving "Spostrzegawczość / Ślusarstwo"
      // erroneously matches only the first token via substring and gives 25%,
      // failing to choose Math.max(25, 50) = 50%:
      const resolved = resolveTestValue(badTest.skillName, {
        skills: { 'Spostrzegawczość': 25, 'Ślusarstwo': 50 },
      } as unknown as Character);
      expect(resolved).toBe(25); // Fails to provide 50% from Ślusarstwo!

      // And for skills not matching character sheet:
      const resolvedUnknown = resolveTestValue('Fizyka / Astronomia', {
        skills: { 'Spostrzegawczość': 25, 'Ślusarstwo': 50 },
      } as unknown as Character);
      expect(resolvedUnknown).toBeNull();
    });
  });

  // =========================================================================
  // SUITE 3: Prompt Text Verification in gm-protocol.ts (Strict LUB enforcement)
  // =========================================================================
  describe('SUITE 3: gm-protocol.ts prompt text invariants', () => {
    const promptText = getGMProtocolPrompt();

    it('strictly enforces LUB in combined test prompt directives', () => {
      expect(promptText).toContain(
        '[TEST: Spostrzegawczość LUB Ślusarstwo | ...]'
      );
      expect(promptText).toContain(
        '[TEST: Perswazja LUB Prawo | ...]'
      );
      expect(promptText).toContain('Testy Łączone z Operatorem LUB');
    });

    it('does NOT use slash / in combined skill calls within gm-protocol.ts', () => {
      // Find all matches of [TEST: ...] in getGMProtocolPrompt()
      const testMatches = promptText.match(/\[TEST:[^\]]+\]/g) || [];
      expect(testMatches.length).toBeGreaterThan(0);

      // Verify no test match contains slash between skill names (e.g., "Spostrzegawczość / Ślusarstwo")
      for (const match of testMatches) {
        // Difficulty parameter format placeholder is "zwykły/trudny/ekstremalny" - that's allowed in template definition
        // But the skill name part before the first pipe MUST NOT contain "/"
        const skillPart = match.replace(/^\[TEST:\s*/, '').split('|')[0].trim();
        expect(skillPart).not.toContain('/');
      }
    });

    it('enforces Fair Play pre-existing clues and Knox & Van Dine rules in gm-protocol.ts', () => {
      expect(promptText).toContain(
        'FAIR PLAY & ZASADA PRE-EXISTING CLUES'
      );
      expect(promptText).toContain(
        'BEZWZGLĘDNY ZAKAZ GENEROWANIA FANTOMOWYCH PRZEDMIOTÓW Z PRÓŻNI'
      );
      expect(promptText).toContain('Honest Empty Searches');
    });

    it('enforces respecting player diegetic counter-proposals in gm-protocol.ts', () => {
      expect(promptText).toContain(
        'AUTORSKA KONTRPROPOZYCJA GRACZA POPARTA DIEGETYCZNIE'
      );
      expect(promptText).toContain(
        'BEZWZGLĘDNY OBOWIĄZEK przyjąć tę kontrpropozycję'
      );
    });
  });

  // =========================================================================
  // SUITE 4: [MYŚLI_MG: ... | REAKCJA_WROGA: ...] Parsing and Extractors
  // =========================================================================
  describe('SUITE 4: [MYŚLI_MG: ... | REAKCJA_WROGA: ...] parser and stripper resilience', () => {
    const rawAiResponse =
      `[MYŚLI_MG: Gracz hałasuje w dokach. | MASKA_NPC: uprzejmy bosman | RETRO_ZIARNO: pył węglowy na butach | KORELACJA: pasuje do śladu z magazynu | ECHO_AKCJI: policja krąży po nabrzeżu | REAKCJA_WROGA: dwaj zbiry w prochowcach zachodzą gracza od tyłu w ciemnym zaułku]\n` +
      `Bosman unosi wzrok znad skrzyni i mierzy cię chłodnym spojrzeniem.\n\n` +
      `„Lepiej stąd idź, panie. To nie miejsce dla ciekawskich.”\n\n` +
      `[Co robisz?]`;

    it('extractGMMetadata extracts full thoughts including REAKCJA_WROGA without corruption', () => {
      const meta = extractGMMetadata(rawAiResponse);
      expect(meta.thoughts).toBeDefined();
      expect(meta.thoughts).toContain('Gracz hałasuje w dokach.');
      expect(meta.thoughts).toContain('REAKCJA_WROGA: dwaj zbiry w prochowcach zachodzą gracza od tyłu');
      expect(meta.thoughts).toContain('ECHO_AKCJI: policja krąży');
    });

    it('TAG_GM_THOUGHTS_PATTERN matches across multiple pipe sections', () => {
      const regex = new RegExp(TAG_GM_THOUGHTS_PATTERN.source, 'i');
      const match = rawAiResponse.match(regex);
      expect(match).not.toBeNull();
      expect(match![1]).toContain('REAKCJA_WROGA: dwaj zbiry');
    });

    it('formatNarrative extracts thoughts with REAKCJA_WROGA in Director Mode', () => {
      const sections = formatNarrative(rawAiResponse, undefined, undefined, true);
      expect(sections).toBeDefined();
      expect(sections.length).toBeGreaterThan(0);
    });

    it('cleanupContent strips [MYŚLI_MG: ... | REAKCJA_WROGA: ...] completely from player view', () => {
      const cleaned = cleanupContent(rawAiResponse);
      expect(cleaned).not.toContain('MYŚLI_MG');
      expect(cleaned).not.toContain('REAKCJA_WROGA');
      expect(cleaned).not.toContain('MASKA_NPC');
      expect(cleaned).not.toContain('ECHO_AKCJI');
      expect(cleaned).toContain('Bosman unosi wzrok znad skrzyni');
      expect(cleaned).toContain('„Lepiej stąd idź, panie. To nie miejsce dla ciekawskich.”');
      expect(cleaned).toContain('[Co robisz?]');
    });

    it('sanitizeMechanicalTags strips [MYŚLI_MG: ... | REAKCJA_WROGA: ...] completely', () => {
      const sanitized = sanitizeMechanicalTags(rawAiResponse);
      expect(sanitized).not.toContain('MYŚLI_MG');
      expect(sanitized).not.toContain('REAKCJA_WROGA');
      expect(sanitized).not.toContain('zbiry w prochowcach');
      expect(sanitized).toContain('Bosman unosi wzrok');
    });

    it('sanitizeDiegeticProse strips [MYŚLI_MG: ... | REAKCJA_WROGA: ...] completely', () => {
      const prose = sanitizeDiegeticProse(rawAiResponse);
      expect(prose).not.toContain('MYŚLI_MG');
      expect(prose).not.toContain('REAKCJA_WROGA');
      expect(prose).toContain('Bosman unosi wzrok');
    });

    it('cleanupContent and NESTED_TAG_BODY handle nested audio tags without leaking to player', () => {
      const inputWithNestedAudio =
        `[MYŚLI_MG: plan [serious] działania | ECHO_AKCJI: hałas [whispers] w porcie | REAKCJA_WROGA: kultysta czai się [trembling] za rogiem]\n` +
        `Noc jest chłodna.`;

      const cleaned = cleanupContent(inputWithNestedAudio);
      expect(cleaned).not.toContain('MYŚLI_MG');
      expect(cleaned).not.toContain('REAKCJA_WROGA');
      expect(cleaned).not.toContain('kultysta');
      expect(cleaned).toContain('Noc jest chłodna.');
    });
  });
});
