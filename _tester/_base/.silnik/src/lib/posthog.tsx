'use client';

/**
 * PostHog Provider — śledzenie kliknięć i replay sesji użytkownika
 *
 * Aktywuje się gdy NEXT_PUBLIC_POSTHOG_KEY jest ustawiony w środowisku.
 * Bez klucza komponent renderuje children bez żadnego efektu ubocznego.
 *
 * Zmienne środowiskowe:
 *   NEXT_PUBLIC_POSTHOG_KEY   — klucz projektu z app.posthog.com (wymagany)
 *   NEXT_PUBLIC_POSTHOG_HOST  — host (domyślnie: https://eu.i.posthog.com)
 *
 * Co rejestruje:
 *   - każde kliknięcie, zmianę URL, scroll
 *   - video replay sesji (co widział użytkownik przed błędem)
 *   - wyjście ze strony (pageleave) — czas spędzony w aplikacji
 *
 * Co NIE rejestruje:
 *   - treść pól tekstowych (maskAllInputs: true)
 *   - klucze API ani dane sesji
 */

import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { useEffect } from 'react';

let posthogInitialized = false;

const ANONYMOUS_ID_KEY = 'posthog_anonymous_id';
const LAST_VISIT_KEY = 'posthog_last_visit';
const RETURN_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * Stable per-browser identyfikator. Bez auth aplikacji — to najlepsze co możemy.
 * Ten sam user na 2 urządzeniach = 2 oddzielne tożsamości; jeśli kiedyś
 * pojawi się login, wywołaj `identifyUser(realId)` żeby zmergować profile.
 */
export function getPostHogUserId(): string | null {
  if (typeof window === 'undefined') return null;
  let id = localStorage.getItem(ANONYMOUS_ID_KEY);
  if (!id) {
    id = `anon_${crypto.randomUUID()}`;
    localStorage.setItem(ANONYMOUS_ID_KEY, id);
  }
  return id;
}

function PostHogInit() {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host =
      process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

    if (!key || posthogInitialized) return;

    posthog.init(key, {
      api_host: host,
      // Nie twórz profilu dopóki użytkownik się nie zidentyfikuje
      person_profiles: 'identified_only',
      // Next.js zarządza routingiem — nie przechwytuj pageview automatycznie
      capture_pageview: false,
      // Zarejestruj wyjście ze strony dla pomiaru czasu
      capture_pageleave: true,
      // Session replay — nagrywa co widział użytkownik
      session_recording: {
        maskAllInputs: true, // ukryj treść inputów (klucze API, hasła)
        maskTextSelector: '.sensitive', // dodatkowe selektory do maskowania
      },
      // Wyślij w partiach — nie blokuj sieci przy każdym kliknięciu
      request_batching: true,
    });

    posthogInitialized = true;

    // Auto-identify per browser — bez tego retention/funnel są bezużyteczne
    const anonId = getPostHogUserId();
    if (anonId) {
      posthog.identify(anonId);

      // Retention tracking: czy user wraca po >24h?
      const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
      if (lastVisit) {
        const hoursSince =
          (Date.now() - parseInt(lastVisit, 10)) / (1000 * 60 * 60);
        if (Date.now() - parseInt(lastVisit, 10) > RETURN_THRESHOLD_MS) {
          posthog.capture('app_returned_after_24h', {
            hoursSinceLastVisit: Math.round(hoursSince),
          });
        }
      }
      localStorage.setItem(LAST_VISIT_KEY, String(Date.now()));
    }
  }, []);

  return null;
}

interface PHProviderProps {
  children: React.ReactNode;
}

/**
 * Owijaj tym providerem cały layout aby PostHog działał wszędzie.
 * Jeśli klucz nie jest ustawiony — transparentny wrapper (no-op).
 *
 * Uwaga: w trybie no-key hook `usePostHog()` z `posthog-js/react` nie
 * zadziała, bo PostHogProvider nie jest wtedy montowany. Konsumenci
 * powinni używać `trackEvent`/`identifyUser` (defensywne no-op).
 */
export function PHProvider({ children }: PHProviderProps) {
  // Bez klucza nie montuj PostHogProvider — children renderują bezpośrednio.
  // NEXT_PUBLIC_POSTHOG_KEY jest inlineowane build-time → spójność SSR/CSR.
  // .trim() — defensywa dla whitespace przy ręcznym kopiowaniu klucza do .env.
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim()) {
    return <>{children}</>;
  }

  return (
    <PostHogProvider client={posthog}>
      <PostHogInit />
      {children}
    </PostHogProvider>
  );
}

/**
 * Utility: ręczne wysyłanie zdarzenia z dowolnego komponentu klienckiego.
 *
 * Przykład:
 *   trackEvent('dice_roll', { result: 18, skill: 'Spot Hidden' })
 *   trackEvent('chat_message_sent', { model: 'gemini-3-flash', messageLength: 142 })
 *   trackEvent('tts_played', { provider: 'elevenlabs', npc: 'Inspektor Legrasse' })
 */
export function trackEvent(
  name: string,
  properties?: Record<string, string | number | boolean | null>
) {
  if (!posthogInitialized) return;
  posthog.capture(name, properties);
}

/**
 * Utility: identyfikacja użytkownika (np. po załadowaniu ID z localStorage).
 *
 * Przykład:
 *   identifyUser('user_1746123_abc', { characterName: 'Henryk Wiśniewski' })
 */
export function identifyUser(
  userId: string,
  traits?: Record<string, string | number | boolean | null>
) {
  if (!posthogInitialized) return;
  posthog.identify(userId, traits);
}
