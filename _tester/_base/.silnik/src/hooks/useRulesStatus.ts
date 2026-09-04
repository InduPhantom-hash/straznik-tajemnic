'use client';

import { useState, useEffect, useCallback } from 'react';

export interface RulesStatus {
  /** Liczba zindeksowanych fragmentów podręcznika zasad w lokalnym RAG */
  rulesCount: number;
  /** Czy zasady są obecne i gra może wystartować */
  hasRules: boolean;
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
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async (): Promise<number> => {
    try {
      const res = await fetch('/api/pdf/ingest-local?type=rules');
      if (!res.ok) {
        setRulesCount(0);
        setLoading(false);
        return 0;
      }
      const data = await res.json();
      const count = typeof data.recordCount === 'number' ? data.recordCount : 0;
      setRulesCount(count);
      setLoading(false);
      return count;
    } catch {
      setRulesCount(0);
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
    loading,
    refresh,
  };
}
