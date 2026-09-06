/**
 * Typy danych dla wyekstrahowanych encji przygody, lorebooków i kompendiów z PDF
 */

export type DocumentType = 'scenario' | 'setting' | 'compendium';

export interface AdventureNPC {
  id: string;
  name: string;
  role: string;
  description: string;
  mask: string; // Wygląd i publiczne zachowanie
  hiddenGoal: string; // Ukryty motyw / prawdziwa rola w przygodzie
  locationId?: string;
  relatives?: string[];
}

export interface AdventureLocation {
  id: string;
  name: string;
  description: string;
  atmosphere: string;
  keyClues: string[];
}

export interface AdventureItem {
  id: string;
  name: string;
  type: 'document' | 'artifact' | 'weapon' | 'clue' | 'other';
  description: string;
  readContent?: string; // Treść dokumentu do odczytania przez gracza
}

export interface AdventureStructure {
  adventureId: string;
  title: string;
  summary: string;
  era: string; // np. 1920s, 1990s
  npcs: AdventureNPC[];
  locations: AdventureLocation[];
  items: AdventureItem[];
  extractedAt: string;
}

/** Frakcja lub organizacja z przewodnika regionalnego / lorebooka */
export interface LorebookFaction {
  id: string;
  name: string;
  influence: string; // Wpływ i zasięg w regionie
  agenda: string; // Dążenia, cele jawne i ukryte
  notableMembers?: string[];
}

/** Lokacja geograficzna lub miejska z przewodnika po świecie */
export interface SettingLocation {
  id: string;
  name: string;
  districtOrRegion: string;
  atmosphere: string;
  sensoryDetails: string; // Dźwięki, zapachy, koloryt lokalny
  rumors?: string[]; // Pogłoski i wierzenia ludowe
}

/** Encja regułowa z Kompendium (potwór, bóstwo, zaklęcie, rytuał) */
export interface CompendiumEntity {
  id: string;
  name: string;
  category: 'monster' | 'deity' | 'spell' | 'ritual' | 'artifact' | 'rule';
  summary: string;
  sanityLoss?: string; // np. 1/1d10
  magicCost?: string; // np. 5 PM
  statsOrEffects?: string;
}

/** Ustrukturyzowane dane z podręcznika wiedzy o świecie lub kompendium */
export interface LorebookData {
  id: string;
  title: string;
  documentType: 'setting' | 'compendium';
  era?: string;
  regionOrTheme: string;
  summary: string;
  factions?: LorebookFaction[];
  locations?: SettingLocation[];
  compendiumEntities?: CompendiumEntity[];
  rawLoreSnippets?: string[];
}

/** Odniesienie do podpiętego źródła lore w aktywnej przygodzie */
export interface SourcebookReference {
  id: string;
  title: string;
  documentType: 'setting' | 'compendium';
  geminiFileUri?: string;
}

