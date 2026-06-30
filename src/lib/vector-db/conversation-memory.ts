/**
 * Conversation Memory Service - etap 2d roadmapy v4.0
 *
 * Automatycznie zapisuje każdą turę rozmowy (wiadomość gracza + odpowiedź AI)
 * do Pinecone namespace `sessions/{id}`, aby MG nigdy nie zgubił fabuły.
 *
 * Cechy:
 * - Fire-and-forget: błędy są logowane, nigdy nie blokują odpowiedzi
 * - Ekstrakcja summary, tagów (NPC, lokacje, mechaniki) z odpowiedzi
 * - Embedding pary user+AI dla pełnego kontekstu semantycznego
 * - Integracja z istniejącym indexingService (Pinecone upsert)
 */

import * as Sentry from '@sentry/nextjs';
import { embeddingService } from '../embedding-service';
import { indexingService } from './indexing-service';
import { timeManager } from '../time-manager';
import { COC_LOCATIONS, COC_MECHANICS, COC_MYTHOS } from '../data/coc-glossary';

// ============================================================================
// TYPES
// ============================================================================

/** Parametry pojedynczej tury do zapisania */
export interface ConversationTurn {
  /** Wiadomość gracza */
  userMessage: string;
  /** Pełna odpowiedź AI (MG) */
  aiResponse: string;
  /** ID aktywnej sesji */
  sessionId: string;
  /** Czas w grze (opcjonalny, fallback na timeManager) */
  gameTimestamp?: string;
  /** Imię postaci gracza */
  characterName?: string;
}

