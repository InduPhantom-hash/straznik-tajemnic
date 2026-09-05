import { embeddingService, getEmbeddingDimensions } from './embedding-service';
import { EMBEDDING_DIM_LOCAL } from './model-registry';

jest.mock('@xenova/transformers', () => ({
  pipeline: jest.fn().mockImplementation(async () => {
    return (input: string | string[], _opts: any) => {
      if (Array.isArray(input)) {
        const batchSize = input.length;
        const total = batchSize * 1024;
        const data = new Float32Array(total);
        for (let i = 0; i < total; i++) data[i] = 0.01;
        return { data, dims: [batchSize, 1024] };
      }
      const data = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) data[i] = 0.01;
      return { data, dims: [1, 1024] };
    };
  }),
  env: { allowLocalModels: true, useBrowserCache: false },
}));

describe('Local Embedding Service (ONNX)', () => {
  it('zwraca prawidłowy wymiar dla trybu lokalnego', () => {
    delete process.env.RAG_PROVIDER;
    expect(getEmbeddingDimensions()).toBe(EMBEDDING_DIM_LOCAL);
  });

  it('generuje 1024-wymiarowy wektor lokalnie dla tekstu', async () => {
    delete process.env.RAG_PROVIDER;
    const text = 'Rzut na Poczytalność: utrata 1k6 punktów SAN przy nieudanym teście';
    const embedding = await embeddingService.generateEmbedding(text);
    
    expect(embedding).not.toBeNull();
    expect(Array.isArray(embedding)).toBe(true);
    expect(embedding?.length).toBe(EMBEDDING_DIM_LOCAL);
  }, 30000);

  it('generuje batch embeddingów lokalnie zachowując wymiary', async () => {
    delete process.env.RAG_PROVIDER;
    const texts = [
      'Zasada 1: Walka wręcz w Call of Cthulhu 7e',
      'Zasada 2: Premia z kości bonusowej',
    ];
    const embeddings = await embeddingService.generateBatchEmbeddings(texts);
    
    expect(embeddings.length).toBe(2);
    expect(embeddings[0]?.length).toBe(EMBEDDING_DIM_LOCAL);
    expect(embeddings[1]?.length).toBe(EMBEDDING_DIM_LOCAL);
  }, 30000);
});
