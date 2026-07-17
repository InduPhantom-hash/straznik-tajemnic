// Pure function - kalkulacja cech pochodnych NPC z bazowych statystyk CoC7.
// hp = (con + siz) / 10, san = pow, mp = pow / 5.
// Defaults: każdy brak pola = 50 (typowy NPC).

import type { NPC } from '@/lib/types';

export interface DerivedNpcStats {
  hp: number;
  san: number;
  mp: number;
}

export function calculateDerivedStats(npc: Partial<NPC>): DerivedNpcStats {
  const hp = Math.floor(((npc.con || 50) + (npc.siz || 50)) / 10);
  const san = npc.pow || 50;
  const mp = Math.floor((npc.pow || 50) / 5);
  return { hp, san, mp };
}
