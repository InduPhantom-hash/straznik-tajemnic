'use client';

import { useTranslations } from 'next-intl';
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
  const t = useTranslations('GeminiThinkingSection');
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
              <option value="auto">{t('levelAuto')}</option>
              <option value="low">{t('levelLow')}</option>
              <option value="medium">{t('levelMedium')}</option>
              <option value="high">{t('levelHigh')}</option>
            </select>
            <p className="text-sm text-muted-foreground font-serif italic mt-1">
              {g.thinkingLevel === 'auto' && t('hintAuto')}
              {g.thinkingLevel === 'low' && t('hintLow')}
              {g.thinkingLevel === 'medium' && t('hintMedium')}
              {g.thinkingLevel === 'high' && t('hintHigh')}
            </p>
          </div>
          <p className="text-sm text-muted-foreground font-serif italic">
            ℹ️ {t('multimodalNote')}
          </p>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
