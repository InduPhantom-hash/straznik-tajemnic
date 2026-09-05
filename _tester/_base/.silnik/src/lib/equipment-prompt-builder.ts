/**
 * Prompty renderów ekwipunku.
 * Zwykły przedmiot ma wyglądać jak rzecz z realnego świata, nawet gdy został
 * znaleziony w scenie grozy. Anomalia jest możliwa tylko przy jawnej fladze.
 */

import type { Character, EquipmentCategory, EquipmentItem } from './types';
import type { ResolvedEraContext } from '@/lib/era/types';
import {
  getEraAudioRecordingVisualDescription,
  getEraCameraVisualDescription,
  getEraColorDirection,
  getEraDevotionalVisualDescription,
  getEraPhoneVisualDescription,
  getEraProtectiveVisualDescription,
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
  weapon: 'authentic object photography, mechanically plausible proportions, oiled metal finish and historic gunsmith craft',
  armor: 'functional protective equipment, honest wear, period stitching, riveted leather and heavy canvas construction',
  tool: 'practical field equipment, visible materials, mechanical assemblies and honest working wear',
  document: 'tactile physical paper object with authentic aging, creases and foxing, no readable words or labels',
  artifact: 'singular ancient object, weathered surface texture, restrained mysterious age, tactile physical authenticity',
  personal: 'well-used personal belonging, understated and believable, genuine patina and subtle signs of frequent handling',
  medical: 'period-appropriate medical instrument or kit, sterilized glass, brushed surgical steel, apothecary bottles and clean practical presentation',
  occult: 'ordinary liturgical or esoteric ritual supply, authentic historical crafts, believable physical materials, no implied magic or glowing energy',
};

const CATEGORY_MATERIALS: Record<EquipmentCategory, string> = {
  weapon: 'blued carbon steel, carved walnut or oak wood, hand-stitched leather holster, brass pins or vintage bakelite grips where historically appropriate',
  armor: 'heavy wax-treated canvas, thick harness leather, forged steel plates, reinforced webbing and functional brass or steel buckles',
  tool: 'drop-forged steel, turned hardwood handles, cast brass fittings, optical glass, vulcanized rubber and hemp cordage where appropriate',
  document: 'rag parchment, textured heavy bond paper, aged manila cardstock, iron gall ink traces too small to resolve, thread-sewn dossier binding or manila envelope',
  artifact: 'hand-carved soapstone, oxidized bronze, tarnished silver, petrified bog oak, obsidian or hand-blown seeded glass with credible centuries of wear',
  personal: 'tooled vegetable-tanned leather, polished nickel-silver, brushed brass, briar wood, woven wool, pressed amber or period bakelite',
  medical: 'sturdy leather medical bag, amber glass tincture vials with cork stoppers, nickel-plated surgical steel, folded cotton gauze and linen bandages',
  occult: 'natural yellow beeswax, carved chalk, untrimmed vellum, beaten tin or pewter, earthenware pottery, dried aromatic herbs and raw brass liturgical fixtures',
};

const MUNDANE_GUARDRAILS =
  'one clear item as the focal point, macro studio still-life photography resting on an authentic period surface such as a distressed wooden desk, leather briefcase or heavy canvas field cloth, no people, no hands, no fingers, no brands, no logos, no readable text, no watermark, no map labels, no pentagrams, no fantasy runes, no occult symbols, no tentacles, no monsters, no creatures, no cosmic imagery, no blood, no gore, no supernatural glow';

const SUPERNATURAL_GUARDRAILS =
  'one clear item as the focal point, macro studio still-life photography resting on an authentic period surface, realistic physical materials first, subtle and restrained anomaly that strictly follows the description only, no people, no hands, no fingers, no brands, no readable text, no gratuitous tentacles, no generic pentagrams, no creature in frame';

const CHARACTER_BOUND_ITEM_PATTERN =
  /\b(odznak\w*|legitymacj\w*|identyfikator\w*|dow[oó]d\w*|paszport\w*|przepustk\w*|praw[ao]\s+jazdy|karta\s+prasowa|press\s+card|identity\s+card|id\s+badge|credential\w*)\b/i;

