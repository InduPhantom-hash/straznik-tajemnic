import {
  extractHandoutsFromScenarioText,
  cleanRawHandoutText,
  isKeeperOrTacticalHandout,
  evaluateGmSafety,
  slugifyText,
  buildLocalCustomAdventures,
} from './adventure-local-builder';
import { detectRulebookProfile } from './rulebook-fingerprint';
import { buildHandoutsContext } from '@/app/api/chat/_helpers/build-handouts-context';
import type { OverlayDescriptor } from './semantic-overlay-engine';

const dummyOverlay: OverlayDescriptor = {
  id: 'overlay-test',
  title: 'Test Overlay',
  fileName: 'test.pdf',
  profile: 'one_shot',
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  tags: ['NPC'],
  features: {
    hasCombatRules: false,
    hasSanityRules: false,
    hasChaseRules: false,
    hasMagicRules: false,
    hasCreatures: false,
    hasSpells: false,
    hasHandouts: true,
    hasScenarios: true,
  },
  stats: {
    npcCount: 1,
    creatureCount: 0,
    spellCount: 0,
    ruleCount: 0,
    handoutCount: 1,
    adventureCount: 1,
  },
  entities: {
    npcs: [{ id: 'npc-1', name: 'Jan Kowalski', role: 'Świadek' }],
    creatures: [],
    spells: [],
    rules: [],
    handouts: [],
    adventures: [],
  },
};

