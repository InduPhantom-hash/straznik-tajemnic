/**
 * Persistent Media Cache Service
 * Uses IndexedDB for persistent storage of images and audio
 *
 * Stores:
 * - npc-portraits: Portrety NPC (key: npcId)
 * - location-images: Obrazy lokacji (key: locationId)
 * - tts-audio: Cache audio TTS (key: textHash_voiceId)
 * - sfx-audio: Cache efektów dźwiękowych (key: promptHash)
 * - chat-images: Obrazy wygenerowane w czacie (key: messageId_imageIndex)
 */

import * as Sentry from '@sentry/nextjs';

const DB_NAME = 'zew-media-cache';
const DB_VERSION = 3; // v3: add character-images store (IND-262)
// IND-139 C6: fallback gdy navigator.storage.estimate() niedostępny
const MAX_CACHE_SIZE_BYTES = 150 * 1024 * 1024; // 150 MB

/**
 * IND-139 C4: typed metadata cache entries (zamiast Record<string, unknown>).
 * Pola opcjonalne - różne typy mediów używają różnych podzbiorów.
 */
export interface MediaMetadata {
  prompt?: string;
  style?: string;
  text?: string;
  voiceId?: string;
  pitch?: number;
  rate?: number;
  languageCode?: string;
  messageId?: string;
  imageIndex?: number;
}

// Store names
export const STORES = {
  NPC_PORTRAITS: 'npc-portraits',
  LOCATION_IMAGES: 'location-images',
  TTS_AUDIO: 'tts-audio',
  SFX_AUDIO: 'sfx-audio',
  CHAT_IMAGES: 'chat-images',
  // IND-262: portrety i miniatury ekwipunku postaci. Trzymane tu (IndexedDB)
  // zamiast inline w localStorage, bo data URL ~2,2 MB/obraz przekraczał quota.
  CHARACTER_IMAGES: 'character-images',
} as const;

type StoreName = (typeof STORES)[keyof typeof STORES];

/**
 * Issue #78: Magazyny chronione - wyłączone z automatycznej eksmisji LRU.
 * Portrety i miniatury postaci gracza nie mogą być usuwane w tle.
 */
export const PROTECTED_STORES: ReadonlySet<StoreName> = new Set<StoreName>([
  STORES.CHARACTER_IMAGES,
]);

/**
 * Issue #78: Domyślna polityka retencji czasowej (TTL) per-store.
 * Wpisy starsze niż TTL są automatycznie odrzucane przy odczycie oraz sprzątane w tle.
 */
export const DEFAULT_STORE_TTL_MS: Record<StoreName, number> = {
  [STORES.CHARACTER_IMAGES]: Infinity, // Dane postaci gracza są trwałe
  [STORES.NPC_PORTRAITS]: 30 * 24 * 60 * 60 * 1000, // 30 dni
  [STORES.LOCATION_IMAGES]: 30 * 24 * 60 * 60 * 1000, // 30 dni
  [STORES.CHAT_IMAGES]: 14 * 24 * 60 * 60 * 1000, // 14 dni
  [STORES.TTS_AUDIO]: 7 * 24 * 60 * 60 * 1000, // 7 dni
  [STORES.SFX_AUDIO]: 7 * 24 * 60 * 60 * 1000, // 7 dni
};

interface CacheEntryMetadata {
  id: string;
  size: number;
  lastAccessed: number;
  createdAt: number;
}

interface CacheEntry {
  id: string;
  data: string; // base64 data URL
  size: number; // in bytes
  type: 'image' | 'audio';
  mimeType: string;
  createdAt: number;
  lastAccessed: number;
  metadata?: MediaMetadata;
}

interface CacheStats {
  totalSize: number;
  itemCount: number;
  byStore: Record<string, { count: number; size: number }>;
}

class PersistentMediaCache {
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;
  private isBlocked = false;
  // IND-136 B4: single-flight mutex dla LRU cleanup w ensureSpaceAvailable
  // Dedupe równoległe calls - gdy 2 setX() trigger cleanup z różnych transactions,
  // tylko pierwsza wykona cleanup, druga czeka na tę samą Promise.
  private cleanupPromise: Promise<void> | null = null;

