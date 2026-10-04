import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getWritableDataDir } from './paths';

export interface CachedTtsAudio {
  id?: string;
  type?: string;
  audioUrl: string; // base64 data URL
  duration?: number;
  timestamp?: string;
  cost?: number;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface DiskTtsCacheEntry<T = unknown> {
  keyHash: string;
  data: T;
  timestamp: number;
  ttl: number; // in milliseconds (0 or Infinity = no expiration)
  audioFile?: string; // name of associated .mp3 file
}

export interface PersistentTtsCacheOptions {
  cacheDir?: string;
  defaultTtlMs?: number; // default: 7 days
  maxSizeBytes?: number; // default: 200 MB
}

export interface CacheStats {
  count: number;
  totalSizeBytes: number;
  cacheDir: string;
}

/**
 * Helper to write files atomically using a temporary file and rename.
 * Falls back to direct write if rename fails.
 */
function atomicWriteFileSync(targetPath: string, data: string | Buffer): void {
  const dir = path.dirname(targetPath);
  const tempPath = path.join(
    dir,
    `.${path.basename(targetPath)}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`
  );
  try {
    fs.writeFileSync(tempPath, data);
    fs.renameSync(tempPath, targetPath);
  } catch {
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    } catch {
      // ignore
    }
    // Fallback direct write
    fs.writeFileSync(targetPath, data);
  }
}

/**
 * Deterministic serializer for cache keys that sorts object keys recursively
 * and omits undefined properties (aligning with standard JSON semantics).
 */
export function stableStringify(obj: unknown): string {
  if (obj === undefined) {
    return 'null';
  }
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return (
      '[' +
      obj
        .map((item) => (item === undefined ? 'null' : stableStringify(item)))
        .join(',') +
      ']'
    );
  }
  const record = obj as Record<string, unknown>;
  const keys = Object.keys(record)
    .filter((k) => record[k] !== undefined)
    .sort();
  return (
    '{' +
    keys
      .map((k) => `${JSON.stringify(k)}:${stableStringify(record[k])}`)
      .join(',') +
    '}'
  );
}

/**
 * Generate a SHA-256 hash for a given cache key.
 */
