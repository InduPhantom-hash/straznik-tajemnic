'use client';

/**
 * @file combat-defense-dialog.tsx
 * Interaktywna tacka wyboru reakcji obrońcy (Unik vs Kontratak vs Manewr) w stylu Dark Art Déco.
 *
 * Zapewnia graczowi pełną kontrolę taktyczną zgodną z Księgą Strażnika CoC 7e RAW:
 * - Unik: remis sprzyja obrońcy, bezpieczne zejście z linii ciosu.
 * - Kontratak: remis sprzyja atakującemu, obrońca musi rzucić ściśle lepiej, by zadać obrażenia.
 * - Manewr bojowy: chwyt, powalenie lub rozbrojenie z weryfikacją Budowy (Build).
 * - Wskaźnik przewagi liczebnej (Outnumbered): ostrzeżenie o kości premiowej dla wrogów po 1. obronie.
 */

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ShieldAlert,
  Swords,
  Footprints,
  Users,
  AlertTriangle,
  Hand,
  CheckCircle2,
} from 'lucide-react';
import type { DefenseChoice, ManeuverType } from '@/lib/combat/combat-resolver';
import {
  checkManeuverFeasibility,
  resolveOutnumberedBonus,
} from '@/lib/combat/combat-resolver';

export interface CombatDefenseDialogProps {
  id?: string;
  attackerName: string;
  attackerWeapon?: string;
  dodgeSkill: number;
  brawlSkill: number;
  playerBuild?: number;
  attackerBuild?: number;
  defensesUsedThisRound?: number;
  onSelectDefense: (choice: DefenseChoice, maneuver?: ManeuverType) => void;
  disabled?: boolean;
  completedChoice?: DefenseChoice;
}

