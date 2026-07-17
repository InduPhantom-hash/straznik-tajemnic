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
  // IND-136 B4: single-flight mutex dla LRU cleanup w ensureSpaceAvailable
  // Dedupe równoległe calls - gdy 2 setX() trigger cleanup z różnych transactions,
  // tylko pierwsza wykona cleanup, druga czeka na tę samą Promise.
  private cleanupPromise: Promise<void> | null = null;

  /**
   * Initialize the IndexedDB database
   */
  private async initDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB not available'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        Sentry.captureException(
          request.error ?? new Error('Failed to open IndexedDB')
        );
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create stores for each media type
        Object.values(STORES).forEach((storeName) => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' });
            store.createIndex('lastAccessed', 'lastAccessed', {
              unique: false,
            });
            store.createIndex('createdAt', 'createdAt', { unique: false });
            store.createIndex('size', 'size', { unique: false });
          }
        });
      };
    });

    return this.dbPromise;
  }

  /**
   * Check if IndexedDB is available
   */
  isAvailable(): boolean {
    return typeof indexedDB !== 'undefined';
  }

  /**
   * Get item from cache
   */
  async get(store: StoreName, id: string): Promise<string | null> {
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
    try {
      const db = await this.initDB();

      // Calculate size
      const size = new Blob([data]).size;

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
   * Delete item from cache
   */
  async delete(store: StoreName, id: string): Promise<boolean> {
    try {
      const db = await this.initDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(store, 'readwrite');
        const objectStore = transaction.objectStore(store);
        const request = objectStore.delete(id);

        request.onerror = () => reject(request.error);
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
   * Check if item exists in cache
   */
  async has(store: StoreName, id: string): Promise<boolean> {
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
   * IND-139 C6: dynamiczny limit cache wg navigator.storage.estimate() (80% quota),
   * fallback MAX_CACHE_SIZE_BYTES (150 MB) gdy API niedostępne lub błąd.
   * Niektóre przeglądarki dają 500MB+, mobile Safari ~50MB.
   */
  private async getMaxCacheSize(): Promise<number> {
    try {
      if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
        const { quota } = await navigator.storage.estimate();
        if (quota && quota > 0) {
          return Math.floor(quota * 0.8);
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
   * Pierwsza wywołanie startuje cleanup, kolejne czekają. Po finish, mutex resetuje.
   */
  private async ensureSpaceAvailable(requiredSize: number): Promise<void> {
    if (this.cleanupPromise) {
      return this.cleanupPromise;
    }

    this.cleanupPromise = (async () => {
      try {
        const maxCacheSize = await this.getMaxCacheSize();
        const stats = await this.getStats();

        if (stats.totalSize + requiredSize <= maxCacheSize) {
          return; // Enough space
        }

        const db = await this.initDB();
        const targetSize = maxCacheSize * 0.8; // Clean to 80% capacity
        let currentSize = stats.totalSize;

        // Get all entries sorted by lastAccessed
        const allEntries: { store: string; entry: CacheEntry }[] = [];

        for (const storeName of Object.values(STORES)) {
          const entries = await this.getAllEntries(db, storeName);
          allEntries.push(
            ...entries.map((entry) => ({ store: storeName, entry }))
          );
        }

        // Sort by lastAccessed (oldest first)
        allEntries.sort((a, b) => a.entry.lastAccessed - b.entry.lastAccessed);

        // Delete oldest entries until we're under target size
        for (const { store, entry } of allEntries) {
          if (currentSize <= targetSize) break;

          await this.delete(store as StoreName, entry.id);
          currentSize -= entry.size;
        }
      } finally {
        this.cleanupPromise = null;
      }
    })();

    return this.cleanupPromise;
  }

  private async getAllEntries(
    db: IDBDatabase,
    storeName: string
  ): Promise<CacheEntry[]> {
    return new Promise((resolve) => {
      const transaction = db.transaction(storeName, 'readonly');
      const objectStore = transaction.objectStore(storeName);
      const request = objectStore.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<void> {
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
