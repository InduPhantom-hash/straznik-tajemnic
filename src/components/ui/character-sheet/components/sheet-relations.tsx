'use client';

/**
 * CharacterSheet - SheetRelations komponent (re-skin Dark Art Déco, makieta 04).
 *
 * Sekcja 6 RELACJE (lewa kolumna):
 * - Ważne osoby (kafel déco: monogram/awatar + imię Cormorant + relacja/status)
 * - Znaczące miejsca (typed badges)
 * - Cechy ogólne (traits[])
 * - Cechy psychologiczne (fobie + manie + przekonania + sekrety)
 *
 * Conditional render - gdy żadne pole nie ma wartości, zwraca null.
 */

import type { Character } from '@/lib/types';
import { Badge } from '../../badge';

export interface SheetRelationsProps {
  character: Character;
}

/** Inicjały z imienia (monogram awatara). */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Nagłówek sekcji déco. */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-display uppercase tracking-[0.24em] text-brass text-xs font-semibold mb-3">
      {children}
    </h3>
  );
}

/**
 * Renderuje relacje + cechy psychologiczne. Zwraca null gdy żadne z pól nie ma
 * wartości (ukrywa pustą sekcję).
 */
export function SheetRelations({ character }: SheetRelationsProps) {
  const hasContent =
    character.importantPeople?.length ||
    character.significantPlaces?.length ||
    character.valuableItems?.length ||
    character.characterTraits;

  if (!hasContent) return null;

  return (
    <div className="space-y-5">
      {/* Ważne osoby - kafle déco z monogramem */}
      {character.importantPeople && character.importantPeople.length > 0 && (
        <div>
          <SectionTitle>Relacje</SectionTitle>
          <div className="flex flex-col gap-2.5">
            {character.importantPeople.map((person) => {
              const statusColor =
                person.status === 'dead'
                  ? 'text-[#d9685f]'
                  : person.status === 'missing'
                    ? 'text-brass'
                    : 'text-primary';
              const monoBorder =
                person.status === 'dead'
                  ? 'border-[#b3322c]/40'
                  : 'border-brass/40';
              return (
                <div
                  key={person.id}
                  className="flex gap-3 items-center border border-brass/18 bg-[#16130f] p-2.5"
                >
                  <div
                    className={`w-9 h-9 flex-none border ${monoBorder} flex items-center justify-center overflow-hidden`}
                  >
                    {person.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={person.avatarUrl}
                        alt={person.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="font-display text-xs text-brass">
                        {initials(person.name)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-serif text-base text-foreground truncate">
                      {person.name}
                    </div>
                    <div
                      className={`font-special-elite text-[13px] tracking-[0.1em] uppercase ${statusColor}`}
                    >
                      {person.relationship}
                      {person.status === 'dead'
                        ? ' · zmarły'
                        : person.status === 'missing'
                          ? ' · zaginiony'
                          : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Znaczące miejsca */}
      {character.significantPlaces &&
        character.significantPlaces.length > 0 && (
          <div>
            <SectionTitle>Znaczące Miejsca</SectionTitle>
            <div className="flex flex-wrap gap-1.5">
              {character.significantPlaces.map((place) => (
                <Badge
                  key={place.id}
                  variant="outline"
                  className="bg-[#16130f] border-brass/25 text-foreground text-xs py-0.5"
                >
                  {place.type === 'birthplace'
                    ? '🏠'
                    : place.type === 'trauma'
                      ? '💔'
                      : place.type === 'work'
                        ? '💼'
                        : '📍'}{' '}
                  {place.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

      {/* Cechy ogólne */}
      {character.traits && character.traits.length > 0 && (
        <div>
          <SectionTitle>Cechy</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {character.traits.map((trait, i) => (
              <Badge
                key={i}
                variant="outline"
                className="bg-[#16130f] border-brass/25 text-foreground text-xs py-0.5"
              >
                {trait}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Cechy psychologiczne (fobie, manie, przekonania, sekrety) */}
      {character.characterTraits && (
        <div className="border border-[#b3322c]/25 bg-[#1a0f0d]/40 p-3">
          <span className="font-special-elite text-[14px] text-[#d9685f] tracking-[0.12em] uppercase block mb-2">
            Cechy Psychologiczne
          </span>
          <div className="grid grid-cols-1 gap-2 text-xs">
            {character.characterTraits.phobias?.length > 0 && (
              <div>
                <span className="text-[#d9685f]">😱 Fobie:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {character.characterTraits.phobias.map((p, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="text-xs py-0 border-[#b3322c]/50 text-[#d9685f]"
                    >
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {character.characterTraits.manias?.length > 0 && (
              <div>
                <span className="text-orange-400">🔥 Manie:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {character.characterTraits.manias.map((m, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="text-xs py-0 border-orange-500/50 text-orange-300"
                    >
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {character.characterTraits.beliefs?.length > 0 && (
              <div>
                <span className="text-primary">💫 Przekonania:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {character.characterTraits.beliefs.map((b, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="text-xs py-0 border-primary/50 text-primary"
                    >
                      {b}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {character.characterTraits.secrets?.length > 0 && (
              <div>
                <span className="text-muted-foreground">🤫 Sekrety:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {character.characterTraits.secrets.map((s, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="text-xs py-0 border-brass/30 text-muted-foreground"
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
