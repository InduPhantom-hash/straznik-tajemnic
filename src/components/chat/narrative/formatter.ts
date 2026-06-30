/**
 * NarrativeFormatter formatNarrative - IND-144 micro 8/8 (extract z NarrativeFormatter.tsx)
 *
 * Orchestrator: cleanup → parse → render. Pure function bez React deps (zwraca
 * ReactNode[] ale nie używa hooks). Wrapuje 3 etapy pipeline'u.
 */

import type { ReactNode } from 'react';
import { cleanupContent } from './cleanup';
import { parseIntoSections } from './parse-sections';
import { renderSection } from './render-sections';

export function formatNarrative(
  content: string,
  playerColors?: Map<string, string>
): ReactNode[] {
  const cleanContent = cleanupContent(content);
  const sections = parseIntoSections(cleanContent);
  return sections.map((section, index) =>
    renderSection(section, index, playerColors)
  );
}
