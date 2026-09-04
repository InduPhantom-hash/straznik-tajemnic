'use client';

/**
 * @file SkillTestCard - tacka testu umiejętności CoC 7e renderowana z tagu [TEST:...].
 *
 * Odtworzony z gita (commit 30c9a44^, skasowany jako dead code w IND-140 - był odłączony
 * od początku). Przywrócony 2026-06-17 (Bug 2 playtest: "testy się nie inicjują") z pełnym
 * wiringiem: parsed.skillTests → metadata SSE → useChat (resolucja skillValue z karty) →
 * MessageCard render.
 *
 * Karta PREZENTACYJNA: pokazuje próg (wartość / ½ / ⅕ wg trudności), kości premii/kary,
 * uzasadnienie. `onRoll` opcjonalny - gdy podany, renderuje przycisk "Rzuć kością"
 * (Faza 2: otwiera DiceDialog z preselectem). Bez onRoll = gracz rzuca ręczną tacką.
 *
 * Typy canonical z @/lib/parsers/types (NIE redefiniujemy - unika driftu, TS strict).
 */

import React, { useState } from 'react';
import type { SkillTestData, SkillTestModifier } from '@/lib/parsers/types';
import { useTranslations } from 'next-intl';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Check, Dices, Swords } from 'lucide-react';
import { OpposedRollModal } from '@/components/dialogs/OpposedRollModal';

/** Kształt funkcji t() z next-intl potrzebnej helperom modułu. */
type TranslateFn = ReturnType<typeof useTranslations>;

export interface OpposedTestConfig {
  opponentName: string;
  opponentSkillName?: string;
  opponentSkillValue: number;
  opponentBonusDice?: number;
}

interface SkillTestCardProps extends SkillTestData {
  onRoll?: (testData: SkillTestData) => void;
  completed?: boolean;
  opposed?: OpposedTestConfig;
  onSendChat?: (message: string, systemContext: string) => void;
}

// === HELPERS ===

/** Oblicza próg sukcesu CoC 7e na podstawie trudności */
function calculateThreshold(
  skillValue: number,
  difficulty: SkillTestData['difficulty']
): number {
  switch (difficulty) {
    case 'zwykly':
      return skillValue;
    case 'trudny':
      return Math.floor(skillValue / 2);
    case 'ekstremalny':
      return Math.floor(skillValue / 5);
    default:
      return skillValue;
  }
}

/** Bilans kości premii/kary (bonus dodatnie, kara ujemne) */
function calculateDiceBalance(modifiers: SkillTestModifier[]): number {
  return modifiers.reduce((balance, mod) => {
    return balance + (mod.type === 'bonus' ? mod.count : -mod.count);
  }, 0);
}

/** Czytelna instrukcja rzutu wg bilansu kości */
function getDiceInstruction(t: TranslateFn, balance: number): string {
  if (balance === 0) {
    return t('rollNormal');
  } else if (balance > 0) {
    const extra =
      balance === 1
        ? t('extraTensOne')
        : t('extraTensMany', { count: balance });
    return t('rollBetter', { extra });
  } else {
    const extra =
      balance === -1
        ? t('extraTensOne')
        : t('extraTensMany', { count: Math.abs(balance) });
    return t('rollWorse', { extra });
  }
}

/** Konfiguracja badge'a trudności */
function getDifficultyBadge(
  t: TranslateFn,
  difficulty: SkillTestData['difficulty']
): {
  label: string;
  className: string;
} {
  switch (difficulty) {
    case 'zwykly':
      return { label: t('difficultyRegular'), className: 'bg-green-600 text-white' };
    case 'trudny':
      return { label: t('difficultyHard'), className: 'bg-amber-600 text-white' };
    case 'ekstremalny':
      return { label: t('difficultyExtreme'), className: 'bg-red-600 text-white' };
    default:
      return { label: t('difficultyRegular'), className: 'bg-green-600 text-white' };
  }
}

// === COMPONENT ===

