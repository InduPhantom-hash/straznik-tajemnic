/**
 * @file src/lib/era/baseline/index.ts
 * 
 * Moduł dostępu do wewnętrznej bazy wiedzy o epokach (Baseline SSOT).
 * Umożliwia ładowanie skompilowanych faktów, reguł i twardych zakazów (hardGuardrails)
 * dla dowolnego roku i regionu bez odpytywania dysku zewnętrznego.
 */

import runtimeBaselineJson from './runtime-baseline.json';
import encyclopediaBaselineJson from './encyclopedia-baseline.json';

export interface EraHardGuardrails {
  forbiddenTech: string[];
  forbiddenInstitutions: string[];
  forbiddenForensics: string[];
  historicalAlternatives: Record<string, string>;
}

export interface EraRuntimeCategory {
  id: string;
  namePl: string;
  nameEn: string;
  keyFacts: string[];
  rulesForKeeper: string[];
  sourcesCount: number;
}

export interface EraRuntimeRegionData {
  region: string;
  hardGuardrails: EraHardGuardrails;
  categories: Record<string, EraRuntimeCategory>;
}

export interface EraRuntimeEpoch {
  id: string;
  titlePl: string;
  titleEn: string;
  validFrom: number;
  validTo: number;
  regions: Record<string, EraRuntimeRegionData>;
}

export interface EraRuntimeBaseline {
  $schemaVersion: number;
  generatedAt: string;
  eras: Record<string, EraRuntimeEpoch>;
}

export interface EncyclopediaSource {
  id: string;
  title: string;
  url: string;
  trustLevel: string;
}

export interface EncyclopediaCategory {
  id: string;
  number: string;
  namePl: string;
  nameEn: string;
  context: string;
  scope: string;
  rulesForKeeper: string[];
  sources: EncyclopediaSource[];
}

export interface EncyclopediaRegionData {
  region: string;
  categories: EncyclopediaCategory[];
}

export interface EncyclopediaEpoch {
  id: string;
  titlePl: string;
  titleEn: string;
  validFrom: number;
  validTo: number;
  regions: Record<string, EncyclopediaRegionData>;
}

export interface EncyclopediaBaseline {
  $schemaVersion: number;
  generatedAt: string;
  eras: Record<string, EncyclopediaEpoch>;
}

export const RUNTIME_BASELINE = runtimeBaselineJson as unknown as EraRuntimeBaseline;
export const ENCYCLOPEDIA_BASELINE = encyclopediaBaselineJson as unknown as EncyclopediaBaseline;

/**
 * Zwraca identyfikator epoki dla podanego roku.
 */
export function resolveEpochIdByYear(year: number): string {
  if (year <= 1899) return '1890s-gaslight';
  if (year >= 1920 && year <= 1929) return '1920s-classic';
  if (year >= 1930 && year <= 1938) return '1920s-classic'; // mapowanie do dwudziestolecia
  if (year >= 1939 && year <= 1949) return '1940s-noir';
  if (year >= 1950 && year <= 1959) return '1940s-noir';
  if (year >= 1960 && year <= 1979) return '1970s-prl-coldwar';
  if (year >= 1980 && year <= 1989) return '1970s-prl-coldwar';
  if (year >= 1990 && year <= 2005) return '1990s-2000s';
  return 'modern';
}

/**
 * Normalizuje kod kraju lub profil regionalny do klucza regionu w baseline ('PL' | 'USA').
 */
export function normalizeBaselineRegion(countryOrRegion?: string): 'PL' | 'USA' {
  const norm = (countryOrRegion ?? '').toUpperCase().trim();
  if (norm === 'PL' || norm === 'POLSKA' || norm === 'POLAND') return 'PL';
  return 'USA';
}

/**
 * Pobiera dane runtime dla danego roku i regionu.
 */
export function getEraRuntimeBaseline(
  year: number,
  countryOrRegion = 'US'
): EraRuntimeRegionData | null {
  const epochId = resolveEpochIdByYear(year);
  const epoch = RUNTIME_BASELINE.eras[epochId];
  if (!epoch) return null;

  const regionKey = normalizeBaselineRegion(countryOrRegion);
  return epoch.regions[regionKey] ?? epoch.regions['USA'] ?? null;
}

/**
 * Pobiera twarde bezpieczniki (hardGuardrails) dla danego roku i regionu.
 */
export function getEraHardGuardrails(
  year: number,
  countryOrRegion = 'US'
): EraHardGuardrails | null {
  const baseline = getEraRuntimeBaseline(year, countryOrRegion);
  return baseline?.hardGuardrails ?? null;
}

/**
 * Pobiera dane encyklopedii dla wybranej epoki i regionu (dla Kompendium Badacza).
 */
export function getEraEncyclopedia(
  epochId: string,
  countryOrRegion = 'US'
): EncyclopediaCategory[] {
  const epoch = ENCYCLOPEDIA_BASELINE.eras[epochId];
  if (!epoch) return [];
  const regionKey = normalizeBaselineRegion(countryOrRegion);
  return epoch.regions[regionKey]?.categories ?? [];
}
