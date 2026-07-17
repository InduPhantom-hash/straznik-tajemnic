'use client';

/**
 * CharacterSheet - orchestrator (IND-185 M12, sesja 132).
 * Re-skin Dark Art Déco (makieta 04-karta-postaci): panel złoto-pergaminowy,
 * układ 2-kolumnowy (lewa: portret + paski stanu + relacje; prawa: cechy +
 * umiejętności + ekwipunek + biografia).
 *
 * Komponent dialogu Karta Postaci CoC 7e. Komponuje:
 * - DialogHeader z character selector dropdown + Eksport MD button
 * - SheetHeader (Sekcja 1: portret + info podstawowe) - lewa kolumna
 * - StatBars (paski stanu PŻ/PR/PM, inline edit) - lewa kolumna
 * - SheetRelations (Sekcja 6: Relacje, conditional) - lewa kolumna
 * - SheetVitals (Sekcje 2+4: Cechy + Walka) - prawa kolumna
 * - SheetSkills (Sekcja 5: Umiejętności CoC 7e) - prawa kolumna
 * - SheetEquipment (Sekcja 7: Broń + wyposażenie) - prawa kolumna
 * - SheetBiography (Sekcja 8: Biografia i tło fabularne) - prawa kolumna
 *
 * Hook useInlineEdit zarządza stanem edycji HP/SAN/MP/LUCK (delegate do
 * StatBars). exportCharacterToMarkdown - pure helper (Markdown +
 * Blob.download).
 */

import { useCallback, useEffect, useState } from 'react';
import { hydrateCharacterImages } from '@/lib/character-image-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../dialog';
import { Button } from '../button';
import { Download } from 'lucide-react';
import { type CharacterSheetProps } from './types';
import { exportCharacterToMarkdown } from './utils/export-markdown';
import { deriveStats } from './utils/derive-stats';
import { useInlineEdit } from './hooks/use-inline-edit';
import { SheetHeader } from './components/sheet-header';
import { StatBars } from './components/stat-bars';
import { SheetVitals } from './components/sheet-vitals';
import { SheetSkills } from './components/sheet-skills';
import { SheetRelations } from './components/sheet-relations';
import { SheetEquipment } from './components/sheet-equipment';
import { SheetBiography } from './components/sheet-biography';

/** Separator déco - gradient-linie + obrócone romby (wzorzec _KONWENCJE). */
function DecoSeparator({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-4 mb-7">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gold" />
      <span className="w-2 h-2 bg-brass rotate-45" />
      <span className="w-1.5 h-1.5 border border-brass rotate-45" />
      <span className="w-2 h-2 bg-brass rotate-45" />
      <h2 className="font-display-decorative font-black text-2xl md:text-3xl uppercase tracking-[0.12em] text-foreground whitespace-nowrap px-2">
        {title}
      </h2>
      <span className="w-2 h-2 bg-brass rotate-45" />
      <span className="w-1.5 h-1.5 border border-brass rotate-45" />
      <span className="w-2 h-2 bg-brass rotate-45" />
      <div className="flex-1 h-px bg-gradient-to-r from-gold to-transparent" />
    </div>
  );
}

