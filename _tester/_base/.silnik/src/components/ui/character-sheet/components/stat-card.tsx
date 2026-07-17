'use client';

/**
 * CharacterSheet - StatCard komponent (re-skin Dark Art Déco, makieta 04).
 *
 * Kafel cechy podstawowej CoC 7e (SIŁ/KON/BUD/ZRE/WYG/INT/MOC/WYK).
 * Pokazuje value (Cinzel) + ½/⅕ (emerald, Special Elite) - skill checks 7e.
 * `highlighted` = wyróżniony emerald (najwyższa cecha per makieta 04).
 *
 * STAT_NAMES (z types.ts) mapuje klucz na etykietę PL. STAT_DESCRIPTIONS
 * (lib/data/character) jako tooltip HelpIcon.
 */

import { HelpIcon } from '../../tooltip';
import { STAT_DESCRIPTIONS } from '@/lib/data/character';
import { STAT_NAMES, STAT_FULL_NAMES } from '../types';

export interface StatCardProps {
  /** Klucz cechy (np. 'str', 'con'). */
  statKey: string;
  /** Wartość cechy 0-100. */
  value: number;
  /** Wyróżnienie emerald (najwyższa cecha). */
  highlighted?: boolean;
}

/**
 * Kafel cechy déco z value + ½ + ⅕. Wyróżniony (highlighted) ma ramkę i tło
 * emerald + poświatę.
 */
export function StatCard({
  statKey,
  value,
  highlighted = false,
}: StatCardProps) {
  const half = Math.floor(value / 2);
  const fifth = Math.floor(value / 5);

  return (
    <div
      className={`relative text-center p-3 border ${
        highlighted
          ? 'border-primary/50 bg-[#0e1413] shadow-[0_0_14px_rgba(13,148,136,.18)]'
          : 'border-brass/28 bg-[#16130f]'
      }`}
    >
      <div
        className={`font-display text-sm uppercase tracking-[0.08em] flex items-center justify-center gap-1 ${
          highlighted ? 'text-primary' : 'text-foreground'
        }`}
      >
        {STAT_FULL_NAMES[statKey] ||
          STAT_NAMES[statKey] ||
          statKey.toUpperCase()}
        <HelpIcon content={STAT_DESCRIPTIONS[statKey] || ''} position="top" />
      </div>
      {/* Skrót CoC 7e jako akcent (zachowuje STAT_NAMES - test CS3) */}
      <div className="font-special-elite text-xs uppercase tracking-[0.1em] text-muted-foreground mt-0.5">
        {STAT_NAMES[statKey] || statKey.toUpperCase()}
      </div>
      <div className="font-display font-bold text-3xl text-foreground leading-tight mt-0.5">
        {value}
      </div>
      <div className="font-special-elite text-xs text-primary mt-1">
        {half} / {fifth}
      </div>
    </div>
  );
}
