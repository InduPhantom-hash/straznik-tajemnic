/**
 * Binary format dla embeddingów RAG (Zew-App-Local, IND-263)
 *
 * Zamiast trzymać `values` jako JSON `number[]` (packed doubles, 8 B/element),
 * trzymamy je jako Float32 (4 B/element) w pliku binarnym. Oszczędza ~połowę
 * RAM na wektorach + szybszy cosine (typed array). Bezstratne dla cosine -
 * Gemini i tak zwraca embeddingi w ~float32 precyzji.
 *
 * Format per namespace (statyczny: rules / adventures / mythos):
 *   data/rag/{ns}.bin       - header 16 B + count × dim × Float32 LE
 *   data/rag/{ns}.meta.json - [{ id, metadata, text? }] w kolejności wektorów (bez values)
 *
 * Header (16 B):
 *   0..3   magic 'ZRG1' (ASCII)
 *   4..7   count  (uint32 LE)
 *   8..11  dim    (uint32 LE)
 *   12..15 reserved (uint32 LE, = 0)
 *
 * Endianness: little-endian (macOS ARM/x86 = jedyna platforma launchera).
 * Czysty moduł: tylko fs/path/Buffer + type-only import metadanych. Zero
 * side-effectów (bezpieczny import w standalone skryptach --experimental-strip-types).
 */

import fs from 'fs';
import path from 'path';
import type { VectorMetadata } from './pinecone-client';

/** Magiczne bajty nagłówka (wersja formatu). */
const MAGIC = 'ZRG1';
/** Rozmiar nagłówka w bajtach (podzielny przez 4 → alignment Float32). */
const HEADER_SIZE = 16;

/** Rekord wektora. `values` jako ArrayLike → akceptuje number[] i Float32Array. */
export interface StoredVectorRecord {
  id: string;
  values: ArrayLike<number>;
  metadata: VectorMetadata;
  text?: string;
}

/** Wpis w pliku .meta.json (rekord bez values). */
interface MetaEntry {
  id: string;
  metadata: VectorMetadata;
  text?: string;
}

/** Namespace → bezpieczna nazwa pliku (`/` i `\` → `__`). Spójne z local-vector-store. */
function safeName(namespace: string): string {
  return namespace.replace(/[/\\]/g, '__');
}

function binPath(dir: string, namespace: string): string {
  return path.join(dir, `${safeName(namespace)}.bin`);
}

function metaPath(dir: string, namespace: string): string {
  return path.join(dir, `${safeName(namespace)}.meta.json`);
}

/** True gdy oba pliki binarne (.bin + .meta.json) istnieją dla namespace. */
export function hasBinaryNamespace(dir: string, namespace: string): boolean {
  return (
    fs.existsSync(binPath(dir, namespace)) &&
    fs.existsSync(metaPath(dir, namespace))
  );
}

/**
 * Usuwa pliki binarne (.bin + .meta.json) namespace. Idempotentne (brak = no-op).
 * Wołane po runtime mutacji (upsert/delete zapisuje JSON) by loader czytał świeży
 * JSON zamiast nieaktualnego binarnego. Re-konwersja: `npm run rag:convert-binary`.
 */
export function deleteBinaryNamespace(dir: string, namespace: string): void {
  for (const f of [binPath(dir, namespace), metaPath(dir, namespace)]) {
    try {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    } catch (e) {
      console.warn(`⚠️ binary-format: usuwanie "${f}" nieudane:`, e);
    }
  }
}

/**
 * Liczba wektorów z samego nagłówka .bin (bez ładowania values).
 * Dla getStats - tani odczyt 16 B. null gdy brak pliku / zła magic.
 */
export function countBinaryNamespace(
  dir: string,
  namespace: string
): number | null {
  const file = binPath(dir, namespace);
  if (!fs.existsSync(file)) return null;
  let fd: number | null = null;
  try {
    fd = fs.openSync(file, 'r');
    const header = Buffer.alloc(HEADER_SIZE);
    fs.readSync(fd, header, 0, HEADER_SIZE, 0);
    if (header.toString('ascii', 0, 4) !== MAGIC) return null;
    return header.readUInt32LE(4);
  } catch {
    return null;
  } finally {
    if (fd !== null) fs.closeSync(fd);
  }
}

