'use client';

import { HelpIcon } from '../../ui/tooltip';
import { Button } from '../../ui/button';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../ui/accordion';
import { GEMINI_HELP } from '../gemini-settings-help';
import {
  type GeminiSectionProps,
  type SafetyLevel,
  SAFETY_KEYS,
  SAFETY_LEVELS,
  HORROR_PRESET,
  SAFETY_DEFAULT,
} from './types';

/** Sekcja Safety - 4 selecty + presety Horror authentic / Reset, color-coded badges. */
export function SafetySection({ g, updateGemini }: GeminiSectionProps) {
  return (
    <AccordionItem value="safety">
      <AccordionTrigger>
        <span className="flex items-center gap-2">
          <span className="font-display uppercase tracking-[0.16em] text-brass text-sm">
            🛡️ Safety
          </span>
          <span className="text-xs text-muted-foreground font-special-elite uppercase tracking-[0.1em]">
            {Object.values(g.safetySettings).every(
              (v) => v === 'BLOCK_MEDIUM_AND_ABOVE'
            )
              ? 'Wszystkie BLOCK_MEDIUM (default)'
              : Object.values(g.safetySettings).every(
                    (v) => v === 'BLOCK_ONLY_HIGH'
                  )
                ? 'Horror authentic (BLOCK_ONLY_HIGH)'
                : 'Custom'}
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent>
        {/* Presety */}
        <div className="flex flex-wrap items-center gap-2 pt-2 mb-4">
          <Button
            size="sm"
            variant="outline"
            onClick={() => updateGemini({ safetySettings: HORROR_PRESET })}
            title="Dla autentycznego Lovecrafta - pozwala na gore, kult, śmierć"
          >
            🩸 Horror authentic
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => updateGemini({ safetySettings: SAFETY_DEFAULT })}
            title="Domyślne wartości Google (BLOCK_MEDIUM_AND_ABOVE)"
          >
            ↺ Reset
          </Button>
          <HelpIcon
            content={`${GEMINI_HELP.safetySettings.desc} ${GEMINI_HELP.safetySettings.example ?? ''}`}
          />
        </div>

        {/* 4 selecty */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SAFETY_KEYS.map(({ key, helpKey }) => {
            const level = g.safetySettings[key];
            const meta =
              SAFETY_LEVELS.find((l) => l.value === level) ?? SAFETY_LEVELS[2];
            const help = GEMINI_HELP[helpKey];
            return (
              <div key={key}>
                <label className="flex items-center gap-2 text-xs font-special-elite uppercase tracking-[0.1em] text-muted-foreground mb-2">
                  {help.label}
                  <HelpIcon content={help.desc} />
                  <span
                    className={`ml-auto text-[14px] px-2 py-0.5 rounded border ${meta.badge}`}
                  >
                    {level.replace('BLOCK_', '')}
                  </span>
                </label>
                <select
                  value={level}
                  onChange={(e) =>
                    updateGemini({
                      safetySettings: {
                        ...g.safetySettings,
                        [key]: e.target.value as SafetyLevel,
                      },
                    })
                  }
                  className="w-full px-3 py-2 bg-[#1f1a14] border border-brass/30 rounded text-foreground font-special-elite text-sm focus:border-primary focus:outline-none"
                >
                  {SAFETY_LEVELS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>

        <p className="text-sm text-muted-foreground font-serif italic mt-3">
          ℹ️ Ostrożny default Google może blokować klimatyczny horror.{' '}
          <strong className="text-brass not-italic">Horror authentic</strong> =
          wszystkie 4 kategorie na BLOCK_ONLY_HIGH (filtruje tylko ekstremalne
          treści).
        </p>
      </AccordionContent>
    </AccordionItem>
  );
}
