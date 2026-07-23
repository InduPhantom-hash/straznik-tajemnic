import { EvidenceNode, EvidenceNodeType, PinType } from '@/types/investigator-board';
import { JournalEntry } from '@/lib/types';

/**
 * Mapuje typ wpisu Dziennika na typ wezla Tablicy Badacza.
 */
function mapEntryTypeToNodeType(entry: JournalEntry): EvidenceNodeType {
  const typeStr = (entry.type || '') as string;
  const catStr = ((entry as unknown as Record<string, unknown>).category || '') as string;

  if (typeStr === 'encyclopedia_character' || catStr === 'Spotkania') return 'suspect';
  if (typeStr === 'encyclopedia_location' || catStr === 'Odkrycia') return 'location';
  if (typeStr === 'encyclopedia_item' || catStr === 'Artefakty') return 'artifact';
  if (typeStr === 'quest') return 'evidence';
  if (typeStr === 'note') return 'player_note';
  return 'clue';
}

/**
 * Mapuje typ wezla na styl wizualny karty na tablicy korkowej.
 */
function mapNodeTypeToPinType(nodeType: EvidenceNodeType): PinType {
  switch (nodeType) {
    case 'suspect':
    case 'location':
      return 'polaroid';
    case 'player_note':
      return 'note';
    case 'artifact':
      return 'badge';
    default:
      return 'telegram';
  }
}

/**
 * Generuje losowy kat obrotu karty dla efektu realizmu korkowej tablicy.
 * Zakres: -4 do 4 stopni.
 */
function randomRotation(): number {
  return Math.round((Math.random() * 8 - 4) * 10) / 10;
}

/**
 * Konwertuje tradycyjne wpisy Dziennika (JournalEntry) na poczatkowe wezly Tablicy Badacza.
 * Uzywany jako fallback gdy gracz nie ma jeszcze zapisanego stanu tablicy.
 */
export function convertEntriesToBoardNodes(entries: JournalEntry[]): EvidenceNode[] {
  return entries.map((entry, idx) => {
    const nodeType = mapEntryTypeToNodeType(entry);
    const pinType = mapNodeTypeToPinType(nodeType);

    const col = idx % 4;
    const row = Math.floor(idx / 4);

    return {
      id: `node_${entry.id || idx}`,
      title: entry.title || 'Nieznany dowod',
      description: entry.content || '',
      type: nodeType,
      status: 'confirmed' as const,
      position: { x: 50 + col * 280, y: 50 + row * 220 },
      tags: entry.tags || [],
      createdAt: entry.date || new Date().toISOString(),

      // EPIC-01: powiazanie zrodlowe i styl karty
      sourceJournalEntryId: entry.id,
      isManuallyCreated: false,
      pinType,
      rotation: randomRotation(),
    };
  });
}
