/**
 * Predefiniowane przedmioty ekwipunku dla Call of Cthulhu 7th Edition
 * Używane przez AI do generowania ekwipunku startowego
 */

import { EquipmentItem } from './types';
import {
  applyCatalogTemplate,
  findEquipmentTemplate,
} from './equipment-catalog';

// === BROŃ ===

export const WEAPONS: Partial<EquipmentItem>[] = [
  {
    name: '.32 Revolver',
    category: 'weapon',
    description: 'Mały rewolwer, łatwy do ukrycia.',
    modifiers: { damage: '1d8', range: '15 yards', malfunction: 100 },
    weight: 1,
    value: 15,
  },
  {
    name: '.38 Revolver',
    category: 'weapon',
    description: 'Standardowy rewolwer policyjny.',
    modifiers: { damage: '1d10', range: '15 yards', malfunction: 100 },
    weight: 1.5,
    value: 25,
  },
  {
    name: '.45 Automatic',
    category: 'weapon',
    description: 'Potężny pistolet automatyczny, model Colt M1911.',
    modifiers: { damage: '1d10+2', range: '15 yards', malfunction: 100 },
    weight: 2.5,
    value: 35,
  },
  {
    name: 'Shotgun (Double-Barrel)',
    category: 'weapon',
    description: 'Dwururka myśliwska, śmiertelna na krótki dystans.',
    modifiers: { damage: '2d6+2', range: '10 yards', malfunction: 100 },
    weight: 7,
    value: 40,
  },
  {
    name: 'Hunting Rifle',
    category: 'weapon',
    description: 'Karabin myśliwski z celownikiem.',
    modifiers: { damage: '2d6+4', range: '110 yards', malfunction: 100 },
    weight: 8,
    value: 75,
  },
  {
    name: 'Knife',
    category: 'weapon',
    description: 'Solidny nóż myśliwski.',
    modifiers: { damage: '1d4+2' },
    weight: 0.5,
    value: 3,
  },
  {
    name: 'Club/Baton',
    category: 'weapon',
    description: 'Drewniany kij lub pałka.',
    modifiers: { damage: '1d6' },
    weight: 1,
    value: 1,
  },
  {
    name: 'Machete',
    category: 'weapon',
    description: 'Ciężka maczeta do przecinania roślinności.',
    modifiers: { damage: '1d8+1' },
    weight: 2,
    value: 5,
  },
];

// === NARZĘDZIA ===

export const TOOLS: Partial<EquipmentItem>[] = [
  {
    name: 'Flashlight',
    category: 'tool',
    description: 'Latarka elektryczna z bateriami.',
    weight: 1,
    value: 3,
  },
  {
    name: 'Lantern (Oil)',
    category: 'tool',
    description: 'Lampa naftowa, stabilne światło.',
    weight: 2,
    value: 2,
  },
  {
    name: 'Rope (50 ft)',
    category: 'tool',
    description: 'Mocna lina konopna, 15 metrów.',
    weight: 5,
    value: 1,
  },
  {
    name: 'Lockpicks',
    category: 'tool',
    description: 'Zestaw wytrychy do zamków.',
    modifiers: { skill: 'Locksmith', bonus: 10 },
    weight: 0.2,
    value: 10,
  },
  {
    name: 'Magnifying Glass',
    category: 'tool',
    description: 'Szkło powiększające do badania śladów.',
    modifiers: { skill: 'Spot Hidden', bonus: 10 },
    weight: 0.2,
    value: 2,
  },
  {
    name: 'Camera',
    category: 'tool',
    description: 'Aparat fotograficzny z fleshem.',
    weight: 3,
    value: 25,
  },
  {
    name: 'Binoculars',
    category: 'tool',
    description: 'Lornetka polowa.',
    weight: 1,
    value: 15,
  },
  {
    name: 'Compass',
    category: 'tool',
    description: 'Kompas kieszonkowy.',
    modifiers: { skill: 'Navigate', bonus: 10 },
    weight: 0.2,
    value: 5,
  },
  {
    name: 'Toolkit (Mechanical)',
    category: 'tool',
    description: 'Zestaw narzędzi mechanicznych.',
    modifiers: { skill: 'Mechanical Repair', bonus: 10 },
    weight: 5,
    value: 15,
  },
  {
    name: 'Toolkit (Electrical)',
    category: 'tool',
    description: 'Zestaw narzędzi elektrycznych.',
    modifiers: { skill: 'Electrical Repair', bonus: 10 },
    weight: 4,
    value: 20,
  },
];

