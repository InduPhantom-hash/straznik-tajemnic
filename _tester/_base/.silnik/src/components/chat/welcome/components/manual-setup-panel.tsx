'use client';

import type { FC } from 'react';
import {
  ArrowLeft,
  Settings,
  User,
  Users,
  BookOpen,
  Sparkles,
  Play,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  FolderOpen,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SafeImage } from '@/components/ui/safe-image';
import type { Character } from '@/lib/types';
import type { DuetCharacterSlot } from '../types';

export interface ManualSetupPanelProps {
  onBack: () => void;
  onChoosePlayMode?: () => void;
  onSelectAdventure: () => void;
  hasAdventure?: boolean;
  adventureTitle?: string;
  onCreateCharacter: (playerName?: string) => void;
  onPickPredefinedCharacter?: (playerName?: string) => void;
  onPickCharacter?: (playerName?: string) => void;
  hasCharacter?: boolean;
  activeCharacter?: Character | null;
  hasSavedCharacters?: boolean;
  isDuet?: boolean;
  duetCharacterSlots?: DuetCharacterSlot[];
  onSessionZero?: () => void;
  hasSessionZero?: boolean;
  onStartGame: () => void;
}

export const ManualSetupPanel: FC<ManualSetupPanelProps> = ({
  onBack,
  onChoosePlayMode,
  onSelectAdventure,
  hasAdventure = false,
  adventureTitle,
  onCreateCharacter,
  onPickPredefinedCharacter,
  onPickCharacter,
  hasCharacter = false,
  activeCharacter,
  hasSavedCharacters = false,
  isDuet = false,
  duetCharacterSlots = [],
  onSessionZero,
  hasSessionZero = false,
  onStartGame,
}) => {
  const isReady = Boolean(hasAdventure && hasCharacter);

  const displaySlots: DuetCharacterSlot[] =
    duetCharacterSlots && duetCharacterSlots.length > 0
      ? duetCharacterSlots
      : [
          { playerId: 'player1', playerName: 'Gracz 1' },
          { playerId: 'player2', playerName: 'Gracz 2' },
        ];

  return (
    <div className="deco-corners relative w-full max-w-4xl mx-auto p-6 md:p-8 border border-brass/50 bg-gradient-to-br from-[#1a1610] to-[#100d09] shadow-[0_0_30px_rgba(201,162,39,0.08)] z-20 text-left">
      {/* Przycisk powrotu */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 font-display text-xs uppercase tracking-[0.16em] text-brass/80 hover:text-brass transition-colors mb-6 cursor-pointer group"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        <span>Wróć do wyboru trybu</span>
      </button>

      {/* Nagłówek panelu */}
      <div className="border-b border-brass/30 pb-4 mb-6">
        <h2 className="font-display font-bold text-2xl md:text-3xl text-foreground uppercase tracking-[0.08em] flex items-center gap-3">
          <Settings className="w-6 h-6 text-primary" />
          Konfiguracja Sesji
        </h2>
        <p className="font-special-elite text-sm text-muted-foreground tracking-[0.04em] mt-1">
          Dostosuj tryb gry, wybierz scenariusz i powołaj Badaczy Tajemnic.
        </p>
      </div>

      <div className="space-y-4">
        {/* Krok 1: Tryb rozgrywki */}
        <div className="p-4 md:p-5 rounded-md border border-brass/30 bg-black/40 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded bg-brass/10 border border-brass/30 text-primary mt-0.5 shrink-0">
                {isDuet ? <Users className="w-5 h-5" /> : <User className="w-5 h-5" />}
              </div>
              <div>
                <div className="font-special-elite text-xs uppercase tracking-[0.18em] text-brass">
                  Krok 1 - Tryb rozgrywki
                </div>
                <div className="font-display font-bold text-lg text-foreground tracking-[0.04em]">
                  {isDuet ? 'Duet (Hot Seat - 2 Graczy)' : 'Solo (1 Gracz)'}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 font-special-elite">
                  {isDuet && duetCharacterSlots.length > 0
                    ? `Gracze: ${duetCharacterSlots.map((s) => s.playerName).join(' oraz ')}`
                    : isDuet
                    ? 'Dwóch badaczy przy jednym ekranie'
                    : 'Pojedynczy badacz stawiający czoła Mitom'}
                </div>
              </div>
            </div>
            {onChoosePlayMode && (
              <Button
                type="button"
                variant="outline"
                onClick={onChoosePlayMode}
                className="font-display uppercase tracking-[0.1em] text-xs border-brass/40 hover:border-brass hover:bg-brass/10 text-brass shrink-0"
              >
                Zmień tryb
              </Button>
            )}
          </div>
        </div>

        {/* Krok 2: Scenariusz / Przygoda */}
        <div
          className={`p-4 md:p-5 rounded-md border bg-black/40 transition-colors ${
            hasAdventure ? 'border-primary/50' : 'border-brass/30'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                className={`p-2.5 rounded border mt-0.5 shrink-0 ${
                  hasAdventure
                    ? 'bg-primary/10 border-primary/40 text-primary'
                    : 'bg-brass/10 border-brass/30 text-muted-foreground'
                }`}
              >
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="font-special-elite text-xs uppercase tracking-[0.18em] text-brass flex items-center gap-2">
                  <span>Krok 2 - Przygoda</span>
                  {hasAdventure && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold normal-case">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Wybrano
                    </span>
                  )}
                </div>
                <div className="font-display font-bold text-lg text-foreground tracking-[0.04em]">
                  {adventureTitle || 'Nie wybrano przygody'}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 font-special-elite">
                  {hasAdventure
                    ? 'Scenariusz gotowy do rozegrania'
                    : 'Wybierz gotowy moduł lub wgraj własne akta sprawy'}
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={onSelectAdventure}
              className="font-display uppercase tracking-[0.1em] text-xs border-brass/40 hover:border-brass hover:bg-brass/10 text-brass shrink-0"
            >
              {hasAdventure ? 'Zmień przygodę' : 'Wybierz przygodę'}
            </Button>
          </div>
        </div>

        {/* Krok 3: Badacz / Badacze */}
        <div
          className={`p-4 md:p-5 rounded-md border bg-black/40 transition-colors ${
            hasCharacter ? 'border-primary/50' : 'border-brass/30'
          }`}
        >
          <div className="font-special-elite text-xs uppercase tracking-[0.18em] text-brass flex items-center gap-2 mb-3">
            <span>Krok 3 - {isDuet ? 'Badacze Tajemnic' : 'Badacz Tajemnic'}</span>
            {hasCharacter && (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold normal-case">
                <CheckCircle2 className="w-3.5 h-3.5" /> Gotowy do gry
              </span>
            )}
          </div>

          {!isDuet ? (
            /* Tryb Solo */
            hasCharacter && activeCharacter ? (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3 rounded bg-black/30 border border-brass/20">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded overflow-hidden border border-brass/50 bg-black/60 shrink-0">
                    <SafeImage
                      src={activeCharacter.portraitUrl}
                      alt={activeCharacter.name}
                      className="w-full h-full object-cover"
                      fallbackIcon={<User className="w-7 h-7 text-brass/50" />}
                    />
                  </div>
                  <div>
                    <div className="font-display font-bold text-base text-foreground">
                      {activeCharacter.name}
                    </div>
                    <div className="font-special-elite text-xs text-muted-foreground">
                      {activeCharacter.occupation || 'Zawód nieznany'}
                      {activeCharacter.age ? ` (${activeCharacter.age} lat)` : ''}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {onPickPredefinedCharacter && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onPickPredefinedCharacter()}
                      className="font-display uppercase tracking-[0.08em] text-xs border-brass/40 hover:border-brass text-brass"
                    >
                      <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                      Zmień postać
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onCreateCharacter()}
                    className="font-display uppercase tracking-[0.08em] text-xs border-brass/40 hover:border-brass text-brass"
                  >
                    <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                    Stwórz nową
                  </Button>
                  {hasSavedCharacters && onPickCharacter && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onPickCharacter()}
                      className="font-display uppercase tracking-[0.08em] text-xs border-brass/40 hover:border-brass text-brass"
                    >
                      <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
                      Z katalogu
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded bg-black/30 border border-brass/20">
                <div className="text-sm text-muted-foreground font-special-elite">
                  Brak wybranego Badacza. Wybierz gotową postać lub stwórz własną kartę.
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onCreateCharacter()}
                    className="font-display uppercase tracking-[0.08em] text-xs border-brass/40 hover:border-brass text-brass"
                  >
                    <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                    Stwórz nową postać
                  </Button>
                  {onPickPredefinedCharacter && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onPickPredefinedCharacter()}
                      className="font-display uppercase tracking-[0.08em] text-xs border-brass/40 hover:border-brass text-brass"
                    >
                      <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                      Wybierz gotową postać
                    </Button>
                  )}
                  {hasSavedCharacters && onPickCharacter && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onPickCharacter()}
                      className="font-display uppercase tracking-[0.08em] text-xs border-brass/40 hover:border-brass text-brass"
                    >
                      <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
                      Wybierz z katalogu
                    </Button>
                  )}
                </div>
              </div>
            )
          ) : (
            /* Tryb Duet */
            <div className="space-y-3">
              {displaySlots.map((slot, index) => {
                const isFirst = index === 0;
                const slotBorderColor = isFirst
                  ? 'border-emerald-500/40'
                  : 'border-pink-500/40';
                const slotBadgeBg = isFirst
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-pink-500/20 text-pink-300 border-pink-500/40';

                return (
                  <div
                    key={slot.playerId || `slot-${index}`}
                    className={`p-3 rounded bg-black/30 border ${slotBorderColor} flex flex-col md:flex-row md:items-center justify-between gap-4`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-[11px] font-display font-semibold uppercase px-2 py-0.5 rounded border ${slotBadgeBg}`}
                      >
                        {slot.playerName || `Gracz ${index + 1}`}
                      </span>

                      {slot.character ? (
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded overflow-hidden border border-brass/50 bg-black/60 shrink-0">
                            <SafeImage
                              src={slot.character.portraitUrl}
                              alt={slot.character.name}
                              className="w-full h-full object-cover"
                              fallbackIcon={<User className="w-5 h-5 text-brass/50" />}
                            />
                          </div>
                          <div>
                            <div className="font-display font-bold text-sm text-foreground">
                              {slot.character.name}
                            </div>
                            <div className="font-special-elite text-xs text-muted-foreground">
                              {slot.character.occupation || 'Zawód nieznany'}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="font-special-elite text-xs text-muted-foreground">
                          Brak przypisanej postaci
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 shrink-0">
                      {slot.character ? (
                        <>
                          {onPickPredefinedCharacter && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => onPickPredefinedCharacter(slot.playerName)}
                              className="font-display uppercase tracking-[0.08em] text-xs border-brass/40 hover:border-brass text-brass"
                            >
                              <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                              Zmień postać
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onCreateCharacter(slot.playerName)}
                            className="font-display uppercase tracking-[0.08em] text-xs border-brass/40 hover:border-brass text-brass"
                          >
                            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                            Stwórz nową
                          </Button>
                          {hasSavedCharacters && onPickCharacter && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => onPickCharacter(slot.playerName)}
                              className="font-display uppercase tracking-[0.08em] text-xs border-brass/40 hover:border-brass text-brass"
                            >
                              <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
                              Z katalogu
                            </Button>
                          )}
                        </>
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onCreateCharacter(slot.playerName)}
                            className="font-display uppercase tracking-[0.08em] text-xs border-brass/40 hover:border-brass text-brass"
                          >
                            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                            Stwórz nową
                          </Button>
                          {onPickPredefinedCharacter && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => onPickPredefinedCharacter(slot.playerName)}
                              className="font-display uppercase tracking-[0.08em] text-xs border-brass/40 hover:border-brass text-brass"
                            >
                              <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                              Wybierz gotową
                            </Button>
                          )}
                          {hasSavedCharacters && onPickCharacter && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => onPickCharacter(slot.playerName)}
                              className="font-display uppercase tracking-[0.08em] text-xs border-brass/40 hover:border-brass text-brass"
                            >
                              <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
                              Z katalogu
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Krok 4 (opcjonalny): Sesja Zero */}
        {onSessionZero && (
          <div className="p-4 rounded-md border border-brass/20 bg-black/20 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded bg-brass/10 border border-brass/20 text-brass mt-0.5 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-special-elite text-xs uppercase tracking-[0.18em] text-brass/80">
                    Krok Opcjonalny - Sesja Zero
                  </div>
                  <div className="font-display font-medium text-sm text-foreground">
                    {hasSessionZero
                      ? 'Wprowadzenie i ustalenia sesji: Gotowe'
                      : 'Wprowadzenie fabularne i ustalenie konwencji'}
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onSessionZero}
                className="font-display uppercase tracking-[0.1em] text-xs border-brass/30 hover:border-brass text-brass shrink-0"
              >
                {hasSessionZero ? 'Powtórz Sesję Zero' : 'Uruchom Sesję Zero'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Krok 5: Przycisk "Rozpocznij Grę" */}
      <div className="mt-8 pt-6 border-t border-brass/30 flex flex-col items-center gap-3">
        {isReady ? (
          <button
            type="button"
            onClick={onStartGame}
            className="w-full sm:w-auto min-w-[280px] px-8 py-4 bg-gradient-to-r from-[#0d9488] to-[#047857] hover:from-[#14b8a6] hover:to-[#059669] text-white font-display font-bold uppercase tracking-[0.2em] text-base rounded border border-primary/60 shadow-[0_0_25px_rgba(20,184,166,0.4)] hover:shadow-[0_0_35px_rgba(20,184,166,0.6)] animate-pulse transition-all cursor-pointer flex items-center justify-center gap-3"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Rozpocznij Grę</span>
          </button>
        ) : (
          <div className="w-full flex flex-col items-center gap-2">
            <button
              type="button"
              disabled
              className="w-full sm:w-auto min-w-[280px] px-8 py-4 bg-black/40 text-muted-foreground font-display font-bold uppercase tracking-[0.2em] text-base rounded border border-brass/20 cursor-not-allowed opacity-60 flex items-center justify-center gap-3"
            >
              <Play className="w-5 h-5" />
              <span>Rozpocznij Grę</span>
            </button>
            <p className="font-special-elite text-xs text-brass/80 tracking-[0.04em] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              {!hasAdventure && !hasCharacter
                ? 'Wybierz przygodę i postać, aby rozpocząć grę'
                : !hasAdventure
                ? 'Wybierz przygodę, aby rozpocząć grę'
                : 'Wybierz lub stwórz postać, aby rozpocząć grę'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
