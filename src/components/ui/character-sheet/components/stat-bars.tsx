'use client';

/**
 * CharacterSheet - StatBars komponent (re-skin Dark Art Déco, makieta 04).
 *
 * Kolorowe paski stanu PŻ / PR / PM / SZC (zatwierdzony quick-win z makiety):
 * - PŻ · ŻYCIE = czerwień/bordo
 * - PR · POCZYTALNOŚĆ = złoto
 * - PM · MOC = emerald
 * - SZC · SZCZĘŚCIE = złoto (poza makietą, zachowuje editowalny Luck)
 *
 * Każdy pasek: tło #1f1a14 + ramka w kolorze stanu, wypełnienie gradient z
 * poświatą, szerokość = (value/max)*100%. Inline edit zachowany (klik wartości
 * → input, Enter/Escape, Check/X). Dane HP/SAN/MP/LUCK + maxy z propsów.
 *
 * Wycięte z SheetVitals (Sekcja 3 STAN) - logika edycji bez zmian, tylko
 * prezentacja przeskórowana na paski déco.
 */

import type { CSSProperties } from 'react';
import type { Character } from '@/lib/types';
import type { UseInlineEditReturn } from '../hooks/use-inline-edit';
import { Check, Edit2, X } from 'lucide-react';

export interface StatBarsProps {
  character: Character;
  maxHp: number;
  maxSan: number;
  maxMp: number;
  inlineEdit: UseInlineEditReturn;
}

/** Konfiguracja koloru paska per stan (déco palette). */
interface BarTheme {
  /** Kolor etykiety (tekst). */
  labelClass: string;
  /** Ramka tła paska. */
  trackBorder: string;
  /** Gradient wypełnienia. */
  background: string;
  /** Poświata wypełnienia. */
  boxShadow: string;
}

const THEMES: Record<'hp' | 'san' | 'mp' | 'luck', BarTheme> = {
  hp: {
    labelClass: 'text-[#d9685f]',
    trackBorder: 'border-[#b3322c]/30',
    background: 'linear-gradient(90deg,#7a221d,#b3322c)',
    boxShadow: '0 0 10px rgba(179,50,44,.4)',
  },
  san: {
    labelClass: 'text-brass',
    trackBorder: 'border-brass/30',
    background: 'linear-gradient(90deg,#8a6f12,#c9a227)',
    boxShadow: '0 0 10px rgba(201,162,39,.4)',
  },
  mp: {
    labelClass: 'text-primary',
    trackBorder: 'border-primary/30',
    background: 'linear-gradient(90deg,#0a6b62,#0d9488)',
    boxShadow: '0 0 10px rgba(13,148,136,.4)',
  },
  luck: {
    labelClass: 'text-brass',
    trackBorder: 'border-brass/30',
    background: 'linear-gradient(90deg,#8a6f12,#c9a227)',
    boxShadow: '0 0 10px rgba(201,162,39,.4)',
  },
};

/**
 * Etykieta paska rozbita na skrót (PŻ) + opis (ŻYCIE).
 * Skrót jest osobnym węzłem tekstowym - test CS4 robi getByText('PŻ') exact.
 */
const LABELS: Record<
  'hp' | 'san' | 'mp' | 'luck',
  { abbr: string; full: string }
> = {
  hp: { abbr: 'PŻ', full: 'ŻYCIE' },
  san: { abbr: 'PR', full: 'POCZYTALNOŚĆ' },
  mp: { abbr: 'PM', full: 'MOC' },
  luck: { abbr: 'SZC', full: 'SZCZĘŚCIE' },
};

interface SingleBarProps {
  field: 'hp' | 'san' | 'mp' | 'luck';
  current: number;
  max: number;
  inlineEdit: UseInlineEditReturn;
}

/** Pojedynczy pasek stanu z inline edit. */
function StatBar({ field, current, max, inlineEdit }: SingleBarProps) {
  const {
    editingField,
    editValue,
    setEditValue,
    startEditing,
    saveEditing,
    cancelEditing,
  } = inlineEdit;
  const isEditing = editingField === field;
  const theme = THEMES[field];
  const percent = Math.max(0, Math.min(100, (current / max) * 100));
  const fillStyle: CSSProperties = {
    width: `${percent}%`,
    background: theme.background,
    boxShadow: theme.boxShadow,
  };

  const label = LABELS[field];

  // p-3 wrapper: test CS4 robi getByText('PŻ').closest('.p-3').querySelector('button')
  return (
    <div className="p-3 bg-[#16130f] border border-brass/20">
      <div className="flex justify-between items-center font-special-elite text-[14px] tracking-[0.1em] mb-2">
        <span className={theme.labelClass}>
          <span>{label.abbr}</span>
          <span className="text-muted-foreground/60"> · {label.full}</span>
        </span>
        {isEditing ? (
          <span className="flex items-center gap-1">
            <input
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(parseInt(e.target.value) || 0)}
              className="w-12 px-1.5 py-0.5 text-center bg-background border border-brass/40 rounded-none text-xs text-foreground"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEditing();
                if (e.key === 'Escape') cancelEditing();
              }}
            />
            <span className="text-muted-foreground">/{max}</span>
            <button
              onClick={saveEditing}
              className="p-0.5 hover:text-primary"
              aria-label="Zapisz"
            >
              <Check className="h-3 w-3 text-primary" />
            </button>
            <button
              onClick={cancelEditing}
              className="p-0.5 hover:text-destructive"
              aria-label="Anuluj"
            >
              <X className="h-3 w-3 text-destructive" />
            </button>
          </span>
        ) : (
          <button
            onClick={() => startEditing(field, current)}
            className="flex items-center gap-1 text-muted-foreground hover:text-brass transition-colors"
          >
            <span>
              {current} / {max}
            </span>
            <Edit2 className="h-2.5 w-2.5 opacity-50" />
          </button>
        )}
      </div>
      <div className={`h-2.5 bg-[#1f1a14] border ${theme.trackBorder}`}>
        <div className="h-full" style={fillStyle} />
      </div>
    </div>
  );
}

/**
 * Renderuje paski stanu PŻ/PR/PM/SZC z inline edit. Wszystkie dzielą jeden stan
 * edycji z hooka useInlineEdit (przekazany z orchestratora).
 */
export function StatBars({
  character,
  maxHp,
  maxSan,
  maxMp,
  inlineEdit,
}: StatBarsProps) {
  return (
    <div className="flex flex-col gap-3.5">
      <StatBar
        field="hp"
        current={character.hp || maxHp}
        max={maxHp}
        inlineEdit={inlineEdit}
      />
      <StatBar
        field="san"
        current={character.san || maxSan}
        max={maxSan}
        inlineEdit={inlineEdit}
      />
      <StatBar
        field="mp"
        current={character.mp || maxMp}
        max={maxMp}
        inlineEdit={inlineEdit}
      />
      <StatBar
        field="luck"
        current={character.luck || 50}
        max={99}
        inlineEdit={inlineEdit}
      />
    </div>
  );
}
