'use client';

import React, { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Footprints,
  Flame,
  ShieldAlert,
  EyeOff,
  Send,
  Zap,
} from 'lucide-react';
import {
  type ChaseState,
  type ChaseManeuverType,
  executePlayerManeuver,
  executePursuerTurns,
  formatChaseForChat,
} from '@/lib/chase/chase-engine';
import {
  rollD100,
  evaluateSkillCheck,
  type RollOutcome,
} from '@/lib/dice-utils';

export interface ChaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialState: ChaseState;
  playerSkillValues?: Record<string, number>;
  onSendToChat?: (message: string, chaseState: ChaseState) => void;
  onStateChange?: (state: ChaseState) => void;
  onComplete?: (finalState: ChaseState) => void;
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

export const ChaseDialog: React.FC<ChaseDialogProps> = ({
  open,
  onOpenChange,
  initialState,
  playerSkillValues = {},
  onSendToChat,
  onStateChange,
  onComplete,
}) => {
  const t = useTranslations('Chase');
  const locale = useLocale() === 'en' ? 'en' : 'pl';
  const [state, setState] = useState<ChaseState>(initialState);

  useEffect(() => setState(initialState), [initialState]);

  useEffect(() => {
    if (!open || state.status !== 'ongoing') return;
    const activeActor = state.participants.find(
      (participant) => participant.id === state.activeActorId
    );
    if (!activeActor || activeActor.isPlayer) return;
    const resolved = executePursuerTurns(
      state,
      rollNpcHazards(state)
    ).nextState;
    setState(resolved);
    onStateChange?.(resolved);
    if (resolved.status !== 'ongoing') onComplete?.(resolved);
  }, [onComplete, onStateChange, open, state]);

  const activeActor = state.participants.find(
    (participant) => participant.id === state.activeActorId
  );
  const player =
    (activeActor && activeActor.isPlayer && activeActor.isFleeing
      ? activeActor
      : state.participants.find(
          (p) => p.isPlayer && p.isFleeing && p.actionsRemaining > 0
        )) || state.participants.find((p) => p.isPlayer && p.isFleeing);

  const isMultiplayer = state.participants.filter((p) => p.isPlayer && p.isFleeing).length > 1;
  const pursuers = state.participants.filter((p) => !p.isFleeing);
  const nearestDistance = player
    ? Math.min(...pursuers.map((p) => player.segmentIndex - p.segmentIndex))
    : 0;
  const scene = player ? state.segments[player.segmentIndex] : null;
  const nextHazard = player
    ? state.segments[player.segmentIndex + 1]?.hazard
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

  const skillValue = (...skills: string[]): number | null =>
    skills
      .map((skill) => playerSkillValues[skill])
      .find((candidate) => typeof candidate === 'number') ?? null;
  const hazardSkillValue = nextHazard
    ? skillValue(nextHazard.requiredSkill)
    : null;
  const shortcutSkillValue = skillValue('Nawigacja', 'Zręczność');
  const hideSkillValue = skillValue('Ukrywanie', 'Ukrywanie się');

  const handleExecute = (maneuverType: ChaseManeuverType) => {
    if (!player || player.actionsRemaining <= 0 || state.status !== 'ongoing')
      return;

    let rollOutcome: RollOutcome | undefined;
    if (maneuverType === 'clear_hazard' && nextHazard) {
      if (hazardSkillValue === null) return;
      rollOutcome = evaluateSkillCheck(rollD100(), hazardSkillValue);
    } else if (maneuverType === 'shortcut') {
      if (shortcutSkillValue === null) return;
      rollOutcome = evaluateSkillCheck(rollD100(), shortcutSkillValue);
    } else if (maneuverType === 'hide') {
      if (hideSkillValue === null) return;
      rollOutcome = evaluateSkillCheck(rollD100(), hideSkillValue);
    }

    const { nextState: afterPlayer } = executePlayerManeuver(state, {
      type: maneuverType,
      actorId: player.id,
      rollOutcome,
    });

    let finalState = afterPlayer;
    const updatedPlayer = afterPlayer.participants.find(
      (p) => p.id === player.id
    );
    if (
      afterPlayer.status === 'ongoing' &&
      updatedPlayer?.actionsRemaining === 0
    ) {
      finalState = executePursuerTurns(
        afterPlayer,
        rollNpcHazards(afterPlayer)
      ).nextState;
    }

    setState(finalState);
    onStateChange?.(finalState);
    if (finalState.status !== 'ongoing') onComplete?.(finalState);
  };

  const handleSendReport = () => {
    onSendToChat?.(
      formatChaseForChat(state, state.logs[state.logs.length - 1], locale),
      state
    );
    onOpenChange(false);
  };

  const actionsDisabled = !player || player.actionsRemaining <= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-y-auto border-brass/50 bg-card text-foreground shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl text-gold">
            <Zap className="h-5 w-5 text-brass" />
            {t('title')}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t('narrativeSubtitle')}
          </DialogDescription>
        </DialogHeader>

        <section className="space-y-3 rounded-md border border-brass/30 bg-secondary/30 p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-brass">
              {t('currentScene')}
            </p>
            <h3 className="font-display text-lg text-foreground">
              {sceneName || t('unknownScene')}
            </h3>
            {isMultiplayer && player && (
              <div className="mt-1 inline-flex items-center gap-1.5 rounded bg-brass/20 px-2 py-0.5 text-xs font-semibold text-gold">
                <span>{t('activeInvestigator')}: @{player.name}</span>
                <span className="text-muted-foreground">
                  ({t('actionsRemaining', { count: player.actionsRemaining })})
                </span>
              </div>
            )}
            {locale === 'pl' && scene?.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {scene.description}
              </p>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('descriptiveDistance')}
              </p>
              <p className="text-sm font-semibold text-foreground">
                {t(distanceKey)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('immediateThreat')}
              </p>
              <p className="text-sm font-semibold text-foreground">
                {hazardName || t('openWay')}
              </p>
            </div>
          </div>
          {state.logs.at(-1) && (
            <p className="border-l-2 border-brass/50 pl-3 text-sm italic text-muted-foreground">
              {locale === 'en'
                ? t(
                    state.logs.at(-1)?.success === false
                      ? 'lastOutcomeFailure'
                      : 'lastOutcomeSuccess'
                  )
                : state.logs.at(-1)?.details}
            </p>
          )}
        </section>

        {state.status === 'ongoing' ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-brass">
              {t('whatDoYouDo')}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                variant="outline"
                className="h-auto justify-start px-3 py-3 text-left"
                disabled={
                  actionsDisabled || (!!nextHazard && hazardSkillValue === null)
                }
                onClick={() =>
                  handleExecute(nextHazard ? 'clear_hazard' : 'sprint')
                }
              >
                {nextHazard ? (
                  <Flame className="mr-2 h-4 w-4 shrink-0 text-brass" />
                ) : (
                  <Footprints className="mr-2 h-4 w-4 shrink-0 text-emerald-400" />
                )}
                <span>
                  <span className="block text-sm font-bold">
                    {nextHazard ? t('actionClearHazard') : t('actionSprint')}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {nextHazard
                      ? t('actionClearHazardNarrative')
                      : t('actionSprintNarrative')}
                  </span>
                </span>
              </Button>
              <Button
                variant="outline"
                className="h-auto justify-start px-3 py-3 text-left"
                disabled={actionsDisabled || shortcutSkillValue === null}
                onClick={() => handleExecute('shortcut')}
              >
                <Zap className="mr-2 h-4 w-4 shrink-0 text-brass" />
                <span>
                  <span className="block text-sm font-bold">
                    {t('actionShortcut')}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {t('actionShortcutNarrative')}
                  </span>
                </span>
              </Button>
              <Button
                variant="outline"
                className="h-auto justify-start px-3 py-3 text-left"
                disabled={actionsDisabled}
                onClick={() => handleExecute('create_barrier')}
              >
                <ShieldAlert className="mr-2 h-4 w-4 shrink-0 text-brass" />
                <span>
                  <span className="block text-sm font-bold">
                    {t('actionCreateBarrier')}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {t('actionCreateBarrierNarrative')}
                  </span>
                </span>
              </Button>
              <Button
                variant="outline"
                className="h-auto justify-start px-3 py-3 text-left"
                disabled={actionsDisabled || hideSkillValue === null}
                onClick={() => handleExecute('hide')}
              >
                <EyeOff className="mr-2 h-4 w-4 shrink-0 text-brass" />
                <span>
                  <span className="block text-sm font-bold">
                    {t('actionHide')}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {t('actionHideNarrative')}
                  </span>
                </span>
              </Button>
            </div>
          </div>
        ) : (
          <p className="rounded-md border border-brass/30 p-4 text-sm font-semibold">
            {state.status === 'escaped' ? t('escapedDesc') : t('engagedDesc')}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            {t('closeButton')}
          </Button>
          {onSendToChat && (
            <Button size="sm" onClick={handleSendReport}>
              <Send className="mr-1.5 h-4 w-4" />
              {t('sendToChatButton')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