export function generateTtsHash(key: unknown): string {
  const serialized = stableStringify(key);
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

/**
 * Server-side persistent disk cache for TTS audio responses.
 * Stores JSON metadata as `<hash>.json` and extracted audio as `<hash>.mp3`
 * in `data/cache/tts/`.
 */
export class PersistentTtsCache {
  private customCacheDir?: string;
  private defaultTtlMs: number;
  private maxSizeBytes: number;
  private lastEnsuredDir: string | null = null;
  private writeCount = 0;

  constructor(options: PersistentTtsCacheOptions = {}) {
    this.customCacheDir = options.cacheDir;
    this.defaultTtlMs = options.defaultTtlMs ?? 7 * 24 * 60 * 60 * 1000; // 7 days
    this.maxSizeBytes = options.maxSizeBytes ?? 200 * 1024 * 1024; // 200 MB
  }

  public setCacheDir(dir?: string): void {
    this.customCacheDir = dir;
    this.lastEnsuredDir = null;
  }

  public getCacheDir(): string {
    return (
      this.customCacheDir ||
      process.env.TTS_CACHE_DIR ||
      path.join(getWritableDataDir(), 'cache', 'tts')
    );
  }

  private ensureDir(): boolean {
    const dir = this.getCacheDir();
    if (this.lastEnsuredDir === dir && fs.existsSync(dir)) return true;
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.lastEnsuredDir = dir;
      return true;
    } catch (error) {
      console.warn(`[tts-cache] Failed to create cache directory ${dir}:`, error);
      return false;
    }
  }

  /**
   * Retrieve cached data if present and not expired.
   */
  public get<T = unknown>(key: unknown): T | null {
    if (!this.ensureDir()) return null;
    const cacheDir = this.getCacheDir();
    const hash = generateTtsHash(key);
    const jsonPath = path.join(cacheDir, `${hash}.json`);

    try {
      if (!fs.existsSync(jsonPath)) {
        return null;
      }

      const content = fs.readFileSync(jsonPath, 'utf-8');
      const entry: DiskTtsCacheEntry<T> = JSON.parse(content);

      // Check TTL expiration
      const now = Date.now();
      if (
        entry.ttl > 0 &&
        Number.isFinite(entry.ttl) &&
        now - entry.timestamp > entry.ttl
      ) {
        this.deleteByHash(hash);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.warn(`[tts-cache] Failed to read cache entry ${hash}:`, error);
      // Clean up potentially corrupted file and its audio counterpart
      this.deleteByHash(hash);
      return null;
    }
  }

  /**
   * Persist data to disk. Also extracts base64 audio to standalone .mp3 if present.
   */
  public set<T = unknown>(key: unknown, data: T, ttl?: number): boolean {
    if (!this.ensureDir()) return false;
    const cacheDir = this.getCacheDir();
    const hash = generateTtsHash(key);
    const jsonPath = path.join(cacheDir, `${hash}.json`);
    const mp3Path = path.join(cacheDir, `${hash}.mp3`);

    try {
      const effectiveTtl = ttl !== undefined ? ttl : this.defaultTtlMs;
      let hasAudioFile = false;

      // Extract standalone MP3 file if data contains base64 audioUrl
      if (data && typeof data === 'object') {
        const audioUrl = (data as Record<string, unknown>).audioUrl;
        if (typeof audioUrl === 'string') {
          const match = audioUrl.match(
            /^data:audio\/(?:mp3|mpeg|wav|ogg);base64,(.+)$/
          );
          if (match && match[1]) {
            try {
              const buffer = Buffer.from(match[1], 'base64');
              if (buffer.length > 0) {
                atomicWriteFileSync(mp3Path, buffer);
                hasAudioFile = true;
              }
            } catch (err) {
              console.warn(
                `[tts-cache] Failed to write audio file ${mp3Path}:`,
                err
              );
            }
          }
        }
      }

      const entry: DiskTtsCacheEntry<T> = {
        keyHash: hash,
        data,
        timestamp: Date.now(),
        ttl: effectiveTtl,
        ...(hasAudioFile ? { audioFile: `${hash}.mp3` } : {}),
      };

      atomicWriteFileSync(jsonPath, JSON.stringify(entry));

      // Periodic LRU quota enforcement
      this.maybePrune();

      return true;
    } catch (error) {
      console.warn(`[tts-cache] Failed to write cache entry ${hash}:`, error);
      return false;
    }
  }

  /**
   * Periodic check to ensure disk quota is respected without reading disk on every single call.
   */
  private maybePrune(): void {
    this.writeCount++;
    if (this.writeCount % 25 === 0) {
      try {
        this.prune();
      } catch {
        // ignore
      }
    }
  }

  /**
   * Check if an entry exists and is not expired.
   */
  public has(key: unknown): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete an entry by key.
   */
  public delete(key: unknown): boolean {
    const hash = generateTtsHash(key);
    return this.deleteByHash(hash);
  }

  /**
   * Delete entry files by hash (.json, .mp3, and lingering .tmp).
   */
  public deleteByHash(hash: string): boolean {
    let deleted = false;
    const cacheDir = this.getCacheDir();
    const jsonPath = path.join(cacheDir, `${hash}.json`);
    const mp3Path = path.join(cacheDir, `${hash}.mp3`);

    try {
      if (fs.existsSync(jsonPath)) {
        fs.unlinkSync(jsonPath);
        deleted = true;
      }
    } catch {
      // ignore
    }

    try {
      if (fs.existsSync(mp3Path)) {
        fs.unlinkSync(mp3Path);
        deleted = true;
      }
    } catch {
      // ignore
    }

    return deleted;
  }

  /**
   * Get path to the cached MP3 file if present and valid.
   */
  public getAudioPath(key: unknown): string | null {
    if (!this.has(key)) return null;
    const cacheDir = this.getCacheDir();
    const hash = generateTtsHash(key);
    const mp3Path = path.join(cacheDir, `${hash}.mp3`);
    return fs.existsSync(mp3Path) ? mp3Path : null;
  }

  /**
   * Get cached audio buffer if present.
   */
  public getAudioBuffer(key: unknown): Buffer | null {
    const audioPath = this.getAudioPath(key);
    if (!audioPath) return null;
    try {
      return fs.readFileSync(audioPath);
    } catch {
      return null;
    }
  }

  /**
   * Clear all cached files in the directory.
   */
  public clear(): void {
    if (!this.ensureDir()) return;
    const cacheDir = this.getCacheDir();
    try {
      const files = fs.readdirSync(cacheDir);
      for (const file of files) {
        if (
          file.endsWith('.json') ||
          file.endsWith('.mp3') ||
          file.endsWith('.tmp')
        ) {
          try {
            fs.unlinkSync(path.join(cacheDir, file));
          } catch {
            // ignore
          }
        }
      }
    } catch (error) {
      console.warn(`[tts-cache] Failed to clear directory:`, error);
    }
  }

  /**
   * Remove expired entries, corrupted JSONs (with their audio),
   * orphaned .mp3 files without JSON metadata, and abandoned .tmp files.
   */
  public cleanExpired(): number {
    if (!this.ensureDir()) return 0;
    const cacheDir = this.getCacheDir();
    let cleaned = 0;
    const now = Date.now();

    try {
      const files = fs.readdirSync(cacheDir);
      const knownJsonHashes = new Set<string>();

      // Step 1: Scan all .json files and clean expired/corrupted entries
      for (const file of files) {
        if (file.endsWith('.json')) {
          const hash = file.slice(0, -5);
          knownJsonHashes.add(hash);
          const filePath = path.join(cacheDir, file);
          try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const entry: DiskTtsCacheEntry = JSON.parse(content);
            if (
              entry.ttl > 0 &&
              Number.isFinite(entry.ttl) &&
              now - entry.timestamp > entry.ttl
            ) {
              this.deleteByHash(hash);
              cleaned++;
            }
          } catch {
            // Remove corrupted file and its audio counterpart
            this.deleteByHash(hash);
            cleaned++;
          }
        } else if (file.endsWith('.tmp')) {
          // Clean lingering temp files older than 1 minute
          const filePath = path.join(cacheDir, file);
          try {
            const stat = fs.statSync(filePath);
            if (now - stat.mtimeMs > 60_000) {
              fs.unlinkSync(filePath);
            }
          } catch {
            // ignore
          }
        }
      }

      // Step 2: Clean orphaned .mp3 files (audio files whose .json is missing)
      for (const file of files) {
        if (file.endsWith('.mp3')) {
          const hash = file.slice(0, -4);
          if (!knownJsonHashes.has(hash)) {
            try {
              fs.unlinkSync(path.join(cacheDir, file));
              cleaned++;
            } catch {
              // ignore
            }
          }
        }
      }
    } catch (error) {
      console.warn(`[tts-cache] Failed during cleanExpired:`, error);
    }

    return cleaned;
  }

  /**
   * Prune cache entries to stay within maxSizeBytes quota.
   * Evicts whole entries atomically (.json + .mp3) oldest first (LRU by mtime).
   */
  public prune(maxSizeBytes?: number): {
    deletedCount: number;
    freedBytes: number;
  } {
    if (!this.ensureDir()) return { deletedCount: 0, freedBytes: 0 };
    const cacheDir = this.getCacheDir();
    const limit = maxSizeBytes ?? this.maxSizeBytes;
    let deletedCount = 0;
    let freedBytes = 0;

    try {
      // Step 1: Clean expired entries and orphaned files first
      deletedCount += this.cleanExpired();

      // Step 2: Group files by hash to ensure atomic eviction of both metadata and audio
      const files = fs.readdirSync(cacheDir);
      const entriesByHash = new Map<
        string,
        {
          hash: string;
          totalSize: number;
          latestMtime: number;
        }
      >();
      let totalSize = 0;

      for (const file of files) {
        if (file.endsWith('.json') || file.endsWith('.mp3')) {
          const filePath = path.join(cacheDir, file);
          try {
            const stat = fs.statSync(filePath);
            const isJson = file.endsWith('.json');
            const hash = isJson ? file.slice(0, -5) : file.slice(0, -4);

            let group = entriesByHash.get(hash);
            if (!group) {
              group = { hash, totalSize: 0, latestMtime: 0 };
              entriesByHash.set(hash, group);
            }
            group.totalSize += stat.size;
            group.latestMtime = Math.max(group.latestMtime, stat.mtimeMs);
            totalSize += stat.size;
          } catch {
            // ignore
          }
        }
      }

      if (totalSize <= limit) {
        return { deletedCount, freedBytes };
      }

      // Step 3: Sort entries by oldest first (LRU)
      const sortedEntries = Array.from(entriesByHash.values()).sort(
        (a, b) => a.latestMtime - b.latestMtime
      );

      for (const entry of sortedEntries) {
        if (totalSize <= limit) break;
        const wasDeleted = this.deleteByHash(entry.hash);
        if (wasDeleted) {
          totalSize -= entry.totalSize;
          freedBytes += entry.totalSize;
          deletedCount++;
        }
      }
    } catch (error) {
      console.warn(`[tts-cache] Failed during prune:`, error);
    }

    return { deletedCount, freedBytes };
  }

  /**
   * Get cache directory statistics.
   */
  public getStats(): CacheStats {
    const cacheDir = this.getCacheDir();
    if (!this.ensureDir()) {
      return { count: 0, totalSizeBytes: 0, cacheDir };
    }

    let count = 0;
    let totalSizeBytes = 0;

    try {
      const files = fs.readdirSync(cacheDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          count++;
        }
        if (file.endsWith('.json') || file.endsWith('.mp3')) {
          try {
            const stat = fs.statSync(path.join(cacheDir, file));
            totalSizeBytes += stat.size;
          } catch {
            // ignore
          }
        }
      }
    } catch {
      // ignore
    }

    return { count, totalSizeBytes, cacheDir };
  }
}

// Export singleton instance
export const persistentTtsCache = new PersistentTtsCache();
