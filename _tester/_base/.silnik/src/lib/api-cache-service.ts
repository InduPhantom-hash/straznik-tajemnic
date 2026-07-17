/**
 * Simple API Cache Service
 * Provides in-memory caching for API requests
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class ApiCacheService {
  private cache: Map<string, CacheEntry<any>>;

  constructor() {
    this.cache = new Map();
  }

  /**
   * Get cached data if available and not expired
   */
  get<T>(namespace: string, key: any): T | null {
    const cacheKey = this.generateKey(namespace, key);
    const entry = this.cache.get(cacheKey);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(cacheKey);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set data in cache with TTL in milliseconds
   */
  set<T>(namespace: string, key: any, data: T, ttl: number = 300000): void {
    const cacheKey = this.generateKey(namespace, key);
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Generate cache key from namespace and key object
   */
  private generateKey(namespace: string, key: any): string {
    const keyStr = typeof key === 'string' ? key : JSON.stringify(key);
    return `${namespace}:${keyStr}`;
  }

  /**
   * Delete cached data
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clean expired entries
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

    return cleaned;
  }
}

// Export singleton instance
export const apiCacheService = new ApiCacheService();

// Clean expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    apiCacheService.cleanExpired();
  }, 5 * 60 * 1000);
}
