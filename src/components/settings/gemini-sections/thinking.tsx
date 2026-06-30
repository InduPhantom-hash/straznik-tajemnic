'use client';

import { HelpIcon } from '../../ui/tooltip';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../ui/accordion';
import { GEMINI_HELP } from '../gemini-settings-help';
import type { GeminiSectionProps } from './types';

/** Sekcja Thinking & Vision - thinkingLevel + info o multimodalności. */
export function ThinkingSection({ g, updateGemini }: GeminiSectionProps) {
  return (
    <AccordionItem value="thinking">
      <AccordionTrigger>
        <span className="flex items-center gap-2">
          <span className="font-display uppercase tracking-[0.16em] text-brass text-sm">
            🧠 Thinking &amp; Vision
          </span>
          <span className="text-xs text-muted-foreground font-special-elite uppercase tracking-[0.1em]">
            {g.thinkingLevel ?? 'auto'}
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent>
        <div className="pt-2 space-y-3">
          <div>
            <label className="flex items-center gap-2 text-xs font-special-elite uppercase tracking-[0.1em] text-muted-foreground mb-2">
              {GEMINI_HELP.thinkingLevel.label}
              <HelpIcon
                content={`${GEMINI_HELP.thinkingLevel.desc} ${GEMINI_HELP.thinkingLevel.example ?? ''}`}
              />
            </label>
            <select
              value={g.thinkingLevel ?? 'auto'}
              onChange={(e) =>
                updateGemini({
                  thinkingLevel: e.target.value as
                    | 'low'
                    | 'medium'
                    | 'high'
                    | 'auto',
                })
              }
              className="w-full px-3 py-2 bg-[#1f1a14] border border-brass/30 rounded text-foreground font-special-elite text-sm focus:border-primary focus:outline-none"
            >
              <option value="auto">Auto (adaptacyjny wybór)</option>
              <option value="low">Low (szybkie, tańsze)</option>
              <option value="medium">Medium (standardowe)</option>
              <option value="high">High (głębsze rozumowanie)</option>
            </select>
            <p className="text-sm text-muted-foreground font-serif italic mt-1">
              {g.thinkingLevel === 'auto' &&
                'Automatycznie wybiera poziom na podstawie złożoności zapytania'}
              {g.thinkingLevel === 'low' &&
                'Optymalne dla prostych komend i krótkich odpowiedzi'}
              {g.thinkingLevel === 'medium' &&
                'Standardowy poziom rozumowania dla większości zapytań'}
              {g.thinkingLevel === 'high' &&
                'Głębsze rozumowanie dla złożonych sytuacji, walki i ważnych decyzji'}
            </p>
          </div>
          <p className="text-sm text-muted-foreground font-serif italic">
            ℹ️ Multimodalność (wejście obrazów) jest aktywna automatycznie dla
            Gemini 1.5+ i nie wymaga konfiguracji.
          </p>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
