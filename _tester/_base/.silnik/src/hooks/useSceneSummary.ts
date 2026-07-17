import { useState, useCallback } from 'react';
import { Message, Character } from '@/lib/types';
import { persistCharacters } from '@/lib/character-cloud-sync';
import { fetchWithApiKeys } from '@/lib/api-keys-service';

interface UseSceneSummaryProps {
  messages: Message[];
  activeCharacter: Character | null;
  adventureTitle?: string;
  setActiveCharacter: (char: Character) => void;
  setCharacters: (chars: Character[]) => void;
  characters: Character[];
}

export function useSceneSummary({
  messages,
  activeCharacter,
  adventureTitle,
  setActiveCharacter,
  setCharacters,
  characters,
}: UseSceneSummaryProps) {
  const [isSummarizingScene, setIsSummarizingScene] = useState(false);

  const handleSummarizeScene = useCallback(async () => {
    if (isSummarizingScene) return;

    setIsSummarizingScene(true);
    try {
      // IND-206 BYOK: fetchWithApiKeys dokłada nagłówek X-Gemini-Api-Key (klucz
      // testera z localStorage) - /api/summarize-scene jest teraz header-only.
      const response = await fetchWithApiKeys('/api/summarize-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          characterName: activeCharacter?.name,
          adventureTitle: adventureTitle,
        }),
      });

      if (!response.ok) {
        throw new Error('Nie udało się wygenerować podsumowania');
      }

      const data = await response.json();

      if (data.success && data.entry && activeCharacter) {
        // Zapisz wpis do dziennika postaci
        const updatedCharacter = {
          ...activeCharacter,
          journal: [...(activeCharacter.journal || []), data.entry],
        };
        setActiveCharacter(updatedCharacter);

        // Zaktualizuj w liście postaci
        const updatedCharacters = characters.map((c) =>
          c.id === updatedCharacter.id ? updatedCharacter : c
        );
        setCharacters(updatedCharacters);

        // Zapisz do localStorage + sync do GCS per-konto (IND-168 Faza 5)
        if (typeof window !== 'undefined') {
          persistCharacters(updatedCharacters);
        }

        alert(`✅ Dodano wpis do dziennika: "${data.entry.title}"`);
      }
    } catch (error) {
      console.error('Scene summarization error:', error);
      alert('❌ Wystąpił błąd podczas generowania podsumowania sceny');
    } finally {
      setIsSummarizingScene(false);
    }
  }, [
    messages,
    activeCharacter,
    adventureTitle,
    characters,
    setActiveCharacter,
    setCharacters,
    isSummarizingScene,
  ]);

  return {
    handleSummarizeScene,
    isSummarizingScene,
  };
}
