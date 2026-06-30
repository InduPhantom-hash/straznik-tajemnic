/**
 * Retrieval Service - multi-source hybrid RAG orchestrator
 * Etap 2c + 3c roadmapy v4.0
 *
 * Odpowiada za:
 * - Wyszukiwanie w Pinecone (multi-namespace: rules, adventures, sessions, npcs, world-state)
 * - BM25 keyword search dla dokładnych dopasowań terminów (etap 3c)
 * - Reciprocal Rank Fusion (RRF) do łączenia wyników semantic + keyword
 * - Fallback na lokalny MemoryIndex gdy Pinecone niedostępny
 * - Merge i deduplikacja wyników z wielu źródeł
 * - Formatowanie kontekstu RAG do wstrzyknięcia w prompt AI
 */

import { embeddingService, cosineSimilarity } from '../embedding-service';
import { PINECONE_NAMESPACES, type QueryResult } from './pinecone-client';
import { localVectorStore } from './local-vector-store';
import { bm25Index } from './bm25-index';

// ============================================================================
// TYPES
// ============================================================================

/** Pojedynczy wynik retrieval z informacją o źródle */
export interface RetrievalResult {
  id: string;
  score: number;
  source: 'pinecone' | 'bm25' | 'local' | 'hybrid';
  namespace: string;
  contentType: string;
  summary: string;
  gameTimestamp: string;
  tags: string[];
}

/** Konfiguracja zapytania retrieval */
export interface RetrievalQuery {
  /** Tekst zapytania gracza */
  query: string;
  /** ID aktywnej sesji (dla namespace sessions/{id}) */
  sessionId?: string;
  /** Które namespace'y przeszukiwać (domyślnie: wszystkie dostępne) */
  namespaces?: string[];
  /** Ile wyników na namespace (domyślnie: 3) */
  topKPerNamespace?: number;
  /** Maksymalna liczba wyników po merge (domyślnie: 8) */
  maxResults?: number;
  /** Minimalny score (domyślnie: 0.65) */
  minScore?: number;
  /**
   * Slug aktywnej książki źródłowej (sourceBookId przygody, np. 'cienie-tatr').
   * Gdy podany, wyniki z namespace 'adventures' są zawężane do fragmentów
   * otagowanych `source:<slug>` (reindex) - MG czyta tylko z książki wybranej
   * przygody, nie miesza scenariuszy z różnych antologii. Pozostałe namespace
   * (rules/mythos/npcs/sessions) bez filtra.
   */
  adventureSource?: string;
}

