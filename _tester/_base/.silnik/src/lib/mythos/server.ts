import fs from 'node:fs';
import path from 'node:path';
import {
  type MythosIndexRecord,
  type MythosRecord,
  type MythosSearchResult,
  isMythosRecord,
} from './types';

let cache: MythosRecord[] | null = null;

export function getMythosDatasetPath(): string {
  return path.join(process.cwd(), 'data', 'mythos', 'canonical-mythos.json');
}

/**
 * Wczytuje i waliduje rekordy Mythos z dysku.
 * W przypadku braku pliku, uszkodzonego JSON lub błędnego schematu
 * filtruje rekordy i zwraca bezpieczną tablicę zamiast rzucać błędem.
 */
export function loadMythosRecords(): MythosRecord[] {
  if (cache) return cache;

  const filePath = getMythosDatasetPath();
  if (!fs.existsSync(filePath)) {
    cache = [];
    return cache;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw.trim()) {
      cache = [];
      return cache;
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn(`[mythos] Dataset at ${filePath} is not an array.`);
      cache = [];
      return cache;
    }

    // Walidacja schematu każdego rekordu
    const validRecords: MythosRecord[] = [];
    for (const item of parsed) {
      if (isMythosRecord(item)) {
        validRecords.push(item);
      }
    }

    if (validRecords.length < parsed.length) {
      console.warn(`[mythos] Odrzucono ${parsed.length - validRecords.length} niepoprawnych rekordów ze schematu.`);
    }

    cache = validRecords;
  } catch (error) {
    console.error(`[mythos] Błąd odczytu lub parsowania datasetu Mythos:`, error);
    cache = [];
  }

  return cache;
}

export function getMythosIndex(): MythosIndexRecord[] {
  return loadMythosRecords().map(({ fullContent: _, ...record }) => record);
}

export function getMythosRecord(id: string): MythosRecord | null {
  if (!id || typeof id !== 'string') return null;
  const normalizedId = id.trim();
  return loadMythosRecords().find((record) => record.id === normalizedId) ?? null;
}

export function searchMythos(query: string, limit = 5): MythosSearchResult[] {
  if (!query || typeof query !== 'string') return [];
  const terms = query
    .toLocaleLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((term) => term.length > 1);

  if (terms.length === 0) return [];

  const safeLimit = Math.max(1, Math.min(50, limit));

  return loadMythosRecords()
    .map((record) => {
      const searchable = `${record.term} ${record.shortDefinition} ${record.tags.join(' ')}`.toLocaleLowerCase();
      const score = terms.reduce((sum, term) => sum + Number(searchable.includes(term)), 0);
      return { record, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.record.term.localeCompare(b.record.term))
    .slice(0, safeLimit)
    .map(({ record, score }) => ({
      id: record.id,
      term: record.term,
      categoryTitle: record.categoryTitle,
      shortDefinition: record.shortDefinition,
      tags: record.tags,
      sourceUrl: record.sourceUrl,
      sourceAttribution: record.sourceAttribution,
      license: record.license,
      score,
    }));
}

/**
 * Resetuje cache na potrzeby testów jednostkowych.
 */
export function resetMythosCacheForTests(): void {
  cache = null;
}
