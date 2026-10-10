'use client';

/**
 * @file chase-header-tracker.tsx
 * Dyskretna Oś Pościgu w stylu Dark Art Déco pod belką lokacji w nagłówku czatu.
 * Renderowana wyłącznie w trakcie aktywnej gonitwy (chaseState.status === 'ongoing').
 * Zapewnia natychmiastowy podgląd dystansu, pozycji uczestników i nadchodzącej przeszkody.
 */

import React from 'react';
import type { ChaseState, ChaseSegment } from '@/lib/chase/chase-engine';
import { useTranslations } from 'next-intl';

interface ChaseHeaderTrackerProps {
  chaseState?: ChaseState | null;
  className?: string;
}

export function ChaseHeaderTracker({
  chaseState,
  className = '',
}: ChaseHeaderTrackerProps) {
  const t = useTranslations('ChaseTracker');

  if (!chaseState || chaseState.status !== 'ongoing') {
    return null;
  }

  const player = chaseState.participants.find((p) => p.isPlayer);
  const opponent = chaseState.participants.find((p) => !p.isPlayer);
  const isPlayerPursuer = Boolean(player && !player.isFleeing);

  const playerSegment = player?.segmentIndex ?? 0;
  const opponentSegment = opponent?.segmentIndex ?? 0;
  const distance = Math.abs(playerSegment - opponentSegment);

  const segments: ChaseSegment[] = chaseState.segments && chaseState.segments.length > 0
    ? chaseState.segments
    : Array.from({ length: 5 }, (_, i) => ({ index: i, name: `Lokacja ${i + 1}`, hazard: null }));

  const nextHazard = segments[playerSegment + 1]?.hazard;
  const isDanger = distance <= 1;

  // Sprawdź czy to pościg kołowy czy pieszy
  const isVehicle =
    opponent?.name.toLowerCase().includes('pojazd') ||
    opponent?.name.toLowerCase().includes('vehicle') ||
    opponent?.name.toLowerCase().includes('auto') ||
    opponent?.name.toLowerCase().includes('samochód');

  const distanceText = isDanger
    ? t('distanceDanger')
    : isPlayerPursuer
    ? (t('distancePursuing', { count: distance }) || `Dystans do celu: ${distance}`)
    : t('distance', { count: distance });

  return (
    <div
      role="region"
      aria-label={t('title')}
      className={`relative bg-gradient-to-r from-stone-950 via-zinc-900 to-stone-950 border-b border-brass/40 px-3 sm:px-6 py-2 transition-all duration-300 shadow-md ${className}`}
    >
      {/* Złoty akcent Art Déco u dołu */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brass/50 to-transparent"
      />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
        {/* Lewa: Etykieta statusu gonitwy */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          <span
            aria-hidden="true"
            className={`inline-flex items-center justify-center w-6 h-6 rounded-full border text-xs ${
              isDanger
                ? 'bg-red-950/90 border-red-500/70 text-red-400 animate-pulse'
                : 'bg-amber-950/70 border-brass/50 text-brass'
            }`}
          >
            🏃
          </span>
          <div>
            <div className="text-[12px] uppercase font-mono tracking-wider font-bold flex items-center gap-1.5 text-brass">
              <span>{t('title')}</span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-300 font-normal">
                {isVehicle ? t('vehicleChase') : t('footChase')}
              </span>
            </div>
            {opponent?.name && (
              <div className="text-[12px] text-zinc-400 font-sans truncate max-w-[180px] sm:max-w-[220px]">
                {isPlayerPursuer ? `${t('pursuingPrefix') || 'Cel:'} ${opponent.name}` : opponent.name}
              </div>
            )}
          </div>
        </div>

        {/* Środek: Oś segmentów (Hazard Track) */}
        <div className="flex-1 w-full max-w-md px-1 sm:px-2">
          <div className="flex items-center justify-between mb-1 text-[12px] font-mono">
            <span
              className={`px-2 py-0.5 rounded font-bold transition-colors ${
                isDanger
                  ? 'bg-red-950 text-red-300 border border-red-600/60'
                  : 'bg-amber-950/80 text-amber-300 border border-brass/40'
              }`}
            >
              {distanceText}
            </span>
          </div>

          {/* Dyskretne segmenty toru */}
          <div className="grid grid-cols-5 gap-1.5 h-6 bg-zinc-950/90 rounded p-1 border border-brass/20 relative">
            {segments.map((seg, idx) => {
              const isPlayerHere = playerSegment === idx;
              const isOpponentHere = opponentSegment === idx;
              const isHazardHere = seg.hazard !== null && seg.hazard !== undefined;
              const isGoal = idx === segments.length - 1;

              return (
                <div
                  key={seg.index ?? idx}
                  className={`rounded flex items-center justify-center text-[12px] font-mono transition-all ${
                    isPlayerHere
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/60 font-bold shadow-sm'
                      : isOpponentHere
                      ? 'bg-red-950/80 text-red-300 border border-red-600/50 font-bold'
                      : isHazardHere
                      ? 'bg-amber-950/30 text-amber-400 border border-dashed border-amber-600/40'
                      : isGoal
                      ? 'bg-zinc-900 text-zinc-400 border border-zinc-700/30'
                      : 'bg-zinc-900/60 text-zinc-600'
                  }`}
                  title={seg.name}
                >
                  {isPlayerHere && isOpponentHere ? (
                    <span className="text-red-400 font-bold">⚔️</span>
                  ) : isPlayerHere ? (
                    <span>🕵️ {t('investigator')}</span>
                  ) : isOpponentHere ? (
                    <span>{isPlayerPursuer ? '🎯' : '👹'} {isPlayerPursuer ? t('target') || 'Cel' : t('enemy')}</span>
                  ) : isHazardHere ? (
                    <span>🚧</span>
                  ) : isGoal ? (
                    <span>🏁</span>
                  ) : (
                    <span>•</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Prawa: Nadchodząca przeszkoda */}
        {nextHazard ? (
          <div className="shrink-0 text-left sm:text-right bg-zinc-950/80 px-2.5 py-1 rounded border border-brass/30 self-stretch sm:self-auto flex sm:flex-col justify-between sm:justify-center items-center sm:items-end">
            <span className="text-[12px] text-zinc-400 font-sans">
              {t('hazardOnRoute')}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-amber-300 font-mono">
                {nextHazard.name}
              </span>
              <span className="text-[12px] text-emerald-400 font-mono font-semibold">
                [{t('testPrefix')}: {nextHazard.requiredSkill}]
              </span>
            </div>
          </div>
        ) : (
          <div className="shrink-0 text-right text-[12px] text-zinc-500 font-mono hidden sm:block">
            🏁 {t('goal')}
          </div>
        )}
      </div>
    </div>
  );
}
