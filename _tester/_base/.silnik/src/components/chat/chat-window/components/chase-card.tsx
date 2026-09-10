'use client';

/**
 * @file chase-card.tsx
 * Interaktywna karta pościgu i toru przeszkód w strumieniu czatu (Fiction First).
 * Estetyka: Dark Art Déco 1920s.
 */

import React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Footprints,
  Flame,
  ShieldAlert,
  EyeOff,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Compass,
} from 'lucide-react';
import {
  type ChaseState,
  type ChaseManeuverType,
  executePlayerManeuver,
  executePursuerTurns,
} from '@/lib/chase/chase-engine';
import {
  rollD100,
  evaluateSkillCheck,
  type RollOutcome,
} from '@/lib/dice-utils';
import type { Character } from '@/lib/types';

export interface ChaseCardProps {
  chaseState: ChaseState;
  activeCharacter?: Character | null;
  characters?: Character[];
  completed?: boolean;
  onManeuverSelect?: (
    maneuverType: ChaseManeuverType,
    nextState: ChaseState,
    narrativeDeclaration: string
  ) => void;
  canAct?: boolean;
}

function rollNpcHazards(state: ChaseState): Record<string, RollOutcome[]> {
  return Object.fromEntries(
    state.participants
      .filter((participant) => !participant.isPlayer)
      .map((participant) => [
        participant.id,
        state.segments
          .slice(
            participant.segmentIndex + 1,
            participant.segmentIndex + participant.actionsRemaining + 1
          )
          .flatMap((segment) => {
            const hazard = segment.hazard;
            if (!hazard) return [];
            const value = participant.skillValues?.[hazard.requiredSkill];
            return [
              typeof value === 'number'
                ? evaluateSkillCheck(rollD100(), value)
                : ('fail' as const),
            ];
          }),
      ])
  );
}

