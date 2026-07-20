/** Wspólne typy lokalnego magazynu wektorów, bez zależności od dostawcy chmurowego. */
export interface VectorMetadata {
  contentType: string;
  summary: string;
  gameTimestamp: string;
  realTimestamp: string;
  tags: string;
  sessionId: string;
  messageRange: string;
  [key: string]: string | number | boolean | string[] | undefined;
}

export interface UpsertVector {
  id: string;
  values: number[];
  metadata: VectorMetadata;
  text?: string;
}

export interface QueryResult {
  id: string;
  score: number;
  metadata: VectorMetadata;
}

export const LOCAL_RAG_NAMESPACES = {
  RULES: 'rules',
  ADVENTURES: 'adventures',
  NPCS: 'npcs',
  WORLD_STATE: 'world-state',
  MYTHOS: 'mythos',
  session: (id: string) => `sessions/${id}`,
} as const;
