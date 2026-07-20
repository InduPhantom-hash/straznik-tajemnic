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

describe('indexTexts', () => {
  beforeEach(() => jest.clearAllMocks());

  it('nie zastępuje namespace po częściowym błędzie embeddingów', async () => {
    mockedEmbedding.mockResolvedValueOnce([1, 0]).mockResolvedValueOnce(null);

    await expect(
      indexTexts(items, 'rules', undefined, { replaceNamespace: true })
    ).resolves.toEqual({ indexed: 0, failed: 2, indexedIds: [] });
    expect(localVectorStore.replaceNamespace).not.toHaveBeenCalled();
    expect(localVectorStore.upsert).not.toHaveBeenCalled();
  });

  it('atomowo zastępuje namespace po kompletnym zestawie embeddingów', async () => {
    mockedEmbedding.mockResolvedValue([1, 0]);

    const result = await indexTexts(items, 'rules', undefined, {
      replaceNamespace: true,
    });

    expect(result).toMatchObject({ indexed: 2, failed: 0 });
    expect(localVectorStore.replaceNamespace).toHaveBeenCalledWith(
      'rules',
      expect.arrayContaining([
        expect.objectContaining({ id: 'one' }),
        expect.objectContaining({ id: 'two' }),
      ])
    );
    expect(localVectorStore.upsert).not.toHaveBeenCalled();
  });
});
