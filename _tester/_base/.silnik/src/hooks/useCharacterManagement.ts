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
      // Oznacz poprzednią postać jako nieaktywną
      if (activeCharacter) {
        const updatedCharacters = characters.map((char) =>
          char.id === activeCharacter.id
            ? { ...char, isActive: false, lastUsed: new Date() }
            : char
        );
        setCharacters(updatedCharacters);
        persistCharacters(updatedCharacters);
      }

      // Ustaw nową aktywną postać
      const updatedCharacter = {
        ...character,
        isActive: true,
        lastUsed: new Date(),
      };
      const updatedCharacters = characters.map((char) =>
        char.id === character.id ? updatedCharacter : char
      );

      setCharacters(updatedCharacters);
      setActiveCharacter(updatedCharacter);
      setActiveGameState((prev) => ({
        ...prev,
        currentCharacter: updatedCharacter,
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
      setActiveCharacter(updatedCharacter);
      persistCharacters(updatedCharacters);
    },
    [characters]
  );

  const handleCharactersChange = useCallback(
    (newCharacters: Character[]) => {
      setCharacters(newCharacters);
      // Sprawdź czy aktywna postać nadal istnieje
      if (
        activeCharacter &&
        !newCharacters.find((char) => char.id === activeCharacter.id)
      ) {
        setActiveCharacter(null);
        setActiveGameState((prev) => ({
          ...prev,
          currentCharacter: null,
        }));
      }
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
