import type { GoogleGenAI } from '@google/genai';
import type { HistoricalSourceRef, ResolvedEraContext } from '@/lib/era';
import { DEFAULT_GEMINI_MODEL } from '@/lib/ai-providers/constants';

const TRUSTED_DOMAINS: Readonly<Record<string, HistoricalSourceRef['trustLevel']>> = {
  'archives.gov': 'primary',
  'loc.gov': 'primary',
  'gov.pl': 'authoritative',
  'gov.uk': 'authoritative',
  'nationalarchives.gov.uk': 'primary',
  'british-history.ac.uk': 'curated',
  'polona.pl': 'primary',
  'nac.gov.pl': 'primary',
};

interface GroundingWebChunk {
  web?: { domain?: string; title?: string; uri?: string };
}

interface GroundedResponse {
  text?: string;
  candidates?: Array<{
    groundingMetadata?: {
      groundingChunks?: GroundingWebChunk[];
      webSearchQueries?: string[];
    };
  }>;
}

export interface HistoricalResearchResult {
  status: 'passed' | 'degraded';
  summary: string;
  sources: HistoricalSourceRef[];
  quarantinedSources: HistoricalSourceRef[];
  queries: string[];
  fromCache: boolean;
  message?: string;
}

const researchCache = new Map<string, HistoricalResearchResult>();

function stableMetadataHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function normalizeDomain(chunk: GroundingWebChunk['web']): string {
  if (chunk?.domain) return chunk.domain.toLowerCase().replace(/^www\./, '');
  if (!chunk?.uri) return '';
  try {
    return new URL(chunk.uri).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function trustForDomain(domain: string): HistoricalSourceRef['trustLevel'] | null {
  const registryEntry = Object.entries(TRUSTED_DOMAINS)
    .sort(([left], [right]) => right.length - left.length)
    .find(([trusted]) => domain === trusted || domain.endsWith(`.${trusted}`));
  return registryEntry?.[1] ?? null;
}

function sourceFromChunk(chunk: GroundingWebChunk): HistoricalSourceRef | null {
  const url = chunk.web?.uri?.trim();
  if (!url) return null;
  const domain = normalizeDomain(chunk.web);
  const trustLevel = trustForDomain(domain);
  const isTrusted = trustLevel !== null;
  const title = chunk.web?.title?.trim() || domain || 'Źródło Google Search';
  const contentHash = stableMetadataHash(`${title}\n${url}`);

  return {
    id: `google-${contentHash.slice(0, 16)}`,
    title,
    trustLevel: trustLevel ?? 'untrusted',
    url,
    retrievedAt: new Date().toISOString(),
    contentHash,
    usageRights: 'citation-metadata-only',
    verificationStatus: isTrusted ? 'verified' : 'quarantined',
  };
}

export async function runHistoricalResearch(
  genAI: GoogleGenAI,
  eraContext: ResolvedEraContext
): Promise<HistoricalResearchResult> {
  const cacheKey = [
    eraContext.effectiveYear,
    eraContext.countryCode,
    eraContext.regionProfile,
  ].join(':');
  const cached = researchCache.get(cacheKey);
  if (cached) return { ...cached, fromCache: true };

  try {
    const response = (await genAI.models.generateContent({
      model: DEFAULT_GEMINI_MODEL,
      contents: [{
        role: 'user',
        parts: [{
          text: `Zbierz krótkie, rzeczowe dane historyczne dla roku ${eraContext.effectiveYear}, kraju ${eraContext.countryCode} i regionu ${eraContext.regionProfile}. Skup się na technologii, prawie, obyczajach, transporcie, architekturze i ograniczeniach wiedzy. Nie dodawaj fikcji ani współczesnych założeń.`,
        }],
      }],
      config: {
        temperature: 0.2,
        maxOutputTokens: 1024,
        tools: [{ googleSearch: {} }],
      },
    })) as GroundedResponse;

    const metadata = response.candidates?.[0]?.groundingMetadata;
    const refs = (metadata?.groundingChunks ?? [])
      .map(sourceFromChunk)
      .filter((source): source is HistoricalSourceRef => source !== null);
    const sources = refs.filter((source) => source.verificationStatus === 'verified');
    const quarantinedSources = refs.filter(
      (source) => source.verificationStatus === 'quarantined'
    );
    const canUseSummary = sources.length > 0 && quarantinedSources.length === 0;
    const result: HistoricalResearchResult = {
      status: canUseSummary ? 'passed' : 'degraded',
      summary: canUseSummary ? (response.text?.trim() ?? '') : '',
      sources,
      quarantinedSources,
      queries: metadata?.webSearchQueries ?? [],
      fromCache: false,
      message: canUseSummary
        ? undefined
        : 'Research online nie zwrócił wyłącznie źródeł z rejestru zaufania. Obowiązuje neutralny fallback.',
    };
    researchCache.set(cacheKey, result);
    return result;
  } catch {
    const result: HistoricalResearchResult = {
      status: 'degraded',
      summary: '',
      sources: [],
      quarantinedSources: [],
      queries: [],
      fromCache: false,
      message: 'Research online jest niedostępny. Obowiązuje neutralny fallback.',
    };
    researchCache.set(cacheKey, result);
    return result;
  }
}

export function clearHistoricalResearchCache(): void {
  researchCache.clear();
}