export function ChaseCard({
  chaseState,
  activeCharacter,
  completed = false,
  onManeuverSelect,
  canAct = true,
}: ChaseCardProps) {
  const t = useTranslations('Chase');
  const locale = useLocale() === 'en' ? 'en' : 'pl';

  const activeActor = chaseState.participants.find(
    (participant) => participant.id === chaseState.activeActorId
  );
  const player =
    (activeActor && activeActor.isPlayer && activeActor.isFleeing
      ? activeActor
      : chaseState.participants.find(
          (p) => p.isPlayer && p.isFleeing && p.actionsRemaining > 0
        )) || chaseState.participants.find((p) => p.isPlayer && p.isFleeing);

  const pursuers = chaseState.participants.filter((p) => !p.isFleeing);
  const nearestDistance = player
    ? Math.min(...pursuers.map((p) => player.segmentIndex - p.segmentIndex))
    : 0;
  const scene = player ? chaseState.segments[player.segmentIndex] : null;
  const nextHazard = player
    ? chaseState.segments[player.segmentIndex + 1]?.hazard
    : null;

  const distanceKey =
    nearestDistance <= 1
      ? 'distanceRightBehind'
      : nearestDistance <= 3
        ? 'distanceClose'
        : 'distanceLosingTrail';

  const sceneName =
    locale === 'en' && /^Lokacja \d+$/.test(scene?.name ?? '')
      ? t('sceneNumber', { index: (scene?.index ?? 0) + 1 })
      : scene?.name;

  const hazardTranslationKey = nextHazard
    ? (
        {
          hazard_fence: 'hazardFence',
          hazard_crowd: 'hazardCrowd',
          hazard_stairs: 'hazardStairs',
          hazard_traffic: 'hazardTraffic',
        } as const
      )[
        nextHazard.id as
          | 'hazard_fence'
          | 'hazard_crowd'
          | 'hazard_stairs'
          | 'hazard_traffic'
      ]
    : undefined;

  const hazardName =
    locale === 'en' && hazardTranslationKey
      ? t(hazardTranslationKey)
      : nextHazard?.name;

  const skillValue = (...skills: string[]): number | null => {
    if (!activeCharacter?.skills) return null;
    for (const skill of skills) {
      const val = activeCharacter.skills[skill];
      if (typeof val === 'number') return val;
    }
    return null;
  };

  const hazardSkillValue = nextHazard
    ? skillValue(nextHazard.requiredSkill) ?? (activeCharacter?.dex ? Math.floor(activeCharacter.dex / 2) : 25)
    : null;
  const shortcutSkillValue =
    skillValue('Nawigacja', 'Navigation', 'Zręczność', 'Dexterity') ??
    (activeCharacter?.dex || 50);
  const hideSkillValue =
    skillValue('Ukrywanie', 'Ukrywanie się', 'Stealth', 'Hide') ?? 20;

  const handleExecute = (maneuverType: ChaseManeuverType) => {
    if (!player || player.actionsRemaining <= 0 || chaseState.status !== 'ongoing' || !canAct) {
      return;
    }

    let rollOutcome: RollOutcome | undefined;
    if (maneuverType === 'clear_hazard' && nextHazard) {
      const val = hazardSkillValue ?? 30;
      rollOutcome = evaluateSkillCheck(rollD100(), val);
    } else if (maneuverType === 'shortcut') {
      rollOutcome = evaluateSkillCheck(rollD100(), shortcutSkillValue);
    } else if (maneuverType === 'hide') {
      rollOutcome = evaluateSkillCheck(rollD100(), hideSkillValue);
    }

    const { nextState: afterPlayer, log } = executePlayerManeuver(chaseState, {
      type: maneuverType,
      actorId: player.id,
      rollOutcome,
    });

    let finalState = afterPlayer;
    const updatedPlayer = afterPlayer.participants.find((p) => p.id === player.id);
    if (afterPlayer.status === 'ongoing' && updatedPlayer?.actionsRemaining === 0) {
      finalState = executePursuerTurns(
        afterPlayer,
        rollNpcHazards(afterPlayer)
      ).nextState;
    }

    const maneuverTitle =
      maneuverType === 'clear_hazard' && nextHazard
        ? `${t('actionClearHazard')}: ${hazardName}`
        : maneuverType === 'shortcut'
        ? t('actionShortcut')
        : maneuverType === 'create_barrier'
        ? t('actionCreateBarrier')
        : maneuverType === 'hide'
        ? t('actionHide')
        : t('actionSprint');

    const rollText = rollOutcome
      ? ` [${locale === 'en' ? 'Check' : 'Test'}: ${rollOutcome.toUpperCase()}]`
      : '';

    const declaration = `${player.name}: ${maneuverTitle}${rollText} — ${log.details}`;

    onManeuverSelect?.(maneuverType, finalState, declaration);
  };

  const isFinished = chaseState.status !== 'ongoing';
  const lastLog = chaseState.logs.at(-1);

  return (
    <Card className="my-2 border border-brass/40 bg-card/90 shadow-deco backdrop-blur-sm">
      <CardContent className="p-3.5 space-y-3">
        {/* Nagłówek pościgu */}
        <div className="flex items-center justify-between gap-2 border-b border-brass/20 pb-2">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-brass" />
            <span className="font-serif text-sm font-bold tracking-wide text-gold">
              {t('title')}
            </span>
            <Badge variant="outline" className="text-[11px] border-brass/40 text-brass">
              {t('roundLabel', { round: chaseState.round, maxRounds: chaseState.maxRounds || 6 })}
            </Badge>
          </div>
          {player && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="text-brass font-medium">@{player.name}</span>
              <span>
                ({t('actionsRemaining', { count: player.actionsRemaining })})
              </span>
            </div>
          )}
        </div>

        {/* Informacje o aktualnej lokacji i dystansie */}
        <div className="rounded border border-brass/20 bg-secondary/30 p-2.5 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground uppercase tracking-wider font-mono text-[10px]">
              {t('currentScene')}:
            </span>
            <span className="font-semibold text-foreground">
              {sceneName || t('unknownScene')} ({(player?.segmentIndex ?? 0) + 1}/{chaseState.segments.length})
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40">
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">
                {t('descriptiveDistance')}:
              </span>
              <span className="font-medium text-foreground">
                {t(distanceKey)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">
                {t('immediateThreat')}:
              </span>
              <span className="font-medium text-foreground">
                {hazardName || t('openWay')}
              </span>
            </div>
          </div>
        </div>

        {/* Status końcowy lub ostatni log */}
        {isFinished ? (
          <div className="rounded p-2.5 border text-xs font-medium flex items-center gap-2">
            {chaseState.status === 'escaped' ? (
              <div className="flex items-center gap-2 text-emerald-400 border-emerald-800/40 bg-emerald-950/30 p-2 rounded w-full">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{t('escapedDesc')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-400 border-red-800/40 bg-red-950/30 p-2 rounded w-full">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{t('engagedDesc')}</span>
              </div>
            )}
          </div>
        ) : completed ? (
          <div className="text-xs text-muted-foreground italic border-l-2 border-brass/40 pl-2">
            {lastLog?.details || t('lastOutcomeSuccess')}
          </div>
        ) : (
          /* Prawdziwy pościg Fiction First w czacie */
          <div className="space-y-2.5 pt-1">
            {/* Baner Fiction First */}
            <div className="rounded border border-brass/30 bg-brass/5 p-2.5 space-y-1 text-xs">
              <div className="flex items-center gap-1.5 text-brass font-medium">
                <Compass className="h-4 w-4 shrink-0 text-brass" />
                <span className="font-semibold">{t('fictionFirstTitle')}</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {t('fictionFirstHint')}
              </p>
            </div>

            {/* Inspiracje taktyczne (opcjonalne szybkie akcje lub deklaracje) */}
            <div className="space-y-1.5 pt-0.5">
              <span className="text-[11px] font-mono text-brass/80 block">
                {t('tacticalInspirations')}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {/* Opcja 1: Pokonanie przeszkody lub zwykły sprint */}
                {nextHazard ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-auto py-2 px-2.5 justify-start text-left border-brass/40 hover:bg-brass/10"
                    disabled={!canAct || !player || player.actionsRemaining <= 0}
                    onClick={() => handleExecute('clear_hazard')}
                  >
                    <Flame className="h-3.5 w-3.5 mr-1.5 shrink-0 text-amber-400" />
                    <div className="overflow-hidden">
                      <span className="block text-xs font-bold text-foreground truncate">
                        {t('actionClearHazard')}: {hazardName}
                      </span>
                      <span className="block text-[10px] text-muted-foreground truncate">
                        {nextHazard.requiredSkill} ({hazardSkillValue}%)
                      </span>
                    </div>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-auto py-2 px-2.5 justify-start text-left border-brass/40 hover:bg-brass/10"
                    disabled={!canAct || !player || player.actionsRemaining <= 0}
                    onClick={() => handleExecute('sprint')}
                  >
                    <Footprints className="h-3.5 w-3.5 mr-1.5 shrink-0 text-emerald-400" />
                    <div>
                      <span className="block text-xs font-bold text-foreground">
                        {t('actionSprint')}
                      </span>
                      <span className="block text-[10px] text-muted-foreground">
                        {t('actionSprintNarrative')}
                      </span>
                    </div>
                  </Button>
                )}

                {/* Opcja 2: Brawurowy skrót */}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-auto py-2 px-2.5 justify-start text-left border-brass/40 hover:bg-brass/10"
                  disabled={!canAct || !player || player.actionsRemaining <= 0}
                  onClick={() => handleExecute('shortcut')}
                >
                  <Zap className="h-3.5 w-3.5 mr-1.5 shrink-0 text-brass" />
                  <div>
                    <span className="block text-xs font-bold text-foreground">
                      {t('actionShortcut')} ({shortcutSkillValue}%)
                    </span>
                    <span className="block text-[10px] text-muted-foreground">
                      {t('actionShortcutNarrative')}
                    </span>
                  </div>
                </Button>

                {/* Opcja 3: Zastaw przeszkodę */}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-auto py-2 px-2.5 justify-start text-left border-brass/40 hover:bg-brass/10"
                  disabled={!canAct || !player || player.actionsRemaining <= 0}
                  onClick={() => handleExecute('create_barrier')}
                >
                  <ShieldAlert className="h-3.5 w-3.5 mr-1.5 shrink-0 text-brass" />
                  <div>
                    <span className="block text-xs font-bold text-foreground">
                      {t('actionCreateBarrier')}
                    </span>
                    <span className="block text-[10px] text-muted-foreground">
                      {t('actionCreateBarrierNarrative')}
                    </span>
                  </div>
                </Button>

                {/* Opcja 4: Zniknij w cieniu */}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-auto py-2 px-2.5 justify-start text-left border-brass/40 hover:bg-brass/10"
                  disabled={!canAct || !player || player.actionsRemaining <= 0}
                  onClick={() => handleExecute('hide')}
                >
                  <EyeOff className="h-3.5 w-3.5 mr-1.5 shrink-0 text-brass" />
                  <div>
                    <span className="block text-xs font-bold text-foreground">
                      {t('actionHide')} ({hideSkillValue}%)
                    </span>
                    <span className="block text-[10px] text-muted-foreground">
                      {t('actionHideNarrative')}
                    </span>
                  </div>
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
