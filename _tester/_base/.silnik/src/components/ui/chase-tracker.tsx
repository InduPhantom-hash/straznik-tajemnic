'use client';

/**
 * @file chase-tracker.tsx
 * Wizualny komponent toru przeszkód (Hazard Track) pościgu CoC 7e RAW
 * w estetyce Dark Art Déco.
 *
 * Prezentuje:
 * - Segmenty toru (lokacje) z ikonami pozycji uciekającego i pościgu
 * - Oznaczenia barier i przeszkód terenowych (płoty, tłum, schody, barykady)
 * - Stan punktów akcji oraz licznik rund
 * - Podgląd aktualnego dystansu
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Footprints,
  Flame,
  ShieldAlert,
  AlertTriangle,
  Skull,
  Compass,
} from 'lucide-react';
import type { ChaseState } from '@/lib/chase/chase-engine';

export interface ChaseTrackerProps {
  state: ChaseState;
  className?: string;
}

export const ChaseTracker: React.FC<ChaseTrackerProps> = ({ state, className = '' }) => {
  const t = useTranslations('Chase');

  const fleeing = state.participants.find((p) => p.isFleeing);
  const pursuers = state.participants.filter((p) => !p.isFleeing);

  const minDistance = fleeing
    ? Math.min(...pursuers.map((p) => fleeing.segmentIndex - p.segmentIndex))
    : 0;

  return (
    <Card className={`border-brass/40 bg-zinc-950/95 shadow-xl backdrop-blur-md my-3 overflow-hidden ${className}`}>
      {/* Nagłówek toru Art Déco */}
      <div className="bg-zinc-900/90 border-b border-brass/20 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Footprints className="w-5 h-5 text-brass animate-pulse" />
          <span className="font-display font-bold text-brass tracking-wider uppercase text-sm">
            {t('title')}
          </span>
          <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700 font-mono text-xs">
            {t('roundLabel', { round: state.round, maxRounds: state.maxRounds })}
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-amber-400 font-medium">
            {t('distanceLabel', { distance: Math.max(0, minDistance) })}
          </span>
          {fleeing && (
            <Badge className="bg-brass/20 text-brass border-brass/40 font-mono text-xs">
              {t('actionsRemaining', { count: fleeing.actionsRemaining })}
            </Badge>
          )}
        </div>
      </div>

      <CardContent className="p-4">
        {/* Wizualizacja toru liniowego */}
        <div className="relative flex items-center justify-between gap-1 overflow-x-auto py-4 px-2">
          {/* Liniowy przewodnik / tło toru */}
          <div className="absolute left-4 right-4 h-1 bg-zinc-800 -z-0 top-1/2 -translate-y-1/2" />

          {state.segments.map((segment) => {
            const hasFleeing = fleeing?.segmentIndex === segment.index;
            const hasPursuer = pursuers.some((p) => p.segmentIndex === segment.index);
            const hasHazard = Boolean(segment.hazard);

            return (
              <div
                key={segment.index}
                className="relative z-10 flex flex-col items-center min-w-[50px] group"
              >
                {/* Wskaźnik postaci na górze (Uciekający) */}
                <div className="h-6 flex items-center justify-center">
                  {hasFleeing && (
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 text-[10px] font-mono px-1.5 py-0.5 rounded shadow flex items-center gap-1 animate-bounce">
                      🏃 {fleeing?.name.split(' ')[0] || 'Ty'}
                    </span>
                  )}
                </div>

                {/* Węzeł segmentu */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    hasFleeing
                      ? 'border-emerald-500 bg-emerald-950 text-emerald-300 ring-2 ring-emerald-500/30'
                      : hasPursuer
                        ? 'border-rose-500 bg-rose-950 text-rose-300 ring-2 ring-rose-500/30'
                        : hasHazard
                          ? 'border-amber-500/80 bg-zinc-900 text-amber-400 shadow-md'
                          : 'border-zinc-700 bg-zinc-900 text-zinc-500'
                  }`}
                >
                  {hasHazard ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  ) : (
                    <span className="text-xs font-mono font-semibold">
                      {segment.index + 1}
                    </span>
                  )}
                </div>

                {/* Wskaźnik postaci na dole (Pościg) */}
                <div className="h-6 flex items-center justify-center mt-1">
                  {hasPursuer && (
                    <span className="bg-rose-500/20 text-rose-400 border border-rose-500/50 text-[10px] font-mono px-1.5 py-0.5 rounded shadow flex items-center gap-1">
                      💀 {pursuers.find((p) => p.segmentIndex === segment.index)?.name.split(' ')[0] || 'Pościg'}
                    </span>
                  )}
                </div>

                {/* Nazwa/opis przeszkody pod węzłem */}
                {hasHazard && (
                  <span className="text-[10px] text-amber-300 font-mono tracking-tight text-center max-w-[60px] truncate mt-0.5">
                    {segment.hazard?.name}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Informacja o statusie końcowym */}
        {state.status === 'caught' && (
          <div className="mt-3 p-3 bg-rose-950/40 border border-rose-900 rounded flex items-center gap-2 text-rose-300 text-sm">
            <Skull className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <p className="font-bold">{t('caughtTitle')}</p>
              <p className="text-xs text-rose-200/80">{t('caughtDesc')}</p>
            </div>
          </div>
        )}

        {state.status === 'escaped' && (
          <div className="mt-3 p-3 bg-emerald-950/40 border border-emerald-900 rounded flex items-center gap-2 text-emerald-300 text-sm">
            <Compass className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold">{t('escapedTitle')}</p>
              <p className="text-xs text-emerald-200/80">{t('escapedDesc')}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
