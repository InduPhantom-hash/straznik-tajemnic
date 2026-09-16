'use client';

/**
 * @file dice-roll-card.tsx
 * Diegetyczna karta rzutu kością w czacie Dark Art Déco z fizyczną animacją 3D (Three.js + Cannon-es).
 */

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Dices, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PhysicalDiceScene } from '@/components/dice/physical-dice-scene';
import { traceForFormula, type DiceRollTrace } from '@/lib/dice-roll-trace';
import type { DiceRollEventData } from '@/lib/types';
import { playDiceClatter } from '@/lib/dice-physics/dice-audio';

interface DiceRollCardProps {
  event: DiceRollEventData;
}

export const DiceRollCard: React.FC<DiceRollCardProps> = ({ event }) => {
  const t = useTranslations('DiceRollCard');
  const [trace, setTrace] = useState<DiceRollTrace>(event.trace);
  const [isRolling, setIsRolling] = useState(true);
  const rerollTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Uruchom animację rzutu kośćmi natychmiast po wyrenderowaniu karty
  useEffect(() => {
    setIsRolling(true);
    playDiceClatter(event.trace.dice.length);
    const timer = setTimeout(() => {
      setIsRolling(false);
    }, 1300);
    return () => {
      clearTimeout(timer);
      if (rerollTimerRef.current) clearTimeout(rerollTimerRef.current);
    };
  }, [event.id, event.trace.dice.length]);

  const handleReroll = () => {
    if (isRolling) return;
    const newTrace = traceForFormula(event.formula, 'reroll');
    setTrace(newTrace);
    setIsRolling(true);
    playDiceClatter(newTrace.dice.length);
    if (rerollTimerRef.current) clearTimeout(rerollTimerRef.current);
    rerollTimerRef.current = setTimeout(() => {
      setIsRolling(false);
    }, 1300);
  };

  return (
    <div
      data-testid="dice-roll-card"
      className="my-3 overflow-hidden rounded-md border border-brass/50 bg-[#0c100d]/95 backdrop-blur shadow-2xl transition-all"
    >
      {/* Nagłówek Dark Art Déco */}
      <div className="flex items-center justify-between border-b border-brass/30 bg-gradient-to-r from-brass/25 via-background to-brass/15 px-3.5 py-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Dices className="h-4 w-4 text-primary animate-pulse" />
          <span className="font-display text-xs font-bold uppercase tracking-wider text-brass">
            {event.label ? `${t('cardTitle')}: ${event.label}` : t('cardTitle')}
          </span>
          <Badge
            variant="outline"
            className="border-brass/40 bg-background/50 font-mono text-[11px] text-foreground font-semibold uppercase"
          >
            {event.formula}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {event.characterName && (
            <span className="font-serif text-xs text-muted-foreground italic">
              {event.characterName}
            </span>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleReroll}
            disabled={isRolling}
            title={t('rerollTooltip')}
            className="h-7 px-2 text-xs text-brass hover:bg-brass/20 hover:text-gold"
          >
            <RotateCcw className={`h-3.5 w-3.5 mr-1 ${isRolling ? 'animate-spin' : ''}`} />
            <span>{t('reroll')}</span>
          </Button>
        </div>
      </div>

      {/* Fizyczna Tacka 3D */}
      <div className="p-2 bg-black/40">
        <PhysicalDiceScene
          dice={trace.dice}
          rolling={isRolling}
          label={t('trayLabel', { formula: event.formula })}
        />
      </div>

      {/* Pasek podsumowania wyniku */}
      <div className="flex items-center justify-between border-t border-brass/20 bg-background/80 px-3.5 py-2 font-mono text-xs">
        <div className="flex items-center gap-2 text-muted-foreground flex-wrap">
          <span>{t('diceBreakdown')}:</span>
          <span className="text-foreground/90 font-semibold">
            {trace.dice
              .map((d) =>
                d.role === 'tens' || d.role === 'bonus' || d.role === 'penalty'
                  ? String(d.value).padStart(2, '0')
                  : d.value
              )
              .join(' + ')}
            {trace.modifier !== 0 && ` ${trace.modifier > 0 ? '+' : '-'} ${Math.abs(trace.modifier)}`}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground uppercase text-[10px] tracking-wider">{t('total')}:</span>
          <span className="font-display text-base font-bold text-primary tracking-wide">
            {trace.total}
          </span>
        </div>
      </div>
    </div>
  );
};