// === MEDYCZNE ===

export const MEDICAL: Partial<EquipmentItem>[] = [
  {
    name: 'First Aid Kit',
    category: 'medical',
    description: 'Apteczka pierwszej pomocy z bandażami i jodyną.',
    modifiers: { skill: 'First Aid', bonus: 10 },
    weight: 2,
    value: 5,
  },
  {
    name: 'Medical Bag',
    category: 'medical',
    description: 'Torba lekarska z instrumentami chirurgicznymi.',
    modifiers: { skill: 'Medicine', bonus: 15 },
    weight: 4,
    value: 25,
  },
  {
    name: 'Morphine (5 doses)',
    category: 'medical',
    description: 'Morfina w ampułkach, silny środek przeciwbólowy.',
    weight: 0.2,
    value: 10,
  },
  {
    name: 'Bandages',
    category: 'medical',
    description: 'Zwój bandaży opatrunkowych.',
    weight: 0.5,
    value: 0.5,
  },
];

// === PRZEDMIOTY OSOBISTE ===

export const PERSONAL: Partial<EquipmentItem>[] = [
  {
    name: 'Pocket Watch',
    category: 'personal',
    description: 'Elegancki zegarek kieszonkowy.',
    weight: 0.2,
    value: 15,
  },
  {
    name: 'Cigarette Case',
    category: 'personal',
    description: 'Srebrna papierośnica.',
    weight: 0.2,
    value: 5,
  },
  {
    name: 'Hip Flask',
    category: 'personal',
    description: 'Piersiówka z whisky.',
    weight: 0.3,
    value: 3,
  },
  {
    name: 'Notebook & Pencil',
    category: 'personal',
    description: 'Notes z ołówkiem do zapisków.',
    weight: 0.3,
    value: 0.5,
  },
  {
    name: 'Wallet',
    category: 'personal',
    description: 'Skórzany portfel.',
    weight: 0.1,
    value: 2,
  },
];

// === DOKUMENTY ===

export const DOCUMENTS: Partial<EquipmentItem>[] = [
  {
    name: 'Newspaper Clipping',
    category: 'document',
    description: 'Wycinek z gazety z ważną informacją.',
    weight: 0,
    value: 0,
  },
  {
    name: 'Letter',
    category: 'document',
    description: 'List z tajemniczą wiadomością.',
    weight: 0,
    value: 0,
  },
  {
    name: 'Map',
    category: 'document',
    description: 'Mapa z zaznaczonymi lokacjami.',
    weight: 0.1,
    value: 1,
  },
  {
    name: 'Photograph',
    category: 'document',
    description: 'Stara fotografia.',
    weight: 0,
    value: 0,
  },
  {
    name: 'Journal/Diary',
    category: 'document',
    description: 'Dziennik z zapiskami.',
    weight: 0.5,
    value: 0,
  },
];

// === OKULTYSTYCZNE ===