const PHONE_ITEM_PATTERN =
  /\b(telefon\w*|smartfon\w*|kom[oó]rk\w*|phone|telephone|smartphone)\b/i;

const AUDIO_RECORDING_PATTERN =
  /\b(dyktafon\w*|magnetofon\w*|gramofon\w*|radio\w*|radiostacj\w*|kr[oó]tkofal[oó]wk\w*|radiotelefon\w*|telegraf\w*|transceiver\w*|walkman\w*|fonograf\w*|nagrywark\w*|tape\s*recorder|voice\s*recorder|dictaphone|radio\s*receiver|phonograph|telegraph)\b/i;

const CAMERA_OPTICS_PATTERN =
  /\b(aparat\s+foto\w*|aparat\s+mieszkow\w*|kamera\w*|lornetk\w*|lunet\w*|mikroskop\w*|camera|bellows\s*camera|binoculars|telescope|microscope)\b/i;

const DEVOTIONAL_ITEM_PATTERN =
  /\b(krzy[zż]\w*|r[oó][zż]aniec\w*|kreda\w*|kadzidl\w*|zwoj\w*|zw[oó]j\w*|[sś]wiec\w*|relikwi\w*|woda\s+[sś]wi[eę]ta|aspersor\w*|kropid[lł]\w*|kielich\w*|crucifix|rosary|chalk|incense|censer|scroll|reliquary|holy\s*water|chalice)\b/i;

const PROTECTIVE_TRAVEL_PATTERN =
  /\b(gogle\w*|goggles|welon\w*|veil|akt[oó]wk\w*|briefcase|torba\s+podr[oó][zż]na|walizk\w*|travel\s*bag|suitcase|plecak\w*|backpack|maska\s+przeciwgaz\w*|gas\s*mask|r[eę]kawic\w*|gloves|sztormiak\w*|p[lł]aszcz\s+przeciwdeszcz\w*|raincoat)\b/i;

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

function resolveEraModifier(era: string | ResolvedEraContext): string {
  const profile = resolveEraVisualProfile(era);
  return ERA_MODIFIERS[profile] ?? ERA_MODIFIERS['1920s'];
}

/** Buduje realistyczny prompt dla jednego egzemplarza ekwipunku. */
export function buildEquipmentImagePrompt(
  item: EquipmentItem,
  era: string | ResolvedEraContext = '1920s',
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

  const itemText = `${item.name} ${item.description ?? ''}`;

  // Jeśli przedmiot to telefon, wstrzyknij ścisły opis wyglądu dla danej epoki
  const isPhone = PHONE_ITEM_PATTERN.test(itemText);
  const phoneSpecificDescription = isPhone ? getEraPhoneVisualDescription(era) : undefined;

  // Elektronika analogowa i urządzenia rejestrujące dźwięk
  const isAudioRecording = AUDIO_RECORDING_PATTERN.test(itemText);
  const audioSpecificDescription = isAudioRecording ? getEraAudioRecordingVisualDescription(era) : undefined;

  // Aparaty fotograficzne i instrumenty optyczne
  const isCameraOptics = CAMERA_OPTICS_PATTERN.test(itemText);
  const cameraSpecificDescription = isCameraOptics ? getEraCameraVisualDescription(era) : undefined;

  // Dewocjonalia i akcesoria rytualne
  const isDevotional = DEVOTIONAL_ITEM_PATTERN.test(itemText);
  const devotionalSpecificDescription = isDevotional ? getEraDevotionalVisualDescription() : undefined;

  // Odzież ochronna i akcesoria podróżne
  const isProtectiveTravel = PROTECTIVE_TRAVEL_PATTERN.test(itemText);
  const protectiveSpecificDescription = isProtectiveTravel ? getEraProtectiveVisualDescription() : undefined;

  const eraGuardrails = getEraTechnologyGuardrails(era);

  return [
    `Photorealistic period object study of ${item.name}`,
    phoneSpecificDescription,
    audioSpecificDescription,
    cameraSpecificDescription,
    devotionalSpecificDescription,
    protectiveSpecificDescription,
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

