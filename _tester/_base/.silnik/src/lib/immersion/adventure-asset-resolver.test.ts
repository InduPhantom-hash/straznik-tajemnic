import {
  computeNameHash,
  normalizeNameForHash,
  resolveAdventureAsset,
  AdventurePackManifest,
} from './adventure-asset-resolver';

describe('AdventureAssetResolver (Issue #661)', () => {
  const mockManifest: AdventurePackManifest = {
    caseId: 'case-s11-01',
    era: '1920s-us',
    predefinedAdventureId: 'nawiedzony-dom',
    visualDna: {
      styleCore: 'silver gelatin print, Boston 1920, tactile paper texture',
      colorAndLightingScript: 'sepia toning, harsh angle gaslight, heavy shadows',
      cssFilterOverride: 'sepia(0.3) contrast(1.1)',
    },
    assets: [
      {
        id: 'clue-01',
        category: 'item-clue',
        file: 'clue-01-knott-keys.webp',
        aspectRatio: '16:9',
        clueId: 'clue-01-knott-keys',
        nameHashes: [computeNameHash('klucze knotta'), computeNameHash('knott keys')],
        tagsPl: ['klucze', 'mosiądz', 'wizytówka', 'dolar'],
        tagsEn: ['keys', 'brass', 'business card', 'dollar'],
      },
      {
        id: 'npc-01',
        category: 'npc',
        file: 'npc-steven-knott.webp',
        aspectRatio: '3:4',
        nameHashes: [computeNameHash('steven knott'), computeNameHash('knott')],
        tagsPl: ['właściciel', 'płaszcz', 'kamizelka'],
        tagsEn: ['landlord', 'coat', 'vest'],
      },
      {
        id: 'gear-01',
        category: 'item-gear',
        file: 'item-corbitt-dagger.webp',
        aspectRatio: '16:9',
        catalogItemIdOverride: 'ritual-dagger',
        tagsPl: ['sztylet', 'ostrze', 'kości'],
        tagsEn: ['dagger', 'blade', 'bone'],
      },
    ],
  };

  describe('normalizeNameForHash & computeNameHash', () => {
    it('normalizuje znaki diakrytyczne i spacje', () => {
      expect(normalizeNameForHash('Klucze  KNOTTA!')).toBe('klucze knotta');
      expect(normalizeNameForHash('Święty Grób / Łagiewniki')).toBe('swiety grob lagiewniki');
    });

    it('generuje deterministyczny skrót 12-znakowy', () => {
      const hash1 = computeNameHash('Klucze Knotta');
      const hash2 = computeNameHash('klucze knotta');
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(12);
    });
  });

  describe('resolveAdventureAsset - Kaskada 3 Priorytetów', () => {
    it('Priorytet 1: dopasowanie bezpośrednie po clueId / slug', () => {
      const result = resolveAdventureAsset({
        slugOrQuery: 'clue-01-knott-keys',
        manifest: mockManifest,
      });

      expect(result.priority).toBe(1);
      expect(result.assetUrl).toBe('/adventure-packs/case-s11-01/clue-01-knott-keys.webp');
      expect(result.aspectRatio).toBe('16:9');
    });

    it('Priorytet 1: dopasowanie po nazwie własnej (nameHash)', () => {
      const result = resolveAdventureAsset({
        slugOrQuery: 'Steven Knott',
        manifest: mockManifest,
      });

      expect(result.priority).toBe(1);
      expect(result.assetUrl).toBe('/adventure-packs/case-s11-01/npc-steven-knott.webp');
      expect(result.aspectRatio).toBe('3:4');
    });

    it('Priorytet 1: dopasowanie po tagach archetypicznych (tagsPl/tagsEn)', () => {
      const result = resolveAdventureAsset({
        slugOrQuery: 'mosiądz',
        manifest: mockManifest,
      });

      expect(result.priority).toBe(1);
      expect(result.assetUrl).toBe('/adventure-packs/case-s11-01/clue-01-knott-keys.webp');
    });

    it('Priorytet 2: dopasowanie nadpisania katalogu (catalogItemIdOverride) z filtrem CSS', () => {
      const result = resolveAdventureAsset({
        slugOrQuery: 'ritual-dagger',
        manifest: mockManifest,
      });

      expect(result.priority).toBe(1);
      expect(result.assetUrl).toBe('/adventure-packs/case-s11-01/item-corbitt-dagger.webp');
      expect(result.cssFilter).toBe('sepia(0.3) contrast(1.1)');
    });

    it('Priorytet 3: fallback na Live API z automatycznym wstrzyknięciem visualDna', () => {
      const result = resolveAdventureAsset({
        slugOrQuery: 'nieznany-potwor-z-kosmosu',
        manifest: mockManifest,
      });

      expect(result.priority).toBe(3);
      expect(result.assetUrl).toBeNull();
      expect(result.enhancedPrompt).toContain('sepia toning, harsh angle gaslight');
      expect(result.enhancedPrompt).toContain('nieznany-potwor-z-kosmosu');
    });
  });
});
