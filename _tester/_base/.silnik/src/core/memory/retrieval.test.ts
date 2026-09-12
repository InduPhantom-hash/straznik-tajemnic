import { searchCampaignMemory } from './retrieval';
import type { CampaignMemoryLedgerStore } from './ledger-store';
import type { CampaignMemoryScope } from './types';
import { embeddingService } from '@/lib/embedding-service';
import { localVectorStore } from '@/lib/vector-db/local-vector-store';

jest.mock('@/lib/embedding-service', () => ({
  embeddingService: { generateEmbedding: jest.fn() },
}));
jest.mock('@/lib/vector-db/local-vector-store', () => ({
  localVectorStore: { query: jest.fn() },
}));

const scope: CampaignMemoryScope = {
  schemaVersion: 1,
  campaignDefinitionId: 'masks-of-nyarlathotep',
  playthroughId: 'run-a',
  adventureId: 'peru',
  kind: 'official',
};

describe('searchCampaignMemory', () => {
  it('merges FTS and semantic candidates with RRF and keeps campaign namespace', async () => {
    const ledger = {
      search: jest.fn(() => [{
        id: 'turn-1:assistant', text: 'Ujawniony list wskazuje Londyn.', score: 1,
        kind: 'clue', role: 'assistant', sequence: 3, tags: ['LOC:Londyn'], source: 'fts',
      }]),
    } as unknown as CampaignMemoryLedgerStore;
    (embeddingService.generateEmbedding as jest.Mock).mockResolvedValue([1, 0]);
    (localVectorStore.query as jest.Mock).mockResolvedValue([{
      id: 'turn-1:assistant', score: 0.9, text: 'Ujawniony list wskazuje Londyn.', metadata: {},
    }]);

    const result = await searchCampaignMemory(scope, 'list', ledger);
    expect(localVectorStore.query).toHaveBeenCalledWith('campaigns/run-a', [1, 0], 20);
    expect(result.source).toBe('hybrid');
    expect(result.results).toHaveLength(1);
    expect(result.results[0].sources).toEqual(['fts', 'semantic']);
  });

  it('falls back to canonical ledger when embeddings are unavailable', async () => {
    const ledger = {
      search: jest.fn(() => [{
        id: 'turn-2:user', text: 'Badacze zaufali Eliasowi.', score: 1,
        kind: 'decision', role: 'user', sequence: 4, tags: [], source: 'like',
      }]),
    } as unknown as CampaignMemoryLedgerStore;
    (embeddingService.generateEmbedding as jest.Mock).mockResolvedValue(null);
    const result = await searchCampaignMemory(scope, 'Elias', ledger);
    expect(result.source).toBe('like');
    expect(result.results[0].text).toContain('Eliasowi');
  });
});