/** Wynik zapisu tury */
export interface SaveResult {
  success: boolean;
  chunkId?: string;
  error?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Minimalna długość odpowiedzi AI warta zapisania */
const MIN_RESPONSE_LENGTH = 50;

/** Maksymalna liczba tagów na turę */
const MAX_TAGS = 10;

/** Długość summary (znaków) */
const SUMMARY_TARGET_LENGTH = 200;

/** IND-75: liczba prób (initial + retries) dla transient Pinecone/embedding errors */
export const RETRY_MAX_ATTEMPTS = 3;

/** IND-75: base delay między próbami (exp backoff: 500 → 1000 → 2000 ms) */
export const RETRY_BASE_DELAY_MS = 500;

// ============================================================================
// FAILURE TELEMETRY (IND-75)
// ============================================================================

/**
 * Wysyła Sentry breadcrumb dla nieudanego zapisu tury rozmowy.
 * Cichy fail jeśli Sentry nieuruchomiony - telemetria nie może blokować odpowiedzi.
 */
function reportSaveFailure(
  sessionId: string,
  error: string,
  reason: 'index_failed' | 'exception'
): void {
  try {
    Sentry.addBreadcrumb({
      category: 'conversation-memory',
      message: 'saveConversationTurn failed',
      level: 'warning',
      data: { sessionId, error, reason },
    });
  } catch {
    // Sentry nie zainicjalizowany - ignoruj
  }
}

/**
 * IND-75: DLQ (Dead Letter Queue) capture - wysyła `Sentry.captureException` po
 * wyczerpaniu retries. Pozwala śledzić finalnie utracone tury rozmowy w prod
 * (persistent error tracking, vs breadcrumb który ginie po sesji).
 *
 * Tag `type: 'dlq'` + `feature: 'conversation-memory'` umożliwia filtrowanie
 * w Sentry dashboard. Cichy fail jeśli Sentry nieuruchomiony.
 */
function captureDlq(
  sessionId: string,
  error: string,
  stage: 'embedding_generation' | 'pinecone_upsert' | 'exception',
  responseLength: number
): void {
  try {
    Sentry.captureException(new Error(`[DLQ] ${error}`), {
      tags: {
        feature: 'conversation-memory',
        type: 'dlq',
        stage,
      },
      contexts: {
        dlq: {
          sessionId,
          responseLength,
          stage,
        },
      },
    });
  } catch {
    // Sentry nieuruchomiony - ignoruj
  }
  console.error('🔴 ConversationMemory DLQ:', {
    sessionId,
    error,
    stage,
    responseLength,
  });
}

/**
 * IND-75: retry z exponential backoff dla transient errors.
 *
 * Sprawdza wynik przez `isSuccess` predicate. Gdy predicate=false LUB throw,
 * próbuje ponownie z rosnącym delayem (500 → 1000 → 2000 ms).
 *
 * Po wyczerpaniu prób rzuca ostatni błąd (jeśli był throw) lub zwraca ostatni
 * "failing" result (jeśli predicate stale=false).
 *
 * NIE używamy dla validation errors (deterministyczne) - tylko dla operacji
 * I/O (Pinecone upsert, Gemini embedding) gdzie warto powtórzyć.
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  isSuccess: (result: T) => boolean
): Promise<T> {
  let lastError: Error | undefined;
  let lastResult: T | undefined;
  let lastHadResult = false;

  for (let attempt = 1; attempt <= RETRY_MAX_ATTEMPTS; attempt++) {
    try {
      const result = await operation();
      if (isSuccess(result)) {
        return result;
      }
      lastResult = result;
      lastHadResult = true;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      lastHadResult = false;
    }

    if (attempt < RETRY_MAX_ATTEMPTS) {
      const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Wyczerpane retries
  if (lastHadResult) {
    return lastResult as T; // Predicate failed wszystkie próby - zwracamy ostatni
  }
  throw lastError ?? new Error('retryWithBackoff: no result and no error');
}

// ============================================================================
// CONVERSATION MEMORY SERVICE
// ============================================================================

class ConversationMemoryService {
  /**
   * Zapisuje turę rozmowy do Pinecone.
   * Fire-and-forget - błędy logowane, nigdy nie rzucane.
   */
  async saveConversationTurn(turn: ConversationTurn): Promise<SaveResult> {
    // Walidacja - deterministyczna, brak retry
    if (!turn.sessionId || !turn.aiResponse) {
      return { success: false, error: 'missing sessionId or aiResponse' };
    }

    if (turn.aiResponse.length < MIN_RESPONSE_LENGTH) {
      return { success: false, error: 'response too short to save' };
    }

    const responseLength = turn.aiResponse.length;

    try {
      // Łączymy user + AI dla pełnego kontekstu semantycznego
      const combinedText = `Gracz: ${turn.userMessage}\n\nMistrz Gry: ${turn.aiResponse}`;

      // Wyciąg metadanych
      const summary = this.extractSummary(turn.aiResponse);
      const tags = this.extractTags(
        turn.userMessage,
        turn.aiResponse,
        turn.characterName
      );
      const gameTimestamp = turn.gameTimestamp || timeManager.formatForPrompt();

      // Unikalny ID tury
      const chunkId = `conv-${turn.sessionId}-${Date.now()}`;

      // IND-75: Embedding generation z retry (transient Gemini API errors)
      const entry = await retryWithBackoff(
        () =>
          embeddingService.createIndexEntry(
            chunkId,
            combinedText,
            summary,
            gameTimestamp,
            tags,
            { start: -1, end: -1 }, // Pojedyncza tura, nie chunk
            'RETRIEVAL_DOCUMENT'
          ),
        (result) => result !== null
      );

      if (!entry) {
        const err = 'embedding generation failed after retries';
        reportSaveFailure(turn.sessionId, err, 'index_failed');
        captureDlq(turn.sessionId, err, 'embedding_generation', responseLength);
        return { success: false, error: err };
      }

      // IND-75: Pinecone upsert z retry (transient network/client errors)
      const indexed = await retryWithBackoff(
        () => indexingService.indexChunk(entry, turn.sessionId),
        (result) => result === true
      );

      if (indexed) {
        console.log(
          `💾 ConversationMemory: saved to sessions/${turn.sessionId} [${chunkId}]`
        );
        return { success: true, chunkId };
      }

      const indexErr =
        'indexChunk returned false after retries (Pinecone not initialized?)';
      reportSaveFailure(turn.sessionId, indexErr, 'index_failed');
      captureDlq(turn.sessionId, indexErr, 'pinecone_upsert', responseLength);
      return { success: false, error: indexErr };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn('⚠️ ConversationMemory: save failed (non-blocking):', msg);
      reportSaveFailure(turn.sessionId, msg, 'exception');
      captureDlq(turn.sessionId, msg, 'exception', responseLength);
      return { success: false, error: msg };
    }
  }

