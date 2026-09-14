'use client';

/**
 * @file combat-card.tsx
 * Alias / re-export dla OpposedMeleeCard (CoC 7e RAW s. 102-117 BMG).
 * Zachowuje pełną kompatybilność wsteczną dla istniejących importów CombatCard.
 */

export { OpposedMeleeCard, OpposedMeleeCard as CombatCard } from './opposed-melee-card';
export type { OpposedMeleeCardProps, OpposedMeleeCardProps as CombatCardProps } from './opposed-melee-card';
export { default } from './opposed-melee-card';
