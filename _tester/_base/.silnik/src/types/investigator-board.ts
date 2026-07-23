export type EvidenceNodeType =
  | 'evidence'     // Dowod rzeczowy / slad
  | 'clue'         // Poszlaka / pogloska
  | 'suspect'      // Osoba / podejrzany / NPC
  | 'location'     // Lokacja / miejsce zdarzenia
  | 'artifact'     // Przedmiot mitow / ksiega
  | 'player_note'; // Recznie dodana karteczka notatki gracza

export type EvidenceNodeStatus =
  | 'confirmed'    // Fakt potwierdzony
  | 'hypothesis'   // Hipoteza / przeczucie badacza
  | 'refuted';     // Dowod / hipoteza obalona

export type PinType = 'polaroid' | 'note' | 'telegram' | 'badge';

export type ConnectionAnchor = 'top' | 'bottom' | 'left' | 'right' | 'center';

export interface EvidencePosition {
  x: number;
  y: number;
}

export interface EvidenceNode {
  id: string;
  title: string;
  description: string;
  type: EvidenceNodeType;
  status: EvidenceNodeStatus;
  position: EvidencePosition;
  imageUrl?: string;
  foundInLocation?: string;
  discoveredAtDate?: string;
  sourceNpc?: string;
  tags?: string[];
  createdAt: string;
  updatedAt?: string;

  // Powiazania zrodlowe (Traceability) - EPIC-01
  sourceJournalEntryId?: string;
  sourceEquipmentItemId?: string;
  isManuallyCreated?: boolean;

  // Wygladd karty na tablicy korkowej - EPIC-01
  pinType?: PinType;
  rotation?: number; // losowy kat -4..4 deg dla realizmu
  colorTheme?: string;

  // Tryb Duet - EPIC-01
  pinnedByPlayerId?: string;
}

export interface EvidenceRelation {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label: string; // Opis polaczenia, np. "Ostatnio widziany w", "Podejrzany o"
  status?: 'strong' | 'weak' | 'doubtful';
  color?: string; // np. "#a83232" (czerwony) lub "#bfa15f" (zloty)

  // Zakotwiczenie sznurkow - EPIC-01
  fromAnchor?: ConnectionAnchor;
  toAnchor?: ConnectionAnchor;
  isDirected?: boolean;
  notes?: string; // Dodatkowa notatka gracza przypisana do sznurka

  createdAt?: string;
}

export interface BoardViewport {
  zoom: number;   // Skala powiekszenia (0.5 - 2.0)
  panX: number;   // Przesuniecie plotna X
  panY: number;   // Przesuniecie plotna Y
}

export interface InvestigatorBoardState {
  adventureId?: string;
  characterId?: string;
  nodes: EvidenceNode[];
  relations: EvidenceRelation[];
  viewport?: BoardViewport;
  lastUpdated: string;
}
