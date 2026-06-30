'use client';

/**
 * NarrativeFormatter renderSection - IND-144 micro 7/8 (extract z NarrativeFormatter.tsx)
 *
 * Switch router dla 7 typów sekcji. Inline JSX dla prostych case'ów (dialogue,
 * roll, whisper). Delegacja do dedykowanych modułów dla złożonych
 * (handout/perspective/narrative-with-images).
 */

import type { ReactNode } from 'react';
import type { Section } from './types';
import { renderHandout } from './render-handout';
import { renderPerspective } from './render-perspective';
import { renderNarrativeWithImages } from './render-narrative-with-images';

export function renderSection(
  section: Section,
  key: number,
  playerColors?: Map<string, string>
): ReactNode {
  switch (section.type) {
    case 'dialogue':
      return (
        <div
          key={key}
          className="my-3 pl-4 border-l-3 border-amber-500/60 bg-amber-500/5 py-2 px-3 rounded-r-lg"
        >
          {section.speaker && (
            <span className="text-amber-400 text-xs font-semibold block mb-1">
              {section.speaker}:
            </span>
          )}
          <p className="text-amber-200 italic">
            „
            {section.content
              .replace(/^[\u201E\u201C\u201D\u0022]/, '')
              .replace(/[\u201E\u201C\u201D\u0022]$/, '')}
            &rdquo;
          </p>
        </div>
      );

    case 'handout':
      return renderHandout(section, key);

    case 'roll':
      return (
        <div
          key={key}
          className="my-3 bg-brass/10 border border-brass/30 rounded-lg p-3"
        >
          <div className="flex items-center gap-2">
            <span className="text-brass">🎲</span>
            <span className="text-brass font-mono text-sm">
              {section.content.replace(/^\[|\]$/g, '')}
            </span>
          </div>
        </div>
      );

    case 'whisper':
      return (
        <div
          key={key}
          className="my-2 text-muted-foreground text-xs italic px-3 py-1 bg-muted/30 rounded"
        >
          ℹ️ {section.content}
        </div>
      );

    case 'perspective':
      return renderPerspective(section, key, playerColors);

    case 'narrative':
    default:
      return renderNarrativeWithImages(section.content, key);
  }
}
