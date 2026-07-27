import { InvestigatorBoardState, EvidenceNode } from '@/types/investigator-board';
import { JournalEntry } from '@/lib/types';

/**
 * Konwertuje i scala wpisy Dziennika (JournalEntry) z istniejącymi węzłami Tablicy Badacza.
 * Zapewnia ochronę pozycji kart ułożonych ręcznie (Drag&Drop) oraz pozwala dodawać nowe
 * odkrycia kaskadowo, zamiast resetowania siatki.
 */
export function convertEntriesToBoardNodes(
  entries: JournalEntry[],
  existingNodes: EvidenceNode[] = []
): EvidenceNode[] {
  const nodeMap = new Map<string, EvidenceNode>();
  
  // Zachowaj to co gracz już ustawił na tablicy (Save & Load)
  existingNodes.forEach(node => nodeMap.set(node.id, node));

  let cascadeOffset = 0;

  entries.forEach((entry, idx) => {
    const nodeId = `node_${entry.id || idx}`;
    
    // Jeśli węzeł już jest na tablicy, nie ruszaj go (szanuj pozycję ułożoną przez Gracza)
    if (nodeMap.has(nodeId)) return;

    let nodeType: EvidenceNode['type'] = 'clue';
    const typeStr = (entry.type || '') as string;
    const catStr = ((entry as unknown as Record<string, unknown>).category || '') as string;
    
    if (typeStr === 'encyclopedia_character' || catStr === 'Spotkania') nodeType = 'suspect';
    else if (typeStr === 'encyclopedia_location' || catStr === 'Odkrycia') nodeType = 'location';
    else if (typeStr === 'encyclopedia_item' || catStr === 'Artefakty') nodeType = 'artifact';
    else if (typeStr === 'quest') nodeType = 'evidence';

    // Pomijamy Ekwipunek Startowy (jeśli kiedyś by wpadł do journala, czego nie robi,
    // ale na wszelki wypadek ignorujemy wpisy bez tytułu/treści)
    if (!entry.title && !entry.content) return;

    const newNode: EvidenceNode = {
      id: nodeId,
      title: entry.title || 'Nieznany dowód',
      description: entry.content || '',
      type: nodeType,
      status: 'hypothesis', // Domyślnie hipoteza by gracz ocenił fałszywy trop (Red Herring)
      position: { x: 50 + (cascadeOffset * 30), y: 50 + (cascadeOffset * 30) }, // Kaskadowo na rogu
      tags: entry.tags || [],
      createdAt: entry.date || new Date().toISOString(),
    };

    nodeMap.set(nodeId, newNode);
    cascadeOffset = (cascadeOffset + 1) % 10;
  });

  return Array.from(nodeMap.values());
}
