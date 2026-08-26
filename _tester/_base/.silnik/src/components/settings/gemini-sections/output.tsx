'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { HelpIcon } from '../../ui/tooltip';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../ui/accordion';
import { GEMINI_HELP } from '../gemini-settings-help';
import type { GeminiSectionProps } from './types';

/** Sekcja Output - maxOutputTokens / responseMimeType / stopSequences / responseSchema (conditional). */
export function OutputSection({ g, updateGemini }: GeminiSectionProps) {
  const t = useTranslations('GeminiOutputSection');
  // responseSchema jako raw string + parsowanie onBlur (allows invalid mid-typing)
  const [responseSchemaRaw, setResponseSchemaRaw] = useState<string>(
    g.responseSchema ? JSON.stringify(g.responseSchema, null, 2) : ''
  );
  const [responseSchemaError, setResponseSchemaError] = useState<string | null>(
    null
  );

  const commitResponseSchema = () => {
    if (!responseSchemaRaw.trim()) {
      updateGemini({ responseSchema: undefined });
      setResponseSchemaError(null);
      return;
    }
    try {
      const parsed: object = JSON.parse(responseSchemaRaw);
      updateGemini({ responseSchema: parsed });
      setResponseSchemaError(null);
    } catch (err) {
      setResponseSchemaError(
        err instanceof Error ? err.message : t('invalidJson')
      );
    }
  };

  // stopSequences: textarea - jeden ciąg per linia, max 5
  const stopSequencesText = (g.stopSequences ?? []).join('\n');
  const handleStopSequencesChange = (raw: string) => {
    const lines = raw
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5);
    updateGemini({ stopSequences: lines });
  };

  return (
    <AccordionItem value="output">
      <AccordionTrigger>
        <span className="flex items-center gap-2">
          <span className="font-display uppercase tracking-[0.16em] text-brass text-sm">
            📤 Output
          </span>
          <span className="text-xs text-muted-foreground font-special-elite uppercase tracking-[0.1em]">
            max:{g.maxOutputTokens}
            {g.responseMimeType === 'application/json' ? ' · JSON' : ''}
            {g.stopSequences && g.stopSequences.length > 0
              ? ` · stop:${g.stopSequences.length}`
              : ''}
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* maxOutputTokens */}
          <div>
            <label className="flex items-center gap-2 text-xs font-special-elite uppercase tracking-[0.1em] text-muted-foreground mb-2">
              {GEMINI_HELP.maxOutputTokens.label}
              <HelpIcon
                content={`${GEMINI_HELP.maxOutputTokens.desc} ${GEMINI_HELP.maxOutputTokens.example ?? ''}`}
              />
            </label>
            <input
              type="number"
              min="100"
              max="8192"
              value={g.maxOutputTokens}
              onChange={(e) =>
                updateGemini({
                  maxOutputTokens: parseInt(e.target.value, 10) || 2048,
                })
              }
              className="w-full px-3 py-2 bg-[#1f1a14] border border-brass/30 rounded text-foreground font-special-elite text-sm focus:border-primary focus:outline-none"
            />
          </div>

          {/* responseMimeType */}
          <div>
            <label className="flex items-center gap-2 text-xs font-special-elite uppercase tracking-[0.1em] text-muted-foreground mb-2">
              {GEMINI_HELP.responseMimeType.label}
              <HelpIcon
                content={`${GEMINI_HELP.responseMimeType.desc} ${GEMINI_HELP.responseMimeType.example ?? ''}`}
              />
            </label>
            <select
              value={g.responseMimeType ?? 'text/plain'}
              onChange={(e) =>
                updateGemini({
                  responseMimeType: e.target.value as
                    | 'text/plain'
                    | 'application/json',
                })
              }
              className="w-full px-3 py-2 bg-[#1f1a14] border border-brass/30 rounded text-foreground font-special-elite text-sm focus:border-primary focus:outline-none"
            >
              <option value="text/plain">{t('mimePlainText')}</option>
              <option value="application/json">
                {t('mimeJson')}
              </option>
            </select>
          </div>
        </div>

        {/* stopSequences */}
        <div className="mt-4">
          <label className="flex items-center gap-2 text-xs font-special-elite uppercase tracking-[0.1em] text-muted-foreground mb-2">
            {GEMINI_HELP.stopSequences.label}
            <HelpIcon
              content={`${GEMINI_HELP.stopSequences.desc} ${GEMINI_HELP.stopSequences.example ?? ''}`}
            />
          </label>
          <textarea
            value={stopSequencesText}
            onChange={(e) => handleStopSequencesChange(e.target.value)}
            placeholder={t('stopSequencesPlaceholder')}
            rows={3}
            className="w-full px-3 py-2 bg-[#1f1a14] border border-brass/30 rounded text-foreground focus:border-primary focus:outline-none font-mono text-xs"
          />
          <p className="text-sm text-muted-foreground font-serif italic mt-1">
            {t('stopSequencesHint')}
          </p>
        </div>

        {/* responseSchema (conditional) */}
        {g.responseMimeType === 'application/json' && (
          <div className="mt-4">
            <label className="flex items-center gap-2 text-xs font-special-elite uppercase tracking-[0.1em] text-muted-foreground mb-2">
              {GEMINI_HELP.responseSchema.label}
              <HelpIcon
                content={`${GEMINI_HELP.responseSchema.desc} ${GEMINI_HELP.responseSchema.example ?? ''}`}
              />
            </label>
            <textarea
              value={responseSchemaRaw}
              onChange={(e) => setResponseSchemaRaw(e.target.value)}
              onBlur={commitResponseSchema}
              placeholder='{"type":"object","properties":{...}}'
              rows={6}
              className={`w-full px-3 py-2 bg-[#1f1a14] border rounded text-foreground focus:border-primary focus:outline-none font-mono text-xs ${
                responseSchemaError ? 'border-destructive' : 'border-brass/30'
              }`}
            />
            {responseSchemaError && (
              <p className="text-xs text-destructive font-special-elite mt-1">
                {t('jsonError', { message: responseSchemaError })}
              </p>
            )}
            <p className="text-sm text-muted-foreground font-serif italic mt-1">
              {t('schemaHint')}
            </p>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}
