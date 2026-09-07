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
    hpColor = 'bg-destructive animate-pulse';
  } else if (hpPercentage <= 50) {
    hpColor = 'bg-gold';
  }

  return (
    <div className="bg-gradient-to-br from-black/90 to-red-950/40 border border-brass/40 rounded-lg p-3 space-y-2.5 shadow-lg backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-brass animate-pulse" />
          <span className="font-special-elite font-bold text-sm text-brass uppercase tracking-wider">
            {t('title')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {effectiveOutnumbered && (
            <Badge className="bg-brass/20 text-brass border-brass/40 text-[10px] flex items-center gap-1 font-special-elite">
              <Users className="w-3 h-3 text-gold" />
              {t('outnumberedBadge')}
            </Badge>
          )}
          {effectiveMajorWound && (
            <Badge className="bg-destructive/20 text-destructive-foreground border-destructive/50 text-[10px] flex items-center gap-1 animate-pulse font-special-elite">
              <Activity className="w-3 h-3 text-destructive" />
              {t('majorWoundBadge')}
            </Badge>
          )}
          {combatState.description && (
            <span className="text-xs text-muted-foreground font-special-elite italic truncate max-w-[150px]">
              {combatState.description}
            </span>
          )}
        </div>
      </div>

      {/* Player HP Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-foreground font-medium font-special-elite">
            {effectivePlayerName}
          </span>
          <span className="text-muted-foreground font-mono text-[11px]">
            {playerHP}/{playerMaxHP} HP
          </span>
        </div>
        <div className="h-2.5 bg-black/60 rounded-full overflow-hidden border border-brass/20">
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
