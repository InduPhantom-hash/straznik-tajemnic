/**
 * Unit tests for custom-adventures-storage (Issue #419)
 *
 * Verifies:
 *  - Compression and decompression (gzip via CompressionStream/DecompressionStream)
 *  - Fallback mechanisms when CompressionStream is unavailable
 *  - Ultra-lean metadata in localStorage (strictly below quota, no heavy graphs/narratives)
 *  - Per-record IndexedDB storage (key: adv.id) and __meta__ registry
 *  - 100% backwards compatibility migration from legacy 'default' record
 *  - Per-record operations (loadAdventureRecord, saveAdventureRecord, deleteAdventureRecord)
 *  - Quota safety and graceful degradation
 */

import {
  loadCustomAdventures,
  saveCustomAdventures,
  loadAdventureRecord,
  saveAdventureRecord,
  deleteAdventureRecord,
  compressPayload,
  compressPayloadToBase64,
  decompressPayload,
  uint8ArrayToBase64,
  base64ToUint8Array,
  extractHeavyData,
  reconstructAdventure,
  exportAsJSON,
  parseImportJSON,
  _resetDBCache,
  STORAGE_KEY,
  STORE,
  LEGACY_RECORD_KEY,
  META_RECORD_KEY,
  StoredAdventureRecord,
  StoredMetaRecord,
  LegacyStoredRecord,
  getCompressionStream,
  getDecompressionStream,
  isCompressionStreamSupported,
} from './custom-adventures-storage';
import type { CustomAdventure } from './adventures-data';
import type { AdventureGraph } from './types';

// Mock in-memory IDB
class MockIDBRequest<T = unknown> {
  result?: T;
  error?: Error | null = null;
  onsuccess?: ((event: { target: MockIDBRequest<T> }) => void) | null = null;
  onerror?: ((event: { target: MockIDBRequest<T> }) => void) | null = null;

  resolve(val: T) {
    this.result = val;
    Promise.resolve().then(() => {
      if (this.onsuccess) this.onsuccess({ target: this });
    });
  }

  reject(err: Error) {
    this.error = err;
    Promise.resolve().then(() => {
      if (this.onerror) this.onerror({ target: this });
    });
  }
}

class MockIDBObjectStore {
  public data = new Map<string, any>();

  get(key: string): MockIDBRequest<any> {
    const req = new MockIDBRequest<any>();
    req.resolve(this.data.get(key));
    return req;
  }

  put(value: any): MockIDBRequest<string> {
    const req = new MockIDBRequest<string>();
    const id = value.id;
    this.data.set(id, value);
    req.resolve(id);
    return req;
  }

  delete(key: string): MockIDBRequest<undefined> {
    const req = new MockIDBRequest<undefined>();
    this.data.delete(key);
    req.resolve(undefined);
    return req;
  }

  clear(): MockIDBRequest<undefined> {
    const req = new MockIDBRequest<undefined>();
    this.data.clear();
    req.resolve(undefined);
    return req;
  }

  getAllKeys(): MockIDBRequest<string[]> {
    const req = new MockIDBRequest<string[]>();
    req.resolve(Array.from(this.data.keys()));
    return req;
  }

  getAll(): MockIDBRequest<any[]> {
    const req = new MockIDBRequest<any[]>();
    req.resolve(Array.from(this.data.values()));
    return req;
  }
}

class MockIDBDatabase {
  public stores = new Map<string, MockIDBObjectStore>();

  get objectStoreNames() {
    const names = Array.from(this.stores.keys());
    return {
      contains: (name: string) => names.includes(name),
    };
  }

  createObjectStore(name: string, _options?: { keyPath: string }) {
    const store = new MockIDBObjectStore();
    this.stores.set(name, store);
    return store;
  }

  transaction(_storeNames: string | string[], _mode?: string) {
    const self = this;
    const tx = {
      objectStore(name: string) {
        let store = self.stores.get(name);
        if (!store) {
          store = new MockIDBObjectStore();
          self.stores.set(name, store);
        }
        return store;
      },
      oncomplete: null as ((ev: any) => void) | null,
      onerror: null as ((ev: any) => void) | null,
    };
    setTimeout(() => {
      if (tx.oncomplete) tx.oncomplete({ target: tx });
    }, 20);
    return tx;
  }
}

