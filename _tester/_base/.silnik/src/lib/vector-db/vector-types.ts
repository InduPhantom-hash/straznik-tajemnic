/** Wspólne typy lokalnego magazynu wektorów, bez zależności od dostawcy chmurowego. */
export interface VectorMetadata {
  sourceFile?: string;
  documentId?: string;
  chunkIndex?: number;
  startOffset?: number;
  endOffset?: number;
  contentType: string;
  summary: string;
  gameTimestamp: string;
  realTimestamp: string;
  tags: string;
  sessionId: string;
  messageRange: string;
  [key: string]: string | number | boolean | string[] | undefined;
}

export interface StoredDocument {
  id: string;
  text?: string;
  metadata: VectorMetadata;
}

export interface DocumentProvenance {
  sourceFile?: string;
  documentId?: string;
  chunkIndex?: number;
  startOffset?: number;
  endOffset?: number;
}

export function documentKey(namespace: string, id: string): string {
  return JSON.stringify([namespace, id]);
}

export function parseDocumentTags(tags: unknown): string[] {
  if (Array.isArray(tags)) return tags.filter((tag): tag is string => typeof tag === 'string');
  if (typeof tags !== 'string' || !tags) return [];
  try { return parseDocumentTags(JSON.parse(tags)); } catch { return [tags]; }
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
  text?: string;
}

export const LOCAL_RAG_NAMESPACES = {
  RULES: 'rules',
  ADVENTURES: 'adventures',
  NPCS: 'npcs',
  WORLD_STATE: 'world-state',
  MYTHOS: 'mythos',
  CUSTOM: 'custom',
  session: (id: string) => `sessions/${id}`,
  campaign: (playthroughId: string) => `campaigns/${playthroughId}`,
  adventure: (id: string) => `adventures/${id}`,
} as const;
