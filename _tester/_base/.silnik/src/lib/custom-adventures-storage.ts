/**
 * Custom Adventures Persistent Storage (IND-130 / Issue #419)
 *
 * IndexedDB primary + localStorage fallback dla custom adventures (PDF + AI analysis).
 *
 * Optymalizacja pamięciowa (Issue #419):
 *  - Schemat IndexedDB podniesiony do v2 ze składowaniem per-rekord (`key: adv.id`).
 *  - Kompresja ciężkich struktur (`graph`, `fullNarrativeSummary`, `lorebookData`)
 *    za pomocą standardowego browserowego `CompressionStream('gzip')` i `DecompressionStream('gzip')`
 *    (lub fallbacku JSON przy braku wsparcia strumieni kompresji).
 *  - 100% wsteczna kompatybilność: legacy rekord `'default'` z v1 jest automatycznie i
 *    bezstratnie migrowany do per-rekordów przy pierwszym odczycie.
 *  - W localStorage trzymana jest wyłącznie ultralekka kopia metadanych (id, title, era,
 *    eraLabel, yearRange, location, country, isCustom, fileName) bez ciężkich grafów,
 *    gwarantując bezpieczeństwo przed przekroczeniem limitu pamięci (DOM QuotaExceededError).
 */

import type { CustomAdventure } from './adventures-data';
import type { AdventureGraph } from './types';

export const DB_NAME = 'zew-custom-adventures';
export const DB_VERSION = 2;
export const STORE = 'adventures';
export const LEGACY_RECORD_KEY = 'default';
export const META_RECORD_KEY = '__meta__';
export const STORAGE_KEY = 'custom_adventures';

export interface StoredAdventures {
  adventures: CustomAdventure[];
  activeId: string | null;
}

export interface HeavyAdventureData {
  graph?: AdventureGraph;
  fullNarrativeSummary?: string;
  lorebookData?: unknown;
  puzzles?: unknown[];
  [key: string]: unknown;
}

export interface StoredAdventureRecord {
  id: string; // adv.id
  adventure: CustomAdventure; // Oczyszczona baza bez ciężkich struktur
  compressedPayload?: Uint8Array | string; // Gzip-compressed payload
  rawHeavyPayload?: HeavyAdventureData; // Fallback gdy CompressionStream niedostępny
  isCompressed?: boolean;
  updatedAt: number;
}

export interface StoredMetaRecord {
  id: typeof META_RECORD_KEY;
  activeId: string | null;
  adventureIds: string[];
  updatedAt: number;
}

export interface LegacyStoredRecord extends StoredAdventures {
  id: typeof LEGACY_RECORD_KEY;
  updatedAt: number;
}

export interface LeanAdventureMeta {
  id: string;
  title: string;
  era: CustomAdventure['era'];
  eraLabel: string;
  yearRange: string;
  location: string;
  country: string;
  isCustom: boolean;
  fileName: string;
  tone?: CustomAdventure['tone'];
  documentType?: CustomAdventure['documentType'];
  uploadedAt?: string;
  isAnalyzed?: boolean;
}

export interface StoredLeanAdventures {
  adventures: LeanAdventureMeta[];
  activeId: string | null;
  isLeanBackup?: boolean;
}

function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

export function getCompressionStream(): typeof CompressionStream | undefined {
  if (typeof CompressionStream !== 'undefined') return CompressionStream;
  if (typeof window !== 'undefined' && (window as any).CompressionStream) {
    return (window as any).CompressionStream;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).CompressionStream) {
    return (globalThis as any).CompressionStream;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const streamWeb = require('stream/web');
    if (streamWeb?.CompressionStream) return streamWeb.CompressionStream;
  } catch {}
  return undefined;
}

export function getDecompressionStream(): typeof DecompressionStream | undefined {
  if (typeof DecompressionStream !== 'undefined') return DecompressionStream;
  if (typeof window !== 'undefined' && (window as any).DecompressionStream) {
    return (window as any).DecompressionStream;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).DecompressionStream) {
    return (globalThis as any).DecompressionStream;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const streamWeb = require('stream/web');
    if (streamWeb?.DecompressionStream) return streamWeb.DecompressionStream;
  } catch {}
  return undefined;
}

