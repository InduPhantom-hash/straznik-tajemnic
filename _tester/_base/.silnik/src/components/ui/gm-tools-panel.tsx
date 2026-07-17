'use client';

import { YouTubePlayer } from './youtube-player';
import { QuickCombatTracker } from './quick-combat-tracker';
// M5 sesja 146: SFXPlayer DROPPED per D2 (ElevenLabs SoundEffect API odchodzi).

// Typy z response-parser
interface CombatState {
  isActive: boolean;
  trigger?: 'start' | 'damage_player' | 'damage_npc' | 'end';
  damage?: number;
  description?: string;
}

interface GMToolsPanelProps {
  // Ambient
  isTTSPlaying?: boolean;

  // Combat - dane z parsera odpowiedzi AI
  combatState?: CombatState | null;
  playerHP?: number;
  playerMaxHP?: number;
  playerName?: string;
}

export function GMToolsPanel({
  isTTSPlaying,
  combatState,
  playerHP,
  playerMaxHP,
  playerName,
}: GMToolsPanelProps) {
  return (
    <div className="space-y-3">
      {/* Combat Tracker - pokazuje się tylko podczas walki */}
      <QuickCombatTracker
        combatState={combatState}
        playerHP={playerHP}
        playerMaxHP={playerMaxHP}
        playerName={playerName}
      />

      {/* YouTube Player - z kontrolą głośności */}
      <YouTubePlayer isTTSPlaying={isTTSPlaying} />
    </div>
  );
}

// Re-export
export { YouTubePlayer } from './youtube-player';
export { QuickCombatTracker, STATUS_EFFECTS } from './quick-combat-tracker';

export default GMToolsPanel;
