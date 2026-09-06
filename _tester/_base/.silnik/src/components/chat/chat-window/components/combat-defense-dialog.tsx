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
    <Card className="border-brass/40 bg-card/95 text-foreground shadow-deco overflow-hidden backdrop-blur-sm transition-all duration-300">
      <CardHeader className="border-b border-brass/20 bg-card pb-3 pt-3">
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
            <Badge className="bg-brass/20 text-brass border-brass/40 text-xs font-mono">
              {t('chooseReaction')}
            </Badge>
          )}
        </div>
        <p className="font-serif text-sm text-muted-foreground italic mt-1">
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
          <div className="flex items-start gap-2.5 p-2.5 rounded border border-brass/40 bg-card text-foreground text-xs shadow-deco">
            <Users className="w-4 h-4 text-brass mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold text-brass uppercase tracking-wide font-display">
                {t('outnumberedWarningTitle')}:
              </span>{' '}
              <span className="text-muted-foreground">{t('outnumberedWarningDesc')}</span>
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
                ? 'border-primary bg-primary/20 shadow-md shadow-primary/20'
                : 'border-border bg-card/60 hover:border-brass/60 hover:bg-card/80'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 font-display text-sm font-semibold text-foreground group-hover:text-brass">
                  <Footprints className="w-4 h-4 text-primary" />
                  {t('actionDodge')}
                </div>
                <Badge className="text-[10px] bg-primary/20 text-primary border-primary/40">
                  {t('riskLow')}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-serif leading-relaxed mb-3">
                {t('dodgeDescription')}
              </p>
            </div>

            <div className="pt-2 border-t border-border/80 flex items-center justify-between text-xs font-mono text-muted-foreground">
              <span className="text-muted-foreground">{t('skillValue')}:</span>
              <span className="text-primary font-bold">
                {dodgeSkill}%{' '}
                <span className="text-muted-foreground text-[10px]">
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
                ? 'border-destructive bg-destructive/20 shadow-md shadow-destructive/20'
                : 'border-border bg-card/60 hover:border-brass/60 hover:bg-card/80'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 font-display text-sm font-semibold text-foreground group-hover:text-brass">
                  <Swords className="w-4 h-4 text-destructive" />
                  {t('actionFightBack')}
                </div>
                <Badge className="text-[10px] bg-destructive/20 text-destructive-foreground border-destructive/50">
                  {t('riskHigh')}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-serif leading-relaxed mb-3">
                {t('fightBackDescription')}
              </p>
            </div>

            <div className="pt-2 border-t border-border/80 flex items-center justify-between text-xs font-mono text-muted-foreground">
              <span className="text-muted-foreground">{t('skillValue')}:</span>
              <span className="text-destructive font-bold">
                {brawlSkill}%{' '}
                <span className="text-muted-foreground text-[10px]">
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
                ? 'opacity-60 border-border/40 bg-card/30'
                : selectedChoice === 'maneuver'
                  ? 'border-brass bg-brass/15 shadow-glow-brass'
                  : 'border-border bg-card/60 hover:border-brass/60'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 font-display text-sm font-semibold text-foreground">
                  <Hand className="w-4 h-4 text-brass" />
                  {t('actionManeuver')}
                </div>
                {maneuverCheck.penaltyDice > 0 && (
                  <Badge className="text-[10px] bg-brass/20 text-brass border-brass/40 font-mono">
                    -{maneuverCheck.penaltyDice}K
                  </Badge>
                )}
                {!maneuverCheck.allowed && (
                  <Badge className="text-[10px] bg-muted text-muted-foreground border-border">
                    {t('blocked')}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-serif leading-relaxed mb-2">
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
                        ? 'border-brass bg-brass/20 text-brass'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t('maneuverKnockdown')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedManeuver('grapple')}
                    className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                      selectedManeuver === 'grapple'
                        ? 'border-brass bg-brass/20 text-brass'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t('maneuverGrapple')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedManeuver('disarm')}
                    className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                      selectedManeuver === 'disarm'
                        ? 'border-brass bg-brass/20 text-brass'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t('maneuverDisarm')}
                  </button>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-border/80 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground font-mono">
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
                className="h-6 px-2 text-xs border-brass/50 text-brass hover:bg-brass/15"
              >
                {t('executeManeuver')}
              </Button>
            </div>
          </div>
        </div>

        {/* Notka o regule remisów RAW */}
        <div className="text-[11px] font-serif text-muted-foreground border-t border-border/60 pt-2 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-brass/70 shrink-0" />
          <span>{t('rulebookTieReminder')}</span>
        </div>
      </CardContent>
    </Card>
  );
}
