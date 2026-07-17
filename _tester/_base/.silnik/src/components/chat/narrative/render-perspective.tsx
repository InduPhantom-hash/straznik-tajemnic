'use client';

/**
 * NarrativeFormatter renderPerspective - IND-144 micro 5/8 (extract z NarrativeFormatter.tsx)
 *
 * Renderuje fragment perspektywy postaci (@ImięPostaci: tekst) z kolorową ramką.
 * Kolor pochodzi z konfiguracji Hot Seat (playerColors Map). Default emerald green.
 * OPT-22: zwraca AI per-character border color w narracji wieloosobowej.
 */

import type { ReactNode } from 'react';
import type { Section } from './types';

export function renderPerspective(
  section: Section,
  key: number,
  playerColors?: Map<string, string>
): ReactNode {
  // Znajdź kolor dla postaci (case-insensitive)
  const charNameLower = section.characterName?.toLowerCase() || '';
  let color = '#10b981'; // domyślny emerald green

  if (playerColors) {
    // Szukaj pełnego dopasowania lub częściowego (np. "Jan" w "Jan Kowalski")
    for (const [name, playerColor] of playerColors.entries()) {
      if (
        name.toLowerCase().includes(charNameLower) ||
        charNameLower.includes(name.toLowerCase())
      ) {
        color = playerColor;
        break;
      }
    }
  }

  return (
    <div
      key={key}
      className="my-3 pl-4 rounded-r-lg py-2 px-3"
      style={{
        borderLeft: `4px solid ${color}`,
        backgroundColor: `${color}15`,
      }}
    >
      <span className="text-xs font-semibold block mb-1" style={{ color }}>
        {section.characterName}
      </span>
      <p className="text-foreground leading-relaxed whitespace-pre-wrap">
        {section.content}
      </p>
    </div>
  );
}
