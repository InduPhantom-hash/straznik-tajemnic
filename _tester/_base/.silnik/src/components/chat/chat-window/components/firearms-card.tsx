'use client';

/**
 * @file firearms-card.tsx
 * Karta ataku bronią palną i reakcji Dive for Cover (Padnij za osłonę) CoC 7e RAW (Rozdz. 6, s. 123-128).
 * Wyświetlana w oknie czatu po wykryciu znacznika [WALKA_STRZAŁ:...].
 * Estetyka: Dark Art Déco Fiction First.
 */

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Crosshair,
  ShieldAlert,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Skull,
} from 'lucide-react';
import { rollD100WithBonus, evaluateSkillCheck } from '@/lib/dice-utils';
import type { Character, FirearmsAttackEventData } from '@/lib/types';

export interface FirearmsCardProps {
  firearmEvent: FirearmsAttackEventData;
  activeCharacter?: Character | null;
  completed?: boolean;
  onCharacterUpdate?: (character: Character) => void;
  onSendChat?: (resultMessage: string) => void;
}

export const FirearmsCard: React.FC<FirearmsCardProps> = ({
  firearmEvent,
  activeCharacter,
  completed = false,
  onCharacterUpdate,
  onSendChat,
}) => {
  const [isResolved, setIsResolved] = useState<boolean>(completed);
  const [diveResult, setDiveResult] = useState<{
    dodgeSuccess: boolean;
    dodgeRoll: number;
    dodgeThreshold: number;
    description: string;
  } | null>(null);

  const isPointBlank = firearmEvent.distanceCategory === 'point_blank';
  const dodgeSkill = activeCharacter?.skills?.['Unik'] ?? activeCharacter?.skills?.['Dodge'] ?? Math.floor((activeCharacter?.dex ?? 50) / 2);

  const handleDiveForCover = () => {
    if (isResolved) return;

    // Rzut na Unik
    const roll = rollD100WithBonus(0);
    const outcome = evaluateSkillCheck(roll.total, dodgeSkill);
    const success = outcome !== 'failure' && outcome !== 'fumble';

    // Aktualizacja stanu Badacza: padnięcie na ziemię (isProne = true)
    if (activeCharacter && onCharacterUpdate) {
      onCharacterUpdate({
        ...activeCharacter,
        isProne: true,
      });
    }

    const resultDesc = success
      ? `Badacz rzuca się za osłonę (Unik ${roll.total} vs ${dodgeSkill}: SUKCES). Strzelec traci kość premiową z przyłożenia! Badacz leży na ziemi (utrata następnej akcji).`
      : `Badacz próbuje rzucić się za osłonę (Unik ${roll.total} vs ${dodgeSkill}: PORAŻKA). Badacz ląduje na ziemi, a strzelec zachowuje przewagę!`;

    setDiveResult({
      dodgeSuccess: success,
      dodgeRoll: roll.total,
      dodgeThreshold: dodgeSkill,
      description: resultDesc,
    });
    setIsResolved(true);

    if (onSendChat) {
      onSendChat(
        `[WYNIK_STRZAŁU: ${firearmEvent.shooterName} -> ${firearmEvent.characterName || 'Badacz'} | DiveForCover=${success ? 'SUKCES' : 'PORAŻKA'} | rzut=${roll.total}/${dodgeSkill} | stan=leży_na_ziemi]`
      );
    }
  };

  const handleBrace = () => {
    if (isResolved) return;

    setIsResolved(true);
    setDiveResult({
      dodgeSuccess: false,
      dodgeRoll: 0,
      dodgeThreshold: 0,
      description: 'Badacz przyjmuje pozycję i nie wykonuje skoku za osłonę. Strzelec oddaje strzał zgodnie z dystansem.',
    });

    if (onSendChat) {
      onSendChat(
        `[WYNIK_STRZAŁU: ${firearmEvent.shooterName} -> ${firearmEvent.characterName || 'Badacz'} | DiveForCover=BRAK]`
      );
    }
  };

  return (
    <Card className="border border-red-950/60 bg-gradient-to-br from-zinc-950 via-stone-900 to-red-950/30 text-stone-200 shadow-xl overflow-hidden my-3">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-red-900/40 pb-2">
          <div className="flex items-center gap-2">
            <Crosshair className="w-5 h-5 text-red-500 animate-pulse" />
            <h4 className="font-serif text-sm tracking-wide text-red-200 uppercase font-semibold">
              Atak Bronią Palną (CoC 7e RAW)
            </h4>
          </div>
          <Badge variant="outline" className="border-red-800 text-red-400 bg-red-950/40 text-xs">
            {isPointBlank ? 'Przyłożenie (Point-Blank: +1K premiowa)' : `Dystans: ${firearmEvent.distanceCategory || 'standard'}`}
          </Badge>
        </div>

        <div className="text-xs text-stone-300 space-y-1 bg-black/40 p-2.5 rounded border border-stone-800/60 font-mono">
          <div className="flex justify-between">
            <span className="text-stone-400">Strzelec:</span>
            <span className="font-semibold text-stone-200">{firearmEvent.shooterName} ({firearmEvent.shooterSkill}%)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-400">Broń:</span>
            <span className="text-amber-300 font-semibold">{firearmEvent.weaponName} (Obrażenia: {firearmEvent.damageFormula})</span>
          </div>
          {firearmEvent.bulletsFired && firearmEvent.bulletsFired > 1 && (
            <div className="flex justify-between text-amber-400/90">
              <span>Seria / Pociski:</span>
              <span>{firearmEvent.bulletsFired} kul</span>
            </div>
          )}
          {firearmEvent.description && (
            <p className="font-sans italic text-stone-400 text-xs mt-1 pt-1 border-t border-stone-800/40">
              "{firearmEvent.description}"
            </p>
          )}
        </div>

        {!isResolved ? (
          <div className="pt-1 space-y-2">
            <div className="flex items-center gap-2 text-xs text-amber-400/90 font-sans">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                {isPointBlank
                  ? 'Strzelec celuje z przyłożenia! Możesz paść za osłonę (Dive for Cover), aby znieść jego kość premiową kosztem leżenia na ziemi.'
                  : 'Możesz spróbować uskoczyć za osłonę (test Uniku) kosztem padnięcia na ziemię.'}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                className="flex-1 bg-red-900/80 hover:bg-red-800 text-xs font-serif tracking-wider"
                onClick={handleDiveForCover}
              >
                <ShieldAlert className="w-3.5 h-3.5 mr-1.5" />
                Padnij za osłonę (Unik: {dodgeSkill}%)
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-stone-700 hover:bg-stone-800 text-stone-300 text-xs font-serif"
                onClick={handleBrace}
              >
                Przyjmij strzał
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-2.5 rounded bg-stone-900/80 border border-stone-800 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-stone-200">
              {diveResult?.dodgeSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Skok za osłonę udany</span>
                </>
              ) : diveResult?.dodgeRoll ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-400">Porażka w skoku za osłonę</span>
                </>
              ) : (
                <span className="text-stone-400">Brak reakcji obronnej</span>
              )}
            </div>
            <p className="text-stone-300 font-sans">{diveResult?.description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
