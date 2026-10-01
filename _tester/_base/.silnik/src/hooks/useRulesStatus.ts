'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SystemCapabilities } from '@/lib/pdf/capabilities-manager';

export interface RulesStatus {
  /** Liczba zindeksowanych fragmentów podręcznika zasad w lokalnym RAG */
  rulesCount: number;
  /** Czy bazowe zasady d100 (Starter lub Księga Strażnika) są obecne i gra może wystartować */
  hasRules: boolean;
  /** Czy wgrano wyłącznie dodatek zasad (np. Pulp Cthulhu / Podręcznik Badacza) bez bazowej mechaniki */
  hasOnlyExpansionRules: boolean;
  /** Pełny stan wgranych nakładek i możliwości systemowych */
  capabilities?: SystemCapabilities;
  /** Profil głównego podręcznika (np. starter-d100, core-d100) */
  rulebookProfile?: string;
  /** Tytuł głównego zindeksowanego podręcznika */
  rulebookTitle?: string;
  /** Czy trwa początkowe sprawdzanie statusu */
  loading: boolean;
  /** Wymuszenie ponownego odpytania backendu */
  refresh: () => Promise<number>;
}

function isExpansionOnlyProfile(profile?: string): boolean {
  return profile === 'pulp-d100' || profile === 'investigator_handbook';
}

/**
 * useRulesStatus - sprawdza stan lokalnego indeksu zasad (data/rag/rules)
 * przez endpoint GET /api/pdf/ingest-local?type=rules.
 * Nasłuchuje również na zdarzenie 'rules-changed' w oknie.
 */
export function useRulesStatus(): RulesStatus {
  const [rulesCount, setRulesCount] = useState<number>(0);
  const [hasBaseRules, setHasBaseRules] = useState<boolean>(false);
  const [hasOnlyExpansionRules, setHasOnlyExpansionRules] = useState<boolean>(false);
  const [capabilities, setCapabilities] = useState<SystemCapabilities | undefined>(undefined);
  const [rulebookProfile, setRulebookProfile] = useState<string | undefined>(undefined);
  const [rulebookTitle, setRulebookTitle] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async (): Promise<number> => {
    try {
      const res = await fetch('/api/pdf/ingest-local?type=rules');
      if (!res.ok) {
        setRulesCount(0);
        setHasBaseRules(false);
        setHasOnlyExpansionRules(false);
        setCapabilities(undefined);
        setRulebookProfile(undefined);
        setRulebookTitle(undefined);
        setLoading(false);
        return 0;
      }
      const data = await res.json();
      const count = typeof data.recordCount === 'number' ? data.recordCount : 0;
      const caps = data.capabilities as SystemCapabilities | undefined;
      const installedOverlays = Array.isArray(caps?.installedOverlays) ? caps.installedOverlays : [];
      const profile = data.rulebookProfile?.profile || (count > 0 ? 'starter-d100' : undefined);
      const title = data.rulebookProfile?.title;

      let resolvedHasBase = false;
      let resolvedExpansionOnly = false;

      if (installedOverlays.length > 0 && caps?.flags) {
        resolvedHasBase = Boolean(caps.flags.hasBaseRules);
        resolvedExpansionOnly = Boolean(caps.flags.hasRulebookExpansion && !caps.flags.hasBaseRules);
      } else if (typeof data.hasBaseRules === 'boolean') {
        resolvedHasBase = data.hasBaseRules;
        resolvedExpansionOnly = count > 0 && !data.hasBaseRules && isExpansionOnlyProfile(profile);
      } else {
        resolvedHasBase = count > 0 && !isExpansionOnlyProfile(profile);
        resolvedExpansionOnly = count > 0 && isExpansionOnlyProfile(profile);
      }

      setRulesCount(count);
      setHasBaseRules(resolvedHasBase);
      setHasOnlyExpansionRules(resolvedExpansionOnly);
      setCapabilities(caps);
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
      setHasBaseRules(false);
      setHasOnlyExpansionRules(false);
      setCapabilities(undefined);
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
    hasRules: hasBaseRules,
    hasOnlyExpansionRules,
    capabilities,
    rulebookProfile,
    rulebookTitle,
    loading,
    refresh,
  };
}

