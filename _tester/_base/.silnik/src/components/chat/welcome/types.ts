/**
 * WelcomeScreen - types module (IND-144 Wariant B sesja 130).
 * Eksportuje WelcomeScreenProps (public, używane przez parent) + Quote (shape WELCOME_QUOTES[i]).
 */

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
  /** C1 (Hot Seat): otwiera katalog dotychczasowych postaci do wyboru. */
  onPickCharacter?: (playerName?: string) => void;
  onStartGame: () => void;
  /** #7: otwiera setup Hot Seat (Solo / 2 osoby) z onboardingu. */
  onChoosePlayMode?: () => void;
  onLoadSave?: () => void;
  onOpenApiKeys?: () => void;
  onColdStart?: () => void;
  hasRules?: boolean;
  hasAdventure?: boolean;
  adventureTitle?: string;
  hasSessionZero?: boolean;
  hasCharacter?: boolean;
  /** C1: czy w katalogu są zapisane postacie (decyduje o kroku "Wybierz z katalogu"). */
  hasSavedCharacters?: boolean;
  /** #7: czy aktywny tryb duetu (Hot Seat 2 graczy). */
  isDuet?: boolean;
  /** Jawne miejsca gracz -> postać na ekranie startowym duetu. */
  duetCharacterSlots?: DuetCharacterSlot[];
}

export interface Quote {
  atmosphere: string;
  greeting: string;
  work: string;
}
