/**
 * Unit tests for PersistentMediaCache (Issue #78 audit & retention)
 */

import {
  persistentMediaCache,
  STORES,
} from './persistent-media-cache';

interface TestCacheEntry {
  id: string;
  data?: string;
  size?: number;
  lastAccessed?: number;
  createdAt?: number;
  [key: string]: unknown;
}

interface MockRequest<T = unknown> {
  result?: T;
  error?: Error | DOMException | null;
  transaction?: { objectStore: (name: string) => MockObjectStore };
  onsuccess?: ((event: { target: MockRequest<T> }) => void) | null;
  onerror?: ((event: { target: MockRequest<T> }) => void) | null;
  onupgradeneeded?: ((event: { target: MockRequest<T> }) => void) | null;
  onblocked?: ((event: { target: MockRequest<T> }) => void) | null;
}

// Mock IDB in-memory implementation for testing
class MockCursor {
  private index = 0;
  constructor(
    private entries: [string, TestCacheEntry][],
    private onRequestSuccess: (cursor: MockCursor | null) => void
  ) {}

  get value() {
    return this.entries[this.index]?.[1];
  }

  get key() {
    return this.entries[this.index]?.[0];
  }

  continue() {
    this.index++;
    if (this.index < this.entries.length) {
      this.onRequestSuccess(this);
    } else {
      this.onRequestSuccess(null);
    }
  }
}

class MockObjectStore {
  public data = new Map<string, TestCacheEntry>();
  public indices = new Set<string>();

  get indexNames() {
    return {
      contains: (name: string) => this.indices.has(name),
    };
  }

  createIndex(name: string) {
    this.indices.add(name);
    return {};
  }

  get(key: string): MockRequest<TestCacheEntry | undefined> {
    const req: MockRequest<TestCacheEntry | undefined> = { result: this.data.get(key) };
    setTimeout(() => {
      req.result = this.data.get(key);
      if (req.onsuccess) req.onsuccess({ target: req });
    }, 0);
    return req;
  }

  put(value: TestCacheEntry): MockRequest<string> {
    this.data.set(value.id, value);
    const req: MockRequest<string> = { result: value.id };
    setTimeout(() => {
      if (req.onsuccess) req.onsuccess({ target: req });
    }, 0);
    return req;
  }

  delete(key: string): MockRequest<undefined> {
    this.data.delete(key);
    const req: MockRequest<undefined> = { result: undefined };
    setTimeout(() => {
      if (req.onsuccess) req.onsuccess({ target: req });
    }, 0);
    return req;
  }

  clear(): MockRequest<undefined> {
    this.data.clear();
    const req: MockRequest<undefined> = { result: undefined };
    setTimeout(() => {
      if (req.onsuccess) req.onsuccess({ target: req });
    }, 0);
    return req;
  }

  openCursor(): MockRequest<MockCursor | null> {
    const entries = Array.from(this.data.entries());
    const req: MockRequest<MockCursor | null> = {};
    setTimeout(() => {
      if (entries.length === 0) {
        req.result = null;
        if (req.onsuccess) req.onsuccess({ target: req });
      } else {
        const cursor = new MockCursor(entries, (nextCursor) => {
          req.result = nextCursor;
          if (req.onsuccess) req.onsuccess({ target: req });
        });
        req.result = cursor;
        if (req.onsuccess) req.onsuccess({ target: req });
      }
    }, 0);
    return req;
  }
}

class MockIDBDatabase {
  public stores = new Map<string, MockObjectStore>();

  get objectStoreNames(): DOMStringList {
    const list = Array.from(this.stores.keys()) as unknown as DOMStringList & {
      contains: (name: string) => boolean;
    };
    list.contains = (name: string) => this.stores.has(name);
    return list;
  }

  createObjectStore(name: string) {
    const store = new MockObjectStore();
    this.stores.set(name, store);
    return store;
  }

  transaction(_storeNames: string | string[], _mode?: string) {
    const tx = {
      objectStore: (name: string) => {
        let store = this.stores.get(name);
        if (!store) {
          store = new MockObjectStore();
          this.stores.set(name, store);
        }
        return store;
      },
      oncomplete: null as ((event: { target: unknown }) => void) | null,
      onerror: null as ((event: { target: unknown }) => void) | null,
      onabort: null as ((event: { target: unknown }) => void) | null,
    };
    setTimeout(() => {
      if (tx.oncomplete) tx.oncomplete({ target: tx });
    }, 0);
    return tx;
  }

