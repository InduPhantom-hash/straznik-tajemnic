/**
 * useHealthCheck - proaktywny self-check zdrowia klucza/modeli Gemini (IND-273 T3).
 *
 * Fire-and-forget, dławiony TTL 24h (localStorage). Woła GET /api/health/gemini
 * (T2) i dyskretnie reaguje:
 * - zły klucz (keyValid:false)  → toast destructive + `onInvalidKey` (modal BYOK),
 * - brak aktywnego modelu       → cichy toast info (fallback IND-222 i tak działa),
 * - stan nieznany (sieć/no_key) → cisza (NIE alarmuj na podstawie problemu sieci).
 *
 * Nigdy nie wywraca aplikacji (try/catch wewn.). SSR-safe (guard window).
 */

import { useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';
import { getApiKeyHeaders } from '@/lib/api-keys-service';
import type { GeminiHealth } from '@/app/api/health/gemini/route';

const TTL_MS = 24 * 60 * 60 * 1000; // 24h
const STORAGE_KEY = 'health_check_last_run';

interface UseHealthCheckOptions {
  /** Wywoływane gdy klucz jest nieważny (np. otwarcie modalu BYOK). */
  onInvalidKey?: () => void;
}

interface RunHealthCheckOptions {
  /** Pomija dławik TTL (np. przyszły przycisk „Sprawdź teraz"). */
  force?: boolean;
}

export function useHealthCheck(options: UseHealthCheckOptions = {}) {
  const { onInvalidKey } = options;

  const runHealthCheck = useCallback(
    async ({ force = false }: RunHealthCheckOptions = {}): Promise<void> => {
      if (typeof window === 'undefined') return; // SSR guard
      try {
        if (!force) {
          const last = Number(localStorage.getItem(STORAGE_KEY) ?? '0');
          if (Date.now() - last < TTL_MS) return; // dławik
        }
        // Zapisz znacznik PRZED fetch - dedup w obrębie TTL niezależnie od wyniku
        // (mount + start gry dzielą jeden TTL, brak podwójnego sprawdzenia).
        localStorage.setItem(STORAGE_KEY, String(Date.now()));

        const res = await fetch('/api/health/gemini', {
          headers: getApiKeyHeaders(),
        });
        const health = (await res.json()) as GeminiHealth;

        if (health.keyValid === false) {
          toast({
            variant: 'destructive',
            title: 'Klucz Gemini nieważny',
            description: 'Sprawdź klucz API w ustawieniach aplikacji.',
          });
          onInvalidKey?.();
          return;
        }

        if (
          health.keyValid === true &&
          health.registry.chatModelsMissing.length > 0
        ) {
          toast({
            title: 'Część modeli niedostępna',
            description: 'Aplikacja użyje modelu zapasowego.',
          });
        }
        // keyValid === null (sieć / no_key) → cisza.
      } catch {
        // Self-check nigdy nie wywraca aplikacji.
      }
    },
    [onInvalidKey]
  );

  return { runHealthCheck };
}
