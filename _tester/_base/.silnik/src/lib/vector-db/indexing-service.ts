/**
 * Indexing Service - most między embedding-service a Pinecone
 * Etap 2b roadmapy v4.0
 *
 * Odpowiada za:
 * - Konwersję MemoryIndexEntry → Pinecone UpsertVector
 * - Indeksowanie nowych chunków do Pinecone (real-time, przy archiwizacji)
 * - Bulk indeksowanie istniejących sesji (migracja z GCS JSON)
 * - Zarządzanie namespace'ami per sesja
 *
 * IND-119 (sesja 148): drop class IndexingService → module-level functions
 * (analog IND-94/IND-101 OOP boilerplate cleanup). B6: walidacja embedding dim
 * dynamiczna przez getEmbeddingDimensions() (V1=768 lub V2=3072). B8: Sentry.captureException
 * w catch blocks zamiast samego console.error.
 */

import * as Sentry from '@sentry/nextjs';
import { MemoryIndexEntry, MemoryIndex } from '../types';
import { embeddingService, getEmbeddingDimensions } from '../embedding-service';
import {
  PINECONE_NAMESPACES,
  type UpsertVector,
  type VectorMetadata,
} from './pinecone-client';
import { localVectorStore } from './local-vector-store';

// ============================================================================
// KONWERSJA MemoryIndexEntry → Pinecone
// ============================================================================

/**
 * Konwertuje wpis z lokalnego indeksu pamięci na wektor Pinecone.
 */
function entryToVector(
  entry: MemoryIndexEntry,
  sessionId: string
): UpsertVector {
  const metadata: VectorMetadata = {
    contentType: 'session',
    summary: entry.summary,
    gameTimestamp: entry.gameTimestamp || '',
    realTimestamp: entry.realTimestamp,
    tags: JSON.stringify(entry.tags || []),
    sessionId,
    messageRange: JSON.stringify(entry.messageRange),
  };

  return {
    id: entry.chunkId,
    values: entry.embedding,
    metadata,
  };
}

// ============================================================================
// MODULE-LEVEL FUNCTIONS (IND-119 sesja 148: drop class IndexingService)
// ============================================================================

/**
 * Indeksuj pojedynczy chunk do Pinecone.
 * Wywoływane real-time po archiwizacji nowego chunka.
 *
 * IND-119 B6: walidacja embedding.length === getEmbeddingDimensions() przed upsert.
 * Jeśli Gemini zwróci niewłaściwy shape (rzadkie), early return false z warn.
 */
export async function indexChunk(
  entry: MemoryIndexEntry,
  sessionId: string
): Promise<boolean> {
  if (!localVectorStore.initialized) {
    console.log('⚠️ Pinecone not initialized, skipping indexing');
    return false;
  }

  const expectedDim = getEmbeddingDimensions();
  if (!entry.embedding || entry.embedding.length !== expectedDim) {
    console.warn(
      `⚠️ Invalid embedding shape: ${entry.embedding?.length} (expected ${expectedDim})`
    );
    return false;
  }

  try {
    const vector = entryToVector(entry, sessionId);
    const namespace = PINECONE_NAMESPACES.session(sessionId);
    await localVectorStore.upsert(namespace, [vector]);
    console.log(`🌲 Indexed chunk ${entry.chunkId} to Pinecone`);
    return true;
  } catch (error) {
    console.error('❌ Failed to index chunk to Pinecone:', error);
    Sentry.captureException(error, {
      tags: { service: 'indexing-service', operation: 'indexChunk' },
      extra: { sessionId, chunkId: entry.chunkId },
    });
    return false;
  }
}

/**
 * Bulk indeksowanie całego MemoryIndex do Pinecone.
 * Używane przy migracji istniejącej sesji z GCS JSON.
 *
 * IND-119 B6: walidacja embedding dim per entry przed mapowaniem na vector.
 */
