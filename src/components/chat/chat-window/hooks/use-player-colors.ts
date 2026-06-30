/**
 * @file usePlayerColors - hook computuje mapę kolorów graczy dla Hot Seat (IND-144 Wariant C, sesja 131).
 *
 * Extracted z ChatWindow.tsx (lin 127-143) jako micro 2/8 splittu Wariantu C.
 * Hook bez JSX, brak `'use client'` (importowany przez parent z `'use client'`).
 *
 * Mapa: lowercase imię postaci → kolor Hot Seat player. Obejmuje pełne imię
 * + samo imię (pierwsze słowo) dla elastycznego dopasowania w NarrativeFormatter
 * (per-character border OPT-22).
 */

import { useMemo } from 'react';
import type { Character, HotSeatConfig } from '@/lib/types';

export function usePlayerColors(
  hotSeatConfig: HotSeatConfig | undefined,
  characters: Character[]
): Map<string, string> {
  return useMemo(() => {
    const map = new Map<string, string>();
    if (hotSeatConfig?.enabled && hotSeatConfig.players?.length >= 2) {
      hotSeatConfig.players.forEach((player) => {
        const char = characters.find((c) => c.id === player.characterId);
        if (char?.name) {
          // Dodaj pełne imię i samo imię (pierwsze słowo)
          map.set(char.name.toLowerCase(), player.color);
          const firstName = char.name.split(' ')[0];
          if (firstName) {
            map.set(firstName.toLowerCase(), player.color);
          }
        }
      });
    }
    return map;
  }, [hotSeatConfig, characters]);
}
