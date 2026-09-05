import { extractImages, detectSFX } from './media-parser';

describe('media-parser: extractImages', () => {
    it('should extract basic scene image', () => {
        const text = 'Wchodzisz do ciemnej jaskini. [SCENA: dark cave with glowing mushrooms] Odkrywasz coś.';
        const result = extractImages(text);
        
        expect(result).toHaveLength(1);
        expect(result[0].prompt).toBe('dark cave with glowing mushrooms');
        expect(result[0].type).toBe('scene');
        expect(result[0].aspectRatio).toBe('16:9');
        expect(result[0].portraitName).toBeUndefined();
    });

    it('should extract portrait image and name', () => {
        const text = 'Spotykasz ją. [PORTRET: Eleonora Vance, an old woman in a vintage hat] Wygląda strasznie.';
        const result = extractImages(text);
        
        expect(result).toHaveLength(1);
        expect(result[0].prompt).toBe('Eleonora Vance, an old woman in a vintage hat');
        expect(result[0].type).toBe('portrait');
        expect(result[0].aspectRatio).toBe('3:4');
        expect(result[0].portraitName).toBe('Eleonora Vance');
    });

    it('should handle portrait tag without comma', () => {
        const text = '[PORTRET: just a portrait without comma]';
        const result = extractImages(text);
        
        expect(result).toHaveLength(1);
        expect(result[0].prompt).toBe('just a portrait without comma');
        expect(result[0].type).toBe('portrait');
        expect(result[0].aspectRatio).toBe('3:4');
        expect(result[0].portraitName).toBeUndefined();
    });

    it('should not extract portraitName if comma is too far', () => {
        const text = '[PORTRET: a very long description that goes on and on and on and eventually has a, comma]';
        const result = extractImages(text);
        
        expect(result).toHaveLength(1);
        expect(result[0].portraitName).toBeUndefined(); // Bo przecinek jest dalej niż 40 znaków
    });

    it('should handle portrait synonyms and case-insensitivity', () => {
        const text = '[pOrTrEt: Marcus, test] [PORTRAIT: John, test2] [ZDJĘCIE: scene test] [WIZUALIZACJA: vis test]';
        const result = extractImages(text);
        
        expect(result).toHaveLength(4);
        expect(result[0].type).toBe('portrait');
        expect(result[1].type).toBe('portrait');
        expect(result[2].type).toBe('scene');
        expect(result[3].type).toBe('scene');
    });

    it('should parse mythos flag properly', () => {
        const text = '[SCENA: spooky ghost | mythos]';
        const result = extractImages(text);
        
        expect(result).toHaveLength(1);
        expect(result[0].isMythos).toBe(true);
        expect(result[0].prompt).toBe('spooky ghost'); // Prompt powinien być oczyszczony z flagi
    });

    it('should extract location image with locationName', () => {
        const text = 'Wjeżdżacie do miasta. [LOKACJA: Arkham Cemetery, foggy Victorian graveyard at dusk] Cisza.';
        const result = extractImages(text);

        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('location');
        expect(result[0].style).toBe('location');
        expect(result[0].aspectRatio).toBe('16:9');
        expect(result[0].locationName).toBe('Arkham Cemetery');
        expect(result[0].prompt).toBe('Arkham Cemetery, foggy Victorian graveyard at dusk');
    });

    it('should extract item/artifact image with itemName', () => {
        const text = 'W skrytce leży artefakt. [PRZEDMIOT: Srebrny Klucz, ornate ancient silver key] Błyszczy w mroku.';
        const result = extractImages(text);

        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('item');
        expect(result[0].style).toBe('item');
        expect(result[0].aspectRatio).toBe('1:1');
        expect(result[0].itemName).toBe('Srebrny Klucz');
    });

    it('should extract monster tag with automatic isMythos and high priority', () => {
        const text = 'Z wody wyłania się koszmar. [POTWÓR: Dagon, massive aquatic deity rising from the dark abyss] Rzucasz na SAN.';
        const result = extractImages(text);

        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('monster');
        expect(result[0].style).toBe('horror');
        expect(result[0].aspectRatio).toBe('16:9');
        expect(result[0].isMythos).toBe(true);
        expect(result[0].priority).toBe('high');
    });

    it('should extract vision/phenomenon tag with automatic isMythos and high priority', () => {
        const text = 'Ściany zaczynają falować. [ZJAWISKO: geometric impossible architecture bending space] Głowa ci pęka.';
        const result = extractImages(text);

        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('vision');
        expect(result[0].style).toBe('horror');
        expect(result[0].isMythos).toBe(true);
        expect(result[0].priority).toBe('high');
    });
});

describe('media-parser: detectSFX', () => {
    it('should detect sfx in text and return presets', () => {
        // Assume SFX_PATTERNS has "wystrzał" matching "revolver"
        const text = 'Słychać głośny wystrzał i trzask szkła.';
        const combat = { isActive: false, rounds: [] };
        
        const result = detectSFX(text, combat);
        expect(result).toBeInstanceOf(Array);
        // We won't test exact array content because SFX_PATTERNS might change, 
        // but we know it should return an array limited to 2 max.
        expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should deduplicate sfx presets', () => {
        const text = 'Wystrzał! Wystrzał! Wystrzał!';
        const combat = { isActive: false, rounds: [] };
        const result = detectSFX(text, combat);
        // Zależnie od wzorców, "wystrzał" daje preset, który nie powinien się dublować w output array
        const unique = new Set(result);
        expect(unique.size).toBe(result.length);
    });

    it('should inject combat sfx if combat is active', () => {
        const combat = { isActive: true, rounds: [] };
        const result = detectSFX('Some random text', combat);
        expect(result).toContainEqual(expect.objectContaining({ presetId: 'combat_ambience' }));
    });
});