export const OCCULT: Partial<EquipmentItem>[] = [
  {
    name: 'Candles (12)',
    category: 'occult',
    description: 'Świece woskowe do rytuałów.',
    weight: 1,
    value: 1,
  },
  {
    name: 'Chalk (colored)',
    category: 'occult',
    description: 'Kolorowa kreda do rysowania pentagramów.',
    weight: 0.2,
    value: 0.5,
  },
  {
    name: 'Incense & Burner',
    category: 'occult',
    description: 'Kadzidło i kadzielnica.',
    weight: 0.5,
    value: 2,
  },
  {
    name: 'Silver Mirror',
    category: 'occult',
    description: 'Srebrne lusterko do wróżb.',
    weight: 0.3,
    value: 5,
  },
  {
    name: 'Crystal Ball',
    category: 'occult',
    description: 'Kryształowa kula do wróżenia.',
    weight: 2,
    value: 25,
  },
];

// === ARTEFAKTY MYTHOS ===

export const ARTIFACTS: Partial<EquipmentItem>[] = [
  {
    name: 'Strange Amulet',
    category: 'artifact',
    description: 'Amulet z nieznanym symbolem.',
    modifiers: { sanLoss: '0/1d2' },
    weight: 0.2,
    value: 0,
  },
  {
    name: 'Mythos Tome (Minor)',
    category: 'artifact',
    description: 'Starodawna księga z zakazaną wiedzą.',
    modifiers: { sanLoss: '1d3/1d6', skill: 'Cthulhu Mythos', bonus: 3 },
    weight: 1,
    value: 0,
  },
];

// === EKWIPUNEK WG ZAWODU ===

// UWAGA: KLUCZE pozostają po angielsku (techniczne ID mapowane z OCCUPATIONS
// przez kapitalizację/aliasy - patrz getStartingEquipmentForOccupation).
// WARTOŚCI (nazwy przedmiotów) są po polsku. IND-233: nazwy NIE mogą mieć
// przecinka na najwyższym poziomie (splitTopLevel tnie po przecinku poza
// nawiasami) - dlatego doprecyzowania trzymamy w nawiasach, np. "Lina (15 m)".
export const OCCUPATION_EQUIPMENT: Record<string, string[]> = {
  // Akademiccy i Profesjonaliści
  Antiquarian: ['Lupa', 'Notatnik i ołówek', 'Książki źródłowe'],
  Archaeologist: [
    'Zestaw narzędzi (mechaniczny)',
    'Lina (15 m)',
    'Latarka',
    'Notatnik i ołówek',
    'Kompas',
    'Pędzel i kielnia',
  ],
  Author: [
    'Notatnik i ołówek',
    'Zegarek kieszonkowy',
    'Maszyna do pisania (w domu)',
  ],
  Librarian: ['Lupa', 'Notatnik i ołówek', 'Karta biblioteczna'],
  Professor: [
    'Notatnik i ołówek',
    'Lupa',
    'Zegarek kieszonkowy',
    'Książki źródłowe',
  ],
  Scientist: [
    'Notatnik i ołówek',
    'Lupa',
    'Sprzęt laboratoryjny (w laboratorium)',
  ],

  // Medycyna
  Doctor: [
    'Torba lekarska',
    'Apteczka',
    'Zegarek kieszonkowy',
    'Notatnik i ołówek',
  ],
  Nurse: ['Apteczka', 'Bandaże', 'Zegarek kieszonkowy'],
  Psychiatrist: [
    'Notatnik i ołówek',
    'Zegarek kieszonkowy',
    'Morfina (5 dawek)',
  ],

  // Prawo i Porządek
  'Private Investigator': [
    'Rewolwer .38',
    'Latarka',
    'Wytrychy',
    'Aparat fotograficzny',
    'Notatnik i ołówek',
    'Piersiówka',
  ],
  'Police Detective': [
    'Rewolwer .38',
    'Notatnik i ołówek',
    'Latarka',
    'Kajdanki',
    'Odznaka',
  ],
  Lawyer: ['Notatnik i ołówek', 'Zegarek kieszonkowy', 'Aktówka'],

  // Prasa i Media
  Journalist: [
    'Aparat fotograficzny',
    'Notatnik i ołówek',
    'Legitymacja prasowa',
    'Piersiówka',
  ],
  Photographer: ['Aparat fotograficzny', 'Latarka', 'Statyw', 'Klisza'],

  // Religia i Okultyzm
  Clergy: ['Biblia/modlitewnik', 'Zegarek kieszonkowy', 'Krucyfiks'],
  Occultist: [
    'Świece (12 szt.)',
    'Kreda (kolorowa)',
    'Kadzidło i kadzielnica',
    'Notatnik i ołówek',
    'Dziwny amulet',
  ],
  Parapsychologist: [
    'Aparat fotograficzny',
    'Notatnik i ołówek',
    'Termometr',
    'Detektor pola elektromagnetycznego',
  ],

  // Wojsko i Przygoda
  'Military Officer': ['Pistolet .45', 'Lornetka', 'Kompas', 'Nóż'],
  Soldier: ['Karabin', 'Nóż', 'Apteczka', 'Manierka'],
  Dilettante: [
    'Zegarek kieszonkowy',
    'Papierośnica',
    'Piersiówka',
    'Lornetka teatralna',
  ],
  Explorer: [
    'Kompas',
    'Lornetka',
    'Lina (15 m)',
    'Maczeta',
    'Apteczka',
    'Latarka',
  ],
  'Big Game Hunter': [
    'Sztucer myśliwski',
    'Dubeltówka (dwururka)',
    'Nóż',
    'Lornetka',
    'Kompas',
  ],

  // Przestępczość
  Criminal: ['Rewolwer .32', 'Wytrychy', 'Nóż', 'Latarka'],
  Bootlegger: ['Rewolwer .38', 'Piersiówka', 'Kluczyki do samochodu'],

  // Artyści
  Artist: ['Szkicownik', 'Ołówki i węgiel', 'Paleta i pędzle'],
  Musician: ['Instrument', 'Nuty'],
  Actor: ['Zestaw do charakteryzacji', 'Scenariusz', 'Zegarek kieszonkowy'],

  // Robotnicy
  Mechanic: ['Zestaw narzędzi (mechaniczny)', 'Latarka', 'Kombinezon'],
  Sailor: ['Nóż', 'Lina (15 m)', 'Kompas', 'Piersiówka'],
  Farmer: ['Dubeltówka (dwururka)', 'Nóż', 'Lampa naftowa', 'Lina (15 m)'],

  // Domyślne
  default: ['Notatnik i ołówek', 'Zegarek kieszonkowy', 'Portfel'],
};

