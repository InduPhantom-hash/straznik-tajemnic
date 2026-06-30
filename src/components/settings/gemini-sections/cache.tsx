'use client';

import { HelpIcon } from '../../ui/tooltip';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../ui/accordion';
import { GEMINI_HELP } from '../gemini-settings-help';
import type { GeminiSectionProps } from './types';

/** Sekcja Cache - UI gotowe, faktyczna integracja w IND-13 (Gemini Context Caching). */
export function CacheSection({ g, updateGemini }: GeminiSectionProps) {
  return (
    <AccordionItem value="cache">
      <AccordionTrigger>
        <span className="flex items-center gap-2">
          <span className="font-display uppercase tracking-[0.16em] text-brass text-sm">
            💾 Cache
          </span>
          <span className="text-xs text-muted-foreground font-special-elite uppercase tracking-[0.1em]">
            {g.enableCache ? '✓ włączony' : '○ wyłączony'} · 🚧 IND-13
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent>
        <div className="border-l-2 border-brass/50 bg-brass/[0.06] p-3 mb-4">
          <p className="text-sm text-muted-foreground font-serif italic">
            🚧{' '}
            <strong className="text-brass not-italic">
              Pełna integracja w IND-13.
            </strong>{' '}
            UI ustawień jest gotowe, ale wartości są zapisywane do{' '}
            <code>cachedContent</code> placeholder w providerze i nie zmieniają
            jeszcze faktycznego zachowania API. Po IND-13: oszczędność do 90%
            input tokens.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* enableCache */}
          <div>
            <label className="flex items-center gap-2 text-xs font-special-elite uppercase tracking-[0.1em] text-muted-foreground mb-2">
              {GEMINI_HELP.enableCache.label}
              <HelpIcon content={GEMINI_HELP.enableCache.desc} />
            </label>
            <input
              type="checkbox"
              checked={g.enableCache ?? false}
              onChange={(e) => updateGemini({ enableCache: e.target.checked })}
              className="w-4 h-4 accent-primary bg-[#1f1a14] border-brass/40 rounded"
            />
          </div>

          {/* cacheTTL */}
          <div>
            <label className="flex items-center gap-2 text-xs font-special-elite uppercase tracking-[0.1em] text-muted-foreground mb-2">
              {GEMINI_HELP.cacheTTL.label}
              <HelpIcon
                content={`${GEMINI_HELP.cacheTTL.desc} ${GEMINI_HELP.cacheTTL.example ?? ''}`}
              />
            </label>
            <input
              type="number"
              min="60000"
              step="60000"
              value={g.cacheTTL ?? 3600000}
              onChange={(e) =>
                updateGemini({
                  cacheTTL: parseInt(e.target.value, 10) || 3600000,
                })
              }
              disabled={!g.enableCache}
              className="w-full px-3 py-2 bg-[#1f1a14] border border-brass/30 rounded text-foreground font-special-elite text-sm focus:border-primary focus:outline-none disabled:opacity-50"
            />
            <p className="text-sm text-muted-foreground font-serif italic mt-1">
              W milisekundach. 3 600 000 = 1h. 86 400 000 = 24h.
            </p>
          </div>

          {/* cachedContent (advanced) */}
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 text-xs font-special-elite uppercase tracking-[0.1em] text-muted-foreground mb-2">
              {GEMINI_HELP.cachedContent.label}
              <HelpIcon
                content={`${GEMINI_HELP.cachedContent.desc} ${GEMINI_HELP.cachedContent.example ?? ''}`}
              />
            </label>
            <input
              type="text"
              value={g.cachedContent ?? ''}
              onChange={(e) =>
                updateGemini({ cachedContent: e.target.value || undefined })
              }
              placeholder="cachedContents/abc123 (zaawansowane - zostaw puste)"
              disabled={!g.enableCache}
              className="w-full px-3 py-2 bg-[#1f1a14] border border-brass/30 rounded text-foreground focus:border-primary focus:outline-none font-mono text-xs disabled:opacity-50"
            />
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