export function SkillTestCard({
  id,
  skillName,
  skillValue,
  difficulty,
  modifiers,
  justification,
  characterName,
  characterId,
  groupId,
  onRoll,
  completed = false,
  opposed,
  onSendChat,
}: SkillTestCardProps) {
  const t = useTranslations('SkillTestCard');
  const [isOpposedModalOpen, setIsOpposedModalOpen] = useState(false);

  const threshold = calculateThreshold(skillValue, difficulty);
  const diceBalance = calculateDiceBalance(modifiers);
  const diceInstruction = getDiceInstruction(t, diceBalance);
  const difficultyBadge = getDifficultyBadge(t, difficulty);

  const isOpposed = Boolean(opposed);

  const handleRollClick = () => {
    if (isOpposed) {
      setIsOpposedModalOpen(true);
      return;
    }

    if (onRoll) {
      onRoll({
        id,
        skillName,
        skillValue,
        difficulty,
        modifiers,
        justification,
        characterName,
        characterId,
        groupId,
      });
    }
  };

  return (
    <div
      className={`my-4 backdrop-blur rounded-r-lg overflow-hidden shadow-lg border-l-4 ${
        isOpposed
          ? 'bg-zinc-950/90 border-brass shadow-brass/5'
          : 'bg-zinc-900/80 border-emerald-500'
      }`}
    >
      {/* Nagłówek z nazwą umiejętności i trudnością / trybem przeciwstawnym */}
      <div
        className={`flex items-center justify-between px-4 py-3 border-b ${
          isOpposed
            ? 'bg-zinc-900/80 border-brass/20'
            : 'bg-zinc-800/50 border-zinc-700'
        }`}
      >
        <div className="flex items-center gap-2">
          {isOpposed ? (
            <Swords className="w-5 h-5 text-brass" />
          ) : (
            <Dices className="w-5 h-5 text-emerald-400" />
          )}
          <span
            className={`font-bold uppercase tracking-wide ${
              isOpposed ? 'text-brass font-display' : 'text-white'
            }`}
          >
            {skillName}
          </span>
          {characterName && (
            <span className="text-xs text-pink-300">@{characterName}</span>
          )}
        </div>
        {isOpposed ? (
          <Badge className="bg-brass/20 text-brass border-brass/40 font-mono text-xs">
            {t('opposedBadge')}
          </Badge>
        ) : (
          <Badge className={difficultyBadge.className}>{difficultyBadge.label}</Badge>
        )}
      </div>

      {/* Wartość i próg */}
      <div className="px-4 py-2 border-b border-zinc-700/50 space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">{t('yourValue')}</span>
          <span className="font-mono">
            <span className="text-white font-bold">{skillValue}%</span>
            {!isOpposed && (
              <>
                <span className="text-zinc-500 mx-2">→</span>
                <span className="text-emerald-400 font-bold">
                  {t('threshold', { threshold })}
                </span>
              </>
            )}
          </span>
        </div>

        {/* Wartość przeciwnika przy teście przeciwstawnym */}
        {isOpposed && opposed && (
          <div className="flex items-center justify-between text-sm pt-1 border-t border-zinc-800/60">
            <span className="text-zinc-400">
              {t('opponentValue')} <span className="text-zinc-200 font-medium">{opposed.opponentName}</span>
              {opposed.opponentSkillName && opposed.opponentSkillName !== skillName && (
                <span className="text-xs text-zinc-500 ml-1">({opposed.opponentSkillName})</span>
              )}
            </span>
            <span className="font-mono text-rose-400 font-bold">
              {opposed.opponentSkillValue}%
            </span>
          </div>
        )}
      </div>

      {/* Modyfikatory */}
      {modifiers.length > 0 && (
        <div className="px-4 py-2 border-b border-zinc-700/50">
          <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">
            {t('modifiers')}
          </div>
          <div className="space-y-1">
            {modifiers.map((mod, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-sm"
              >
                <span className="flex items-center gap-2">
                  <span
                    className={
                      mod.type === 'bonus' ? 'text-green-400' : 'text-red-400'
                    }
                  >
                    {mod.type === 'bonus' ? '⬆️' : '⬇️'}
                  </span>
                  <span className="text-zinc-300">{mod.reason}</span>
                </span>
                <span
                  className={`font-mono ${mod.type === 'bonus' ? 'text-green-400' : 'text-red-400'}`}
                >
                  {mod.type === 'bonus'
                    ? t('bonusDiceCount', { count: mod.count })
                    : t('penaltyDiceCount', { count: mod.count })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instrukcja rzutu */}
      {!isOpposed && (
        <div className="px-4 py-3 bg-zinc-800/30 border-b border-zinc-700/50">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-amber-400">🎯</span>
            <span className="font-medium text-amber-200">{diceInstruction}</span>
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {t('orTypeInChat')}{' '}
            <span className="font-mono text-zinc-400">{t('resultExample')}</span>
          </div>
        </div>
      )}

      {/* Uzasadnienie fabularne */}
      {justification && (
        <div className="px-4 py-2 border-b border-zinc-700/50">
          <div className="flex items-start gap-2 text-sm">
            <span className="text-blue-400 mt-0.5">💡</span>
            <span className="text-zinc-400 italic">{justification}</span>
          </div>
        </div>
      )}

      {/* Przycisk Rzuć / Test Przeciwstawny */}
      {(onRoll || isOpposed) && (
        <div className="px-4 py-3 flex justify-center">
          <Button
            onClick={handleRollClick}
            disabled={completed}
            className={
              isOpposed
                ? 'bg-brass hover:bg-brass-light text-zinc-950 font-display font-semibold px-6 flex items-center gap-2 shadow-lg'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6'
            }
          >
            {completed ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                {t('resultSaved')}
              </>
            ) : isOpposed ? (
              <>
                <Swords className="w-4 h-4 mr-2" />
                {t('opposedRollButton')}
              </>
            ) : (
              <>
                <Dices className="w-4 h-4 mr-2" />
                {t('rollDiceButton')}
              </>
            )}
          </Button>
        </div>
      )}

      {/* Modal testu przeciwstawnego */}
      {isOpposed && opposed && (
        <OpposedRollModal
          open={isOpposedModalOpen}
          onOpenChange={setIsOpposedModalOpen}
          data={{
            id,
            testId: id,
            groupId,
            characterId,
            playerName: characterName || 'Badacz',
            playerSkillName: skillName,
            playerSkillValue: skillValue,
            playerBonusDice: diceBalance,
            opponentName: opposed.opponentName,
            opponentSkillName: opposed.opponentSkillName || skillName,
            opponentSkillValue: opposed.opponentSkillValue,
            opponentBonusDice: opposed.opponentBonusDice || 0,
            justification,
          }}
          onSendToChat={onSendChat}
          onComplete={() => {
            if (onRoll) {
              onRoll({
                id,
                skillName,
                skillValue,
                difficulty,
                modifiers,
                justification,
                characterName,
                characterId,
                groupId,
              });
            }
          }}
        />
      )}
    </div>
  );
}
