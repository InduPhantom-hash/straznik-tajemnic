import fs from 'fs';
import os from 'os';
import path from 'path';
import { LocalVectorStore, BoundedMinHeap } from './local-vector-store';
import { writeBinaryNamespace, countBinaryNamespace } from './binary-format';
import type { UpsertVector, VectorMetadata } from './vector-types';

const metadata: VectorMetadata = {
  contentType: 'rule',
  summary: 'test',
  gameTimestamp: '',
  realTimestamp: '',
  tags: '[]',
  sessionId: '',
  messageRange: '',
};

function vector(id: string, values: number[]): UpsertVector {
  return { id, values, metadata, text: `tekst ${id}` };
}

describe('LocalVectorStore', () => {
  let directory: string;
  const previousDataDir = process.env.RAG_DATA_DIR;
  const previousBundledDataDir = process.env.RAG_BUNDLED_DATA_DIR;
  let bundledDirectory: string;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'straznik-rag-test-'));
    bundledDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'straznik-rag-bundled-'));
    process.env.RAG_DATA_DIR = directory;
    process.env.RAG_BUNDLED_DATA_DIR = bundledDirectory;
  });

  afterEach(() => {
    fs.rmSync(directory, { recursive: true, force: true });
    fs.rmSync(bundledDirectory, { recursive: true, force: true });
  });

  afterAll(() => {
    if (previousDataDir === undefined) delete process.env.RAG_DATA_DIR;
    else process.env.RAG_DATA_DIR = previousDataDir;
    if (previousBundledDataDir === undefined) delete process.env.RAG_BUNDLED_DATA_DIR;
    else process.env.RAG_BUNDLED_DATA_DIR = previousBundledDataDir;
  });

  it('zapisuje JSON atomowo i odczytuje go po wyczyszczeniu cache', async () => {
    const store = new LocalVectorStore();
    await store.upsert('rules', [vector('old', [1, 0])]);

    expect(fs.existsSync(path.join(directory, 'rules.tmp'))).toBe(false);
    expect(fs.existsSync(path.join(directory, 'rules.json'))).toBe(true);
    store.clearCache();

    await expect(store.query('rules', [1, 0])).resolves.toEqual([
      expect.objectContaining({ id: 'old', score: 1 }),
    ]);
  });

  it('czyta statyczny indeks z bundla, ale zapisuje nadpisania wyłącznie do warstwy zapisywalnej', async () => {
    writeBinaryNamespace(bundledDirectory, 'rules', [vector('bundled', [1, 0])]);
    const store = new LocalVectorStore();
    await expect(store.query('rules', [1, 0])).resolves.toEqual([
      expect.objectContaining({ id: 'bundled' }),
    ]);

    await store.upsert('campaigns/run-1', [vector('memory', [0, 1])]);
    expect(fs.existsSync(path.join(directory, 'campaigns__run-1.json'))).toBe(true);
    expect(fs.existsSync(path.join(bundledDirectory, 'campaigns__run-1.json'))).toBe(false);
  });

  it('zastępuje namespace bez pozostawienia starych rekordów', async () => {
    const store = new LocalVectorStore();
    await store.upsert('rules', [vector('old', [1, 0])]);
    await store.replaceNamespace('rules', [vector('new', [0, 1])]);
    store.clearCache();

    const stats = await store.getStats();
    expect(stats.namespaces.rules.recordCount).toBe(1);
    expect(fs.existsSync(path.join(directory, 'rules.bin'))).toBe(true);
    expect(fs.existsSync(path.join(directory, 'rules.meta.json'))).toBe(true);
    expect(fs.existsSync(path.join(directory, 'rules.json'))).toBe(false);
    await expect(store.query('rules', [0, 1])).resolves.toEqual([
      expect.objectContaining({ id: 'new', score: 1 }),
    ]);
  });

  it('preferuje poprawny format binarny i wraca do JSON po mutacji', async () => {
    writeBinaryNamespace(directory, 'adventures', [vector('binary', [1, 0])]);
    const store = new LocalVectorStore();
    await expect(store.query('adventures', [1, 0])).resolves.toEqual([
      expect.objectContaining({ id: 'binary' }),
    ]);

    await store.upsert('adventures', [vector('json', [0, 1])]);
    expect(fs.existsSync(path.join(directory, 'adventures.bin'))).toBe(false);
    store.clearCache();
    const results = await store.query('adventures', [0, 1], 2);
    expect(results.map((result) => result.id)).toEqual(['json', 'binary']);
  });

  it('BoundedMinHeap utrzymuje topK w kolejności malejącej bez zbędnych alokacji', () => {
    const heap = new BoundedMinHeap(3);
    expect(heap.toSortedArray()).toEqual([]);

    heap.push({ id: 'doc-1', score: 0.2, metadata });
    heap.push({ id: 'doc-2', score: 0.9, metadata });
    heap.push({ id: 'doc-3', score: 0.5, metadata });
    heap.push({ id: 'doc-4', score: 0.8, metadata }); // wypiera doc-1 (0.2)
    heap.push({ id: 'doc-5', score: 0.1, metadata }); // pomijany (0.1 < min 0.5)

    const top = heap.toSortedArray();
    expect(top.map((r) => r.id)).toEqual(['doc-2', 'doc-4', 'doc-3']);
    expect(top.map((r) => r.score)).toEqual([0.9, 0.8, 0.5]);
  });

  it('query z filtrem filtruje rekordy i zwraca posortowane topK', async () => {
    const store = new LocalVectorStore();
    const metaA: VectorMetadata = { ...metadata, contentType: 'rule', tags: 'tagA' };
    const metaB: VectorMetadata = { ...metadata, contentType: 'adventure', tags: 'tagB' };

    await store.replaceNamespace('rules', [
      { id: 'v1', values: [1, 0], metadata: metaA },
      { id: 'v2', values: [0.9, 0.1], metadata: metaB },
      { id: 'v3', values: [0.8, 0.2], metadata: metaA },
    ]);

    const filtered = await store.query('rules', [1, 0], 2, { contentType: 'rule' });
    expect(filtered.map((r) => r.id)).toEqual(['v1', 'v3']);
    expect(filtered.every((r) => r.metadata.contentType === 'rule')).toBe(true);
  });

  it('LRU ogranicza rozmiar pamięci podręcznej do 20 namespaceów', async () => {
    const store = new LocalVectorStore();
    // Utwórz 25 namespace'ów
    for (let i = 0; i < 25; i++) {
      await store.upsert(`ns-${i}`, [vector(`vec-${i}`, [1, 0])]);
    }

    // Cache nie może przekraczać 20
    expect(store.cacheSize).toBeLessThanOrEqual(20);
  });

  it('izoluje namespace dla przygód (adventures/{id})', async () => {
    const store = new LocalVectorStore();
    await store.replaceNamespace('adventures/adv-1', [vector('adv1-vec', [1, 0])]);
    await store.replaceNamespace('adventures/adv-2', [vector('adv2-vec', [0, 1])]);

    expect(fs.existsSync(path.join(directory, 'adventures__adv-1.bin'))).toBe(true);
    expect(fs.existsSync(path.join(directory, 'adventures__adv-2.bin'))).toBe(true);

    const q1 = await store.query('adventures/adv-1', [1, 0], 1);
    expect(q1[0].id).toBe('adv1-vec');

    const q2 = await store.query('adventures/adv-2', [1, 0], 1);
    expect(q2[0].id).toBe('adv2-vec');

    const stats = await store.getStats();
    expect(stats.namespaces['adventures/adv-1'].recordCount).toBe(1);
    expect(stats.namespaces['adventures/adv-2'].recordCount).toBe(1);
  });

  it('zastępuje namespace pustą tablicą i czyści rekordy', async () => {
    const store = new LocalVectorStore();
    await store.replaceNamespace('rules', [vector('old', [1, 0])]);
    expect((await store.getStats()).namespaces.rules.recordCount).toBe(1);

    await store.replaceNamespace('rules', []);
    store.clearCache();

    const stats = await store.getStats();
    expect(stats.namespaces.rules?.recordCount ?? 0).toBe(0);
    await expect(store.query('rules', [1, 0])).resolves.toEqual([]);
  });

  it('BoundedMinHeap obsługuje bezpiecznie nieprawidłowe capacity oraz NaN score', () => {
    const invalidHeap1 = new BoundedMinHeap(NaN);
    expect(() => invalidHeap1.push({ id: 'doc-nan', score: 0.5, metadata })).not.toThrow();
    expect(invalidHeap1.toSortedArray()).toEqual([]);

    const invalidHeap2 = new BoundedMinHeap(-5);
    expect(() => invalidHeap2.push({ id: 'doc-neg', score: 0.5, metadata })).not.toThrow();
    expect(invalidHeap2.toSortedArray()).toEqual([]);

    const validHeap = new BoundedMinHeap(2);
    validHeap.push({ id: 'doc-nan-score', score: NaN, metadata });
    expect(validHeap.size).toBe(0);
    validHeap.push({ id: 'doc-good', score: 0.8, metadata });
    expect(validHeap.size).toBe(1);
    expect(validHeap.toSortedArray()[0].id).toBe('doc-good');
  });

  it('query zwraca [] dla nieprawidłowego topK lub wektora', async () => {
    const store = new LocalVectorStore();
    await store.replaceNamespace('rules', [vector('v1', [1, 0])]);

    await expect(store.query('rules', [1, 0], 0)).resolves.toEqual([]);
    await expect(store.query('rules', [1, 0], -1)).resolves.toEqual([]);
    await expect(store.query('rules', [1, 0], NaN)).resolves.toEqual([]);
    await expect(store.query('rules', [] as unknown as number[], 5)).resolves.toEqual([]);
    await expect(store.query('rules', undefined as unknown as number[], 5)).resolves.toEqual([]);
  });

  it('odporny na uszkodzony lub ucięty plik .bin i wraca do JSON lub pustego wyniku', async () => {
    writeBinaryNamespace(directory, 'corrupt-ns', [vector('b1', [1, 0])]);

    // Uszkodź plik binarny obcinając do połowy
    const binFile = path.join(directory, 'corrupt-ns.bin');
    fs.truncateSync(binFile, 20);

    const store = new LocalVectorStore();
    // Brak JSON fallbacku -> zwraca []
    const res = await store.query('corrupt-ns', [1, 0]);
    expect(res).toEqual([]);
  });

  it('countBinaryNamespace zwraca null dla uciętego pliku .bin lub braku .meta.json', () => {
    writeBinaryNamespace(directory, 'test-bin', [vector('b1', [1, 0])]);

    expect(countBinaryNamespace(directory, 'test-bin')).toBe(1);

    // Usunięcie .meta.json powoduje, że plik nie jest uznawany za poprawny namespace
    fs.unlinkSync(path.join(directory, 'test-bin.meta.json'));
    expect(countBinaryNamespace(directory, 'test-bin')).toBeNull();

    // Ucięcie pliku .bin
    writeBinaryNamespace(directory, 'test-bin-2', [vector('b2', [1, 0])]);
    fs.truncateSync(path.join(directory, 'test-bin-2.bin'), 10);
    expect(countBinaryNamespace(directory, 'test-bin-2')).toBeNull();
  });

  it('współbieżne zapytania do >20 namespaceów poprawnie eksmitują LRU i zachowują spójność wyników', async () => {
    const store = new LocalVectorStore();
    const count = 30;

    // Przygotuj 30 namespace'ów
    for (let i = 0; i < count; i++) {
      await store.replaceNamespace(`ns-concurrent-${i}`, [
        vector(`vec-${i}`, [i === 0 ? 1 : 0, i === 0 ? 0 : 1]),
      ]);
    }

    // Wykonaj współbieżne zapytania do wszystkich 30 namespace'ów
    const promises = Array.from({ length: count }, (_, i) =>
      store.query(`ns-concurrent-${i}`, [1, 0], 1)
    );
    const allResults = await Promise.all(promises);

    expect(allResults.length).toBe(count);
    expect(allResults[0][0].id).toBe('vec-0');
    expect(allResults[1][0].id).toBe('vec-1');

    // LRU musi utrzymywać rozmiar <= 20
    expect(store.cacheSize).toBeLessThanOrEqual(20);
  });
});
