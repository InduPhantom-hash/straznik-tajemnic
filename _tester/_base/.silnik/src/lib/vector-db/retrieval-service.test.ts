import {
  retrievalService,
  _resetRetrievalMinScoreCache,
} from './retrieval-service';
import { LOCAL_RAG_NAMESPACES } from './vector-types';
import { localVectorStore } from './local-vector-store';
import { embeddingService } from '../embedding-service';

describe('RetrievalService', () => {
  beforeEach(() => {
    _resetRetrievalMinScoreCache();
    jest.clearAllMocks();
  });

  describe('getDefaultNamespaces', () => {
    it('returns default namespaces without phantom namespaces (npcs, world-state, custom)', () => {
      const namespaces = retrievalService.getDefaultNamespaces();
      expect(namespaces).toEqual([
        LOCAL_RAG_NAMESPACES.RULES,
        LOCAL_RAG_NAMESPACES.MYTHOS,
        LOCAL_RAG_NAMESPACES.ADVENTURES,
      ]);
      expect(namespaces).not.toContain('npcs');
      expect(namespaces).not.toContain('world-state');
      expect(namespaces).not.toContain('custom');
    });

    it('isolates adventure namespace when adventureId is provided', () => {
      const namespaces = retrievalService.getDefaultNamespaces(
        undefined,
        'tatry-1925'
      );
      expect(namespaces).toEqual([
        LOCAL_RAG_NAMESPACES.RULES,
        LOCAL_RAG_NAMESPACES.MYTHOS,
        'adventures/tatry-1925',
      ]);
      expect(namespaces).not.toContain(LOCAL_RAG_NAMESPACES.ADVENTURES);
    });

    it('appends session namespace when sessionId is provided', () => {
      const namespaces = retrievalService.getDefaultNamespaces('sess-abc');
      expect(namespaces).toEqual([
        LOCAL_RAG_NAMESPACES.RULES,
        LOCAL_RAG_NAMESPACES.MYTHOS,
        LOCAL_RAG_NAMESPACES.ADVENTURES,
        'sessions/sess-abc',
      ]);
    });

    it('handles both adventureId and sessionId together', () => {
      const namespaces = retrievalService.getDefaultNamespaces(
        'sess-xyz',
        'adv-blackwater'
      );
      expect(namespaces).toEqual([
        LOCAL_RAG_NAMESPACES.RULES,
        LOCAL_RAG_NAMESPACES.MYTHOS,
        'adventures/adv-blackwater',
        'sessions/sess-xyz',
      ]);
    });
  });

  describe('retrieve', () => {
    it('retains isolated adventure namespace results even without source tag when adventureSource is specified', async () => {
      const mockGenerateEmbedding = jest
        .spyOn(embeddingService, 'generateEmbedding')
        .mockResolvedValue([1, 0, 0]);

      const mockQuery = jest
        .spyOn(localVectorStore, 'query')
        .mockImplementation(async (namespace) => {
          if (namespace === 'adventures/tatry-1925') {
            return [
              {
                id: 'adv-chunk-pdf',
                score: 0.85,
                metadata: {
                  contentType: 'adventure',
                  summary: 'Opis jaskini w Tatrach',
                  gameTimestamp: '',
                  realTimestamp: '',
                  // PDF ingest produkuje tagi bez prefiksu source:
                  tags: JSON.stringify(['ADV:Chapter', 'LOC:Tatry']),
                  sessionId: '',
                  messageRange: '',
                },
              },
            ];
          }
          if (namespace === 'rules') {
            return [
              {
                id: 'rule-chunk-1',
                score: 0.9,
                metadata: {
                  contentType: 'rule',
                  summary: 'Zasada wspinaczki',
                  gameTimestamp: '',
                  realTimestamp: '',
                  tags: '[]',
                  sessionId: '',
                  messageRange: '',
                },
              },
            ];
          }
          return [];
        });

      const response = await retrievalService.retrieve({
        query: 'jak wspiąć się na grań?',
        adventureId: 'tatry-1925',
        adventureSource: 'tatry',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        'adventures/tatry-1925',
        [1, 0, 0],
        expect.any(Number)
      );

      // Chunks from isolated adventure are NOT blocked by missing source tag!
      const ids = response.results.map((r) => r.id);
      expect(ids).toContain('rule-chunk-1');
      expect(ids).toContain('adv-chunk-pdf');
      expect(response.promptSection).toContain('Zasada wspinaczki');
      expect(response.promptSection).toContain('Opis jaskini w Tatrach');

      mockGenerateEmbedding.mockRestore();
      mockQuery.mockRestore();
    });

    it('filters shared adventures namespace by adventureSource', async () => {
      const mockGenerateEmbedding = jest
        .spyOn(embeddingService, 'generateEmbedding')
        .mockResolvedValue([1, 0, 0]);

      const mockQuery = jest
        .spyOn(localVectorStore, 'query')
        .mockImplementation(async (namespace) => {
          if (namespace === LOCAL_RAG_NAMESPACES.ADVENTURES) {
            return [
              {
                id: 'adv-matching',
                score: 0.85,
                metadata: {
                  contentType: 'adventure',
                  summary: 'Pasujący fragment antologii',
                  gameTimestamp: '',
                  realTimestamp: '',
                  tags: JSON.stringify(['source:tatry', 'tatry']),
                  sessionId: '',
                  messageRange: '',
                },
              },
              {
                id: 'adv-other',
                score: 0.82,
                metadata: {
                  contentType: 'adventure',
                  summary: 'Fragment z innej antologii',
                  gameTimestamp: '',
                  realTimestamp: '',
                  tags: JSON.stringify(['source:inna-ksiazka']),
                  sessionId: '',
                  messageRange: '',
                },
              },
            ];
          }
          return [];
        });

      const response = await retrievalService.retrieve({
        query: 'poszukiwania',
        adventureSource: 'tatry',
      });

      const ids = response.results.map((r) => r.id);
      expect(ids).toContain('adv-matching');
      expect(ids).not.toContain('adv-other');

      mockGenerateEmbedding.mockRestore();
      mockQuery.mockRestore();
    });

    it('handles both array and stringified metadata tags', async () => {
      const mockGenerateEmbedding = jest
        .spyOn(embeddingService, 'generateEmbedding')
        .mockResolvedValue([1, 0, 0]);

      const mockQuery = jest
        .spyOn(localVectorStore, 'query')
        .mockImplementation(async (namespace) => {
          if (namespace === 'rules') {
            return [
              {
                id: 'rule-array-tags',
                score: 0.88,
                metadata: {
                  contentType: 'rule',
                  summary: 'Test array tags',
                  gameTimestamp: '',
                  realTimestamp: '',
                  tags: ['tag1', 'tag2'] as unknown as string,
                  sessionId: '',
                  messageRange: '',
                },
              },
            ];
          }
          return [];
        });

      const response = await retrievalService.retrieve({
        query: 'test tags',
      });

      expect(response.results[0].tags).toEqual(['tag1', 'tag2']);

      mockGenerateEmbedding.mockRestore();
      mockQuery.mockRestore();
    });

    it('returns empty promptSection and source none when no results pass minScore', async () => {
      const mockGenerateEmbedding = jest
        .spyOn(embeddingService, 'generateEmbedding')
        .mockResolvedValue([1, 0, 0]);

      const mockQuery = jest
        .spyOn(localVectorStore, 'query')
        .mockResolvedValue([]);

      const response = await retrievalService.retrieve({
        query: 'losowe zapytanie',
      });

      expect(response.results).toEqual([]);
      expect(response.promptSection).toBe('');
      expect(response.source).toBe('none');

      mockGenerateEmbedding.mockRestore();
      mockQuery.mockRestore();
    });
  });
});