  // ==========================================================================
  // PRIVATE - SUMMARY EXTRACTION
  // ==========================================================================

  /**
   * Wyciąga zwięzłe streszczenie z odpowiedzi AI.
   * Usuwa formatowanie Markdown, bierze pierwsze zdania.
   */
  private extractSummary(aiResponse: string): string {
    const text = aiResponse
      .replace(/#{1,6}\s/g, '') // nagłówki
      .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
      .replace(/\*([^*]+)\*/g, '$1') // italic
      .replace(/`([^`]+)`/g, '$1') // inline code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // linki
      .replace(/\[TIME_UPDATE:.*?\]/g, '') // tagi systemowe
      .replace(/\[ILLUSTRATION:.*?\]/g, '')
      .replace(/\n{2,}/g, ' ')
      .replace(/\n/g, ' ')
      .trim();

    if (text.length <= SUMMARY_TARGET_LENGTH) return text;

    // Obetnij na granicy zdania
    const cutoff = text.lastIndexOf('.', SUMMARY_TARGET_LENGTH);
    if (cutoff > 80) {
      return text.substring(0, cutoff + 1);
    }
    return text.substring(0, SUMMARY_TARGET_LENGTH) + '…';
  }

  // ==========================================================================
  // PRIVATE - TAG EXTRACTION
  // ==========================================================================

  /**
   * Wyciąga tagi z tury rozmowy.
   * Rozpoznaje: postacie (PC/NPC), lokacje, mechaniki, elementy Mythosu.
   */
  private extractTags(
    userMessage: string,
    aiResponse: string,
    characterName?: string
  ): string[] {
    const tags: string[] = [];
    const combined = `${userMessage} ${aiResponse}`;

    // Tag postaci gracza
    if (characterName) {
      tags.push(`PC:${characterName}`);
    }

    // Detekcja NPC - wzorce mowy
    const npcSpeechPatterns = [
      /(?:powiedział|mówi|odpowiada|szepcze|krzyczy|warczy|mamrocze|stwierdza|dodaje)\s+([A-ZŁŚŻŹĆŃÓ][a-złśżźćńóę]+(?:\s[A-ZŁŚŻŹĆŃÓ][a-złśżźćńóę]+)?)/g,
      /(?:Dr|Prof|Pan|Pani|Mr|Mrs|Sir|Inspector|Inspektor)\.?\s+([A-ZŁŚŻŹĆŃÓ][a-złśżźćńóę]+)/g,
    ];

    const seenNpcs = new Set<string>();
    for (const pattern of npcSpeechPatterns) {
      let match;
      while ((match = pattern.exec(combined)) !== null) {
        const name = match[1].trim();
        if (name.length > 2 && !seenNpcs.has(name)) {
          seenNpcs.add(name);
          tags.push(`NPC:${name}`);
        }
      }
    }

    // IND-79 (C5): glossary z `lib/data/coc-glossary` (1 source of truth, edit bez touchowania core logic)
    for (const loc of COC_LOCATIONS) {
      if (combined.includes(loc) && !tags.includes(`LOC:${loc}`)) {
        tags.push(`LOC:${loc}`);
      }
    }

    for (const { pattern, tag } of COC_MECHANICS) {
      if (pattern.test(combined) && !tags.includes(tag)) {
        tags.push(tag);
      }
    }

    for (const { pattern, tag } of COC_MYTHOS) {
      if (pattern.test(combined) && !tags.includes(tag)) {
        tags.push(tag);
      }
    }

    return tags.slice(0, MAX_TAGS);
  }
}

// Singleton
export const conversationMemory = new ConversationMemoryService();
