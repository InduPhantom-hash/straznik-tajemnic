'use client';

/**
 * @file LoadingIndicator - animowane kropki + progresja labela "Mistrz Gry..." (IND-144 Wariant C, sesja 131).
 *
 * Extracted z ChatWindow.tsx jako micro 5/8. Brak propsów - statyczny
 * loading state używany conditional w ChatWindow {isLoading && ...}.
 *
 * Latency UX (2026-06-23): model myślący ULTRA (3.1-pro) ma TTFB ~17-25s.
 * Przez cały ten czas gracz widzi ten komponent. Zmiana tekstu po kilku
 * sekundach sygnalizuje, że MG pracuje nad sceną, a nie że apka się zawiesiła.
 * Komponent montuje/odmontowuje się per tura (conditional), więc licznik
 * startuje od zera dla każdej odpowiedzi.
 */

import { useEffect, useState } from 'react';

/** Progi (sekundy) zmiany komunikatu przy rosnącym czasie myślenia modelu. */
const PHASE_2_AFTER_S = 15;
const PHASE_1_AFTER_S = 6;

function labelForSeconds(seconds: number): string {
  if (seconds >= PHASE_2_AFTER_S) return 'Mistrz Gry waży słowa...';
  if (seconds >= PHASE_1_AFTER_S) return 'Mistrz Gry układa scenę...';
  return 'Mistrz Gry odpowiada...';
}

export function LoadingIndicator() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center justify-center gap-3 py-4">
      <div className="flex gap-1.5">
        <div
          className="w-2 h-2 bg-primary rotate-45 shadow-[0_0_8px_rgba(13,148,136,0.5)] animate-bounce"
          style={{ animationDelay: '0ms', animationDuration: '0.6s' }}
        />
        <div
          className="w-2 h-2 bg-primary rotate-45 shadow-[0_0_8px_rgba(13,148,136,0.5)] animate-bounce"
          style={{ animationDelay: '200ms', animationDuration: '0.6s' }}
        />
        <div
          className="w-2 h-2 bg-primary rotate-45 shadow-[0_0_8px_rgba(13,148,136,0.5)] animate-bounce"
          style={{ animationDelay: '400ms', animationDuration: '0.6s' }}
        />
      </div>
      <span className="text-sm text-brass font-special-elite uppercase tracking-[0.12em] animate-pulse">
        {labelForSeconds(seconds)}
      </span>
    </div>
  );
}