/** Wynik retrieval ze sformatowanym kontekstem */
export interface RetrievalResponse {
  /** Sformatowana sekcja do wstrzyknięcia w prompt */
  promptSection: string;
  /** Surowe wyniki (do debugowania / logowania) */
  results: RetrievalResult[];
  /** Źródło: pinecone, local, hybrid, albo mixed */
  source: 'pinecone' | 'local' | 'hybrid' | 'mixed' | 'none';
  /** Czas retrieval w ms */
  durationMs: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_TOP_K_PER_NAMESPACE = 3;
const DEFAULT_MAX_RESULTS = 8;

// IND-164: dual-version min_score
// V1 (768 dim) → 0.65 (recipe domyślna z README sekcja 2)
// V2 (3072 dim) → 0.70 (recipe B - patrz historia poniżej)
const DEFAULT_MIN_SCORE_V1 = 0.65;
// Historia threshold V2:
// - Sesja 124 (IND-164 init): recipe A=0.75 - 3072 dim daje wyższą precision
// - Sesja 141: obniżone do 0.70 bo naivny chunker (slice 2000) dał top scores 0.71-0.74
//   z page headers/OCR artefaktów. Recipe B=0.70 przywrócił recall.
// - Sesja 142: re-indeks z proper chunker (separator-aware z pdf-indexing-service.ts)
//   dał marginal +0.02 improvement. Smoke 5 hard CoC questions: tylko 1/5 (Sanity 0.79)
//   przekracza 0.75. Push Roll/Difficulty/Combat: 0.73-0.75. Credit Rating: 0.69.
//   Wniosek: threshold 0.75 byłby empirycznie zły (drop recall 4/5). Recipe B=0.70 zostaje
//   stałym targetem dla V2 dopóki nie zostanie poprawiony pipeline embeddingu
//   (preprocess noisy text albo upgrade do Gemini Embedding 002+).
const DEFAULT_MIN_SCORE_V2 = 0.7;

let _cachedMinScore: number | null = null;

/**
 * Zwraca domyślny min_score dla aktywnej wersji RAG_VERSION.
 * V1 → 0.65, V2 → 0.75. Cache module-level.
 */
function getDefaultMinScore(): number {
  if (_cachedMinScore !== null) return _cachedMinScore;
  const version = process.env.RAG_VERSION === 'v2' ? 'v2' : 'v1';
  _cachedMinScore =
    version === 'v2' ? DEFAULT_MIN_SCORE_V2 : DEFAULT_MIN_SCORE_V1;
  return _cachedMinScore;
}

/**
 * Reset module-level cache. Eksportowane DLA TESTÓW (beforeEach).
 */
export function _resetRetrievalMinScoreCache(): void {
  _cachedMinScore = null;
}

/**
 * Reciprocal Rank Fusion (RRF) constant.
 * k=60 to standardowa wartość z papieru "Reciprocal Rank Fusion outperforms
 * Condorcet and individual Rank Learning Methods" (Cormack et al., 2009).
 * Wyższe k = wyniki z obu źródeł ważone bardziej równomiernie.
 */
const RRF_K = 60;

/**
 * Waga semantic vs keyword w hybrid search.
 * 0.7 = 70% semantic + 30% keyword (semantic dominuje, keyword dopełnia).
 */
const SEMANTIC_WEIGHT = 0.7;
const KEYWORD_WEIGHT = 1 - SEMANTIC_WEIGHT;

/**
 * Namespace'y w których BM25 jest aktywny (dokumenty z twardymi słowami kluczowymi).
 * mythos: nazwy własne ("Nyarlathotep", "Necronomicon") to dokładne keyword matche -
 * BM25 mocno podbija ich trafność w hybrydzie RRF obok wyszukiwania semantycznego.
 */
const BM25_NAMESPACES: Set<string> = new Set([
  PINECONE_NAMESPACES.RULES,
  PINECONE_NAMESPACES.ADVENTURES,
  PINECONE_NAMESPACES.MYTHOS,
  // npcs: nazwiska postaci historycznych ("Piłsudski", "Ćwikliński") to
  // twarde keyword matche - BM25 podbija ich trafność obok semantycznego.
  PINECONE_NAMESPACES.NPCS,
]);

/** Mapowanie contentType → emoji + etykieta PL do promptu */
const CONTENT_TYPE_LABELS: Record<string, { emoji: string; label: string }> = {
  rule: { emoji: '📖', label: 'Zasada (CoC 7e)' },
  adventure: { emoji: '🗺️', label: 'Scenariusz przygody' },
  session: { emoji: '📜', label: 'Wspomnienie z sesji' },
  npc: { emoji: '👤', label: 'Profil NPC' },
  'world-state': { emoji: '🌍', label: 'Stan świata' },
  mythos: { emoji: '🐙', label: 'Lore Mitów (Fandom)' },
};

// ============================================================================
// RETRIEVAL SERVICE
// ============================================================================

class RetrievalService {
  /**
   * Główna metoda retrieval - hybrid search z wielu źródeł.
   *
   * Strategia (etap 3c):
   * 1. Pinecone semantic search (multi-namespace)
   * 2. BM25 keyword search (namespace rules + adventures)
   * 3. Reciprocal Rank Fusion (RRF) → merge semantic + keyword
   * 4. Fallback na lokalny MemoryIndex gdy Pinecone niedostępny
   * 5. Formatowanie kontekstu RAG
   */
  async retrieve(params: RetrievalQuery): Promise<RetrievalResponse> {
    const start = Date.now();
    const {
      query,
      sessionId,
      adventureSource,
      topKPerNamespace = DEFAULT_TOP_K_PER_NAMESPACE,
      maxResults = DEFAULT_MAX_RESULTS,
      minScore = getDefaultMinScore(),
    } = params;

    // Generuj embedding zapytania
    const queryEmbedding = await embeddingService.generateEmbedding(
      query,
      'RETRIEVAL_QUERY'
    );
    if (!queryEmbedding) {
      return {
        promptSection: '',
        results: [],
        source: 'none',
        durationMs: Date.now() - start,
      };
    }

    // Określ namespace'y do przeszukania
    const namespaces =
      params.namespaces || this.getDefaultNamespaces(sessionId);

    let results: RetrievalResult[] = [];
    let source: RetrievalResponse['source'] = 'none';

    // Strategia 1: semantic search (lokalny vector store; etykieta źródła 'pinecone'
    // do renamu w Fazie 5 - funkcjonalnie cosine po data/rag/{namespace}.json).
    let semanticResults: RetrievalResult[] = [];
    if (localVectorStore.initialized) {
      semanticResults = await this.searchPinecone(
        queryEmbedding,
        namespaces,
        topKPerNamespace,
        minScore
      );
    }

    // Strategia 2: BM25 keyword search (tylko dla rules + adventures)
    const bm25Namespaces = namespaces.filter((ns) => BM25_NAMESPACES.has(ns));
    let keywordResults: RetrievalResult[] = [];
    if (bm25Index.size > 0 && bm25Namespaces.length > 0) {
      keywordResults = this.searchBM25(
        query,
        bm25Namespaces,
        topKPerNamespace * 2
      );
    }

    // Strategia 3: Hybrid merge via RRF
    if (semanticResults.length > 0 && keywordResults.length > 0) {
      results = this.mergeWithRRF(semanticResults, keywordResults);
      source = 'hybrid';
      console.log(
        `🔀 Hybrid search: ${semanticResults.length} semantic + ${keywordResults.length} keyword → ${results.length} merged`
      );
    } else if (semanticResults.length > 0) {
      results = semanticResults;
      source = 'pinecone';
    } else if (keywordResults.length > 0) {
      results = keywordResults;
      source = 'pinecone'; // BM25 jest backup, ale nadal z Pinecone data
    }

    // Strategia 4: Fallback na lokalny indeks
    const localResults = await this.searchLocal(queryEmbedding, minScore);
    if (localResults.length > 0) {
      if (results.length === 0) {
        results = localResults;
        source = 'local';
      } else {
        // Merge: dodaj lokalne wyniki których nie ma w rezultatach
        const existingIds = new Set(results.map((r) => r.id));
        const uniqueLocal = localResults.filter((r) => !existingIds.has(r.id));
        if (uniqueLocal.length > 0) {
          results = [...results, ...uniqueLocal];
          source = source === 'none' ? 'local' : 'mixed';
        }
      }
    }

    // Zawężenie do aktywnej książki źródłowej (DriveThruRPG: tagowanie + filtr).
    // Fragmenty z namespace 'adventures' są tagowane `source:<slug>` przez reindex.
    // Gdy gracz wybrał konkretną przygodę, MG czyta tylko z jej książki - koniec
    // mieszania scenariuszy z różnych antologii. Przygody z podręcznika
    // (source 'ksiega-straznika') nie mają fragmentów w 'adventures' → filtr wycina
    // antologie, a treść scenariusza i tak płynie z namespace 'rules'.
    if (adventureSource) {
      results = results.filter(
        (r) =>
          r.namespace !== PINECONE_NAMESPACES.ADVENTURES ||
          this.extractSourceTag(r.tags) === adventureSource
      );
    }

    // Sort globalnie po score i ogranicz
    results = results.sort((a, b) => b.score - a.score).slice(0, maxResults);

    // Formatuj do promptu
    const promptSection = this.formatPromptSection(results);

    return {
      promptSection,
      results,
      source: results.length > 0 ? source : 'none',
      durationMs: Date.now() - start,
    };
  }

