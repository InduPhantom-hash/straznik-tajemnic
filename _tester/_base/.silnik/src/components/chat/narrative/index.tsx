'use client';

import { useMemo } from 'react';
import { formatNarrative } from './formatter';

interface NarrativeFormatterProps {
  content: string;
  className?: string;
  playerColors?: Map<string, string>; // Hot Seat: mapa imię postaci -> kolor gracza
  onImageClick?: (imgUrl: string, allImages: string[]) => void;
}

/**
 * Formatuje tekst narracyjny z rozpoznawaniem:
 * - Handoutów (wycinki prasowe, listy, telegramy)
 * - Dialogów NPC (cytaty)
 * - Sekcji mechanicznych (rzuty, testy)
 * - Tagów ilustracji (usuwane)
 *
 * IND-144 (sesja 129): splittnięty z 627-lin pliku na 9 sub-modułów <200 lin.
 * Pattern barrel re-export (NarrativeFormatter.tsx) dla path stability w 4 callerach.
 */
export function NarrativeFormatter({
  content,
  className = '',
  playerColors,
  onImageClick,
}: NarrativeFormatterProps) {
  // IND-145 B8: useMemo eliminuje per-render re-parse 50 wiadomości × 30+ regex
  const formattedContent = useMemo(
    () => formatNarrative(content, playerColors, onImageClick),
    [content, playerColors, onImageClick]
  );

  return (
    <div className={`narrative-content ${className}`}>{formattedContent}</div>
  );
}

export type { Section, SectionType, HandoutType } from './types';
export default NarrativeFormatter;