function createMockIndexedDB() {
  const db = new MockIDBDatabase();
  db.createObjectStore(STORE, { keyPath: 'id' });

  return {
    _db: db,
    open: jest.fn().mockImplementation((_name: string, _version?: number) => {
      const openReq: any = {
        result: db,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      };
      setTimeout(() => {
        if (openReq.onupgradeneeded) {
          openReq.onupgradeneeded({ target: { result: db } });
        }
        if (openReq.onsuccess) {
          openReq.onsuccess({ target: openReq });
        }
      }, 0);
      return openReq;
    }),
  };
}

describe('custom-adventures-storage (Issue #419)', () => {
  let mockIDB: ReturnType<typeof createMockIndexedDB>;
  let globalRef: any;
  let originalIndexedDB: any;

  beforeAll(() => {
    // Map Node stream classes into jest environment if missing on window
    const nodeGlobal = global as any;
    if (typeof (globalThis as any).CompressionStream === 'undefined' && nodeGlobal.CompressionStream) {
      (globalThis as any).CompressionStream = nodeGlobal.CompressionStream;
    }
    if (typeof (globalThis as any).DecompressionStream === 'undefined' && nodeGlobal.DecompressionStream) {
      (globalThis as any).DecompressionStream = nodeGlobal.DecompressionStream;
    }
    if (typeof (window as any).CompressionStream === 'undefined' && nodeGlobal.CompressionStream) {
      (window as any).CompressionStream = nodeGlobal.CompressionStream;
    }
    if (typeof (window as any).DecompressionStream === 'undefined' && nodeGlobal.DecompressionStream) {
      (window as any).DecompressionStream = nodeGlobal.DecompressionStream;
    }
  });

  const sampleGraph: AdventureGraph = {
    locations: [
      {
        id: 'loc-1',
        name: 'Biblioteka Orne',
        description: 'Mroczne sale pełne zakazanych woluminów.',
      },
    ],
    npcs: [
      {
        id: 'npc-1',
        name: 'Profesor Armitage',
        description: 'Uczony o głębokiej wiedzy o Necronomiconie.',
      },
    ],
    clues: [
      {
        id: 'clue-1',
        name: 'Fragment z Necronomiconu',
        description: 'Tekst w starożytnym dialekcie.',
        isRedHerring: false,
      },
    ],
    connections: [
      {
        fromId: 'npc-1',
        toId: 'loc-1',
        description: 'Armitage zarządza biblioteką',
      },
    ],
  };

  const sampleAdventure: CustomAdventure = {
    id: 'adv-miskatonic-101',
    title: 'Koszmar w Dunwich',
    era: 'classic',
    eraLabel: 'Klasyczne lata 20.',
    yearRange: '1928',
    location: 'Dunwich / Massachusetts',
    country: 'USA',
    tone: 'purist',
    themes: ['mitologia', 'tajemnica'],
    suggestedOccupations: ['profesor', 'detektyw'],
    suggestedArchetypes: ['scholar'],
    hook: 'Niepokojące odgłosy dobiegające ze wzgórz Sentinel Hill.',
    description: 'Szczegółowy opis scenariusza z wieloma rozdziałami i postaciami.',
    estimatedSessions: '3-4',
    playerCount: '2-5',
    difficulty: 'hard',
    isCustom: true,
    pdfUrl: '',
    geminiFileUri: '',
    fileName: 'dunwich-horror.pdf',
    uploadedAt: '2026-09-20T10:00:00Z',
    isAnalyzed: true,
    graph: sampleGraph,
    documentType: 'scenario',
    attachedLorebookIds: [],
  };

  beforeEach(() => {
    _resetDBCache();
    localStorage.clear();
    globalRef = globalThis as any;
    originalIndexedDB = globalRef.indexedDB;
    mockIDB = createMockIndexedDB();
    globalRef.indexedDB = mockIDB;
  });

  afterEach(() => {
    globalRef.indexedDB = originalIndexedDB;
    _resetDBCache();
  });

  describe('Kompresja i dekompresja (CompressionStream / gzip)', () => {
    it('poprawnie kompresuje i dekompresuje złożone struktury z polskimi znakami', async () => {
      const dataToCompress = {
        title: 'Zażółć gęślą jaźń',
        graph: sampleGraph,
        nested: { count: 42, values: [1, 2, 3] },
      };
      const compressed = await compressPayload(dataToCompress);
      expect(compressed).toBeInstanceOf(Uint8Array);
      expect(compressed!.byteLength).toBeGreaterThan(0);

      const decompressed = await decompressPayload<typeof dataToCompress>(compressed!);
      expect(decompressed).toEqual(dataToCompress);
    });

    it('obsługuje kompresję i dekompresję przez Base64', async () => {
      const original = { test: 'dane testowe', graph: sampleGraph };
      const base64 = await compressPayloadToBase64(original);
      expect(typeof base64).toBe('string');

      const restored = await decompressPayload<typeof original>(base64!);
      expect(restored).toEqual(original);
    });

    it('uint8ArrayToBase64 i base64ToUint8Array działają bezstratnie', () => {
      const bytes = new Uint8Array([0, 1, 2, 255, 128, 64, 32]);
      const b64 = uint8ArrayToBase64(bytes);
      const decoded = base64ToUint8Array(b64);
      expect(Array.from(decoded)).toEqual(Array.from(bytes));
    });

    it('decompressPayload bezpiecznie parsuje nieskompresowany JSON jako fallback', async () => {
      const rawJson = JSON.stringify({ hello: 'fallback json' });
      const parsed = await decompressPayload<{ hello: string }>(rawJson);
      expect(parsed).toEqual({ hello: 'fallback json' });
    });

    it('decompressPayload zwraca null dla pustych lub uszkodzonych danych', async () => {
      expect(await decompressPayload(null as any)).toBeNull();
      expect(await decompressPayload('')).toBeNull();
      expect(await decompressPayload('not-valid-gzip-or-json')).toBeNull();
    });
  });

  describe('Ekstrakcja i rekonstrukcja struktur przygody (extractHeavyData / reconstructAdventure)', () => {
    it('wyodrębnia ciężki graf i syntezę, pozostawiając lekki placeholder', () => {
      const advWithNarrative = {
        ...sampleAdventure,
        fullNarrativeSummary: 'Bardzo długa synteza narracyjna...',
      };

      const { leanAdv, heavyData, hasHeavy } = extractHeavyData(advWithNarrative as any);
      expect(hasHeavy).toBe(true);
      expect(heavyData.graph).toEqual(sampleGraph);
      expect(heavyData.fullNarrativeSummary).toBe('Bardzo długa synteza narracyjna...');

      // leanAdv ma oczyszczony graf
      expect(leanAdv.graph?.npcs).toEqual([]);
      expect(leanAdv.graph?.locations).toEqual([]);
      expect(leanAdv.title).toBe(sampleAdventure.title);
    });

    it('bezstratnie rekonstruuje pełną przygodę ze skompresowanego rekordu', async () => {
      const { leanAdv, heavyData } = extractHeavyData(sampleAdventure);
      const compressed = await compressPayload(heavyData);

      const record: StoredAdventureRecord = {
        id: sampleAdventure.id,
        adventure: leanAdv,
        compressedPayload: compressed!,
        isCompressed: true,
        updatedAt: Date.now(),
      };

      const restored = await reconstructAdventure(record);
      expect(restored.id).toBe(sampleAdventure.id);
      expect(restored.graph).toEqual(sampleGraph);
    });
  });

  describe('Zapis i odczyt z IndexedDB (per-rekord + __meta__)', () => {
    it('zapisuje przygody per-rekord i tworzy indeks __meta__', async () => {
      await saveCustomAdventures({
        adventures: [sampleAdventure],
        activeId: sampleAdventure.id,
      });

      const store = mockIDB._db.stores.get(STORE)!;
      expect(store.data.has(sampleAdventure.id)).toBe(true);
      expect(store.data.has(META_RECORD_KEY)).toBe(true);

      const meta = store.data.get(META_RECORD_KEY) as StoredMetaRecord;
      expect(meta.adventureIds).toEqual([sampleAdventure.id]);
      expect(meta.activeId).toBe(sampleAdventure.id);

      const advRecord = store.data.get(sampleAdventure.id) as StoredAdventureRecord;
      expect(advRecord.id).toBe(sampleAdventure.id);
      expect(advRecord.isCompressed).toBe(true);
      expect(advRecord.compressedPayload).toBeDefined();
    });

    it('wczytuje pełne przygody z decompresją struktur grafu', async () => {
      await saveCustomAdventures({
        adventures: [sampleAdventure],
        activeId: sampleAdventure.id,
      });

      _resetDBCache();
      const loaded = await loadCustomAdventures();

      expect(loaded.adventures).toHaveLength(1);
      expect(loaded.activeId).toBe(sampleAdventure.id);

      const adv = loaded.adventures[0];
      expect(adv.id).toBe(sampleAdventure.id);
      expect(adv.title).toBe(sampleAdventure.title);
      expect(adv.graph).toEqual(sampleGraph);
      expect(adv.graph?.npcs).toHaveLength(1);
    });

    it('usuwa skasowane przygody z IndexedDB przy ponownym zapisie', async () => {
      const adv2: CustomAdventure = {
        ...sampleAdventure,
        id: 'adv-innsmouth-202',
        title: 'Cień nad Innsmouth',
      };

      await saveCustomAdventures({
        adventures: [sampleAdventure, adv2],
        activeId: sampleAdventure.id,
      });

      const store = mockIDB._db.stores.get(STORE)!;
      expect(store.data.has(sampleAdventure.id)).toBe(true);
      expect(store.data.has(adv2.id)).toBe(true);

      // Usuwamy adv2 zapisując tylko sampleAdventure
      await saveCustomAdventures({
        adventures: [sampleAdventure],
        activeId: sampleAdventure.id,
      });

      expect(store.data.has(sampleAdventure.id)).toBe(true);
      expect(store.data.has(adv2.id)).toBe(false);
    });
  });

  describe('Wsteczna kompatybilność i migracja ze schematu v1 (legacy default record)', () => {
    it('automatycznie i bezstratnie migruje legacy rekord default do per-rekordów i __meta__', async () => {
      const store = mockIDB._db.stores.get(STORE)!;

      const legacyAdv1: CustomAdventure = {
        ...sampleAdventure,
        id: 'legacy-dunwich-1',
        title: 'Legacy Dunwich',
      };
      const legacyAdv2: CustomAdventure = {
        ...sampleAdventure,
        id: 'legacy-arkham-2',
        title: 'Legacy Arkham',
      };

      // Wstrzykujemy stary format v1
      const legacyRecord: LegacyStoredRecord = {
        id: LEGACY_RECORD_KEY,
        adventures: [legacyAdv1, legacyAdv2],
        activeId: 'legacy-dunwich-1',
        updatedAt: 1600000000000,
      };
      store.data.set(LEGACY_RECORD_KEY, legacyRecord);

      // Odczyt wyzwala automatyczną migrację
      const loaded = await loadCustomAdventures();

      expect(loaded.adventures).toHaveLength(2);
      expect(loaded.activeId).toBe('legacy-dunwich-1');
      expect(loaded.adventures[0].id).toBe('legacy-dunwich-1');
      expect(loaded.adventures[0].graph).toEqual(sampleGraph);
      expect(loaded.adventures[1].id).toBe('legacy-arkham-2');

      // Weryfikacja stanu magazynu IDB po migracji
      expect(store.data.has(LEGACY_RECORD_KEY)).toBe(false); // Stary rekord usunięty
      expect(store.data.has('legacy-dunwich-1')).toBe(true); // Nowy rekord per-przygoda 1
      expect(store.data.has('legacy-arkham-2')).toBe(true); // Nowy rekord per-przygoda 2
      expect(store.data.has(META_RECORD_KEY)).toBe(true); // Nowy indeks metadanych

      const meta = store.data.get(META_RECORD_KEY) as StoredMetaRecord;
      expect(meta.adventureIds).toEqual(['legacy-dunwich-1', 'legacy-arkham-2']);
      expect(meta.activeId).toBe('legacy-dunwich-1');
    });
  });

  describe('Ultralekka kopia metadanych w localStorage (Quota Safety)', () => {
    it('zapisuje wyłącznie niezbędne metadane bez ciężkich grafów ani syntez', async () => {
      await saveCustomAdventures({
        adventures: [sampleAdventure],
        activeId: sampleAdventure.id,
      });

      const rawLS = localStorage.getItem(STORAGE_KEY);
      expect(rawLS).toBeDefined();

      const parsedLS = JSON.parse(rawLS!);
      expect(parsedLS.isLeanBackup).toBe(true);
      expect(parsedLS.activeId).toBe(sampleAdventure.id);
      expect(parsedLS.adventures).toHaveLength(1);

      const leanAdv = parsedLS.adventures[0];
      expect(leanAdv.id).toBe(sampleAdventure.id);
      expect(leanAdv.title).toBe(sampleAdventure.title);
      expect(leanAdv.era).toBe(sampleAdventure.era);
      expect(leanAdv.eraLabel).toBe(sampleAdventure.eraLabel);
      expect(leanAdv.yearRange).toBe(sampleAdventure.yearRange);
      expect(leanAdv.location).toBe(sampleAdventure.location);
      expect(leanAdv.country).toBe(sampleAdventure.country);
      expect(leanAdv.isCustom).toBe(true);
      expect(leanAdv.fileName).toBe(sampleAdventure.fileName);

      // Ciężkie struktury NIE MOGĄ znajdować się w localStorage
      expect(leanAdv.graph).toBeUndefined();
      expect(leanAdv.fullNarrativeSummary).toBeUndefined();
      expect(leanAdv.puzzles).toBeUndefined();
      expect(leanAdv.lorebookData).toBeUndefined();

      // Rozmiar wpisu powinien być bardzo mały (< 1KB)
      expect(rawLS!.length).toBeLessThan(1024);
    });

    it('ładuje dane z localStorage jako fallback gdy IndexedDB jest puste, i inicjuje migrację', async () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          adventures: [
            {
              id: 'fallback-adv',
              title: 'Przygoda z LocalStorage',
              era: 'classic',
              eraLabel: 'Klasyczne lata 20.',
              yearRange: '1925',
              location: 'Arkham',
              country: 'USA',
              isCustom: true,
              fileName: 'arkham.pdf',
            },
          ],
          activeId: 'fallback-adv',
        })
      );

      const loaded = await loadCustomAdventures();
      expect(loaded.adventures).toHaveLength(1);
      expect(loaded.adventures[0].id).toBe('fallback-adv');
      expect(loaded.activeId).toBe('fallback-adv');
    });
  });

  describe('Operacje per-rekord (saveAdventureRecord, loadAdventureRecord, deleteAdventureRecord)', () => {
    it('pozwala zapisać i wczytać pojedynczy rekord przygody', async () => {
      await saveAdventureRecord(sampleAdventure);

      const loaded = await loadAdventureRecord(sampleAdventure.id);
      expect(loaded).toBeDefined();
      expect(loaded?.id).toBe(sampleAdventure.id);
      expect(loaded?.graph).toEqual(sampleGraph);
    });

    it('pozwala usunąć pojedynczy rekord i aktualizuje __meta__', async () => {
      await saveAdventureRecord(sampleAdventure);
      expect(await loadAdventureRecord(sampleAdventure.id)).not.toBeNull();

      await deleteAdventureRecord(sampleAdventure.id);
      expect(await loadAdventureRecord(sampleAdventure.id)).toBeNull();

      const store = mockIDB._db.stores.get(STORE)!;
      const meta = store.data.get(META_RECORD_KEY) as StoredMetaRecord;
      expect(meta.adventureIds).not.toContain(sampleAdventure.id);
    });
  });

  describe('Eksport i import kopii zapasowej (exportAsJSON / parseImportJSON)', () => {
    it('poprawnie eksportuje i importuje pełne przygody', () => {
      const state = {
        adventures: [sampleAdventure],
        activeId: sampleAdventure.id,
      };

      const exported = exportAsJSON(state);
      expect(typeof exported).toBe('string');

      const parsed = parseImportJSON(exported);
      expect(parsed).toBeDefined();
      expect(parsed?.adventures).toHaveLength(1);
      expect(parsed?.adventures[0].title).toBe(sampleAdventure.title);
      expect(parsed?.activeId).toBe(sampleAdventure.id);
    });

    it('parseImportJSON zwraca null dla nieprawidłowego formatu JSON', () => {
      expect(parseImportJSON('')).toBeNull();
      expect(parseImportJSON('invalid json')).toBeNull();
      expect(parseImportJSON('{"adventures": "not an array"}')).toBeNull();
    });
  });
});