export async function indexMemoryIndex(
  index: MemoryIndex,
  sessionId: string
): Promise<{
  indexed: number;
  failed: number;
}> {
  if (!localVectorStore.initialized) {
    console.warn('⚠️ Pinecone not initialized, skipping bulk indexing');
    return { indexed: 0, failed: 0 };
  }

  if (!index.entries || index.entries.length === 0) {
    return { indexed: 0, failed: 0 };
  }

  const expectedDim = getEmbeddingDimensions();
  const namespace = PINECONE_NAMESPACES.session(sessionId);
  const vectors = index.entries
    .filter((e) => e.embedding && e.embedding.length === expectedDim)
    .map((e) => entryToVector(e, sessionId));

  try {
    await localVectorStore.upsert(namespace, vectors);
    console.log(
      `🌲 Bulk indexed ${vectors.length} chunks to Pinecone for session ${sessionId}`
    );
    return {
      indexed: vectors.length,
      failed: index.entries.length - vectors.length,
    };
  } catch (error) {
    console.error('❌ Bulk indexing failed:', error);
    Sentry.captureException(error, {
      tags: { service: 'indexing-service', operation: 'indexMemoryIndex' },
      extra: { sessionId, entryCount: index.entries.length },
    });
    return { indexed: 0, failed: index.entries.length };
  }
}

/**
 * Batch indeksowanie wielu tekstów do namespace'u.
 * Generuje embeddingi sekwencyjnie (API rate limits), upsertuje batchowo.
 * Caller: pdf-indexing-service.ts:388 (PDF → Pinecone pipeline).
 *
 * IND-117 (sesja 75): `indexText` (single text variant, 45 lin) dropniete
 * jako dead code (0 callerów empirycznie). `indexTexts` (batch) zostaje -
 * aktywny caller w PDF indexing pipeline.
 */
export async function indexTexts(
  items: Array<{
    id: string;
    text: string;
    metadata: {
      contentType: string;
      summary: string;
      gameTimestamp?: string;
      tags?: string[];
      sessionId?: string;
    };
  }>,
  namespace: string,
  onProgress?: (current: number, total: number) => void
): Promise<{ indexed: number; failed: number }> {
  if (!localVectorStore.initialized) {
    console.warn('⚠️ Pinecone not initialized, skipping batch text indexing');
    return { indexed: 0, failed: 0 };
  }

  const vectors: UpsertVector[] = [];
  let failed = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const embedding = await embeddingService.generateEmbedding(
      item.text,
      'RETRIEVAL_DOCUMENT'
    );

    if (embedding) {
      vectors.push({
        id: item.id,
        values: embedding,
        text: item.text, // pełny tekst chunka - lokalny store trzyma go dla BM25
        metadata: {
          contentType: item.metadata.contentType,
          summary: item.metadata.summary,
          gameTimestamp: item.metadata.gameTimestamp || '',
          realTimestamp: new Date().toISOString(),
          tags: JSON.stringify(item.metadata.tags || []),
          sessionId: item.metadata.sessionId || '',
          messageRange: '',
        },
      });
    } else {
      failed++;
    }

    onProgress?.(i + 1, items.length);
  }

  if (vectors.length > 0) {
    try {
      await localVectorStore.upsert(namespace, vectors);
      console.log(
        `🌲 Batch indexed ${vectors.length} texts to namespace "${namespace}"`
      );
    } catch (error) {
      console.error('❌ Batch upsert failed:', error);
      Sentry.captureException(error, {
        tags: { service: 'indexing-service', operation: 'indexTexts' },
        extra: { namespace, itemCount: items.length },
      });
      return { indexed: 0, failed: items.length };
    }
  }

  return { indexed: vectors.length, failed };
}

/**
 * Usuń wszystkie wektory sesji z Pinecone.
 */
export async function deleteSession(sessionId: string): Promise<void> {
  if (!localVectorStore.initialized) return;

  const namespace = PINECONE_NAMESPACES.session(sessionId);
  await localVectorStore.deleteNamespace(namespace);
  console.log(`🌲 Deleted Pinecone namespace for session ${sessionId}`);
}

// ============================================================================
// BACKWARD COMPAT (DEPRECATED - drop after all callers migrated)
// ============================================================================

/**
 * @deprecated IND-119 sesja 148: use module-level functions instead.
 * Singleton zachowany jako compat shim dla callerów których jeszcze nie zaktualizowaliśmy.
 * Drop after audyt potwierdzi że nikt nie używa `indexingService.X`.
 */
export const indexingService = {
  indexChunk,
  indexMemoryIndex,
  indexTexts,
  deleteSession,
};
