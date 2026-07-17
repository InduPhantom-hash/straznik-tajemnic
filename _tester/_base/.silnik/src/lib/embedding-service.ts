/**
 * Embedding Service
 *
 * Obsługa embeddingów dla systemu pamięci RAG.
 * Używa Google Gemini Embedding API do generowania wektorów
 * i wyszukiwania semantycznego w archiwalnych chunkach.
 *
 * v4.0: Upgrade do gemini-embedding-001 (#1 MTEB Multilingual).
 * IND-164 (sesja 78): Dual-version support - V1 (default) = 768 dim (MRL truncated),
 * V2 (opt-in via RAG_VERSION=v2) = 3072 dim (native). Helper getEmbeddingDimensions().
 */

import { MemoryIndexEntry, MemoryIndex } from './types';
import { getGeminiClient } from './gemini-client-pool';
// IND-275 T1: model embeddingu + wymiary scentralizowane w model-registry.
import {
  EMBEDDING_MODEL,
  EMBEDDING_DIM_V1,
  EMBEDDING_DIM_V2,
} from './model-registry';

// ============================================================================
// CONSTANTS
// ============================================================================

const SIMILARITY_THRESHOLD = 0.7; // Minimum similarity to consider relevant
const MAX_RESULTS = 5;

// ============================================================================
// RAG_VERSION DUAL-VERSION SUPPORT (IND-164)
// ============================================================================

const RAG_VERSION_V1_DIM = EMBEDDING_DIM_V1;
const RAG_VERSION_V2_DIM = EMBEDDING_DIM_V2;

let _cachedDimensions: number | null = null;

/**
 * Zwraca rozmiar embeddingu dla aktywnej wersji RAG.
 * V1 (default, backward compat) = 768 dim (MRL truncated z outputDimensionality).
 * V2 (opt-in via RAG_VERSION=v2) = 3072 dim (native Gemini bez outputDimensionality).
 *
 * Cache module-level - read env once per Next.js serverless instance.
 */
export function getEmbeddingDimensions(): number {
  if (_cachedDimensions !== null) return _cachedDimensions;
  const version = process.env.RAG_VERSION === 'v2' ? 'v2' : 'v1';
  _cachedDimensions =
    version === 'v2' ? RAG_VERSION_V2_DIM : RAG_VERSION_V1_DIM;
  return _cachedDimensions;
}

/**
 * Reset module-level cache. Eksportowane DLA TESTÓW (beforeEach).
 * NIE używać w runtime kodzie - wartość embedding dim jest stała per process.
 */
export function _resetEmbeddingDimsCache(): void {
  _cachedDimensions = null;
}

/**
 * Typ zadania dla embeddingu - pomaga modelowi tworzyć optymalne wektory:
 * - RETRIEVAL_DOCUMENT: archiwizowany dokument (do indeksowania w bazie wektorowej)
 * - RETRIEVAL_QUERY:    zapytanie wyszukiwawcze (do wykrycia podobnych dokumentów)
 * - SEMANTIC_SIMILARITY/CLASSIFICATION/CLUSTERING: pozostałe domeny
 * Brak parametru = domyślne SDK (kompatybilne wstecz z istniejącymi wektorami).
 */
export type EmbeddingTaskType =
  | 'RETRIEVAL_DOCUMENT'
  | 'RETRIEVAL_QUERY'
  | 'SEMANTIC_SIMILARITY'
  | 'CLASSIFICATION'
  | 'CLUSTERING';

// ============================================================================
// COSINE SIMILARITY
// ============================================================================

/**
 * Oblicz podobieństwo kosinusowe między dwoma wektorami.
 * Wartość 1.0 = identyczne, 0.0 = ortogonalne, -1.0 = przeciwne.
 *
 * `ArrayLike<number>` (nie `number[]`) - akceptuje też `Float32Array` z binarnego
 * formatu RAG (IND-263). Indeksowanie + `.length` działa identycznie na obu.
 */
