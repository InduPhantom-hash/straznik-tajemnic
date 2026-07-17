/**
 * Context constants — single source of truth (OPT-06)
 *
 * Eliminuje niespójność między context-optimizer.ts (300)
 * i cloud-context-service.ts (200).
 */

/** Kiedy zacząć archiwizować wiadomości do GCS */
export const ARCHIVE_THRESHOLD = 200;

/** Max wiadomości wysyłanych inline do modelu.
 *  200 wiadomości × ~50 tok = ~10K tokenów historii.
 *  Starsze wiadomości trafiają do RAG przez embeddingi. */
export const MAX_INLINE_MESSAGES = 200;

/** Wiadomości na chunk przy archiwizacji do GCS */
export const CHUNK_SIZE = 50;
