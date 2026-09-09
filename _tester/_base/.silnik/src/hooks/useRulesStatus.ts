'use client';

import { useState, useEffect, useCallback } from 'react';

export interface RulesStatus {
  /** Liczba zindeksowanych fragmentów podręcznika zasad w lokalnym RAG */
  rulesCount: number;
  /** Czy zasady są obecne i gra może wystartować */
  hasRules: boolean;
  /** Profil podręcznika (np. starter-d100, core-d100) */
  rulebookProfile?: string;
  /** Tytuł zindeksowanego podręcznika */
  rulebookTitle?: string;
  /** Czy trwa początkowe sprawdzanie statusu */
  loading: boolean;
  /** Wymuszenie ponownego odpytania backendu */
  refresh: () => Promise<number>;
}

/**
 * useRulesStatus - sprawdza stan lokalnego indeksu zasad (data/rag/rules)
 * przez endpoint GET /api/pdf/ingest-local?type=rules.
 * Nasłuchuje również na zdarzenie 'rules-changed' w oknie.
 */
export function useRulesStatus(): RulesStatus {
  const [rulesCount, setRulesCount] = useState<number>(0);
  const [rulebookProfile, setRulebookProfile] = useState<string | undefined>(undefined);
  const [rulebookTitle, setRulebookTitle] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async (): Promise<number> => {
    try {
      const res = await fetch('/api/pdf/ingest-local?type=rules');
      if (!res.ok) {
        setRulesCount(0);
        setRulebookProfile(undefined);
        setRulebookTitle(undefined);
        setLoading(false);
        return 0;
      }
      const data = await res.json();
      const count = typeof data.recordCount === 'number' ? data.recordCount : 0;
      const profile = data.rulebookProfile?.profile || (count > 0 ? 'starter-d100' : undefined);
      const title = data.rulebookProfile?.title;

      setRulesCount(count);
      setRulebookProfile(profile);
      setRulebookTitle(title);
      setLoading(false);

      if (typeof window !== 'undefined') {
        if (count > 0 && profile) {
          localStorage.setItem('coc7_rulebook_profile', profile);
          if (title) localStorage.setItem('coc7_rulebook_title', title);
        } else if (count === 0) {
          localStorage.removeItem('coc7_rulebook_profile');
          localStorage.removeItem('coc7_rulebook_title');
        }
      }

      return count;
    } catch {
      setRulesCount(0);
      setRulebookProfile(undefined);
      setRulebookTitle(undefined);
      setLoading(false);
      return 0;
    }
  }, []);

  useEffect(() => {
    refresh();

    const handleRulesChanged = () => {
      refresh();
    };

    window.addEventListener('rules-changed', handleRulesChanged);
    return () => {
      window.removeEventListener('rules-changed', handleRulesChanged);
    };
  }, [refresh]);

  return {
    rulesCount,
    hasRules: rulesCount > 0,
    rulebookProfile,
    rulebookTitle,
    loading,
    refresh,
  };
}
