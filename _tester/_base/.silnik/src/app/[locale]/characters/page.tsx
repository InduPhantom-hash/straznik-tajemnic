'use client';

import { CharacterManager } from '@/components/ui/character-manager';
import { Character } from '@/lib/types';
import { persistCharacters } from '@/lib/character-cloud-sync';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CharactersPage() {
  const router = useRouter();

  const handleClose = () => {
    // Po zamknięciu wróć do głównej strony
    router.push('/');
  };

  const handleCharactersChange = () => {
    // Po zmianie postaci wróć do głównej strony
    router.push('/');
  };

  // C1: "Graj tą postacią" - przenieś wybraną postać na początek rosteru w
  // localStorage. Strona główna ładuje aktywną postać jako characters[0]
  // (page.tsx ~341), więc reorder = ta postać staje się aktywna po powrocie.
  // C2 (duet): jeśli wybór dotyczy konkretnego gracza (hotSeatCreatingPlayerName),
  // ostempluj `playerName` tej postaci - guard startu duetu wymaga jawnego
  // przypisania po imieniu gracza.
  const handleSelectCharacter = (character: Character) => {
    try {
      const saved = localStorage.getItem('characters');
      if (saved) {
        const chars = JSON.parse(saved) as Character[];
        const targetPlayer = localStorage.getItem('hotSeatCreatingPlayerName');
        const stamped = targetPlayer
          ? { ...character, playerName: targetPlayer }
          : character;
        if (targetPlayer) {
          localStorage.removeItem('hotSeatCreatingPlayerName');
        }
        const reordered = [
          stamped,
          ...chars
            .filter((c) => c.id !== character.id)
            .map((c) =>
              // Jeśli inna postać miała to imię gracza, zwolnij je (1 gracz = 1 postać).
              targetPlayer && c.playerName === targetPlayer
                ? { ...c, playerName: '' }
                : c
            ),
        ];
        // Przez persistCharacters (spójnie z resztą app): odporne na quota
        // (strip portretów do IndexedDB + try/catch). Surowy setItem mógł
        // wywalić reorder, gdy postacie niosły inline base64.
        persistCharacters(reordered);
      }
    } catch (e) {
      console.error('Błąd wyboru postaci:', e);
    }
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/"
            className="p-2 hover:bg-primary/10 rounded-md transition-colors text-foreground"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-4xl font-mono font-bold text-foreground">
            📚 Postacie
          </h1>
        </div>

        <CharacterManager
          onClose={handleClose}
          onCharactersChange={handleCharactersChange}
          onSelectCharacter={handleSelectCharacter}
        />
      </div>
    </div>
  );
}