export function getReadableStream(): typeof ReadableStream | undefined {
  if (typeof ReadableStream !== 'undefined') return ReadableStream;
  if (typeof window !== 'undefined' && (window as any).ReadableStream) {
    return (window as any).ReadableStream;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).ReadableStream) {
    return (globalThis as any).ReadableStream;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const streamWeb = require('stream/web');
    if (streamWeb?.ReadableStream) return streamWeb.ReadableStream;
  } catch {}
  return undefined;
}

export function getTextEncoder(): typeof TextEncoder {
  if (typeof TextEncoder !== 'undefined') return TextEncoder;
  if (typeof window !== 'undefined' && (window as any).TextEncoder) {
    return (window as any).TextEncoder;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).TextEncoder) {
    return (globalThis as any).TextEncoder;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const util = require('util');
    if (util?.TextEncoder) return util.TextEncoder;
  } catch {}
  return (global as any).TextEncoder;
}

export function getTextDecoder(): typeof TextDecoder {
  if (typeof TextDecoder !== 'undefined') return TextDecoder;
  if (typeof window !== 'undefined' && (window as any).TextDecoder) {
    return (window as any).TextDecoder;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).TextDecoder) {
    return (globalThis as any).TextDecoder;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const util = require('util');
    if (util?.TextDecoder) return util.TextDecoder;
  } catch {}
  return (global as any).TextDecoder;
}

export function isCompressionStreamSupported(): boolean {
  return Boolean(
    getCompressionStream() &&
      getDecompressionStream() &&
      getReadableStream() &&
      getTextEncoder() &&
      getTextDecoder()
  );
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Kompresuje obiekt JSON za pomocą gzip (CompressionStream).
 * W razie braku wsparcia zwraca null (sygnał dla fallbacku).
 */
export async function compressPayload(data: unknown): Promise<Uint8Array | null> {
  const CS = getCompressionStream();
  const RS = getReadableStream();
  const TE = getTextEncoder();

  if (!CS || !RS || !TE) {
    return null;
  }

  try {
    const jsonString = JSON.stringify(data);
    const encoder = new TE();
    const encodedData = encoder.encode(jsonString);

    const stream = new RS({
      start(controller: any) {
        controller.enqueue(encodedData);
        controller.close();
      },
    }).pipeThrough(new CS('gzip'));

    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value as Uint8Array);
    }

    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const c of chunks) {
      result.set(c, offset);
      offset += c.length;
    }
    return result;
  } catch (err) {
    console.warn('CompressionStream failed, fallback to raw payload:', err);
    return null;
  }
}

/**
 * Pomocnicza kompresja do Base64
 */
export async function compressPayloadToBase64(data: unknown): Promise<string | null> {
  const bytes = await compressPayload(data);
  return bytes ? uint8ArrayToBase64(bytes) : null;
}

/**
 * Dekompresuje gzip Uint8Array / ArrayBuffer / base64 string z powrotem do obiektu.
 */
export async function decompressPayload<T = unknown>(
  payload: Uint8Array | ArrayBuffer | string
): Promise<T | null> {
  if (!payload) return null;

  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return JSON.parse(trimmed) as T;
      } catch {
        return null;
      }
    }
    try {
      payload = base64ToUint8Array(trimmed);
    } catch {
      return null;
    }
  }

  const DCS = getDecompressionStream();
  const RS = getReadableStream();
  const TD = getTextDecoder();

  if (!DCS || !RS || !TD) {
    console.warn('DecompressionStream not supported in this environment');
    return null;
  }

  try {
    const inputBytes =
      payload instanceof Uint8Array ? payload : new Uint8Array(payload as ArrayBuffer);

    const stream = new RS({
      start(controller: any) {
        controller.enqueue(inputBytes);
        controller.close();
      },
    }).pipeThrough(new DCS('gzip'));

    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value as Uint8Array);
    }

    const decoder = new TD();
    let text = '';
    for (const c of chunks) {
      text += decoder.decode(c, { stream: true });
    }
    text += decoder.decode();

    return JSON.parse(text) as T;
  } catch (err) {
    console.warn('DecompressionStream failed:', err);
    return null;
  }
}

