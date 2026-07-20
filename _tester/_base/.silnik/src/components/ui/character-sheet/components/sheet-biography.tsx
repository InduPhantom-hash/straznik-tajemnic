'use client';

/**
 * CharacterSheet - SheetBiography komponent (re-skin Dark Art Déco, makieta 04).
 *
 * Sekcja 8 BIOGRAFIA I TŁO FABULARNE: panel pergaminowy déco (narożniki +
 * proza Cormorant). Pola conditional render. Placeholder gdy brak danych.
 */

import type { Character } from '@/lib/types';
import { Badge } from '../../badge';

export interface SheetBiographyProps {
  character: Character;
}

/**
 * Defensywne spłaszczenie do tekstu. Stare zapisy mogą mieć pola string
 * (significantPerson itp.) zapisane jako obiekt/tablica od AI - render takiej
 * wartości jako dziecko JSX rzuca React #31. Tu zamieniamy na czytelny tekst.
 */
function asText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join('; ');
  if (typeof value === 'object')
    return Object.values(value as Record<string, unknown>)
      .map(asText)
      .filter(Boolean)
      .join(', ');
  return '';
}

/** Pojedyncze pole biograficzne jako kafel déco (label + treść). */
function BioField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-brass/20 bg-[#16130f] p-3">
      <span className="font-special-elite text-[14px] text-brass/80 tracking-[0.12em] uppercase block mb-1.5">
        {label}
      </span>
      <p className="font-serif text-foreground text-base leading-relaxed">
        {children}
      </p>
    </div>
  );
}

/**
 * Renderuje biografię i tło fabularne postaci. Każda sub-sekcja conditional
 * render zależnie od posiadanych pól. Placeholder gdy brak danych.
 */
export function SheetBiography({ character }: SheetBiographyProps) {
  return (
    <div>
      <h3 className="font-display uppercase tracking-[0.24em] text-brass text-xs font-semibold mb-4">
        Biografia
      </h3>
      <div className="space-y-3">
        {/* Koncept postaci (highlight) */}
        {character.characterConcept && (
          <div className="border border-primary/30 bg-[#0e1413] p-4">
            <span className="font-special-elite text-[14px] text-primary tracking-[0.12em] uppercase block mb-1.5">
              🎭 Biografia Postaci
            </span>
            <p className="font-serif text-foreground text-base leading-relaxed">
              {character.characterConcept}
            </p>
          </div>
        )}

        {/* Grid z podstawowymi informacjami */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {character.birthplace && (
            <BioField label="🏠 Miejsce urodzenia">
              {character.birthplace}
            </BioField>
          )}
          {character.description && (
            <BioField label="👤 Wygląd">{character.description}</BioField>
          )}
          {character.ideology && (
            <BioField label="💭 Ideologia / Przekonania">
              {character.ideology}
            </BioField>
          )}
          {character.significantPerson && (
            <BioField label="👥 Ważna osoba">
              {asText(character.significantPerson)}
            </BioField>
          )}
          {character.meaningfulLocation && (
            <BioField label="📍 Znaczące miejsce">
              {asText(character.meaningfulLocation)}
            </BioField>
          )}
          {character.treasuredPossession && (
            <BioField label="💎 Cenny przedmiot">
              {asText(character.treasuredPossession)}
            </BioField>
          )}
        </div>

        {/* Cechy charakteru */}
        {character.traits && character.traits.length > 0 && (
          <div className="border border-brass/20 bg-[#16130f] p-3">
            <span className="font-special-elite text-[14px] text-brass/80 tracking-[0.12em] uppercase block mb-2">
              ✨ Cechy charakteru
            </span>
            <div className="flex flex-wrap gap-2">
              {character.traits.map((trait, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="text-xs border-brass/35 text-foreground bg-[#1a160f]"
                >
                  {trait}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Kluczowa więź / Historia */}
        {character.backstory && (
          <div className="relative border border-brass/20 bg-[#16130f] p-5">
            <span className="pointer-events-none absolute top-1.5 left-1.5 w-3 h-3 border-t border-l border-brass/50" />
            <span className="pointer-events-none absolute bottom-1.5 right-1.5 w-3 h-3 border-b border-r border-brass/50" />
            <span className="font-special-elite text-[14px] text-brass/80 tracking-[0.12em] uppercase block mb-2">
              ⭐ Kluczowa więź
            </span>
            <p className="font-serif text-foreground text-base leading-relaxed whitespace-pre-line">
              {character.backstory}
            </p>
          </div>
        )}

        {/* Fallback: background jeśli brak dedykowanych pól */}
        {!character.backstory &&
          !character.description &&
          character.background && (
            <div className="relative border border-brass/20 bg-[#16130f] p-5">
              <span className="pointer-events-none absolute top-1.5 left-1.5 w-3 h-3 border-t border-l border-brass/50" />
              <span className="pointer-events-none absolute bottom-1.5 right-1.5 w-3 h-3 border-b border-r border-brass/50" />
              <span className="font-special-elite text-[14px] text-brass/80 tracking-[0.12em] uppercase block mb-2">
                📜 Tło Postaci
              </span>
              <p className="font-serif text-foreground text-base leading-relaxed whitespace-pre-line">
                {character.background}
              </p>
            </div>
          )}

        {/* Notatki gracza */}
        {character.notes && (
          <div className="border border-brass/20 bg-[#16130f] p-4">
            <span className="font-special-elite text-[14px] text-brass/80 tracking-[0.12em] uppercase block mb-2">
              📝 Notatki gracza
            </span>
            <p className="font-serif text-muted-foreground italic text-base leading-relaxed whitespace-pre-line">
              {character.notes}
            </p>
          </div>
        )}

        {/* Placeholder jeśli brak danych */}
        {!character.characterConcept &&
          !character.backstory &&
          !character.background &&
          !character.description &&
          !character.birthplace &&
          !character.ideology && (
            <div className="border border-dashed border-brass/30 bg-[#16130f]/50 p-4 text-center">
              <span className="font-serif italic text-muted-foreground text-sm">
                Brak biografii. Dodaj w kreatorze postaci lub edytorze.
              </span>
            </div>
          )}
      </div>
    </div>
  );
}
