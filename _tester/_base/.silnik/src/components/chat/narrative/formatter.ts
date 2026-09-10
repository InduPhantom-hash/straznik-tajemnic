/**
 * NarrativeFormatter formatNarrative - IND-144 micro 8/8 (extract z NarrativeFormatter.tsx)
 *
 * Orchestrator: cleanup → parse → render. Pure function bez React deps (zwraca
 * ReactNode[] ale nie używa hooks). Wrapuje 3 etapy pipeline'u.
 */

import type { ReactNode } from 'react';
import { cleanupContent, NESTED_TAG_BODY } from './cleanup';
import { parseIntoSections } from './parse-sections';
import { renderSection } from './render-sections';

export function formatNarrative(
  content: string,
  playerColors?: Map<string, string>,
  onImageClick?: (imgUrl: string, allImages: string[]) => void,
  isDirectorMode?: boolean
): ReactNode[] {
  let directorThoughts: string | null = null;
  if (isDirectorMode) {
    const thoughtsRegex = new RegExp(`\\[MYŚLI_MG:\\s*(${NESTED_TAG_BODY})\\]`, 'i');
    const thoughtsMatch = content.match(thoughtsRegex);
    if (thoughtsMatch && thoughtsMatch[1].trim()) {
      directorThoughts = thoughtsMatch[1].trim();
    }
  }

  const cleanContent = cleanupContent(content);
  const sections = parseIntoSections(cleanContent);

  if (directorThoughts) {
    sections.unshift({
      type: 'director-notes',
      content: directorThoughts,
    });
  }

  return sections.map((section, index) =>
    renderSection(section, index, playerColors, onImageClick)
  );
}
