import { retrievalService } from './retrieval-service';
import { bm25Index } from './bm25-index';
import { refreshDocumentIndex } from './document-index';
import { localVectorStore } from './local-vector-store';
import { embeddingService, getEmbeddingDimensions } from '../embedding-service';
import { EMBEDDING_MODEL, LOCAL_EMBEDDING_MODEL } from '../model-registry';
import { embeddingSignature } from './embedding-signature';
import { indexChunk, indexTexts } from './indexing-service';
import type { QueryResult, VectorMetadata } from './vector-types';

jest.mock('../embedding-service', () => ({
  embeddingService: { generateEmbedding: jest.fn(), getMemoryIndex: jest.fn(() => null) },
  cosineSimilarity: jest.fn(() => 1),
  getEmbeddingDimensions: jest.fn(() => 2),
}));
jest.mock('./local-vector-store', () => ({ localVectorStore: {
  initialized: true, getDocuments: jest.fn(async () => []), query: jest.fn(async () => []),
  upsert: jest.fn(async () => true), replaceNamespace: jest.fn(async () => true),
} }));
jest.mock('@/lib/mythos/bm25', () => ({ ensureMythosBm25Index: jest.fn() }));

const metadata = (tags: string[] = []): VectorMetadata => ({
  contentType: 'rule', summary: 'Short heading', tags: JSON.stringify(tags),
  gameTimestamp: '', realTimestamp: '', sessionId: '', messageRange: '',
  sourceFile: 'rules.pdf', documentId: 'hash', chunkIndex: 2, startOffset: 400, endOffset: 900,
});
const hit = (id: string, score: number, tags: string[] = []): QueryResult => ({
  id, score, text: 'Full chunk: the hidden middle sentence matters.', metadata: metadata(tags),
});

beforeEach(() => {
  jest.clearAllMocks();
  bm25Index.clear();
  jest.mocked(localVectorStore.getDocuments).mockResolvedValue([]);
  jest.mocked(localVectorStore.query).mockResolvedValue([]);
  jest.mocked(embeddingService.generateEmbedding).mockResolvedValue(null);
});

it('keeps document search local and removes deleted documents', () => {
  refreshDocumentIndex('rules', [hit('old', 1)]);
  expect(bm25Index.search('middle')).toHaveLength(1);
  refreshDocumentIndex('rules', [{ ...hit('new', 1), text: 'replacement unicorn' }]);
  expect(bm25Index.search('middle')).toEqual([]);
  expect(bm25Index.search('unicorn')[0].id).toBe('new');
  refreshDocumentIndex('rules', []);
  expect(bm25Index.search('unicorn')).toEqual([]);
  expect(embeddingService.generateEmbedding).not.toHaveBeenCalled();
});

it('does not attach persisted text or provenance to a model prompt', async () => {
  jest.mocked(localVectorStore.getDocuments).mockResolvedValue([hit('persisted', 1)]);
  jest.mocked(localVectorStore.query).mockResolvedValue([hit('persisted', 1)]);
  refreshDocumentIndex('rules', [hit('persisted', 1)]);
  const result = await retrievalService.retrieve({ query: 'middle', namespaces: ['rules'], queryEmbedding: [1, 0] });
  expect(result).toMatchObject({ results: [], promptSection: '', source: 'none' });
  expect(localVectorStore.getDocuments).not.toHaveBeenCalled();
  expect(localVectorStore.query).not.toHaveBeenCalled();
  expect(embeddingService.generateEmbedding).not.toHaveBeenCalled();
});

describe('embedding provenance without document model use', () => {
  const originalProvider = process.env.RAG_PROVIDER;
  afterEach(() => {
    if (originalProvider === undefined) delete process.env.RAG_PROVIDER;
    else process.env.RAG_PROVIDER = originalProvider;
    jest.mocked(getEmbeddingDimensions).mockReturnValue(2);
  });
  it.each([
    ['local', LOCAL_EMBEDDING_MODEL, 1024],
    ['gemini', EMBEDDING_MODEL, 768],
    ['gemini', EMBEDDING_MODEL, 3072],
  ])('identifies %s/%s/%i without invoking a model', (provider, model, dims) => {
    process.env.RAG_PROVIDER = provider;
    jest.mocked(getEmbeddingDimensions).mockReturnValue(dims);
    expect(embeddingSignature()).toBe(`${model}:${dims}:v1`);
    expect(embeddingService.generateEmbedding).not.toHaveBeenCalled();
  });
  it.each(['local', 'gemini'])('blocks document embeddings with the %s provider', async (provider) => {
    process.env.RAG_PROVIDER = provider;
    expect(await indexTexts([{ id: 'new', text: 'synthetic', metadata: { contentType: 'rule', summary: 'heading' } }], 'rules'))
      .toEqual({ indexed: 0, failed: 1, indexedIds: [] });
    expect(embeddingService.generateEmbedding).not.toHaveBeenCalled();
    expect(localVectorStore.upsert).not.toHaveBeenCalled();
  });
  it('does not invent provenance for an existing campaign memory vector', async () => {
    await indexChunk({ chunkId: 'old', embedding: [1, 0], text: 'legacy', summary: 'old', tags: [], gameTimestamp: '', realTimestamp: '', messageRange: { start: 0, end: 1 } }, 'legacy');
    expect(localVectorStore.upsert).toHaveBeenCalled();
    expect(jest.mocked(localVectorStore.upsert).mock.calls[0][1][0].metadata).not.toHaveProperty('embeddingSignature');
  });
});
