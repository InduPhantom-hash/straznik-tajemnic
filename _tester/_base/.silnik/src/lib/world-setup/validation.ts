import { isResolvedEraContext } from '@/lib/era';
import type {
  SetupPhaseResult,
  VisualSceneEntity,
  VisualSceneSpec,
  WorldSetupBundleV1,
} from './types';

export class WorldSetupValidationError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'WorldSetupValidationError';
  }
}

export function assertExactEraContext(value: unknown): asserts value is WorldSetupBundleV1['eraContext'] {
  if (!isResolvedEraContext(value)) {
    throw new WorldSetupValidationError('ERA_CONTEXT_REQUIRED', 'Setup wymaga poprawnego ResolvedEraContext.');
  }
  if (value.countryCode === 'ZZ' || value.countryCode.trim().length !== 2) {
    throw new WorldSetupValidationError('COUNTRY_REQUIRED', 'Własny scenariusz wymaga dokładnego kraju.');
  }
  if (!Number.isInteger(value.effectiveYear)) {
    throw new WorldSetupValidationError('YEAR_REQUIRED', 'Własny scenariusz wymaga dokładnego roku.');
  }
}

const OFFICE_EQUIPMENT = /(?:office desk|desk computer|desktop computer|computer monitor|printer|photocopier|biurko|komputer stacjonarny|monitor komputerowy|drukarka|kserokopiarka)/i;
const VEHICLE_INTERIOR = /(?:dashboard|deska rozdzielcza|vehicle interior|car interior|wnętrze samochodu|wnetrze samochodu)/i;

function isOfficeEquipment(entity: VisualSceneEntity | undefined): boolean {
  return Boolean(entity && (entity.kind === 'furniture' || entity.kind === 'equipment') && OFFICE_EQUIPMENT.test(`${entity.name} ${entity.placement ?? ''}`));
}

export function validateVisualSceneSpec(spec: VisualSceneSpec): string[] {
  const issues: string[] = [];
  if (
    spec.schemaVersion !== 1 ||
    typeof spec.subject !== 'string' ||
    typeof spec.location !== 'string' ||
    !Array.isArray(spec.entities) ||
    !Array.isArray(spec.spatialRelations) ||
    !Array.isArray(spec.forbidden)
  ) {
    throw new WorldSetupValidationError(
      'VISUAL_SCENE_SPEC_INVALID',
      'VisualSceneSpec ma niepoprawny lub niepełny format.'
    );
  }
  assertExactEraContext(spec.eraContext);
  const entities = new Map(spec.entities.map((entity) => [entity.id, entity]));

  for (const entity of spec.entities) {
    if (isOfficeEquipment(entity) && VEHICLE_INTERIOR.test(entity.placement ?? '')) {
      issues.push(`Sprzęt biurowy ${entity.id} nie może znajdować się we wnętrzu samochodu.`);
    }
  }

  for (const relation of spec.spatialRelations) {
    const subject = entities.get(relation.subjectId);
    const object = entities.get(relation.objectId);
    const vehicleRelation =
      object?.kind === 'vehicle' ||
      VEHICLE_INTERIOR.test(`${object?.name ?? ''} ${object?.placement ?? ''}`);
    if (isOfficeEquipment(subject) && vehicleRelation && ['inside', 'on'].includes(relation.relation)) {
      issues.push(`Relacja ${relation.subjectId} ${relation.relation} ${relation.objectId} tworzy wnętrze biura w samochodzie.`);
    }
  }

  return issues;
}

export function assertVisualSceneSpec(spec: VisualSceneSpec): void {
  const issues = validateVisualSceneSpec(spec);
  if (issues.length > 0) {
    throw new WorldSetupValidationError('VISUAL_SPATIAL_CONFLICT', issues.join(' '));
  }
}

export function isWorldSetupBundle(value: unknown): value is WorldSetupBundleV1 {
  if (!value || typeof value !== 'object') return false;
  const bundle = value as Partial<WorldSetupBundleV1>;
  return (
    bundle.schemaVersion === 1 &&
    typeof bundle.id === 'string' &&
    typeof bundle.scenarioId === 'string' &&
    typeof bundle.adventureTitle === 'string' &&
    typeof bundle.createdAt === 'string' &&
    Number.isInteger(bundle.canonRevision) &&
    isResolvedEraContext(bundle.eraContext) &&
    Array.isArray(bundle.sources) &&
    Array.isArray(bundle.knowledgeGaps) &&
    Array.isArray(bundle.exceptions) &&
    Array.isArray(bundle.phaseResults)
  );
}

export function hasBlockingSetupFailure(results: SetupPhaseResult[]): boolean {
  return results.some((result) => result.critical && result.status === 'failed');
}
