'use client';

/**
 * @file chase-dialog.tsx
 * Dialog manewrów w pościgu (Chase Decision Panel) w stylu Dark Art Déco.
 *
 * Umożliwia graczowi wybór 1 z 5 filmowych akcji ucieczki:
 * - Sprint (zwykły bieg naprzód)
 * - Forsowanie przeszkody (wymaga testu cechy/umiejętności)
 * - Brawurowy skrót (ryzykowny test dający +2 pola)
 * - Zastawienie przeszkody z tyłu (spowolnienie pościgu)
 * - Zniknięcie w cieniu (test Ukrywania kończący pościg)
 */

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Footprints,
  Flame,
  ShieldAlert,
  DoorOpen,
  EyeOff,
  Send,
  Zap,
  RotateCcw,
} from 'lucide-react';
import {
  type ChaseState,
  type ChaseManeuver,
  type ChaseManeuverType,
  executePlayerManeuver,
  executePursuerTurns,
  formatChaseForChat,
  formatChaseForSystemContext,
} from '@/lib/chase/chase-engine';
import { ChaseTracker } from '@/components/ui/chase-tracker';
import { rollD100, evaluateSkillCheck } from '@/lib/dice-utils';

export interface ChaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialState: ChaseState;
  playerSkillValues?: Record<string, number>;
  onSendToChat?: (message: string, systemContext: string) => void;
  onComplete?: (finalState: ChaseState) => void;
}

