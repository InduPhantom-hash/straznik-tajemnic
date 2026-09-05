import { EvidenceNode, EvidenceNodeType, EvidenceNodeStatus, PinType } from '@/types/investigator-board';
import { JournalEntry, InvestigatorDossier } from '@/lib/types';

import { getMappedBoardType } from '@/lib/journal/entity-mapping';

/**
 * Mapuje typ wpisu Dziennika na typ wezla Tablicy Badacza.
 */
function mapEntryTypeToNodeType(entry: JournalEntry): EvidenceNodeType {
  const typeStr = (entry.type || '') as string;
  const catStr = ((entry as unknown as Record<string, unknown>).category || '') as string;
  return getMappedBoardType(typeStr, catStr);
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
  const validEntries = entries.filter(e => e.type !== 'journal' && e.type !== 'note');

  return validEntries.map((entry, idx) => {
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

/**
 * Konwertuje kanoniczną strukturę Akt Śledczych (InvestigatorDossier) na węzły Tablicy Badacza.
 */
export function convertDossierToBoardNodes(dossier: InvestigatorDossier): EvidenceNode[] {
  const nodes: EvidenceNode[] = [];
  let index = 0;

  const pushNode = (
    baseId: string,
    title: string,
    description: string,
    type: EvidenceNodeType,
    status: EvidenceNodeStatus,
    pinType: PinType,
    date?: string,
    tags?: string[],
    imageUrl?: string,
    insight?: string,
    extraSources?: {
      sourceClueId?: string;
      sourceNpcId?: string;
      sourceLocationId?: string;
      sourceNoteId?: string;
    }
  ) => {
    const col = index % 4;
    const row = Math.floor(index / 4);
    nodes.push({
      id: `node_${baseId}`,
      title: title || 'Nieznany element',
      description: description || '',
      type,
      status,
      position: { x: 50 + col * 280, y: 50 + row * 220 },
      imageUrl,
      investigatorInsight: insight,
      tags: tags || [],
      createdAt: date || new Date().toISOString(),
      isManuallyCreated: false,
      pinType,
      rotation: randomRotation(),
      ...extraSources,
    });
    index++;
  };

  // 1. Poszlaki i dowody
  if (Array.isArray(dossier.clues)) {
    dossier.clues.forEach((clue) => {
      const type: EvidenceNodeType = clue.category === 'occult' ? 'artifact' : 'clue';
      const status: EvidenceNodeStatus =
        clue.status === 'confirmed' ? 'confirmed' : clue.status === 'disproven' ? 'refuted' : 'hypothesis';
      pushNode(
        clue.id,
        clue.title,
        clue.description,
        type,
        status,
        clue.category === 'occult' ? 'badge' : 'telegram',
        clue.inGameDate,
        clue.tags,
        clue.imageUrl,
        clue.investigatorInsight,
        { sourceClueId: clue.id }
      );
    });
  }

  // 2. Postacie
  if (Array.isArray(dossier.npcs)) {
    dossier.npcs.forEach((npc) => {
      pushNode(
        npc.id,
        npc.name,
        npc.firstImpression || npc.occupation || '',
        'suspect',
        'confirmed',
        'polaroid',
        npc.inGameDate,
        npc.tags,
        npc.avatarUrl,
        npc.keyInformation,
        { sourceNpcId: npc.id }
      );
    });
  }

  // 3. Lokacje
  if (Array.isArray(dossier.locations)) {
    dossier.locations.forEach((loc) => {
      pushNode(
        loc.id,
        loc.name,
        loc.description || loc.addressOrRegion || '',
        'location',
        'confirmed',
        'polaroid',
        loc.inGameDate,
        loc.tags,
        loc.imageUrl,
        undefined,
        { sourceLocationId: loc.id }
      );
    });
  }

  // 4. Notatki badacza
  if (Array.isArray(dossier.notes)) {
    dossier.notes.forEach((note) => {
      pushNode(
        note.id,
        note.title,
        note.content,
        'player_note',
        'hypothesis',
        'note',
        note.inGameDate,
        note.tags,
        undefined,
        undefined,
        { sourceNoteId: note.id }
      );
    });
  }

  return nodes;
}
