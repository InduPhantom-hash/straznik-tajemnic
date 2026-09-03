'use client';

/**
 * @file quick-combat-tracker.tsx
 * Kompaktowy pasek statusu walki w stylu Dark Art Déco z obsługą przewagi liczebnej i ran ciężkich.
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import { Swords, Users, Activity, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface CombatParticipant {
  id: string;
  name: string;
  type: 'pc' | 'npc' | 'monster';
  currentHP: number;
  maxHP: number;
  isCurrentTurn?: boolean;
}

export interface CombatState {
  isActive: boolean;
  trigger?: 'start' | 'damage_player' | 'damage_npc' | 'end';
  damage?: number;
  description?: string;
  isOutnumbered?: boolean;
  defensesUsedThisRound?: number;
  hasMajorWound?: boolean;
}

export interface QuickCombatTrackerProps {
  combatState?: CombatState | null;
  playerHP?: number;
  playerMaxHP?: number;
  playerName?: string;
  isOutnumbered?: boolean;
  defensesUsedThisRound?: number;
  hasMajorWound?: boolean;
}

export function QuickCombatTracker({
  combatState,
  playerHP = 10,
  playerMaxHP = 10,
  playerName,
  isOutnumbered = false,
  defensesUsedThisRound = 0,
  hasMajorWound = false,
}: QuickCombatTrackerProps) {
  const t = useTranslations('QuickCombatTracker');

  // Jeśli nie ma aktywnej walki - nie pokazuj nic
  if (!combatState?.isActive) {
    return null;
  }

  const effectivePlayerName = playerName || t('playerName');
  const hpPercentage = Math.max(
    0,
    Math.min(100, (playerHP / playerMaxHP) * 100)
  );

  const effectiveOutnumbered =
    isOutnumbered ||
    Boolean(combatState.isOutnumbered) ||
    defensesUsedThisRound >= 1 ||
    (combatState.defensesUsedThisRound ?? 0) >= 1;

  const effectiveMajorWound =
    hasMajorWound || Boolean(combatState.hasMajorWound);

  // Kolor paska HP
  let hpColor = 'bg-emerald-600';
  if (hpPercentage <= 25) {
    hpColor = 'bg-red-600 animate-pulse';
  } else if (hpPercentage <= 50) {
    hpColor = 'bg-amber-600';
  }

  return (
    <div className="bg-gradient-to-br from-zinc-950/90 to-red-950/40 border border-brass/30 rounded-lg p-3 space-y-2.5 shadow-lg backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-brass animate-pulse" />
          <span className="font-display font-bold text-sm text-brass uppercase tracking-wider">
            {t('title')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {effectiveOutnumbered && (
            <Badge className="bg-amber-950/70 text-amber-300 border-amber-500/40 text-[10px] flex items-center gap-1">
              <Users className="w-3 h-3 text-amber-400" />
              {t('outnumberedBadge')}
            </Badge>
          )}
          {effectiveMajorWound && (
            <Badge className="bg-red-950/80 text-red-200 border-red-500/50 text-[10px] flex items-center gap-1 animate-pulse">
              <Activity className="w-3 h-3 text-red-400" />
              {t('majorWoundBadge')}
            </Badge>
          )}
          {combatState.description && (
            <span className="text-xs text-zinc-400 font-serif italic truncate max-w-[150px]">
              {combatState.description}
            </span>
          )}
        </div>
      </div>

      {/* Player HP Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-200 font-medium font-serif">
            {effectivePlayerName}
          </span>
          <span className="text-zinc-300 font-mono text-[11px]">
            {playerHP}/{playerMaxHP} HP
          </span>
        </div>
        <div className="h-2.5 bg-zinc-900/80 rounded-full overflow-hidden border border-zinc-800">
          <div
            className={`h-full ${hpColor} transition-all duration-500`}
            style={{ width: `${hpPercentage}%` }}
          />
        </div>
      </div>

      {/* Damage indicator */}
      {combatState.trigger === 'damage_player' &&
        typeof combatState.damage === 'number' && (
          <div className="text-center py-1 bg-red-950/60 border border-red-500/30 rounded text-red-200 text-xs animate-pulse font-serif">
            {t('damageDealt', { damage: combatState.damage })}
          </div>
        )}

      {/* Status */}
      {hpPercentage <= 25 && (
        <div className="text-center text-xs text-red-300 bg-red-950/40 border border-red-700/40 rounded py-1 flex items-center justify-center gap-1 font-serif">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          {t('criticalCondition')}
        </div>
      )}
    </div>
  );
}

// Eksport dla kompatybilności
export const STATUS_EFFECTS = [
  { id: 'stunned', name: 'Oszołomiony', icon: '💫' },
  { id: 'frightened', name: 'Przerażony', icon: '😱' },
  { id: 'unconscious', name: 'Nieprzytomny', icon: '😵' },
] as const;

export default QuickCombatTracker;
