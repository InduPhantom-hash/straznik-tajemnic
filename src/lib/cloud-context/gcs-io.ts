/**
 * Cloud Context — GCS I/O operations
 *
 * Zarządza chunkami sesji w Google Cloud Storage.
 * Upload, download, metadata, archive flow.
 *
 * State: `isInitialized` (module-level, idempotent).
 */

import { googleCloudStorageService } from '../google-cloud-storage-service-fixed';
import { embeddingService } from '../embedding-service';
import { indexingService } from '../vector-db/indexing-service';
import { timeManager } from '../time-manager';
import {
  GCS_PREFIX,
  type Message,
  type CloudContextChunk,
  type CloudContextMetadata,
} from './types';
import { createQuickSummary } from './chunking';
import { saveMemoryIndex } from './memory-index';

let isInitialized = false;

/**
 * Inicjalizacja serwisu (idempotent)
 */
export async function initialize(): Promise<boolean> {
  if (isInitialized) return true;

  try {
    await googleCloudStorageService.initialize();
    isInitialized = true;
    console.log('☁️ CloudContextService initialized');
    return true;
  } catch (error) {
    console.error('❌ CloudContextService initialization failed:', error);
    return false;
  }
}

/**
 * Reset state (dla testów)
 */
export function _resetInitializedState(): void {
  isInitialized = false;
}

export function getChunkFileName(
  userId: string,
  sessionId: string,
  chunkIndex: number
): string {
  return `${GCS_PREFIX}/${userId}/${sessionId}/chunk_${chunkIndex.toString().padStart(4, '0')}.json`;
}

export function getMetadataFileName(userId: string, sessionId: string): string {
  return `${GCS_PREFIX}/${userId}/${sessionId}/metadata.json`;
}

/**
 * Upload pojedynczego chunka do GCS
 * ROZSZERZENIE: Generuje embedding i aktualizuje indeks pamięci
 */
export async function uploadHistoryChunk(
  chunk: CloudContextChunk,
  apiKey?: string
): Promise<string> {
  await initialize();

  const fileName = getChunkFileName(
    chunk.userId,
    chunk.sessionId,
    chunk.chunkIndex
  );

  const serializedChunk = {
    ...chunk,
    timestamp: chunk.timestamp.toISOString(),
    messages: chunk.messages.map((m) => ({
      ...m,
      timestamp:
        m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
    })),
  };

  const result = await googleCloudStorageService.uploadFile(
    JSON.stringify(serializedChunk, null, 2),
    fileName,
    {
      metadata: { contentType: 'application/json' },
      public: false,
    }
  );

  console.log(
    `☁️ Uploaded chunk ${chunk.chunkIndex} for session ${chunk.sessionId}`
  );

  // === EMBEDDING GENERATION ===
  if (apiKey) {
    try {
      embeddingService.initialize(apiKey);

      const chunkText = chunk.messages.map((m) => m.content).join('\n');
      const summary = chunk.summary || createQuickSummary(chunk);
      const gameTimestamp = timeManager.formatDateTime();

      const tags: string[] = [
        ...chunk.mentionedNPCs.map((n) => `NPC:${n}`),
        ...chunk.mentionedLocations.map((l) => `LOC:${l}`),
        ...chunk.keyFacts
          .map((f) => (f.category ? `CAT:${f.category}` : ''))
          .filter(Boolean),
      ];

      const indexEntry = await embeddingService.createIndexEntry(
        chunk.id,
        chunkText,
        summary,
        gameTimestamp,
        tags,
        chunk.messageRange,
        'RETRIEVAL_DOCUMENT'
      );

      if (indexEntry) {
        embeddingService.addToIndex(indexEntry);
        await saveMemoryIndex(chunk.userId, chunk.sessionId);
        await indexingService.indexChunk(indexEntry, chunk.sessionId);

        console.log(`🧠 Embedding generated for chunk ${chunk.chunkIndex}`);
      }
    } catch (embErr) {
      console.warn('⚠️ Failed to generate embedding for chunk:', embErr);
    }
  }

  return result.url;
}

/**
 * Pobierz wszystkie chunki dla sesji
 */
export async function downloadAllChunks(
  userId: string,
  sessionId: string
): Promise<CloudContextChunk[]> {
  await initialize();

  const prefix = `${GCS_PREFIX}/${userId}/${sessionId}/`;

  try {
    const files = await googleCloudStorageService.listFiles(prefix);

    const chunks: CloudContextChunk[] = [];

    for (const file of files) {
      if (file.name.endsWith('.json') && file.name.includes('chunk_')) {
        try {
          const buffer = await googleCloudStorageService.downloadFile(
            file.name
          );
          const parsed = JSON.parse(buffer.toString());

          chunks.push({
            ...parsed,
            timestamp: new Date(parsed.timestamp),
            messages: parsed.messages.map(
              (m: Message & { timestamp: string }) => ({
                ...m,
                timestamp: new Date(m.timestamp),
              })
            ),
          });
        } catch (error) {
          console.warn(`⚠️ Failed to load chunk ${file.name}:`, error);
        }
      }
    }

    return chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
  } catch (error) {
    console.warn('⚠️ No chunks found or error loading:', error);
    return [];
  }
}

