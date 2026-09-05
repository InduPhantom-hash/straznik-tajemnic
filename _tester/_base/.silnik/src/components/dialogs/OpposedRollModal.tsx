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
      return 'text-yellow-400 border-yellow-500/50 bg-yellow-950/40';
    case 'extreme':
      return 'text-purple-400 border-purple-500/50 bg-purple-950/40';
    case 'hard':
      return 'text-emerald-400 border-emerald-500/50 bg-emerald-950/40';
    case 'regular':
      return 'text-blue-400 border-blue-500/50 bg-blue-950/40';
    case 'fail':
      return 'text-rose-400 border-rose-500/50 bg-rose-950/40';
    case 'fumble':
      return 'text-red-500 border-red-600/60 bg-red-950/60 font-bold';
    default:
      return 'text-zinc-300 border-zinc-700 bg-zinc-900';
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
      <DialogContent size="wide" className="w-[86vw] max-w-[1280px] max-h-[85vh] border-brass/50 bg-zinc-950/95 text-zinc-100 shadow-2xl backdrop-blur-md p-0 overflow-hidden flex flex-col">
        {/* Nagłówek Dark Art Déco */}
        <DialogHeader className="border-b border-brass/30 bg-zinc-900/80 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-brass/10 border border-brass/30 text-brass">
                <Swords className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="font-display text-lg tracking-wider text-brass uppercase">
                  {t('title')}
                </DialogTitle>
                <DialogDescription className="font-serif text-xs text-zinc-400 italic">
                  {t('subtitle')}
                </DialogDescription>
              </div>
            </div>
            <Badge className="bg-brass/15 text-brass border-brass/30 font-mono text-xs">
              CoC 7e RAW
            </Badge>
          </div>
          {data.justification && (
            <div className="mt-2 text-xs font-serif text-zinc-300 italic bg-zinc-900/50 p-2 rounded border border-zinc-800">
              💡 {data.justification}
            </div>
          )}
        </DialogHeader>

        {/* Zawartość: Dwie Kolumny (Gracz vs Przeciwnik) */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
            {/* Ikona VS pośrodku */}
            <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-zinc-900 border border-brass/40 items-center justify-center text-brass z-10 text-xs font-bold font-display shadow-lg">
              VS
            </div>

            {/* LEWA KOLUMNA: BADACZ */}
            <Card className="border-brass/30 bg-zinc-900/40 overflow-hidden">
              <div className="bg-zinc-800/60 px-4 py-2.5 border-b border-brass/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-400" />
                  <span className="font-display text-sm font-bold text-zinc-100">
                    {data.playerName}
                  </span>
                </div>
                <Badge className="text-[10px] bg-emerald-950/60 text-emerald-300 border-emerald-700/50">
                  {t('playerLabel')}
                </Badge>
              </div>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">{data.playerSkillName}:</span>
                  <span className="font-mono font-bold text-emerald-300 text-base">
                    {data.playerSkillValue}%
                  </span>
                </div>

                {/* Progi sukcesu */}
                <div className="grid grid-cols-3 gap-1 text-[11px] font-mono text-center bg-zinc-950/60 p-2 rounded border border-zinc-800">
                  <div>
                    <span className="text-zinc-500 block">{t('thresholdRegular')}</span>
                    <span className="text-blue-300 font-semibold">
                      ≤{playerThresholds.regular}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">{t('thresholdHard')}</span>
                    <span className="text-emerald-300 font-semibold">
                      ≤{playerThresholds.hard}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">{t('thresholdExtreme')}</span>
                    <span className="text-purple-300 font-semibold">
                      ≤{playerThresholds.extreme}
                    </span>
                  </div>
                </div>

                {/* Kości premiowe / karne */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-zinc-400">{t('bonusDice')}:</span>
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
                              ? 'bg-emerald-600 text-white font-bold'
                              : mod < 0
                              ? 'bg-rose-600 text-white font-bold'
                              : 'bg-brass text-zinc-950 font-bold'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
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
                        : 'border-zinc-800 bg-zinc-950/70'
                    }`}
                  >
                    <span className="text-xs text-zinc-400 uppercase tracking-widest font-mono">
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
                      <span className="text-[10px] text-zinc-400 font-mono mt-0.5">
                        k10: [{resolution.sideA.tensResults.join(', ')}] + {resolution.sideA.unitsResult}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* PRAWA KOLUMNA: PRZECIWNIK */}
            <Card className="border-brass/30 bg-zinc-900/40 overflow-hidden">
              <div className="bg-zinc-800/60 px-4 py-2.5 border-b border-brass/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skull className="w-4 h-4 text-rose-400" />
                  <span className="font-display text-sm font-bold text-zinc-100">
                    {data.opponentName}
                  </span>
                </div>
                <Badge className="text-[10px] bg-rose-950/60 text-rose-300 border-rose-700/50">
                  {t('opponentLabel')}
                </Badge>
              </div>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">{data.opponentSkillName}:</span>
                  <span className="font-mono font-bold text-rose-300 text-base">
                    {data.opponentSkillValue}%
                  </span>
                </div>

                {/* Progi sukcesu */}
                <div className="grid grid-cols-3 gap-1 text-[11px] font-mono text-center bg-zinc-950/60 p-2 rounded border border-zinc-800">
                  <div>
                    <span className="text-zinc-500 block">{t('thresholdRegular')}</span>
                    <span className="text-blue-300 font-semibold">
                      ≤{opponentThresholds.regular}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">{t('thresholdHard')}</span>
                    <span className="text-emerald-300 font-semibold">
                      ≤{opponentThresholds.hard}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">{t('thresholdExtreme')}</span>
                    <span className="text-purple-300 font-semibold">
                      ≤{opponentThresholds.extreme}
                    </span>
                  </div>
                </div>

                {/* Kości premiowe / karne */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-zinc-400">{t('bonusDice')}:</span>
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
                              ? 'bg-emerald-600 text-white font-bold'
                              : mod < 0
                              ? 'bg-rose-600 text-white font-bold'
                              : 'bg-brass text-zinc-950 font-bold'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
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
                        : 'border-zinc-800 bg-zinc-950/70'
                    }`}
                  >
                    <span className="text-xs text-zinc-400 uppercase tracking-widest font-mono">
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
                      <span className="text-[10px] text-zinc-400 font-mono mt-0.5">
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
              className={`p-4 rounded-lg border transition-all duration-300 ${
                resolution.winner === 'sideA'
                  ? 'border-emerald-500/60 bg-emerald-950/40 text-emerald-100'
                  : resolution.winner === 'sideB'
                  ? 'border-rose-500/60 bg-rose-950/40 text-rose-100'
                  : 'border-amber-500/60 bg-amber-950/40 text-amber-100'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-md bg-zinc-950/60 shrink-0">
                  {resolution.winner === 'sideA' ? (
                    <Trophy className="w-6 h-6 text-emerald-400" />
                  ) : resolution.winner === 'sideB' ? (
                    <Skull className="w-6 h-6 text-rose-400" />
                  ) : (
                    <Scale className="w-6 h-6 text-amber-400" />
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
                  <p className="font-serif text-xs opacity-80 leading-relaxed">
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
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              {t('closeButton')}
            </Button>

            <div className="flex items-center gap-2">
              {phase === 'ready' && (
                <Button
                  type="button"
                  onClick={startRoll}
                  className="bg-brass hover:bg-brass-light text-zinc-950 font-display font-semibold tracking-wide px-5 shadow-lg flex items-center gap-2"
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
                      className="border-amber-500/50 text-amber-300 hover:bg-amber-950/40 flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {t('rerollButton')}
                    </Button>
                  )}
                  <Button
                    type="button"
                    onClick={handleSendToChat}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-2 shadow-lg"
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
