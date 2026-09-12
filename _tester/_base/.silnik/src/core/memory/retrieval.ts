import { embeddingService } from '@/lib/embedding-service';
import { localVectorStore } from '@/lib/vector-db/local-vector-store';
import { LOCAL_RAG_NAMESPACES } from '@/lib/vector-db/vector-types';
import { getCampaignMemoryLedgerStore, type CampaignMemoryLedgerStore } from './ledger-store';
import type { CampaignMemoryScope, CampaignMemorySearchResult } from './types';

const MAX_RESULTS = 8;
const MAX_TOKENS = 1200;
const RRF_K = 60;

export interface CampaignMemoryRetrieval {
  results: Array<CampaignMemorySearchResult & { sources: Array<'fts' | 'like' | 'semantic'> }>;
  promptSection: string;
  source: 'hybrid' | 'semantic' | 'fts' | 'like' | 'none';
}

function estimateTokens(value: string): number {
  return Math.ceil(value.length / 4);
}

export async function searchCampaignMemory(
  scope: CampaignMemoryScope,
  query: string,
  ledger: CampaignMemoryLedgerStore = getCampaignMemoryLedgerStore()
): Promise<CampaignMemoryRetrieval> {
  const lexical = ledger.search(scope, query, 20);
  let semantic: Array<{ id: string; text: string; score: number }> = [];
  try {
    const embedding = await embeddingService.generateEmbedding(query, 'RETRIEVAL_QUERY');
    if (embedding) {
      const hits = await localVectorStore.query(
        LOCAL_RAG_NAMESPACES.campaign(scope.playthroughId),
        embedding,
        20
      );
      semantic = hits
        .filter((hit): hit is typeof hit & { text: string } => Boolean(hit.text))
        .map((hit) => ({ id: hit.id, text: hit.text, score: hit.score }));
    }
  } catch (error) {
    console.warn('Campaign semantic retrieval unavailable; using ledger search:', error);
  }

  const byId = new Map<string, CampaignMemorySearchResult & { rrf: number; sources: Array<'fts' | 'like' | 'semantic'> }>();
  lexical.forEach((entry, index) => {
    byId.set(entry.id, { ...entry, rrf: 1 / (RRF_K + index + 1), sources: [entry.source] });
  });
  semantic.forEach((entry, index) => {
    const existing = byId.get(entry.id);
    if (existing) {
      existing.rrf += 1 / (RRF_K + index + 1);
      existing.sources.push('semantic');
    } else {
      byId.set(entry.id, {
        id: entry.id,
        text: entry.text,
        score: entry.score,
        kind: 'conversation',
        role: 'assistant',
        sequence: 0,
        tags: [],
        source: lexical[0]?.source ?? 'fts',
        rrf: 1 / (RRF_K + index + 1),
        sources: ['semantic'],
      });
    }
  });

  const selected: CampaignMemoryRetrieval['results'] = [];
  let tokens = 0;
  for (const candidate of [...byId.values()].sort((a, b) => b.rrf - a.rrf)) {
    const cost = estimateTokens(candidate.text) + 12;
    if (selected.length >= MAX_RESULTS || tokens + cost > MAX_TOKENS) continue;
    const { rrf: _rrf, ...result } = candidate;
    selected.push(result);
    tokens += cost;
  }

  const source: CampaignMemoryRetrieval['source'] =
    lexical.length > 0 && semantic.length > 0
      ? 'hybrid'
      : semantic.length > 0
        ? 'semantic'
        : lexical.length > 0
          ? lexical[0].source
          : 'none';
  const promptSection = selected.length > 0
    ? `\n## PAMIĘĆ KAMPANII — WYŁĄCZNIE UJAWNIONE FAKTY\n${selected.map((entry) => `- ${entry.text}`).join('\n')}`
    : '';
  return { results: selected, promptSection, source };
}