/**
 * Wyodrębnia ciężkie struktury (graf, syntezę narracyjną, lorebook, zagadki) z przygody
 */
export function extractHeavyData(adv: CustomAdventure): {
  leanAdv: CustomAdventure;
  heavyData: HeavyAdventureData;
  hasHeavy: boolean;
} {
  const { graph, ...rest } = adv;
  const anyAdv = adv as unknown as Record<string, unknown>;
  const fullNarrativeSummary =
    typeof anyAdv.fullNarrativeSummary === 'string'
      ? anyAdv.fullNarrativeSummary
      : undefined;
  const lorebookData = adv.lorebookData;
  const puzzles = adv.puzzles;

  const heavyData: HeavyAdventureData = {};
  let hasHeavy = false;

  if (
    graph &&
    (graph.locations?.length ||
      graph.npcs?.length ||
      graph.clues?.length ||
      graph.connections?.length)
  ) {
    heavyData.graph = graph;
    hasHeavy = true;
  }

  if (fullNarrativeSummary) {
    heavyData.fullNarrativeSummary = fullNarrativeSummary;
    hasHeavy = true;
  }

  if (lorebookData) {
    heavyData.lorebookData = lorebookData;
    hasHeavy = true;
  }

  if (puzzles && puzzles.length > 0) {
    heavyData.puzzles = puzzles;
    hasHeavy = true;
  }

  const leanAdv: CustomAdventure = {
    ...rest,
    graph: { npcs: [], locations: [], clues: [], connections: [] },
  };

  return { leanAdv, heavyData, hasHeavy };
}

/**
 * Rekonstruuje pełną przygodę z rekordu magazynu IDB
 */
