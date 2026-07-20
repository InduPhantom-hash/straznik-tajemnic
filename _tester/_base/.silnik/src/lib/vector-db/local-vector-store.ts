/**
 * LocalVectorStore - lokalny magazyn wektorów na dysku (Zew-App-Local)
 *
 * Lokalny magazyn z prostą sygnaturą
 * (upsert / query / queryMultiNamespace / deleteByIds / deleteNamespace / getStats).
 * Zero zależności sieciowych - cały RAG działa na jednym kluczu Gemini (embeddingi)
 * + plikach lokalnych.
 *
 * Persist: data/rag/{namespace}.json (atomic write: temp + rename).
 * Namespace z `/` (np. sessions/{id}) → bezpieczna nazwa pliku (sessions__{id}.json).
 * Query: cosineSimilarity (reuse z embedding-service) po wszystkich wektorach namespace.
 *
 * Skala gry (~1868 wektorów @ 3072 dim) → brute-force cosine <10 ms, szybsze niż
 * round-trip do Pinecone. RAM ~50 MB przy pełnym podręczniku.
 */

import fs from 'fs';
import path from 'path';
import { cosineSimilarity } from '../embedding-service';
import {
  hasBinaryNamespace,
  readBinaryNamespace,
  countBinaryNamespace,
  deleteBinaryNamespace,
} from './binary-format';
import type { UpsertVector, QueryResult, VectorMetadata } from './vector-types';

/**
 * Rekord trzymany w cache. `text` = pełny tekst chunka (dla BM25 rebuild).
 * `values` jako `ArrayLike<number>` - może być `number[]` (JSON, runtime namespace)
 * albo `Float32Array` (binarny, statyczne rules/adventures/mythos po IND-263).
 */
interface StoredVector {
  id: string;
  values: ArrayLike<number>;
  metadata: VectorMetadata;
  text?: string;
}

/** Katalog danych RAG. Override przez RAG_DATA_DIR (testy). */
function dataDir(): string {
  return process.env.RAG_DATA_DIR || path.join(process.cwd(), 'data', 'rag');
}

/** Namespace → ścieżka pliku. `/` i `\` → `__` (bezpieczna nazwa). */
function namespaceToFile(namespace: string): string {
  const safe = namespace.replace(/[/\\]/g, '__');
  return path.join(dataDir(), `${safe}.json`);
}

class LocalVectorStore {
  private cache = new Map<string, StoredVector[]>();

  /** Lokalny store nie wymaga klucza ani połączenia - zawsze gotowy. */
  get initialized(): boolean {
    return true;
  }

  /** Tworzy katalog danych jeśli brak (idempotentne, opcjonalne). */
  initialize(): void {
    try {
      fs.mkdirSync(dataDir(), { recursive: true });
    } catch (e) {
      console.warn('⚠️ LocalVectorStore: mkdir failed:', e);
    }
  }

  /**
   * Lazy-load namespace z dysku do pamięci (cache module-level, single-instance).
   * Preferuje format binarny `.bin` (Float32Array, lekki - IND-263); fallback do
   * `.json` (number[]) gdy brak binarnego LUB binarny uszkodzony. Statyczne
   * namespace (rules/adventures/mythos) → bin; runtime (sessions/npcs/world) → JSON.
   */
  private load(namespace: string): StoredVector[] {
    const cached = this.cache.get(namespace);
    if (cached) return cached;

    let vectors: StoredVector[] = [];
    try {
      const dir = dataDir();
      if (hasBinaryNamespace(dir, namespace)) {
        vectors =
          readBinaryNamespace(dir, namespace) ?? this.loadJson(namespace);
      } else {
        vectors = this.loadJson(namespace);
      }
    } catch (e) {
      console.warn(`⚠️ LocalVectorStore: load failed for "${namespace}":`, e);
      vectors = [];
    }
    this.cache.set(namespace, vectors);
    return vectors;
  }

