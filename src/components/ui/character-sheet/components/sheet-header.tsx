'use client';

/**
 * CharacterSheet - SheetHeader komponent (re-skin Dark Art Déco, makieta 04).
 *
 * Lewa kolumna: portret 3:4 (ukośny raster + złote narożniki + winieta) +
 * imię (Cinzel) / zawód · wiek (Special Elite złoto) / miejsce (Cormorant
 * italic). Klik w portret otwiera lightbox (IND-270 #2).
 *
 * Dane: portraitUrl, name, occupation, age, gender, birthplace/residence.
 */

import { useState } from 'react';
import type { Character } from '@/lib/types';
import { ImageLightbox } from '@/components/ui/image-lightbox';

export interface SheetHeaderProps {
  character: Character;
}

/** Mapowanie gender → label PL. */
function genderLabel(gender: string | undefined): string {
  if (gender === 'male') return 'Mężczyzna';
  if (gender === 'female') return 'Kobieta';
  return '';
}

/** Raster déco (ukośne linie złota) - tło portretu. */
const RASTER_STYLE = {
  background:
    'repeating-linear-gradient(45deg,rgba(201,162,39,.03) 0,rgba(201,162,39,.03) 9px,transparent 9px,transparent 18px)',
};

/** Winieta - cień wewnętrzny portretu. */
const VIGNETTE_STYLE = {
  boxShadow: 'inset 0 0 90px 24px rgba(0,0,0,.7)',
};

/**
 * Nagłówek karty postaci (lewa kolumna): portret 3:4 + info podstawowe.
 * Jeśli `character.portraitUrl` brak → fallback emoji 👤.
 */
export function SheetHeader({ character }: SheetHeaderProps) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const hasPortrait = Boolean(character.portraitUrl);
  const gender = genderLabel(character.gender);
  const place = character.birthplace || character.residence || '';

  return (
    <div>
      {/* Portret 3:4 - klik otwiera lightbox (IND-270 #2) */}
      <div
        onClick={() => hasPortrait && setIsLightboxOpen(true)}
        className={`relative aspect-[3/4] border border-brass/45 bg-gradient-to-b from-[#1a160f] to-[#0c0d0a] flex items-center justify-center overflow-hidden ${
          hasPortrait
            ? 'cursor-pointer hover:border-brass/80 transition-colors'
            : ''
        }`}
      >
        {/* Raster + winieta */}
        <div
          className="pointer-events-none absolute inset-0"
          style={RASTER_STYLE}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={VIGNETTE_STYLE}
        />
        {/* Złote narożniki (TL + BR) */}
        <span className="pointer-events-none absolute top-1.5 left-1.5 w-4 h-4 border-t border-l border-brass" />
        <span className="pointer-events-none absolute bottom-1.5 right-1.5 w-4 h-4 border-b border-r border-brass" />

        {character.portraitUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={character.portraitUrl}
            alt={character.name}
            className="relative w-full h-full object-cover"
          />
        ) : (
          <div className="relative text-center font-special-elite text-muted-foreground/60 text-[14px] tracking-[0.14em]">
            <span className="text-5xl opacity-40 block mb-2">👤</span>[ PORTRET
            ]
          </div>
        )}
      </div>

      {isLightboxOpen && character.portraitUrl && (
        <ImageLightbox
          src={character.portraitUrl}
          alt={character.name}
          onClose={() => setIsLightboxOpen(false)}
        />
      )}

      {/* Imię / zawód · wiek / miejsce */}
      <div className="text-center mt-5">
        <div className="font-display font-bold text-2xl text-foreground tracking-[0.06em] break-words">
          {character.name}
        </div>
        <div className="font-special-elite text-[14px] text-brass tracking-[0.18em] uppercase mt-1.5">
          {character.occupation || '-'}
          {character.age ? ` · lat ${character.age}` : ''}
          {gender ? ` · ${gender}` : ''}
        </div>
        {place && (
          <div className="font-serif italic text-[15px] text-muted-foreground mt-1.5">
            {place}
          </div>
        )}
      </div>
    </div>
  );
}
