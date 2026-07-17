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

import type { SkillTestData, SkillTestModifier } from '@/lib/parsers/types';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Check, Dices } from 'lucide-react';

interface SkillTestCardProps extends SkillTestData {
  onRoll?: (testData: SkillTestData) => void;
  completed?: boolean;
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
function getDiceInstruction(balance: number): string {
  if (balance === 0) {
    return 'Rzuć 1d100 (normalny rzut)';
  } else if (balance > 0) {
    const extra =
      balance === 1 ? '1 dodatkowa dziesiątka' : `${balance} dodatkowe dziesiątki`;
    return `Rzuć 1d100 + ${extra}, wybierz lepszy wynik`;
  } else {
    const extra =
      balance === -1
        ? '1 dodatkowa dziesiątka'
        : `${Math.abs(balance)} dodatkowe dziesiątki`;
    return `Rzuć 1d100 + ${extra}, wybierz gorszy wynik`;
  }
}

/** Konfiguracja badge'a trudności */
function getDifficultyBadge(difficulty: SkillTestData['difficulty']): {
  label: string;
  className: string;
} {
  switch (difficulty) {
    case 'zwykly':
      return { label: 'ZWYKŁY', className: 'bg-green-600 text-white' };
    case 'trudny':
      return { label: 'TRUDNY ½', className: 'bg-amber-600 text-white' };
    case 'ekstremalny':
      return { label: 'EKSTREMALNY ⅕', className: 'bg-red-600 text-white' };
    default:
      return { label: 'ZWYKŁY', className: 'bg-green-600 text-white' };
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
}: SkillTestCardProps) {
  const threshold = calculateThreshold(skillValue, difficulty);
  const diceBalance = calculateDiceBalance(modifiers);
  const diceInstruction = getDiceInstruction(diceBalance);
  const difficultyBadge = getDifficultyBadge(difficulty);

  const handleRollClick = () => {
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
    <div className="my-4 bg-zinc-900/80 backdrop-blur border-l-4 border-emerald-500 rounded-r-lg overflow-hidden shadow-lg">
      {/* Nagłówek z nazwą umiejętności i trudnością */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-800/50 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <Dices className="w-5 h-5 text-emerald-400" />
          <span className="font-bold text-white uppercase tracking-wide">
            {skillName}
          </span>
          {characterName && (
            <span className="text-xs text-pink-300">@{characterName}</span>
          )}
        </div>
        <Badge className={difficultyBadge.className}>{difficultyBadge.label}</Badge>
      </div>

      {/* Wartość i próg */}
      <div className="px-4 py-2 border-b border-zinc-700/50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">Twoja wartość:</span>
          <span className="font-mono">
            <span className="text-white font-bold">{skillValue}%</span>
            <span className="text-zinc-500 mx-2">→</span>
            <span className="text-emerald-400 font-bold">Próg: ≤{threshold}</span>
          </span>
        </div>
      </div>

      {/* Modyfikatory */}
      {modifiers.length > 0 && (
        <div className="px-4 py-2 border-b border-zinc-700/50">
          <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">
            Modyfikatory:
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
                  {mod.count} kość {mod.type === 'bonus' ? 'bonusowa' : 'karna'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instrukcja rzutu */}
      <div className="px-4 py-3 bg-zinc-800/30 border-b border-zinc-700/50">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-amber-400">🎯</span>
          <span className="font-medium text-amber-200">{diceInstruction}</span>
        </div>
        <div className="text-xs text-zinc-500 mt-1">
          lub wpisz wynik w czacie:{' '}
          <span className="font-mono text-zinc-400">&quot;wynik 47&quot;</span>
        </div>
      </div>

      {/* Uzasadnienie fabularne */}
      <div className="px-4 py-2 border-b border-zinc-700/50">
        <div className="flex items-start gap-2 text-sm">
          <span className="text-blue-400 mt-0.5">💡</span>
          <span className="text-zinc-400 italic">{justification}</span>
        </div>
      </div>

      {/* Przycisk Rzuć (Faza 2 - tylko gdy onRoll podany) */}
      {onRoll && (
        <div className="px-4 py-3 flex justify-center">
          <Button
            onClick={handleRollClick}
            disabled={completed}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6"
          >
            {completed ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Wynik zapisany
              </>
            ) : (
              <>
                <Dices className="w-4 h-4 mr-2" />
                Rzuć kością
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
