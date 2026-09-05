'use client';

import { SafeImage } from '@/components/ui/safe-image';
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
import { Button } from '../../button';
import { Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';

export interface SheetRelationsProps {
  character: Character;
  onOpenTherapy?: () => void;
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
export function SheetRelations({ character, onOpenTherapy }: SheetRelationsProps) {
  const t = useTranslations('CharacterSheet');
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
          <div className="flex items-center justify-between mb-3">
            <SectionTitle>{t('relations')}</SectionTitle>
            {onOpenTherapy && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenTherapy}
                className="h-6 px-2 text-[10px] font-display uppercase tracking-widest text-brass border-brass/35 bg-brass/[0.04] hover:bg-brass/15 rounded-none"
              >
                <Heart className="w-3 h-3 mr-1 text-brass" />
                {t('openTherapyBtn')}
              </Button>
            )}
          </div>
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
                  className={`flex gap-3 items-center border p-2.5 transition-colors ${
                    person.lost
                      ? 'border-red-900/30 bg-[#16130f]/60 opacity-60'
                      : person.damaged
                        ? 'border-amber-700/40 bg-[#1a140e]'
                        : 'border-brass/18 bg-[#16130f]'
                  }`}
                >
                  <div
                    className={`w-9 h-9 flex-none border ${monoBorder} flex items-center justify-center overflow-hidden`}
                  >
                    {person.avatarUrl ? (
                      <SafeImage
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
                  <div className="min-w-0 flex-1">
                    <div className="font-serif text-base text-foreground truncate flex items-center gap-1.5">
                      <span>{person.name}</span>
                      {person.isKeyConnection && (
                        <span className="text-[9px] px-1 py-0.2 bg-gold/15 text-gold border border-gold/40 font-special-elite uppercase">
                          {t('keyAnchorBadge')}
                        </span>
                      )}
                    </div>
                    <div
                      className={`font-special-elite text-[13px] tracking-[0.1em] uppercase ${statusColor} flex items-center gap-1.5 flex-wrap`}
                    >
                      <span>{person.relationship}</span>
                      {person.status === 'dead'
                        ? ` · ${t('dead')}`
                        : person.status === 'missing'
                          ? ` · ${t('missing')}`
                          : ''}
                      {person.damaged && (
                        <span className="text-amber-400 text-[10px] normal-case border border-amber-500/30 px-1 bg-amber-950/20">
                          {t('damagedRelation')}
                        </span>
                      )}
                      {person.lost && (
                        <span className="text-red-400 text-[10px] normal-case border border-red-500/30 px-1 bg-red-950/20">
                          {t('lostRelation')}
                        </span>
                      )}
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
            <SectionTitle>{t('meaningfulLocations')}</SectionTitle>
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
          <SectionTitle>{t('traits')}</SectionTitle>
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
            {t('psychologicalTraits')}
          </span>
          <div className="grid grid-cols-1 gap-2 text-xs">
            {character.characterTraits.phobias?.length > 0 && (
              <div>
                <span className="text-[#d9685f]">😱 {t('phobias')}:</span>
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
                <span className="text-orange-400">🔥 {t('manias')}:</span>
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
                <span className="text-primary">💫 {t('beliefs')}:</span>
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
                <span className="text-muted-foreground">🤫 {t('secrets')}:</span>
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
