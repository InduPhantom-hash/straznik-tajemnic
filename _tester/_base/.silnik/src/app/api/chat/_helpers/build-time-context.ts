/**
 * buildTimeContext - pure function dla sekcji TIME & ERA route.ts (IND-183 micro 2/5).
 *
 * Składa `timePromptSection` (string przekazywany jako pierwszy element
 * additionalContext) + `eraRules` (osobno bo używane też w stableInstructions
 * dla Gemini Context Cache OPT-26 w route.ts:174).
 *
 * Bazuje na oryginalnym route.ts (lin 139-161 przed split):
 *   - gameEra = adventureContext.era || '1920s'
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

// Minimal shape z adventureContext - tylko `era` używane w sekcji TIME & ERA.
// Pełny AdventureContext z @/lib/types ma więcej pól, ale helper nie potrzebuje
// reszty (luźny kontrakt = łatwiejszy mock w testach).
export interface BuildTimeContextOpts {
  adventureContext?: { era?: string } | null;
}

export interface BuildTimeContextResult {
  timePromptSection: string;
  eraRules: string;
}

export function buildTimeContext(
  opts: BuildTimeContextOpts
): BuildTimeContextResult {
  const eraMap: Record<string, GameEra> = {
      gaslight: '1890s',
      classic: '1920s',
      noir: '1940s',
      prl: 'prl-1970s',
      modern: 'modern',
    };
  const gameEra: GameEra =
    eraMap[opts.adventureContext?.era ?? 'classic'] ?? '1920s';
  const timeContext = timeManager.formatForPrompt();
  const eraRules = getEraPromptInjection(gameEra);

  const atmosphere = getAtmosphereDirective(
    timeManager.getTime().hour,
    timeManager.getMoonPhase()
  );

  const timePromptSection = `
## KONTEKST CZASOWY
${timeContext}

${eraRules}

**Atmosfera:** ${atmosphere}

**INSTRUKCJA DLA MG:**
- Opisując akcje, oceń ile czasu zajmują (np. "Badanie biblioteki zajęło ci 3 godziny")
- **OBOWIĄZKOWO** zakończ każdą turę zaktualizowanym znacznikiem czasu w formacie \`[AKTUALNY CZAS: DD Miesiąca RRRR, GG:MM]\` - weź aktualny czas powyżej i przesuń go o czas, który zajęły akcje gracza (przeszukanie pokoju +15 min, rozmowa +10 min, podróż przez miasto +1h, odpoczynek do rana). Marker jest w nawiasie kwadratowym - niewidoczny dla gracza i lektora, służy wyłącznie do przesuwania zegara gry.
- Uwzględniaj powyższą atmosferę w opisach (światło, dźwięki, nastrój)
- Nawiązuj do realiów epoki (np. dostępność technologii)
`;

  return { timePromptSection, eraRules };
}
