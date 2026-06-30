'use client';

import { useState, useCallback, useEffect } from 'react';
import { getUsageStats } from '@/lib/ai-settings';
import type { UsageStats } from '@/lib/ai-cost-tracker';
import { costEventEmitter, CostStats } from '@/lib/cost-event-emitter';

/**
 * Hook agregujący statystyki kosztów (LLM + TTS + obrazy + ElevenLabs).
 *
 * Dwa źródła:
 *  - `usageStats` — token/cost stats z localStorage (ai-cost-tracker), wczytywane raz na mount
 *  - `costStats` — real-time agregat z costEventEmitter (subscribe dostaje natychmiast
 *    aktualny stan, potem każde `record()` push przez emit())
 *
 * Wyodrębniony z `useSettingsModal.ts` jako część IND-31. Polling co 3 min usunięty
 * (patch K2 w planie v1.1) — costEmitter event-driven daje updates real-time bez polling.
 */

export interface UseUsageStatsReturn {
  usageStats: UsageStats | null;
  costStats: CostStats | null;
  loadUsageStats: () => void;
}

// Re-export typu dla wygody konsumentów
export type { UsageStats };

export function useUsageStats(): UseUsageStatsReturn {
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [costStats, setCostStats] = useState<CostStats | null>(null);

  const loadUsageStats = useCallback(() => {
    const stats = getUsageStats();
    setUsageStats(stats);
  }, []);

  // PATCH K1: explicit loadUsageStats() na mount + costEmitter subscribe.
  // Bez loadUsageStats() po splicie usageStats zostałby null (regresja w panel
  // statystyk Settings). subscribe() natychmiast wywołuje listener z aktualnym
  // stanem (cost-event-emitter.ts:120), więc setCostStats dostaje wartość zaraz.
  useEffect(() => {
    loadUsageStats();
    const unsubscribe = costEventEmitter.subscribe(setCostStats);
    return unsubscribe;
  }, [loadUsageStats]);

  return {
    usageStats,
    costStats,
    loadUsageStats,
  };
}
