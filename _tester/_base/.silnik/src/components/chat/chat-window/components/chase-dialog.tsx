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
      <DialogContent size="wide" className="w-[80vw] h-[78vh] max-h-[85vh] overflow-y-auto bg-card border-brass/50 text-foreground shadow-2xl p-6">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-gold flex items-center gap-2">
            <Zap className="w-5 h-5 text-brass" />
            {t('title')}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs font-sans">
            {t('subtitle')}
          </DialogDescription>
        </DialogHeader>

        {/* Tor pościgu Dark Art Déco */}
        <ChaseTracker state={state} />

        {/* Panel wyboru manewrów */}
        {state.status === 'ongoing' && (
          <div className="space-y-2 mt-2">
            <p className="text-xs uppercase tracking-wider font-mono text-brass/90 font-semibold mb-2">
              Wybierz manewr ucieczki:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* 1. Sprint */}
              <Button
                variant="outline"
                className="justify-start h-auto py-2.5 px-3 border-border hover:border-emerald-500/60 bg-secondary/40 hover:bg-secondary/70 text-left cursor-pointer"
                onClick={() => handleExecute('sprint')}
              >
                <Footprints className="w-4 h-4 text-emerald-400 mr-2 shrink-0" />
                <div>
                  <div className="font-bold text-xs text-foreground">{t('actionSprint')}</div>
                  <div className="text-[10px] text-muted-foreground">{t('actionSprintDesc')}</div>
                </div>
              </Button>

              {/* 2. Forsowanie przeszkody */}
              {currentHazard && (
                <Button
                  variant="outline"
                  className="justify-start h-auto py-2.5 px-3 border-brass/40 hover:border-brass bg-brass/10 hover:bg-brass/20 text-left cursor-pointer"
                  onClick={() => handleExecute('clear_hazard')}
                >
                  <Flame className="w-4 h-4 text-brass mr-2 shrink-0" />
                  <div>
                    <div className="font-bold text-xs text-gold">{t('actionClearHazard')}</div>
                    <div className="text-[10px] text-brass/80">
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
                className="justify-start h-auto py-2.5 px-3 border-border hover:border-brass/60 bg-secondary/40 hover:bg-secondary/70 text-left cursor-pointer"
                onClick={() => handleExecute('shortcut')}
              >
                <Zap className="w-4 h-4 text-brass mr-2 shrink-0" />
                <div>
                  <div className="font-bold text-xs text-foreground">{t('actionShortcut')}</div>
                  <div className="text-[10px] text-muted-foreground">{t('actionShortcutDesc')}</div>
                </div>
              </Button>

              {/* 4. Zastawienie przeszkody z tyłu */}
              <Button
                variant="outline"
                className="justify-start h-auto py-2.5 px-3 border-border hover:border-brass/60 bg-secondary/40 hover:bg-secondary/70 text-left cursor-pointer"
                onClick={() => handleExecute('create_barrier')}
              >
                <ShieldAlert className="w-4 h-4 text-brass mr-2 shrink-0" />
                <div>
                  <div className="font-bold text-xs text-foreground">{t('actionCreateBarrier')}</div>
                  <div className="text-[10px] text-muted-foreground">{t('actionCreateBarrierDesc')}</div>
                </div>
              </Button>

              {/* 5. Zniknięcie w cieniu */}
              <Button
                variant="outline"
                className="justify-start h-auto py-2.5 px-3 border-border hover:border-brass/60 bg-secondary/40 hover:bg-secondary/70 text-left cursor-pointer"
                onClick={() => handleExecute('hide')}
              >
                <EyeOff className="w-4 h-4 text-brass mr-2 shrink-0" />
                <div>
                  <div className="font-bold text-xs text-foreground">{t('actionHide')}</div>
                  <div className="text-[10px] text-muted-foreground">{t('actionHideDesc')}</div>
                </div>
              </Button>
            </div>
          </div>
        )}

        {/* Przyciski końcowe */}
        <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground cursor-pointer"
          >
            {t('closeButton')}
          </Button>

          {onSendToChat && (
            <Button
              size="sm"
              onClick={handleSendReport}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold font-display flex items-center gap-1.5 cursor-pointer"
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
