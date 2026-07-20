import fs from 'fs';
import os from 'os';
import path from 'path';
import { LocalVectorStore } from './local-vector-store';
import { writeBinaryNamespace } from './binary-format';
import type { UpsertVector, VectorMetadata } from './vector-types';

const metadata: VectorMetadata = {
  contentType: 'rule',
  summary: 'test',
  gameTimestamp: '',
  realTimestamp: '',
  tags: '[]',
  sessionId: '',
  messageRange: '',
};

function vector(id: string, values: number[]): UpsertVector {
  return { id, values, metadata, text: `tekst ${id}` };
}

describe('LocalVectorStore', () => {
  let directory: string;
  const previousDataDir = process.env.RAG_DATA_DIR;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'straznik-rag-test-'));
    process.env.RAG_DATA_DIR = directory;
  });

  afterEach(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  afterAll(() => {
    if (previousDataDir === undefined) delete process.env.RAG_DATA_DIR;
    else process.env.RAG_DATA_DIR = previousDataDir;
  });

  it('zapisuje JSON atomowo i odczytuje go po wyczyszczeniu cache', async () => {
    const store = new LocalVectorStore();
    await store.upsert('rules', [vector('old', [1, 0])]);

    expect(fs.existsSync(path.join(directory, 'rules.tmp'))).toBe(false);
    expect(fs.existsSync(path.join(directory, 'rules.json'))).toBe(true);
    store.clearCache();

    await expect(store.query('rules', [1, 0])).resolves.toEqual([
      expect.objectContaining({ id: 'old', score: 1 }),
    ]);
  });

  it('zastępuje namespace bez pozostawienia starych rekordów', async () => {
    const store = new LocalVectorStore();
    await store.upsert('rules', [vector('old', [1, 0])]);
    await store.replaceNamespace('rules', [vector('new', [0, 1])]);
    store.clearCache();

    const stats = await store.getStats();
    expect(stats.namespaces.rules.recordCount).toBe(1);
    await expect(store.query('rules', [0, 1])).resolves.toEqual([
      expect.objectContaining({ id: 'new', score: 1 }),
    ]);
  });

  it('preferuje poprawny format binarny i wraca do JSON po mutacji', async () => {
    writeBinaryNamespace(directory, 'adventures', [vector('binary', [1, 0])]);
    const store = new LocalVectorStore();
    await expect(store.query('adventures', [1, 0])).resolves.toEqual([
      expect.objectContaining({ id: 'binary' }),
    ]);

    await store.upsert('adventures', [vector('json', [0, 1])]);
    expect(fs.existsSync(path.join(directory, 'adventures.bin'))).toBe(false);
    store.clearCache();
    const results = await store.query('adventures', [0, 1], 2);
    expect(results.map((result) => result.id)).toEqual(['json', 'binary']);
  });
});
