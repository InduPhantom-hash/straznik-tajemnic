/**
 * buildTimeContext - pure function dla sekcji TIME & ERA route.ts (IND-183 micro 2/5).
 *
 * Składa `timePromptSection` (string przekazywany jako pierwszy element
 * additionalContext) + `eraRules` (osobno bo używane też w stableInstructions
 * dla Gemini Context Cache OPT-26 w route.ts:174).
 *
 * Bazuje na kanonicznym `ResolvedEraContext` przekazanym przez preflight:
 *   - dokładny rok i region nie mają cichego fallbacku
 *   - timeContext = timeManager.formatForPrompt()
 *   - eraRules = getEraPromptInjection(gameEra)
 *   - atmosphere = getAtmosphereDirective(hour, moonPhase)
 *   - timePromptSection = nagłówek `## KONTEKST CZASOWY` + sekcje
 *
 * clock-debt fix: INSTRUKCJA DLA MG zawiera twardy nakaz zakończenia tury
 * znacznikiem `[AKTUALNY CZAS: ...]` (parsowany przez extractTimeUpdate →
 * przesuwa zegar gry). Bez tego zegar tkwił na czasie startowym, bo AI
 * rzadko wypisywała pełną datę w formacie regexa.
 *
 * Pure function (z perspektywy callera): zależności `timeManager` +
 * `getEraPromptInjection` + `getAtmosphereDirective` injected via import z
 * `@/lib/*` - mockowalne przez jest.
 */

import { timeManager } from '@/lib/time-manager';
import { getEraPromptInjection } from '@/lib/era-presets';
import { getAtmosphereDirective } from '@/lib/time-atmosphere';
import type { GameEra } from '@/lib/types';

import { resolveEraVisualProfile } from '@/lib/era-visual-style';
import { buildEraNarrativeRules, type ResolvedEraContext } from '@/lib/era';

// Helper przyjmuje wyłącznie kanoniczny kontekst epoki.
export interface BuildTimeContextOpts {
  eraContext: ResolvedEraContext;
}

export interface BuildTimeContextResult {
  timePromptSection: string;
  eraRules: string;
}

export function buildTimeContext(
  opts: BuildTimeContextOpts
): BuildTimeContextResult {
  const rawEra = String(opts.eraContext.effectiveYear);

  const profile = resolveEraVisualProfile(rawEra);
  const gameEra: GameEra =
    profile === '1930s'
      ? '1920s'
      : profile === '1950s'
        ? '1940s'
        : profile === '1980s'
          ? 'prl-1970s'
          : (profile as GameEra);

  const timeContext = timeManager.formatForPrompt();
  const eraRules = [
    buildEraNarrativeRules(opts.eraContext),
    getEraPromptInjection(gameEra),
  ].join('\n\n');


  const weather = timeManager.getWeather();
  const atmosphere = getAtmosphereDirective(
    timeManager.getTime().hour,
    timeManager.getMoonPhase()
  );

  const timePromptSection = `
## KONTEKST CZASOWY
${timeContext}

${eraRules}

**Aktualna Pogoda & Warunki:** ${weather}
**Atmosfera:** ${atmosphere}

**INSTRUKCJA DLA MG:**
- Opisując akcje, oceń ile czasu zajmują (np. "Badanie biblioteki zajęło ci 3 godziny")
- **OBOWIĄZKOWO** zakończ każdą turę zaktualizowanym znacznikiem czasu w formacie \`[AKTUALNY CZAS: DD Miesiąca RRRR, GG:MM]\` - weź aktualny czas powyżej i przesuń go o czas, który zajęły akcje gracza (przeszukanie pokoju +15 min, rozmowa +10 min, podróż przez miasto +1h, odpoczynek do rana). Marker jest w nawiasie kwadratowym - niewidoczny dla gracza i lektora, służy wyłącznie do przesuwania zegara gry.
- Jeśli chcesz zaktualizować pogodę w toku narracji, wstaw na końcu odpowiedni znacznik \`[POGODA: opis pogody]\`.
- Uwzględniaj powyższą pogodę oraz atmosferę w opisach (światło, dźwięki, nastrój)
- Nawiązuj do realiów epoki (np. dostępność technologii)
`;

  return { timePromptSection, eraRules };
}