  close() {}
}

function createMockIndexedDB() {
  let dbInstance = new MockIDBDatabase();

  return {
    getDb: () => dbInstance,
    open: (_name: string, _version?: number): MockRequest<MockIDBDatabase> => {
      const req: MockRequest<MockIDBDatabase> = {};
      setTimeout(() => {
        req.transaction = {
          objectStore: (name: string) => dbInstance.transaction(name).objectStore(name),
        };
        if (req.onupgradeneeded) {
          req.result = dbInstance;
          req.onupgradeneeded({ target: req });
        }
        req.result = dbInstance;
        if (req.onsuccess) {
          req.onsuccess({ target: req });
        }
      }, 0);
      return req;
    },
    deleteDatabase: (_name: string): MockRequest<undefined> => {
      dbInstance = new MockIDBDatabase();
      const req: MockRequest<undefined> = {};
      setTimeout(() => {
        if (req.onsuccess) req.onsuccess({ target: req });
      }, 0);
      return req;
    },
  };
}

interface PersistentMediaCacheInternal {
  db: IDBDatabase | null;
  dbPromise: Promise<IDBDatabase> | null;
  getMaxCacheSize: () => Promise<number>;
  ensureSpaceAvailable: (size: number) => Promise<void>;
  initDB: () => Promise<IDBDatabase>;
  isPermanentRestriction: (error: unknown) => boolean;
}

const internalPmc = persistentMediaCache as unknown as PersistentMediaCacheInternal;

