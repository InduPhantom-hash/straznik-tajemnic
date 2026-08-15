/**
 * Prompty renderów ekwipunku.
 * Zwykły przedmiot ma wyglądać jak rzecz z realnego świata, nawet gdy został
 * znaleziony w scenie grozy. Anomalia jest możliwa tylko przy jawnej fladze.
 */

import type { Character, EquipmentCategory, EquipmentItem } from './types';
import {
  getEraColorDirection,
  getEraPhoneVisualDescription,
  getEraTechnologyGuardrails,
  resolveEraVisualProfile,
} from './era-visual-style';

const ERA_MODIFIERS: Record<string, string> = {
  '1890s': 'late Victorian period, historically accurate brass, wood and leather',
  '1920s': '1920s, historically accurate early electric consumer goods and art deco details',
  '1930s': '1930s Great Depression era, functional utilitarian materials, early bakelite and steel',
  '1940s': '1940s, historically accurate wartime and postwar utilitarian materials',
  '1950s': '1950s mid-century design, chrome, bakelite, early vinyl and pressed steel',
  'prl-1970s': 'Poland in the 1970s, PRL-era domestic object design, practical analog materials',
  '1980s': '1980s analog retro design, matte plastic, mechanical switches, period electronic aesthetic',
  '1990s': '1990s pre-smartphone technology, gray/black textured plastic, monochrome LCD if electronic, analog tools',
  '2000s': 'early 2000s Y2K era design, silver/translucent plastic, compact feature phone aesthetic',
  modern: 'contemporary real-world design and materials',
};

const CATEGORY_STYLES: Record<EquipmentCategory, string> = {
  weapon: 'authentic object photography, mechanically plausible proportions',
  armor: 'functional protective equipment, honest wear and construction',
  tool: 'practical field equipment, visible materials and working details',
  document: 'physical paper object with no readable words or labels',
  artifact: 'singular old object, physical texture and restrained age',
  personal: 'well-used personal belonging, understated and believable',
  medical: 'period-appropriate medical kit or instrument, clean practical presentation',
  occult: 'ordinary ritual supply, believable materials, no implied magic',
};

const CATEGORY_MATERIALS: Record<EquipmentCategory, string> = {
  weapon: 'blued steel, wood, leather or bakelite where historically appropriate',
  armor: 'canvas, leather, steel and functional fasteners',
  tool: 'steel, brass, wood, leather, glass and rubber where appropriate',
  document: 'paper, ink marks too small to read, folder or envelope',
  artifact: 'stone, tarnished metal, wood or glass with credible age',
  personal: 'leather, nickel, brass, wood, fabric or bakelite',
  medical: 'leather case, glass, nickel-plated steel, cloth bandages',
  occult: 'beeswax, chalk, untreated paper, ceramic or common metal',
};

const MUNDANE_GUARDRAILS =
  'one clear item as the focal point, universal period micro-scene on a worn wooden desk or field cloth, no people, no hands, no brands, no logos, no readable text, no map labels, no pentagrams, no occult symbols, no tentacles, no creatures, no cosmic imagery, no blood, no gore, no supernatural glow';

const SUPERNATURAL_GUARDRAILS =
  'one clear item as the focal point, realistic physical materials first, subtle and restrained anomaly that follows the description only, no people, no hands, no brands, no readable text, no gratuitous tentacles, no generic pentagrams, no creature in frame';

const CHARACTER_BOUND_ITEM_PATTERN =
  /\b(odznak\w*|legitymacj\w*|identyfikator\w*|dow[oó]d\w*|paszport\w*|przepustk\w*|praw[ao]\s+jazdy|karta\s+prasowa|press\s+card|identity\s+card|id\s+badge|credential\w*)\b/i;

const PHONE_ITEM_PATTERN =
  /\b(telefon\w*|smartfon\w*|kom[oó]rk\w*|phone|telephone|smartphone)\b/i;

function isSupernatural(item: EquipmentItem): boolean {
  return item.visualTreatment === 'supernatural';
}