export async function reconstructAdventure(
  record: StoredAdventureRecord | CustomAdventure
): Promise<CustomAdventure> {
  if (!('adventure' in record)) {
    return record as CustomAdventure;
  }

  const rec = record as StoredAdventureRecord;
  let heavyData: HeavyAdventureData | null = null;

  if (rec.isCompressed && rec.compressedPayload) {
    heavyData = await decompressPayload<HeavyAdventureData>(rec.compressedPayload);
  } else if (rec.rawHeavyPayload) {
    heavyData = rec.rawHeavyPayload;
  }

  const base = rec.adventure || ({} as CustomAdventure);
  return {
    ...base,
    ...(heavyData?.graph ? { graph: heavyData.graph } : {}),
    ...(heavyData?.fullNarrativeSummary
      ? { fullNarrativeSummary: heavyData.fullNarrativeSummary }
      : {}),
    ...(heavyData?.lorebookData
      ? { lorebookData: heavyData.lorebookData as CustomAdventure['lorebookData'] }
      : {}),
    ...(heavyData?.puzzles
      ? { puzzles: heavyData.puzzles as CustomAdventure['puzzles'] }
      : {}),
  };
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

/**
 * Tworzy rekord IDB dla pojedynczej przygody (z kompresją jeśli dostępna)
 */
async function createAdventureRecord(
  adv: CustomAdventure
): Promise<StoredAdventureRecord> {
  const { leanAdv, heavyData, hasHeavy } = extractHeavyData(adv);

  if (hasHeavy) {
    const compressed = await compressPayload(heavyData);
    if (compressed) {
      return {
        id: adv.id,
        adventure: leanAdv,
        compressedPayload: compressed,
        isCompressed: true,
        updatedAt: Date.now(),
      };
    }
    return {
      id: adv.id,
      adventure: leanAdv,
      rawHeavyPayload: heavyData,
      isCompressed: false,
      updatedAt: Date.now(),
    };
  }

  return {
    id: adv.id,
    adventure: adv,
    isCompressed: false,
    updatedAt: Date.now(),
  };
}

async function readFromIndexedDB(): Promise<StoredAdventures | null> {
  try {
    const db = await openDB();

    // 1. Sprawdź czy istnieje legacy rekord 'default' (migracja z v1)
    const legacyRecord = await new Promise<LegacyStoredRecord | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(LEGACY_RECORD_KEY);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        resolve((req.result as LegacyStoredRecord) || null);
      };
    });

    if (legacyRecord && Array.isArray(legacyRecord.adventures) && legacyRecord.adventures.length > 0) {
      console.log(
        `🔄 Migracja IndexedDB v1 -> v2: konwersja ${legacyRecord.adventures.length} przygód do modelu per-rekord...`
      );

      // Migrujemy dane do nowego formatu
      await writeToIndexedDB({
        adventures: legacyRecord.adventures,
        activeId: legacyRecord.activeId ?? null,
      });

      // Usuwamy legacy rekord 'default'
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        const req = tx.objectStore(STORE).delete(LEGACY_RECORD_KEY);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve();
      });

      return {
        adventures: legacyRecord.adventures,
        activeId: legacyRecord.activeId ?? null,
      };
    }

    // 2. Czytamy rekord metadanych __meta__
    const metaRecord = await new Promise<StoredMetaRecord | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(META_RECORD_KEY);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        resolve((req.result as StoredMetaRecord) || null);
      };
    });

    if (metaRecord && Array.isArray(metaRecord.adventureIds)) {
      const adventures: CustomAdventure[] = [];

      for (const id of metaRecord.adventureIds) {
        const rawRec = await new Promise<StoredAdventureRecord | CustomAdventure | null>(
          (resolve, reject) => {
            const tx = db.transaction(STORE, 'readonly');
            const req = tx.objectStore(STORE).get(id);
            req.onerror = () => reject(req.error);
            req.onsuccess = () => {
              resolve((req.result as StoredAdventureRecord | CustomAdventure) || null);
            };
          }
        );

        if (rawRec) {
          const adv = await reconstructAdventure(rawRec);
          adventures.push(adv);
        }
      }

      return {
        adventures,
        activeId: metaRecord.activeId ?? null,
      };
    }

    // 3. Fallback: jeśli __meta__ brak, ale są pojedyncze rekordy w store
    const allRecords = await new Promise<any[]>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      if (typeof store.getAll === 'function') {
        const req = store.getAll();
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve(req.result || []);
      } else {
        resolve([]);
      }
    });

    const adventureRecords = allRecords.filter(
      (r) => r && r.id && r.id !== META_RECORD_KEY && r.id !== LEGACY_RECORD_KEY
    );

    if (adventureRecords.length > 0) {
      const adventures: CustomAdventure[] = [];
      for (const rec of adventureRecords) {
        adventures.push(await reconstructAdventure(rec));
      }
      return {
        adventures,
        activeId: null,
      };
    }

    return null;
  } catch (error) {
    console.warn('IndexedDB read failed, will fallback to localStorage', error);
    return null;
  }
}

async function writeToIndexedDB(data: StoredAdventures): Promise<void> {
  try {
    const db = await openDB();

    // Przygotuj skompresowane rekordy przed otwarciem transakcji (operacje async)
    const recordsToPut: StoredAdventureRecord[] = [];
    for (const adv of data.adventures) {
      recordsToPut.push(await createAdventureRecord(adv));
    }

    const metaRecord: StoredMetaRecord = {
      id: META_RECORD_KEY,
      activeId: data.activeId,
      adventureIds: data.adventures.map((a) => a.id),
      updatedAt: Date.now(),
    };

    const currentIds = new Set(data.adventures.map((a) => a.id));

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);

      // 1. Zapisz rekord metadanych
      store.put(metaRecord);

      // 2. Zapisz każdy rekord przygody
      for (const record of recordsToPut) {
        store.put(record);
      }

      // 3. Natychmiast usuń legacy 'default' jeśli istnieje
      store.delete(LEGACY_RECORD_KEY);

      // 4. Usuń przestarzałe/usunięte rekordy przygód
      if (typeof store.getAllKeys === 'function') {
        const keysReq = store.getAllKeys();
        keysReq.onsuccess = () => {
          const keys = keysReq.result || [];
          for (const key of keys) {
            const keyStr = String(key);
            if (keyStr === LEGACY_RECORD_KEY) {
              store.delete(key);
            } else if (keyStr !== META_RECORD_KEY && !currentIds.has(keyStr)) {
              store.delete(key);
            }
          }
        };
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.warn(
      'IndexedDB write failed (localStorage backup nadal aktywne)',
      error
    );
  }
}

