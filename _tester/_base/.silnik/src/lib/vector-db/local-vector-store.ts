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
 * Skala gry (~1868 wektorów @ 3072 dim) → brute-force cosine <10 ms.
 * RAM ~50 MB przy pełnym podręczniku.
 */

import fs from 'fs';
import path from 'path';
import { cosineSimilarity } from '../embedding-service';
import {
  hasBinaryNamespace,
  readBinaryNamespace,
  countBinaryNamespace,
  deleteBinaryNamespace,
  writeBinaryNamespace,
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

/** Statyczne indeksy dołączone do bundla; nigdy nie są modyfikowane w desktopie. */
function bundledDataDir(): string {
  return process.env.RAG_BUNDLED_DATA_DIR || path.join(process.cwd(), 'data', 'rag');
}

/** Namespace → ścieżka pliku. `/` i `\` → `__` (bezpieczna nazwa). */
function namespaceToFile(namespace: string): string {
  const safe = namespace.replace(/[/\\]/g, '__');
  return path.join(dataDir(), `${safe}.json`);
}

function namespaceFileIn(directory: string, namespace: string): string {
  const safe = namespace.replace(/[/\\]/g, '__');
  return path.join(directory, `${safe}.json`);
}

/**
 * Bounded min-heap dla topK wyników retrieval.
 * Utrzymuje w pamięci co najwyżej K elementów, eliminując
 * alokację tysięcy obiektów QueryResult i sortowanie całego zbioru N.
 */
export class BoundedMinHeap {
  private heap: QueryResult[] = [];
  readonly capacity: number;

  constructor(capacity: number) {
    this.capacity =
      Number.isFinite(capacity) && capacity > 0 ? Math.floor(capacity) : 0;
  }

  get size(): number {
    return this.heap.length;
  }

  peek(): QueryResult | undefined {
    return this.heap[0];
  }

  push(item: QueryResult): void {
    if (this.capacity <= 0 || !Number.isFinite(item.score)) return;

    if (this.heap.length < this.capacity) {
      this.heap.push(item);
      this.siftUp(this.heap.length - 1);
    } else if (item.score > this.heap[0].score) {
      this.heap[0] = item;
      this.siftDown(0);
    }
  }

  private siftUp(index: number): void {
    let current = index;
    const item = this.heap[current];
    while (current > 0) {
      const parent = (current - 1) >> 1;
      if (this.heap[parent].score <= item.score) break;
      this.heap[current] = this.heap[parent];
      current = parent;
    }
    this.heap[current] = item;
  }

  private siftDown(index: number): void {
    const length = this.heap.length;
    const half = length >> 1;
    const item = this.heap[index];
    let current = index;

    while (current < half) {
      const left = (current << 1) + 1;
      const right = left + 1;
      let minChild = left;

      if (right < length && this.heap[right].score < this.heap[left].score) {
        minChild = right;
      }
      if (item.score <= this.heap[minChild].score) break;
      this.heap[current] = this.heap[minChild];
      current = minChild;
    }
    this.heap[current] = item;
  }

  toSortedArray(): QueryResult[] {
    return this.heap.sort((a, b) => b.score - a.score);
  }
}

class LocalVectorStore {
  /** Maksymalna liczba załadowanych namespace'ów w pamięci RAM (LRU eviction). */
  static readonly MAX_CACHE_NAMESPACES = 20;

  private cache = new Map<string, StoredVector[]>();
  private writeQueue: Promise<void> = Promise.resolve();

  /** Aktualna liczba załadowanych namespace'ów w cache RAM (inspekcja testowa). */
  get cacheSize(): number {
    return this.cache.size;
  }

  /**
   * Zapis do cache z LRU eviction (max 20 namespace'ów w pamięci).
   */
  private setCache(namespace: string, vectors: StoredVector[]): void {
    if (this.cache.has(namespace)) {
      this.cache.delete(namespace);
    }
    this.cache.set(namespace, vectors);
    while (this.cache.size > LocalVectorStore.MAX_CACHE_NAMESPACES) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      } else {
        break;
      }
    }
  }

  /**
   * Kolejkuje zadanie modyfikujące stan (zapis/usuwanie) w celu uniknięcia wyścigów I/O.
   */
  private async enqueueWrite(task: () => Promise<void> | void): Promise<void> {
    const nextTask = this.writeQueue.then(async () => {
      try {
        await task();
      } catch (e) {
        console.error('❌ LocalVectorStore write error:', e);
      }
    });
    this.writeQueue = nextTask;
    return nextTask;
  }

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
   * Lazy-load namespace z dysku do pamięci (cache module-level, LRU max 20).
   * Preferuje format binarny `.bin` (Float32Array, lekki - IND-263); fallback do
   * `.json` (number[]) gdy brak binarnego LUB binarny uszkodzony. Statyczne
   * namespace (rules/adventures/mythos) → bin; runtime (sessions) → JSON.
   */
  private load(namespace: string): StoredVector[] {
    const cached = this.cache.get(namespace);
    if (cached) {
      // LRU refresh: przesuwamy na koniec Mapy (najświeższy)
      this.cache.delete(namespace);
      this.cache.set(namespace, cached);
      return cached;
    }

    let vectors: StoredVector[] = [];
    try {
      const writableDir = dataDir();
      const bundledDir = bundledDataDir();
      const sourceDir =
        hasBinaryNamespace(writableDir, namespace) ||
        fs.existsSync(namespaceFileIn(writableDir, namespace))
          ? writableDir
          : bundledDir;
      if (hasBinaryNamespace(sourceDir, namespace)) {
        vectors =
          readBinaryNamespace(sourceDir, namespace) ?? this.loadJson(namespace, sourceDir);
      } else {
        vectors = this.loadJson(namespace, sourceDir);
      }
    } catch (e) {
      console.warn(`⚠️ LocalVectorStore: load failed for "${namespace}":`, e);
      vectors = [];
    }
    this.setCache(namespace, vectors);
    return vectors;
  }

  /** Odczyt namespace ze starego formatu JSON (number[]). */
  private loadJson(namespace: string, directory = dataDir()): StoredVector[] {
    const file = namespaceFileIn(directory, namespace);
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

    return this.enqueueWrite(() => {
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
      this.setCache(namespace, merged);
      this.persist(namespace, merged);
    });
  }

  /**
   * Atomowo zastępuje cały namespace gotowym zestawem wektorów.
   * Używa formatu binarnego (.bin + .meta.json) zamiast JSON dla minimalizacji
   * narzutu RAM i szybkiego, bezstratnego odczytu Float32.
   * Usuwa przestarzały plik JSON jeśli istniał.
   */
  async replaceNamespace(
    namespace: string,
    vectors: UpsertVector[]
  ): Promise<void> {
    return this.enqueueWrite(() => {
      const replacement: StoredVector[] = vectors.map((vector) => ({
        id: vector.id,
        values: vector.values,
        metadata: vector.metadata,
        text: vector.text,
      }));
      const dir = dataDir();
      writeBinaryNamespace(dir, namespace, replacement);
      // Usunięcie starego pliku JSON po udanej konwersji do formatu binarnego
      const jsonFile = namespaceToFile(namespace);
      try {
        if (fs.existsSync(jsonFile)) fs.unlinkSync(jsonFile);
      } catch (e) {
        console.warn(`⚠️ LocalVectorStore: failed to remove legacy JSON file "${jsonFile}":`, e);
      }
      this.setCache(namespace, replacement);
    });
  }

  /**
   * Wyszukiwanie semantyczne: cosine po wszystkich wektorach namespace, topK.
   * Zoptymalizowane za pomocą BoundedMinHeap o pojemności topK - eliminuje
   * churn alokacji obiektów i sortowanie całego zbioru N.
   */
  async query(
    namespace: string,
    vector: number[],
    topK: number = 5,
    filter?: Record<string, unknown>
  ): Promise<QueryResult[]> {
    if (
      !Number.isFinite(topK) ||
      topK <= 0 ||
      !Array.isArray(vector) ||
      vector.length === 0
    ) {
      return [];
    }

    const loaded = this.load(namespace);
    if (loaded.length === 0) return [];

    let dimensionMismatchWarned = false;
    const heap = new BoundedMinHeap(topK);

    for (const v of loaded) {
      // 1. Tani filtr metadanych przed obliczeniem embeddingu
      if (filter) {
        const matches = Object.entries(filter).every(
          ([k, val]) => (v.metadata as Record<string, unknown>)[k] === val
        );
        if (!matches) continue;
      }

      // 2. Walidacja wymiarowości wektora
      if (v.values.length !== vector.length) {
        if (!dimensionMismatchWarned) {
          console.warn(
            `⚠️ LocalVectorStore: vector length mismatch in "${namespace}" (${v.values.length} vs query ${vector.length}). Re-indexing required for this namespace.`
          );
          dimensionMismatchWarned = true;
        }
        continue;
      }

      // 3. Obliczenie score i umieszczenie w bounded heap
      const score = cosineSimilarity(vector, v.values);
      heap.push({
        id: v.id,
        score,
        metadata: v.metadata,
        text: v.text,
      });
    }

    return heap.toSortedArray();
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
    return this.enqueueWrite(() => {
      const set = new Set(ids);
      const remaining = this.load(namespace).filter((v) => !set.has(v.id));
      this.setCache(namespace, remaining);
      this.persist(namespace, remaining);
    });
  }

  /** Usunięcie całego namespace (cache + plik JSON + pliki binarne). */
  async deleteNamespace(namespace: string): Promise<void> {
    return this.enqueueWrite(() => {
      this.cache.delete(namespace);
      try {
        const file = namespaceToFile(namespace);
        if (fs.existsSync(file)) fs.unlinkSync(file);
      } catch (e) {
        console.warn(`⚠️ LocalVectorStore: delete failed for "${namespace}":`, e);
      }
      // Usuń też format binarny (inaczej loader czytałby skasowany namespace z .bin).
      deleteBinaryNamespace(dataDir(), namespace);
    });
  }

  /** Statystyki: liczba wektorów per namespace (skan plików data/rag). */
  async getStats(): Promise<{
    totalRecordCount: number;
    namespaces: Record<string, { recordCount: number }>;
  }> {
    const namespaces: Record<string, { recordCount: number }> = {};
    let total = 0;
    try {
      const dirs = Array.from(new Set([dataDir(), bundledDataDir()]));
      // Zbierz unikalne namespace z obu formatów (.bin i .json). `.meta.json` to
      // sidecar binarnego - pomijamy. Namespace z `/` mają w pliku `__` → odwracamy.
      const nsSet = new Set<string>();
      for (const dir of dirs) {
        if (!fs.existsSync(dir)) continue;
        for (const f of fs.readdirSync(dir)) {
          if (f.endsWith('.tmp') || f.endsWith('.meta.json')) continue;
          let base: string | null = null;
          if (f.endsWith('.bin')) base = f.slice(0, -'.bin'.length);
          else if (f.endsWith('.json')) base = f.slice(0, -'.json'.length);
          if (base === null) continue;
          nsSet.add(base.replace(/__/g, '/'));
        }
      }
      for (const ns of nsSet) {
        // Bin: liczba z nagłówka (bez ładowania values). JSON: load.
        const count = this.load(ns).length;
        namespaces[ns] = { recordCount: count };
        total += count;
      }
    } catch {
      // brak katalogu = pusty store
    }
    return { totalRecordCount: total, namespaces };
  }

  /** Zwraca liczbę wektorów dla konkretnego namespace. */
  getNamespaceCount(namespace: string): number {
    try {
      return this.load(namespace).length;
    } catch {
      return 0;
    }
  }

  /** Reset cache w pamięci (TESTY / po re-indeksie). NIE kasuje plików. */
  clearCache(): void {
    this.cache.clear();
  }
}

// Singleton (single-instance fork = bezpieczne)
export const localVectorStore = new LocalVectorStore();

// Eksport klasy dla testów (świeża instancja z własnym RAG_DATA_DIR)
export { LocalVectorStore };
