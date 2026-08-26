import type { EraAdventureInput, ResolvedEraContext } from './types';

export type LegacyAdventureEra =
  | 'classic'
  | 'gaslight'
  | 'noir'
  | 'prl'
  | 'modern'
  | 'custom';

const LEGACY_ERA_KEYS: LegacyAdventureEra[] = [
  'classic',
  'gaslight',
  'noir',
  'prl',
  'modern',
  'custom',
];

/** Jedyny adapter, który może czytać legacy `era` i `eraLabel`. */
export function normalizeLegacyEraKey(value: unknown): LegacyAdventureEra {
  return typeof value === 'string' &&
    LEGACY_ERA_KEYS.includes(value as LegacyAdventureEra)
    ? (value as LegacyAdventureEra)
    : 'custom';
}

export function getLegacyEraValue(record: {
  era?: unknown;
}): string | undefined {
  return typeof record.era === 'string' && record.era.trim()
    ? record.era.trim()
    : undefined;
}

export function getLegacyAdventurePresentation(adventure: EraAdventureInput): {
  eraKey: LegacyAdventureEra;
  label: string;
} {
  return {
    eraKey: normalizeLegacyEraKey(getLegacyEraValue(adventure)),
    label:
      adventure.eraLabel?.trim() ||
      (adventure.yearRange ? `Rok ${adventure.yearRange}` : 'Epoka własna'),
  };
}

export function resolveLegacySessionEra(
  context: ResolvedEraContext
): LegacyAdventureEra {
  const year = context.effectiveYear;
  if (year < 1920) return 'gaslight';
  if (year < 1930) return 'classic';
  if (year >= 1940 && year < 1950) return 'noir';
  if (context.regionProfile === 'PL' && year >= 1950 && year < 1990) {
    return 'prl';
  }
  if (year >= 2020) return 'modern';
  return 'custom';
}
