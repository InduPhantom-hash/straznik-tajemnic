'use client';

import { useState, useEffect } from 'react';
import { getCharacterPortrait } from '@/lib/character-image-store';

/**
 * Zwraca URL portretu postaci do wyświetlenia w miniaturach POZA modalem Karta
 * Postaci (panel boczny, awatary przy wiadomościach czatu).
 *
 * Problem: portret jest offloadowany do IndexedDB (IND-262), więc
 * `character.portraitUrl` bywa pusty zaraz po starcie/wczytaniu gry (wyścig
 * hydratacji rosteru w page.tsx). Komponenty czytające tylko `portraitUrl`
 * pokazywały wtedy placeholder 👤 na stałe, mimo że portret JEST w IndexedDB
 * (modal Karta Postaci go widzi, bo hydratuje przy każdym otwarciu).
 *
 * Rozwiązanie: gdy `portraitUrl` jest pusty, dociągamy portret z IndexedDB z
 * ponowieniem (3 próby co 400 ms - domyka okno wyścigu offloadu). Gdy `portraitUrl`
 * jest ustawiony (inline data: lub http), używamy go bez dociągania.
 */
export function useResolvedPortrait(
  character: { id?: string; portraitUrl?: string } | null | undefined
): string | null {
  const [fallback, setFallback] = useState<string | null>(null);
  const id = character?.id;
  const portraitUrl = character?.portraitUrl;

  useEffect(() => {
    // Jest portret inline lub brak postaci - nic nie dociągamy, czyścimy fallback.
    if (!id || portraitUrl) {
      setFallback(null);
      return;
    }
    let cancelled = false;
    let attempts = 0;
    const tryFetch = () => {
      getCharacterPortrait(id).then((url) => {
        if (cancelled) return;
        if (url) {
          setFallback(url);
        } else if (attempts < 3) {
          attempts += 1;
          setTimeout(tryFetch, 400);
        }
      });
    };
    tryFetch();
    return () => {
      cancelled = true;
    };
  }, [id, portraitUrl]);

  return portraitUrl ?? fallback;
}