export const ChaseDialog: React.FC<ChaseDialogProps> = ({
  open,
  onOpenChange,
  initialState,
  playerSkillValues = {},
  onSendToChat,
  onComplete,
}) => {
  const t = useTranslations('Chase');
  const [state, setState] = useState<ChaseState>(initialState);
  const [selectedManeuver, setSelectedManeuver] = useState<ChaseManeuverType | null>(null);

  const player = state.participants.find((p) => p.isPlayer && p.isFleeing);
  const currentSegment = player ? state.segments[player.segmentIndex] : null;
  const currentHazard = currentSegment?.hazard;

  const handleExecute = (maneuverType: ChaseManeuverType) => {
    if (!player) return;

    let rollOutcome = undefined;

    // Jeśli akcja wymaga testu
    if (maneuverType === 'clear_hazard' && currentHazard) {
      const skillVal = playerSkillValues[currentHazard.requiredSkill] || 50;
      const roll = rollD100();
      rollOutcome = evaluateSkillCheck(roll, skillVal);
    } else if (maneuverType === 'shortcut') {
      const skillVal = playerSkillValues['Nawigacja'] || playerSkillValues['Zręczność'] || 50;
      const roll = rollD100();
      rollOutcome = evaluateSkillCheck(roll, skillVal);
    } else if (maneuverType === 'hide') {
      const skillVal = playerSkillValues['Ukrywanie'] || playerSkillValues['Ukrywanie się'] || 40;
      const roll = rollD100();
      rollOutcome = evaluateSkillCheck(roll, skillVal);
    }

    const { nextState: stateAfterPlayer, log: playerLog } = executePlayerManeuver(state, {
      type: maneuverType,
      actorId: player.id,
      rollOutcome,
    });

    // Jeśli gracz zużył akcje lub uciekł/został złapany, rozlicz turę wrogów
    let finalState = stateAfterPlayer;
    if (stateAfterPlayer.status === 'ongoing' && player.actionsRemaining <= 1) {
      const { nextState: stateAfterPursuers } = executePursuerTurns(stateAfterPlayer);
      finalState = stateAfterPursuers;
    }

    setState(finalState);

    if (finalState.status !== 'ongoing') {
      if (onComplete) onComplete(finalState);
    }
  };

  const handleSendReport = () => {
    if (onSendToChat) {
      const chatMsg = formatChaseForChat(state, state.logs[state.logs.length - 1]);
      const sysCtx = formatChaseForSystemContext(state);
      onSendToChat(chatMsg, sysCtx);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-zinc-950 border-brass/50 text-zinc-100 shadow-2xl p-6">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-brass flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            {t('title')}
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-xs">
            {t('subtitle')}
          </DialogDescription>
        </DialogHeader>

        {/* Tor pościgu Dark Art Déco */}
        <ChaseTracker state={state} />

        {/* Panel wyboru manewrów */}
        {state.status === 'ongoing' && (
          <div className="space-y-2 mt-2">
            <p className="text-xs uppercase tracking-wider font-mono text-zinc-400 font-semibold mb-2">
              Wybierz manewr ucieczki:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* 1. Sprint */}
              <Button
                variant="outline"
                className="justify-start h-auto py-2.5 px-3 border-zinc-700/70 hover:border-emerald-500 bg-zinc-900/60 text-left"
                onClick={() => handleExecute('sprint')}
              >
                <Footprints className="w-4 h-4 text-emerald-400 mr-2 shrink-0" />
                <div>
                  <div className="font-bold text-xs text-white">{t('actionSprint')}</div>
                  <div className="text-[10px] text-zinc-400">{t('actionSprintDesc')}</div>
                </div>
              </Button>

              {/* 2. Forsowanie przeszkody */}
              {currentHazard && (
                <Button
                  variant="outline"
                  className="justify-start h-auto py-2.5 px-3 border-amber-500/50 hover:border-amber-400 bg-amber-950/20 text-left"
                  onClick={() => handleExecute('clear_hazard')}
                >
                  <Flame className="w-4 h-4 text-amber-400 mr-2 shrink-0" />
                  <div>
                    <div className="font-bold text-xs text-amber-300">{t('actionClearHazard')}</div>
                    <div className="text-[10px] text-amber-200/70">
                      {t('actionClearHazardDesc', {
                        skill: currentHazard.requiredSkill,
                        difficulty: currentHazard.difficulty,
                      })}
                    </div>
                  </div>
                </Button>
              )}

              {/* 3. Brawurowy skrót */}
              <Button
                variant="outline"
                className="justify-start h-auto py-2.5 px-3 border-zinc-700/70 hover:border-blue-500 bg-zinc-900/60 text-left"
                onClick={() => handleExecute('shortcut')}
              >
                <Zap className="w-4 h-4 text-blue-400 mr-2 shrink-0" />
                <div>
                  <div className="font-bold text-xs text-white">{t('actionShortcut')}</div>
                  <div className="text-[10px] text-zinc-400">{t('actionShortcutDesc')}</div>
                </div>
              </Button>

              {/* 4. Zastawienie przeszkody z tyłu */}
              <Button
                variant="outline"
                className="justify-start h-auto py-2.5 px-3 border-zinc-700/70 hover:border-purple-500 bg-zinc-900/60 text-left"
                onClick={() => handleExecute('create_barrier')}
              >
                <ShieldAlert className="w-4 h-4 text-purple-400 mr-2 shrink-0" />
                <div>
                  <div className="font-bold text-xs text-white">{t('actionCreateBarrier')}</div>
                  <div className="text-[10px] text-zinc-400">{t('actionCreateBarrierDesc')}</div>
                </div>
              </Button>

              {/* 5. Zniknięcie w cieniu */}
              <Button
                variant="outline"
                className="justify-start h-auto py-2.5 px-3 border-zinc-700/70 hover:border-amber-500 bg-zinc-900/60 text-left"
                onClick={() => handleExecute('hide')}
              >
                <EyeOff className="w-4 h-4 text-amber-400 mr-2 shrink-0" />
                <div>
                  <div className="font-bold text-xs text-white">{t('actionHide')}</div>
                  <div className="text-[10px] text-zinc-400">{t('actionHideDesc')}</div>
                </div>
              </Button>
            </div>
          </div>
        )}

        {/* Przyciski końcowe */}
        <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-zinc-800">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-zinc-400 hover:text-white"
          >
            {t('closeButton')}
          </Button>

          {onSendToChat && (
            <Button
              size="sm"
              onClick={handleSendReport}
              className="bg-brass hover:bg-brass-light text-zinc-950 font-semibold font-display flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              {t('sendToChatButton')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
