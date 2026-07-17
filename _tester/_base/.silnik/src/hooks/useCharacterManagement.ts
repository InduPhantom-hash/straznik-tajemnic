'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Character, ActiveGameState } from '@/lib/types';
import { persistCharacters } from '@/lib/character-cloud-sync';

/**
 * Hook do zarządzania postaciami gracza
 * Wyodrębniony z page.tsx dla zgodności z GEMINI.md (max 200 linii/plik)
 */

export interface UseCharacterManagementReturn {
  characters: Character[];
  setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
  activeCharacter: Character | null;
  setActiveCharacter: React.Dispatch<React.SetStateAction<Character | null>>;
  activeGameState: ActiveGameState;
  setActiveGameState: React.Dispatch<React.SetStateAction<ActiveGameState>>;
  handleCharacterSwitch: (character: Character) => void;
  handleCharacterCreate: () => void;
  handleCharacterManage: () => void;
  handleUpdateCharacter: (updatedCharacter: Character) => void;
  handleCharactersChange: (newCharacters: Character[]) => void;
  handleGenerateRandomCharacters: () => void;
}

export function useCharacterManagement(): UseCharacterManagementReturn {
  const router = useRouter();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [activeCharacter, setActiveCharacter] = useState<Character | null>(
    null
  );
  const [activeGameState, setActiveGameState] = useState<ActiveGameState>({
    currentCharacter: null,
    campaign: null,
    session: null,
    players: [],
  });

  const handleCharacterSwitch = useCallback(
    (character: Character) => {
      const now = new Date();

      // Wyznaczamy nową listę postaci w jednym przejściu map
      const updatedCharacters = characters.map((char) => {
        if (char.id === character.id) {
          return { ...char, isActive: true, lastUsed: now };
        }
        if (activeCharacter && char.id === activeCharacter.id) {
          return { ...char, isActive: false, lastUsed: now };
        }
        return char;
      });

      // Wyznaczamy konkretną wybraną postać (bierzemy ze zaktualizowanej listy)
      const targetCharacter = updatedCharacters.find(
        (c) => c.id === character.id
      ) || {
        ...character,
        isActive: true,
        lastUsed: now,
      };

      setCharacters(updatedCharacters);
      setActiveCharacter(targetCharacter);
      setActiveGameState((prev) => ({
        ...prev,
        currentCharacter: targetCharacter,
      }));

      persistCharacters(updatedCharacters);
    },
    [activeCharacter, characters]
  );

  const handleCharacterCreate = useCallback(() => {
    router.push('/characters/new');
  }, [router]);

  const handleCharacterManage = useCallback(() => {
    router.push('/characters');
  }, [router]);

  const handleUpdateCharacter = useCallback(
    (updatedCharacter: Character) => {
      const updatedCharacters = characters.map((char) =>
        char.id === updatedCharacter.id ? updatedCharacter : char
      );
      setCharacters(updatedCharacters);
      // Aktualizacja oglądanej postaci w modalu nie może przejąć aktywnej tury.
      setActiveCharacter((current) =>
        current?.id === updatedCharacter.id ? updatedCharacter : current
      );
      setActiveGameState((current) => ({
        ...current,
        currentCharacter:
          current.currentCharacter?.id === updatedCharacter.id
            ? updatedCharacter
            : current.currentCharacter,
      }));
      persistCharacters(updatedCharacters);
    },
    [characters]
  );

  const handleCharactersChange = useCallback(
    (newCharacters: Character[]) => {
      setCharacters(newCharacters);
      const updatedActive = activeCharacter
        ? (newCharacters.find((char) => char.id === activeCharacter.id) ?? null)
        : null;
      setActiveCharacter(updatedActive);
      setActiveGameState((prev) => ({
        ...prev,
        currentCharacter: prev.currentCharacter
          ? (newCharacters.find(
              (character) => character.id === prev.currentCharacter?.id
            ) ?? null)
          : null,
      }));
      persistCharacters(newCharacters);
    },
    [activeCharacter]
  );

  const handleGenerateRandomCharacters = useCallback(async () => {
    try {
      const { generateRandomCharacters } =
        await import('@/lib/random-character-generator');
      const randomCharacters = generateRandomCharacters(2);
      const updatedCharacters = [...characters, ...randomCharacters];
      setCharacters(updatedCharacters);
      persistCharacters(updatedCharacters);

      // Ustaw pierwszą wygenerowaną postać jako aktywną
      if (randomCharacters.length > 0 && !activeCharacter) {
        setActiveCharacter(randomCharacters[0]);
        setActiveGameState((prev) => ({
          ...prev,
          currentCharacter: randomCharacters[0],
        }));
      }
    } catch (error) {
      console.error('Failed to generate random characters:', error);
    }
  }, [characters, activeCharacter]);

  return {
    characters,
    setCharacters,
    activeCharacter,
    setActiveCharacter,
    activeGameState,
    setActiveGameState,
    handleCharacterSwitch,
    handleCharacterCreate,
    handleCharacterManage,
    handleUpdateCharacter,
    handleCharactersChange,
    handleGenerateRandomCharacters,
  };
}
