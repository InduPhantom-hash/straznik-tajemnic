import { bm25Index } from '@/lib/vector-db/bm25-index';
import { LOCAL_RAG_NAMESPACES } from '@/lib/vector-db/vector-types';
import { loadMythosRecords } from './server';

let indexed = false;

/**
 * Ładuje spakowany dataset Mythos do pamięciowego indeksu BM25 raz na proces.
 */
export function ensureMythosBm25Index(): void {
  if (indexed || bm25Index.hasNamespace(LOCAL_RAG_NAMESPACES.MYTHOS)) {
    indexed = true;
    return;
  }

  const records = loadMythosRecords();
  if (!records.length) return;

  bm25Index.addDocuments(
    records.map((record) => ({
      id: record.id,
      namespace: LOCAL_RAG_NAMESPACES.MYTHOS,
      contentType: 'mythos',
      text: `${record.term}\n${record.shortDefinition}\n${record.tags.join(' ')}\n${record.fullContent}`,
      summary: `${record.term}: ${record.shortDefinition}`,
      tags: record.tags,
    }))
  );
  indexed = true;
}

/**
 * Resetuje stan indeksacji BM25 dla testów jednostkowych.
 */
export function resetMythosBm25IndexForTests(): void {
  indexed = false;
  bm25Index.clearNamespace(LOCAL_RAG_NAMESPACES.MYTHOS);
}