describe('PersistentMediaCache (Issue #78 Retention & Audit)', () => {
  let originalIndexedDB: unknown;
  const globalRef = globalThis as unknown as { indexedDB?: unknown };

  beforeEach(() => {
    originalIndexedDB = globalRef.indexedDB;
  });

  afterEach(() => {
    globalRef.indexedDB = originalIndexedDB;
    jest.restoreAllMocks();
  });

  describe('isAvailable & Safari Private Browsing Circuit Breaker', () => {
    it('zwraca false gdy indexedDB jest niezdefiniowane', () => {
      delete globalRef.indexedDB;
      expect(persistentMediaCache.isAvailable()).toBe(false);
    });

    it('zwraca true gdy indexedDB jest dostępne i nie zablokowane', () => {
      globalRef.indexedDB = createMockIndexedDB();
      expect(persistentMediaCache.isAvailable()).toBe(true);
    });

    it('wyłącza isAvailable gdy indexedDB.open wyrzuca SecurityError (Safari Private Browsing)', async () => {
      globalRef.indexedDB = {
        open: () => {
          const req: MockRequest = { error: new Error('SecurityError: The operation is insecure.') };
          setTimeout(() => {
            if (req.onerror) req.onerror({ target: req });
          }, 0);
          return req;
        },
        deleteDatabase: () => {
          const req: MockRequest = {};
          setTimeout(() => {
            if (req.onsuccess) req.onsuccess({ target: req });
          }, 0);
          return req;
        },
      };

      await persistentMediaCache.resetDatabase();

      const success = await persistentMediaCache.set(STORES.NPC_PORTRAITS, 'test-sec', 'data:...raw');
      expect(success).toBe(false);

      expect(persistentMediaCache.isAvailable()).toBe(false);

      const getRes = await persistentMediaCache.get(STORES.NPC_PORTRAITS, 'test-sec');
      expect(getRes).toBeNull();
      const hasRes = await persistentMediaCache.has(STORES.NPC_PORTRAITS, 'test-sec');
      expect(hasRes).toBe(false);
    });

    it('nie blokuje trwale isAvailable przy błędzie przejściowym (np. UnknownError), umożliwiając ponowienie', async () => {
      let shouldFail = true;
      globalRef.indexedDB = {
        open: () => {
          const req: MockRequest = {};
          setTimeout(() => {
            if (shouldFail) {
              req.error = new Error('UnknownError: transient disk failure');
              if (req.onerror) req.onerror({ target: req });
            } else {
              const mock = createMockIndexedDB();
              const realReq = mock.open('test');
              realReq.onsuccess = (ev) => {
                req.result = ev.target.result;
                if (req.onsuccess) req.onsuccess({ target: req });
              };
            }
          }, 0);
          return req;
        },
        deleteDatabase: () => {
          const req: MockRequest = {};
          setTimeout(() => {
            if (req.onsuccess) req.onsuccess({ target: req });
          }, 0);
          return req;
        },
      };

      await persistentMediaCache.resetDatabase();

      // Pierwsza próba kończy się niepowodzeniem
      const firstSuccess = await persistentMediaCache.set(STORES.NPC_PORTRAITS, 'retry-1', 'data:...1');
      expect(firstSuccess).toBe(false);

      // Błąd przejściowy NIE powinien aktywować stałego circuit breakera!
      expect(persistentMediaCache.isAvailable()).toBe(true);

      // Po ustąpieniu błędu przejściowego kolejna próba powinna mieć szansę powodzenia
      shouldFail = false;
      const secondSuccess = await persistentMediaCache.set(STORES.NPC_PORTRAITS, 'retry-1', 'data:...1');
      expect(secondSuccess).toBe(true);
    });

    it('ustawia stan isBlocked gdy resetDatabase napotyka SecurityError', async () => {
      // Symulujemy SecurityError przy deleteDatabase
      globalRef.indexedDB = {
        open: () => ({ error: null }),
        deleteDatabase: () => {
          const req: MockRequest = { error: new Error('SecurityError: The operation is insecure.') };
          setTimeout(() => {
            if (req.onerror) req.onerror({ target: req });
          }, 0);
          return req;
        },
      };

      const resetOk = await persistentMediaCache.resetDatabase(0);
      expect(resetOk).toBe(false);
      expect(persistentMediaCache.isAvailable()).toBe(false);
    });

    it('wykrywa trwałe restrykcje bezpieczeństwa z kodem DOMException 18 lub stringiem błędu (w tym case variations)', () => {
      expect(internalPmc.isPermanentRestriction({ code: 18, name: 'SecurityError' })).toBe(true);
      expect(internalPmc.isPermanentRestriction({ code: 18, message: 'some code 18 error' })).toBe(true);
      expect(internalPmc.isPermanentRestriction({ name: 'NotAllowedError' })).toBe(true);
      expect(internalPmc.isPermanentRestriction('SecurityError: The operation is insecure.')).toBe(true);
      expect(internalPmc.isPermanentRestriction('securityerror: lower case variant')).toBe(true);
      expect(internalPmc.isPermanentRestriction('notallowederror')).toBe(true);
      expect(internalPmc.isPermanentRestriction('user was not allowed to open storage')).toBe(true);
      expect(internalPmc.isPermanentRestriction('insecure origin')).toBe(true);

      // Błędy niebędące restrykcją bezpieczeństwa
      expect(internalPmc.isPermanentRestriction({ name: 'QuotaExceededError' })).toBe(false);
      expect(internalPmc.isPermanentRestriction(new Error('Quota exceeded'))).toBe(false);
      expect(internalPmc.isPermanentRestriction(null)).toBe(false);
      expect(internalPmc.isPermanentRestriction(undefined)).toBe(false);
      expect(internalPmc.isPermanentRestriction('random transient error')).toBe(false);
    });
  });

  describe('Polityka retencji TTL (Time-To-Live)', () => {
    let mockIDB: ReturnType<typeof createMockIndexedDB>;

    beforeEach(async () => {
      mockIDB = createMockIndexedDB();
      globalRef.indexedDB = mockIDB;
      await persistentMediaCache.resetDatabase();
    });

    it('odrzuca i usuwa wpis z pamięci podręcznej podczas odczytu get() gdy upłynął TTL', async () => {
      const now = Date.now();
      // Zapisujemy kadr czatu (TTL: 14 dni)
      await persistentMediaCache.set(STORES.CHAT_IMAGES, 'chat-1', 'data:image/png;base64,AAA');

      // Manipulujemy czasem utworzenia wpisu na 15 dni wstecz
      const db = mockIDB.getDb();
      const store = db.stores.get(STORES.CHAT_IMAGES);
      const entry = store?.get('chat-1').result;
      expect(entry).toBeDefined();
      if (entry) {
        entry.createdAt = now - 15 * 24 * 60 * 60 * 1000;
        entry.lastAccessed = now - 15 * 24 * 60 * 60 * 1000;
      }

      // Odczyt get() powinien wykryć przeterminowanie, usunąć wpis i zwrócić null
      const result = await persistentMediaCache.get(STORES.CHAT_IMAGES, 'chat-1');
      expect(result).toBeNull();

      // Wpis został usunięty z magazynu
      expect(await persistentMediaCache.has(STORES.CHAT_IMAGES, 'chat-1')).toBe(false);
    });

    it('zwraca poprawny wpis z get() gdy nie upłynął TTL i aktualizuje lastAccessed', async () => {
      await persistentMediaCache.set(STORES.NPC_PORTRAITS, 'npc-1', 'data:image/png;base64,BBB');

      const result = await persistentMediaCache.get(STORES.NPC_PORTRAITS, 'npc-1');
      expect(result).toBe('data:image/png;base64,BBB');
    });

    it('wygasza rekordy legacy bez pola createdAt bazując na znaczniku lastAccessed jako fallbacku', async () => {
      const now = Date.now();
      await persistentMediaCache.set(STORES.CHAT_IMAGES, 'legacy-1', 'data:image/png;base64,LEGACY');

      const db = mockIDB.getDb();
      const store = db.stores.get(STORES.CHAT_IMAGES);
      const entry = store?.get('legacy-1').result;
      expect(entry).toBeDefined();
      if (entry) {
        // Symulujemy rekord ze starszych wersji aplikacji: brak createdAt, stary lastAccessed
        delete entry.createdAt;
        entry.lastAccessed = now - 20 * 24 * 60 * 60 * 1000; // 20 dni temu
      }

      const result = await persistentMediaCache.get(STORES.CHAT_IMAGES, 'legacy-1');
      expect(result).toBeNull();
      expect(await persistentMediaCache.has(STORES.CHAT_IMAGES, 'legacy-1')).toBe(false);
    });

    it('cleanupExpired usuwa wygasłe wpisy we wszystkich magazynach z wyjątkiem chronionych', async () => {
      const now = Date.now();
      const db = mockIDB.getDb();

      // Wpis 1: chat-images (wygasły, 16 dni)
      await persistentMediaCache.set(STORES.CHAT_IMAGES, 'c-exp', 'data:img:1');
      const chatStore = db.stores.get(STORES.CHAT_IMAGES);
      const cEntry = chatStore?.get('c-exp').result;
      if (cEntry) cEntry.createdAt = now - 16 * 24 * 60 * 60 * 1000;

      // Wpis 2: tts-audio (wygasły, 8 dni, TTL 7 dni)
      await persistentMediaCache.set(STORES.TTS_AUDIO, 'tts-exp', 'data:audio:1');
      const ttsStore = db.stores.get(STORES.TTS_AUDIO);
      const ttsEntry = ttsStore?.get('tts-exp').result;
      if (ttsEntry) ttsEntry.createdAt = now - 8 * 24 * 60 * 60 * 1000;

      // Wpis 3: tts-audio (świeży, 2 dni)
      await persistentMediaCache.set(STORES.TTS_AUDIO, 'tts-fresh', 'data:audio:2');

      // Wpis 4: character-images (nigdy nie wygasa, nawet stary)
      await persistentMediaCache.set(STORES.CHARACTER_IMAGES, 'char-old', 'data:img:char');
      const charStore = db.stores.get(STORES.CHARACTER_IMAGES);
      const charEntry = charStore?.get('char-old').result;
      if (charEntry) cEntry && (charEntry.createdAt = now - 100 * 24 * 60 * 60 * 1000);

      const deletedCount = await persistentMediaCache.cleanupExpired();
      expect(deletedCount).toBe(2);

      expect(await persistentMediaCache.has(STORES.CHAT_IMAGES, 'c-exp')).toBe(false);
      expect(await persistentMediaCache.has(STORES.TTS_AUDIO, 'tts-exp')).toBe(false);
      expect(await persistentMediaCache.has(STORES.TTS_AUDIO, 'tts-fresh')).toBe(true);
      expect(await persistentMediaCache.has(STORES.CHARACTER_IMAGES, 'char-old')).toBe(true);
    });
  });

  describe('Metoda batchDelete (Transakcje wsadowe)', () => {
    let mockIDB: ReturnType<typeof createMockIndexedDB>;

    beforeEach(async () => {
      mockIDB = createMockIndexedDB();
      globalRef.indexedDB = mockIDB;
      await persistentMediaCache.resetDatabase();
    });

    it('usuwa wiele rekordów w pojedynczej transakcji wsadowej', async () => {
      await persistentMediaCache.set(STORES.NPC_PORTRAITS, 'n-1', 'data:1');
      await persistentMediaCache.set(STORES.NPC_PORTRAITS, 'n-2', 'data:2');
      await persistentMediaCache.set(STORES.NPC_PORTRAITS, 'n-3', 'data:3');

      const deleted = await persistentMediaCache.batchDelete(STORES.NPC_PORTRAITS, ['n-1', 'n-3']);
      expect(deleted).toBe(true);

      expect(await persistentMediaCache.has(STORES.NPC_PORTRAITS, 'n-1')).toBe(false);
      expect(await persistentMediaCache.has(STORES.NPC_PORTRAITS, 'n-2')).toBe(true);
      expect(await persistentMediaCache.has(STORES.NPC_PORTRAITS, 'n-3')).toBe(false);
    });

    it('zwraca true i nie wykonuje operacji gdy tablica id jest pusta', async () => {
      const deleted = await persistentMediaCache.batchDelete(STORES.NPC_PORTRAITS, []);
      expect(deleted).toBe(true);
    });
  });

  describe('Samonaprawa i reset bazy (resetDatabase & self-healing)', () => {
    let mockIDB: ReturnType<typeof createMockIndexedDB>;

    beforeEach(() => {
      mockIDB = createMockIndexedDB();
      globalRef.indexedDB = mockIDB;
    });

    it('resetDatabase czyści bazę, reicjalizuje schemat i odblokowuje stan', async () => {
      await persistentMediaCache.set(STORES.LOCATION_IMAGES, 'loc-1', 'data:image/png;base64,LOC');
      expect(await persistentMediaCache.has(STORES.LOCATION_IMAGES, 'loc-1')).toBe(true);

      const resetOk = await persistentMediaCache.resetDatabase();
      expect(resetOk).toBe(true);

      expect(await persistentMediaCache.has(STORES.LOCATION_IMAGES, 'loc-1')).toBe(false);
      expect(persistentMediaCache.isAvailable()).toBe(true);
    });

    it('resetDatabase zwraca false gdy usunięcie bazy jest trwale zablokowane (onblocked) i nie twierdzi sukcesu', async () => {
      globalRef.indexedDB = {
        open: mockIDB.open,
        deleteDatabase: () => {
          const req: MockRequest = {};
          setTimeout(() => {
            if (req.onblocked) req.onblocked({ target: req });
          }, 0);
          return req;
        },
      };

      // Testujemy z natychmiastowym odrzuceniem na blocked (blockedTimeoutMs = 0)
      const resetOk = await persistentMediaCache.resetDatabase(0);
      expect(resetOk).toBe(false);

      // Zablokowanie przez inną kartę nie jest błędem bezpieczeństwa, więc isAvailable pozostaje true
      expect(persistentMediaCache.isAvailable()).toBe(true);
    });

    it('resetDatabase czeka na odblokowanie gdy inne połączenie zamknie się przed upływem timeoutu', async () => {
      globalRef.indexedDB = {
        open: mockIDB.open,
        deleteDatabase: () => {
          const req: MockRequest = {};
          setTimeout(() => {
            if (req.onblocked) req.onblocked({ target: req });
            // Druga karta po 10ms zwalnia połączenie i baza pomyślnie się usuwa
            setTimeout(() => {
              if (req.onsuccess) req.onsuccess({ target: req });
            }, 10);
          }, 0);
          return req;
        },
      };

      const resetOk = await persistentMediaCache.resetDatabase(200);
      expect(resetOk).toBe(true);
      expect(persistentMediaCache.isAvailable()).toBe(true);
    });

    it('resetDatabase poprawnie czeka i zamyka połączenie gdy initDB było w trakcie otwierania', async () => {
      const mock = createMockIndexedDB();
      globalRef.indexedDB = mock;

      // Inicjujemy asynchroniczne otwarcie DB
      const inFlightInit = persistentMediaCache.get(STORES.NPC_PORTRAITS, 'test');

      // Bezpośrednio po tym wywołujemy resetDatabase
      const resetOk = await persistentMediaCache.resetDatabase();
      expect(resetOk).toBe(true);

      await inFlightInit;
      expect(persistentMediaCache.isAvailable()).toBe(true);
    });

    it('resetDatabase nie zawiesza się w nieskończoność gdy initDB wisi na wiecznie otwartym żądaniu (timeout pre-drain)', async () => {
      let openCallCount = 0;
      let deleteCalled = false;
      const mock = createMockIndexedDB();

      globalRef.indexedDB = {
        open: (_name: string, _version?: number) => {
          openCallCount++;
          if (openCallCount === 1) {
            // Pierwsze wywołanie wisi i nigdy nie rozstrzyga ani nie odrzuca
            return {} as MockRequest;
          }
          return mock.open(_name, _version);
        },
        deleteDatabase: (_name: string) => {
          deleteCalled = true;
          const req: MockRequest = {};
          setTimeout(() => {
            if (req.onsuccess) req.onsuccess({ target: req });
          }, 0);
          return req;
        },
      };

      // Czyścimy instancję, by wymusić ponowne wywołanie initDB
      internalPmc.db = null;
      internalPmc.dbPromise = null;

      // Rozpoczynamy operację, która uruchamia wiszący initDB
      persistentMediaCache.get(STORES.NPC_PORTRAITS, 'hang-test');
      expect(openCallCount).toBe(1);

      const startTime = Date.now();
      // resetDatabase z limitem czasu 50ms - przed poprawką wisiało w nieskończoność
      const resetOk = await persistentMediaCache.resetDatabase({ blockedTimeoutMs: 50 });
      const elapsed = Date.now() - startTime;

      expect(resetOk).toBe(true);
      expect(deleteCalled).toBe(true);
      expect(elapsed).toBeLessThan(1500);
      expect(persistentMediaCache.isAvailable()).toBe(true);
    });
  });

  describe('Sufit bezpieczeństwa pojemności & Eksmisja LRU (Storage Quota & Eviction)', () => {
    let mockIDB: ReturnType<typeof createMockIndexedDB>;

    beforeEach(async () => {
      mockIDB = createMockIndexedDB();
      globalRef.indexedDB = mockIDB;
      await persistentMediaCache.resetDatabase();
    });

    it('ogranicza maksymalny cache do 150 MB nawet gdy przeglądarka raportuje 500 GB wolnego miejsca', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          storage: {
            estimate: jest.fn().mockResolvedValue({
              quota: 500 * 1024 * 1024 * 1024, // 500 GB
              usage: 10 * 1024 * 1024,
            }),
          },
        },
        writable: true,
        configurable: true,
      });

      const maxSize = await internalPmc.getMaxCacheSize();
      expect(maxSize).toBe(150 * 1024 * 1024);
    });

    it('respektuje mniejszą pulę gdy przeglądarka przydzieliła mały quota (np. 50 MB w Safari)', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          storage: {
            estimate: jest.fn().mockResolvedValue({
              quota: 50 * 1024 * 1024, // 50 MB
              usage: 1 * 1024 * 1024,
            }),
          },
        },
        writable: true,
        configurable: true,
      });

      const maxSize = await internalPmc.getMaxCacheSize();
      expect(maxSize).toBe(40 * 1024 * 1024);
    });

    it('egzekwuje politykę LRU: najpierw czyści wygasłe, usuwa najstarsze niechronione i BEZWZGLĘDNIE CHRONI character-images', async () => {
      // Symulujemy mały limit cache = 6000 bajtów
      jest.spyOn(internalPmc, 'getMaxCacheSize').mockResolvedValue(6000);

      const db = mockIDB.getDb();

      // 1. Zapisujemy chroniony portret badacza (2000 B, najstarszy timestamp!)
      await persistentMediaCache.set(
        STORES.CHARACTER_IMAGES,
        'char:inv-1:portrait',
        'data:image/png;base64,' + 'A'.repeat(2000)
      );
      const charStore = db.stores.get(STORES.CHARACTER_IMAGES);
      const charEntry = charStore?.get('char:inv-1:portrait').result;
      if (charEntry) {
        charEntry.lastAccessed = Date.now() - 30 * 24 * 3600 * 1000; // 30 dni temu
      }

      // 2. Zapisujemy wygasły kadr czatu (15 dni temu, TTL = 14 dni) (1500 B)
      await persistentMediaCache.set(
        STORES.CHAT_IMAGES,
        'chat:expired',
        'data:image/png;base64,' + 'B'.repeat(1500)
      );
      const chatStore = db.stores.get(STORES.CHAT_IMAGES);
      const chatExpEntry = chatStore?.get('chat:expired').result;
      if (chatExpEntry) {
        chatExpEntry.createdAt = Date.now() - 15 * 24 * 3600 * 1000;
        chatExpEntry.lastAccessed = Date.now() - 1 * 3600 * 1000;
      }

      // 3. Zapisujemy stary niechroniony portret NPC (2000 B, lastAccessed 5 dni temu)
      await persistentMediaCache.set(
        STORES.NPC_PORTRAITS,
        'npc:old',
        'data:image/png;base64,' + 'C'.repeat(2000)
      );
      const npcStore = db.stores.get(STORES.NPC_PORTRAITS);
      const npcOldEntry = npcStore?.get('npc:old').result;
      if (npcOldEntry) {
        npcOldEntry.lastAccessed = Date.now() - 5 * 24 * 3600 * 1000;
      }

      // 4. Zapisujemy świeży portret NPC (2000 B, lastAccessed przed chwilą)
      await persistentMediaCache.set(
        STORES.NPC_PORTRAITS,
        'npc:fresh',
        'data:image/png;base64,' + 'D'.repeat(2000)
      );

      // Aktualny rozmiar w mocku przekracza 6000 B. Wywołujemy ensureSpaceAvailable dla nowego zapisu 1000 B.
      await internalPmc.ensureSpaceAvailable(1000);

      // Asercje:
      // a) Wpis wygasły 'chat:expired' został bezwzględnie usunięty w kroku 1 (TTL purge)
      expect(await persistentMediaCache.has(STORES.CHAT_IMAGES, 'chat:expired')).toBe(false);

      // b) Najstarszy niechroniony wpis 'npc:old' został wyeksmitowany przez LRU
      expect(await persistentMediaCache.has(STORES.NPC_PORTRAITS, 'npc:old')).toBe(false);

      // c) NAJWAŻNIEJSZE: chroniony portret badacza 'char:inv-1:portrait' OCALAŁ,
      // mimo że posiadał najstarszy znacznik lastAccessed ze wszystkich rekordów!
      expect(await persistentMediaCache.has(STORES.CHARACTER_IMAGES, 'char:inv-1:portrait')).toBe(true);

      // d) Świeży wpis 'npc:fresh' pozostał nienaruszony
      expect(await persistentMediaCache.has(STORES.NPC_PORTRAITS, 'npc:fresh')).toBe(true);
    });

    it('odrzuca wpis większy niż maxCacheSize w set() i nie usuwa istniejącego cache', async () => {
      jest.spyOn(internalPmc, 'getMaxCacheSize').mockResolvedValue(5000);

      // Zapisujemy normalny poprawny wpis
      await persistentMediaCache.set(
        STORES.NPC_PORTRAITS,
        'valid-entry',
        'data:image/png;base64,' + 'A'.repeat(1000)
      );
      expect(await persistentMediaCache.has(STORES.NPC_PORTRAITS, 'valid-entry')).toBe(true);

      // Próbujemy zapisać pojedynczy wpis o rozmiarze 8000 B > maxCacheSize (5000 B)
      const oversizedData = 'data:image/png;base64,' + 'Z'.repeat(8000);
      const setSuccess = await persistentMediaCache.set(
        STORES.NPC_PORTRAITS,
        'oversized-entry',
        oversizedData
      );

      expect(setSuccess).toBe(false);
      expect(await persistentMediaCache.has(STORES.NPC_PORTRAITS, 'oversized-entry')).toBe(false);

      // Wcześniejszy poprawny wpis NIE został wyeksmitowany przez próbę zapisu olbrzyma
      expect(await persistentMediaCache.has(STORES.NPC_PORTRAITS, 'valid-entry')).toBe(true);
    });

    it('ensureSpaceAvailable nie usuwa wpisów gdy requiredSize przekracza maxCacheSize', async () => {
      jest.spyOn(internalPmc, 'getMaxCacheSize').mockResolvedValue(4000);

      await persistentMediaCache.set(
        STORES.CHAT_IMAGES,
        'chat-item',
        'data:image/png;base64,' + 'C'.repeat(1000)
      );
      expect(await persistentMediaCache.has(STORES.CHAT_IMAGES, 'chat-item')).toBe(true);

      // Wywołujemy bezpośrednio ensureSpaceAvailable z rozmiarem 10000 B > 4000 B
      await internalPmc.ensureSpaceAvailable(10000);

      // Wpis chat-item NIE powinien zostać skasowany
      expect(await persistentMediaCache.has(STORES.CHAT_IMAGES, 'chat-item')).toBe(true);
    });

    it('zwalnia miejsce gdy stats.totalSize <= maxCacheSize * 0.8 ale po dodaniu requiredSize suma przekroczy maxCacheSize', async () => {
      // maxCacheSize = 6000, 80% = 4800
      jest.spyOn(internalPmc, 'getMaxCacheSize').mockResolvedValue(6000);

      // Zapisujemy 2 wpisy po 2000 B (razem 4000 B <= 4800 B)
      await persistentMediaCache.set(
        STORES.NPC_PORTRAITS,
        'entry-1',
        'data:image/png;base64,' + 'A'.repeat(2000)
      );
      await persistentMediaCache.set(
        STORES.NPC_PORTRAITS,
        'entry-2',
        'data:image/png;base64,' + 'B'.repeat(2000)
      );

      expect(await persistentMediaCache.has(STORES.NPC_PORTRAITS, 'entry-1')).toBe(true);
      expect(await persistentMediaCache.has(STORES.NPC_PORTRAITS, 'entry-2')).toBe(true);

      // Nowy wpis wymaga 3000 B.
      // 4000 B + 3000 B = 7000 B > 6000 B.
      // Poprzednio bug powodował break bo 4000 <= 4800 (targetSize), nic nie było usuwane!
      // Z naszą poprawką targetSize = min(4800, 6000 - 3000) = 3000 B.
      // Więc najstarszy wpis entry-1 (2000 B) MUSI zostać usunięty, zwalniając miejsce na 3000 B.
      await internalPmc.ensureSpaceAvailable(3000);

      expect(await persistentMediaCache.has(STORES.NPC_PORTRAITS, 'entry-1')).toBe(false);
      expect(await persistentMediaCache.has(STORES.NPC_PORTRAITS, 'entry-2')).toBe(true);
    });
  });

  describe('Migracja schematu bazy danych (Schema Migration)', () => {
    it('w onupgradeneeded tworzy brakujące indeksy dla istniejących magazynów', async () => {
      // Przygotowujemy mock bazy z już istniejącym store'em ze starej wersji (bez createdAt i size)
      const mockIDB = createMockIndexedDB();
      const existingDb = mockIDB.getDb();
      const existingStore = existingDb.createObjectStore(STORES.NPC_PORTRAITS);
      existingStore.createIndex('lastAccessed');

      globalRef.indexedDB = mockIDB;

      // Zamykamy poprzednie połączenie i reinicjalizujemy bazę
      if (internalPmc.db) {
        internalPmc.db.close();
        internalPmc.db = null;
      }
      internalPmc.dbPromise = null;

      await internalPmc.initDB();

      // Sprawdzenie czy istniejący store zyskał brakujące indeksy
      expect(existingStore.indices.has('lastAccessed')).toBe(true);
      expect(existingStore.indices.has('createdAt')).toBe(true);
      expect(existingStore.indices.has('size')).toBe(true);
    });
  });
});
