/**
 * Simple API Cache Service
 * Provides in-memory caching for API requests with persistent disk fallback (L2)
 * for audio/TTS requests (OPT-C03).
 */

import { persistentTtsCache, stableStringify } from './tts-cache-service';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class ApiCacheService {
  private cache: Map<string, CacheEntry<unknown>>;

  constructor() {
    this.cache = new Map();
  }

  /**
   * Determine whether a namespace qualifies for persistent disk storage.
   */
  private isPersistentNamespace(namespace: string): boolean {
    return (
      namespace === 'google-tts' ||
      namespace === 'google-tts-v2' ||
      namespace === 'tts'
    );
  }

  /**
   * Get cached data if available and not expired.
   * L1: In-memory Map (ultra-fast).
   * L2: Persistent disk cache (data/cache/tts) for persistent namespaces.
   */
  get<T>(namespace: string, key: unknown): T | null {
    const cacheKey = this.generateKey(namespace, key);
    const entry = this.cache.get(cacheKey);
    const now = Date.now();

    if (entry) {
      if (now - entry.timestamp <= entry.ttl) {
        return entry.data as T;
      }
      this.cache.delete(cacheKey);
    }

    // L2 persistent disk cache fallback
    if (this.isPersistentNamespace(namespace)) {
      const diskData = persistentTtsCache.get<T>(key);
      if (diskData !== null) {
        // Re-populate L1 RAM cache for quick subsequent accesses in current session
        this.cache.set(cacheKey, {
          data: diskData,
          timestamp: now,
          ttl: 30 * 60 * 1000, // 30 minutes in memory
        });
        return diskData;
      }
    }

    return null;
  }

  /**
   * Set data in cache with TTL in milliseconds.
   * Stores in L1 RAM cache and writes to L2 persistent disk for TTS namespaces.
   */
  set<T>(
    namespace: string,
    key: unknown,
    data: T,
    ttl: number = 300000
  ): void {
    const cacheKey = this.generateKey(namespace, key);
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl,
    });

    // L2 persistent disk cache
    if (this.isPersistentNamespace(namespace)) {
      // Retain persistent disk cache for at least 7 days across sessions (0 = infinite)
      const diskTtl = ttl === 0 ? 0 : Math.max(ttl, 7 * 24 * 60 * 60 * 1000);
      persistentTtsCache.set(key, data, diskTtl);
    }
  }

  /**
   * Generate cache key from namespace and key object using deterministic stableStringify.
   */
  private generateKey(namespace: string, key: unknown): string {
    const keyStr = typeof key === 'string' ? key : stableStringify(key);
    return `${namespace}:${keyStr}`;
  }

  /**
   * Delete cached data. Supports both delete(namespace, key) and delete(fullKeyStr).
   * Deletes from both RAM and persistent disk cache.
   */
  delete(namespace: string, key?: unknown): void {
    if (key !== undefined) {
      const cacheKey = this.generateKey(namespace, key);
      this.cache.delete(cacheKey);
      if (this.isPersistentNamespace(namespace)) {
        persistentTtsCache.delete(key);
      }
    } else {
      this.cache.delete(namespace);
      for (const pns of ['google-tts', 'google-tts-v2', 'tts']) {
        if (namespace.startsWith(`${pns}:`)) {
          const rawKeyStr = namespace.slice(pns.length + 1);
          try {
            const parsed = JSON.parse(rawKeyStr);
            persistentTtsCache.delete(parsed);
          } catch {
            persistentTtsCache.delete(rawKeyStr);
          }
          break;
        }
      }
    }
  }

  /**
   * Clear all cached data (both memory and persistent disk)
   */
  clear(): void {
    this.cache.clear();
    persistentTtsCache.clear();
  }

  /**
   * Clear in-memory cache only
   */
  clearMemory(): void {
    this.cache.clear();
  }

  /**
   * Get in-memory cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clean expired entries in both memory and persistent disk cache,
   * and enforce disk quota limits.
   */
  cleanExpired(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    cleaned += persistentTtsCache.cleanExpired();
    // Enforce disk storage quota
    persistentTtsCache.prune();

    return cleaned;
  }
}

// Export singleton instance
export const apiCacheService = new ApiCacheService();

// Clean expired entries every 5 minutes (unref'd to prevent keeping process alive)
if (typeof setInterval !== 'undefined') {
  const timer = setInterval(() => {
    apiCacheService.cleanExpired();
  }, 5 * 60 * 1000);
  if (timer && typeof timer.unref === 'function') {
    timer.unref();
  }
}
