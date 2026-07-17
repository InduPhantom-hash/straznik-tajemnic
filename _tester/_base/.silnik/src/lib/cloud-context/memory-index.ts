/**
 * Cloud Context — Memory Index (RAG)
 *
 * Zapisuje/odczytuje indeks pamięci sesji (embeddingi) z GCS.
 * Sync do Pinecone przy load.
 */

import { googleCloudStorageService } from '../google-cloud-storage-service-fixed';
import { embeddingService } from '../embedding-service';
import { indexingService } from '../vector-db/indexing-service';
import { MemoryIndex } from '../types';
import { GCS_PREFIX, MEMORY_INDEX_FILE } from './types';

export function getMemoryIndexFileName(
  userId: string,
  sessionId: string
): string {
  return `${GCS_PREFIX}/${userId}/${sessionId}/${MEMORY_INDEX_FILE}`;
}

/**
 * Zapisz indeks pamięci do GCS
 */
export async function saveMemoryIndex(
  userId: string,
  sessionId: string
): Promise<void> {
  const index = embeddingService.exportIndex();
  if (!index) {
    console.warn('⚠️ No memory index to save');
    return;
  }

  const fileName = getMemoryIndexFileName(userId, sessionId);

  try {
    await googleCloudStorageService.uploadFile(
      JSON.stringify(index, null, 2),
      fileName,
      {
        metadata: { contentType: 'application/json' },
        public: false,
      }
    );
    console.log(`🧠 Memory index saved for session ${sessionId}`);
  } catch (error) {
    console.error('❌ Failed to save memory index:', error);
  }
}

/**
 * Załaduj indeks pamięci z GCS
 */
export async function loadMemoryIndex(
  userId: string,
  sessionId: string
): Promise<MemoryIndex | null> {
  const fileName = getMemoryIndexFileName(userId, sessionId);

  try {
    const content = await googleCloudStorageService.downloadFile(fileName);
    if (content) {
      const contentStr =
        typeof content === 'string' ? content : content.toString('utf-8');
      const index = JSON.parse(contentStr) as MemoryIndex;
      embeddingService.setMemoryIndex(index);

      indexingService.indexMemoryIndex(index, sessionId).catch((err) => {
        console.warn('⚠️ Pinecone sync on load failed:', err);
      });

      console.log(`🧠 Memory index loaded: ${index.entries.length} entries`);
      return index;
    }
  } catch {
    console.log(`ℹ️ No existing memory index for session ${sessionId}`);
  }

  return null;
}
