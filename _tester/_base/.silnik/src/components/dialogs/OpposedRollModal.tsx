'use client';

/**
 * @file OpposedRollModal.tsx
 * Tacka rzutów przeciwstawnych (Opposed Rolls) Call of Cthulhu 7e RAW w stylu Dark Art Déco.
 *
 * Umożliwia deterministyczne rozstrzygnięcie rywalizacji badacza z przeciwnikiem (NPC/potwór):
 * - Równoległy rzut k100 dla obu stron z animacją
 * - Niezależne kości premiowe/karne dla badacza i przeciwnika
 * - Wizualizacja progów sukcesu (Zwykły / Trudny / Ekstremalny / Fumble)
 * - Deterministyczny werdykt CoC 7e RAW (wyższy stopień > wyższa wartość bazowa > pat z opcją reroll)
 * - Bezpośrednia integracja z czatem narracji i dziennikiem
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Swords,
  Dices,
  Scale,
  Trophy,
  RotateCcw,
  Send,
  Shield,
  User,
  Skull,
  HelpCircle,
} from 'lucide-react';
import {
  type OpposedRollResolution,
  type OpposedRollSideConfig,
  calculateOpposedThresholds,
  rollAndResolveOpposed,
  formatOpposedRollForChat,
  formatOpposedRollForSystemContext,
} from '@/lib/opposed-rolls';
import type { RollOutcome } from '@/lib/dice-utils';

export interface OpposedRollData {
  id?: string;
  testId?: string;
  groupId?: string;
  characterId?: string;
  // Gracz / Badacz
  playerName: string;
  playerSkillName: string;
  playerSkillValue: number;
  playerBonusDice?: number;
  // Przeciwnik (NPC / Potwór)
  opponentName: string;
  opponentSkillName: string;
  opponentSkillValue: number;
  opponentBonusDice?: number;
  // Uzasadnienie
  justification?: string;
}

export interface OpposedRollModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: OpposedRollData | null;
  onSendToChat?: (message: string, systemContext: string) => void;
  onComplete?: (resolution: OpposedRollResolution) => void;
}

const ANIM_TICK_MS = 50;
const ANIM_DURATION_MS = 650;

function getOutcomeColor(outcome: RollOutcome): string {
  switch (outcome) {
    case 'critical':
      return 'text-gold border-gold/60 bg-brass/15 font-bold shadow-glow-brass';
    case 'extreme':
      return 'text-brass border-brass/50 bg-brass/10 font-semibold';
    case 'hard':
      return 'text-primary border-primary/50 bg-primary/10 font-semibold';
    case 'regular':
      return 'text-foreground border-border/80 bg-card/80';
    case 'fail':
      return 'text-destructive border-destructive/50 bg-destructive/10';
    case 'fumble':
      return 'text-destructive border-destructive bg-destructive/20 font-bold';
    default:
      return 'text-muted-foreground border-border bg-card';
  }
}

export const OpposedRollModal: React.FC<OpposedRollModalProps> = ({
  open,
  onOpenChange,
  data,
  onSendToChat,
  onComplete,
}) => {
  const t = useTranslations('OpposedRoll');

  const [phase, setPhase] = useState<'ready' | 'rolling' | 'done'>('ready');
  const [playerBonus, setPlayerBonus] = useState<number>(0);
  const [opponentBonus, setOpponentBonus] = useState<number>(0);

  const [animPlayerVal, setAnimPlayerVal] = useState<number>(50);
  const [animOpponentVal, setAnimOpponentVal] = useState<number>(50);
  const [resolution, setResolution] = useState<OpposedRollResolution | null>(null);

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current = [];
  }, []);

  // Inicjalizacja stanu przy otwarciu
  useEffect(() => {
    if (open && data) {
      setPhase('ready');
      setPlayerBonus(data.playerBonusDice || 0);
      setOpponentBonus(data.opponentBonusDice || 0);
      setResolution(null);
      setAnimPlayerVal(data.playerSkillValue || 50);
      setAnimOpponentVal(data.opponentSkillValue || 50);
    }
    return () => clearTimers();
  }, [open, data, clearTimers]);

  if (!data) return null;

  const playerThresholds = calculateOpposedThresholds(data.playerSkillValue);
  const opponentThresholds = calculateOpposedThresholds(data.opponentSkillValue);

  const startRoll = () => {
    setPhase('rolling');
    clearTimers();

    const startTime = Date.now();
    const interval = setInterval(() => {
      setAnimPlayerVal(Math.floor(Math.random() * 100) + 1);
      setAnimOpponentVal(Math.floor(Math.random() * 100) + 1);

      if (Date.now() - startTime >= ANIM_DURATION_MS) {
        clearInterval(interval);

        const sideAConfig: OpposedRollSideConfig = {
          name: data.playerName,
          skillName: data.playerSkillName,
          skillValue: data.playerSkillValue,
          bonusDice: playerBonus,
          isPlayer: true,
          characterId: data.characterId,
        };

        const sideBConfig: OpposedRollSideConfig = {
          name: data.opponentName,
          skillName: data.opponentSkillName,
          skillValue: data.opponentSkillValue,
          bonusDice: opponentBonus,
          isPlayer: false,
        };

        const res = rollAndResolveOpposed(sideAConfig, sideBConfig);
        setResolution(res);
        setAnimPlayerVal(res.sideA.total);
        setAnimOpponentVal(res.sideB.total);
        setPhase('done');

        if (onComplete) {
          onComplete(res);
        }
      }
    }, ANIM_TICK_MS);

    timersRef.current.push(interval as unknown as ReturnType<typeof setTimeout>);
  };

  const handleSendToChat = () => {
    if (!resolution) return;
    const chatMessage = formatOpposedRollForChat(resolution);
    const systemContext = formatOpposedRollForSystemContext(resolution);

    if (onSendToChat) {
      onSendToChat(chatMessage, systemContext);
    }
    onOpenChange(false);
  };

  const getOutcomeLabel = (outcome: RollOutcome): string => {
    switch (outcome) {
      case 'critical':
        return t('outcomeCritical');
      case 'extreme':
        return t('outcomeExtreme');
      case 'hard':
        return t('outcomeHard');
      case 'regular':
        return t('outcomeRegular');
      case 'fail':
        return t('outcomeFail');
      case 'fumble':
        return t('outcomeFumble');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="wide" className="w-[80vw] h-[78vh] max-h-[85vh] border-brass/50 bg-card text-foreground shadow-deco backdrop-blur-md p-0 overflow-hidden flex flex-col">
        {/* Nagłówek Dark Art Déco */}
        <DialogHeader className="border-b border-brass/30 bg-card/90 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-md bg-brass/10 border border-brass/30 text-brass">
                <Swords className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="font-display text-lg tracking-wider text-brass uppercase">
                  {t('title')}
                </DialogTitle>
                <DialogDescription className="font-serif text-xs text-muted-foreground italic">
                  {t('subtitle')}
                </DialogDescription>
              </div>
            </div>
            <Badge className="bg-brass/15 text-brass border-brass/30 font-mono text-xs">
              CoC 7e RAW
            </Badge>
          </div>
          {data.justification && (
            <div className="mt-2 text-xs font-serif text-muted-foreground italic bg-card/60 p-2 rounded border border-border">
              💡 {data.justification}
            </div>
          )}
        </DialogHeader>

        {/* Zawartość: Dwie Kolumny (Gracz vs Przeciwnik) */}
        <div className="p-6 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
            {/* Ikona VS pośrodku */}
            <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-card border border-brass/50 items-center justify-center text-brass z-10 text-xs font-bold font-display shadow-deco">
              VS
            </div>

            {/* LEWA KOLUMNA: BADACZ */}
            <Card className="border-brass/30 bg-card/50 overflow-hidden">
              <div className="bg-card/90 px-4 py-2.5 border-b border-brass/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  <span className="font-display text-sm font-bold text-foreground">
                    {data.playerName}
                  </span>
                </div>
                <Badge className="text-[10px] bg-primary/20 text-primary border-primary/40">
                  {t('playerLabel')}
                </Badge>
              </div>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{data.playerSkillName}:</span>
                  <span className="font-mono font-bold text-primary text-base">
                    {data.playerSkillValue}%
                  </span>
                </div>

                {/* Progi sukcesu */}
                <div className="grid grid-cols-3 gap-1 text-[11px] font-mono text-center bg-card/80 p-2 rounded border border-border/80">
                  <div>
                    <span className="text-muted-foreground block">{t('thresholdRegular')}</span>
                    <span className="text-foreground font-semibold">
                      ≤{playerThresholds.regular}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">{t('thresholdHard')}</span>
                    <span className="text-primary font-semibold">
                      ≤{playerThresholds.hard}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">{t('thresholdExtreme')}</span>
                    <span className="text-brass font-semibold">
                      ≤{playerThresholds.extreme}
                    </span>
                  </div>
                </div>

                {/* Kości premiowe / karne */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-muted-foreground">{t('bonusDice')}:</span>
                  <div className="flex items-center gap-1">
                    {[-2, -1, 0, 1, 2].map((mod) => (
                      <button
                        key={mod}
                        type="button"
                        disabled={phase !== 'ready'}
                        onClick={() => setPlayerBonus(mod)}
                        className={`w-6 h-6 rounded text-[11px] font-mono transition-colors ${
                          playerBonus === mod
                            ? mod > 0
                              ? 'bg-primary text-primary-foreground font-bold'
                              : mod < 0
                              ? 'bg-destructive text-destructive-foreground font-bold'
                              : 'bg-brass text-background font-bold'
                            : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                        }`}
                      >
                        {mod > 0 ? `+${mod}` : mod}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Wyświetlacz rzutu */}
                <div className="pt-2 text-center">
                  <div
                    className={`p-3 rounded-lg border flex flex-col items-center justify-center transition-all ${
                      phase === 'done' && resolution
                        ? getOutcomeColor(resolution.sideA.outcome)
                        : 'border-border bg-card/80'
                    }`}
                  >
                    <span className="text-xs text-muted-foreground uppercase tracking-widest font-mono">
                      {phase === 'done' ? getOutcomeLabel(resolution!.sideA.outcome) : t('rolling')}
                    </span>
                    <span className="text-3xl font-mono font-extrabold tracking-tight mt-1">
                      {phase === 'rolling'
                        ? animPlayerVal
                        : phase === 'done' && resolution
                        ? resolution.sideA.total
                        : '--'}
                    </span>
                    {phase === 'done' && resolution && resolution.sideA.bonusDice !== 0 && (
                      <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        k10: [{resolution.sideA.tensResults.join(', ')}] + {resolution.sideA.unitsResult}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* PRAWA KOLUMNA: PRZECIWNIK */}
            <Card className="border-brass/30 bg-card/50 overflow-hidden">
              <div className="bg-card/90 px-4 py-2.5 border-b border-brass/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skull className="w-4 h-4 text-destructive" />
                  <span className="font-display text-sm font-bold text-foreground">
                    {data.opponentName}
                  </span>
                </div>
                <Badge className="text-[10px] bg-destructive/20 text-destructive-foreground border-destructive/50">
                  {t('opponentLabel')}
                </Badge>
              </div>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{data.opponentSkillName}:</span>
                  <span className="font-mono font-bold text-destructive text-base">
                    {data.opponentSkillValue}%
                  </span>
                </div>

                {/* Progi sukcesu */}
                <div className="grid grid-cols-3 gap-1 text-[11px] font-mono text-center bg-card/80 p-2 rounded border border-border/80">
                  <div>
                    <span className="text-muted-foreground block">{t('thresholdRegular')}</span>
                    <span className="text-foreground font-semibold">
                      ≤{opponentThresholds.regular}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">{t('thresholdHard')}</span>
                    <span className="text-primary font-semibold">
                      ≤{opponentThresholds.hard}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">{t('thresholdExtreme')}</span>
                    <span className="text-brass font-semibold">
                      ≤{opponentThresholds.extreme}
                    </span>
                  </div>
                </div>

                {/* Kości premiowe / karne */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-muted-foreground">{t('bonusDice')}:</span>
                  <div className="flex items-center gap-1">
                    {[-2, -1, 0, 1, 2].map((mod) => (
                      <button
                        key={mod}
                        type="button"
                        disabled={phase !== 'ready'}
                        onClick={() => setOpponentBonus(mod)}
                        className={`w-6 h-6 rounded text-[11px] font-mono transition-colors ${
                          opponentBonus === mod
                            ? mod > 0
                              ? 'bg-primary text-primary-foreground font-bold'
                              : mod < 0
                              ? 'bg-destructive text-destructive-foreground font-bold'
                              : 'bg-brass text-background font-bold'
                            : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                        }`}
                      >
                        {mod > 0 ? `+${mod}` : mod}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Wyświetlacz rzutu */}
                <div className="pt-2 text-center">
                  <div
                    className={`p-3 rounded-lg border flex flex-col items-center justify-center transition-all ${
                      phase === 'done' && resolution
                        ? getOutcomeColor(resolution.sideB.outcome)
                        : 'border-border bg-card/80'
                    }`}
                  >
                    <span className="text-xs text-muted-foreground uppercase tracking-widest font-mono">
                      {phase === 'done' ? getOutcomeLabel(resolution!.sideB.outcome) : t('rolling')}
                    </span>
                    <span className="text-3xl font-mono font-extrabold tracking-tight mt-1">
                      {phase === 'rolling'
                        ? animOpponentVal
                        : phase === 'done' && resolution
                        ? resolution.sideB.total
                        : '--'}
                    </span>
                    {phase === 'done' && resolution && resolution.sideB.bonusDice !== 0 && (
                      <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        k10: [{resolution.sideB.tensResults.join(', ')}] + {resolution.sideB.unitsResult}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* WERDYKT REGIS / RAW (Widoczny po rzucie) */}
          {phase === 'done' && resolution && (
            <div
              className={`p-4 rounded-lg border transition-all duration-300 shadow-deco ${
                resolution.winner === 'sideA'
                  ? 'border-primary/60 bg-primary/10 text-foreground'
                  : resolution.winner === 'sideB'
                  ? 'border-destructive/60 bg-destructive/10 text-foreground'
                  : 'border-brass/60 bg-brass/10 text-foreground'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-md bg-card shrink-0 border border-border/60">
                  {resolution.winner === 'sideA' ? (
                    <Trophy className="w-6 h-6 text-primary" />
                  ) : resolution.winner === 'sideB' ? (
                    <Skull className="w-6 h-6 text-destructive" />
                  ) : (
                    <Scale className="w-6 h-6 text-brass" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="font-display text-sm uppercase tracking-wider font-bold">
                    {resolution.winner === 'sideA'
                      ? t('winByOutcomeRank', {
                          winner: resolution.sideA.name,
                          loser: resolution.sideB.name,
                          winnerRank: getOutcomeLabel(resolution.sideA.outcome),
                          loserRank: getOutcomeLabel(resolution.sideB.outcome),
                        })
                      : resolution.winner === 'sideB'
                      ? t('winByOutcomeRank', {
                          winner: resolution.sideB.name,
                          loser: resolution.sideA.name,
                          winnerRank: getOutcomeLabel(resolution.sideB.outcome),
                          loserRank: getOutcomeLabel(resolution.sideA.outcome),
                        })
                      : resolution.tieBreaker === 'mutual_failure'
                      ? t('mutualFailure')
                      : t('exactTie', {
                          skillValue: resolution.sideA.skillValue,
                          outcome: getOutcomeLabel(resolution.sideA.outcome),
                        })}
                  </div>
                  <p className="font-serif text-xs opacity-80 leading-relaxed text-muted-foreground">
                    {resolution.tieBreaker === 'skill_value' &&
                      t('winBySkillValue', {
                        winner: resolution.winner === 'sideA' ? resolution.sideA.name : resolution.sideB.name,
                        loser: resolution.winner === 'sideA' ? resolution.sideB.name : resolution.sideA.name,
                        winnerSkill:
                          resolution.winner === 'sideA'
                            ? resolution.sideA.skillValue
                            : resolution.sideB.skillValue,
                        loserSkill:
                          resolution.winner === 'sideA'
                            ? resolution.sideB.skillValue
                            : resolution.sideA.skillValue,
                        outcome: getOutcomeLabel(resolution.sideA.outcome),
                      })}
                    {resolution.tieBreaker === 'exact_tie' && t('rulebookTieExplanation')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* PRZYCISKI AKCJI */}
          <div className="flex items-center justify-between pt-2 border-t border-border/80">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="border-border text-muted-foreground hover:bg-muted"
            >
              {t('closeButton')}
            </Button>

            <div className="flex items-center gap-2">
              {phase === 'ready' && (
                <Button
                  type="button"
                  onClick={startRoll}
                  className="bg-brass hover:bg-brass/80 text-background font-display font-semibold tracking-wide px-5 shadow-deco flex items-center gap-2"
                >
                  <Dices className="w-4 h-4" />
                  {t('rollButton')}
                </Button>
              )}

              {phase === 'done' && resolution && (
                <>
                  {resolution.canReroll && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={startRoll}
                      className="border-brass/50 text-brass hover:bg-brass/10 flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {t('rerollButton')}
                    </Button>
                  )}
                  <Button
                    type="button"
                    onClick={handleSendToChat}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium flex items-center gap-2 shadow-deco"
                  >
                    <Send className="w-4 h-4" />
                    {t('sendToChatButton')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
