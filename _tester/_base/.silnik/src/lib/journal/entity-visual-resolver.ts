import type { Character, NPC, Location } from '@/lib/types';

export interface EntityVisualReference {
  name: string;
  type: 'character' | 'npc' | 'location' | 'item';
  imageUrl: string;
  visualDescription?: string;
}

/**
 * Normalizuje nazwę entytii do wyszukiwania (usuwa tytuły jak Dr., Ojciec, wielkość liter)
 */
export function normalizeEntityName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/^(dr\.|doktor|ojciec|pan|pani|prof\.|profesor|ksiądz|sir)\s+/i, '')
    .trim();
}

/**
 * Wyszukuje istniejący obraz referencyjny dla danej postaci / lokacji z aktualnego stanu gry.
 */
export function findEntityVisualReference(
  name: string,
  context: {
    character?: Character | null;
    npcs?: NPC[];
    locations?: Location[];
  }
): EntityVisualReference | null {
  const normSearch = normalizeEntityName(name);
  if (!normSearch) return null;

  // 1. Sprawdź postać gracza
  if (context.character && normalizeEntityName(context.character.name) === normSearch) {
    if (context.character.portraitUrl) {
      return {
        name: context.character.name,
        type: 'character',
        imageUrl: context.character.portraitUrl,
        visualDescription: context.character.description,
      };
    }
  }

  // 2. Sprawdź listę NPC
  if (context.npcs && context.npcs.length > 0) {
    const foundNpc = context.npcs.find(
      (npc) => normalizeEntityName(npc.name) === normSearch || normSearch.includes(normalizeEntityName(npc.name))
    );
    if (foundNpc && foundNpc.portraitUrl) {
      return {
        name: foundNpc.name,
        type: 'npc',
        imageUrl: foundNpc.portraitUrl,
        visualDescription: foundNpc.appearance || foundNpc.description,
      };
    }
  }

  // 3. Sprawdź listę Lokacji
  if (context.locations && context.locations.length > 0) {
    const foundLoc = context.locations.find(
      (loc) => normalizeEntityName(loc.name) === normSearch || normSearch.includes(normalizeEntityName(loc.name))
    );
    if (foundLoc && foundLoc.mapUrl) {
      return {
        name: foundLoc.name,
        type: 'location',
        imageUrl: foundLoc.mapUrl,
        visualDescription: foundLoc.appearance || foundLoc.description,
      };
    }
  }

  return null;
}
