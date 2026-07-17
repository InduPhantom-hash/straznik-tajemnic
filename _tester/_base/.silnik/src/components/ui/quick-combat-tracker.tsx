'use client';

interface CombatParticipant {
  id: string;
  name: string;
  type: 'pc' | 'npc' | 'monster';
  currentHP: number;
  maxHP: number;
  isCurrentTurn?: boolean;
}

interface CombatState {
  isActive: boolean;
  trigger?: 'start' | 'damage_player' | 'damage_npc' | 'end';
  damage?: number;
  description?: string;
}

interface QuickCombatTrackerProps {
  combatState?: CombatState | null;
  playerHP?: number;
  playerMaxHP?: number;
  playerName?: string;
}

export function QuickCombatTracker({
  combatState,
  playerHP = 10,
  playerMaxHP = 10,
  playerName = 'Badacz',
}: QuickCombatTrackerProps) {
  // Jeśli nie ma aktywnej walki - nie pokazuj nic
  if (!combatState?.isActive) {
    return null;
  }

  const hpPercentage = Math.max(0, Math.min(100, (playerHP / playerMaxHP) * 100));
  
  // Kolor paska HP
  let hpColor = 'bg-green-500';
  if (hpPercentage <= 25) {
    hpColor = 'bg-red-500 animate-pulse';
  } else if (hpPercentage <= 50) {
    hpColor = 'bg-yellow-500';
  }

  return (
    <div className="bg-gradient-to-br from-red-900/40 to-orange-900/40 border border-red-500/40 rounded-lg p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg animate-pulse">⚔️</span>
          <span className="font-bold text-red-200">WALKA</span>
        </div>
        {combatState.description && (
          <span className="text-xs text-red-300/70">{combatState.description}</span>
        )}
      </div>

      {/* Player HP Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-red-100">{playerName}</span>
          <span className="text-red-200 font-mono">{playerHP}/{playerMaxHP} HP</span>
        </div>
        <div className="h-4 bg-red-900/50 rounded-full overflow-hidden">
          <div
            className={`h-full ${hpColor} transition-all duration-500`}
            style={{ width: `${hpPercentage}%` }}
          />
        </div>
      </div>

      {/* Damage indicator */}
      {combatState.trigger === 'damage_player' && combatState.damage && (
        <div className="text-center py-1 bg-red-600/30 rounded text-red-200 text-sm animate-pulse">
          💥 -{combatState.damage} HP
        </div>
      )}

      {/* Status */}
      {hpPercentage <= 25 && (
        <div className="text-center text-xs text-red-300 bg-red-900/30 rounded py-1">
          ⚠️ Stan krytyczny!
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
