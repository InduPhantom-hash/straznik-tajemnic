'use client';

import { useCallback, useEffect, useState } from 'react';
import { hasRequiredKeys } from '@/lib/api-keys-service';

/**
 * Fala 2 - detekcja pierwszego uruchomienia ("Strażnik Tajemnic", produkt B).
 *
 * Kreator pierwszego uruchomienia pokazuje się gdy:
 *  - brak klucza Gemini (BYOK; pomijane w trybie lokalnym, bo serwer ma fallback), LUB
 *  - pusty indeks zasad (`data/rag/rules`) - gracz nie wgrał jeszcze podręcznika.
 *
 * Gra zablokowana do czasu: klucz obecny ORAZ rules niepuste.
 * Produkt A Jakuba (NEXT_PUBLIC_LOCAL_MODE=true + pełne `data/rag/`) → przezroczyste
 * (klucz z env, rules niepuste → canPlay=true, kreator się nie pokazuje).
 *
 * RAG jest w 100% lokalny - liczba fragmentów pochodzi z `data/rag/rules.*`,
 * nie z żadnej chmury wektorowej (mimo historycznej nazwy endpointu).
 */

export interface FirstRunState {
  /** Wstępne sprawdzenie w toku (nie pokazuj jeszcze gate'a). */
  loading: boolean;
  /** Czy auto-otworzyć kreator. */
  needsWizard: boolean;
  /** Czy wolno startować grę (klucz + niepuste zasady). */
  canPlay: boolean;
  /** Liczba fragmentów zasad w lokalnym indeksie. */
  rulesCount: number;
  /** Ponowne sprawdzenie stanu (po wgraniu podręcznika / zmianie klucza). */
  refresh: () => Promise<void>;
}

export function useFirstRun(): FirstRunState {
  const localMode = true;

  const [loading, setLoading] = useState(true);
  const [hasKey, setHasKey] = useState(false);
  const [rulesCount, setRulesCount] = useState<number>(0);
  const [completedOnboarding, setCompletedOnboarding] = useState<boolean>(false);

  const checkRules = useCallback(async () => {
    try {
      // GET zwraca statystyki lokalnego namespace 'rules' (recordCount).
      const res = await fetch('/api/pdf/ingest-local?type=rules');
      if (!res.ok) {
        setRulesCount(0);
        return;
      }
      const data = await res.json();
      setRulesCount(
        typeof data.recordCount === 'number' ? data.recordCount : 0
      );
    } catch {
      setRulesCount(0);
    }
  }, []);

  const refresh = useCallback(async () => {
    setHasKey(hasRequiredKeys());
    if (typeof window !== 'undefined') {
      setCompletedOnboarding(localStorage.getItem('onboarding_completed') === 'true');
    }
    await checkRules();
  }, [checkRules]);

  useEffect(() => {
    let active = true;
    (async () => {
      setHasKey(hasRequiredKeys());
      if (typeof window !== 'undefined') {
        setCompletedOnboarding(localStorage.getItem('onboarding_completed') === 'true');
      }
      await checkRules();
      if (active) setLoading(false);
    })();

    const onKeysChanged = () => setHasKey(hasRequiredKeys());
    window.addEventListener('api-keys-changed', onKeysChanged);
    return () => {
      active = false;
      window.removeEventListener('api-keys-changed', onKeysChanged);
    };
  }, [checkRules]);

  // W trybie lokalnym serwer ma fallback GEMINI_API_KEY → klucz "obecny" dla gracza.
  const keyOk = localMode || hasKey;
  const rulesOk = rulesCount > 0;
  const canPlay = keyOk && rulesOk;
  // Pokazuj wizard gdy brak klucza/zasad LUB gdy gracz nie przeszedł jeszcze onboardingu
  const needsWizard = !loading && (!completedOnboarding || !canPlay);

  return { loading, needsWizard, canPlay, rulesCount, refresh };
}