/**
 * Zapis namespace do formatu binarnego (atomic: tmp + rename dla obu plików).
 * `values` każdego rekordu musi mieć tę samą długość (dim). Pusta lista → count 0.
 */
export function writeBinaryNamespace(
  dir: string,
  namespace: string,
  records: StoredVectorRecord[]
): void {
  fs.mkdirSync(dir, { recursive: true });

  const count = records.length;
  const dim = count > 0 ? records[0].values.length : 0;

  // Body: jeden ciągły Float32Array (count × dim).
  const flat = new Float32Array(count * dim);
  for (let i = 0; i < count; i++) {
    const v = records[i].values;
    if (v.length !== dim) {
      throw new Error(
        `binary-format: niespójny dim w "${namespace}" rekord ${i} (${v.length} vs ${dim})`
      );
    }
    flat.set(v as ArrayLike<number>, i * dim);
  }

  const header = Buffer.alloc(HEADER_SIZE);
  header.write(MAGIC, 0, 'ascii');
  header.writeUInt32LE(count, 4);
  header.writeUInt32LE(dim, 8);
  header.writeUInt32LE(0, 12);
  const body = Buffer.from(flat.buffer, flat.byteOffset, flat.byteLength);

  const binFile = binPath(dir, namespace);
  const binTmp = `${binFile}.tmp`;
  fs.writeFileSync(binTmp, Buffer.concat([header, body]));
  fs.renameSync(binTmp, binFile);

  const meta: MetaEntry[] = records.map((r) => ({
    id: r.id,
    metadata: r.metadata,
    ...(r.text !== undefined ? { text: r.text } : {}),
  }));
  const metaFile = metaPath(dir, namespace);
  const metaTmp = `${metaFile}.tmp`;
  fs.writeFileSync(metaTmp, JSON.stringify(meta), 'utf-8');
  fs.renameSync(metaTmp, metaFile);
}

/**
 * Odczyt namespace z formatu binarnego. Buduje rekordy z values jako Float32Array
 * (subarray na wspólnym buforze, zero-copy view). null gdy brak pliku lub
 * niespójność (zła magic / dim 0 / count≠meta.length / rozmiar body) → loader robi fallback do JSON.
 */
export function readBinaryNamespace(
  dir: string,
  namespace: string
): StoredVectorRecord[] | null {
  const binFile = binPath(dir, namespace);
  const metaFile = metaPath(dir, namespace);
  if (!fs.existsSync(binFile) || !fs.existsSync(metaFile)) return null;

  try {
    const buf = fs.readFileSync(binFile);
    if (buf.length < HEADER_SIZE || buf.toString('ascii', 0, 4) !== MAGIC) {
      console.warn(`⚠️ binary-format: zła magic w "${namespace}.bin"`);
      return null;
    }
    const count = buf.readUInt32LE(4);
    const dim = buf.readUInt32LE(8);
    const expectedBytes = count * dim * 4;
    if (buf.length - HEADER_SIZE !== expectedBytes) {
      console.warn(
        `⚠️ binary-format: rozmiar body "${namespace}.bin" ${buf.length - HEADER_SIZE} ≠ ${expectedBytes}`
      );
      return null;
    }

    const meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8')) as MetaEntry[];
    if (meta.length !== count) {
      console.warn(
        `⚠️ binary-format: meta count "${namespace}" ${meta.length} ≠ bin ${count}`
      );
      return null;
    }
    if (count === 0) return [];

    // Skopiuj body do aligned ArrayBuffer (byteOffset%4=0 gwarantowane przez slice).
    const start = buf.byteOffset + HEADER_SIZE;
    const aligned = buf.buffer.slice(start, start + expectedBytes);
    const flat = new Float32Array(aligned);

    const records: StoredVectorRecord[] = new Array(count);
    for (let i = 0; i < count; i++) {
      records[i] = {
        id: meta[i].id,
        values: flat.subarray(i * dim, (i + 1) * dim),
        metadata: meta[i].metadata,
        text: meta[i].text,
      };
    }
    return records;
  } catch (e) {
    console.warn(`⚠️ binary-format: odczyt "${namespace}" nieudany:`, e);
    return null;
  }
}