  // ==========================================================================
  // PRIVATE - PINECONE SEARCH
  // ==========================================================================

  private async searchPinecone(
    queryEmbedding: number[],
    namespaces: string[],
    topKPerNamespace: number,
    minScore: number
  ): Promise<RetrievalResult[]> {
    try {
      // Równoległe zapytanie do wielu namespace'ów
      const namespaceResults = await Promise.all(
        namespaces.map(async (ns) => {
          try {
            const results = await localVectorStore.query(
              ns,
              queryEmbedding,
              topKPerNamespace
            );
            return results.map((r) => this.pineconeToResult(r, ns));
          } catch (err) {
            console.warn(
              `⚠️ Pinecone query failed for namespace "${ns}":`,
              err
            );
            return [];
          }
        })
      );

      return namespaceResults.flat().filter((r) => r.score >= minScore);
    } catch (error) {
      console.error('❌ Pinecone multi-namespace search failed:', error);
      return [];
    }
  }

  private pineconeToResult(
    qr: QueryResult,
    namespace: string
  ): RetrievalResult {
    let tags: string[] = [];
    try {
      tags = JSON.parse(qr.metadata.tags || '[]');
    } catch {
      tags = [];
    }

    return {
      id: qr.id,
      score: qr.score,
      source: 'pinecone',
      namespace,
      contentType: qr.metadata.contentType || 'session',
      summary: qr.metadata.summary || '',
      gameTimestamp: qr.metadata.gameTimestamp || '',
      tags,
    };
  }

