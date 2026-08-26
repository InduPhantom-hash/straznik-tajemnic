import {
  ERA_CONTEXT_SCHEMA_VERSION,
  ERA_RULES_SUPPORTED_TO,
  ERA_RULES_VERSION,
  type EraContextSource,
  type EraDateParts,
  type EraRegionProfile,
  type ResolveEraContextInput,
  type ResolvedEraContext,
} from './types';

export type EraResolutionErrorCode =
  | 'MISSING_YEAR'
  | 'INVALID_YEAR'
  | 'CUSTOM_PROFILE_REQUIRED';

export class EraResolutionError extends Error {
  constructor(
    public readonly code: EraResolutionErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'EraResolutionError';
  }
}

const MIN_SUPPORTED_YEAR = 1000;
const MAX_SUPPORTED_YEAR = 9999;

function assertYear(value: number, source: string): number {
  if (
    !Number.isInteger(value) ||
    value < MIN_SUPPORTED_YEAR ||
    value > MAX_SUPPORTED_YEAR
  ) {
    throw new EraResolutionError(
      'INVALID_YEAR',
      `Nieprawidłowy rok z pola ${source}: ${String(value)}`
    );
  }
  return value;
}

function extractYear(value: string | undefined): number | null {
  const match = value?.match(/\b(\d{4})\b/);
  return match ? assertYear(Number.parseInt(match[1], 10), 'yearRange') : null;
}

function formatDateParts(parts: EraDateParts): string | null {
  if (parts.month == null || parts.day == null) return null;
  if (parts.month < 1 || parts.month > 12 || parts.day < 1 || parts.day > 31) {
    throw new EraResolutionError(
      'INVALID_YEAR',
      `Nieprawidłowa data sceny: ${parts.year}-${parts.month}-${parts.day}`
    );
  }
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function resolveSceneDate(
  value: ResolveEraContextInput['sceneDate']
): { year: number; date: string | null } | null {
  if (value == null) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new EraResolutionError('INVALID_YEAR', 'Nieprawidłowa data sceny');
    }
    return {
      year: assertYear(value.getFullYear(), 'sceneDate'),
      date: `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`,
    };
  }

  if (typeof value === 'string') {
    const year = extractYear(value);
    if (year == null) {
      throw new EraResolutionError(
        'INVALID_YEAR',
        `Data sceny nie zawiera czterocyfrowego roku: ${value}`
      );
    }
    const isoDate = value.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0] ?? null;
    return { year, date: isoDate };
  }

  const year = assertYear(value.year, 'sceneDate.year');
  return { year, date: formatDateParts({ ...value, year }) };
}

const COUNTRY_ALIASES: Array<[RegExp, string, EraRegionProfile]> = [
  [/^(pl|polska|poland)$/i, 'PL', 'PL'],
  [
    /^(us|usa|stany zjednoczone|united states|united states of america)$/i,
    'US',
    'US',
  ],
  [
    /^(gb|uk|wielka brytania|zjednoczone królestwo|zjednoczone krolestwo|united kingdom|england|scotland|wales)$/i,
    'GB',
    'GB',
  ],
];

export function resolveEraRegion(country: string | undefined): {
  countryCode: string;
  regionProfile: EraRegionProfile;
} {
  const normalized = country?.trim() ?? '';
  for (const [pattern, countryCode, regionProfile] of COUNTRY_ALIASES) {
    if (pattern.test(normalized)) return { countryCode, regionProfile };
  }

  if (/^[a-z]{2}$/i.test(normalized)) {
    return { countryCode: normalized.toUpperCase(), regionProfile: 'GLOBAL' };
  }

  return { countryCode: 'ZZ', regionProfile: 'GLOBAL' };
}

export function resolveEraContext(
  input: ResolveEraContextInput
): ResolvedEraContext {
  const scene = resolveSceneDate(input.sceneDate);
  const scenarioYear = extractYear(input.adventure?.yearRange);

  let effectiveYear: number;
  let sceneDate: string | null = null;
  let source: EraContextSource;
  const country =
    input.adventure?.country ??
    input.userSelection?.country ??
    input.customProfile?.country;
  let customProfileId: string | undefined;
  let rulesVersion: string = ERA_RULES_VERSION;

  if (scene) {
    effectiveYear = scene.year;
    sceneDate = scene.date;
    source = 'scene-time';
  } else if (scenarioYear != null) {
    effectiveYear = scenarioYear;
    source = 'scenario-range';
  } else if (input.userSelection) {
    effectiveYear = assertYear(input.userSelection.year, 'userSelection.year');
    source = 'user-selection';
  } else if (input.customProfile) {
    effectiveYear = assertYear(input.customProfile.year, 'customProfile.year');
    customProfileId = input.customProfile.id;
    rulesVersion = input.customProfile.rulesVersion;
    source = 'custom-profile';
  } else {
    throw new EraResolutionError(
      'MISSING_YEAR',
      'Nie można ustalić roku sceny. Podaj rok scenariusza, wybór użytkownika albo jawny profil custom.'
    );
  }

  if (effectiveYear > ERA_RULES_SUPPORTED_TO && !input.customProfile) {
    throw new EraResolutionError(
      'CUSTOM_PROFILE_REQUIRED',
      `Rok ${effectiveYear} wykracza poza zatwierdzony rejestr. Wymagany jest jawny profil custom.`
    );
  }

  if (input.customProfile) {
    customProfileId = input.customProfile.id;
    rulesVersion = input.customProfile.rulesVersion;
  }

  const region = resolveEraRegion(country);

  return {
    schemaVersion: ERA_CONTEXT_SCHEMA_VERSION,
    sceneDate,
    effectiveYear,
    countryCode: region.countryCode,
    regionProfile: region.regionProfile,
    source,
    rulesVersion,
    ...(customProfileId ? { customProfileId } : {}),
  };
}

export function createEraFingerprint(context: ResolvedEraContext): string {
  return [
    `v${context.schemaVersion}`,
    context.effectiveYear,
    context.countryCode,
    context.regionProfile,
    context.rulesVersion,
    context.customProfileId ?? 'core',
  ].join(':');
}
