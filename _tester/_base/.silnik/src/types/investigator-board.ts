export type EvidenceNodeType =
  | 'evidence'     // Dowód rzeczowy / ślad
  | 'clue'         // Poszlaka / pogłoska
  | 'suspect'      // Osoba / podejrzany / NPC
  | 'location'     // Lokacja / miejsce zdarzenia
  | 'artifact';    // Przedmiot mitów / księga

export type EvidenceNodeStatus =
  | 'confirmed'    // Fakt potwierdzony
  | 'hypothesis'   // Hipoteza / przeczucie badacza
  | 'refuted';     // Dowód / hipoteza obalona

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
  foundInLocation?: string;
  discoveredAtDate?: string;
  sourceNpc?: string;
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface EvidenceRelation {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label: string; // Opis połączenia, np. "Ostatnio widziany w", "Podejrzany o"
  status?: 'strong' | 'weak' | 'doubtful';
}

export interface InvestigatorBoardState {
  adventureId?: string;
  characterId?: string;
  nodes: EvidenceNode[];
  relations: EvidenceRelation[];
  lastUpdated: string;
}