  /** Odczyt namespace ze starego formatu JSON (number[]). */
  private loadJson(namespace: string): StoredVector[] {
    const file = namespaceToFile(namespace);
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf-8')) as StoredVector[];
    }
    return [];
  }

  /**
   * Atomic write: temp + rename (chroni przed korupcją przy przerwanym zapisie).
   * Zawsze zapisuje JSON (runtime namespace przez upsert/deleteByIds). Guard
   * `Array.from` na wypadek `Float32Array` w cache (binarny) → poprawny JSON.
   */
  private persist(namespace: string, vectors: StoredVector[]): void {
    fs.mkdirSync(dataDir(), { recursive: true });
    const file = namespaceToFile(namespace);
    const tmp = `${file}.tmp`;
    const serializable = vectors.map((v) => ({
      ...v,
      values: Array.isArray(v.values) ? v.values : Array.from(v.values),
    }));
    fs.writeFileSync(tmp, JSON.stringify(serializable), 'utf-8');
    fs.renameSync(tmp, file);
    // Runtime mutacja zapisała JSON. Jeśli namespace miał format binarny (np.
    // upload PDF do rules/adventures), usuń .bin by loader czytał świeży JSON.
    deleteBinaryNamespace(dataDir(), namespace);
  }

  /** Upsert (insert lub update po id) wektorów do namespace. */
  async upsert(namespace: string, vectors: UpsertVector[]): Promise<void> {
    if (vectors.length === 0) return;

    const byId = new Map(this.load(namespace).map((v) => [v.id, v]));
    for (const v of vectors) {
      byId.set(v.id, {
        id: v.id,
        values: v.values,
        metadata: v.metadata,
        text: v.text,
      });
    }
    const merged = Array.from(byId.values());
    this.cache.set(namespace, merged);
    this.persist(namespace, merged);
  }

  /** Wyszukiwanie semantyczne: cosine po wszystkich wektorach namespace, topK. */
  async query(
    namespace: string,
    vector: number[],
    topK: number = 5,
    filter?: Record<string, unknown>
  ): Promise<QueryResult[]> {
    let scored = this.load(namespace).map((v) => ({
      id: v.id,
      score: cosineSimilarity(vector, v.values),
      metadata: v.metadata,
    }));

    if (filter) {
      scored = scored.filter((r) =>
        Object.entries(filter).every(
          ([k, val]) => (r.metadata as Record<string, unknown>)[k] === val
        )
      );
    }

    return scored.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  /** Wyszukiwanie równoległe w wielu namespace, posortowane globalnie. */
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

  /** Usunięcie wektorów po ID. */
  async deleteByIds(namespace: string, ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const set = new Set(ids);
    const remaining = this.load(namespace).filter((v) => !set.has(v.id));
    this.cache.set(namespace, remaining);
    this.persist(namespace, remaining);
  }

  /** Usunięcie całego namespace (cache + plik JSON + pliki binarne). */
  async deleteNamespace(namespace: string): Promise<void> {
    this.cache.set(namespace, []);
    try {
      const file = namespaceToFile(namespace);
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch (e) {
      console.warn(`⚠️ LocalVectorStore: delete failed for "${namespace}":`, e);
    }
    // Usuń też format binarny (inaczej loader czytałby skasowany namespace z .bin).
    deleteBinaryNamespace(dataDir(), namespace);
  }

  /** Statystyki: liczba wektorów per namespace (skan plików data/rag). */
  async getStats(): Promise<{
    totalRecordCount: number;
    namespaces: Record<string, { recordCount: number }>;
  }> {
    const namespaces: Record<string, { recordCount: number }> = {};
    let total = 0;
    try {
      const dir = dataDir();
      // Zbierz unikalne namespace z obu formatów (.bin i .json). `.meta.json` to
      // sidecar binarnego - pomijamy. Namespace z `/` mają w pliku `__` → odwracamy.
      const nsSet = new Set<string>();
      for (const f of fs.readdirSync(dir)) {
        if (f.endsWith('.tmp') || f.endsWith('.meta.json')) continue;
        let base: string | null = null;
        if (f.endsWith('.bin')) base = f.slice(0, -'.bin'.length);
        else if (f.endsWith('.json')) base = f.slice(0, -'.json'.length);
        if (base === null) continue;
        nsSet.add(base.replace(/__/g, '/'));
      }
      for (const ns of nsSet) {
        // Bin: liczba z nagłówka (bez ładowania values). JSON: load.
        const binCount = countBinaryNamespace(dir, ns);
        const count = binCount !== null ? binCount : this.load(ns).length;
        namespaces[ns] = { recordCount: count };
        total += count;
      }
    } catch {
      // brak katalogu = pusty store
    }
    return { totalRecordCount: total, namespaces };
  }

  /** Reset cache w pamięci (TESTY / po re-indeksie). NIE kasuje plików. */
  clearCache(): void {
    this.cache.clear();
  }
}

// Singleton (analog pineconeClient; single-instance fork = bezpieczne)
export const localVectorStore = new LocalVectorStore();

// Eksport klasy dla testów (świeża instancja z własnym RAG_DATA_DIR)
export { LocalVectorStore };