  // ==========================================================================
  // PRIVATE - BM25 KEYWORD SEARCH (etap 3c)
  // ==========================================================================

  /**
   * Wyszukiwanie BM25 (keyword) w indeksie lokalnym.
   * Zwraca wyniki z namespace'ów rules/adventures.
   */
  private searchBM25(
    query: string,
    namespaces: string[],
    topK: number
  ): RetrievalResult[] {
    const bm25Results = bm25Index.search(query, {
      namespaces,
      topK,
    });

    return bm25Results.map((r) => ({
      id: r.id,
      score: r.score,
      source: 'bm25' as const,
      namespace: r.namespace,
      contentType: r.contentType,
      summary: r.summary,
      gameTimestamp: '',
      tags: r.tags,
    }));
  }

  // ==========================================================================
  // PRIVATE - RECIPROCAL RANK FUSION (etap 3c)
  // ==========================================================================

  /**
   * Łączy wyniki semantic search i keyword search za pomocą
   * Reciprocal Rank Fusion (RRF).
   *
   * RRF score = Σ weight / (k + rank)
   *
   * Dokumenty znalezione przez OBA systemy dostają wyższy score.
   * Dokument z top-1 semantic + top-3 keyword = silniejszy niż
   * dokument z top-1 semantic + brak w keyword.
   */
  private mergeWithRRF(
    semanticResults: RetrievalResult[],
    keywordResults: RetrievalResult[]
  ): RetrievalResult[] {
    const rrfScores = new Map<string, number>();
    const resultMap = new Map<string, RetrievalResult>();

    // Score semantic results
    for (let rank = 0; rank < semanticResults.length; rank++) {
      const result = semanticResults[rank];
      const rrfScore = SEMANTIC_WEIGHT / (RRF_K + rank + 1);
      rrfScores.set(result.id, (rrfScores.get(result.id) || 0) + rrfScore);

      if (!resultMap.has(result.id)) {
        resultMap.set(result.id, { ...result, source: 'pinecone' });
      }
    }

    // Score keyword results
    for (let rank = 0; rank < keywordResults.length; rank++) {
      const result = keywordResults[rank];
      const rrfScore = KEYWORD_WEIGHT / (RRF_K + rank + 1);
      rrfScores.set(result.id, (rrfScores.get(result.id) || 0) + rrfScore);

      if (!resultMap.has(result.id)) {
        resultMap.set(result.id, { ...result, source: 'bm25' });
      } else {
        // Dokument znaleziony przez oba - oznacz jako hybrid
        const existing = resultMap.get(result.id)!;
        existing.source = 'hybrid';
      }
    }

    // Zamień RRF scores na znormalizowane wartości (0-1)
    const maxRRF = Math.max(...rrfScores.values(), 0.001);

    const merged: RetrievalResult[] = [];
    for (const [id, rrfScore] of rrfScores) {
      const result = resultMap.get(id);
      if (!result) continue;

      merged.push({
        ...result,
        score: rrfScore / maxRRF, // Normalizacja do 0-1
      });
    }

    return merged.sort((a, b) => b.score - a.score);
  }

  // ==========================================================================
  // PRIVATE - LOCAL MEMORY INDEX SEARCH
  // ==========================================================================