export function cosineSimilarity(
  a: ArrayLike<number>,
  b: ArrayLike<number>
): number {
  if (a.length !== b.length) {
    console.error('Vector length mismatch:', a.length, 'vs', b.length);
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}

// ============================================================================
// EMBEDDING SERVICE
// ============================================================================

class EmbeddingService {
  private apiKey: string | null = null;
  private memoryIndex: MemoryIndex | null = null;

  /**
   * Inicjalizacja z kluczem API.
   * Klient jest pobierany leniwie z `gemini-client-pool` przy pierwszym wywołaniu -
   * pool sam cache'uje instancje per klucz, więc tutaj wystarczy zapamiętać klucz.
   */
  initialize(apiKey: string): void {
    if (!apiKey) {
      console.warn('⚠️ EmbeddingService: No API key provided');
      return;
    }
    if (this.apiKey === apiKey) {
      return; // Already initialized with this key
    }
    this.apiKey = apiKey;
    console.log('🧠 EmbeddingService initialized');
  }

  /**
   * Załaduj indeks pamięci z GCS (lub z cache).
   */
  setMemoryIndex(index: MemoryIndex): void {
    this.memoryIndex = index;
    console.log(`🧠 Memory index loaded: ${index.entries.length} entries`);
  }

  /**
   * Pobierz aktualny indeks pamięci.
   */
  getMemoryIndex(): MemoryIndex | null {
    return this.memoryIndex;
  }

  /**
   * Generuj embedding dla tekstu.
   * Zwraca wektor o wymiarach EMBEDDING_DIMENSIONS (MRL via outputDimensionality).
   *
   * @param text Tekst do zembedowania
   * @param taskType Opcjonalny typ zadania (RETRIEVAL_DOCUMENT/RETRIEVAL_QUERY/...).
   *                 Brak = domyślne SDK (kompatybilne wstecz).
   */
  async generateEmbedding(
    text: string,
    taskType?: EmbeddingTaskType
  ): Promise<number[] | null> {
    const ai = getGeminiClient(this.apiKey);
    if (!ai) {
      console.error('❌ EmbeddingService not initialized');
      return null;
    }

    try {
      // IND-164: V1 używa MRL truncation (outputDimensionality: 768),
      // V2 drop param → Gemini zwraca native 3072 dim
      const dims = getEmbeddingDimensions();
      const result = await ai.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: text,
        config: {
          ...(dims === RAG_VERSION_V1_DIM && { outputDimensionality: dims }),
          ...(taskType && { taskType }),
        },
      });

      const embedding = result.embeddings?.[0]?.values ?? null;

      if (!embedding || embedding.length !== dims) {
        console.warn(
          '⚠️ Unexpected embedding dimensions:',
          embedding?.length,
          `(expected ${dims})`
        );
        return null;
      }

      return embedding;
    } catch (error) {
      console.error('❌ Error generating embedding:', error);
      return null;
    }
  }

  /**
   * OPT-14: Batch embedding generation.
   * Generuje embeddingi dla wielu tekstów w jednym API call.
   * 1 call zamiast N sekwencyjnych → 80% redukcja latencji archiwizacji.
   *
   * @param texts Lista tekstów do zembedowania
   * @param taskType Opcjonalny typ zadania, propagowany do każdego embeddingu
   */
  async generateBatchEmbeddings(
    texts: string[],
    taskType?: EmbeddingTaskType
  ): Promise<(number[] | null)[]> {
    const ai = getGeminiClient(this.apiKey);
    if (!ai) {
      console.error('❌ EmbeddingService not initialized');
      return texts.map(() => null);
    }

    if (texts.length === 0) return [];

    try {
      const dims = getEmbeddingDimensions();
      const result = await ai.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: texts,
        config: {
          ...(dims === RAG_VERSION_V1_DIM && { outputDimensionality: dims }),
          ...(taskType && { taskType }),
        },
      });

      return (result.embeddings ?? []).map((emb, i) => {
        if (!emb.values || emb.values.length !== dims) {
          console.warn(
            `⚠️ Unexpected embedding dimensions for batch item ${i}:`,
            emb.values?.length
          );
          return null;
        }
        return emb.values;
      });
    } catch (error) {
      console.error(
        '❌ Error generating batch embeddings, falling back to sequential:',
        error
      );
      // Fallback: sekwencyjne generowanie
      const results: (number[] | null)[] = [];
      for (const text of texts) {
        results.push(await this.generateEmbedding(text, taskType));
      }
      return results;
    }
  }

  /**
   * Wyszukaj najbardziej podobne chunki do zapytania.
   * Zwraca listę wpisów posortowaną od najwyższego podobieństwa.
   */
  async searchSimilarChunks(
    query: string,
    maxResults: number = MAX_RESULTS
  ): Promise<Array<MemoryIndexEntry & { similarity: number }>> {
    if (!this.memoryIndex || this.memoryIndex.entries.length === 0) {
      console.log('⚠️ No memory index available for search');
      return [];
    }

    const queryEmbedding = await this.generateEmbedding(
      query,
      'RETRIEVAL_QUERY'
    );
    if (!queryEmbedding) {
      return [];
    }

    // Oblicz podobieństwo dla każdego wpisu
    const results = this.memoryIndex.entries
      .map((entry) => ({
        ...entry,
        similarity: cosineSimilarity(queryEmbedding, entry.embedding),
      }))
      .filter((entry) => entry.similarity >= SIMILARITY_THRESHOLD)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxResults);

    console.log(
      `🔍 Found ${results.length} similar chunks for query: "${query.slice(0, 50)}..."`
    );
    return results;
  }

  /**
   * Buduj sekcję "WSPOMNIENIA" do wstrzyknięcia w prompt AI.
   */
  async buildMemoryPromptSection(query: string): Promise<string> {
    const relevantChunks = await this.searchSimilarChunks(query);

    if (relevantChunks.length === 0) {
      return '';
    }

    let section = '\n## WSPOMNIENIA (z archiwum sesji)\n';
    section +=
      'Poniższe fragmenty dotyczą wcześniejszych wydarzeń, które mogą być istotne:\n\n';

    for (const chunk of relevantChunks) {
      const simPercent = Math.round(chunk.similarity * 100);
      section += `### Wspomnienie (podobieństwo: ${simPercent}%)\n`;
      section += `*Czas w grze: ${chunk.gameTimestamp}*\n`;
      section += `${chunk.summary}\n`;
      if (chunk.tags.length > 0) {
        section += `Tagi: ${chunk.tags.join(', ')}\n`;
      }
      section += '\n';
    }

    return section;
  }

  /**
   * Stwórz nowy wpis do indeksu pamięci.
   * Używane przy archiwizacji nowego chunka.
   */
  async createIndexEntry(
    chunkId: string,
    chunkText: string,
    summary: string,
    gameTimestamp: string,
    tags: string[],
    messageRange: { start: number; end: number },
    taskType?: EmbeddingTaskType
  ): Promise<MemoryIndexEntry | null> {
    const embedding = await this.generateEmbedding(chunkText, taskType);
    if (!embedding) {
      return null;
    }

    const entry: MemoryIndexEntry = {
      chunkId,
      embedding,
      summary,
      gameTimestamp,
      realTimestamp: new Date().toISOString(),
      tags,
      messageRange,
    };

    return entry;
  }

  /**
   * Dodaj wpis do lokalnego indeksu pamięci.
   */
  addToIndex(entry: MemoryIndexEntry): void {
    if (!this.memoryIndex) {
      this.memoryIndex = {
        version: '1.0.0',
        sessionId: 'default',
        entries: [],
        lastUpdated: new Date().toISOString(),
      };
    }

    this.memoryIndex.entries.push(entry);
    this.memoryIndex.lastUpdated = new Date().toISOString();
    console.log(`🧠 Added entry to memory index: ${entry.chunkId}`);
  }

  /**
   * Wyeksportuj indeks pamięci (do zapisania w GCS).
   */
  exportIndex(): MemoryIndex | null {
    return this.memoryIndex;
  }
}

// Singleton export
export const embeddingService = new EmbeddingService();
