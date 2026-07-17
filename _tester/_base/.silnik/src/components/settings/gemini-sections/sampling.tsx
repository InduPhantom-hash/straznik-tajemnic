'use client';

import { HelpIcon } from '../../ui/tooltip';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../ui/accordion';
import { GEMINI_HELP } from '../gemini-settings-help';
import type { GeminiSectionProps } from './types';

/** Sekcja Sampling - temperature/topP/topK + seed/candidateCount/presence+frequencyPenalty. */
export function SamplingSection({ g, updateGemini }: GeminiSectionProps) {
  return (
    <AccordionItem value="sampling">
      <AccordionTrigger>
        <span className="flex items-center gap-2">
          <span className="font-display uppercase tracking-[0.16em] text-brass text-sm">
            🎛️ Sampling
          </span>
          <span className="text-xs text-muted-foreground font-special-elite uppercase tracking-[0.1em]">
            T:{g.temperature.toFixed(1)} · P:{g.topP.toFixed(2)} · K:{g.topK}
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* temperature */}
          <div>
            <label className="flex items-center gap-2 text-xs font-special-elite uppercase tracking-[0.1em] text-muted-foreground mb-2">
              {GEMINI_HELP.temperature.label}
              <HelpIcon
                content={`${GEMINI_HELP.temperature.desc} ${GEMINI_HELP.temperature.example ?? ''}`}
              />
            </label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground font-special-elite min-w-[2rem]">
                0.0
              </span>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={g.temperature}
                onChange={(e) =>
                  updateGemini({ temperature: parseFloat(e.target.value) })
                }
                className="flex-1 h-1.5 bg-[#2a241b] accent-primary rounded-full appearance-none cursor-pointer slider-thumb"
              />
              <span className="text-xs text-muted-foreground font-special-elite min-w-[2rem]">
                2.0
              </span>
              <span className="text-sm font-special-elite text-primary min-w-[3rem] text-right">
                {g.temperature.toFixed(1)}
              </span>
            </div>
          </div>

          {/* topP */}
          <div>
            <label className="flex items-center gap-2 text-xs font-special-elite uppercase tracking-[0.1em] text-muted-foreground mb-2">
              {GEMINI_HELP.topP.label}
              <HelpIcon
                content={`${GEMINI_HELP.topP.desc} ${GEMINI_HELP.topP.example ?? ''}`}
              />
            </label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground font-special-elite min-w-[2rem]">
                0.0
              </span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={g.topP}
                onChange={(e) =>
                  updateGemini({ topP: parseFloat(e.target.value) })
                }
                className="flex-1 h-1.5 bg-[#2a241b] accent-primary rounded-full appearance-none cursor-pointer slider-thumb"
              />
              <span className="text-xs text-muted-foreground font-special-elite min-w-[2rem]">
                1.0
              </span>
              <span className="text-sm font-special-elite text-primary min-w-[3rem] text-right">
                {g.topP.toFixed(2)}
              </span>
            </div>
          </div>

          {/* topK */}
          <div>
            <label className="flex items-center gap-2 text-xs font-special-elite uppercase tracking-[0.1em] text-muted-foreground mb-2">
              {GEMINI_HELP.topK.label}
              <HelpIcon
                content={`${GEMINI_HELP.topK.desc} ${GEMINI_HELP.topK.example ?? ''}`}
              />
            </label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground font-special-elite min-w-[2rem]">
                1
              </span>
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={g.topK}
                onChange={(e) =>
                  updateGemini({ topK: parseInt(e.target.value, 10) })
                }
                className="flex-1 h-1.5 bg-[#2a241b] accent-primary rounded-full appearance-none cursor-pointer slider-thumb"
              />
              <span className="text-xs text-muted-foreground font-special-elite min-w-[2rem]">
                100
              </span>
              <span className="text-sm font-special-elite text-primary min-w-[3rem] text-right">
                {g.topK}
              </span>
            </div>
          </div>

          {/* candidateCount */}
          <div>
            <label className="flex items-center gap-2 text-xs font-special-elite uppercase tracking-[0.1em] text-muted-foreground mb-2">
              {GEMINI_HELP.candidateCount.label}
              <HelpIcon
                content={`${GEMINI_HELP.candidateCount.desc} ${GEMINI_HELP.candidateCount.example ?? ''}`}
              />
            </label>
            <input
              type="number"
              min="1"
              max="4"
              step="1"
              value={g.candidateCount ?? 1}
              onChange={(e) =>
                updateGemini({
                  candidateCount: parseInt(e.target.value, 10) || 1,
                })
              }
              className="w-full px-3 py-2 bg-[#1f1a14] border border-brass/30 rounded text-foreground font-special-elite text-sm focus:border-primary focus:outline-none"
            />
          </div>

          {/* seed */}
          <div>
            <label className="flex items-center gap-2 text-xs font-special-elite uppercase tracking-[0.1em] text-muted-foreground mb-2">
              {GEMINI_HELP.seed.label}
              <HelpIcon
                content={`${GEMINI_HELP.seed.desc} ${GEMINI_HELP.seed.example ?? ''}`}
              />
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={g.seed ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                updateGemini({ seed: v === '' ? undefined : parseInt(v, 10) });
              }}
              placeholder="losowy"
              className="w-full px-3 py-2 bg-[#1f1a14] border border-brass/30 rounded text-foreground font-special-elite text-sm focus:border-primary focus:outline-none"
            />
          </div>

          {/* presencePenalty */}
          <div>
            <label className="flex items-center gap-2 text-xs font-special-elite uppercase tracking-[0.1em] text-muted-foreground mb-2">
              {GEMINI_HELP.presencePenalty.label}
              <HelpIcon
                content={`${GEMINI_HELP.presencePenalty.desc} ${GEMINI_HELP.presencePenalty.example ?? ''}`}
              />
            </label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground font-special-elite min-w-[2rem]">
                -2.0
              </span>
              <input
                type="range"
                min="-2"
                max="2"
                step="0.1"
                value={g.presencePenalty ?? 0}
                onChange={(e) =>
                  updateGemini({ presencePenalty: parseFloat(e.target.value) })
                }
                className="flex-1 h-1.5 bg-[#2a241b] accent-primary rounded-full appearance-none cursor-pointer slider-thumb"
              />
              <span className="text-xs text-muted-foreground font-special-elite min-w-[2rem]">
                2.0
              </span>
              <span className="text-sm font-special-elite text-primary min-w-[3rem] text-right">
                {(g.presencePenalty ?? 0).toFixed(1)}
              </span>
            </div>
          </div>

          {/* frequencyPenalty */}
          <div>
            <label className="flex items-center gap-2 text-xs font-special-elite uppercase tracking-[0.1em] text-muted-foreground mb-2">
              {GEMINI_HELP.frequencyPenalty.label}
              <HelpIcon
                content={`${GEMINI_HELP.frequencyPenalty.desc} ${GEMINI_HELP.frequencyPenalty.example ?? ''}`}
              />
            </label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground font-special-elite min-w-[2rem]">
                -2.0
              </span>
              <input
                type="range"
                min="-2"
                max="2"
                step="0.1"
                value={g.frequencyPenalty ?? 0}
                onChange={(e) =>
                  updateGemini({ frequencyPenalty: parseFloat(e.target.value) })
                }
                className="flex-1 h-1.5 bg-[#2a241b] accent-primary rounded-full appearance-none cursor-pointer slider-thumb"
              />
              <span className="text-xs text-muted-foreground font-special-elite min-w-[2rem]">
                2.0
              </span>
              <span className="text-sm font-special-elite text-primary min-w-[3rem] text-right">
                {(g.frequencyPenalty ?? 0).toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