export function CombatDefenseDialog({
  attackerName,
  attackerWeapon,
  dodgeSkill,
  brawlSkill,
  playerBuild = 0,
  attackerBuild = 0,
  defensesUsedThisRound = 0,
  onSelectDefense,
  disabled = false,
  completedChoice,
}: CombatDefenseDialogProps) {
  const t = useTranslations('CombatDefense');
  const [selectedChoice, setSelectedChoice] = useState<DefenseChoice | null>(
    completedChoice || null
  );
  const [selectedManeuver, setSelectedManeuver] =
    useState<ManeuverType>('knockdown');

  const outnumberedInfo = resolveOutnumberedBonus(defensesUsedThisRound);
  const maneuverCheck = checkManeuverFeasibility(playerBuild, attackerBuild);

  const handleConfirm = (choice: DefenseChoice) => {
    if (disabled || completedChoice) return;
    setSelectedChoice(choice);
    if (choice === 'maneuver') {
      onSelectDefense(choice, selectedManeuver);
    } else {
      onSelectDefense(choice);
    }
  };

  return (
    <Card className="border-brass/40 bg-zinc-950/90 text-zinc-100 shadow-xl overflow-hidden backdrop-blur-sm transition-all duration-300">
      <CardHeader className="border-b border-brass/20 bg-zinc-900/60 pb-3 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-brass" />
            <CardTitle className="font-display text-base tracking-wider text-brass uppercase">
              {t('title')}
            </CardTitle>
          </div>
          {completedChoice ? (
            <Badge className="bg-emerald-800/60 text-emerald-200 border-emerald-500/40 text-xs flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t('defenseResolved')}
            </Badge>
          ) : (
            <Badge className="bg-brass/20 text-brass border-brass/40 text-xs">
              {t('chooseReaction')}
            </Badge>
          )}
        </div>
        <p className="font-serif text-sm text-zinc-300 italic mt-1">
          {attackerWeapon
            ? t('incomingAttackWithWeapon', {
                attacker: attackerName,
                weapon: attackerWeapon,
              })
            : t('incomingAttackUnarmed', { attacker: attackerName })}
        </p>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Ostrzeżenie o przewadze liczebnej (Outnumbered) */}
        {outnumberedInfo.isOutnumbered && (
          <div className="flex items-start gap-2.5 p-2.5 rounded border border-amber-500/40 bg-amber-950/30 text-amber-200 text-xs">
            <Users className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold text-amber-300 uppercase tracking-wide">
                {t('outnumberedWarningTitle')}:
              </span>{' '}
              {t('outnumberedWarningDesc')}
            </div>
          </div>
        )}

        {/* 3 Opcje Obronne */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 1. UNIK */}
          <button
            type="button"
            disabled={disabled || Boolean(completedChoice)}
            onClick={() => handleConfirm('dodge')}
            className={`p-3 rounded-md border text-left flex flex-col justify-between transition-all group relative overflow-hidden ${
              selectedChoice === 'dodge'
                ? 'border-emerald-400 bg-emerald-950/40 shadow-md shadow-emerald-900/20'
                : 'border-zinc-800 bg-zinc-900/40 hover:border-brass/60 hover:bg-zinc-800/50'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 font-display text-sm font-semibold text-zinc-100 group-hover:text-brass">
                  <Footprints className="w-4 h-4 text-emerald-400" />
                  {t('actionDodge')}
                </div>
                <Badge className="text-[10px] bg-emerald-950/60 text-emerald-300 border-emerald-700/50">
                  {t('riskLow')}
                </Badge>
              </div>
              <p className="text-xs text-zinc-400 font-serif leading-relaxed mb-3">
                {t('dodgeDescription')}
              </p>
            </div>

            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono text-zinc-300">
              <span className="text-zinc-500">{t('skillValue')}:</span>
              <span className="text-emerald-300 font-bold">
                {dodgeSkill}%{' '}
                <span className="text-zinc-500 text-[10px]">
                  ({Math.floor(dodgeSkill / 2)}% / {Math.floor(dodgeSkill / 5)}
                  %)
                </span>
              </span>
            </div>
          </button>

          {/* 2. KONTRATAK */}
          <button
            type="button"
            disabled={disabled || Boolean(completedChoice)}
            onClick={() => handleConfirm('fight_back')}
            className={`p-3 rounded-md border text-left flex flex-col justify-between transition-all group relative overflow-hidden ${
              selectedChoice === 'fight_back'
                ? 'border-red-400 bg-red-950/40 shadow-md shadow-red-900/20'
                : 'border-zinc-800 bg-zinc-900/40 hover:border-brass/60 hover:bg-zinc-800/50'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 font-display text-sm font-semibold text-zinc-100 group-hover:text-brass">
                  <Swords className="w-4 h-4 text-red-400" />
                  {t('actionFightBack')}
                </div>
                <Badge className="text-[10px] bg-red-950/60 text-red-300 border-red-700/50">
                  {t('riskHigh')}
                </Badge>
              </div>
              <p className="text-xs text-zinc-400 font-serif leading-relaxed mb-3">
                {t('fightBackDescription')}
              </p>
            </div>

            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono text-zinc-300">
              <span className="text-zinc-500">{t('skillValue')}:</span>
              <span className="text-red-300 font-bold">
                {brawlSkill}%{' '}
                <span className="text-zinc-500 text-[10px]">
                  ({Math.floor(brawlSkill / 2)}% / {Math.floor(brawlSkill / 5)}
                  %)
                </span>
              </span>
            </div>
          </button>

          {/* 3. MANEWR BOJOWY */}
          <div
            className={`p-3 rounded-md border flex flex-col justify-between transition-all ${
              !maneuverCheck.allowed
                ? 'opacity-60 border-zinc-800/50 bg-zinc-950/40'
                : selectedChoice === 'maneuver'
                  ? 'border-amber-400 bg-amber-950/40 shadow-md shadow-amber-900/20'
                  : 'border-zinc-800 bg-zinc-900/40 hover:border-brass/60'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 font-display text-sm font-semibold text-zinc-100">
                  <Hand className="w-4 h-4 text-amber-400" />
                  {t('actionManeuver')}
                </div>
                {maneuverCheck.penaltyDice > 0 && (
                  <Badge className="text-[10px] bg-amber-950/60 text-amber-300 border-amber-700/50">
                    -{maneuverCheck.penaltyDice}K
                  </Badge>
                )}
                {!maneuverCheck.allowed && (
                  <Badge className="text-[10px] bg-zinc-800 text-zinc-400">
                    {t('blocked')}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-zinc-400 font-serif leading-relaxed mb-2">
                {!maneuverCheck.allowed
                  ? t('maneuverBlockedByBuild')
                  : t('maneuverDescription')}
              </p>

              {maneuverCheck.allowed && !completedChoice && (
                <div className="flex gap-1 mb-2">
                  <button
                    type="button"
                    onClick={() => setSelectedManeuver('knockdown')}
                    className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                      selectedManeuver === 'knockdown'
                        ? 'border-amber-400 bg-amber-900/40 text-amber-200'
                        : 'border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {t('maneuverKnockdown')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedManeuver('grapple')}
                    className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                      selectedManeuver === 'grapple'
                        ? 'border-amber-400 bg-amber-900/40 text-amber-200'
                        : 'border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {t('maneuverGrapple')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedManeuver('disarm')}
                    className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                      selectedManeuver === 'disarm'
                        ? 'border-amber-400 bg-amber-900/40 text-amber-200'
                        : 'border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {t('maneuverDisarm')}
                  </button>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
              <span className="text-[11px] text-zinc-400 font-mono">
                {brawlSkill}%
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={
                  disabled ||
                  !maneuverCheck.allowed ||
                  Boolean(completedChoice)
                }
                onClick={() => handleConfirm('maneuver')}
                className="h-6 px-2 text-xs border-amber-500/50 text-amber-300 hover:bg-amber-950/40"
              >
                {t('executeManeuver')}
              </Button>
            </div>
          </div>
        </div>

        {/* Notka o regule remisów RAW */}
        <div className="text-[11px] font-serif text-zinc-500 border-t border-zinc-800/60 pt-2 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-brass/70 shrink-0" />
          <span>{t('rulebookTieReminder')}</span>
        </div>
      </CardContent>
    </Card>
  );
}
