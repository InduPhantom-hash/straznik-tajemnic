export const ERA_CONTEXT_SCHEMA_VERSION = 1 as const;
export const ERA_RULES_VERSION = '1.0.0' as const;
export const ERA_RULES_SUPPORTED_TO = 2026;

export type EraRegionProfile = 'PL' | 'US' | 'GB' | 'GLOBAL';

export type EraContextSource =
  | 'scene-time'
  | 'scenario-range'
  | 'user-selection'
  | 'custom-profile';

export interface ResolvedEraContext {
  schemaVersion: typeof ERA_CONTEXT_SCHEMA_VERSION;
  sceneDate: string | null;
  effectiveYear: number;
  countryCode: string;
  regionProfile: EraRegionProfile;
  source: EraContextSource;
  rulesVersion: string;
  customProfileId?: string;
}

export interface EraDateParts {
  year: number;
  month?: number;
  day?: number;
}

export interface EraAdventureInput {
  yearRange?: string;
  country?: string;
  /** Pole legacy. Może służyć do prezentacji, ale resolver nie czerpie z niego roku. */
  era?: string;
  /** Pole legacy. Może służyć do prezentacji, ale resolver nie czerpie z niego roku. */
  eraLabel?: string;
}

export interface EraUserSelection {
  year: number;
  country?: string;
}

export interface EraCustomProfile {
  id: string;
  year: number;
  country?: string;
  rulesVersion: string;
}

export interface ResolveEraContextInput {
  sceneDate?: string | Date | EraDateParts | null;
  adventure?: EraAdventureInput | null;
  userSelection?: EraUserSelection | null;
  customProfile?: EraCustomProfile | null;
}

export type EraExceptionType = 'mythos' | 'time-anomaly';

export interface EraException {
  type: EraExceptionType;
  scenarioId: string;
  validFrom: number;
  validTo: number;
  reason: string;
}

export type EraApprovalStatus =
  | 'draft'
  | 'approved'
  | 'rejected'
  | 'quarantined';

export type EraConfidence = 'low' | 'medium' | 'high';

export interface EraRuleSource {
  id: string;
  title: string;
  url?: string;
  kind: 'primary' | 'secondary' | 'internal';
  verificationStatus: 'pending' | 'verified' | 'rejected';
}

export interface EraRuleProfile {
  id: string;
  title: string;
  validFrom: number;
  validTo: number;
  regions: EraRegionProfile[];
  technology: string[];
  communication: string[];
  transport: string[];
  clothing: string[];
  architecture: string[];
  mediaAndDocuments: string[];
  institutionsAndLanguage: string[];
  visualDirection: string[];
  forbidden: string[];
  sources: EraRuleSource[];
  confidence: EraConfidence;
  approvalStatus: EraApprovalStatus;
}

export interface EraAvailabilityWindow {
  validFrom: number;
  validTo: number;
  regions?: readonly EraRegionProfile[];
}
