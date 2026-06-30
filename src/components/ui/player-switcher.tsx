'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from './button';
import { HotSeatConfig, HotSeatPlayer } from '@/lib/types';
import { Character } from '@/lib/types';

interface PlayerSwitcherProps {
  config: HotSeatConfig;
  characters: Character[];
  onSwitchPlayer: (playerIndex: number) => void;
  onDisableHotSeat: () => void;
  /**
   * C3: gdy true, przełącznik renderuje się jako osadzony pasek w prawym
   * sidebarze (bez `fixed`), wpasowany w szerokość kolumny. Domyślnie false
   * (pływający pasek u góry - zachowanie sprzed C3, używane tam, gdzie sidebar
   * niedostępny).
   */
  embedded?: boolean;
}

/**
 * Komponent przełączania graczy w trybie Hot Seat
 * Wyświetla aktywnego gracza i umożliwia zmianę
 */
export function PlayerSwitcher({
  config,
  characters,
  onSwitchPlayer,
  onDisableHotSeat,
  embedded = false,
}: PlayerSwitcherProps) {
  if (!config.enabled || config.players.length < 2) {
    return null;
  }

  const activePlayer = config.players[config.activePlayerIndex];
  const activeCharacter = characters.find(
    (c) => c.id === activePlayer?.characterId
  );

  // Znajdź drugiego gracza
  const otherPlayerIndex = config.activePlayerIndex === 0 ? 1 : 0;
  const otherPlayer = config.players[otherPlayerIndex];
  const otherCharacter = characters.find(
    (c) => c.id === otherPlayer?.characterId
  );

  // C3: osadzony wariant wpasowuje się w kolumnę sidebara (pełna szerokość,
  // bez fixed/translate). Pływający wariant zostaje dla kompatybilności.
  const containerClass = embedded
    ? 'flex flex-wrap items-center justify-center gap-2 px-3 py-2 rounded-lg bg-card/95 border shadow-sm'
    : 'fixed top-16 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2 rounded-full bg-card/95 backdrop-blur-sm border shadow-lg';

  return (
    <div
      className={containerClass}
      style={{ borderColor: activePlayer?.color || '#4ade80' }}
    >
      {/* Aktywny gracz */}
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full animate-pulse"
          style={{ backgroundColor: activePlayer?.color || '#4ade80' }}
        />
        <span className="text-sm font-medium">
          {activePlayer?.name || 'Gracz 1'}
        </span>
        <span className="text-xs text-muted-foreground">
          ({activeCharacter?.name || 'Brak postaci'})
        </span>
      </div>

      {/* Przycisk zmiany */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-3 text-xs"
        onClick={() => onSwitchPlayer(otherPlayerIndex)}
        title={`Przełącz na ${otherPlayer?.name}`}
      >
        🔄 {otherPlayer?.name} ({otherCharacter?.name || '?'})
      </Button>

      {/* Przycisk wyłączenia */}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
        onClick={onDisableHotSeat}
        title="Wyłącz tryb Hot Seat"
      >
        ✕
      </Button>
    </div>
  );
}

/**
 * Hook do zarządzania stanem Hot Seat
 */
export function useHotSeat(characters: Character[]) {
  const [config, setConfig] = useState<HotSeatConfig>({
    enabled: false,
    players: [],
    activePlayerIndex: 0,
    allowInterruptions: true,
    showPlayerIndicator: true,
  });

  // Lustro `config` jako ref - bindCharactersByPlayerName czyta najświeższy stan
  // synchronicznie (bez stale closure i bez wrażliwości na double-invoke React).
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Inicjalizacja Hot Seat z 2 graczami (binding postaci to osobna faza - characterId pusty)
  const initHotSeat = useCallback(
    (player1Name: string, player2Name: string) => {
      const players: HotSeatPlayer[] = [
        {
          id: `player_1_${Date.now()}`,
          name: player1Name,
          color: '#4ade80', // zielony
          characterId: '',
          isActive: true,
          turnCount: 0,
        },
        {
          id: `player_2_${Date.now()}`,
          name: player2Name,
          color: '#f472b6', // różowy
          characterId: '',
          isActive: false,
          turnCount: 0,
        },
      ];

      setConfig({
        enabled: true,
        players,
        activePlayerIndex: 0,
        allowInterruptions: true,
        showPlayerIndicator: true,
      });

      // Zapisz do localStorage
      localStorage.setItem(
        'hotSeatConfig',
        JSON.stringify({
          enabled: true,
          players,
          activePlayerIndex: 0,
          allowInterruptions: true,
          showPlayerIndicator: true,
        })
      );

      console.log('🎮 Hot Seat mode enabled with 2 players');
    },
    []
  );

  // Przełączenie gracza
  const switchPlayer = useCallback((playerIndex: number) => {
    setConfig((prev) => {
      const updated = {
        ...prev,
        activePlayerIndex: playerIndex,
        players: prev.players.map((p, i) => ({
          ...p,
          isActive: i === playerIndex,
          turnCount: i === playerIndex ? p.turnCount + 1 : p.turnCount,
        })),
      };
      localStorage.setItem('hotSeatConfig', JSON.stringify(updated));
      console.log(
        `🔄 Switched to player ${playerIndex + 1}: ${updated.players[playerIndex]?.name}`
      );
      return updated;
    });
  }, []);

  // Wyłączenie Hot Seat
  const disableHotSeat = useCallback(() => {
    setConfig({
      enabled: false,
      players: [],
      activePlayerIndex: 0,
      allowInterruptions: true,
      showPlayerIndicator: true,
    });
    localStorage.removeItem('hotSeatConfig');
    console.log('🎮 Hot Seat mode disabled');
  }, []);

  // Faza 2: powiązanie postaci z graczami po `playerName` (z fallbackiem po kolejności).
  // Zwraca `true` gdy WSZYSCY gracze mają niepusty characterId wskazujący istniejącą,
  // RÓŻNĄ postać - inaczej `false` (sygnał dla guardu startu duetu w Fazie 4).
  const bindCharactersByPlayerName = useCallback(
    (chars: Character[]): boolean => {
      const prev = configRef.current;
      if (!prev.enabled || prev.players.length < 2) {
        return false;
      }

      // Krok 1: dopasuj po playerName (postać ostemplowana imieniem gracza).
      const next = prev.players.map((p) => {
        const byName = chars.find((c) => c.playerName === p.name);
        return byName ? { ...p, characterId: byName.id } : p;
      });

      // Krok 2 (belt-and-suspenders): gracze nadal bez WAŻNEGO characterId
      // dostają po kolei pierwszą jeszcze nieprzypisaną istniejącą postać.
      const usedIds = new Set(
        next
          .map((p) => p.characterId)
          .filter((id) => id && chars.some((c) => c.id === id))
      );
      const available = chars.filter((c) => !usedIds.has(c.id));
      let availIdx = 0;
      const bound = next.map((p) => {
        const hasValid =
          p.characterId && chars.some((c) => c.id === p.characterId);
        if (!hasValid && availIdx < available.length) {
          const pick = available[availIdx++];
          usedIds.add(pick.id);
          return { ...p, characterId: pick.id };
        }
        return p;
      });

      // Persist tylko gdy faktycznie coś się zmieniło (ref-equality no-op).
      const changed = bound.some(
        (p, i) => p.characterId !== prev.players[i].characterId
      );
      if (changed) {
        const updated = { ...prev, players: bound };
        configRef.current = updated;
        setConfig(updated);
        localStorage.setItem('hotSeatConfig', JSON.stringify(updated));
      }

      // Walidacja: wszyscy gracze mają niepusty characterId istniejącej +
      // RÓŻNEJ postaci.
      const ids = bound.map((p) => p.characterId);
      const allValid = ids.every((id) => id && chars.some((c) => c.id === id));
      const allDistinct = new Set(ids).size === ids.length;
      return allValid && allDistinct;
    },
    []
  );

  // Ładowanie z localStorage przy starcie
  useEffect(() => {
    const saved = localStorage.getItem('hotSeatConfig');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.enabled && parsed.players?.length >= 2) {
          setConfig(parsed);
          console.log('🎮 Restored Hot Seat config from localStorage');
        }
      } catch (e) {
        console.error('Failed to load Hot Seat config:', e);
      }
    }
  }, []);

  // Pobierz aktualnego gracza i postać
  const activePlayer = config.enabled
    ? config.players[config.activePlayerIndex]
    : null;
  const activeCharacter = activePlayer
    ? characters.find((c) => c.id === activePlayer.characterId)
    : null;

  return {
    config,
    activePlayer,
    activeCharacter,
    initHotSeat,
    switchPlayer,
    disableHotSeat,
    bindCharactersByPlayerName,
  };
}

export default PlayerSwitcher;
