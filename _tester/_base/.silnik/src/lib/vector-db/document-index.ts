import { createHash } from 'node:crypto';
import { bm25Index } from './bm25-index';
import { documentKey, parseDocumentTags, type StoredDocument } from './vector-types';

/** Tracks only persisted documents; bundled Mythos entries remain independent. */
const manifests = new Map<string, { hash: string; ids: string[] }>();

export function refreshDocumentIndex(namespace: string, documents: StoredDocument[]): void {
  const hash = createHash('sha256').update(JSON.stringify(documents)).digest('hex');
  const previous = manifests.get(namespace);
  if (previous?.hash === hash && (documents.length === 0 || bm25Index.hasNamespace(namespace))) return;
  for (const id of previous?.ids ?? []) bm25Index.removeDocument(documentKey(namespace, id));
  bm25Index.addDocuments(documents.map(({ id, text, metadata }) => ({
    id, namespace, text: text || metadata.summary || '',
    summary: metadata.summary || '', contentType: metadata.contentType,
    tags: parseDocumentTags(metadata.tags),
    sourceFile: metadata.sourceFile, documentId: metadata.documentId,
    chunkIndex: metadata.chunkIndex, startOffset: metadata.startOffset, endOffset: metadata.endOffset,
  })));
  manifests.set(namespace, { hash, ids: documents.map(({ id }) => id) });
}
