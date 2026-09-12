export const CAMPAIGN_MEMORY_SCHEMA_VERSION = 1 as const;

export type CampaignMemoryKind = 'official' | 'custom' | 'scenario';

export interface CampaignMemoryScope {
  schemaVersion: typeof CAMPAIGN_MEMORY_SCHEMA_VERSION;
  campaignDefinitionId: string;
  playthroughId: string;
  adventureId: string;
  kind: CampaignMemoryKind;
}

export type MemoryLedgerRole = 'user' | 'assistant' | 'system';
export type MemoryLedgerKind =
  | 'conversation'
  | 'clue'
  | 'decision'
  | 'npc'
  | 'location'
  | 'consequence'
  | 'summary';

export interface MemoryLedgerEntry {
  id: string;
  scope: CampaignMemoryScope;
  sessionId: string;
  sequence: number;
  role: MemoryLedgerRole;
  kind: MemoryLedgerKind;
  text: string;
  tags: string[];
  sourceMessageIds: string[];
  revealedAt: string;
  active: boolean;
}

export interface RevealedMemoryFact {
  kind: Exclude<MemoryLedgerKind, 'conversation' | 'summary'>;
  text: string;
  tags?: string[];
}

export interface CampaignCompressionCheckpoint {
  id: string;
  playthroughId: string;
  version: number;
  sourceStartSequence: number;
  sourceEndSequence: number;
  sourceMessageIds: string[];
  summary: string;
  createdAt: string;
  failureCount: number;
  retryAfter: string | null;
}

export interface CampaignMemorySearchResult {
  id: string;
  text: string;
  score: number;
  kind: MemoryLedgerKind;
  role: MemoryLedgerRole;
  sequence: number;
  tags: string[];
  source: 'fts' | 'like';
}
