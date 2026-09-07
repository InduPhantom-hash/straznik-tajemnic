import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config({
  path: process.env.MYTHOS_ENV_FILE || path.join(process.cwd(), '../../../.env.local'),
});

const dataDir = path.join(process.cwd(), 'data', 'rag');
const sourcePath = path.join(process.cwd(), 'data', 'mythos', 'canonical-mythos.json');
const binPath = path.join(dataDir, 'mythos.bin');
const metaPath = path.join(dataDir, 'mythos.meta.json');
const batchSize = 20;
// Limit darmowego Gemini to 100 embedContent/min. 20 równoległych żądań co
// 15 s zostawia bezpieczny margines i pozwala wznowić plik po przerwaniu.
const delayMs = 15000;
const dimensions = 768;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readExisting() {
  if (!fs.existsSync(binPath) || !fs.existsSync(metaPath)) return [];
  const bin = fs.readFileSync(binPath);
  if (bin.toString('ascii', 0, 4) !== 'ZRG1') return [];
  const count = bin.readUInt32LE(4);
  const dim = bin.readUInt32LE(8);
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  if (count !== meta.length || dim !== dimensions) return [];
  const values = new Float32Array(bin.buffer.slice(bin.byteOffset + 16, bin.byteOffset + bin.length));
  return meta.map((entry, index) => ({ ...entry, values: values.slice(index * dim, (index + 1) * dim) }));
}

function writeBinary(records) {
  fs.mkdirSync(dataDir, { recursive: true });
  const body = new Float32Array(records.length * dimensions);
  records.forEach((record, index) => body.set(record.values, index * dimensions));
  const header = Buffer.alloc(16);
  header.write('ZRG1', 0, 'ascii');
  header.writeUInt32LE(records.length, 4);
  header.writeUInt32LE(dimensions, 8);
  const tempBin = `${binPath}.tmp`;
  const tempMeta = `${metaPath}.tmp`;
  fs.writeFileSync(tempBin, Buffer.concat([header, Buffer.from(body.buffer)]));
  fs.writeFileSync(tempMeta, JSON.stringify(records.map(({ values, ...entry }) => entry)));
  fs.renameSync(tempBin, binPath);
  fs.renameSync(tempMeta, metaPath);
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error('Brak GEMINI_API_KEY w konfiguracji środowiska.');
if (!fs.existsSync(sourcePath)) throw new Error(`Brak kanonicznego datasetu: ${sourcePath}`);

const entries = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const byId = new Map(readExisting().map((record) => [record.id, record]));
const ai = new GoogleGenAI({ apiKey });
console.log(`[Mythos embeddings] ${byId.size}/${entries.length} gotowych rekordów.`);

async function embedWithRetry(text, id) {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await ai.models.embedContent({
        model: 'gemini-embedding-001',
        contents: text,
        config: { taskType: 'RETRIEVAL_DOCUMENT', outputDimensionality: dimensions },
      });
      const values = response.embeddings?.[0]?.values;
      if (!values || values.length !== dimensions) throw new Error(`Nieprawidłowy embedding: ${id}`);
      return Float32Array.from(values);
    } catch (error) {
      if (error?.status !== 429 || attempt === 4) throw error;
      console.warn(`[Mythos embeddings] Limit API dla ${id}; ponawiam za 35 s.`);
      await sleep(35000);
    }
  }
}

for (let start = 0; start < entries.length; start += batchSize) {
  const batch = entries.slice(start, start + batchSize).filter((entry) => !byId.has(entry.id));
  if (batch.length === 0) continue;
  const vectors = await Promise.all(batch.map(async (entry) => {
    const text = `${entry.term} - ${entry.shortDefinition}\n\n${entry.fullContent}`.slice(0, 5000);
    const values = await embedWithRetry(text, entry.id);
    return {
      id: entry.id,
      values,
      text,
      metadata: {
        contentType: 'mythos',
        summary: `${entry.term}: ${entry.shortDefinition}`,
        tags: JSON.stringify(entry.tags || []),
        gameTimestamp: '', realTimestamp: '', sessionId: '', messageRange: '',
      },
    };
  }));
  vectors.forEach((vector) => byId.set(vector.id, vector));
  writeBinary([...byId.values()]);
  console.log(`[Mythos embeddings] ${byId.size}/${entries.length}`);
  if (start + batchSize < entries.length) await sleep(delayMs);
}

if (byId.size !== entries.length) throw new Error('Niepełny indeks Mythos.');
console.log(`[Mythos embeddings] Gotowe: ${byId.size} rekordów w ${binPath}`);
