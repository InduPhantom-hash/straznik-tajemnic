/**
 * Pinecone Client - wrapper nad @pinecone-database/pinecone SDK
 * Etap 2a roadmapy v4.0
 *
 * Jeden indeks z namespace'ami:
 *   - "rules"            → Zasady Call of Cthulhu 7e
 *   - "adventures"       → Scenariusze przygód
 *   - "sessions/{id}"    → Historia rozmów per sesja
 *   - "npcs"             → Profile NPC
 *   - "world-state"      → Stan świata gry
 */

import {
  Pinecone,
  type Index,
  type RecordMetadata,
} from '@pinecone-database/pinecone';

// ============================================================================
// TYPES
// ============================================================================

export interface VectorMetadata extends RecordMetadata {
  /** Typ treści: rule, adventure, session, npc, world-state */
  contentType: string;
  /** Krótkie podsumowanie chunka */
  summary: string;
  /** Czas w grze (np. "14 Stycznia 1925, 22:45"), pusty jeśli brak */
  gameTimestamp: string;
  /** ISO timestamp zapisu */
  realTimestamp: string;
  /** Tagi semantyczne (np. NPC:Jackson, LOC:London), JSON array jako string */
  tags: string;
  /** ID sesji gry, pusty jeśli nie dotyczy */
  sessionId: string;
  /** Zakres wiadomości (JSON: {start, end}), pusty jeśli nie dotyczy */
  messageRange: string;
}

export interface UpsertVector {
  id: string;
  values: number[];
  metadata: VectorMetadata;
  /** Pełny tekst chunka - lokalny store trzyma go dla rebuildu BM25 (Pinecone ignoruje). */
  text?: string;
}

export interface QueryResult {
  id: string;
  score: number;
  metadata: VectorMetadata;
}

export interface PineconeClientConfig {
  apiKey: string;
  indexHost: string;
}

// ============================================================================
// NAMESPACES
// ============================================================================

export const PINECONE_NAMESPACES = {
  RULES: 'rules',
  ADVENTURES: 'adventures',
  NPCS: 'npcs',
  WORLD_STATE: 'world-state',
  /** Lore Mitów Cthulhu (kanon z Fandom: bóstwa, potwory, lokacje, artefakty) */
  MYTHOS: 'mythos',
  session: (id: string) => `sessions/${id}`,
} as const;

// ============================================================================
// CLIENT
// ============================================================================

class PineconeClient {
  private client: Pinecone | null = null;
  private index: Index<VectorMetadata> | null = null;
  private _initialized = false;

  get initialized(): boolean {
    return this._initialized;
  }

  /**
   * Inicjalizacja klienta. Wymaga apiKey i indexHost (endpoint indeksu).
   * indexHost to URL z dashboardu Pinecone, np. "https://zew-app-abc123.svc.aped-1234.pinecone.io"
   */
  initialize(config: PineconeClientConfig): void {
    if (!config.apiKey || !config.indexHost) {
      console.warn('⚠️ PineconeClient: Missing apiKey or indexHost');
      return;
    }

    this.client = new Pinecone({ apiKey: config.apiKey });
    this.index = this.client.index<VectorMetadata>({ host: config.indexHost });
    this._initialized = true;
    console.log('🌲 PineconeClient initialized');
  }

  /**
   * Upsert wektorów do namespace'u.
   * Batch-friendly: przyjmuje tablicę wektorów.
   */
  async upsert(namespace: string, vectors: UpsertVector[]): Promise<void> {
    if (!this.index) throw new Error('PineconeClient not initialized');
    if (vectors.length === 0) return;

    const ns = this.index.namespace(namespace);

    // Pinecone zaleca batch <= 100 wektorów
    const BATCH_SIZE = 100;
    for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
      const batch = vectors.slice(i, i + BATCH_SIZE);
      await ns.upsert({
        records: batch.map((v) => ({
          id: v.id,
          values: v.values,
          metadata: v.metadata,
        })),
      });
    }

