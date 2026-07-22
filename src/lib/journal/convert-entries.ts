import { InvestigatorBoardState, EvidenceNode } from '@/types/investigator-board';
import { JournalEntry } from '@/lib/types';

/**
 * Konwertuje tradycyjne wpisy Dziennika (JournalEntry) na początkowe węzły Tablicy Badacza
 * Bezpieczny pomocnik dla komponentów klienckich React (Client Components).
 */
export function convertEntriesToBoardNodes(entries: JournalEntry[]): EvidenceNode[] {
  return entries.map((entry, idx) => {
    let nodeType: EvidenceNode['type'] = 'clue';
    const typeStr = (entry.type || '') as string;
    const catStr = ((entry as unknown as Record<string, unknown>).category || '') as string;
    if (typeStr === 'encyclopedia_character' || catStr === 'Spotkania') nodeType = 'suspect';
    else if (typeStr === 'encyclopedia_location' || catStr === 'Odkrycia') nodeType = 'location';
    else if (typeStr === 'encyclopedia_item' || catStr === 'Artefakty') nodeType = 'artifact';
    else if (typeStr === 'quest') nodeType = 'evidence';

    const col = idx % 4;
    const row = Math.floor(idx / 4);

    return {
      id: `node_${entry.id || idx}`,
      title: entry.title || 'Nieznany dowód',
      description: entry.content || '',
      type: nodeType,
      status: 'confirmed',
      position: { x: 50 + col * 260, y: 50 + row * 180 },
      tags: entry.tags || [],
      createdAt: entry.date || new Date().toISOString(),
    };
  });
}
