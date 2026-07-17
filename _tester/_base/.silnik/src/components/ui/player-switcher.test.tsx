import { act, renderHook, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import type { Character, HotSeatConfig } from '@/lib/types';
import { useHotSeat } from './player-switcher';

const character = (id: string, playerName?: string) =>
  ({ id, name: `Postać ${id}`, playerName }) as Character;

describe('useHotSeat character assignments', () => {
  beforeEach(() => localStorage.clear());

  it('never fills a missing assignment with an unrelated character', async () => {
    const characters = [
      character('aga-character', 'Aga'),
      character('unrelated'),
    ];
    const { result } = renderHook(() => useHotSeat(characters));

    act(() => result.current.initHotSeat('Aga', 'Bartek'));
    await waitFor(() => expect(result.current.config.enabled).toBe(true));

    let ready = true;
    act(() => {
      ready = result.current.bindCharactersByPlayerName(characters);
    });

    expect(ready).toBe(false);
    expect(result.current.config.players[0].characterId).toBe('aga-character');
    expect(result.current.config.players[1].characterId).toBe('');
  });

  it('restores two distinct explicit assignments from a save', async () => {
    const characters = [
      character('aga-character'),
      character('bartek-character'),
    ];
    const savedConfig: HotSeatConfig = {
      enabled: true,
      activePlayerIndex: 1,
      allowInterruptions: true,
      showPlayerIndicator: true,
      players: [
        {
          id: 'player-1',
          name: 'Aga',
          color: '#4ade80',
          characterId: 'aga-character',
          isActive: true,
          turnCount: 2,
        },
        {
          id: 'player-2',
          name: 'Bartek',
          color: '#f472b6',
          characterId: 'bartek-character',
          isActive: false,
          turnCount: 1,
        },
      ],
    };
    const { result } = renderHook(() => useHotSeat(characters));

    act(() => {
      expect(result.current.restoreConfig(savedConfig, characters)).toBe(true);
    });

    await waitFor(() =>
      expect(result.current.config.activePlayerIndex).toBe(1)
    );
    expect(
      result.current.config.players.map((player) => player.characterId)
    ).toEqual(['aga-character', 'bartek-character']);
    expect(
      result.current.config.players.map((player) => player.isActive)
    ).toEqual([false, true]);
    expect(
      JSON.parse(localStorage.getItem('hotSeatConfig') || '{}')
    ).toMatchObject({
      activePlayerIndex: 1,
    });
  });

  it('disables duet instead of guessing when an older save has no assignments', async () => {
    const characters = [
      character('aga-character'),
      character('bartek-character'),
    ];
    const { result } = renderHook(() => useHotSeat(characters));

    act(() => result.current.initHotSeat('Aga', 'Bartek'));
    await waitFor(() => expect(result.current.config.enabled).toBe(true));

    act(() => {
      expect(result.current.restoreConfig(undefined, characters)).toBe(false);
    });

    expect(result.current.config.enabled).toBe(false);
    expect(localStorage.getItem('hotSeatConfig')).toBeNull();
  });
});
