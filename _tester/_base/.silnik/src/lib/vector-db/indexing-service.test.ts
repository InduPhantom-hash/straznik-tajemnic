import { embeddingService } from '../embedding-service';
import { localVectorStore } from './local-vector-store';
import { indexTexts } from './indexing-service';

jest.mock('../embedding-service', () => ({
  embeddingService: { generateEmbedding: jest.fn() },
  getEmbeddingDimensions: jest.fn(() => 2),
}));
jest.mock('./local-vector-store', () => ({
  localVectorStore: {
    initialized: true,
    upsert: jest.fn(),
    replaceNamespace: jest.fn(),
  },
}));

const mockedEmbedding = jest.mocked(embeddingService.generateEmbedding);

const items = [
  {
    id: 'one',
    text: 'pierwszy',
    metadata: { contentType: 'rule', summary: 'pierwszy' },
  },
  {
    id: 'two',
    text: 'drugi',
    metadata: { contentType: 'rule', summary: 'drugi' },
  },
];

describe('indexTexts document policy', () => {
  beforeEach(() => jest.clearAllMocks());
  it.each([true, false])('blocks embedding and preserves existing indexes (replace=%s)', async (replaceNamespace) => {
    mockedEmbedding.mockResolvedValue([1, 0]);
    await expect(indexTexts(items, 'rules', undefined, { replaceNamespace }))
      .resolves.toEqual({ indexed: 0, failed: 2, indexedIds: [] });
    expect(mockedEmbedding).not.toHaveBeenCalled();
    expect(localVectorStore.replaceNamespace).not.toHaveBeenCalled();
    expect(localVectorStore.upsert).not.toHaveBeenCalled();
  });
});
