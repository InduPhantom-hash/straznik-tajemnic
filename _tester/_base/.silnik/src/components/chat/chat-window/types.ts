/**
 * @file ChatWindowProps - typy propsów dla głównego komponentu czatu (IND-144 Wariant C, sesja 131).
 *
 * Extracted z `ChatWindow.tsx` jako pierwszy mikrokomit splittu 438→<200 lin.
 * Plik leaf module bez `'use client'` (czysty TS, brak JSX).
 *
 * Sesja 132 (D9 follow-up): drop 11 dead propsów (activeGameState, voiceEnabled,
 * setVoiceEnabled, isGeneratingVoice, isNarratorOnly, setIsNarratorOnly,
 * queueStatus, setIsTTSEnabled, voiceFeatureAvailable, onCharacterChange,
 * handleKeyPress) - destructured w refaktorze 1:1 ale nigdy używane w JSX.
 */

import type { HotSeatConfig, Message, Character } from '@/lib/types';
import type { DiceRoll } from '@/lib/dice-utils';

export interface ChatWindowProps {
  // Messages + input
  messages: Message[];
  newMessage: string;
  setNewMessage: (message: string) => void;
  handleSendMessage: (message: string) => void;

  // TTS state + controls (subset faktycznie używany w MessageCard)
  currentAudio: HTMLAudioElement | null;
  stopCurrentAudio: () => void;
  toggleAudioPause?: () => void;
  isAudioPaused?: boolean;
  isTTSEnabled: boolean;

  // Character
  activeCharacter: Character | null;
  characters?: Character[];
  /** D1: zapisuje rzut Tacki ([TEST:]) do dziennika postaci (most appendRollToJournal). */
  onJournalRoll?: (roll: DiceRoll, justification?: string) => void;
  /** D1: odejmuje wydane pkt Szczęścia z karty postaci (CoC 7e Faza 5B). */
  onSpendLuck?: (amount: number) => void;

  // Onboarding callbacks + state flags
  onUploadRules?: () => void;
  onSelectAdventure?: () => void;
  onSessionZero?: () => void;
  onCreateCharacter?: () => void;
  /** C1 (Hot Seat): otwiera katalog dotychczasowych postaci ("Wybierz z katalogu"). */
  onPickCharacter?: () => void;
  onStartGame?: () => void;
  /** #7: otwiera setup Hot Seat (Solo / 2 osoby) z onboardingu. */
  onChoosePlayMode?: () => void;
  onLoadSave?: () => void;
  onOpenApiKeys?: () => void;
  hasRules?: boolean;
  hasAdventure?: boolean;
  adventureTitle?: string;
  adventureDescription?: string;
  /** 3H: region przygody (`adventureContext.location`) - lewa część pineski "region · miejsce". */
  region?: string;
  /** IND-267: bieżące MIEJSCE bohatera (pineska 📍 w headerze obok tytułu/zegara). */
  currentLocation?: string;
  hasSessionZero?: boolean;
  hasStartedGame?: boolean;

  // Hot Seat
  hotSeatConfig?: HotSeatConfig;

  // Dziennik - podsumowanie sceny
  onSummarizeScene?: () => Promise<void>;
  isSummarizingScene?: boolean;

  // Loading
  isLoading?: boolean;

  // === C4 (duet): bufor deklaracji + wysyłka tury ===
  /** Czy tryb dla dwojga (Hot Seat 2 graczy) - Enter dokłada deklarację zamiast wysyłać. */
  isDuet?: boolean;
  pendingDeclarations?: {
    playerId: string;
    playerName: string;
    characterName?: string;
    text: string;
  }[];
  playersAwaitingDeclaration?: { id: string; name: string }[];
  onAddDeclaration?: (text: string) => void;
  onSendTurn?: () => void;
}
