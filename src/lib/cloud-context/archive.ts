/**
 * Cloud Context — Archive flow
 *
 * Archiwizuje stare wiadomości do GCS w chunkach.
 * Łączy chunking + GCS upload + batch embeddings (OPT-14) + metadata update.
 *
 * Wyciągnięte z `cloud-context-service.ts` w IND-175 (sesja 93) jako osobny moduł
 * by `gcs-io.ts` nie przekraczał guardrail <200 lin.
 */

import { embeddingService } from '../embedding-service';
import { timeManager } from '../time-manager';
import { MemoryIndexEntry } from '../types';
import {
  CHUNK_SIZE,
  ARCHIVE_THRESHOLD,
  MAX_INLINE_MESSAGES,
} from '../constants/context';
import type { Message, CloudContextChunk } from './types';
import {
  chunkMessages,
  createQuickSummary,
  extractKeyFacts,
  extractMentionedNPCs,
  extractMentionedLocations,
} from './chunking';
import { saveMemoryIndex } from './memory-index';
import {
  initialize,
  uploadHistoryChunk,
  getOrCreateMetadata,
  saveMetadata,
} from './gcs-io';

/**
 * Archiwizuj stare wiadomości do GCS.
 * Zachowaj ostatnie MAX_INLINE_MESSAGES w localStorage.
 */
export async function archiveOldMessages(
  messages: Message[],
  userId: string,
  sessionId: string
): Promise<{ archivedCount: number; remainingMessages: Message[] }> {
  if (messages.length < ARCHIVE_THRESHOLD) {
    return { archivedCount: 0, remainingMessages: messages };
  }

  await initialize();

  const messagesToArchive = messages.slice(
    0,
    messages.length - MAX_INLINE_MESSAGES
  );
  const remainingMessages = messages.slice(-MAX_INLINE_MESSAGES);

  const chunks = chunkMessages(messagesToArchive);

  const metadata = await getOrCreateMetadata(userId, sessionId);

  const preparedChunks: CloudContextChunk[] = chunks.map((chunkMsgs, i) => {
    const chunkIndex = metadata.lastChunkIndex + 1 + i;
    return {
      id: `chunk_${sessionId}_${chunkIndex}`,
      userId,
      sessionId,
      chunkIndex,
      messages: chunkMsgs,
      summary: undefined,
      keyFacts: extractKeyFacts(chunkMsgs),
      mentionedNPCs: extractMentionedNPCs(chunkMsgs),
      mentionedLocations: extractMentionedLocations(chunkMsgs),
      timestamp: new Date(),
      messageRange: {
        start: metadata.totalMessages + i * CHUNK_SIZE,
        end: metadata.totalMessages + (i + 1) * CHUNK_SIZE - 1,
      },
      isArchived: true,
    };
  });

  for (const chunk of preparedChunks) {
    await uploadHistoryChunk(chunk);
  }

  // OPT-14: Batch embedding generation — 1 API call zamiast N
  const apiKey = (embeddingService as unknown as { apiKey?: string }).apiKey;
  if (apiKey) {
    try {
      embeddingService.initialize(apiKey);
      const chunkTexts = preparedChunks.map((c) =>
        c.messages.map((m) => m.content).join('\n')
      );
      const embeddings = await embeddingService.generateBatchEmbeddings(
        chunkTexts,
        'RETRIEVAL_DOCUMENT'
      );

      for (let i = 0; i < preparedChunks.length; i++) {
        const embedding = embeddings[i];
        if (!embedding) continue;

        const chunk = preparedChunks[i];
        const summary = chunk.summary || createQuickSummary(chunk);
        const tags: string[] = [
          ...chunk.mentionedNPCs.map((n) => `NPC:${n}`),
          ...chunk.mentionedLocations.map((l) => `LOC:${l}`),
          ...chunk.keyFacts
            .map((f) => (f.category ? `CAT:${f.category}` : ''))
            .filter(Boolean),
        ];

        const entry: MemoryIndexEntry = {
          chunkId: chunk.id,
          embedding,
          summary,
          gameTimestamp: timeManager.formatDateTime(),
          realTimestamp: new Date().toISOString(),
          tags,
          messageRange: chunk.messageRange,
        };
        embeddingService.addToIndex(entry);
      }

      await saveMemoryIndex(userId, sessionId);
      console.log(
        `🧠 Batch embeddings generated for ${preparedChunks.length} chunks`
      );
    } catch (embErr) {
      console.warn('⚠️ Batch embedding failed:', embErr);
    }
  }

  metadata.totalChunks += chunks.length;
  metadata.lastChunkIndex += chunks.length;
  metadata.totalMessages += messagesToArchive.length;
  metadata.archivedChunks.push(
    ...Array.from(
      { length: chunks.length },
      (_, i) => metadata.lastChunkIndex - chunks.length + 1 + i
    )
  );
  metadata.lastUpdated = new Date();

  await saveMetadata(userId, sessionId, metadata);

  console.log(
    `☁️ Archived ${messagesToArchive.length} messages in ${chunks.length} chunks`
  );

  return {
    archivedCount: messagesToArchive.length,
    remainingMessages,
  };
}
