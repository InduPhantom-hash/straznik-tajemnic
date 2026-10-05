/**
 * Unit tests for custom-adventures-storage (Issue #419)
 *
 * Verifies:
 *  - Compression and decompression (gzip via CompressionStream/DecompressionStream)
 *  - Fallback mechanisms when CompressionStream is unavailable
 *  - Ultra-lean metadata in localStorage (strictly below quota, no heavy graphs/narratives)
 *  - Safe hydration of lean records on fallback (no undefined themes/graph crashes in UI)
 *  - Per-record IndexedDB storage (key: adv.id) and __meta__ registry
 *  - 100% backwards compatibility migration from legacy 'default' record
 *  - Per-record operations (loadAdventureRecord, saveAdventureRecord, deleteAdventureRecord)
 *  - Quota safety, synchronization, and graceful degradation
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
  sanitizeCustomAdventureForStorage,
  normalizeAdventureGraph,
  hydrateLeanAdventure,
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
  StoredLeanAdventures,
} from './custom-adventures-storage';
import type { CustomAdventure } from './adventures-data';
import type { AdventureGraph, AdventureNode } from './types';


interface IDBTarget<T> {
  target: T;
}

// Mock in-memory IDB
class MockIDBRequest<T = unknown> {
  result?: T;
  error?: Error | null = null;
  onsuccess?: ((event: IDBTarget<MockIDBRequest<T>>) => void) | null = null;
  onerror?: ((event: IDBTarget<MockIDBRequest<T>>) => void) | null = null;

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
  public data = new Map<string, unknown>();

  get(key: string): MockIDBRequest<unknown> {
    const req = new MockIDBRequest<unknown>();
    req.resolve(this.data.get(key));
    return req;
  }

  put(value: { id: string } & Record<string, unknown>): MockIDBRequest<string> {
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

  getAll(): MockIDBRequest<unknown[]> {
    const req = new MockIDBRequest<unknown[]>();
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

  createObjectStore(name: string) {
    const store = new MockIDBObjectStore();
    this.stores.set(name, store);
    return store;
  }

  transaction() {
    const tx = {
      objectStore: (name: string) => {
        let store = this.stores.get(name);
        if (!store) {
          store = new MockIDBObjectStore();
          this.stores.set(name, store);
        }
        return store;
      },
      oncomplete: null as ((ev: IDBTarget<unknown>) => void) | null,
      onerror: null as ((ev: IDBTarget<unknown>) => void) | null,
    };
    setTimeout(() => {
      if (tx.oncomplete) tx.oncomplete({ target: tx });
    }, 20);
    return tx;
  }
}

interface MockOpenRequest {
  result: MockIDBDatabase;
  onsuccess: ((ev: IDBTarget<MockOpenRequest>) => void) | null;
  onerror: ((ev: IDBTarget<MockOpenRequest>) => void) | null;
  onupgradeneeded: ((ev: IDBTarget<{ result: MockIDBDatabase }>) => void) | null;
}

function createMockIndexedDB() {
  const db = new MockIDBDatabase();
  db.createObjectStore(STORE);

  return {
    _db: db,
    open: jest.fn().mockImplementation(() => {
      const openReq: MockOpenRequest = {
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
  let originalIndexedDB: unknown;

  beforeAll(() => {
    // Map Node stream classes into jest environment if missing on window
    const nodeGlobal = global as unknown as Record<string, unknown>;
    const gt = globalThis as unknown as Record<string, unknown>;
    const win = window as unknown as Record<string, unknown>;

    if (typeof gt.CompressionStream === 'undefined' && nodeGlobal.CompressionStream) {
      gt.CompressionStream = nodeGlobal.CompressionStream;
    }
    if (typeof gt.DecompressionStream === 'undefined' && nodeGlobal.DecompressionStream) {
      gt.DecompressionStream = nodeGlobal.DecompressionStream;
    }
    if (typeof win.CompressionStream === 'undefined' && nodeGlobal.CompressionStream) {
      win.CompressionStream = nodeGlobal.CompressionStream;
    }
    if (typeof win.DecompressionStream === 'undefined' && nodeGlobal.DecompressionStream) {
      win.DecompressionStream = nodeGlobal.DecompressionStream;
    }
  });

  const sampleGraph: AdventureGraph = {
    nodes: [
      {
        id: 'loc-1',
        name: 'Biblioteka Orne',
        type: 'location',
        description: 'Mroczne sale pełne zakazanych woluminów.',
        leadInClueIds: [],
        leadOutClueIds: [],
        locationId: 'loc-1',
      },
      {
        id: 'npc-1',
        name: 'Profesor Armitage',
        type: 'npc',
        description: 'Uczony o głębokiej wiedzy o Necronomiconie.',
        leadInClueIds: [],
        leadOutClueIds: [],
        npcIds: ['npc-1'],
      },
    ],
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
        toId: 'clue-1',
        description: 'Profesor badał ten fragment.',
      },
    ],
  };

  const sampleAdventure: CustomAdventure = {
    id: 'dunwich-horror-custom',
    title: 'Zgroza w Dunwich',
    era: 'classic',
    eraLabel: 'Klasyczne lata 20.',
    yearRange: '1928',
    location: 'Dunwich, Massachusetts',
    country: 'USA',
    tone: 'purist',
    themes: ['kosmiczny horror', 'izolacja', 'tajemnica rodziny Whateley'],
    suggestedOccupations: ['profesor', 'detektyw', 'antykwariusz'],
    suggestedArchetypes: ['scholar', 'investigator'],
    hook: 'Seria dziwnych zgonów bydła i trzęsienia ziemi w odciętej od świata dolinie.',
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
    const gt = globalThis as unknown as Record<string, unknown>;
    originalIndexedDB = gt.indexedDB;
    mockIDB = createMockIndexedDB();
    gt.indexedDB = mockIDB;
  });

  afterEach(() => {
    const gt = globalThis as unknown as Record<string, unknown>;
    gt.indexedDB = originalIndexedDB;
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
      const rawJson = JSON.stringify({ graph: sampleGraph, note: 'fallback' });
      const decompressed = await decompressPayload<{ note: string }>(rawJson);
      expect(decompressed?.note).toBe('fallback');
    });

    it('decompressPayload zwraca null dla pustych lub uszkodzonych danych', async () => {
      expect(await decompressPayload('')).toBeNull();
      expect(await decompressPayload('corrupt-base64-!@#$%^&*')).toBeNull();
    });
  });

  describe('Ekstrakcja, oczyszczanie i rekonstrukcja struktur przygody', () => {
    it('wyodrębnia ciężki graf, syntezę, lorebook, zagadki i wycinki handoutów, nie pozostawiając ich w leanAdv', () => {
      const fullAdv: CustomAdventure = {
        ...sampleAdventure,
        lorebookData: {
          id: 'lb-1',
          title: 'Wielka Księga Necronomiconu',
          documentType: 'setting',
          regionOrTheme: 'Arkham',
          summary: 'Księga wiedzy tajemnej',
        },
        puzzles: [
          {
            id: 'puz-1',
            title: 'Szyfr Johna Dee',
            description: 'Starożytny szyfr',
            solutionSummary: 'Odczytanie w lustrze',
          },
        ],
        handouts: [
          {
            slug: 'list-z-arkham',
            title: 'List z Arkham',
            image: '/handouts/list.png',
            handoutType: 'letter',
          },
        ],
      };
      const advWithNarrative = {
        ...fullAdv,
        fullNarrativeSummary: 'Bardzo długa synteza narracyjna...',
      };

      const { leanAdv, heavyData, hasHeavy } = extractHeavyData(advWithNarrative as unknown as CustomAdventure);
      expect(hasHeavy).toBe(true);
      expect(heavyData.graph).toEqual(sampleGraph);
      expect(heavyData.fullNarrativeSummary).toBe('Bardzo długa synteza narracyjna...');
      expect(heavyData.lorebookData).toBeDefined();
      expect(heavyData.puzzles).toHaveLength(1);
      expect(heavyData.handouts).toHaveLength(1);

      // leanAdv NIE MOŻE zawierać ciężkich struktur uncompressed
      expect(leanAdv.graph?.npcs).toEqual([]);
      expect(leanAdv.graph?.locations).toEqual([]);
      expect(leanAdv.title).toBe(sampleAdventure.title);
      expect(leanAdv.lorebookData).toBeUndefined();
      expect(leanAdv.puzzles).toBeUndefined();
      expect(leanAdv.handouts).toBeUndefined();
      expect((leanAdv as unknown as Record<string, unknown>).fullNarrativeSummary).toBeUndefined();
    });

    it('bezstratnie rekonstruuje pełną przygodę ze skompresowanego rekordu', async () => {
      const advToTest: CustomAdventure = {
        ...sampleAdventure,
        lorebookData: {
          id: 'lb-kompendium',
          title: 'Kompendium',
          documentType: 'compendium',
          regionOrTheme: 'Massachusetts',
          summary: 'Kompendium wiedzy',
        },
        handouts: [
          {
            slug: 'mapa-arkham',
            title: 'Mapa Arkham',
            image: '/handouts/mapa.png',
            handoutType: 'map',
          },
        ],
      };
      const { leanAdv, heavyData } = extractHeavyData(advToTest);
      const compressed = await compressPayload(heavyData);

      const record: StoredAdventureRecord = {
        id: advToTest.id,
        adventure: leanAdv,
        compressedPayload: compressed!,
        isCompressed: true,
        updatedAt: Date.now(),
      };

      const restored = await reconstructAdventure(record);
      expect(restored.id).toBe(advToTest.id);
      expect(restored.graph).toEqual(sampleGraph);
      expect(restored.lorebookData?.title).toBe('Kompendium');
      expect(restored.handouts?.[0].title).toBe('Mapa Arkham');
    });

    it('hydrateLeanAdventure bezpiecznie uzupełnia brakujące tablice i obiekty', () => {
      const bareMeta = {
        id: 'bare-1',
        title: 'Tylko tytuł',
      };
      const hydrated = hydrateLeanAdventure(bareMeta);
      expect(hydrated.id).toBe('bare-1');
      expect(hydrated.title).toBe('Tylko tytuł');
      expect(Array.isArray(hydrated.themes)).toBe(true);
      expect(hydrated.themes.length).toBeGreaterThan(0);
      expect(hydrated.graph).toEqual({ nodes: [], npcs: [], locations: [], clues: [], connections: [] });
      expect(Array.isArray(hydrated.suggestedOccupations)).toBe(true);

      expect(hydrated.hook).toBeDefined();
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

    it('wczytuje pełne przygody z decompresją struktur grafu w pojedynczej transakcji', async () => {
      await saveCustomAdventures({
        adventures: [sampleAdventure],
        activeId: sampleAdventure.id,
      });

      _resetDBCache();

      const loaded = await loadCustomAdventures();
      expect(loaded.adventures).toHaveLength(1);
      expect(loaded.adventures[0].id).toBe(sampleAdventure.id);
      expect(loaded.adventures[0].title).toBe(sampleAdventure.title);
      expect(loaded.adventures[0].graph).toEqual(sampleGraph);
      expect(loaded.activeId).toBe(sampleAdventure.id);
    });

    it('usuwa skasowane przygody z IndexedDB przy ponownym zapisie', async () => {
      const adv2: CustomAdventure = {
        ...sampleAdventure,
        id: 'adv-2',
        title: 'Cień nad Innsmouth',
      };

      await saveCustomAdventures({
        adventures: [sampleAdventure, adv2],
        activeId: sampleAdventure.id,
      });

      const store = mockIDB._db.stores.get(STORE)!;
      expect(store.data.has('adv-2')).toBe(true);

      // Usunięcie adv2 z listy
      await saveCustomAdventures({
        adventures: [sampleAdventure],
        activeId: sampleAdventure.id,
      });

      // adv2 powinno zostać usunięte z IndexedDB
      expect(store.data.has('adv-2')).toBe(false);
      const meta = store.data.get(META_RECORD_KEY) as StoredMetaRecord;
      expect(meta.adventureIds).toEqual([sampleAdventure.id]);
    });
  });

  describe('Wsteczna kompatybilność i migracja ze schematu v1 (legacy default record)', () => {
    it('automatycznie i bezstratnie migruje legacy rekord default do per-rekordów i __meta__', async () => {
      const store = mockIDB._db.stores.get(STORE)!;
      const legacyRecord: LegacyStoredRecord = {
        id: LEGACY_RECORD_KEY,
        adventures: [
          sampleAdventure,
          {
            ...sampleAdventure,
            id: 'legacy-2',
            title: 'Legacy Adventure 2',
          },
        ],
        activeId: 'legacy-2',
        updatedAt: Date.now() - 10000,
      };

      store.data.set(LEGACY_RECORD_KEY, legacyRecord);

      const loaded = await loadCustomAdventures();
      expect(loaded.adventures).toHaveLength(2);
      expect(loaded.activeId).toBe('legacy-2');

      // Rekord default musi być usunięty po migracji
      expect(store.data.has(LEGACY_RECORD_KEY)).toBe(false);

      // Rekordy muszą być zapisane per-id
      expect(store.data.has(sampleAdventure.id)).toBe(true);
      expect(store.data.has('legacy-2')).toBe(true);
      expect(store.data.has(META_RECORD_KEY)).toBe(true);
    });

    it('migruje pusty legacy rekord default i czyści go z bazy', async () => {
      const store = mockIDB._db.stores.get(STORE)!;
      const emptyLegacy: LegacyStoredRecord = {
        id: LEGACY_RECORD_KEY,
        adventures: [],
        activeId: null,
        updatedAt: Date.now(),
      };
      store.data.set(LEGACY_RECORD_KEY, emptyLegacy);

      const loaded = await loadCustomAdventures();
      expect(loaded.adventures).toEqual([]);
      expect(store.data.has(LEGACY_RECORD_KEY)).toBe(false);
    });
  });

  describe('Ultralekka kopia metadanych w localStorage (Quota Safety & Hydration)', () => {
    it('zapisuje wyłącznie niezbędne metadane bez ciężkich grafów ani syntez', async () => {
      await saveCustomAdventures({
        adventures: [sampleAdventure],
        activeId: sampleAdventure.id,
      });

      const rawLS = localStorage.getItem(STORAGE_KEY);
      expect(rawLS).toBeDefined();

      const parsedLS = JSON.parse(rawLS!) as StoredLeanAdventures;
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
      const anyLean = leanAdv as unknown as Record<string, unknown>;
      expect(anyLean.graph).toBeUndefined();
      expect(anyLean.fullNarrativeSummary).toBeUndefined();
      expect(anyLean.puzzles).toBeUndefined();
      expect(anyLean.lorebookData).toBeUndefined();
      expect(anyLean.handouts).toBeUndefined();

      // Rozmiar wpisu powinien być bardzo mały (< 1KB)
      expect(rawLS!.length).toBeLessThan(1024);
    });

    it('ładuje dane z localStorage jako fallback gdy IndexedDB jest puste, z bezpieczną hydratacją themes i graph', async () => {
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
          isLeanBackup: true,
        })
      );

      const loaded = await loadCustomAdventures();
      expect(loaded.adventures).toHaveLength(1);
      const adv = loaded.adventures[0];
      expect(adv.id).toBe('fallback-adv');

      // Wymagane tablice i obiekty są bezpiecznie nawadniane, chroniąc UI przed slice/join/map crash
      expect(Array.isArray(adv.themes)).toBe(true);
      expect(adv.themes.slice(0, 2)).toBeDefined();
      expect(adv.themes.join(', ')).toBeDefined();
      expect(adv.graph).toBeDefined();
      expect(adv.graph?.npcs).toEqual([]);
    });

    it('nie nadpisuje IndexedDB ubogimi metadanymi gdy localStorage ma flagę isLeanBackup', async () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          adventures: [
            {
              id: 'lean-only',
              title: 'Tylko Lean',
              era: 'classic',
              eraLabel: 'Klasyczne lata 20.',
              yearRange: '1920',
              location: 'Arkham',
              country: 'USA',
              isCustom: true,
              fileName: 'lean.pdf',
            },
          ],
          activeId: 'lean-only',
          isLeanBackup: true,
        })
      );

      await loadCustomAdventures();

      // Store w IDB nie powinien zostać bezsensownie zaśmiecony ubogimi danymi
      const store = mockIDB._db.stores.get(STORE)!;
      expect(store.data.has('lean-only')).toBe(false);
    });
  });

  describe('Operacje per-rekord (saveAdventureRecord, loadAdventureRecord, deleteAdventureRecord)', () => {
    it('pozwala zapisać i wczytać pojedynczy rekord przygody oraz synchronizuje localStorage', async () => {
      await saveAdventureRecord(sampleAdventure);

      const loaded = await loadAdventureRecord(sampleAdventure.id);
      expect(loaded).toBeDefined();
      expect(loaded?.id).toBe(sampleAdventure.id);
      expect(loaded?.graph).toEqual(sampleGraph);

      const rawLS = localStorage.getItem(STORAGE_KEY);
      expect(rawLS).toContain(sampleAdventure.id);
    });

    it('pozwala usunąć pojedynczy rekord, aktualizuje __meta__ i czyści localStorage', async () => {
      await saveAdventureRecord(sampleAdventure);
      expect(await loadAdventureRecord(sampleAdventure.id)).not.toBeNull();

      await deleteAdventureRecord(sampleAdventure.id);
      expect(await loadAdventureRecord(sampleAdventure.id)).toBeNull();

      const store = mockIDB._db.stores.get(STORE)!;
      const meta = store.data.get(META_RECORD_KEY) as StoredMetaRecord;
      expect(meta.adventureIds).not.toContain(sampleAdventure.id);

      const rawLS = localStorage.getItem(STORAGE_KEY);
      expect(rawLS).not.toContain(sampleAdventure.id);
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

  describe('Normalizacja grafu węzłowego i The Alexandrian Canon (Issue #502 / M1)', () => {
    it('generuje węzły nodes ze starych struktur npcs i locations gdy węzłów brakuje', () => {
      const legacyGraph = {
        locations: [
          { id: 'loc-arkham', name: 'Ratusz w Arkham', description: 'Archiwa miejskie.', atmosphere: 'Zimny wiatr' },
          { id: 'loc-sanctum', name: 'Rytualna Krypta - Finał', description: 'Miejsce kultu.' },
        ],
        npcs: [
          { id: 'npc-cultist', name: 'Enoch Bowen', description: 'Przywódca kultu.', secret: 'Posiada czarny kryształ' },
        ],
        clues: [
          { id: 'clue-scroll', name: 'Zwój Thotha', description: 'Starożytny pergamin.' },
        ],
        connections: [
          { fromId: 'loc-arkham', toId: 'loc-sanctum', clueId: 'clue-scroll', description: 'Zwój wskazuje drogę do krypty' },
        ],
      };

      const normalized = normalizeAdventureGraph(legacyGraph);
      expect(normalized.nodes).toHaveLength(3);

      const locNode = normalized.nodes.find((n) => n.id === 'loc-arkham');
      expect(locNode).toBeDefined();
      expect(locNode?.type).toBe('location');
      expect(locNode?.leadOutClueIds).toContain('clue-scroll');

      const climaxNode = normalized.nodes.find((n) => n.id === 'loc-sanctum');
      expect(climaxNode).toBeDefined();
      expect(climaxNode?.type).toBe('climax');
      expect(climaxNode?.leadInClueIds).toContain('clue-scroll');

      const npcNode = normalized.nodes.find((n) => n.id === 'npc-cultist');
      expect(npcNode).toBeDefined();
      expect(npcNode?.type).toBe('npc');
      expect(npcNode?.secret).toBe('Posiada czarny kryształ');

      // Zachowuje wsteczne npcs i locations
      expect(normalized.npcs).toHaveLength(1);
      expect(normalized.locations).toHaveLength(2);
    });

    it('rzutuje npcs i locations z węzłów nodes chroniąc komponenty UI przed awarią', () => {
      const nodeOnlyGraph = {
        nodes: [

          {
            id: 'node-intro',
            name: 'Prolog w Kostnicy',
            type: 'intro',
            description: 'Identyfikacja ofiary morderstwa.',
            leadInClueIds: [],
            leadOutClueIds: ['clue-tag'],
            atmosphere: 'Zapach formaliny',
          },
          {
            id: 'node-coroner',
            name: 'Dr Jeffrey Corey',
            type: 'npc',
            description: 'Lekarz sądowy badający dziwne rany.',
            leadInClueIds: ['clue-tag'],
            leadOutClueIds: ['clue-scalpel'],
            secret: 'Ukrywa brakujące serce ofiary',
            statsSummary: 'Wykształcenie 75%, Medycyna 80%',
            npcIds: ['npc-corey'],
          },
          {
            id: 'node-docks',
            name: 'Opuszczone Doki w Innsmouth',
            type: 'location',
            description: 'Zbutwiałe magazyny nad rzeką Manuxet.',
            leadInClueIds: ['clue-scalpel'],
            leadOutClueIds: [],
            isBottleneck: true,
            locationId: 'loc-docks',
          },
        ],
        clues: [
          {
            id: 'clue-tag',
            name: 'Identyfikator z prosektorium',
            description: 'Numer 44-B z inicjałami J.C.',
            sourceType: 'material',
            clueType: 'core',
            targetNodeId: 'node-coroner',
          },
          {
            id: 'clue-scalpel',
            name: 'Zdobiony skalpel',
            description: 'Narzędzie wykonane ze stopu złota i meteorytu.',
            sourceType: 'material',
            clueType: 'core',
            targetNodeId: 'node-docks',
          },
        ],
        connections: [
          { fromId: 'node-intro', toId: 'node-coroner', clueId: 'clue-tag', description: 'Ślad z prosektorium' },
          { fromId: 'node-coroner', toId: 'node-docks', clueId: 'clue-scalpel', description: 'Podejrzenie dostaw ze składu portowego' },
        ],
      };

      const normalized = normalizeAdventureGraph(nodeOnlyGraph);
      // Gwarantuje, ze npcs i locations zostaly wygenerowane z nodes
      expect(normalized.npcs).toHaveLength(1);
      expect(normalized.npcs?.[0].id).toBe('npc-corey');
      expect(normalized.npcs?.[0].name).toBe('Dr Jeffrey Corey');
      expect(normalized.npcs?.[0].secret).toBe('Ukrywa brakujące serce ofiary');

      expect(normalized.locations).toHaveLength(2); // intro oraz location
      const dockLoc = normalized.locations?.find((l) => l.id === 'loc-docks');
      expect(dockLoc).toBeDefined();
      expect(dockLoc?.name).toBe('Opuszczone Doki w Innsmouth');

      // Węzły zachowane bez zmian
      expect(normalized.nodes).toHaveLength(3);
    });

    it('bezpiecznie normalizuje pusty lub uszkodzony graf zwracając domyślne tablice', () => {
      const empty = normalizeAdventureGraph(null);
      expect(empty).toEqual({
        nodes: [],
        clues: [],
        connections: [],
        npcs: [],
        locations: [],
      });

      const invalid = normalizeAdventureGraph('invalid-json');
      expect(invalid).toEqual({
        nodes: [],
        clues: [],
        connections: [],
        npcs: [],
        locations: [],
      });
    });

    it('generuje węzły nodes ze starych struktur gdy nodes jest pustą tablicą []', () => {
      const legacyWithEmptyNodes = {
        nodes: [] as AdventureNode[],
        locations: [
          { id: 'loc-miskatonic', name: 'Uniwersytet Miskatonic', description: 'Zabytkowy kampus.' },
          { id: 'loc-vault', name: 'Skarbiec - Kulminacja śledztwa', description: 'Ostateczne starcie.' },
        ],
        npcs: [
          { id: 'npc-armitage', name: 'Dr Henry Armitage', description: 'Bibliotekarz.' },
        ],
        clues: [
          { id: 'clue-book', name: 'Necronomicon', description: 'Księga w skarbcu' },
        ],
        connections: [
          { fromId: 'loc-miskatonic', toId: 'loc-vault', clueId: 'clue-book', description: 'Ścieżka do skarbca' },
        ],
      };

      const normalized = normalizeAdventureGraph(legacyWithEmptyNodes);
      expect(normalized.nodes).toHaveLength(3);
      expect(normalized.nodes.find((n) => n.id === 'loc-miskatonic')?.type).toBe('location');
      expect(normalized.nodes.find((n) => n.id === 'loc-vault')?.type).toBe('climax');
      expect(normalized.nodes.find((n) => n.id === 'npc-armitage')?.type).toBe('npc');
      expect(normalized.locations).toHaveLength(2);
      expect(normalized.npcs).toHaveLength(1);
    });

    it('bezpiecznie filtruje elementy null i falsy w tablicach wejściowych nodes, clues, connections, npcs, locations', () => {
      const corruptPayload = {
        nodes: [null, undefined, { id: 'node-clean', name: 'Czysty węzeł', type: 'location' as const }],
        clues: [null, { id: 'clue-clean', name: 'Czysta poszlaka' }],
        connections: [null, { fromId: 'node-clean', toId: 'node-clean', clueId: 'clue-clean', description: 'Pętla' }],
        npcs: [null, { id: 'npc-clean', name: 'Czysty NPC' }],
        locations: [null, { id: 'loc-clean', name: 'Czysta lokacja' }],
      };

      let result: ReturnType<typeof normalizeAdventureGraph> | null = null;
      expect(() => {
        result = normalizeAdventureGraph(corruptPayload);
      }).not.toThrow();

      expect(result).not.toBeNull();
      expect(result!.nodes).toHaveLength(1);
      expect(result!.nodes[0].id).toBe('node-clean');
      expect(result!.clues).toHaveLength(1);
      expect(result!.clues[0].id).toBe('clue-clean');
      expect(result!.connections).toHaveLength(1);
      expect(result!.npcs).toHaveLength(1);
      expect(result!.npcs[0].id).toBe('npc-clean');
      expect(result!.locations.some((l) => l.id === 'loc-clean')).toBe(true);
    });

    it('zapisuje i bezstratnie odczytuje przygodę z grafem węzłowym z IndexedDB', async () => {
      const nodeAdv: CustomAdventure = {
        ...sampleAdventure,
        id: 'node-adv-test-1',
        title: 'Cienie nad Innsmouth (Node-Based)',
        graph: normalizeAdventureGraph({
          nodes: [
            {
              id: 'node-1',
              name: 'Gilman House',
              type: 'location',
              description: 'Nędzny hotel z podejrzaną obsługą.',
              leadInClueIds: [],
              leadOutClueIds: ['clue-key'],
              atmosphere: 'Rybi odór i skrzypiące podłogi',
            },
            {
              id: 'node-2',
              name: 'Zadok Allen',
              type: 'npc',
              description: 'Miejscowy pijak znający prawdziwą historię miasteczka.',
              leadInClueIds: ['clue-whiskey'],
              leadOutClueIds: ['clue-tiara'],
              secret: 'Był świadkiem rytuałów Marshów na Rafie Diabelskiej',
            },
          ],
          clues: [
            {
              id: 'clue-key',
              name: 'Mosiężny klucz',
              description: 'Klucz do pokoju na poddaszu.',
              sourceType: 'material',
              clueType: 'core',
              targetNodeId: 'node-2',
            },
          ],
          connections: [
            { fromId: 'node-1', toId: 'node-2', clueId: 'clue-key', description: 'Notatka w pokoju wymienia Zadoka' },
          ],
        }),
      };


      // Sprawdzamy wyodrębnienie ciężkich danych przez sanitizeCustomAdventureForStorage
      const { leanAdv, heavyData, hasHeavy } = sanitizeCustomAdventureForStorage(nodeAdv);
      expect(hasHeavy).toBe(true);
      expect(heavyData.graph?.nodes).toHaveLength(2);
      expect(leanAdv.graph?.nodes).toEqual([]);

      // Zapisujemy pojedynczy rekord
      await saveAdventureRecord(nodeAdv);

      // Wczytujemy rekord z magazynu
      const loaded = await loadAdventureRecord('node-adv-test-1');
      expect(loaded).not.toBeNull();
      expect(loaded?.graph?.nodes).toHaveLength(2);
      expect(loaded?.graph?.nodes?.[0].name).toBe('Gilman House');
      expect(loaded?.graph?.nodes?.[1].secret).toBe('Był świadkiem rytuałów Marshów na Rafie Diabelskiej');

      // Weryfikujemy projekcję npcs/locations dla ochrony UI
      expect(loaded?.graph?.npcs).toHaveLength(1);
      expect(loaded?.graph?.npcs?.[0].name).toBe('Zadok Allen');
      expect(loaded?.graph?.locations).toHaveLength(1);
      expect(loaded?.graph?.locations?.[0].name).toBe('Gilman House');

      // Sprzątamy
      await deleteAdventureRecord('node-adv-test-1');
    });
  });
});

