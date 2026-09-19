import {
  detectEraAndYears,
  detectLocationAndCountry,
  detectToneAndOccupations,
  buildAdventureGraph,
  buildLocalCustomAdventure,
  slugifyText,
} from './adventure-local-builder';
import type { OverlayDescriptor } from './semantic-overlay-engine';
import type { RulebookFingerprintResult } from './rulebook-fingerprint';

describe('adventure-local-builder', () => {
  it('poprawnie slugifikuje tekst z polskimi znakami', () => {
    expect(slugifyText('Zew Cthulhu: Cień nad Prabutami!')).toBe('zew-cthulhu-cien-nad-prabutami');
  });

  it('wykrywa epokę klasycznych lat 20. i rok', () => {
    const text = 'Wydarzenia rozgrywają się w Arkham w roku 1925. Badacze przybywają do miasta.';
    const result = detectEraAndYears(text);
    expect(result.era).toBe('classic');
    expect(result.yearRange).toBe('1925');
    expect(result.activeSceneYear).toBe(1925);
  });

  it('wykrywa epokę PRL w latach 70.', () => {
    const text = 'Śledztwo Milicji Obywatelskiej i Służby Bezpieczeństwa w 1974 roku w Elblągu.';
    const result = detectEraAndYears(text);
    expect(result.era).toBe('prl');
    expect(result.yearRange).toBe('1974');
    expect(result.activeSceneYear).toBe(1974);
  });

  it('wykrywa epokę Gaslight (lata 90. XIX wieku)', () => {
    const text = 'Mglisty Londyn w epoce wiktoriańskiej, rok 1895.';
    const result = detectEraAndYears(text);
    expect(result.era).toBe('gaslight');
    expect(result.yearRange).toBe('1895');
  });

  it('wykrywa polską lokację i kraj', () => {
    const text = 'Tajemnica dworu w Krakowie i okolicach Tatr.';
    const result = detectLocationAndCountry(text, 'pl');
    expect(result.country).toBe('Polska');
    expect(result.location).toContain('Kraków');
  });

  it('wykrywa lokację w Arkham / USA', () => {
    const text = 'An investigator arrives at Miskatonic University in Arkham, Massachusetts.';
    const result = detectLocationAndCountry(text, 'en');
    expect(result.country).toBe('USA');
    expect(result.location).toContain('Arkham');
  });

  it('wykrywa ton pulp, motywy i sugerowane profesje', () => {
    const text = 'Pulp Cthulhu z bohaterami stawiającymi czoła sekcie i potworom. Rytuał i magia.';
    const result = detectToneAndOccupations(text);
    expect(result.tone).toBe('pulp');
    expect(result.themes).toContain('Przygoda Pulp');
    expect(result.suggestedOccupations.length).toBeGreaterThan(0);
  });

  it('buduje kompletny obiekt CustomAdventure z grafem śledztwa', () => {
    const fingerprint: RulebookFingerprintResult = {
      profile: 'one_shot',
      title: 'Nawiedzony Dom w Arkham',
      confidence: 0.9,
      detectedFeatures: {
        hasCombatRules: true,
        hasSanityRules: true,
        hasChaseRules: false,
        hasMagicRules: false,
      },
      detectedLanguage: 'pl',
      semanticPlan: {
        detectedCategories: ['NPC', 'FABULA'],
        estimatedEntities: {
          npcs: true,
          locations: true,
          clues: false,
          handouts: false,
          spells: false,
          creatures: false,
          rules: true,
        },
      },
    };

    const overlay: OverlayDescriptor = {
      id: 'overlay-test',
      title: 'Nawiedzony Dom w Arkham',
      fileName: 'nawiedzony_dom.pdf',
      profile: 'one_shot',
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      tags: ['NPC', 'FABULA'],
      features: fingerprint.detectedFeatures,
      stats: {
        npcCount: 1,
        creatureCount: 0,
        spellCount: 0,
        ruleCount: 1,
        handoutCount: 1,
        adventureCount: 1,
      },
      entities: {
        npcs: [
          {
            id: 'npc-corbitt',
            name: 'Walter Corbitt',
            role: 'Zmarły właściciel domu',
            mask: 'Ciało w piwnicy',
            hiddenGoal: 'Pragnie sprowadzić szaleństwo na intruzów',
          },
        ],
        creatures: [],
        spells: [],
        rules: [],
        handouts: [
          {
            id: 'handout-wycinek',
            number: '1',
            title: 'Wycinek z Arkham Advertiser',
            content: 'Artykuł o tragicznej śmierci rodziny w domu przy ulicy French Hill.',
          },
        ],
        adventures: [
          {
            id: 'adv-dom',
            title: 'Nawiedzony Dom',
            type: 'one_shot',
            synopsis: 'Badacze badają opuszczoną posiadłość.',
            nodes: [
              {
                id: 'node-intro',
                title: 'Zlecenie od pana Knotta',
                type: 'intro',
                description: 'Spotkanie ze zleceniodawcą.',
              },
            ],
          },
        ],
      },
    };

    const text = 'Nawiedzony Dom. Rok 1924, Arkham. Walter Corbitt, lat 65, właściciel.';
    const adventure = buildLocalCustomAdventure(text, fingerprint, overlay, 'nawiedzony_dom.pdf', 16);

    expect(adventure.id).toBeDefined();
    expect(adventure.title).toBe('Nawiedzony Dom w Arkham');
    expect(adventure.era).toBe('classic');
    expect(adventure.country).toBe('USA');
    expect(adventure.isCustom).toBe(true);
    expect(adventure.isAnalyzed).toBe(true);
    expect(adventure.pdfUrl).toBe('');
    expect(adventure.geminiFileUri).toBe('');
    expect(adventure.graph).toBeDefined();
    expect(adventure.graph!.npcs.length).toBeGreaterThan(0);
    expect(adventure.graph!.locations.length).toBeGreaterThan(0);
    expect(adventure.graph!.clues.length).toBeGreaterThan(0);
    expect(adventure.graph!.connections.length).toBeGreaterThan(0);
  });
});
