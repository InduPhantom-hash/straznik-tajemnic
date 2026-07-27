import { EvidenceNodeType } from '@/types/investigator-board';

/**
 * Single Source of Truth (SSOT) dla mapowania typów obiektów generowanych przez chat AI,
 * typów w dzienniku misji (Journal) oraz typów na Tablicy Badacza (Investigator Board).
 */
export const ENTITY_MAP: Record<string, { journalType: string; boardType: EvidenceNodeType }> = {
  // Postaci / NPC
  npc: { journalType: 'encyclopedia_character', boardType: 'suspect' },
  encyclopedia_character: { journalType: 'encyclopedia_character', boardType: 'suspect' },
  
  // Lokacje
  location: { journalType: 'encyclopedia_location', boardType: 'location' },
  encyclopedia_location: { journalType: 'encyclopedia_location', boardType: 'location' },
  
  // Przedmioty / Odkrycia / Artefakty
  discovery: { journalType: 'encyclopedia_item', boardType: 'artifact' },
  encyclopedia_item: { journalType: 'encyclopedia_item', boardType: 'artifact' },
  item: { journalType: 'encyclopedia_item', boardType: 'artifact' },
  
  // Notatki gracza
  note: { journalType: 'note', boardType: 'player_note' },
  
  // Zadania / Misje
  quest: { journalType: 'quest', boardType: 'evidence' },
  
  // Poszlaki / Fallback
  clue: { journalType: 'clue', boardType: 'clue' },
};

/**
 * Pobiera typ wezla dla Tablicy Badacza na podstawie surowego typu i opcjonalnie kategorii.
 */
export function getMappedBoardType(rawType: string, categoryStr: string = ''): EvidenceNodeType {
  const mapped = ENTITY_MAP[rawType?.toLowerCase()];
  if (mapped) return mapped.boardType;

  // Wsteczna kompatybilność / Fallbacki z kategorii po polsku
  if (categoryStr === 'Spotkania') return 'suspect';
  if (categoryStr === 'Odkrycia') return 'location';
  if (categoryStr === 'Artefakty') return 'artifact';

  return 'clue';
}

/**
 * Normalizuje surowy typ czatu (np. npc) do kanonicznego typu Dziennika (encyclopedia_character).
 */
export function getMappedJournalType(rawType: string): string {
  const mapped = ENTITY_MAP[rawType?.toLowerCase()];
  return mapped ? mapped.journalType : rawType;
}
