/**
 * Obliczenie puli punktów zawodowych według formuły zawodu CoC 7e.
 *
 * IND-123 (sesja 90) — wyodrębnione z character-wizard.tsx Faza 2.
 */

import { type CharacterStats, OCCUPATIONS } from '@/lib/data/character';

export function calculateOccupationPoints(
  occupationId: string,
  stats: CharacterStats
): number {
  const occ = OCCUPATIONS.find((o) => o.id === occupationId);
  if (!occ) return 0;
  // Uproszczona implementacja - używamy głównej formuły
  if (occ.formula.includes('WYK × 4')) return stats.edu * 4;
  if (occ.formula.includes('WYK × 2')) {
    const edu2 = stats.edu * 2;
    // Bierzemy najlepszą alternatywę
    const alternatives = [
      stats.pow * 2,
      stats.dex * 2,
      stats.str * 2,
      stats.app * 2,
    ];
    return edu2 + Math.max(...alternatives);
  }
  return stats.edu * 4; // fallback
}
