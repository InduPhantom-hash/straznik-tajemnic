/**
 * Obliczenie puli punktów zawodowych według formuły zawodu CoC 7e.
 *
 * IND-123 (sesja 90) - wyodrębnione z character-wizard.tsx Faza 2.
 */

import { type CharacterStats, OCCUPATIONS } from '@/lib/data/character';

export function calculateOccupationPoints(
  occupationId: string,
  stats: CharacterStats
): number {
  const occ = OCCUPATIONS.find(
    (o) => o.id === occupationId || o.name === occupationId
  );
  if (!occ) return stats.edu * 4;
  if (occ.formula.includes('WYK × 4')) return stats.edu * 4;

  const statValues: Record<string, number> = {
    MOC: stats.pow,
    SW: stats.pow,
    ZR: stats.dex,
    S: stats.str,
    SIŁ: stats.str,
    WYG: stats.app,
    APP: stats.app,
    INT: stats.int,
    BC: stats.siz,
    BUD: stats.siz,
    KON: stats.con,
  };

  const matches = [
    ...occ.formula.matchAll(/\b(MOC|SW|ZR|S|SIŁ|WYG|APP|INT|BC|BUD|KON)\b/g),
  ];
  if (matches.length > 0) {
    const candidateValues = matches.map((m) => statValues[m[1]] ?? 0);
    const maxVal = Math.max(...candidateValues);
    return stats.edu * 2 + maxVal * 2;
  }

  return stats.edu * 4; // fallback
}