/**
 * Zapisuje pojedynczy rekord przygody w IndexedDB (dla szybkiej aktualizacji)
 */
export async function saveAdventureRecord(adv: CustomAdventure): Promise<void> {
  try {
    const db = await openDB();
    const record = await createAdventureRecord(adv);

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      store.put(record);

      // Uaktualnij listę w __meta__ jeśli brak
      const metaReq = store.get(META_RECORD_KEY);
      metaReq.onsuccess = () => {
        const meta = (metaReq.result as StoredMetaRecord) || {
          id: META_RECORD_KEY,
          activeId: null,
          adventureIds: [],
          updatedAt: Date.now(),
        };
        if (!meta.adventureIds.includes(adv.id)) {
          meta.adventureIds.push(adv.id);
          meta.updatedAt = Date.now();
          store.put(meta);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('saveAdventureRecord failed:', err);
  }
}

/**
 * Wczytuje pojedynczą przygodę bezpośrednio po kluczu id
 */
export async function loadAdventureRecord(id: string): Promise<CustomAdventure | null> {
  try {
    const db = await openDB();
    const rawRec = await new Promise<StoredAdventureRecord | CustomAdventure | null>(
      (resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).get(id);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          resolve((req.result as StoredAdventureRecord | CustomAdventure) || null);
        };
      }
    );

    if (!rawRec) return null;
    return await reconstructAdventure(rawRec);
  } catch (err) {
    console.warn(`loadAdventureRecord(${id}) failed:`, err);
    return null;
  }
}

/**
 * Usuwa pojedynczą przygodę z IndexedDB po kluczu id
 */
export async function deleteAdventureRecord(id: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      store.delete(id);

      const metaReq = store.get(META_RECORD_KEY);
      metaReq.onsuccess = () => {
        const meta = metaReq.result as StoredMetaRecord | undefined;
        if (meta && Array.isArray(meta.adventureIds)) {
          meta.adventureIds = meta.adventureIds.filter((item) => item !== id);
          if (meta.activeId === id) meta.activeId = null;
          meta.updatedAt = Date.now();
          store.put(meta);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn(`deleteAdventureRecord(${id}) failed:`, err);
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

/**
 * Zapisuje ultralekką kopię metadanych do localStorage (poniżej limitu quota)
 */
function writeToLocalStorage(data: StoredAdventures): void {
  if (typeof window === 'undefined') return;
  try {
    const leanAdventures: LeanAdventureMeta[] = data.adventures.map((adv) => ({
      id: adv.id,
      title: adv.title,
      era: adv.era,
      eraLabel: adv.eraLabel,
      yearRange: adv.yearRange,
      location: adv.location,
      country: adv.country,
      isCustom: Boolean(adv.isCustom),
      fileName: adv.fileName || '',
      tone: adv.tone,
      documentType: adv.documentType,
      uploadedAt: adv.uploadedAt,
      isAnalyzed: adv.isAnalyzed,
    }));

    const leanPayload: StoredLeanAdventures = {
      adventures: leanAdventures,
      activeId: data.activeId,
      isLeanBackup: true,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(leanPayload));
  } catch (error) {
    console.warn('localStorage lean write failed', error);
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
 * Save custom adventures. Defense-in-depth: pisz do IndexedDB + ultralekkie metadane do localStorage.
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
