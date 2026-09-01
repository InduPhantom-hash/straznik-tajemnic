import type { EraManifestV1, EraRegionProfile } from './types';

const PENDING_SOURCE = {
  id: 'source-review-required',
  title: 'Źródła wymagają przeglądu i akceptacji PO',
  trustLevel: 'curated' as const,
  url: 'internal://historical-source-review-required',
  retrievedAt: '2026-08-31',
  contentHash: 'pending',
  usageRights: 'metadata-only',
  verificationStatus: 'pending' as const,
};

function draftManifest(
  id: string,
  title: string,
  validFrom: number,
  validTo: number,
  countryCode: string,
  regionProfile: EraRegionProfile,
  forbidden: string[],
  visualDirection: string[]
): EraManifestV1 {
  return {
    schemaVersion: 1,
    id,
    title,
    validFrom,
    validTo,
    exactYearRequired: validFrom !== validTo,
    countryCodes: [countryCode],
    regionProfiles: [regionProfile],
    economicBackground: [],
    socialAndClassStructure: [],
    politicalSituation: [],
    racismAndExclusion: [],
    genderRolesAndRights: [],
    technology: [],
    law: [],
    customs: [],
    occupations: [],
    communication: [],
    transport: [],
    architecture: [],
    periodKnowledgeAndLimits: [],
    language: [],
    visualDirection,
    forbidden,
    presentismRisks: [
      'Nie przedstawiaj współczesnych praw, kategorii społecznych ani dostępu do zawodów jako normy historycznej.',
      'Nietypową rolę społeczną opisuj przez realny kontekst, bariery i wyjątki danej epoki.',
    ],
    sources: [PENDING_SOURCE],
    approvalStatus: 'draft',
  };
}

export const ERA_MANIFESTS_V1: readonly EraManifestV1[] = [
  draftManifest(
    'gb-1890s',
    'Wielka Brytania 1890s',
    1890,
    1899,
    'GB',
    'GB',
    ['smartfon', 'samochód produkowany seryjnie jako powszechny środek transportu', 'radio domowe'],
    ['dokumentalny realizm późnej epoki wiktoriańskiej', 'materiały i konstrukcje właściwe dokładnemu rokowi']
  ),
  draftManifest(
    'us-1920s',
    'USA 1920s',
    1920,
    1929,
    'US',
    'US',
    ['smartfon', 'komputer osobisty', 'współczesny samochód', 'współczesne tworzywa i logo'],
    ['dokumentalna fotografia', 'realistyczne amerykańskie otoczenie właściwe regionowi i rokowi']
  ),
  draftManifest(
    'pl-1973-1974',
    'Polska 1973-1974',
    1973,
    1974,
    'PL',
    'PL',
    ['smartfon', 'internet', 'laptop', 'współczesne polskie oznakowanie'],
    ['analogowa fotografia', 'polskie rekwizyty i architektura początku lat 70.']
  ),
  draftManifest(
    'pl-1980s',
    'Polska 1980s',
    1980,
    1989,
    'PL',
    'PL',
    ['smartfon', 'internet konsumencki', 'współczesny laptop', 'współczesne samochody'],
    ['fotografia analogowa', 'polskie realia konkretnego roku lat 80.']
  ),
  draftManifest(
    'pl-1990s',
    'Polska 1990s',
    1990,
    1999,
    'PL',
    'PL',
    ['smartfon', 'media społecznościowe', 'współczesny ultrabook', 'samochody po roku sceny'],
    ['fotografia analogowa lub wczesna cyfrowa', 'realia transformacji właściwe dokładnemu rokowi']
  ),
  draftManifest(
    'pl-2000-2005',
    'Polska 2000-2005',
    2000,
    2005,
    'PL',
    'PL',
    ['smartfon', 'tablet', 'powerbank', 'współczesny ultrabook', 'media społecznościowe przed ich dostępnością'],
    ['wczesna fotografia cyfrowa lub analogowa', 'sprzęt i samochody dostępne w dokładnym roku']
  ),
  draftManifest(
    'global-contemporary',
    'Współczesność',
    2006,
    2026,
    'ZZ',
    'GLOBAL',
    ['technologia wprowadzona po dokładnym roku sceny'],
    ['współczesny dokumentalny realizm', 'region i rok ważniejsze od ogólnej etykiety modern']
  ),
] as const;

export function findEraManifest(
  year: number,
  countryCode: string,
  regionProfile: EraRegionProfile
): EraManifestV1 | null {
  return (
    ERA_MANIFESTS_V1.find(
      (manifest) =>
        year >= manifest.validFrom &&
        year <= manifest.validTo &&
        (manifest.countryCodes.includes(countryCode) ||
          manifest.regionProfiles.includes(regionProfile))
    ) ?? null
  );
}