    console.log(
      `🌲 Upserted ${vectors.length} vectors to namespace "${namespace}"`
    );
  }

  /**
   * Wyszukiwanie semantyczne w namespace'ie.
   * Zwraca topK wyników posortowanych od najwyższego score.
   */
  async query(
    namespace: string,
    vector: number[],
    topK: number = 5,
    filter?: Record<string, unknown>
  ): Promise<QueryResult[]> {
    if (!this.index) throw new Error('PineconeClient not initialized');

    const ns = this.index.namespace(namespace);
    const response = await ns.query({
      vector,
      topK,
      includeMetadata: true,
      filter,
    });

    return (response.matches || [])
      .filter((m) => m.metadata)
      .map((m) => ({
        id: m.id,
        score: m.score ?? 0,
        metadata: m.metadata as VectorMetadata,
      }));
  }

  /**
   * Wyszukiwanie równoległe w wielu namespace'ach.
   * Zwraca wyniki z każdego namespace'u, posortowane globalnie.
   */
  async queryMultiNamespace(
    namespaces: string[],
    vector: number[],
    topK: number = 5
  ): Promise<QueryResult[]> {
    const results = await Promise.all(
      namespaces.map((ns) => this.query(ns, vector, topK))
    );

    return results
      .flat()
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /**
   * Usunięcie wektorów po ID z namespace'u.
   */
  async deleteByIds(namespace: string, ids: string[]): Promise<void> {
    if (!this.index) throw new Error('PineconeClient not initialized');
    if (ids.length === 0) return;

    const ns = this.index.namespace(namespace);
    await ns.deleteMany(ids);
  }

  /**
   * Usunięcie wszystkich wektorów w namespace'ie.
   */
  async deleteNamespace(namespace: string): Promise<void> {
    if (!this.index) throw new Error('PineconeClient not initialized');

    const ns = this.index.namespace(namespace);
    await ns.deleteAll();
    console.log(`🌲 Deleted all vectors from namespace "${namespace}"`);
  }

  /**
   * Statystyki indeksu (liczba wektorów per namespace).
   */
  async getStats(): Promise<{
    totalRecordCount: number;
    namespaces: Record<string, { recordCount: number }>;
  }> {
    if (!this.index) throw new Error('PineconeClient not initialized');

    const stats = await this.index.describeIndexStats();
    return {
      totalRecordCount: stats.totalRecordCount ?? 0,
      namespaces: (stats.namespaces ?? {}) as Record<
        string,
        { recordCount: number }
      >,
    };
  }

  /**
   * Test połączenia - sprawdza dostępność indeksu.
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.getStats();
      return { success: true };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }
}

// Singleton
export const pineconeClient = new PineconeClient();

// ============================================================================
// RAG_VERSION DUAL-HOST HELPER (IND-164)
// ============================================================================

let _cachedHost: string | undefined | null = null;

/**
 * Zwraca aktywny Pinecone index host dla wersji RAG_VERSION.
 * V1 (default) → PINECONE_INDEX_HOST (768 dim, MRL truncated)
 * V2 (opt-in) → PINECONE_INDEX_HOST_V2 (3072 dim, native), fallback do V1 jeśli V2 nieustawiony
 *
 * Cache module-level - read env once per Next.js serverless instance.
 * Reset przez `_resetPineconeHostCache()` dla testów.
 */
export function getActivePineconeHost(): string | undefined {
  if (_cachedHost !== null) return _cachedHost;
  const version = process.env.RAG_VERSION === 'v2' ? 'v2' : 'v1';
  const v2Host = process.env.PINECONE_INDEX_HOST_V2;
  const v1Host = process.env.PINECONE_INDEX_HOST;
  _cachedHost = version === 'v2' ? v2Host || v1Host : v1Host;
  return _cachedHost;
}

/**
 * Reset module-level cache. Eksportowane DLA TESTÓW (beforeEach).
 * NIE używać w runtime kodzie.
 */
export function _resetPineconeHostCache(): void {
  _cachedHost = null;
}
