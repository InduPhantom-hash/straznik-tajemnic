export interface MythosRecord {
  id: string;
  term: string;
  category: string;
  categoryTitle: string;
  shortDefinition: string;
  fullContent: string;
  tags: string[];
  sourceUrl: string;
  sourceAttribution: string;
  license: string;
  isPublicDomain: boolean;
  modified: boolean;
  datasetVersion: string;
}

export type MythosIndexRecord = Omit<MythosRecord, 'fullContent'>;

export interface MythosSearchResult {
  id: string;
  term: string;
  categoryTitle: string;
  shortDefinition: string;
  tags: string[];
  sourceUrl: string;
  sourceAttribution: string;
  license: string;
  score: number;
}

export interface MythosAskQuery {
  query: string;
  limit?: number;
}

/**
 * Type guard weryfikujący poprawność struktury rekordu Mythos (schema validation).
 */
export function isMythosRecord(val: unknown): val is MythosRecord {
  if (!val || typeof val !== 'object') return false;
  const record = val as Record<string, unknown>;

  return (
    typeof record.id === 'string' &&
    record.id.trim().length > 0 &&
    typeof record.term === 'string' &&
    record.term.trim().length > 0 &&
    typeof record.category === 'string' &&
    typeof record.categoryTitle === 'string' &&
    typeof record.shortDefinition === 'string' &&
    typeof record.fullContent === 'string' &&
    Array.isArray(record.tags) &&
    record.tags.every((t) => typeof t === 'string') &&
    typeof record.sourceUrl === 'string' &&
    typeof record.sourceAttribution === 'string' &&
    typeof record.license === 'string' &&
    typeof record.isPublicDomain === 'boolean' &&
    typeof record.modified === 'boolean' &&
    typeof record.datasetVersion === 'string'
  );
}

/**
 * Waliduje zapytanie użytkownika do Mythos Ask.
 */
export function validateMythosAskQuery(input: unknown): { isValid: true; data: MythosAskQuery } | { isValid: false; error: string } {
  if (!input || typeof input !== 'object') {
    return { isValid: false, error: 'Payload must be an object' };
  }
  const body = input as Record<string, unknown>;
  if (typeof body.query !== 'string') {
    return { isValid: false, error: 'Query is required and must be a string' };
  }
  const query = body.query.trim();
  if (query.length === 0) {
    return { isValid: false, error: 'Query cannot be empty' };
  }
  if (query.length > 500) {
    return { isValid: false, error: 'Query exceeds maximum length of 500 characters' };
  }

  let limit = 5;
  if (typeof body.limit === 'number' && Number.isFinite(body.limit)) {
    limit = Math.max(1, Math.min(20, Math.floor(body.limit)));
  }

  return { isValid: true, data: { query, limit } };
}
