/**
 * Custom Adventures Persistent Storage (IND-130)
 *
 * IndexedDB primary + localStorage fallback dla custom adventures (PDF + AI analysis).
 *
 * Pre-existing problem: useCustomAdventures.ts trzymało dane TYLKO w
 * localStorage('custom_adventures'). Browser clear cache (Ctrl+Shift+Del z
 * domyślnymi opcjami) wymazywał wszystkie custom adventures bez ostrzeżenia.
 *
 * Strategia (Wariant B per ticket IND-130):
 *  - IndexedDB jest persistent w większości przeglądarek przy routine cache clear
 *    (Chrome/Firefox preserve IndexedDB przy domyślnych opcjach Ctrl+Shift+Del).
 *  - localStorage NADAL writeowane jako defense-in-depth (gdy IndexedDB niedostępne
 *    np. tryb prywatny Safari / starsze browsers).
 *  - Migration jednorazowa: przy pierwszym mount jeśli IndexedDB pusty a
 *    localStorage ma dane → skopiuj do IndexedDB.
 *
 * Wzorzec na bazie src/lib/persistent-media-cache.ts (sesja 73 IND-115 + 83 IND-136).
 */

import type { CustomAdventure } from './adventures-data';

const DB_NAME = 'zew-custom-adventures';
const DB_VERSION = 1;
const STORE = 'adventures';
const RECORD_KEY = 'default';
export const STORAGE_KEY = 'custom_adventures';

export interface StoredAdventures {
  adventures: CustomAdventure[];
  activeId: string | null;
}

interface StoredRecord extends StoredAdventures {
  id: typeof RECORD_KEY;
  updatedAt: number;
}

function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      reject(new Error('IndexedDB not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
  });

  return dbPromise;
}

async function readFromIndexedDB(): Promise<StoredAdventures | null> {
  try {
    const db = await openDB();
    return await new Promise<StoredAdventures | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(RECORD_KEY);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const record = req.result as StoredRecord | undefined;
        if (!record) {
          resolve(null);
          return;
        }
        resolve({
          adventures: record.adventures || [],
          activeId: record.activeId ?? null,
        });
      };
    });
  } catch (error) {
    console.warn('IndexedDB read failed, will fallback to localStorage', error);
    return null;
  }
}

async function writeToIndexedDB(data: StoredAdventures): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const record: StoredRecord = {
        id: RECORD_KEY,
        adventures: data.adventures,
        activeId: data.activeId,
        updatedAt: Date.now(),
      };
      const req = tx.objectStore(STORE).put(record);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
    });
  } catch (error) {
    console.warn(
      'IndexedDB write failed (localStorage backup nadal aktywne)',
      error
    );
  }
}

function readFromLocalStorage(): StoredAdventures | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !Array.isArray((parsed as StoredAdventures).adventures)
    ) {
      console.warn(
        'custom_adventures localStorage corrupt (invalid shape), resetting'
      );
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    const obj = parsed as StoredAdventures;
    return {
      adventures: obj.adventures,
      activeId: typeof obj.activeId === 'string' ? obj.activeId : null,
    };
  } catch (error) {
    console.warn(
      'custom_adventures localStorage parse error, resetting',
      error
    );
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function writeToLocalStorage(data: StoredAdventures): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('localStorage write failed (quota?)', error);
  }
}

/**
 * Load custom adventures. IndexedDB primary, localStorage fallback.
 * 1-time migration: jeśli IndexedDB pusty a localStorage ma dane → kopiuj.
 */
export async function loadCustomAdventures(): Promise<StoredAdventures> {
  const empty: StoredAdventures = { adventures: [], activeId: null };

  const fromIDB = await readFromIndexedDB();
  if (fromIDB) {
    return fromIDB;
  }

  const fromLS = readFromLocalStorage();
  if (fromLS) {
    // Migracja jednorazowa do IndexedDB (nie blokujemy zwrotu danych)
    void writeToIndexedDB(fromLS);
    return fromLS;
  }

  return empty;
}

/**
 * Save custom adventures. Defense-in-depth: pisz do IndexedDB + localStorage.
 */
export async function saveCustomAdventures(
  data: StoredAdventures
): Promise<void> {
  writeToLocalStorage(data);
  await writeToIndexedDB(data);
}

/**
 * Export jako JSON string do manualnego backupu.
 */
export function exportAsJSON(data: StoredAdventures): string {
  return JSON.stringify(
    { version: 1, exportedAt: new Date().toISOString(), ...data },
    null,
    2
  );
}

/**
 * Parse import JSON string. Zwraca null jeśli kształt nieprawidłowy.
 */
export function parseImportJSON(json: string): StoredAdventures | null {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !Array.isArray((parsed as StoredAdventures).adventures)
    ) {
      return null;
    }
    const obj = parsed as StoredAdventures;
    return {
      adventures: obj.adventures,
      activeId: typeof obj.activeId === 'string' ? obj.activeId : null,
    };
  } catch {
    return null;
  }
}

/**
 * Reset module-level cache. Tylko dla testów.
 */
export function _resetDBCache(): void {
  dbPromise = null;
}
