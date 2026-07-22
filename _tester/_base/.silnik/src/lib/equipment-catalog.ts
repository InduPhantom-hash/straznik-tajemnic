import type {
  EquipmentCategory,
  EquipmentItem,
  EquipmentTemplate,
  EquipmentVisualEra,
} from './types';

/** Bezpieczny lokalny fallback, używany zanim konkretny render WebP jest dostępny. */
export const CATEGORY_FALLBACK_ASSETS: Record<EquipmentCategory, string> = {
  weapon: '/equipment/predefined/weapon.svg',
  armor: '/equipment/predefined/armor.svg',
  tool: '/equipment/predefined/tool.svg',
  document: '/equipment/predefined/document.svg',
  artifact: '/equipment/predefined/artifact.svg',
  personal: '/equipment/predefined/personal.svg',
  medical: '/equipment/predefined/medical.svg',
  occult: '/equipment/predefined/occult.svg',
};

export const EQUIPMENT_VISUAL_ERAS: EquipmentVisualEra[] = [
  '1890s',
  '1920s',
  '1940s',
  'prl-1970s',
  'modern',
];

const ALL_ERAS = EQUIPMENT_VISUAL_ERAS;
const HISTORICAL_ERAS: EquipmentVisualEra[] = [
  '1890s',
  '1920s',
  '1940s',
  'prl-1970s',
];

/**
 * Wzorce katalogu v1. Nazwy i aliasy łączą obecne zestawy zawodów z polską
 * nomenklaturą Księgi Strażnika; artefakty Mythos pozostają celowo poza katalogiem.
 */