  /**
   * Sprawdza, czy dany błąd reprezentuje trwałą restrykcję bezpieczeństwa
   * (np. Safari Private Browsing / SecurityError) lub brak uprawnień,
   * kwalifikującą się do trwałego odcięcia circuit breakera (isBlocked = true).
   * Błędy przejściowe (QuotaExceededError, UnknownError, AbortError) NIE blokują cache trwale.
   */
  private isPermanentRestriction(error: unknown): boolean {
    if (!error) return false;
    if (typeof error === 'string') {
      const lower = error.toLowerCase();
      return (
        lower.includes('securityerror') ||
        lower.includes('notallowederror') ||
        lower.includes('insecure') ||
        lower.includes('not allowed') ||
        lower.includes('notallowed')
      );
    }
    const err = error as { name?: string; message?: string; code?: number };
    const lowerName = (err.name || '').toLowerCase();
    const lowerMessage = (err.message || '').toLowerCase();
    const code = err.code || 0;
    return (
      lowerName === 'securityerror' ||
      lowerName === 'notallowederror' ||
      code === 18 ||
      lowerMessage.includes('securityerror') ||
      lowerMessage.includes('notallowederror') ||
      lowerMessage.includes('insecure') ||
      lowerMessage.includes('not allowed') ||
      lowerMessage.includes('notallowed')
    );
  }

