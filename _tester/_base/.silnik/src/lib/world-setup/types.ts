import type {
  EraException,
  HistoricalSourceRef,
  ResolvedEraContext,
} from '@/lib/era';

export const WORLD_SETUP_SCHEMA_VERSION = 1 as const;

export type SetupPhaseStatus =
  | 'pending'
  | 'running'
  | 'passed'
  | 'degraded'
  | 'failed';

export type SetupPhaseId =
  | 'era'
  | 'rules'
  | 'adventure-graph'
  | 'characters'
  | 'opening-scene'
  | 'historical-research'
  | 'assets';

export interface SetupPhaseResult {
  phase: SetupPhaseId;
  status: SetupPhaseStatus;
  critical: boolean;
  retryable: boolean;
  durationMs: number;
  estimatedCostUsd: number;
  message?: string;
  completedAt?: string;
}

export interface VisualSpatialRelation {
  subjectId: string;
  relation: 'inside' | 'outside' | 'on' | 'under' | 'behind' | 'in-front-of' | 'next-to';
  objectId: string;
}

export interface VisualSceneEntity {
  id: string;
  name: string;
  kind: 'character' | 'vehicle' | 'building' | 'furniture' | 'equipment' | 'prop' | 'environment';
  placement?: string;
}

export interface VisualSceneSpec {
  schemaVersion: 1;
  subject: string;
  location: string;
  eraContext: ResolvedEraContext;
  entities: VisualSceneEntity[];
  spatialRelations: VisualSpatialRelation[];
  mythosException?: EraException;
  forbidden: string[];
}

export interface WorldSetupBundleV1 {
  schemaVersion: typeof WORLD_SETUP_SCHEMA_VERSION;
  id: string;
  scenarioId: string;
  adventureTitle: string;
  createdAt: string;
  canonRevision: number;
  eraContext: ResolvedEraContext;
  eraManifestId: string | null;
  adventureGraph: Record<string, unknown>;
  factions: Array<Record<string, unknown>>;
  npcs: Array<Record<string, unknown>>;
  locations: Array<Record<string, unknown>>;
  items: Array<Record<string, unknown>>;
  events: Array<Record<string, unknown>>;
  openingScene: Record<string, unknown>;
  nearestBranches: Array<Record<string, unknown>>;
  adventureContent: string;
  supplementalInformation: string[];
  sources: HistoricalSourceRef[];
  knowledgeGaps: string[];
  exceptions: EraException[];
  phaseResults: SetupPhaseResult[];
}
