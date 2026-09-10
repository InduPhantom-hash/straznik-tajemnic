'use client';

/**
 * Component for rendering Director notes (Kulisy MG / BOP) in an Arkham-styled
 * collapsible accordion when Director Mode is active.
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Eye, ChevronDown, ChevronRight } from 'lucide-react';

interface DirectorNotesProps {
  content: string;
}

export function DirectorNotes({ content }: DirectorNotesProps) {
  const t = useTranslations('NarrativeFormatter');
  const [isOpen, setIsOpen] = useState(false);

  if (!content.trim()) return null;

  // Split tokens by pipe '|' if available for structured display
  const tokens = content.split(/\s*\|\s*/).map((token) => token.trim()).filter(Boolean);

  return (
    <div className="my-3 rounded border border-brass/30 bg-brass/5 overflow-hidden text-xs font-mono">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-brass hover:text-gold hover:bg-brass/10 transition-colors cursor-pointer text-left select-none"
      >
        <span className="flex items-center gap-2 font-semibold tracking-wider uppercase">
          <Eye className="w-3.5 h-3.5 text-brass shrink-0" />
          <span>{t('directorNotesTitle')}</span>
        </span>
        <span className="text-brass/70">
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </span>
      </button>

      {isOpen && (
        <div className="px-3 pb-3 pt-1 border-t border-brass/20 space-y-2 text-brass/90 bg-black/20">
          {tokens.map((token, idx) => {
            const colonIdx = token.indexOf(':');
            if (colonIdx > 0) {
              const label = token.substring(0, colonIdx).trim();
              const val = token.substring(colonIdx + 1).trim();
              return (
                <div key={`token-${label}-${idx}`} className="flex flex-col sm:flex-row sm:gap-2 leading-relaxed">
                  <span className="text-gold font-bold shrink-0">{label}:</span>
                  <span className="text-brass/80 break-words">{val}</span>
                </div>
              );
            }
            return (
              <div key={`token-${idx}`} className="text-brass/80 break-words leading-relaxed">
                {token}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
