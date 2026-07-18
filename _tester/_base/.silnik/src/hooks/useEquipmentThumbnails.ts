import { useCallback } from 'react';
import type { Character, EquipmentItem, AdventureContext } from '@/lib/types';
import { fetchWithApiKeys } from '@/lib/api-keys-service';
import { buildEquipmentImagePrompt } from '@/lib/equipment-prompt-builder';
import { persistCharacters } from '@/lib/character-cloud-sync';

/**
 * IND-271: auto-generacja miniatur ekwipunku w tle przy starcie gry.
 *
 * Wcześniej każdą miniaturę trzeba było wyklikać osobno w EquipmentModal
 * (playtest Silas Blackwood: 10 itemów = same placeholdery). Ten hook robi to
 * automatycznie w tle PO starcie gry, bez interakcji - gracz otwiera Ekwipunek
 * i miniatury już są albo dociągają się sekwencyjnie.
 *
 * Cache: miniatura żyje jako `item.imageUrl` na postaci (persist do localStorage
 * przez roster) - ten sam mechanizm co ręczny przycisk w EquipmentModal. Item z
 * istniejącym `imageUrl` jest pomijany (zero ponownej generacji = zero kosztu).
 *
 * Koszt: sekwencyjna kolejka (NIE 10 równoległych requestów) + limit
 * MAX_THUMBNAILS itemów na start (~$0.02/item przez /api/imagen Gemini).
 */

/** Limit miniatur generowanych przy jednym starcie gry (kontrola kosztu ~$0.02/item). */
const MAX_THUMBNAILS = 12;

interface UseEquipmentThumbnailsProps {
  activeCharacter: Character | null;
  adventureContext: AdventureContext | null;
  setActiveCharacter: React.Dispatch<React.SetStateAction<Character | null>>;
  setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
}

/** Era do promptu obrazu - ta sama logika co EquipmentModal w CthulhuSidebar. */
function resolveEra(adventureContext: AdventureContext | null): string {
  return adventureContext?.yearRange?.split('-')[0] || '1920s';
}

/**
 * Generuje miniaturę pojedynczego przedmiotu przez /api/imagen (Gemini, jeden klucz).
 * Zwraca data URL obrazu lub null gdy generacja zawiodła (cicho - tło).
 */
async function generateOneThumbnail(
  item: EquipmentItem,
  era: string,
  adventureTheme?: string,
  character?: Character | null
): Promise<string | null> {
  try {
    const prompt = buildEquipmentImagePrompt(item, era, adventureTheme, character);
    const response = await fetchWithApiKeys('/api/imagen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        style: item.category === 'artifact' ? 'horror' : 'vintage',
        aspectRatio: '1:1',
        seed: `${character?.id || ''}-${item.id}`,
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return typeof data.imageUrl === 'string' ? data.imageUrl : null;
  } catch {
    // Tło - błąd pojedynczej miniatury nie przerywa kolejki ani gry.
    return null;
  }
}

/**
 * Hook zwraca fire-and-forget funkcję, którą startuje useGameStart PO starcie gry.
 * Nie blokuje startu (caller NIE awaituje).
 */
export function useEquipmentThumbnails({
  activeCharacter,
  adventureContext,
  setActiveCharacter,
  setCharacters,
}: UseEquipmentThumbnailsProps) {
  const generateThumbnailsInBackground =
    useCallback(async (): Promise<void> => {
      const character = activeCharacter;
      if (!character) return;

      const equipment = character.equipment ?? [];
      // Cache-aware: pomijamy itemy które JUŻ mają miniaturę (imageUrl).
      const pending = equipment
        .filter((item) => !item.imageUrl)
        .slice(0, MAX_THUMBNAILS);
      if (pending.length === 0) return;

      const era = resolveEra(adventureContext);
      const adventureTheme = adventureContext?.title;

      // Sekwencyjnie - jedna miniatura na raz (zamiast N równoległych requestów).
      for (const item of pending) {
        const imageUrl = await generateOneThumbnail(item, era, adventureTheme, character);
        if (!imageUrl) continue;

        // Aktualizuj tę konkretną postać + jej przedmiot, zachowując resztę
        // edycji gracza (functional update na najświeższym stanie listy postaci).
        setCharacters((prevList) => {
          const updatedList = prevList.map((c) => {
            if (c.id !== character.id) return c;
            return {
              ...c,
              equipment: (c.equipment ?? []).map((it) =>
                it.id === item.id ? { ...it, imageUrl } : it
              ),
            };
          });
          if (typeof window !== 'undefined') {
            persistCharacters(updatedList);
          }
          return updatedList;
        });

        setActiveCharacter((prev) => {
          if (!prev || prev.id !== character.id) return prev;
          return {
            ...prev,
            equipment: (prev.equipment ?? []).map((it) =>
              it.id === item.id ? { ...it, imageUrl } : it
            ),
          };
        });
      }
    }, [activeCharacter, adventureContext, setActiveCharacter, setCharacters]);

  return { generateThumbnailsInBackground };
}