  /**
   * Initialize the IndexedDB database
   */
  private async initDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        this.dbPromise = null;
        reject(new Error('IndexedDB not available'));
        return;
      }

      if (this.isBlocked) {
        this.dbPromise = null;
        reject(
          new Error('IndexedDB is disabled due to security restrictions')
        );
        return;
      }

      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
          const error = request.error;
          if (this.isPermanentRestriction(error)) {
            this.isBlocked = true;
          }
          this.dbPromise = null;
          Sentry.captureException(
            error ?? new Error('Failed to open IndexedDB')
          );
          reject(error);
        };

        request.onblocked = () => {
          Sentry.addBreadcrumb({
            category: 'cache',
            level: 'warning',
            message: `open('${DB_NAME}') blocked by open connection in another tab`,
          });
        };

        request.onsuccess = () => {
          this.db = request.result;
          this.isBlocked = false;

          // Obsługa zamykania połączenia gdy inna karta inicjuje resetDatabase/deleteDatabase (versionchange)
          this.db.onversionchange = () => {
            this.db?.close();
            this.db = null;
            this.dbPromise = null;
          };

          this.db.onclose = () => {
            this.db = null;
            this.dbPromise = null;
          };

          resolve(this.db);
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const transaction = (event.target as IDBOpenDBRequest).transaction;

          // Create stores for each media type and ensure all indexes exist (Issue #78 migration)
          Object.values(STORES).forEach((storeName) => {
            let store: IDBObjectStore;
            if (!db.objectStoreNames.contains(storeName)) {
              store = db.createObjectStore(storeName, { keyPath: 'id' });
            } else if (transaction) {
              store = transaction.objectStore(storeName);
            } else {
              return;
            }

            if (!store.indexNames.contains('lastAccessed')) {
              store.createIndex('lastAccessed', 'lastAccessed', {
                unique: false,
              });
            }
            if (!store.indexNames.contains('createdAt')) {
              store.createIndex('createdAt', 'createdAt', { unique: false });
            }
            if (!store.indexNames.contains('size')) {
              store.createIndex('size', 'size', { unique: false });
            }
          });
        };
      } catch (error) {
        if (this.isPermanentRestriction(error)) {
          this.isBlocked = true;
        }
        this.dbPromise = null;
        Sentry.captureException(error);
        reject(error);
      }
    });

    return this.dbPromise;
  }

  /**
   * Check if IndexedDB is available (Issue #78: returns false if blocked by Safari/incognito security error)
   */
  isAvailable(): boolean {
    if (this.isBlocked) return false;
    return typeof indexedDB !== 'undefined';
  }

  /**
   * Get item from cache
   */
  async get(store: StoreName, id: string): Promise<string | null> {
    if (!this.isAvailable()) return null;
    try {
      const db = await this.initDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(store, 'readwrite');
        const objectStore = transaction.objectStore(store);
        const request = objectStore.get(id);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const entry = request.result as CacheEntry | undefined;
          if (!entry) {
            resolve(null);
            return;
          }

          // Issue #78: Walidacja TTL - jeśli wpis wygasł, usuwamy go i zwracamy null (cache miss)
          // Obsługuje także wpisy legacy z brakiem pola createdAt (fallback do lastAccessed)
          const ttl = DEFAULT_STORE_TTL_MS[store] ?? Infinity;
          const entryTime = entry.createdAt || entry.lastAccessed || 0;
          if (
            ttl !== Infinity &&
            entryTime > 0 &&
            Date.now() - entryTime > ttl
          ) {
            objectStore.delete(id);
            resolve(null);
            return;
          }

          // Update lastAccessed time
          entry.lastAccessed = Date.now();
          objectStore.put(entry);

          resolve(entry.data);
        };
      });
    } catch (error) {
      Sentry.captureException(error);
      return null;
    }
  }

  /**
   * Set item in cache
   */
  async set(
    store: StoreName,
    id: string,
    data: string,
    metadata?: MediaMetadata
  ): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      // Calculate size
      const size =
        typeof Blob !== 'undefined' ? new Blob([data]).size : data.length;

      // Issue #78 audit finding: pojedynczy element większy niż maxCacheSize nie może być
      // buforowany, gdyż przekracza dopuszczalny limit całego magazynu i powodowałby
      // bezcelową kaskadową eksmisję wszystkich innych wpisów.
      const maxCacheSize = await this.getMaxCacheSize();
      if (size > maxCacheSize) {
        Sentry.addBreadcrumb({
          category: 'cache',
          level: 'warning',
          message: `Item size (${size} B) exceeds maxCacheSize (${maxCacheSize} B) for ${store}/${id}. Skipping cache set.`,
        });
        return false;
      }

      const db = await this.initDB();

      // IND-139 B9: graceful - błąd cleanup (np. quota) NIE blokuje zapisu entry
      try {
        await this.ensureSpaceAvailable(size);
      } catch (cleanupError) {
        Sentry.addBreadcrumb({
          category: 'cache',
          level: 'warning',
          message: `ensureSpaceAvailable failed, continuing with set: ${cleanupError}`,
        });
      }

      const entry: CacheEntry = {
        id,
        data,
        size,
        type:
          store.includes('audio') ||
          store.includes('sfx') ||
          store.includes('tts')
            ? 'audio'
            : 'image',
        mimeType: this.detectMimeType(data),
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        metadata,
      };

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(store, 'readwrite');
        const objectStore = transaction.objectStore(store);
        const request = objectStore.put(entry);

        request.onerror = () => {
          Sentry.captureException(
            request.error ?? new Error(`Cache set error: ${store}/${id}`)
          );
          reject(request.error);
        };
        request.onsuccess = () => {
          resolve(true);
        };
      });
    } catch (error) {
      Sentry.captureException(error);
      return false;
    }
  }

  /**
   * Issue #78: Batch delete items in a single readwrite transaction to eliminate N+1 IPC overhead.
   */
  async batchDelete(store: StoreName, ids: string[]): Promise<boolean> {
    if (!this.isAvailable() || ids.length === 0) return true;
    try {
      const db = await this.initDB();

      return new Promise((resolve) => {
        const transaction = db.transaction(store, 'readwrite');
        const objectStore = transaction.objectStore(store);
        for (const id of ids) {
          objectStore.delete(id);
        }

        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => resolve(false);
        transaction.onabort = () => resolve(false);
      });
    } catch (error) {
      Sentry.captureException(error);
      return false;
    }
  }

  /**
   * Delete item from cache
   */
  async delete(store: StoreName, id: string): Promise<boolean> {
    return this.batchDelete(store, [id]);
  }

  /**
   * Check if item exists in cache
   */
  async has(store: StoreName, id: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    const data = await this.get(store, id);
    return data !== null;
  }

  /**
   * Get cache statistics
   *
   * IND-136 B5: single transaction across all 5 stores zamiast 5× osobnych transactions.
   * Wcześniej każdy getStoreStats robił nową `db.transaction(storeName, 'readonly')` -
   * ~500ms (5× IndexedDB overhead). Teraz jedna transakcja + Promise.all per store cursor.
   */
  async getStats(): Promise<CacheStats> {
    if (!this.isAvailable()) {
      return { totalSize: 0, itemCount: 0, byStore: {} };
    }
    try {
      const db = await this.initDB();
      const stats: CacheStats = {
        totalSize: 0,
        itemCount: 0,
        byStore: {},
      };

      const allStoreNames = Object.values(STORES);
      const transaction = db.transaction(allStoreNames, 'readonly');

      await Promise.all(
        allStoreNames.map(async (storeName) => {
          const storeStats = await this.getStoreStatsInTx(
            transaction,
            storeName
          );
          stats.byStore[storeName] = storeStats;
          stats.totalSize += storeStats.size;
          stats.itemCount += storeStats.count;
        })
      );

      return stats;
    } catch (error) {
      Sentry.captureException(error);
      return { totalSize: 0, itemCount: 0, byStore: {} };
    }
  }

  /**
   * IND-136 B5: variant that reuses an existing transaction (single-tx getStats).
   */
  private async getStoreStatsInTx(
    transaction: IDBTransaction,
    storeName: string
  ): Promise<{ count: number; size: number }> {
    return new Promise((resolve) => {
      const objectStore = transaction.objectStore(storeName);

      let count = 0;
      let size = 0;

      const request = objectStore.openCursor();
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          count++;
          size += (cursor.value as CacheEntry).size;
          cursor.continue();
        } else {
          resolve({ count, size });
        }
      };
      request.onerror = () => resolve({ count: 0, size: 0 });
    });
  }

  /**
   * Issue #78: dynamiczny limit cache z twardym sufitem bezpieczeństwa MAX_CACHE_SIZE_BYTES (150 MB).
   * Poprzednio quota dysku (np. 200 GB) unieważniała limit 150 MB, powodując niekontrolowane puchnięcie.
   * Teraz bierzemy minimum z limitu 150 MB i 80% quota (dla restrykcyjnych przeglądarek np. Safari 50 MB).
   */
  private async getMaxCacheSize(): Promise<number> {
    try {
      if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
        const { quota } = await navigator.storage.estimate();
        if (quota && quota > 0) {
          return Math.min(MAX_CACHE_SIZE_BYTES, Math.floor(quota * 0.8));
        }
      }
    } catch {
      // fallback poniżej
    }
    return MAX_CACHE_SIZE_BYTES;
  }

  /**
   * Ensure there's space available by removing old entries (LRU)
   *
   * IND-136 B4: single-flight pattern - równoległe set() calls otrzymują tę samą Promise.
   * Issue #78:
   * 1. Ochrona magazynów chronionych (PROTECTED_STORES, np. character-images).
   * 2. Eliminacja OOM: skanowanie kursorowe samych metadanych zamiast ładowania całych stringów base64 przez getAll().
   * 3. W pierwszej kolejności czyści wpisy przedawnione wg TTL, co często eliminuje potrzebę eksmisji aktywnych mediów.
   * 4. Grupowe usuwanie wsadowe (batchDelete) w 1 transakcji per-store zamiast N pojedynczych transakcji.
   */
  private async ensureSpaceAvailable(requiredSize: number): Promise<void> {
    if (!this.isAvailable()) return;
    if (this.cleanupPromise) {
      return this.cleanupPromise;
    }

    this.cleanupPromise = (async () => {
      try {
        const maxCacheSize = await this.getMaxCacheSize();

        // Issue #78 audit finding: jeśli pojedynczy element przekracza cały limit magazynu,
        // żadna eksmisja (nawet wyczyszczenie 100% bazy) nie pozwoli go pomieścić.
        // Wyjście zapobiega bezsensownemu usunięciu wszystkich dotychczasowych wpisów.
        if (requiredSize > maxCacheSize) {
          return;
        }

        let stats = await this.getStats();

        if (stats.totalSize + requiredSize <= maxCacheSize) {
          return; // Enough space
        }

        // Krok 1: W pierwszej kolejności usuń wpisy przeterminowane wg TTL.
        // Purge wygasłych próbek audio i starych kadrów czatu często natychmiast zwalnia
        // potrzebne miejsce, zapobiegając przedwczesnej eksmisji aktywnych materiałów.
        await this.cleanupExpired();
        stats = await this.getStats();

        if (stats.totalSize + requiredSize <= maxCacheSize) {
          return; // Po usunięciu wygasłych mamy wystarczająco miejsca
        }

        const db = await this.initDB();
        // Celujemy w redukcję do 80% pojemności lub wystarczająco dużo miejsca na requiredSize z buforem
        const targetSize = Math.max(
          0,
          Math.min(maxCacheSize * 0.8, maxCacheSize - requiredSize)
        );
        let currentSize = stats.totalSize;

        // Kandydaci do eksmisji - wyłącznie niechronione magazyny (wyklucza character-images)
        const candidateStores = Object.values(STORES).filter(
          (storeName) => !PROTECTED_STORES.has(storeName as StoreName)
        );

        if (candidateStores.length === 0) return;

        // Skanowanie metadanych w pojedynczej transakcji
        const scanTx = db.transaction(candidateStores, 'readonly');
        const candidateEntries: {
          store: StoreName;
          metadata: CacheEntryMetadata;
        }[] = [];

        await Promise.all(
          candidateStores.map(async (storeName) => {
            const entries = await this.getStoreMetadataInTx(
              scanTx,
              storeName as StoreName
            );
            candidateEntries.push(...entries);
          })
        );

        // Sortowanie po lastAccessed (od najstarszego)
        candidateEntries.sort(
          (a, b) => a.metadata.lastAccessed - b.metadata.lastAccessed
        );

        // Zbieranie identyfikatorów do usunięcia wg store (grupowanie dla transakcji wsadowej)
        const toDeleteByStore = new Map<StoreName, string[]>();
        for (const { store, metadata } of candidateEntries) {
          if (currentSize <= targetSize) break;

          const list = toDeleteByStore.get(store) || [];
          list.push(metadata.id);
          toDeleteByStore.set(store, list);
          currentSize -= metadata.size;
        }

        // Usuwanie najstarszych wpisów wsadowo (1 transakcja per store)
        for (const [storeName, ids] of toDeleteByStore.entries()) {
          await this.batchDelete(storeName, ids);
        }
      } finally {
        this.cleanupPromise = null;
      }
    })();

    return this.cleanupPromise;
  }

  /**
   * Issue #78: pobiera wyłącznie lekkie metadane wpisów kursorowo,
   * zapobiegając ładowaniu łańcuchów Base64 do pamięci RAM.
   */
  private async getStoreMetadataInTx(
    transaction: IDBTransaction,
    storeName: StoreName
  ): Promise<{ store: StoreName; metadata: CacheEntryMetadata }[]> {
    return new Promise((resolve) => {
      const objectStore = transaction.objectStore(storeName);
      const results: { store: StoreName; metadata: CacheEntryMetadata }[] = [];
      const request = objectStore.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const val = cursor.value as CacheEntry;
          results.push({
            store: storeName,
            metadata: {
              id: val.id,
              size: val.size || (val.data ? val.data.length : 0),
              lastAccessed: val.lastAccessed || val.createdAt || 0,
              createdAt: val.createdAt || 0,
            },
          });
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => resolve([]);
    });
  }

  /**
   * Issue #78: Usuwa wpisy, których wiek przekroczył zdefiniowany TTL.
   * Zwraca liczbę usuniętych wpisów. Wykorzystuje wsadowe usuwanie w 1 transakcji per store.
   */
  async cleanupExpired(): Promise<number> {
    if (!this.isAvailable()) return 0;
    try {
      const db = await this.initDB();
      let deletedCount = 0;
      const now = Date.now();

      for (const storeName of Object.values(STORES)) {
        const ttl = DEFAULT_STORE_TTL_MS[storeName as StoreName];
        if (ttl === Infinity) continue; // Pomiń magazyny chronione/wieczne

        const toDelete: string[] = [];
        await new Promise<void>((resolve) => {
          const transaction = db.transaction(storeName, 'readonly');
          const objectStore = transaction.objectStore(storeName);
          const request = objectStore.openCursor();

          request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
              const entry = cursor.value as CacheEntry;
              const entryTime = entry.createdAt || entry.lastAccessed || 0;
              if (entryTime > 0 && now - entryTime > ttl) {
                toDelete.push(entry.id);
              }
              cursor.continue();
            } else {
              resolve();
            }
          };
          request.onerror = () => resolve();
        });

        if (toDelete.length > 0) {
          await this.batchDelete(storeName as StoreName, toDelete);
          deletedCount += toDelete.length;
        }
      }

      return deletedCount;
    } catch (error) {
      Sentry.captureException(error);
      return 0;
    }
  }

  /**
   * Issue #78: Twarde usunięcie i reinicjalizacja bazy IndexedDB (samonaprawa przy korupcji / hard reset).
   * Obsługuje blokowanie połączeń przez inne karty (onblocked) z konfigurowalnym czasem oczekiwania.
   */
  async resetDatabase(
    timeoutOrOptions?: number | { blockedTimeoutMs?: number }
  ): Promise<boolean> {
    const blockedTimeoutMs =
      typeof timeoutOrOptions === 'number'
        ? timeoutOrOptions
        : timeoutOrOptions?.blockedTimeoutMs ?? 2000;

    try {
      this.isBlocked = false;

      // Zabezpieczenie przed samoblokowaniem: zaczekaj na trwające w tle operacje cleanup/init (z timeoutem)
      const drainTimeoutMs = Math.max(0, Math.min(1000, blockedTimeoutMs));

      if (this.cleanupPromise || this.dbPromise) {
        let drainTimer: ReturnType<typeof setTimeout> | null = null;
        try {
          await Promise.race([
            (async () => {
              if (this.cleanupPromise) {
                try {
                  await this.cleanupPromise;
                } catch {
                  // ignoruj błędy cleanup podczas resetu
                }
              }

              if (this.dbPromise) {
                try {
                  const pendingDb = await this.dbPromise;
                  pendingDb.close();
                } catch {
                  // ignoruj błędy init podczas resetu
                }
              }
            })(),
            new Promise<void>((resolve) => {
              drainTimer = setTimeout(resolve, drainTimeoutMs);
            }),
          ]);
        } finally {
          if (drainTimer) {
            clearTimeout(drainTimer);
          }
        }
      }

      if (this.dbPromise) {
        // Zabezpieczenie: jeśli dbPromise wisiała i nie zakończyła się przed timeoutem,
        // zamykamy połączenie po jej ewentualnym późniejszym rozstrzygnięciu
        const stuckDbPromise = this.dbPromise;
        stuckDbPromise
          .then((stuckDb) => {
            try {
              stuckDb.close();
            } catch {
              // ignoruj błędy zamykania spóźnionego połączenia
            }
          })
          .catch(() => {});
      }

      if (this.db) {
        this.db.close();
        this.db = null;
      }
      this.dbPromise = null;

      if (typeof indexedDB === 'undefined') {
        return false;
      }

      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(DB_NAME);
        let blockedTimer: ReturnType<typeof setTimeout> | null = null;
        let isSettled = false;

        const cleanup = () => {
          if (blockedTimer) {
            clearTimeout(blockedTimer);
            blockedTimer = null;
          }
        };

        request.onsuccess = () => {
          if (isSettled) return;
          isSettled = true;
          cleanup();
          resolve();
        };

        request.onerror = () => {
          if (isSettled) return;
          isSettled = true;
          cleanup();
          reject(request.error ?? new Error('Failed to delete database'));
        };

        request.onblocked = () => {
          Sentry.addBreadcrumb({
            category: 'cache',
            level: 'warning',
            message: `deleteDatabase('${DB_NAME}') blocked by open connections in other tabs`,
          });

          if (blockedTimeoutMs <= 0) {
            if (isSettled) return;
            isSettled = true;
            cleanup();
            reject(
              new Error(
                'Database deletion blocked by open connections in other tabs'
              )
            );
            return;
          }

          if (!blockedTimer) {
            blockedTimer = setTimeout(() => {
              if (isSettled) return;
              isSettled = true;
              cleanup();
              reject(
                new Error(
                  `Database deletion blocked by open connections (timed out after ${blockedTimeoutMs}ms)`
                )
              );
            }, blockedTimeoutMs);
          }
        };
      });

      await this.initDB();
      return true;
    } catch (error) {
      if (this.isPermanentRestriction(error)) {
        this.isBlocked = true;
      }
      Sentry.captureException(error);
      return false;
    }
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      const db = await this.initDB();

      for (const storeName of Object.values(STORES)) {
        await new Promise<void>((resolve, reject) => {
          const transaction = db.transaction(storeName, 'readwrite');
          const objectStore = transaction.objectStore(storeName);
          const request = objectStore.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
    } catch (error) {
      Sentry.captureException(error);
    }
  }

  /**
   * Clear specific store
   */
  async clearStore(store: StoreName): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      const db = await this.initDB();

      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(store, 'readwrite');
        const objectStore = transaction.objectStore(store);
        const request = objectStore.clear();
        request.onsuccess = () => {
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      Sentry.captureException(error);
    }
  }

  // Helper methods
  private detectMimeType(data: string): string {
    if (data.startsWith('data:')) {
      const match = data.match(/^data:([^;,]+)/);
      return match ? match[1] : 'application/octet-stream';
    }
    return 'application/octet-stream';
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // Convenience methods for specific stores

  async getNpcPortrait(npcId: string): Promise<string | null> {
    return this.get(STORES.NPC_PORTRAITS, npcId);
  }

  async setNpcPortrait(
    npcId: string,
    imageData: string,
    metadata?: MediaMetadata
  ): Promise<boolean> {
    return this.set(STORES.NPC_PORTRAITS, npcId, imageData, metadata);
  }

  async getLocationImage(locationId: string): Promise<string | null> {
    return this.get(STORES.LOCATION_IMAGES, locationId);
  }

  async setLocationImage(
    locationId: string,
    imageData: string,
    metadata?: MediaMetadata
  ): Promise<boolean> {
    return this.set(STORES.LOCATION_IMAGES, locationId, imageData, metadata);
  }

  async getTtsAudio(cacheKey: string): Promise<string | null> {
    return this.get(STORES.TTS_AUDIO, cacheKey);
  }

  async setTtsAudio(
    cacheKey: string,
    audioData: string,
    metadata?: MediaMetadata
  ): Promise<boolean> {
    return this.set(STORES.TTS_AUDIO, cacheKey, audioData, metadata);
  }

  async getSfxAudio(promptHash: string): Promise<string | null> {
    return this.get(STORES.SFX_AUDIO, promptHash);
  }

  async setSfxAudio(
    promptHash: string,
    audioData: string,
    metadata?: MediaMetadata
  ): Promise<boolean> {
    return this.set(STORES.SFX_AUDIO, promptHash, audioData, metadata);
  }

  // === Chat Images ===

  /**
   * Get chat image from cache
   * @param messageId - ID wiadomości
   * @param imageIndex - Indeks obrazu w wiadomości (0, 1, 2...)
   */
  async getChatImage(
    messageId: string,
    imageIndex: number = 0
  ): Promise<string | null> {
    const cacheKey = `${messageId}_${imageIndex}`;
    return this.get(STORES.CHAT_IMAGES, cacheKey);
  }

  /**
   * Save chat image to cache
   */
  async setChatImage(
    messageId: string,
    imageIndex: number,
    imageData: string,
    metadata?: MediaMetadata
  ): Promise<boolean> {
    const cacheKey = `${messageId}_${imageIndex}`;
    return this.set(STORES.CHAT_IMAGES, cacheKey, imageData, {
      ...metadata,
      messageId,
      imageIndex,
    });
  }

  /**
   * Get all chat images for a message
   */
  async getAllChatImagesForMessage(messageId: string): Promise<string[]> {
    const images: string[] = [];
    let index = 0;

    while (true) {
      const image = await this.getChatImage(messageId, index);
      if (image === null) break;
      images.push(image);
      index++;
    }

    return images;
  }

  /**
   * Save all chat images for a message
   */
  async saveAllChatImages(
    messageId: string,
    imageUrls: string[]
  ): Promise<void> {
    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i];

      // Convert URL to base64 if needed
      let imageData = url;
      if (url.startsWith('http')) {
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          imageData = await this.blobToBase64(blob);
        } catch (error) {
          Sentry.captureException(error);
          continue;
        }
      }

      await this.setChatImage(messageId, i, imageData);
    }
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Generate a cache key for TTS based on text and voice config
   */
  generateTtsCacheKey(
    text: string,
    voiceId: string,
    pitch?: number,
    rate?: number
  ): string {
    const normalized = text.trim().toLowerCase().substring(0, 200);
    const hash = this.simpleHash(normalized);
    return `${voiceId}_${pitch || 0}_${rate || 1}_${hash}`;
  }

  /**
   * Generate a cache key for SFX based on prompt
   */
  generateSfxCacheKey(prompt: string): string {
    const normalized = prompt.trim().toLowerCase().substring(0, 200);
    return this.simpleHash(normalized);
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

// Export singleton instance
export const persistentMediaCache = new PersistentMediaCache();

// IND-139 C7: STORES eksportowany bezpośrednio (drop podwójnej nazwy
// MEDIA_CACHE_STORES) - callerzy importują `STORES as MEDIA_CACHE_STORES`.
export type { CacheEntry, CacheStats, StoreName };