/**
 * OPT-16: Pobierz tylko relevantne chunki (20% start + 80% koniec).
 */
export async function downloadRelevantChunks(
  userId: string,
  sessionId: string,
  maxChunks: number = 5
): Promise<CloudContextChunk[]> {
  await initialize();

  let metadata;
  try {
    metadata = await getOrCreateMetadata(userId, sessionId);
  } catch {
    return downloadAllChunks(userId, sessionId);
  }

  const totalChunks = metadata.totalChunks;
  if (totalChunks === 0) return [];
  if (totalChunks <= maxChunks) {
    return downloadAllChunks(userId, sessionId);
  }

  const startCount = Math.max(1, Math.floor(maxChunks * 0.2));
  const endCount = maxChunks - startCount;

  const chunkIndicesToFetch: number[] = [];
  for (let i = 0; i < startCount && i < totalChunks; i++) {
    chunkIndicesToFetch.push(i);
  }
  for (
    let i = Math.max(startCount, totalChunks - endCount);
    i < totalChunks;
    i++
  ) {
    if (!chunkIndicesToFetch.includes(i)) {
      chunkIndicesToFetch.push(i);
    }
  }

  const chunks: CloudContextChunk[] = [];
  for (const idx of chunkIndicesToFetch) {
    const fileName = getChunkFileName(userId, sessionId, idx);
    try {
      const buffer = await googleCloudStorageService.downloadFile(fileName);
      const parsed = JSON.parse(buffer.toString());
      chunks.push({
        ...parsed,
        timestamp: new Date(parsed.timestamp),
        messages: parsed.messages.map((m: Message & { timestamp: string }) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        })),
      });
    } catch (error) {
      console.warn(`⚠️ Failed to load chunk ${idx}:`, error);
    }
  }

  return chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
}

export async function getOrCreateMetadata(
  userId: string,
  sessionId: string
): Promise<CloudContextMetadata> {
  try {
    const fileName = getMetadataFileName(userId, sessionId);
    const buffer = await googleCloudStorageService.downloadFile(fileName);
    const parsed = JSON.parse(buffer.toString());
    return {
      ...parsed,
      lastUpdated: new Date(parsed.lastUpdated),
    };
  } catch {
    return {
      userId,
      sessionId,
      totalChunks: 0,
      totalMessages: 0,
      lastChunkIndex: -1,
      lastUpdated: new Date(),
      archivedChunks: [],
    };
  }
}

export async function saveMetadata(
  userId: string,
  sessionId: string,
  metadata: CloudContextMetadata
): Promise<void> {
  const fileName = getMetadataFileName(userId, sessionId);

  await googleCloudStorageService.uploadFile(
    JSON.stringify(
      {
        ...metadata,
        lastUpdated: metadata.lastUpdated.toISOString(),
      },
      null,
      2
    ),
    fileName,
    {
      metadata: { contentType: 'application/json' },
      public: false,
    }
  );
}

/**
 * Pobierz statystyki kontekstu
 */
export async function getContextStats(
  userId: string,
  sessionId: string
): Promise<{
  totalChunks: number;
  totalArchivedMessages: number;
  lastUpdated: Date | null;
}> {
  try {
    const metadata = await getOrCreateMetadata(userId, sessionId);
    return {
      totalChunks: metadata.totalChunks,
      totalArchivedMessages: metadata.totalMessages,
      lastUpdated: metadata.lastUpdated,
    };
  } catch {
    return {
      totalChunks: 0,
      totalArchivedMessages: 0,
      lastUpdated: null,
    };
  }
}

/**
 * Wyczyść wszystkie chunki dla sesji
 */
export async function clearSessionContext(
  userId: string,
  sessionId: string
): Promise<void> {
  await initialize();

  const prefix = `${GCS_PREFIX}/${userId}/${sessionId}/`;

  try {
    const files = await googleCloudStorageService.listFiles(prefix);

    for (const file of files) {
      await googleCloudStorageService.deleteFile(file.name);
    }

    console.log(`🗑️ Cleared context for session ${sessionId}`);
  } catch (error) {
    console.warn('⚠️ Error clearing session context:', error);
  }
}
