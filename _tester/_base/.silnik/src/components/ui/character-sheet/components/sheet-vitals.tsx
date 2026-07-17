'use client';

/**
 * CharacterSheet - SheetVitals komponent (re-skin Dark Art Déco, makieta 04).
 *
 * Sekcje karty postaci w prawej kolumnie:
 * - Sekcja 2 CECHY - grid 4× StatCard (str/con/siz/dex/app/int/pow/edu), kafle déco
 * - Sekcja 4 WALKA - 3 kafle déco (Bonus DMG / Krzepa / Ruch)
 *
 * Stan (PŻ/PR/PM) przeniesiony do StatBars (lewa kolumna) - patrz orchestrator.
 * Najwyższa cecha wyróżniona emerald (highlight per makieta 04).
 */

import { HelpIcon } from '../../tooltip';
import { SECTION_HELP } from '../types';
import { StatCard } from './stat-card';

export interface SheetVitalsProps {
  stats: {
    str: number;
    con: number;
    siz: number;
    dex: number;
    app: number;
    int: number;
    pow: number;
    edu: number;
  };
  damageBonus: string;
  build: number;
  move: number;
}

/** Nagłówek sekcji déco (Cinzel uppercase + tracking + brass). */
function SectionTitle({
  children,
  help,
}: {
  children: React.ReactNode;
  help?: string;
}) {
  return (
    <h3 className="font-display uppercase tracking-[0.24em] text-brass text-xs font-semibold mb-4 flex items-center gap-1.5">
      {children}
      {help && <HelpIcon content={help} position="right" />}
    </h3>
  );
}

/**
 * Renderuje sekcje 2 (Cechy) + 4 (Walka) prawej kolumny. Najwyższa cecha
 * wyróżniona emerald (highlight). Kafle déco - StatCard sub-komponent.
 */
export function SheetVitals({
  stats,
  damageBonus,
  build,
  move,
}: SheetVitalsProps) {
  const entries = Object.entries(stats) as [string, number][];
  const maxValue = entries.reduce((m, [, v]) => Math.max(m, v), 0);
  // Wyróżnij pierwszą cechę osiągającą maksimum (déco highlight emerald)
  const highlightKey = entries.find(([, v]) => v === maxValue)?.[0];

  return (
    <>
      {/* === SEKCJA 2: CECHY === */}
      <div>
        <SectionTitle>Cechy</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {entries.map(([key, value]) => (
            <StatCard
              key={key}
              statKey={key}
              value={value}
              highlighted={key === highlightKey}
            />
          ))}
        </div>
      </div>

      {/* === SEKCJA 4: WALKA === */}
      <div>
        <SectionTitle help={SECTION_HELP.walka}>Walka</SectionTitle>
        <div className="grid grid-cols-3 gap-3">
          <div className="border border-brass/28 bg-[#16130f] p-3 text-center">
            <div className="font-special-elite text-xs text-muted-foreground tracking-[0.1em] uppercase">
              Bonus DMG
            </div>
            <div className="font-display font-bold text-2xl text-foreground mt-1">
              {damageBonus}
            </div>
          </div>
          <div className="border border-brass/28 bg-[#16130f] p-3 text-center">
            <div className="font-special-elite text-xs text-muted-foreground tracking-[0.1em] uppercase">
              Krzepa
            </div>
            <div className="font-display font-bold text-2xl text-foreground mt-1">
              {build >= 0 ? `+${build}` : build}
            </div>
          </div>
          <div className="border border-brass/28 bg-[#16130f] p-3 text-center">
            <div className="font-special-elite text-xs text-muted-foreground tracking-[0.1em] uppercase">
              Ruch
            </div>
            <div className="font-display font-bold text-2xl text-foreground mt-1">
              {move}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