/**
 * Aliasy: id zawodu (z OCCUPATIONS, np. 'military') → klucz OCCUPATION_EQUIPMENT,
 * gdy proste kapitalizowanie nie trafia w istniejący klucz. Reszta mapuje się
 * przez kapitalizację pierwszej litery, a brak dopasowania spada do 'default'.
 */
const OCCUPATION_EQUIPMENT_ALIASES: Record<string, string> = {
  military: 'Soldier',
  pilot: 'Explorer',
  engineer: 'Mechanic',
  entertainer: 'Actor',
  police_officer: 'Soldier',
  police_detective: 'Criminal',
  private_investigator: 'Criminal',
};

/**
 * Deterministyczny ekwipunek startowy wg zawodu (CoC 7e, "na sztywno"). Zwraca
 * listę nazw przedmiotów z OCCUPATION_EQUIPMENT - bez AI, bez losowości.
 * Brak dopasowania zawodu → zestaw 'default'.
 */
export function getStartingEquipmentForOccupation(
  occupationId: string | null | undefined
): string[] {
  const fallback = OCCUPATION_EQUIPMENT.default ?? [];
  if (!occupationId) return [...fallback];
  const aliased = OCCUPATION_EQUIPMENT_ALIASES[occupationId];
  const capitalized =
    occupationId.charAt(0).toUpperCase() + occupationId.slice(1);
  const key = aliased ?? capitalized;
  return [...(OCCUPATION_EQUIPMENT[key] ?? fallback)];
}

