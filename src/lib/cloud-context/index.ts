/**
 * Cloud Context — orkiestrator
 *
 * Re-eksport publicznego API jako singleton `cloudContextService` (backward compat
 * z `cloud-context-service.ts`). Sub-moduły:
 * - `chunking.ts` — pure helpers (no GCS)
 * - `memory-index.ts` — RAG memory index w GCS
 * - `gcs-io.ts` — GCS upload/download + state
 *
 * Sesja 93 (IND-175): refactor 835 lin → 4 sub-moduły z modular module-level functions.
 */

import {
  initialize,
  uploadHistoryChunk,
  downloadAllChunks,
  downloadRelevantChunks,
  getOrCreateMetadata,
  saveMetadata,
  getContextStats,
  clearSessionContext,
} from './gcs-io';
import { archiveOldMessages } from './archive';
import {
  shouldArchive,
  chunkMessages,
  buildContextFromChunks,
} from './chunking';
import { saveMemoryIndex, loadMemoryIndex } from './memory-index';

// Re-export types
export type { Message, CloudContextChunk, CloudContextMetadata } from './types';

// Re-export pure helpers (dla bezpośredniego użycia w testach)
export {
  shouldArchive,
  chunkMessages,
  buildContextFromChunks,
} from './chunking';
export { saveMemoryIndex, loadMemoryIndex } from './memory-index';
export { archiveOldMessages } from './archive';
export {
  initialize,
  uploadHistoryChunk,
  downloadAllChunks,
  downloadRelevantChunks,
  getOrCreateMetadata,
  saveMetadata,
  getContextStats,
  clearSessionContext,
} from './gcs-io';

/**
 * Singleton — backward compat API z poprzedniej klasy `CloudContextService`.
 * Wszystkie metody to module-level functions; obiekt utrzymany dla 2 callerów
 * (`src/app/api/context/chunk/route.ts`, `src/lib/auto-summary-service.ts`).
 */
export const cloudContextService = {
  initialize,
  shouldArchive,
  chunkMessages,
  uploadHistoryChunk,
  downloadAllChunks,
  downloadRelevantChunks,
  archiveOldMessages,
  buildContextFromChunks,
  getOrCreateMetadata,
  saveMetadata,
  getContextStats,
  clearSessionContext,
  saveMemoryIndex,
  loadMemoryIndex,
};
