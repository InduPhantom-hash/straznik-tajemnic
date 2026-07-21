/**
/ * Typy danych dla wyekstrahowanych encji przygody z PDF (Gemini 3.6 Flash)
 */

export interface AdventureNPC {
  id: string;
  name: string;
  role: string;
  description: string;
  mask: string; // Wygląd i publiczna zachowanie
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
  readContent?: string; // Treść dokumentu do odczytania przez gracz
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
