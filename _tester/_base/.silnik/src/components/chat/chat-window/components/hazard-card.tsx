'use client';

/**
 * @file hazard-card.tsx
 * Karta reakcji na zagrożenie fizyczne lub toksynę w oknie czatu (Fiction First).
 * Estetyka: Dark Art Déco.
 */

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Flame,
  Skull,
  Wind,
  ArrowDownCircle,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';
import { HazardDialog } from '@/components/dialogs/HazardDialog';
import type { HazardEventData } from '@/lib/types';

export interface HazardCardProps {
  hazard: HazardEventData;
  playerCon?: number;
  playerJump?: number;
  playerDodge?: number;
  playerName?: string;
  completed?: boolean;
  onApplyDamage?: (damage: number, reason: string) => void;
  onSendChat?: (message: string) => void;
}

export function HazardCard({
  hazard,
  playerCon = 50,
  playerJump = 20,
  playerDodge = 25,
  playerName = 'Badacz',
  completed = false,
  onApplyDamage,
  onSendChat,
}: HazardCardProps) {
  const t = useTranslations('Hazards');
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(completed);

  const getHazardIcon = () => {
    switch (hazard.type) {
      case 'fire':
      case 'acid':
        return <Flame className="w-5 h-5 text-amber-500 animate-pulse" />;
      case 'poison':
        return <Skull className="w-5 h-5 text-emerald-500" />;
      case 'suffocation':
      case 'drowning':
        return <Wind className="w-5 h-5 text-cyan-400" />;
      case 'falling':
      default:
        return <ArrowDownCircle className="w-5 h-5 text-red-400" />;
    }
  };

  const getHazardTypeLabel = () => {
    switch (hazard.type) {
      case 'fire':
        return t('typeFire');
      case 'acid':
        return t('typeAcid');
      case 'poison':
        return t('typePoison');
      case 'suffocation':
        return t('typeSuffocation');
      case 'drowning':
        return t('typeDrowning');
      case 'falling':
      default:
        return t('typeFalling');
    }
  };

  return (
    <>
      <Card className="my-2 border border-red-900/50 bg-zinc-950/80 shadow-md backdrop-blur-sm">
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded bg-zinc-900 border border-zinc-800 mt-0.5">
                {getHazardIcon()}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-serif text-sm font-semibold tracking-wide text-amber-200">
                    {getHazardTypeLabel()}
                  </span>
                  {hazard.fallHeightMeters && (
                    <Badge variant="outline" className="text-xs border-amber-800/60 text-amber-400">
                      {hazard.fallHeightMeters}m
                    </Badge>
                  )}
                  {hazard.poisonName && (
                    <Badge variant="outline" className="text-xs border-emerald-800/60 text-emerald-400 font-mono">
                      {hazard.poisonName}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {hazard.description}
                </p>
                {hazard.defensiveSkill && (
                  <p className="text-[11px] text-amber-400/90 font-mono">
                    🛡️ {t('suggestedDefense')}: <strong>{hazard.defensiveSkill}</strong>
                  </p>
                )}
              </div>
            </div>

            <div>
              {isCompleted ? (
                <Badge variant="outline" className="bg-emerald-950/50 text-emerald-400 border-emerald-800 text-xs py-1 px-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t('resolved')}
                </Badge>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setIsDialogOpen(true)}
                  className="bg-amber-800 hover:bg-amber-700 text-amber-100 font-medium text-xs shadow"
                >
                  <ShieldAlert className="w-3.5 h-3.5 mr-1.5" />
                  {t('actionDefend')}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <HazardDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        hazard={hazard}
        playerCon={playerCon}
        playerJump={playerJump}
        playerDodge={playerDodge}
        playerName={playerName}
        onApplyDamage={onApplyDamage}
        onSendToChat={onSendChat}
        onComplete={() => setIsCompleted(true)}
      />
    </>
  );
}