export const EQUIPMENT_CATALOG: EquipmentTemplate[] = [
  {
    id: 'light.flashlight',
    name: 'Latarka',
    aliases: ['Flashlight', 'Latarka elektryczna'],
    category: 'tool',
    visualTreatment: 'mundane',
    availableIn: ['1920s', '1940s', 'prl-1970s', 'modern'],
    assetPaths: { '1920s': '/equipment/catalog/flashlight-1920s.webp' },
  },
  {
    id: 'light.oil-lantern',
    name: 'Lampa naftowa',
    aliases: ['Lantern (Oil)', 'Latarnia naftowa'],
    category: 'tool',
    visualTreatment: 'mundane',
    availableIn: HISTORICAL_ERAS,
    assetPaths: { '1890s': '/equipment/catalog/oil-lantern-1890s.webp' },
  },
  {
    id: 'light.matches',
    name: 'Pudełko zapałek',
    aliases: ['Zapałki', 'Zapałki sztormowe'],
    category: 'personal',
    visualTreatment: 'mundane',
    availableIn: ALL_ERAS,
    assetPaths: { shared: '/equipment/catalog/matches-shared.webp' },
  },
  {
    id: 'tool.rope',
    name: 'Lina (15 m)',
    aliases: ['Rope (50 ft)', 'Mocna lina', 'Lina'],
    category: 'tool',
    visualTreatment: 'mundane',
    availableIn: ALL_ERAS,
    assetPaths: { shared: '/equipment/catalog/rope-shared.webp' },
  },
  {
    id: 'tool.lockpicks',
    name: 'Wytrychy',
    aliases: ['Lockpicks', 'Zestaw wytrychów'],
    category: 'tool',
    visualTreatment: 'mundane',
    availableIn: ALL_ERAS,
    assetPaths: { shared: '/equipment/catalog/lockpicks-shared.webp' },
  },
  {
    id: 'tool.magnifier',
    name: 'Lupa',
    aliases: ['Magnifying Glass', 'Lupa terenowa'],
    category: 'tool',
    visualTreatment: 'mundane',
    availableIn: ALL_ERAS,
    assetPaths: { shared: '/equipment/catalog/magnifier-shared.webp' },
  },
  {
    id: 'tool.camera',
    name: 'Aparat fotograficzny',
    aliases: ['Camera', 'Aparat'],
    category: 'tool',
    visualTreatment: 'mundane',
    availableIn: ALL_ERAS,
    assetPaths: { '1920s': '/equipment/catalog/camera-1920s.webp' },
  },
  {
    id: 'tool.binoculars',
    name: 'Lornetka',
    aliases: ['Binoculars', 'Lornetka polowa', 'Lornetka teatralna'],
    category: 'tool',
    visualTreatment: 'mundane',
    availableIn: ALL_ERAS,
    assetPaths: { shared: '/equipment/catalog/binoculars-shared.webp' },
  },
  {
    id: 'tool.compass',
    name: 'Kompas',
    aliases: ['Compass', 'Kompas z wieczkiem'],
    category: 'tool',
    visualTreatment: 'mundane',
    availableIn: ALL_ERAS,
    assetPaths: { shared: '/equipment/catalog/compass-shared.webp' },
  },
  {
    id: 'tool.mechanical-kit',
    name: 'Zestaw narzędzi mechanicznych',
    aliases: [
      'Toolkit (Mechanical)',
      'Zestaw narzędzi (mechaniczny)',
      'Skrzynka z narzędziami',
      'Klucz francuski',
    ],
    category: 'tool',
    visualTreatment: 'mundane',
    availableIn: ALL_ERAS,
    assetPaths: { shared: '/equipment/catalog/mechanical-kit-shared.webp' },
  },
  {
    id: 'tool.electrical-kit',
    name: 'Zestaw narzędzi elektrycznych',
    aliases: ['Toolkit (Electrical)', 'Zestaw narzędzi (elektryczny)'],
    category: 'tool',
    visualTreatment: 'mundane',
    availableIn: ['1920s', '1940s', 'prl-1970s', 'modern'],
    assetPaths: { shared: '/equipment/catalog/electrical-kit-shared.webp' },
  },
  {
    id: 'medical.first-aid',
    name: 'Apteczka',
    aliases: ['First Aid Kit', 'Kieszonkowa apteczka'],
    category: 'medical',
    visualTreatment: 'mundane',
    availableIn: ALL_ERAS,
    assetPaths: { 'prl-1970s': '/equipment/catalog/first-aid-prl-1970s.webp' },
  },
  {
    id: 'medical.bag',
    name: 'Torba medyczna',
    aliases: ['Medical Bag', 'Torba lekarska'],
    category: 'medical',
    visualTreatment: 'mundane',
    availableIn: ALL_ERAS,
    assetPaths: { shared: '/equipment/catalog/medical-bag-shared.webp' },
  },
  {
    id: 'medical.bandages',
    name: 'Bandaże',
    aliases: ['Bandages', 'Opatrunek uciskowy'],
    category: 'medical',
    visualTreatment: 'mundane',
    availableIn: ALL_ERAS,
    assetPaths: { shared: '/equipment/catalog/bandages-shared.webp' },
  },
  {
    id: 'personal.pocket-watch',
    name: 'Zegarek kieszonkowy',
    aliases: ['Pocket Watch', 'Złoty zegarek kieszonkowy'],
    category: 'personal',
    visualTreatment: 'mundane',
    availableIn: HISTORICAL_ERAS,
    assetPaths: { shared: '/equipment/catalog/pocket-watch-shared.webp' },
  },
  {
    id: 'personal.cigarette-case',
    name: 'Papierośnica',
    aliases: ['Cigarette Case'],
    category: 'personal',
    visualTreatment: 'mundane',
    availableIn: HISTORICAL_ERAS,
    assetPaths: { shared: '/equipment/catalog/cigarette-case-shared.webp' },
  },
  {
    id: 'personal.flask',
    name: 'Piersiówka',
    aliases: ['Hip Flask'],
    category: 'personal',
    visualTreatment: 'mundane',
    availableIn: ALL_ERAS,
    assetPaths: { shared: '/equipment/catalog/flask-shared.webp' },
  },
  {
    id: 'personal.wallet',
    name: 'Portfel',
    aliases: ['Wallet'],
    category: 'personal',
    visualTreatment: 'mundane',
    availableIn: ALL_ERAS,
    assetPaths: { shared: '/equipment/catalog/wallet-shared.webp' },
  },
  {
    id: 'document.notebook',
    name: 'Notatnik i ołówek',
    aliases: ['Notebook & Pencil', 'Notes badawczy', 'Szkicownik'],
    category: 'document',
    visualTreatment: 'mundane',
    availableIn: ALL_ERAS,
    assetPaths: { shared: '/equipment/catalog/notebook-shared.webp' },
  },
  {
    id: 'document.letter',
    name: 'List',
    aliases: ['Letter', 'Dokumenty i bilety', 'Dokumenty podróżne'],
    category: 'document',
    visualTreatment: 'mundane',
    availableIn: ALL_ERAS,
    assetPaths: { shared: '/equipment/catalog/letter-shared.webp' },
  },
  {
    id: 'document.map',
    name: 'Mapa',
    aliases: ['Map', 'Mapy lotnicze regionu', 'Mapa regionu'],
    category: 'document',
    visualTreatment: 'mundane',
    availableIn: ALL_ERAS,
    assetPaths: { shared: '/equipment/catalog/map-shared.webp' },
  },
  {
    id: 'document.photo',
    name: 'Fotografia',
    aliases: ['Photograph'],
    category: 'document',
    visualTreatment: 'mundane',
    availableIn: ALL_ERAS,
    assetPaths: { shared: '/equipment/catalog/photo-shared.webp' },
  },
  {
    id: 'document.diary',
    name: 'Dziennik',
    aliases: ['Journal/Diary', 'Dziennik'],
    category: 'document',
    visualTreatment: 'mundane',
    availableIn: ALL_ERAS,
    assetPaths: { shared: '/equipment/catalog/diary-shared.webp' },
  },
  {
    id: 'weapon.revolver-32',
    name: 'Rewolwer .32',
    aliases: ['.32 Revolver'],
    category: 'weapon',
    visualTreatment: 'mundane',
    availableIn: HISTORICAL_ERAS,
    assetPaths: { shared: '/equipment/catalog/revolver-32-shared.webp' },
  },
  {
    id: 'weapon.revolver-38',
    name: 'Rewolwer .38',
    aliases: ['.38 Revolver'],
    category: 'weapon',
    visualTreatment: 'mundane',
    availableIn: ['1920s', '1940s', 'prl-1970s'],
    assetPaths: { '1940s': '/equipment/catalog/revolver-1940s.webp' },
  },
  {
    id: 'weapon.pistol-45',
    name: 'Pistolet .45',
    aliases: ['.45 Automatic', 'Rewolwer .45 Colt'],
    category: 'weapon',
    visualTreatment: 'mundane',
    availableIn: ['1920s', '1940s', 'modern'],
    assetPaths: { shared: '/equipment/catalog/pistol-45-shared.webp' },
  },
  {
    id: 'weapon.shotgun',
    name: 'Dubeltówka',
    aliases: ['Shotgun (Double-Barrel)', 'Dubeltówka (dwururka)'],
    category: 'weapon',
    visualTreatment: 'mundane',
    availableIn: ALL_ERAS,
    assetPaths: { shared: '/equipment/catalog/shotgun-shared.webp' },
  },
  {
    id: 'weapon.hunting-rifle',
    name: 'Sztucer myśliwski',
    aliases: ['Hunting Rifle', 'Karabin'],
    category: 'weapon',
    visualTreatment: 'mundane',
    availableIn: ALL_ERAS,
    assetPaths: { shared: '/equipment/catalog/hunting-rifle-shared.webp' },
  },
  {
    id: 'weapon.knife',
    name: 'Nóż',
    aliases: ['Knife', 'Nóż myśliwski', 'Scyzoryk'],
    category: 'weapon',
    visualTreatment: 'mundane',
    availableIn: ALL_ERAS,
    assetPaths: { shared: '/equipment/catalog/knife-shared.webp' },
  },
  {
    id: 'weapon.machete',
    name: 'Maczeta',
    aliases: ['Machete'],
    category: 'weapon',
    visualTreatment: 'mundane',
    availableIn: ALL_ERAS,
    assetPaths: { shared: '/equipment/catalog/machete-shared.webp' },
  },
  {
    id: 'occult.candles',
    name: 'Świece',
    aliases: ['Candles (12)', 'Świece (12 szt.)'],
    category: 'occult',
    visualTreatment: 'mundane',
    availableIn: ALL_ERAS,
    assetPaths: { shared: '/equipment/catalog/candles-shared.webp' },
  },
  {
    id: 'occult.chalk',
    name: 'Kreda rytualna',
    aliases: ['Chalk (colored)', 'Kreda (kolorowa)'],
    category: 'occult',
    visualTreatment: 'mundane',
    availableIn: ALL_ERAS,
    assetPaths: { shared: '/equipment/catalog/chalk-shared.webp' },
  },
  {
    id: 'occult.incense',
    name: 'Kadzidło i kadzielnica',
    aliases: ['Incense & Burner'],
    category: 'occult',
    visualTreatment: 'mundane',
    availableIn: ALL_ERAS,
    assetPaths: { shared: '/equipment/catalog/incense-shared.webp' },
  },
  {
    id: 'modern.phone',
    name: 'Telefon z ładowarką',
    aliases: ['Smartfon', 'Telefon'],
    category: 'tool',
    visualTreatment: 'mundane',
    availableIn: ['modern'],
    assetPaths: { modern: '/equipment/catalog/phone-modern.webp' },
  },
  {
    id: 'modern.power-bank',
    name: 'Powerbank',
    aliases: ['Bateria zewnętrzna'],
    category: 'tool',
    visualTreatment: 'mundane',
    availableIn: ['modern'],
    assetPaths: { modern: '/equipment/catalog/power-bank-modern.webp' },
  },
];

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('pl-PL');
}

