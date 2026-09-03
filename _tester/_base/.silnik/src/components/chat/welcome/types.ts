/**
 * WelcomeScreen - types module (IND-144 Wariant B sesja 130).
 * Eksportuje WelcomeScreenProps (public, używane przez parent) + Quote (shape WELCOME_QUOTES[i]).
 */

import type { Character } from '@/lib/types';

export interface DuetCharacterSlot {
  playerId: string;
  playerName: string;
  character?: {
    id: string;
    name: string;
    occupation: string;
    portraitUrl?: string;
  };
}

export interface WelcomeScreenProps {
  onUploadRules: () => void;
  onSelectAdventure: () => void;
  onSessionZero?: () => void;
  onCreateCharacter: (playerName?: string) => void;
  onPickPredefinedCharacter?: (playerName?: string) => void;
  /** Otwiera katalog dotychczasowych postaci do wyboru. */
  onPickCharacter?: (playerName?: string) => void;
  onStartGame: () => void;
  /** Nowy handler do szybkiego startu (Etap 0.5) */
  onQuickStart?: (adventureId: string, characterId: string, mode?: 'solo' | 'hot-seat') => void;
  /** Otwiera setup Hot Seat (Solo / 2 osoby) z onboardingu. */
  onChoosePlayMode?: () => void;
  onLoadSave?: () => void;
  onOpenApiKeys?: () => void;
  onColdStart?: () => void;
  hasRules?: boolean;
  hasAdventure?: boolean;
  adventureTitle?: string;
  hasSessionZero?: boolean;
  hasCharacter?: boolean;
  activeCharacter?: Character | null;
  /** C1: czy w katalogu są zapisane postacie (decyduje o kroku "Wybierz z katalogu"). */
  hasSavedCharacters?: boolean;
  /** #7: czy aktywny tryb duetu (Hot Seat 2 graczy). */
  isDuet?: boolean;
  /** Jawne miejsca gracz -> postać na ekranie startowym duetu. */
  duetCharacterSlots?: DuetCharacterSlot[];
  onOpenCharacterSheet?: (character: Character) => void;
  characters?: Character[];
  isStarting?: boolean;
  startProgress?: number;
  startStatus?: string;
}

export interface Quote {
  atmosphere: string;
  greeting: string;
  work: string;
}

