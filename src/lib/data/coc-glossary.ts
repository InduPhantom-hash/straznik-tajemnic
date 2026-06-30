/**
 * CoC 7e Glossary - known locations + mechanics + mythos/plot patterns.
 *
 * Source of truth dla `extractTags` w `conversation-memory.ts`.
 * IND-79 (sesja 103) - wyodrębnione z inline arrays (lin 189-218 oryginal).
 *
 * Future: dodanie nowego NPC/lokacji = edit tego pliku (1 commit), bez touch'owania
 * core logic w `conversation-memory.ts`. User-editable glossary per session
 * planowany jako osobny ticket (gdy Zew-App rośnie poza solo gameplay).
 *
 * Regexy mają flagę `i` (case-insensitive) - match'ują polskie i angielskie warianty
 * (np. "sanity" + "Sanity" + "SANITY" + "poczytalność").
 */

/**
 * Znane lokacje CoC (Lovecraft Country + global). Match'owanie przez `string.includes()`
 * - case-sensitive (zachowuje istniejące zachowanie z conversation-memory.ts).
 */
export const COC_LOCATIONS: readonly string[] = [
  'Arkham',
  'Miskatonic',
  'Innsmouth',
  'Dunwich',
  'Kingsport',
  'Providence',
  'Boston',
  'London',
  'Londyn',
  'Cairo',
  'Kair',
  'New York',
  'Nowy Jork',
  'Shanghai',
  'Szanghaj',
] as const;

/**
 * Mechaniki gry - regex pattern → tag z prefiksem `MECH:`.
 * Każdy regex case-insensitive (flaga `i`).
 */
export const COC_MECHANICS: ReadonlyArray<{
  readonly pattern: RegExp;
  readonly tag: string;
}> = [
  {
    pattern: /(?:poczytalność|sanity|szaleństwo|obłęd|przerażeni)/i,
    tag: 'MECH:Sanity',
  },
  {
    pattern: /(?:walka|atak|broń|strzał|cios|obrażeni)/i,
    tag: 'MECH:Combat',
  },
  {
    pattern: /(?:rzut|test|sprawdzian|kość|k100|udany|nieudany)/i,
    tag: 'MECH:Dice',
  },
];

/**
 * Elementy Mythosu CoC + plot signals - regex pattern → tag.
 * Uwaga: zawiera 2× MYTHOS i 1× PLOT prefix (semantycznie różne ale grupowane w 1 listę
 * dla 1 source of truth - przyszły refactor może rozdzielić jeśli scope się rozszerzy).
 */
export const COC_MYTHOS: ReadonlyArray<{
  readonly pattern: RegExp;
  readonly tag: string;
}> = [
  {
    pattern:
      /(?:Cthulhu|Nyarlathotep|Azathoth|Shub-Niggurath|Hastur|Yog-Sothoth|Dagon)/i,
    tag: 'MYTHOS:Entity',
  },
  {
    pattern: /(?:rytuał|zaklęcie|księga|grimuar|necronomicon|okultyzm)/i,
    tag: 'MYTHOS:Magic',
  },
  {
    pattern: /(?:trop|poszlaka|dowód|ślad|wskazówka|odkryci)/i,
    tag: 'PLOT:Clue',
  },
];