export function findEquipmentTemplate(
  nameOrId: string | undefined
): EquipmentTemplate | undefined {
  if (!nameOrId) return undefined;
  const needle = normalize(nameOrId);

  // 1. Ścisłe dopasowanie po ID, nazwie lub aliasie
  const exact = EQUIPMENT_CATALOG.find(
    (template) =>
      template.id === nameOrId ||
      normalize(template.name) === needle ||
      template.aliases.some((alias) => normalize(alias) === needle)
  );
  if (exact) return exact;

  // 2. Elastyczne dopasowanie zawierania (fuzzy substring matching dla polskich nazw)
  return EQUIPMENT_CATALOG.find((template) => {
    const normName = normalize(template.name);
    if (needle.includes(normName) || normName.includes(needle)) return true;
    return template.aliases.some((alias) => {
      const normAlias = normalize(alias);
      return normAlias.length >= 3 && (needle.includes(normAlias) || normAlias.includes(needle));
    });
  });
}

export function resolveCatalogAsset(
  template: EquipmentTemplate | undefined,
  era: EquipmentVisualEra
): string | undefined {
  if (!template) return undefined;
  return template.assetPaths?.[era] ?? template.assetPaths?.shared;
}

/** Oznacza istniejący przedmiot jako katalogowy, nie zmieniając jego ID egzemplarza. */
export function applyCatalogTemplate(
  item: EquipmentItem,
  era: EquipmentVisualEra = '1920s'
): EquipmentItem {
  if (item.visualSource === 'generated') return item;
  const template = findEquipmentTemplate(item.templateId ?? item.name);
  if (!template) return item;
  return {
    ...item,
    templateId: template.id,
    category: template.category,
    visualSource: 'catalog',
    visualTreatment: template.visualTreatment,
    imageUrl: item.imageUrl ?? resolveCatalogAsset(template, era),
  };
}

/** Lekka, idempotentna migracja zapisów sprzed `templateId` i `visualSource`. */
export function migrateEquipmentCatalog(
  items: EquipmentItem[] | undefined,
  era: EquipmentVisualEra = '1920s'
): EquipmentItem[] | undefined {
  return items?.map((item) => applyCatalogTemplate(item, era));
}

export function isCatalogEquipment(item: EquipmentItem): boolean {
  if (item.visualSource === 'generated') return false;
  if (item.visualSource === 'catalog') return true;
  return Boolean(item.templateId && findEquipmentTemplate(item.templateId));
}
