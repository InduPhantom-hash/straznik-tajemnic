/**
 * buildGeminiOptions - pure factory dla chatGeminiOptions (IND-183 micro 5/5).
 *
 * Składa obiekt `geminiOptions` przekazywany do `provider.streamChat`.
 * Łączy 16 pól z `aiSettings.geminiSettings` (flat po IND-46 single-provider)
 * + 2 pola runtime (additionalContext z buildAdditionalContext + resolvedCachedContent
 * z resolveGeminiCache) + conditional fileAttachments (tylko gdy length > 0).
 *
 * Zachowuje 1:1 zachowanie z oryginalnego route.ts (lin 223-243 przed split).
 *
 * Pure function: brak side effects, brak async. Object factory pattern.
 */

import type { AISettings } from '@/lib/ai-settings/types';
import type { GeminiExtraOptions } from '@/lib/ai-providers/types';
import type { CachedContent } from '@google/genai';

export interface BuildGeminiOptionsOpts {
  geminiSettings: AISettings['geminiSettings'];
  additionalContext: string[];
  fileAttachments: Array<{ fileUri: string; mimeType: string }>;
  resolvedCachedContent: CachedContent | null;
}

export function buildGeminiOptions(
  opts: BuildGeminiOptionsOpts
): GeminiExtraOptions {
  const g = opts.geminiSettings;
  return {
    additionalContext: opts.additionalContext,
    ...(opts.fileAttachments.length > 0
      ? { fileAttachments: opts.fileAttachments }
      : {}),
    thinkingLevel: g.thinkingLevel,
    topK: g.topK,
    candidateCount: g.candidateCount,
    stopSequences: g.stopSequences,
    seed: g.seed,
    presencePenalty: g.presencePenalty,
    frequencyPenalty: g.frequencyPenalty,
    responseMimeType: g.responseMimeType,
    responseSchema: g.responseSchema,
    safetySettings: g.safetySettings,
    tools: g.tools,
    toolConfig: g.toolConfig,
    cachedContent: g.cachedContent,
    enableCache: g.enableCache,
    resolvedCachedContent: opts.resolvedCachedContent ?? undefined,
  };
}