/**
 * Przedmiot, który po swojej nazwie lub opisie ma pokazywać dane właściciela.
 * Katalog nie przechowuje takich renderów - powstają przy konkretnym badaczu.
 */
export function isCharacterBoundEquipment(item: EquipmentItem): boolean {
  return CHARACTER_BOUND_ITEM_PATTERN.test(
    `${item.name} ${item.description ?? ''}`
  );
}

function getCharacterBoundDirection(character: Character | null | undefined): string | undefined {
  if (!character) return undefined;
  return [
    `unique personal identity item for ${character.name}`,
    character.occupation && `occupation: ${character.occupation}`,
    character.age && `age: ${character.age}`,
    character.birthplace && `birthplace: ${character.birthplace}`,
    'use the supplied owner portrait as the exact reference for any portrait photograph on the item',
    'include the owner data only where this specific document naturally carries it; keep all other text minimal and plausible',
  ]
    .filter(Boolean)
    .join(', ');
}

function resolveEraModifier(era: string): string {
  const profile = resolveEraVisualProfile(era);
  return ERA_MODIFIERS[profile] ?? ERA_MODIFIERS['1920s'];
}

/** Buduje realistyczny prompt dla jednego egzemplarza ekwipunku. */
export function buildEquipmentImagePrompt(
  item: EquipmentItem,
  era = '1920s',
  _adventureTheme?: string,
  _character?: Character | null
): string {
  // Zwykły render nie dziedziczy motywów przygody ani danych badacza. Wyjątkiem
  // są dokumenty i odznaki bezpośrednio związane z konkretną postacią.
  void _adventureTheme;
  const category = item.category || 'personal';
  const treatment = isSupernatural(item);
  const condition =
    item.condition === 'new'
      ? 'new and carefully maintained'
      : item.condition === 'damaged'
        ? 'visibly worn with small plausible damage'
        : item.condition === 'broken'
          ? 'broken but still clearly identifiable'
          : 'used, plausible wear and patina';

  // Jeśli przedmiot to telefon, wstrzyknij ścisły opis wyglądu dla danej epoki
  const isPhone = PHONE_ITEM_PATTERN.test(`${item.name} ${item.description ?? ''}`);
  const phoneSpecificDescription = isPhone ? getEraPhoneVisualDescription(era) : undefined;
  const eraGuardrails = getEraTechnologyGuardrails(era);

  return [
    `Photorealistic period object study of ${item.name}`,
    phoneSpecificDescription,
    item.description,
    CATEGORY_STYLES[category],
    CATEGORY_MATERIALS[category],
    resolveEraModifier(era),
    getEraColorDirection(era),
    condition,
    isCharacterBoundEquipment(item)
      ? getCharacterBoundDirection(_character)
      : undefined,
    treatment ? SUPERNATURAL_GUARDRAILS : MUNDANE_GUARDRAILS,
    eraGuardrails,
    'natural directional light, accurate scale, documentary realism, detailed texture, square composition',
  ]
    .filter(Boolean)
    .join(', ');
}

export function buildThumbnailPrompt(item: EquipmentItem, era = '1920s'): string {
  return buildEquipmentImagePrompt(item, era);
}

export function getCategoryStyle(category: EquipmentCategory): string {
  return CATEGORY_STYLES[category] ?? CATEGORY_STYLES.personal;
}

export function getAvailableEras(): { value: string; label: string }[] {
  return [
    { value: '1890s', label: 'Epoka wiktoriańska (1890s)' },
    { value: '1920s', label: 'Szalone lata 20.' },
    { value: '1930s', label: 'Lata 30. (Wielki Kryzys)' },
    { value: '1940s', label: 'Lata 40. (Noir / II WŚ)' },
    { value: '1950s', label: 'Lata 50. (Powojenny modernizm)' },
    { value: 'prl-1970s', label: 'PRL - lata 70.' },
    { value: '1980s', label: 'Lata 80. (Retro analog)' },
    { value: '1990s', label: 'Lata 90. (Y2K / pre-smartfon)' },
    { value: '2000s', label: 'Lata 2000 (Telefony klasyczne)' },
    { value: 'modern', label: 'Współczesność' },
  ];
}