  private async searchLocal(
    queryEmbedding: number[],
    minScore: number
  ): Promise<RetrievalResult[]> {
    const memoryIndex = embeddingService.getMemoryIndex();
    if (!memoryIndex || memoryIndex.entries.length === 0) {
      return [];
    }

    return memoryIndex.entries
      .map((entry) => ({
        id: entry.chunkId,
        score: cosineSimilarity(queryEmbedding, entry.embedding),
        source: 'local' as const,
        namespace: 'local-memory',
        contentType: 'session',
        summary: entry.summary,
        gameTimestamp: entry.gameTimestamp,
        tags: entry.tags,
      }))
      .filter((r) => r.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  // ==========================================================================
  // PRIVATE - NAMESPACE MANAGEMENT
  // ==========================================================================

  /**
   * Zwraca domyślne namespace'y do przeszukania na podstawie kontekstu.
   * Zawsze szukaj w rules + adventures + npcs + world-state + mythos.
   * Dodaj session jeśli podano sessionId.
   */
  private getDefaultNamespaces(sessionId?: string): string[] {
    const ns: string[] = [
      PINECONE_NAMESPACES.RULES,
      PINECONE_NAMESPACES.ADVENTURES,
      PINECONE_NAMESPACES.NPCS,
      PINECONE_NAMESPACES.WORLD_STATE,
      PINECONE_NAMESPACES.MYTHOS,
    ];

    if (sessionId) {
      ns.push(PINECONE_NAMESPACES.session(sessionId));
    }

    return ns;
  }

  /**
   * Wyłuskuje slug książki źródłowej z tagów fragmentu (format `source:<slug>`).
   * Reindex zapisuje go w metadata.tags dla namespace 'adventures'. Zwraca null
   * gdy brak metki - taki fragment NIE przejdzie filtra adventureSource.
   */
  private extractSourceTag(tags: string[]): string | null {
    for (const t of tags) {
      if (t.startsWith('source:')) return t.slice('source:'.length);
    }
    return null;
  }

  // ==========================================================================
  // PRIVATE - PROMPT FORMATTING
  // ==========================================================================

  /**
   * Formatuje wyniki retrieval jako sekcję promptu AI.
   * Grupuje po typie treści dla lepszej czytelności.
   */
  private formatPromptSection(results: RetrievalResult[]): string {
    if (results.length === 0) return '';

    // Grupuj wyniki po contentType
    const grouped = new Map<string, RetrievalResult[]>();
    for (const result of results) {
      const key = result.contentType;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(result);
    }

    let section = '\n## KONTEKST RAG (automatycznie pobrany)\n';
    section +=
      'Poniższe informacje zostały pobrane z bazy wiedzy i mogą być istotne dla odpowiedzi:\n\n';

    // Kolejność wyświetlania: rules → adventure → npc → world-state → session
    const displayOrder = ['rule', 'adventure', 'npc', 'world-state', 'session'];

    for (const contentType of displayOrder) {
      const items = grouped.get(contentType);
      if (!items || items.length === 0) continue;

      const label = CONTENT_TYPE_LABELS[contentType] || {
        emoji: '📄',
        label: contentType,
      };
      section += `### ${label.emoji} ${label.label}\n`;

      for (const item of items) {
        const simPercent = Math.round(item.score * 100);
        section += `- **[${simPercent}%]** ${item.summary}`;
        if (item.gameTimestamp) {
          section += ` _(czas: ${item.gameTimestamp})_`;
        }
        section += '\n';
        // Pomijamy wewnętrzne metki (`source:<slug>` - służą tylko do filtra retrievalu).
        const visibleTags = item.tags.filter((t) => !t.startsWith('source:'));
        if (visibleTags.length > 0) {
          section += `  Tagi: ${visibleTags.join(', ')}\n`;
        }
      }
      section += '\n';
    }

    section += `**INSTRUKCJA:** Wykorzystaj powyższy kontekst jeśli jest relewantny. Nie cytuj go dosłownie - zintegruj naturalnie w narracji. Jeśli kontekst jest nieistotny dla bieżącej sceny, zignoruj go.\n`;

    return section;
  }
}

// Singleton
export const retrievalService = new RetrievalService();