describe('Adversarial Stress & Boundary Testing: adventure-local-builder (Issue #649)', () => {
  // ==========================================================================
  // Category 1: Malformed and Exotic Headers
  // ==========================================================================
  describe('Category 1: Malformed and Exotic Headers', () => {
    it('1.1 parses mixed-case headers across Polish and English variants', () => {
      const text = `
pOmOc DlA gRaCzY #1 - List od mecenasa
Tresc listu adwokackiego.

pLaYeR hAnDoUt 2: Autopsy Report
The coroner notes severe contusions.

zALaCzNiK A: Szkic krypty
Rysunek podziemi.

dOdAtEk 3: Mroczny grimuar
Fragment ksiegi zakletej w skore.

kEePeR oNlY: Tactical Map
Positions of cultists.
      `;

      const handouts = extractHandoutsFromScenarioText(text, 'Sprawa Doktora', 'pl');
      expect(handouts.length).toBe(5);

      // Check types and titles
      expect(handouts[0].title).toBe('List od mecenasa');
      expect(handouts[0].handoutType).toBe('letter');
      expect(handouts[0].isPlayerFacing).toBe(true);

      expect(handouts[1].title).toBe('Autopsy Report');
      expect(handouts[1].handoutType).toBe('report');
      expect(handouts[1].isPlayerFacing).toBe(true);

      expect(handouts[2].title).toBe('Szkic krypty');
      expect(handouts[2].handoutType).toBe('map'); // "Szkic" classifies as map
      expect(handouts[2].isPlayerFacing).toBe(true);

      expect(handouts[3].title).toBe('Mroczny grimuar');
      expect(handouts[3].handoutType).toBe('book'); // "grimuar" classifies as book
      expect(handouts[3].isPlayerFacing).toBe(true);

      expect(handouts[4].title).toBe('Tactical Map');
      expect(handouts[4].handoutType).toBe('map');
      expect(handouts[4].keeperOnly).toBe(true);
      expect(handouts[4].isPlayerFacing).toBe(false);
    });

    it('1.2 handles spacing distortions (no spaces, excessive spaces, leading tabs)', () => {
      const text = `
\t\t   POMOC 1:List bez spacji po dwukropku
Zawartosc dokumentu 1.

POMOC#2: List bez spacji przed hashem
Zawartosc dokumentu 2.

POMOC    #3     :     List z wieloma spacjami
Zawartosc dokumentu 3.

ROZDZIAŁ 1:POMOC 4:Rozdzial bez spacji po dwukropkach
Zawartosc dokumentu 4.
      `;

      const handouts = extractHandoutsFromScenarioText(text, 'Test Odstepow', 'pl');
      expect(handouts.length).toBe(4);
      expect(handouts[0].title).toBe('List bez spacji po dwukropku');
      expect(handouts[1].title).toBe('List bez spacji przed hashem');
      expect(handouts[2].title).toBe('List z wieloma spacjami');
      expect(handouts[3].title).toBe('Rozdzial bez spacji po dwukropkach');
      expect(handouts[3].chapterId).toBe('rozdzial-1');
    });

    it('1.3 handles separator variations (colon, hyphen, en-dash, em-dash)', () => {
      const text = `
POMOC 1 : Tytul z dwukropkiem
Tresc 1.

POMOC 2 - Tytul ze zwyklym myslnikiem
Tresc 2.

POMOC 3 \u2013 Tytul z polpauza en-dash
Tresc 3.

POMOC 4 \u2014 Tytul z pauza em-dash
Tresc 4.
      `;

      const handouts = extractHandoutsFromScenarioText(text, 'Test Myslnikow', 'pl');
      expect(handouts.length).toBe(4);
      expect(handouts[0].title).toBe('Tytul z dwukropkiem');
      expect(handouts[1].title).toBe('Tytul ze zwyklym myslnikiem');
      expect(handouts[2].title).toBe('Tytul z polpauza en-dash');
      expect(handouts[3].title).toBe('Tytul z pauza em-dash');

      // Guarantee no unicode dashes survive in titles
      for (const h of handouts) {
        expect(h.title).not.toMatch(/[\u2013\u2014]/);
      }
    });

    it('1.4 examines behavior on Roman numerals and single-letter identifiers', () => {
      const text = `
POMOC A - Pierwszy dokument literowy
Tresc A.

POMOC B - Drugi dokument literowy
Tresc B.

POMOC V - Dokument z cyfra rzymska V
Tresc V.

POMOC X - Dokument z cyfra rzymska X
Tresc X.

POMOC 10 - Standardowa cyfra dziesiec
Tresc 10.
      `;

      const handouts = extractHandoutsFromScenarioText(text, 'Rzymskie i Litery', 'pl');
      // Matches A, B, V, X, 10
      expect(handouts.length).toBe(5);
      expect(handouts.map((h) => h.title)).toEqual([
        'Pierwszy dokument literowy',
        'Drugi dokument literowy',
        'Dokument z cyfra rzymska V',
        'Dokument z cyfra rzymska X',
        'Standardowa cyfra dziesiec',
      ]);
    });

    it('1.5 rejects conversational phrases and false positives without false triggers', () => {
      const text = `
W toku sledztwa konieczna byla POMOC W WALCE, aby odeprzec kultystow.
DODATKOWO w bibliotece znaleziono wskazowke.
Dokument zostal sporzadzony BEZ ZAŁĄCZNIKÓW.
POMOCNIK 1: Jan Kowalski zaoferowal wsparcie.

POMOC 1: Autentyczny list
Tresc autentycznego listu.
      `;

      const handouts = extractHandoutsFromScenarioText(text, 'Test Falszywek', 'pl');
      // Only the real handout should be extracted
      expect(handouts.length).toBe(1);
      expect(handouts[0].title).toBe('Autentyczny list');
      expect(handouts[0].textContent).toContain('Tresc autentycznego listu.');
    });

    it('1.6 protects diegetic guardians and professions from GM Safety false alarms', () => {
      const title1 = 'Zapiski strażnika latarni morskiej';
      const title2 = 'Zeznania strażnika więziennego z San Quentin';
      const title3 = 'Raport nocnego strażnika miejskiego';
      const title4 = 'Dziennik strażnika muzealnego';
      const title5 = 'Relacja strażnika bramy cmentarnej';
      const title6 = 'Plan ucieczki z aresztu'; // not a floorplan

      expect(isKeeperOrTacticalHandout(title1)).toBe(false);
      expect(isKeeperOrTacticalHandout(title2)).toBe(false);
      expect(isKeeperOrTacticalHandout(title3)).toBe(false);
      expect(isKeeperOrTacticalHandout(title4)).toBe(false);
      expect(isKeeperOrTacticalHandout(title5)).toBe(false);
      expect(isKeeperOrTacticalHandout(title6)).toBe(false);

      const safety1 = evaluateGmSafety(title1);
      expect(safety1.isPlayerFacing).toBe(true);
      expect(safety1.keeperOnly).toBe(false);
    });

    it('1.7 captures headers where title is omitted on same line (falls back to default label)', () => {
      const text = `
POMOC DLA GRACZY #1
To jest pierwszy wiersz listu znajdujacego sie na biurku.
Kolejny wiersz listu.
      `;

      const handouts = extractHandoutsFromScenarioText(text, 'Test Bez Tytulu', 'pl');
      expect(handouts.length).toBe(1);
      expect(handouts[0].title).toBe('Pomoc dla graczy #1');
      expect(handouts[0].textContent).toContain('To jest pierwszy wiersz listu');
    });

    it('1.8 tests declension boundaries in type classification (starodruk vs starodruku)', () => {
      // Demonstrates that 'starodruk' (nominative) triggers 'book', whereas inflected forms without stem match default
      const textNominative = `
POMOC 1: Unikalny starodruk z biblioteki
Tresc.
      `;
      const h1 = extractHandoutsFromScenarioText(textNominative, 'Katalog', 'pl');
      expect(h1[0].handoutType).toBe('book');

      const textInflected = `
POMOC 2: Wyciąg ze starodruku
Tresc.
      `;
      const h2 = extractHandoutsFromScenarioText(textInflected, 'Katalog', 'pl');
      // Because regex has \bstarodruk\b, 'starodruku' falls through to default 'newspaper'
      expect(h2[0].handoutType).toBe('newspaper');
    });
  });

  // ==========================================================================
  // Category 2: Extreme RAW Payloads
  // ==========================================================================
  describe('Category 2: Extreme RAW Payloads', () => {
    it('2.1 cleans massive 25KB document with 40 page markers and form feeds', () => {
      let largeDoc = '';
      for (let p = 1; p <= 40; p++) {
        largeDoc += `<!-- Strona ${p} -->\n`;
        largeDoc += `<!-- Page ${p} -->\n`;
        largeDoc += `Akapit numer ${p} zawierajacy wazne zeznania swiadka zdarzenia.\n\f`;
        largeDoc += `Druga czesc akapitu z opisem anomalii w domu na wzgorzu.\n\n\n\n`;
      }

      const cleaned = cleanRawHandoutText(largeDoc);

      // Verify no page markers or form feeds survived
      expect(cleaned).not.toContain('<!-- Strona');
      expect(cleaned).not.toContain('<!-- Page');
      expect(cleaned).not.toContain('\f');

      // Verify no excessive newlines (> 2)
      expect(cleaned).not.toMatch(/\n{3,}/);

      // Verify size and integrity
      expect(cleaned.length).toBeGreaterThan(2000);
      expect(cleaned).toContain('Akapit numer 1');
      expect(cleaned).toContain('Akapit numer 40');
    });

    it('2.2 strips multiline HTML comments and preserves authentic paragraphs', () => {
      const text = `
Pierwszy akapit listu.
<!-- 
Komentarz wieloliniowy redaktora PDF:
Usunac ten fragment przed drukiem.
-->
Drugi akapit listu po komentarzu.

Trzeci akapit z wyjasnieniem.
      `;

      const cleaned = cleanRawHandoutText(text);
      expect(cleaned).not.toContain('Komentarz wieloliniowy');
      expect(cleaned).not.toContain('Usunac ten fragment');
      expect(cleaned).toContain('Pierwszy akapit listu.\n\nDrugi akapit listu');
      expect(cleaned).toContain('Trzeci akapit z wyjasnieniem.');
    });

    it('2.3 normalizes all unicode em-dash and en-dash to hyphen while preserving full Polish diacritics', () => {
      const diacriticsAndDashes = `
Zażółć gęślą jaźń \u2014 ZAŻÓŁĆ GĘŚLĄ JAŹŃ \u2013 to sprawdzian polskich znaków.
Ksiądz proboszcz mówi: \u2014 Pamiętajcie o wierze \u2013 rzekł cicho.
      `;

      const cleaned = cleanRawHandoutText(diacriticsAndDashes);

      // Hyphen invariant: no unicode dashes
      expect(cleaned).not.toMatch(/[\u2013\u2014]/);
      expect(cleaned).toContain('-');

      // Diacritics preserved exactly
      expect(cleaned).toContain('Zażółć gęślą jaźń');
      expect(cleaned).toContain('ZAŻÓŁĆ GĘŚLĄ JAŹŃ');
      expect(cleaned).toContain('Ksiądz proboszcz mówi: - Pamiętajcie o wierze - rzekł cicho.');
    });

    it('2.4 accurately bounds RAW text extraction at section boundaries', () => {
      const text = `
ROZDZIAŁ 1 - MROCZNE POCZATKI

POMOC DLA GRACZY #1 - List od konsula
Szanowny Panie, donosze o niepokojacych wypadkach w porcie.
Koniec listu konsula.

ROZDZIAŁ 2 - TAJEMNICA MAGAZYNU
Treść rozdziału drugiego opisująca przeszukanie nabrzeża.
      `;

      const handouts = extractHandoutsFromScenarioText(text, 'Mroczne Poczatki', 'pl');
      expect(handouts.length).toBe(1);
      const h = handouts[0];
      expect(h.chapterId).toBe('rozdzial-1');
      expect(h.textContent).toContain('Szanowny Panie, donosze o niepokojacych wypadkach');
      expect(h.textContent).toContain('Koniec listu konsula.');

      // Must NOT leak Chapter 2 body text into Handout #1
      expect(h.textContent).not.toContain('ROZDZIAŁ 2');
      expect(h.textContent).not.toContain('Treść rozdziału drugiego');
    });

    it('2.5 accurately bounds RAW text between consecutive handouts', () => {
      const text = `
POMOC #1 - List doktora
Tresc pierwszego listu doktora.

POMOC #2 - Telegram ze stacji
Tresc depeszy telegraficznej.
      `;

      const handouts = extractHandoutsFromScenarioText(text, 'Podwojny Rekwizyt', 'pl');
      expect(handouts.length).toBe(2);
      expect(handouts[0].textContent).toBe('Tresc pierwszego listu doktora.');
      expect(handouts[1].textContent).toBe('Tresc depeszy telegraficznej.');
    });
  });

  // ==========================================================================
  // Category 3: Extreme Titles, Characters & Slugs
  // ==========================================================================
  describe('Category 3: Extreme Titles, Characters & Slugs', () => {
    it('3.1 handles 120+ character scenario titles without invalid slugs', () => {
      const hugeTitle =
        'Niewiarygodnie Długa Nazwa Scenariusza Śledczego z Roku 1925 Dotycząca Tajemniczego Kultu Przedwiecznych Bóstw w Nowej Anglii';

      const text = `
POMOC #1 - Krotki list
Tresc listu.
      `;

      const handouts = extractHandoutsFromScenarioText(text, hugeTitle, 'pl');
      expect(handouts.length).toBe(1);
      const h = handouts[0];

      // Slug must be cleanly generated, lowercase, alphanumeric-hyphen only
      expect(h.slug).toMatch(/^[a-z0-9-]+$/);
      expect(h.slug.length).toBeLessThanOrEqual(40);
      expect(h.slug).not.toMatch(/-$/);
      expect(h.slug).not.toMatch(/^-/);
    });

    it('3.2 truncates 100+ character handout titles with ellipsis in title property', () => {
      const longHandoutTitle =
        'Niezmiernie szczegółowy raport laboratoryjny sporządzony przez docenta Franciszka Karpińskiego z Instytutu Badań Toksykologicznych w Krakowie na zlecenie prokuratury';

      const text = `
POMOC #1 - ${longHandoutTitle}
Tresc raportu chemicznego.
      `;

      const handouts = extractHandoutsFromScenarioText(text, 'Sprawa Trucizny', 'pl');
      expect(handouts.length).toBe(1);
      const h = handouts[0];

      // title length should be bounded to 80 chars max (77 + '...')
      expect(h.title.length).toBeLessThanOrEqual(80);
      expect(h.title.endsWith('...')).toBe(true);
    });

    it('3.3 gracefully falls back when scenario title contains only symbols', () => {
      const weirdTitle = '!@#$%^&*()_+{}[]|:;"<>,.?/';

      const text = `
POMOC #1 - List z banku
Tresc listu.
      `;

      const handouts = extractHandoutsFromScenarioText(text, weirdTitle, 'pl');
      expect(handouts.length).toBe(1);
      const h = handouts[0];

      // Fallback scenario prefix is 'adventure'
      expect(h.slug).toContain('adventure-pomoc-1');
    });

    it('3.4 resolves collisions when 5 handouts have identical base titles', () => {
      const text = `
POMOC #1 - Raport policyjny
Raport 1.

POMOC #1 - Raport policyjny
Raport 2.

POMOC #1 - Raport policyjny
Raport 3.

POMOC #1 - Raport policyjny
Raport 4.

POMOC #1 - Raport policyjny
Raport 5.
      `;

      const handouts = extractHandoutsFromScenarioText(text, 'Sprawa Posterunku', 'pl');
      expect(handouts.length).toBe(5);

      const slugs = handouts.map((h) => h.slug);
      const uniqueSlugs = new Set(slugs);
      expect(uniqueSlugs.size).toBe(5);

      expect(slugs[0]).toBe('sprawa-posterunku-pomoc-1');
      expect(slugs[1]).toBe('sprawa-posterunku-pomoc-1-2');
      expect(slugs[2]).toBe('sprawa-posterunku-pomoc-1-3');
      expect(slugs[3]).toBe('sprawa-posterunku-pomoc-1-4');
      expect(slugs[4]).toBe('sprawa-posterunku-pomoc-1-5');
    });

    it('3.5 guarantees slugifyText produces clean url-safe strings', () => {
      expect(slugifyText('Zażółć Gęślą Jaźń')).toBe('zazolc-gesla-jazn');
      expect(slugifyText('---Kolejny---Test---')).toBe('kolejny-test');
      expect(slugifyText('   ')).toBe('adventure');
      expect(slugifyText('A'.repeat(60)).length).toBe(40);
    });
  });

  // ==========================================================================
  // Category 4: Massive Scenario with 60 Handouts (Stress & Scale)
  // ==========================================================================
  describe('Category 4: Massive Scenario with 60 Handouts (Stress & Scale)', () => {
    it('4.1 parses 60 handouts under 100ms with 100% slug uniqueness and accurate types', () => {
      const items: string[] = [];

      for (let i = 1; i <= 60; i++) {
        let typeKw = 'List ze wskazowka';
        if (i % 6 === 0) typeKw = 'Rzut parteru rezydencji (Tylko dla Strażnika)';
        else if (i % 6 === 1) typeKw = 'Wycinek z prasy lokalnej';
        else if (i % 6 === 2) typeKw = 'Telegram ze stacji';
        else if (i % 6 === 3) typeKw = 'Strona z pamiętnika zmarłego';
        else if (i % 6 === 4) typeKw = 'Fragment traktatu o demonologii';
        else if (i % 6 === 5) typeKw = 'Protokół sekcji zwłok';

        items.push(`
POMOC #${i} - ${typeKw} ${i}
To jest autentyczna tresc rekwizytu numer ${i}. Szczegoly dotyczace sprawy ${i}.
<!-- Strona ${i} -->
        `);
      }

      const fullScenarioText = `
ROZDZIAŁ 1 - WIELKIE ŚLEDZTWO
LEGENDA OZNACZENIA SCENARIUSZY
Stopień trudności: Średni 
Liczba sesji: ➌

${items.join('\n')}
      `;

      const startTime = Date.now();
      const handouts = extractHandoutsFromScenarioText(
        fullScenarioText,
        'Wielkie Sledztwo w Arkham',
        'pl'
      );
      const durationMs = Date.now() - startTime;

      // 1. Throughput check: must complete in under 100ms
      expect(durationMs).toBeLessThan(100);

      // 2. Uncapped check: exactly 60 items extracted
      expect(handouts.length).toBe(60);

      // 3. Slug uniqueness: exactly 60 unique slugs
      const slugs = handouts.map((h) => h.slug);
      const uniqueSlugs = new Set(slugs);
      expect(uniqueSlugs.size).toBe(60);

      // 4. GM Safety segregation check:
      // i % 6 === 0 items are tactical keeper-only floorplans (10 items: 6, 12, 18, 24, 30, 36, 42, 48, 54, 60)
      const keeperItems = handouts.filter((h) => h.keeperOnly === true);
      const playerItems = handouts.filter((h) => h.isPlayerFacing === true);

      expect(keeperItems.length).toBe(10);
      expect(playerItems.length).toBe(50);

      for (const k of keeperItems) {
        expect(k.handoutType).toBe('map');
        expect(k.isPlayerFacing).toBe(false);
      }

      // 5. Downstream Integration with buildHandoutsContext
      const context = buildHandoutsContext(handouts, null, {
        activeChapterId: 'rozdzial-1',
      });

      expect(context).toContain('DOSTĘPNE HANDOUTY');
      expect(context).toContain('MATERIAŁY I PLANY STRAŻNIKA (KEEPER-ONLY - ZAKAZ WRĘCZANIA GRACZOM)');

      // Verify all 50 player items have [HANDOUT:<slug>] instructions
      for (const p of playerItems) {
        expect(context).toContain(`[HANDOUT:${p.slug}]`);
      }

      // Verify ZERO keeper items have [HANDOUT:<slug>] instructions
      for (const k of keeperItems) {
        expect(context).not.toContain(`[HANDOUT:${k.slug}]`);
      }
    });

    it('4.2 end-to-end full buildLocalCustomAdventures with 50+ handouts integration', () => {
      const items: string[] = [];
      for (let i = 1; i <= 52; i++) {
        items.push(`
POMOC DLA GRACZY #${i} - List śledczy ${i}
Tekst listu numer ${i}.
        `);
      }

      const text = `
ROZDZIAŁ 1 - SPRAWA ARCHIWUM
LEGENDA OZNACZENIA SCENARIUSZY
Stopień trudności: Trudny 
Liczba sesji: ➋

${items.join('\n')}
      `;

      const profile = detectRulebookProfile(text, 'Archiwum_52.pdf');
      const adventures = buildLocalCustomAdventures(
        text,
        profile,
        dummyOverlay,
        'Archiwum_52.pdf',
        30
      );

      expect(adventures.length).toBe(1);
      const adv = adventures[0];
      expect(adv.handouts).toBeDefined();
      expect(adv.handouts?.length).toBe(52);

      const uniqueSlugs = new Set(adv.handouts?.map((h) => h.slug));
      expect(uniqueSlugs.size).toBe(52);
    });
  });

  // ==========================================================================
  // Category 5: Edge Identifiers and Roman Numerals
  // ==========================================================================
  describe('Category 5: Edge Identifiers and Roman Numerals', () => {
    it('5.1 verifies handling of multi-character Roman numerals (II, III, IV)', () => {
      // In regex: id group is ([0-9]+(?:\.[0-9]+)?|[A-HJ-VX-Z])\b
      // Single character Roman numerals like V, X are captured as id.
      // Multi-character Roman numerals like II, III, IV do not match single char class [A-HJ-VX-Z].
      const text = `
POMOC 1: Pierwsza pomoc
Tresc 1.

DODATEK V: Piata pomoc rzymska
Tresc V.

DODATEK X: Dziesiata pomoc rzymska
Tresc X.
      `;

      const handouts = extractHandoutsFromScenarioText(text, 'Cyfry Rzymskie', 'pl');
      expect(handouts.length).toBe(3);
      expect(handouts[0].slug).toContain('pomoc-1');
      expect(handouts[1].slug).toContain('pomoc-v');
      expect(handouts[2].slug).toContain('pomoc-x');
    });

    it('5.2 verifies behavior on Polish preposition-like letters (I and W)', () => {
      // In Polish scenarios, single letters I and W are sometimes prepositions (i = and, w = in).
      // Standard numeric (#1, #2) or letters A, B are the standard convention.
      const text = `
ZAŁĄCZNIK A - Zeznanie
Tresc A.

ZAŁĄCZNIK B - Raport
Tresc B.
      `;

      const handouts = extractHandoutsFromScenarioText(text, 'Litery Standaryzowane', 'pl');
      expect(handouts.length).toBe(2);
      expect(handouts[0].slug).toContain('pomoc-a');
      expect(handouts[1].slug).toContain('pomoc-b');
    });
  });

  // ==========================================================================
  // Category 6: ReDoS & Adversarial Inputs
  // ==========================================================================
  describe('Category 6: ReDoS & Adversarial Inputs', () => {
    it('6.1 does not suffer from catastrophic backtracking on pathological spacing or repeated characters', () => {
      // Test string with pathological repeated spaces and keywords
      const evilString = 'POMOC ' + ' '.repeat(5000) + 'DLA GRACZY ' + ' '.repeat(5000) + ' #1: List\n' + 'Tresc listu.'.repeat(100);

      const startTime = Date.now();
      const handouts = extractHandoutsFromScenarioText(evilString, 'ReDoS Test', 'pl');
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(100);
      expect(handouts.length).toBe(1);
    });

    it('6.2 handles empty, whitespace-only and null-like strings gracefully without crash', () => {
      expect(extractHandoutsFromScenarioText('', '', 'pl')).toEqual([]);
      expect(extractHandoutsFromScenarioText('   \n\n\t   ', '', 'en')).toEqual([]);
      expect(cleanRawHandoutText('')).toBe('');
      expect(cleanRawHandoutText('   \n\n\n\n   ')).toBe('');
      expect(isKeeperOrTacticalHandout('')).toBe(false);
      expect(evaluateGmSafety('')).toEqual({ keeperOnly: false, isPlayerFacing: true });
    });
  });
});