// === KATEGORIE PO POLSKU ===

export const CATEGORY_LABELS: Record<string, string> = {
  weapon: '⚔️ Broń',
  armor: '🛡️ Ochrona',
  tool: '🔧 Narzędzia',
  document: '📄 Dokumenty',
  artifact: '🔮 Artefakty',
  personal: '👤 Osobiste',
  medical: '💊 Medyczne',
  occult: '🕯️ Okultystyczne',
};

// === WSZYSTKIE PRZEDMIOTY ===

export const ALL_EQUIPMENT: Partial<EquipmentItem>[] = [
  ...WEAPONS,
  ...TOOLS,
  ...MEDICAL,
  ...PERSONAL,
  ...DOCUMENTS,
  ...OCCULT,
  ...ARTIFACTS,
];

/**
 * Znajdź przedmiot po nazwie
 */
export function findEquipmentByName(
  name: string
): Partial<EquipmentItem> | undefined {
  const localMatch = ALL_EQUIPMENT.find(
    (item) => item.name?.toLowerCase() === name.toLowerCase()
  );
  if (localMatch) return localMatch;

  const template = findEquipmentTemplate(name);
  return template
    ? {
        name: template.name,
        category: template.category,
        description: template.description,
        templateId: template.id,
        visualSource: 'catalog',
        visualTreatment: template.visualTreatment,
      }
    : undefined;
}

/**
 * Wygeneruj pełny przedmiot z szablonu
 */
export function createEquipmentItem(
  template: Partial<EquipmentItem>,
  source: 'starting' | 'acquired' | 'found' = 'starting'
): EquipmentItem {
  return applyCatalogTemplate({
    id: `eq_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    templateId: template.templateId,
    name: template.name || 'Unknown Item',
    category: template.category || 'personal',
    description: template.description,
    modifiers: template.modifiers,
    weight: template.weight,
    value: template.value,
    condition: 'used',
    source,
    obtainedAt: new Date(),
  });
}

// Faza 4 (ekonomia RAW): CoC 7e nie ma systemu wagi/udźwigu - waga przedmiotów NIE jest
// już dopisywana ani pokazywana (zamożność opisuje Credit Rating, patrz lib/economy).
// `value` zostaje jako cena jednostkowa (referencyjna przy zakupach), z fallbackiem $1.
export const DEFAULT_ITEM_VALUE = 1; // $ 1920s (cena referencyjna)

/**
 * Uzupełnia brakujące `value` sensownym domyślnym ($1). NIE nadpisuje istniejących
 * (`??`) - szablony i wartości od AI mają pierwszeństwo. RAW: wagi nie dopisujemy.
 */
export function withEquipmentDefaults(items: EquipmentItem[]): EquipmentItem[] {
  return items.map((item) => ({
    ...item,
    value: item.value ?? DEFAULT_ITEM_VALUE,
  }));
}

/**
 * IND-233: dzieli listę przedmiotów po przecinkach/średnikach TYLKO na najwyższym
 * poziomie - przecinki wewnątrz nawiasów są ignorowane. Bez tego "Laptop (przenośny,
 * średniej klasy)" rozpadał się na 2 śmieci-itemy ("Laptop (przenośny" + "średniej
 * klasy)"). Obsługuje zarówno ekwipunek od AI (lista), jak i ręczny CSV z pola tekstowego.
 */
export function splitTopLevel(str: string): string[] {
  if (!str?.trim()) return [];
  const items: string[] = [];
  let current = '';
  let depth = 0;
  for (const ch of str.replace(/[\n\r]+/g, ' ')) {
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);

    if ((ch === ',' || ch === ';') && depth === 0) {
      const trimmed = current.trim();
      if (trimmed) items.push(trimmed);
      current = '';
    } else {
      current += ch;
    }
  }
  const last = current.trim();
  if (last) items.push(last);
  return items;
}
