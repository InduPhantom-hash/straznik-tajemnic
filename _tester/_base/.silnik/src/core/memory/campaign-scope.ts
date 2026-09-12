import type { AdventureContext } from '@/lib/types';
import { findOfficialCampaign } from '@/lib/data/official-campaigns';
import {
  CAMPAIGN_MEMORY_SCHEMA_VERSION,
  type CampaignMemoryKind,
  type CampaignMemoryScope,
} from './types';

const STORAGE_KEY = 'zew-campaign-memory-scope';

type CampaignAwareAdventure = Pick<AdventureContext, 'id' | 'title' | 'isCustom'> & {
  documentType?: string;
  isCampaign?: boolean;
};

function normalizeId(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unknown';
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function resolveCampaignDefinition(adventure: CampaignAwareAdventure): {
  campaignDefinitionId: string;
  kind: CampaignMemoryKind;
} {
  const official = (adventure.id ? findOfficialCampaign(adventure.id) : undefined)
    ?? (adventure.title ? findOfficialCampaign(adventure.title) : undefined);
  if (official) {
    return { campaignDefinitionId: official.id, kind: 'official' };
  }

  const adventureId = normalizeId(adventure.id || adventure.title);
  if (adventure.isCampaign || adventure.documentType === 'campaign') {
    return { campaignDefinitionId: `custom:${adventureId}`, kind: 'custom' };
  }

  return { campaignDefinitionId: `scenario:${adventureId}`, kind: 'scenario' };
}

export function createCampaignMemoryScope(
  adventure: CampaignAwareAdventure,
  createId: () => string = randomId
): CampaignMemoryScope {
  const definition = resolveCampaignDefinition(adventure);
  return {
    schemaVersion: CAMPAIGN_MEMORY_SCHEMA_VERSION,
    ...definition,
    playthroughId: `run-${createId()}`,
    adventureId: normalizeId(adventure.id || adventure.title),
  };
}

export function isCampaignMemoryScope(value: unknown): value is CampaignMemoryScope {
  if (!value || typeof value !== 'object') return false;
  const scope = value as Partial<CampaignMemoryScope>;
  return (
    scope.schemaVersion === CAMPAIGN_MEMORY_SCHEMA_VERSION &&
    typeof scope.campaignDefinitionId === 'string' &&
    scope.campaignDefinitionId.length > 0 &&
    typeof scope.playthroughId === 'string' &&
    scope.playthroughId.length > 0 &&
    typeof scope.adventureId === 'string' &&
    scope.adventureId.length > 0 &&
    (scope.kind === 'official' || scope.kind === 'custom' || scope.kind === 'scenario')
  );
}

export function loadCampaignMemoryScope(): CampaignMemoryScope | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isCampaignMemoryScope(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function storeCampaignMemoryScope(scope: CampaignMemoryScope): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scope));
}

export function clearCampaignMemoryScope(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}
