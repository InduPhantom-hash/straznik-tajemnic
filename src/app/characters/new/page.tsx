'use client';

import { useState, useEffect } from 'react';
import { CharacterWizardV2 } from '@/components/ui/character-wizard';
import { useRouter } from 'next/navigation';
import { Character } from '@/lib/types';
import { AdventureContext } from '@/lib/adventures-data';
import { persistCharacters } from '@/lib/character-cloud-sync';

export default function NewCharacterPage() {
  const router = useRouter();
  const [adventureContext, setAdventureContext] = useState<
    AdventureContext | undefined
  >(undefined);

  // Załaduj kontekst przygody z localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('adventure_context');
      if (saved) {
        setAdventureContext(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading adventure context:', e);
    }
  }, []);

  const handleClose = () => {
    router.push('/');
  };

  const handleCharacterCreated = (character: Character) => {
    console.log('Character created:', character);
    // Faza 2: jeśli postać tworzona dla konkretnego gracza duetu (kanał przez
    // localStorage, wzorzec adventure_context), ostempluj ją imieniem gracza.
    const creatingForPlayer = localStorage.getItem('hotSeatCreatingPlayerName');
    if (creatingForPlayer) {
      character.playerName = creatingForPlayer;
      localStorage.removeItem('hotSeatCreatingPlayerName');
    }
    // Zapisz postać do localStorage
    const existingCharacters = JSON.parse(
      localStorage.getItem('characters') || '[]'
    ) as Character[];
    existingCharacters.push(character);
    persistCharacters(existingCharacters);
    // Po stworzeniu postaci wracamy do ekranu głównego (WelcomeScreen z "Rozpocznij"),
    // a nie do listy zarządzania postaciami.
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-background">
      <CharacterWizardV2
        onCharacterCreated={handleCharacterCreated}
        onClose={handleClose}
        adventureContext={adventureContext}
      />
    </div>
  );
}
