'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { Button } from './button';
import type { AdventureContext } from '@/lib/adventures-data';
import {
  TONE_STYLES,
  ERA_STYLES,
  DIFFICULTY_STYLES,
  type AdventureStyleEntry,
} from '@/lib/data/adventure-styles';

interface AdventureDetailsModalProps {
  adventure: AdventureContext | null;
  open: boolean;
  onClose: () => void;
  /** Wybór tej przygody (zaznacza ją na liście) i zamknięcie modala. */
  onChoose: (adventure: AdventureContext) => void;
}

/** Pojedynczy wiersz objaśnienia znacznika (ton/era/trudność). */
function TagExplain({
  style,
  fallbackLabel,
}: {
  style?: AdventureStyleEntry;
  fallbackLabel: string;
}) {
  if (!style) return null;
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-lg leading-none">{style.icon}</span>
      <div>
        <span
          className={`font-special-elite text-xs font-semibold uppercase tracking-[0.1em] ${style.color}`}
        >
          {style.label || fallbackLabel}
        </span>
        {style.description && (
          <p className="font-serif text-base italic text-muted-foreground">
            {style.description}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Modal "Więcej szczegółów" przygody.
 *
 * Pokazuje szerszą zajawkę (bez spoilerów), liczbę sesji i objaśnia znaczniki
 * (ton/era/trudność + motywy), by gracz wiedział, jaki klimat go czeka.
 */
export function AdventureDetailsModal({
  adventure,
  open,
  onClose,
  onChoose,
}: AdventureDetailsModalProps) {
  if (!adventure) return null;

  const toneStyle = TONE_STYLES[adventure.tone] || TONE_STYLES.purist;
  const eraStyle = ERA_STYLES[adventure.era] || ERA_STYLES.custom;
  const diffStyle =
    DIFFICULTY_STYLES[adventure.difficulty] || DIFFICULTY_STYLES.normal;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="screen">
        {/* Narożniki déco */}
        <span className="pointer-events-none absolute left-2 top-2 h-4 w-4 border-l-2 border-t-2 border-brass/55" />
        <span className="pointer-events-none absolute right-2 top-2 h-4 w-4 border-r-2 border-t-2 border-brass/55" />
        <span className="pointer-events-none absolute bottom-2 left-2 h-4 w-4 border-b-2 border-l-2 border-brass/55" />
        <span className="pointer-events-none absolute bottom-2 right-2 h-4 w-4 border-b-2 border-r-2 border-brass/55" />

        <DialogHeader>
          <div className="font-special-elite text-[14px] uppercase tracking-[0.4em] text-primary">
            Szczegóły scenariusza
          </div>
          <DialogTitle className="mt-1 font-display-decorative text-2xl font-black uppercase tracking-[0.1em] text-foreground">
            {adventure.title}
          </DialogTitle>
          <div className="flex flex-wrap gap-2 pt-3">
            <span
              className={`border border-brass/40 px-3 py-1 font-special-elite text-[14px] uppercase tracking-[0.08em] ${toneStyle.color}`}
            >
              {toneStyle.icon} {toneStyle.label}
            </span>
            <span
              className={`border border-brass/40 px-3 py-1 font-special-elite text-[14px] uppercase tracking-[0.08em] ${eraStyle.color}`}
            >
              {eraStyle.icon} {eraStyle.label}
            </span>
            <span
              className={`border border-destructive/40 px-3 py-1 font-special-elite text-[14px] uppercase tracking-[0.08em] ${diffStyle.color}`}
            >
              {diffStyle.icon} {diffStyle.label}
            </span>
          </div>
        </DialogHeader>

        {/* Separator déco */}
        <div className="mt-3 flex items-center gap-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gold" />
          <span className="h-2 w-2 rotate-45 bg-brass" />
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gold" />
        </div>

        {/* Meta */}
        <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1 font-special-elite text-xs uppercase tracking-[0.1em] text-muted-foreground">
          <span>
            📍 {adventure.location}
            {adventure.country ? `, ${adventure.country}` : ''}
          </span>
          {adventure.estimatedSessions && (
            <span>📅 Przewidywane na {adventure.estimatedSessions} sesji</span>
          )}
        </div>

        {/* Zajawka (bez spoilerów) */}
        <div className="relative mt-1 border border-brass/30 bg-card p-4">
          <span className="absolute left-2 top-2 h-3 w-3 border-l-[1.5px] border-t-[1.5px] border-brass/50" />
          <span className="absolute bottom-2 right-2 h-3 w-3 border-b-[1.5px] border-r-[1.5px] border-brass/50" />
          <p className="font-serif text-lg italic leading-relaxed text-foreground/90">
            {adventure.description}
          </p>
        </div>

        {/* Objaśnienie znaczników */}
        <div className="mt-1">
          <h4 className="mb-3 font-display text-xs font-semibold uppercase tracking-[0.24em] text-brass">
            Co oznaczają oznaczenia?
          </h4>
          <div className="space-y-3">
            <TagExplain style={toneStyle} fallbackLabel="Ton" />
            <TagExplain style={eraStyle} fallbackLabel="Era" />
            <TagExplain style={diffStyle} fallbackLabel="Trudność" />
          </div>

          {adventure.themes.length > 0 && (
            <div className="mt-4">
              <span className="font-display text-xs font-semibold uppercase tracking-[0.24em] text-brass">
                Klimat i motywy
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {adventure.themes.map((theme) => (
                  <span
                    key={theme}
                    className="border border-primary/30 bg-primary/10 px-2.5 py-1 font-special-elite text-[14px] uppercase tracking-[0.08em] text-primary"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Akcje */}
        <div className="mt-4 flex justify-end gap-2 border-t border-brass/20 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="font-display font-semibold uppercase tracking-[0.16em]"
          >
            Zamknij
          </Button>
          <Button
            onClick={() => {
              onChoose(adventure);
              onClose();
            }}
            className="font-display font-semibold uppercase tracking-[0.16em]"
          >
            Wybierz tę przygodę →
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AdventureDetailsModal;
