/**
 * Unit tests for PersistentMediaCache (Issue #78 audit & retention)
 */

import {
  persistentMediaCache,
  STORES,
  PROTECTED_STORES,
  DEFAULT_STORE_TTL_MS,
  StoreName,
} from './persistent-media-cache';

// Mock IDB in-memory implementation for testing
class MockCursor {
  private index = 0;
  constructor(
    private entries: [string, any][],
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
  public data = new Map<string, any>();
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

  get(key: string) {
    const req: any = { result: this.data.get(key) };
    setTimeout(() => {
      req.result = this.data.get(key);
      if (req.onsuccess) req.onsuccess({ target: req });
    }, 0);
    return req;
  }

  put(value: any) {
    this.data.set(value.id, value);
    const req: any = { result: value.id };
    setTimeout(() => {
      if (req.onsuccess) req.onsuccess({ target: req });
    }, 0);
    return req;
  }

  delete(key: string) {
    this.data.delete(key);
    const req: any = { result: undefined };
    setTimeout(() => {
      if (req.onsuccess) req.onsuccess({ target: req });
    }, 0);
    return req;
  }

  clear() {
    this.data.clear();
    const req: any = { result: undefined };
    setTimeout(() => {
      if (req.onsuccess) req.onsuccess({ target: req });
    }, 0);
    return req;
  }

  openCursor() {
    const entries = Array.from(this.data.entries());
    const req: any = {};
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

  get objectStoreNames() {
    const list = Array.from(this.stores.keys()) as any;
    list.contains = (name: string) => this.stores.has(name);
    return list;
  }

  createObjectStore(name: string) {
    const store = new MockObjectStore();
    this.stores.set(name, store);
    return store;
  }

  transaction(storeNames: string | string[], _mode?: string) {
    const tx: any = {
      objectStore: (name: string) => {
        let store = this.stores.get(name);
        if (!store) {
          store = new MockObjectStore();
          this.stores.set(name, store);
        }
        return store;
      },
      oncomplete: null,
      onerror: null,
      onabort: null,
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
    open: (_name: string, _version?: number) => {
      const req: any = {};
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
    deleteDatabase: (_name: string) => {
      dbInstance = new MockIDBDatabase();
      const req: any = {};
      setTimeout(() => {
        if (req.onsuccess) req.onsuccess({ target: req });
      }, 0);
      return req;
    },
  };
}

describe('PersistentMediaCache (Issue #78 Retention & Audit)', () => {
  let originalIndexedDB: any;

  beforeEach(() => {
    originalIndexedDB = (global as any).indexedDB;
  });

  afterEach(() => {
    (global as any).indexedDB = originalIndexedDB;
    jest.restoreAllMocks();
  });

  describe('isAvailable & Safari Private Browsing Circuit Breaker', () => {
    it('zwraca false gdy indexedDB jest niezdefiniowane', () => {
      delete (global as any).indexedDB;
      expect(persistentMediaCache.isAvailable()).toBe(false);
    });

    it('zwraca true gdy indexedDB jest dostępne i nie zablokowane', () => {
      (global as any).indexedDB = createMockIndexedDB();
      expect(persistentMediaCache.isAvailable()).toBe(true);
    });

    it('wyłącza isAvailable gdy indexedDB.open wyrzuca SecurityError (Safari Private Browsing)', async () => {
      (global as any).indexedDB = {
        open: () => {
          const req: any = { error: new Error('SecurityError: The operation is insecure.') };
          setTimeout(() => {
            if (req.onerror) req.onerror({ target: req });
          }, 0);
          return req;
        },
        deleteDatabase: () => {
          const req: any = {};
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
      (global as any).indexedDB = {
        open: () => {
          const req: any = {};
          setTimeout(() => {
            if (shouldFail) {
              req.error = new Error('UnknownError: transient disk failure');
              if (req.onerror) req.onerror({ target: req });
            } else {
              const mock = createMockIndexedDB();
              const realReq = mock.open('test');
              realReq.onsuccess = (ev: any) => {
                req.result = ev.target.result;
                if (req.onsuccess) req.onsuccess({ target: req });
              };
            }
          }, 0);
          return req;
        },
        deleteDatabase: () => {
          const req: any = {};
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
      (global as any).indexedDB = {
        open: () => ({ error: null }),
        deleteDatabase: () => {
          const req: any = { error: new Error('SecurityError: The operation is insecure.') };
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
      const pmc = persistentMediaCache as any;
      expect(pmc.isPermanentRestriction({ code: 18, name: 'SecurityError' })).toBe(true);
      expect(pmc.isPermanentRestriction({ code: 18, message: 'some code 18 error' })).toBe(true);
      expect(pmc.isPermanentRestriction('SecurityError: The operation is insecure.')).toBe(true);
      expect(pmc.isPermanentRestriction('securityerror: the operation is insecure.')).toBe(true);
      expect(pmc.isPermanentRestriction('SECURITYERROR: ACCESS DENIED')).toBe(true);
      expect(pmc.isPermanentRestriction('NotAllowedError: user denied storage access')).toBe(true);
      expect(pmc.isPermanentRestriction('notallowederror: user denied')).toBe(true);
      expect(pmc.isPermanentRestriction({ name: 'securityerror', message: '' })).toBe(true);
      expect(pmc.isPermanentRestriction({ name: 'notallowederror', message: '' })).toBe(true);
      expect(pmc.isPermanentRestriction({ name: 'Error', message: 'The user denied permission (not allowed)' })).toBe(true);
      expect(pmc.isPermanentRestriction('UnknownError: transient')).toBe(false);
      expect(pmc.isPermanentRestriction(null)).toBe(false);
    });
  });

  describe('Konfiguracja retencji i ochrona store', () => {
    it('chroni character-images przed eksmisją LRU', () => {
      expect(PROTECTED_STORES.has(STORES.CHARACTER_IMAGES)).toBe(true);
      expect(PROTECTED_STORES.has(STORES.CHAT_IMAGES)).toBe(false);
      expect(PROTECTED_STORES.has(STORES.NPC_PORTRAITS)).toBe(false);
      expect(PROTECTED_STORES.has(STORES.LOCATION_IMAGES)).toBe(false);
      expect(PROTECTED_STORES.has(STORES.TTS_AUDIO)).toBe(false);
    });

    it('definiuje odpowiednie TTL dla wszystkich magazynów', () => {
      expect(DEFAULT_STORE_TTL_MS[STORES.CHARACTER_IMAGES]).toBe(Infinity);
      expect(DEFAULT_STORE_TTL_MS[STORES.NPC_PORTRAITS]).toBe(30 * 24 * 3600 * 1000);
      expect(DEFAULT_STORE_TTL_MS[STORES.LOCATION_IMAGES]).toBe(30 * 24 * 3600 * 1000);
      expect(DEFAULT_STORE_TTL_MS[STORES.CHAT_IMAGES]).toBe(14 * 24 * 3600 * 1000);
      expect(DEFAULT_STORE_TTL_MS[STORES.TTS_AUDIO]).toBe(7 * 24 * 3600 * 1000);
      expect(DEFAULT_STORE_TTL_MS[STORES.SFX_AUDIO]).toBe(7 * 24 * 3600 * 1000);
    });
  });

  describe('Generatory kluczy i helpery', () => {
    it('generateTtsCacheKey generuje znormalizowany deterministyczny klucz', () => {
      const key1 = persistentMediaCache.generateTtsCacheKey(
        ' Witaj w Arkham! ',
        'Kore',
        0,
        1.0
      );
      const key2 = persistentMediaCache.generateTtsCacheKey(
        'witaj w arkham!',
        'Kore',
        0,
        1.0
      );
      expect(key1).toBe(key2);
      expect(key1).toContain('Kore_0_1_');
    });

    it('generateSfxCacheKey generuje hash z promptu', () => {
      const key1 = persistentMediaCache.generateSfxCacheKey('Kroki na schodach');
      const key2 = persistentMediaCache.generateSfxCacheKey('kroki na schodach');
      expect(key1).toBe(key2);
      expect(typeof key1).toBe('string');
    });
  });

  describe('Operacje CRUD, wygasanie TTL i reset bazy', () => {
    let mockIDB: ReturnType<typeof createMockIndexedDB>;

    beforeEach(async () => {
      mockIDB = createMockIndexedDB();
      (global as any).indexedDB = mockIDB;
      await persistentMediaCache.resetDatabase();
    });

    it('zapisuje i odczytuje dane z magazynu', async () => {
      const testData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const success = await persistentMediaCache.set(
        STORES.NPC_PORTRAITS,
        'npc-123',
        testData,
        { prompt: 'Stary antykwariusz' }
      );
      expect(success).toBe(true);

      const hasItem = await persistentMediaCache.has(STORES.NPC_PORTRAITS, 'npc-123');
      expect(hasItem).toBe(true);

      const retrieved = await persistentMediaCache.get(STORES.NPC_PORTRAITS, 'npc-123');
      expect(retrieved).toBe(testData);
    });

    it('automatycznie usuwa wpis wygasły wg polityki TTL przy get()', async () => {
      const testData = 'data:audio/mp3;base64,SUQzBAAAAAAA';
      await persistentMediaCache.set(STORES.TTS_AUDIO, 'tts-expired', testData);

      const db = mockIDB.getDb();
      const store = db.stores.get(STORES.TTS_AUDIO);
      const entry = store?.get('tts-expired').result;
      if (entry) {
        entry.createdAt = Date.now() - 8 * 24 * 3600 * 1000;
      }

      const retrieved = await persistentMediaCache.get(STORES.TTS_AUDIO, 'tts-expired');
      expect(retrieved).toBeNull();

      const hasItem = await persistentMediaCache.has(STORES.TTS_AUDIO, 'tts-expired');
      expect(hasItem).toBe(false);
    });

    it('automatycznie usuwa wpis legacy bez createdAt przy get() na bazie lastAccessed', async () => {
      const testData = 'data:image/png;base64,LEGACY';
      await persistentMediaCache.set(STORES.CHAT_IMAGES, 'chat-legacy', testData);

      const db = mockIDB.getDb();
      const store = db.stores.get(STORES.CHAT_IMAGES);
      const entry = store?.get('chat-legacy').result;
      if (entry) {
        delete entry.createdAt;
        entry.lastAccessed = Date.now() - 20 * 24 * 3600 * 1000;
      }

      const retrieved = await persistentMediaCache.get(STORES.CHAT_IMAGES, 'chat-legacy');
      expect(retrieved).toBeNull();
      expect(await persistentMediaCache.has(STORES.CHAT_IMAGES, 'chat-legacy')).toBe(false);
    });

    it('cleanupExpired usuwa wygasłe wpisy z ulotnych magazynów w transakcji batch', async () => {
      await persistentMediaCache.set(STORES.CHAT_IMAGES, 'chat-old', 'data:image/png;base64,OLD');
      await persistentMediaCache.set(STORES.CHAT_IMAGES, 'chat-fresh', 'data:image/png;base64,FRESH');

      const db = mockIDB.getDb();
      const store = db.stores.get(STORES.CHAT_IMAGES);
      const oldEntry = store?.get('chat-old').result;
      if (oldEntry) {
        oldEntry.createdAt = Date.now() - 15 * 24 * 3600 * 1000;
      }

      const deletedCount = await persistentMediaCache.cleanupExpired();
      expect(deletedCount).toBe(1);

      expect(await persistentMediaCache.has(STORES.CHAT_IMAGES, 'chat-old')).toBe(false);
      expect(await persistentMediaCache.has(STORES.CHAT_IMAGES, 'chat-fresh')).toBe(true);
    });

    it('batchDelete usuwa wiele kluczy jednocześnie', async () => {
      await persistentMediaCache.set(STORES.SFX_AUDIO, 'sfx-1', 'data:audio/wav;base64,1');
      await persistentMediaCache.set(STORES.SFX_AUDIO, 'sfx-2', 'data:audio/wav;base64,2');
      await persistentMediaCache.set(STORES.SFX_AUDIO, 'sfx-3', 'data:audio/wav;base64,3');

      const deleted = await persistentMediaCache.batchDelete(STORES.SFX_AUDIO, ['sfx-1', 'sfx-2']);
      expect(deleted).toBe(true);

      expect(await persistentMediaCache.has(STORES.SFX_AUDIO, 'sfx-1')).toBe(false);
      expect(await persistentMediaCache.has(STORES.SFX_AUDIO, 'sfx-2')).toBe(false);
      expect(await persistentMediaCache.has(STORES.SFX_AUDIO, 'sfx-3')).toBe(true);
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
      (global as any).indexedDB = {
        open: mockIDB.open,
        deleteDatabase: () => {
          const req: any = {};
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
      (global as any).indexedDB = {
        open: mockIDB.open,
        deleteDatabase: () => {
          const req: any = {};
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
      const mockIDB = createMockIndexedDB();
      (global as any).indexedDB = mockIDB;

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
      const mockIDB = createMockIndexedDB();

      (global as any).indexedDB = {
        open: (_name: string, _version?: number) => {
          openCallCount++;
          if (openCallCount === 1) {
            // Pierwsze wywołanie wisi i nigdy nie rozstrzyga ani nie odrzuca
            return {} as any;
          }
          return mockIDB.open(_name, _version);
        },
        deleteDatabase: (_name: string) => {
          deleteCalled = true;
          const req: any = {};
          setTimeout(() => {
            if (req.onsuccess) req.onsuccess({ target: req });
          }, 0);
          return req;
        },
      };

      // Czyścimy instancję, by wymusić ponowne wywołanie initDB
      (persistentMediaCache as any).db = null;
      (persistentMediaCache as any).dbPromise = null;

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
      (global as any).indexedDB = mockIDB;
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

      const maxSize = await (persistentMediaCache as any).getMaxCacheSize();
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

      const maxSize = await (persistentMediaCache as any).getMaxCacheSize();
      expect(maxSize).toBe(40 * 1024 * 1024);
    });

    it('egzekwuje politykę LRU: najpierw czyści wygasłe, usuwa najstarsze niechronione i BEZWZGLĘDNIE CHRONI character-images', async () => {
      // Symulujemy mały limit cache = 6000 bajtów
      jest.spyOn(persistentMediaCache as any, 'getMaxCacheSize').mockResolvedValue(6000);

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
      await (persistentMediaCache as any).ensureSpaceAvailable(1000);

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
      jest.spyOn(persistentMediaCache as any, 'getMaxCacheSize').mockResolvedValue(5000);

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
      jest.spyOn(persistentMediaCache as any, 'getMaxCacheSize').mockResolvedValue(4000);

      await persistentMediaCache.set(
        STORES.CHAT_IMAGES,
        'chat-item',
        'data:image/png;base64,' + 'C'.repeat(1000)
      );
      expect(await persistentMediaCache.has(STORES.CHAT_IMAGES, 'chat-item')).toBe(true);

      // Wywołujemy bezpośrednio ensureSpaceAvailable z rozmiarem 10000 B > 4000 B
      await (persistentMediaCache as any).ensureSpaceAvailable(10000);

      // Wpis chat-item NIE powinien zostać skasowany
      expect(await persistentMediaCache.has(STORES.CHAT_IMAGES, 'chat-item')).toBe(true);
    });

    it('zwalnia miejsce gdy stats.totalSize <= maxCacheSize * 0.8 ale po dodaniu requiredSize suma przekroczy maxCacheSize', async () => {
      // maxCacheSize = 6000, 80% = 4800
      jest.spyOn(persistentMediaCache as any, 'getMaxCacheSize').mockResolvedValue(6000);

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
      await (persistentMediaCache as any).ensureSpaceAvailable(3000);

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

      (global as any).indexedDB = mockIDB;

      // Zamykamy poprzednie połączenie i reinicjalizujemy bazę
      if ((persistentMediaCache as any).db) {
        (persistentMediaCache as any).db.close();
        (persistentMediaCache as any).db = null;
      }
      (persistentMediaCache as any).dbPromise = null;

      await (persistentMediaCache as any).initDB();

      // Sprawdzenie czy istniejący store zyskał brakujące indeksy
      expect(existingStore.indices.has('lastAccessed')).toBe(true);
      expect(existingStore.indices.has('createdAt')).toBe(true);
      expect(existingStore.indices.has('size')).toBe(true);
    });
  });
});
