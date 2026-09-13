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

  describe('document policy', () => {
    afterEach(() => jest.restoreAllMocks());
    it.each(['pl', 'en'] as const)('blocks existing source indexes and fallback in %s', async (locale) => {
      const embed = jest.spyOn(embeddingService, 'generateEmbedding').mockRejectedValue(new Error('must not run'));
      const query = jest.spyOn(localVectorStore, 'query').mockRejectedValue(new Error('must not run'));
      const response = await retrievalService.retrieve({
        query: 'synthetic marker', locale,
        namespaces: ['rules', 'mythos', 'adventures', 'sessions/old', 'local-memory'],
        queryEmbedding: [1, 0],
      });
      expect(response).toMatchObject({ results: [], promptSection: '', source: 'none' });
      expect(embed).not.toHaveBeenCalled();
      expect(query).not.toHaveBeenCalled();
    });
  });
});
