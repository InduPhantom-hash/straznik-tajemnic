import {
  buildLocalCustomAdventures,
  parseScenariosFromAnthologyText,
} from './adventure-local-builder';
import { detectRulebookProfile } from './rulebook-fingerprint';
import type { OverlayDescriptor } from './semantic-overlay-engine';

describe('adventure-local-builder', () => {
  const dummyOverlay: OverlayDescriptor = {
    id: 'overlay-test',
    title: 'Test Overlay',
    fileName: 'test.pdf',
    profile: 'one_shot',
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    tags: ['NPC', 'CZARY'],
    features: {
      hasCombatRules: false,
      hasSanityRules: false,
      hasChaseRules: false,
      hasMagicRules: true,
      hasCreatures: false,
      hasSpells: true,
      hasHandouts: true,
      hasScenarios: true,
    },
    stats: {
      npcCount: 1,
      creatureCount: 0,
      spellCount: 1,
      ruleCount: 0,
      handoutCount: 1,
      adventureCount: 1,
    },
    entities: {
      npcs: [{ id: 'npc-1', name: 'Jan Kowalski', role: 'Świadek' }],
      creatures: [],
      spells: [{ id: 'spell-1', name: 'Znak Starszych Bogów', description: 'Rytuał ochronny', magicCost: '10 PO' }],
      rules: [],
      handouts: [{ id: 'h-1', title: 'Stary pamiętnik', content: 'Zapiski' }],
      adventures: [
        {
          id: 'adv-1',
          title: 'Główna przygoda',
          type: 'one_shot',
          synopsis: 'Zarys',
          nodes: [{ id: 'node-1', title: 'Dwór Corbitta', description: 'Stary dom', type: 'location' as const }],
        },
      ],
    },
  };

  describe('parseScenariosFromAnthologyText', () => {
    it('parses Horror nad Warta table of contents correctly', () => {
      const sampleToc = `
SPIS TREŚCI
ROZDZIAŁ 1
WSTĘP 5
ROZDZIAŁ 2
KRÓL ZIMY 12
Scenariusz osadzony w Poznaniu w latach 20.
ROZDZIAŁ 3
KROPLA KRWI 35
Mroczna sprawa w Gorcach.
ROZDZIAŁ 4
GŁOS Z GŁĘBIN 72
ROZDZIAŁ 5
CZARNY ŚWIT 105
ROZDZIAŁ 6
OSTATNI REJS 130
DODATEK 150
      `;

      const scenarios = parseScenariosFromAnthologyText(
        sampleToc,
        'Horror nad Wartą'
      );

      expect(scenarios.length).toBe(5);
      expect(scenarios[0].title).toBe('Król Zimy');
      expect(scenarios[1].title).toBe('Kropla Krwi');
      expect(scenarios[4].title).toBe('Ostatni Rejs');
    });

    it('parses Cienie Tatr table of contents correctly', () => {
      const sampleToc = `
Spis treści
Wstęp .................................................... 4
Giewont we mgle .......................................... 10
Cień nad Zakopanem ....................................... 28
Dolina Kościeliska ....................................... 52
Zimowa zawierucha ........................................ 78
Mgły nad Morskim Okiem ................................... 104
Świt na Rysach ........................................... 132
Pomocnicze tabele ........................................ 155
      `;

      const scenarios = parseScenariosFromAnthologyText(
        sampleToc,
        'Cienie Tatr'
      );

      expect(scenarios.length).toBe(6);
      expect(scenarios[0].title).toBe('Giewont We Mgle');
      expect(scenarios[5].title).toBe('Świt Na Rysach');
    });
  });

  describe('buildLocalCustomAdventures', () => {
    it('decomposes anthology into N individual CustomAdventure objects', () => {
      const text = `
Spis treści
ROZDZIAŁ 1
PIERWSZA TAJEMNICA 10
ROZDZIAŁ 2
DRUGA TAJEMNICA 40
      `;
      const profile = detectRulebookProfile(text, 'ZewCthulhu_HorrornadWarta_v.1.2.pdf');
      const adventures = buildLocalCustomAdventures(
        text,
        profile,
        dummyOverlay,
        'ZewCthulhu_HorrornadWarta_v.1.2.pdf',
        120
      );

      expect(adventures.length).toBe(2);
      expect(adventures[0].title).toBe('Pierwsza Tajemnica');
      expect(adventures[0].source).toBe('Horror nad Wartą');
      expect(adventures[0].sourceCategory).toBe('anthology');
      expect(adventures[0].documentType).toBe('scenario');
      expect(adventures[1].title).toBe('Druga Tajemnica');
      expect(adventures[1].source).toBe('Horror nad Wartą');
    });

    it('extracts starter scenario "Nawiedzony dom" instead of generic d100 title', () => {
      const text = `
ZEW CTHULHU SKRÓCONE ZASADY GRY
SPIS TREŚCI
Zasady d100 ... 5
Tworzenie Badacza ... 12
Nawiedzony dom ... 32
Księga sekretów ... 50
      `;
      const profile = detectRulebookProfile(text, 'Zew_Cthulhu_Starter.pdf');
      const adventures = buildLocalCustomAdventures(
        text,
        profile,
        dummyOverlay,
        'Zew_Cthulhu_Starter.pdf',
        55
      );

      expect(adventures.length).toBe(1);
      expect(adventures[0].title).toBe('Nawiedzony dom');
      expect(adventures[0].source).toBe('Starter d100');
      expect(adventures[0].sourceCategory).toBe('starter');
      expect(adventures[0].documentType).toBe('scenario');
    });

    it('identifies Lorebook / Grimoire as compendium without forcing scenario type', () => {
      const text = `
Wielki Grymuar Magii Mitów Cthulhu.
Almanach zaklęć, rytuałów i formuł czarnoksięskich.
Księga dla Strażnika Tajemnic.
Zaklęcia, inkantacje, runy i portale.
      `;
      const profile = detectRulebookProfile(text, 'Wielki_Grymuar_Magii.pdf');
      const adventures = buildLocalCustomAdventures(
        text,
        profile,
        dummyOverlay,
        'Wielki_Grymuar_Magii.pdf',
        200
      );

      expect(adventures.length).toBe(1);
      expect(adventures[0].documentType).toBe('compendium');
      expect(adventures[0].title).toBe('Wielki Grymuar Magii Mitów Cthulhu');
      expect(adventures[0].lorebookData).toBeDefined();
    });

    it('formats locations and eras cleanly without duplicates', () => {
      const text = `
Akcja rozgrywa się w Poznaniu w roku 1925. Tajemnicze morderstwo.
      `;
      const profile = detectRulebookProfile(text, 'Poznan_1925.pdf');
      const adventures = buildLocalCustomAdventures(
        text,
        profile,
        dummyOverlay,
        'Poznan_1925.pdf',
        30
      );

      expect(adventures[0].location).toBe('Poznań');
      expect(adventures[0].country).toBe('Polska');
      expect(adventures[0].yearRange).toBe('1925');
      expect(adventures[0].eraLabel).toBe('Klasyczne lata 20.');
    });
  });
});