export function CharacterSheet({
  open,
  onOpenChange,
  character,
  onCharacterUpdate,
  characters = [],
  onCharacterChange,
}: CharacterSheetProps) {
  const inlineEdit = useInlineEdit(character, onCharacterUpdate);

  // Portret + miniatury ekwipunku są offloadowane do IndexedDB (IND-262/271),
  // więc `character.portraitUrl` / `item.imageUrl` bywają puste (widoczne tylko
  // na głównej, która ma własny fallback). Hydratujemy KOPIĘ do wyświetlenia z
  // IndexedDB - inlineEdit/eksport zostają na oryginalnym `character`.
  const [displayCharacter, setDisplayCharacter] = useState(character);
  useEffect(() => {
    setDisplayCharacter(character);
    if (!character?.id) return;
    let cancelled = false;
    hydrateCharacterImages([character]).then((arr) => {
      if (!cancelled && arr[0]) setDisplayCharacter(arr[0]);
    });
    return () => {
      cancelled = true;
    };
  }, [character]);

  // FEATURE:#5 - Eksport karty postaci do Markdown
  // FEATURE:#10 - Przełączanie postaci (character selector dropdown)
  // FEATURE:#12 - Ikony pomocy przy statystykach (via HelpIcon w sub-komponentach)
  const handleExportMarkdown = useCallback(() => {
    if (!character) return;
    exportCharacterToMarkdown(character);
  }, [character]);

  if (!character) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="wide">
          <DialogHeader>
            <DialogTitle>Karta Postaci</DialogTitle>
            <DialogDescription className="sr-only">
              Pełna karta badacza Call of Cthulhu.
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-12 text-muted-foreground font-serif italic">
            Wybierz postać, aby zobaczyć kartę.
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Kopia do wyświetlenia (z portretem/ekwipunkiem dociągniętym z IndexedDB).
  const display = displayCharacter ?? character;
  const { stats, maxHp, maxSan, maxMp, move, damageBonus, build } =
    deriveStats(display);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="screen"
        className="print:block print:h-auto print:max-h-none print:w-auto print:overflow-visible print:rounded-none"
      >
        {/* Nagłówek z przyciskami */}
        <DialogHeader className="flex flex-row items-center justify-between print:hidden">
          <DialogTitle className="font-display uppercase tracking-[0.16em] text-brass text-base">
            📜 Karta Postaci
          </DialogTitle>
          {/* IND-235 a11y: opis dla czytników ekranu (aria-describedby) */}
          <DialogDescription className="sr-only">
            Cechy, umiejętności, stan i biografia badacza.
          </DialogDescription>
          <div className="flex items-center gap-2">
            {/* Character selector dropdown */}
            {characters.length > 1 && onCharacterChange && (
              <select
                value={character?.id || ''}
                onChange={(e) => {
                  const selected = characters.find(
                    (c) => c.id === e.target.value
                  );
                  if (selected) onCharacterChange(selected);
                }}
                className="appearance-none bg-card border border-brass/40 rounded-none px-3 py-1.5 pr-8 text-sm text-foreground cursor-pointer hover:border-brass/70 transition-colors focus:outline-none focus:ring-1 focus:ring-brass/50 font-special-elite"
              >
                {characters.map((char) => (
                  <option key={char.id} value={char.id}>
                    {char.name}
                  </option>
                ))}
              </select>
            )}
            <Button variant="outline" size="sm" onClick={handleExportMarkdown}>
              <Download className="h-4 w-4 mr-2" />
              Eksport MD
            </Button>
          </div>
        </DialogHeader>

        {/* === KARTA POSTACI - panel déco === */}
        <div className="relative bg-gradient-to-br from-[#14110c] to-[#0a0c0f] border border-brass/30 p-6 md:p-10 shadow-[0_30px_90px_rgba(0,0,0,.6)]">
          {/* Narożniki déco (4 rogi panelu) */}
          <span className="pointer-events-none absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-brass/60" />
          <span className="pointer-events-none absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-brass/60" />
          <span className="pointer-events-none absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-brass/60" />
          <span className="pointer-events-none absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-brass/60" />

          {/* Nagłówek dokumentu (akta śledcze) */}
          <div className="flex justify-between items-start mb-2 font-special-elite text-[14px] text-muted-foreground/70 uppercase tracking-[0.24em]">
            <span>Akta śledcze · Strażnik Tajemnic</span>
            <span>CoC 7e</span>
          </div>

          {/* Tytuł + separator déco */}
          <DecoSeparator title="Karta Badacza" />

          {/* Układ 2-kolumnowy: 300px portret / reszta */}
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 lg:gap-10">
            {/* === KOLUMNA LEWA === */}
            <div className="space-y-6">
              {/* SEKCJA 1: PORTRET + INFO PODSTAWOWE */}
              <SheetHeader character={display} />

              {/* PASKI STANU PŻ / PR / PM (inline edit) */}
              <StatBars
                character={display}
                maxHp={maxHp}
                maxSan={maxSan}
                maxMp={maxMp}
                inlineEdit={inlineEdit}
              />

              {/* SEKCJA 6: RELACJE I CECHY PSYCHOLOGICZNE (conditional) */}
              <SheetRelations character={display} />
            </div>

            {/* === KOLUMNA PRAWA === */}
            <div className="space-y-8">
              {/* SEKCJE 2+4: CECHY + WALKA */}
              <SheetVitals
                stats={stats}
                damageBonus={damageBonus}
                build={build}
                move={move}
              />

              {/* SEKCJA 5: UMIEJĘTNOŚCI */}
              <SheetSkills character={display} />

              {/* SEKCJA 7: EKWIPUNEK (broń z pełną statystyką + wyposażenie) */}
              <SheetEquipment character={display} />

              {/* SEKCJA 8: BIOGRAFIA */}
              <SheetBiography character={display} />
            </div>
          </div>
        </div>

        {/* Print styles */}
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            [role='dialog'],
            [role='dialog'] * {
              visibility: visible;
            }
            [role='dialog'] {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .print\\:hidden {
              display: none !important;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
