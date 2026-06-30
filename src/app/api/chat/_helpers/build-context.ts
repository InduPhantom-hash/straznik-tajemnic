/**
 * buildAdditionalContext - pure function dla sekcji 8 route.ts (IND-71 micro 1/3).
 *
 * Składa tablicę `additionalContext: string[]` przekazywaną do
 * `provider.streamChat({ geminiOptions: { additionalContext } })`.
 *
 * Zachowuje 1:1 kolejność push'y z oryginalnego route.ts (lin 267-315 przed split):
 *   1. timePromptSection
 *   2. gmProtocol (tylko gdy NIE cache - OPT-26: cache zawiera już protokół)
 *   3. getPacingDirective(gameContext)
 *   4. directorSection (jeśli sessionId + state istnieje)
 *   5. ragSection (jeśli niepuste)
 *   6. summarySection (jeśli niepuste)
 *   7. gameContextPrompt LUB NPC context (zależnie od skipContext + dostępności)
 *   8. HOT SEAT FIX (jeśli hotSeatConfig.enabled + ≥2 graczy)
 *
 * Pure function: brak side effects, brak async. Wszystkie zależności (getPacingDirective,
 * getDirectorPromptSection) injected via import z `@/lib/*` - mockowalne przez jest.
 */

import type { CachedContent } from '@google/genai';
import { getPacingDirective } from '@/lib/pacing-controller';
import { getDirectorPromptSection } from '@/lib/director-state';
import type { GameContext } from '@/lib/prompt-section-parser';
import type { Character } from '@/lib/types';
import { getSkillValue } from '@/lib/types';

/**
 * Buduje sekcję promptu z umiejętnościami postaci (nazwa + wartość %), by AI wzywało
 * testy `[TEST:]` WYŁĄCZNIE nazwami z karty. Eliminuje rozjazd nazewnictwa, przez który
 * AI prosiło o test nazwą spoza karty → resolver zwracał 0% → Tacka „próg ≤0".
 * Zwraca pusty string gdy brak postaci/umiejętności (sekcja się nie wstrzykuje).
 */
export function buildPlayerSkillsSection(
  character: Character | null | undefined
): string {
  const skills = character?.skills;
  if (!skills) return '';
  const list = Object.entries(skills)
    .map(([name, value]) => `${name} ${getSkillValue(value)}%`)
    .join(', ');
  if (!list) return '';
  return (
    `\n## UMIEJĘTNOŚCI POSTACI (lista z karty)\n${list}\n` +
    `Gdy wzywasz test \`[TEST:]\`, użyj DOKŁADNIE nazwy umiejętności z tej listy. ` +
    `Jeśli akcja nie pasuje do żadnej, wybierz najbliższą z listy albo test cechy ` +
    `(np. Inteligencja, Spostrzegawczość) - NIGDY nie wymyślaj nazwy spoza karty.`
  );
}

// IND-160: minimal NPC context shape z body request (cleanup `any` z lin 255 route.ts).
export interface NpcContextEntry {
  name: string;
  status?: 'alive' | 'unknown' | 'dead' | string;
  occupation?: string;
  description?: string;
}

// IND-72: minimal Hot Seat player shape z body request (cleanup `any` z lin 291 route.ts).
export interface HotSeatPlayerEntry {
  characterName?: string;
}

export interface BuildAdditionalContextOpts {
  timePromptSection: string;
  gmProtocol: string;
  gameContext: GameContext;
  resolvedCachedContent: CachedContent | null;
  // IND-223: imię postaci gracza (steruje człowiek) - oznaczamy ją jawnie w
  // kontekście, by AI nigdy nie generowało jej wypowiedzi/akcji.
  playerCharacterName?: string;
  // Uzbrojenie postaci gracza (sekcja promptu z buildPlayerWeaponContext). Wstrzykiwane
  // gdy niepuste, by AI prowadziło walkę narracyjnie znając broń + umiejętność + obrażenia.
  playerWeaponsSection?: string;
  // Lista umiejętności postaci z wartościami % (gotowa sekcja). Wstrzykiwana, by AI
  // wzywało testy WYŁĄCZNIE nazwami z karty - eliminuje rozjazd nazw (Tacka 0%).
  playerSkillsSection?: string;
  sessionId?: string;
  ragSection?: string;
  summarySection?: string | null;
  /** Sekcja z realnymi handoutami przygody (DriveThruRPG) - markdown do wstawienia przez MG. */
  handoutsSection?: string;
  /** C1: instrukcja recapu przy wznowieniu zapisanej gry (null gdy nie wznowienie). */
  sessionRecapSection?: string | null;
  skipContext?: boolean;
  gameContextPrompt?: string;
  npcs?: NpcContextEntry[];
  currentLocation?: string;
  hotSeatConfig?: { enabled?: boolean; players?: HotSeatPlayerEntry[] };
}

export function buildAdditionalContext(
  opts: BuildAdditionalContextOpts
): string[] {
  const {
    timePromptSection,
    gmProtocol,
    gameContext,
    resolvedCachedContent,
    sessionId,
    ragSection,
    summarySection,
    handoutsSection,
    sessionRecapSection,
    skipContext,
    gameContextPrompt,
    npcs,
    currentLocation,
    hotSeatConfig,
    playerCharacterName,
    playerWeaponsSection,
    playerSkillsSection,
  } = opts;

  const additionalContext: string[] = [timePromptSection];

  // C1: recap przy wznowieniu zapisanej gry - instrukcja "zrób recap w tej turze".
  if (sessionRecapSection) {
    additionalContext.push(sessionRecapSection);
  }

  // IND-223: jawne oznaczenie postaci gracza (steruje człowiek). Wstrzykiwane
  // ZAWSZE (nie cache'owane jak gmProtocol), by AI dostawało konkretne imię i
  // twardy zakaz grania za gracza nawet po przejściu na compact protokół.
  if (playerCharacterName) {
    additionalContext.push(
      `\n## POSTAĆ GRACZA (STERUJE CZŁOWIEK)\nPostać gracza: **${playerCharacterName}**. To człowiek podejmuje jej decyzje, pisze jej kwestie i wykonuje jej akcje. NIGDY nie generuj wypowiedzi, myśli ani działań postaci ${playerCharacterName} - opisz świat i reakcje NPC, a potem zatrzymaj się na [Co robisz?] i czekaj na input gracza.`
    );
  }

  // Uzbrojenie postaci gracza - by AI prowadziło walkę narracyjnie znając broń.
  if (playerWeaponsSection) {
    additionalContext.push(playerWeaponsSection);
  }

  // Umiejętności postaci - AI ma wzywać testy WYŁĄCZNIE nazwami z tej listy.
  if (playerSkillsSection) {
    additionalContext.push(playerSkillsSection);
  }

  // OPT-26: gmProtocol skip gdy cache aktywny - jest już w cachedContent.contents
  if (!resolvedCachedContent) additionalContext.push(gmProtocol);
  additionalContext.push(getPacingDirective(gameContext));

  // Director's state injection
  if (sessionId) {
    const directorSection = getDirectorPromptSection(sessionId);
    if (directorSection) additionalContext.push(directorSection);
  }

  if (ragSection) additionalContext.push(ragSection);
  if (summarySection) additionalContext.push(summarySection);
  // Realne handouty przygody (DriveThruRPG) - MG dostaje markdown obrazów do wstawienia.
  if (handoutsSection) additionalContext.push(handoutsSection);

  // OPT-23: game context injection (gameContextPrompt LUB NPC fallback)
  if (!skipContext && gameContextPrompt) {
    additionalContext.push(gameContextPrompt);
  } else if (!skipContext && npcs && npcs.length > 0) {
    const activeNPCs = npcs.filter(
      (npc) => npc.status === 'alive' || npc.status === 'unknown'
    );
    if (activeNPCs.length > 0) {
      let npcContext = '\n## AKTYWNE POSTACIE (NPC)\n';
      for (const npc of activeNPCs.slice(0, 10)) {
        npcContext += `- **${npc.name}**`;
        if (npc.occupation) npcContext += ` (${npc.occupation})`;
        if (npc.description) npcContext += `: ${npc.description.slice(0, 100)}`;
        npcContext += '\n';
      }
      if (currentLocation) {
        npcContext += `\nAktualna lokacja gracza: ${currentLocation}\n`;
      }
      additionalContext.push(npcContext);
    }
  }

  // OPT-22: Hot Seat FIX prompt (≥2 graczy z resolved characterName)
  if (hotSeatConfig?.enabled && (hotSeatConfig?.players?.length ?? 0) >= 2) {
    const characterNames = (hotSeatConfig.players ?? [])
      .map((p) => p.characterName || 'Nieznany')
      .filter((n) => n !== 'Nieznany');
    if (characterNames.length >= 2) {
      const endingMarkers = characterNames
        .map((n) => `[Co robisz, @${n}?]`)
        .join(' oraz ');
      additionalContext.push(
        `\n## TRYB GRY DLA DWÓCH OSÓB (HOT SEAT)\n` +
          `W grze uczestniczą postacie: ${characterNames.join(', ')}\n` +
          `Sceny wspólne (świat, wydarzenia, scena dla obu) opisuj BEZ tagu - są dla wszystkich.\n` +
          `Kwestie i akcje kierowane do JEDNEJ postaci poprzedzaj tagiem @ImięPostaci: (np. @${characterNames[0]}: ...).\n` +
          `ZAKOŃCZENIE TURY w duecie: zamiast jednego [Co robisz?] zakończ pytaniem do KAŻDEJ postaci osobno: ${endingMarkers}. ` +
          `Jeśli scena dotyczy tylko jednej z nich, jasno wskaż czyja kolej (np. [Co robisz, @${characterNames[0]}?]).\n` +
          `PRZYPISANIE SKUTKÓW DO POSTACI: gdy utrata/odzysk SAN/HP albo wpis dziennika dotyczy KONKRETNEJ postaci, dodaj jej imię prefiksem @Imię w tagu: ` +
          `\`[SANITY:@${characterNames[0]}: -1d4: powód]\`, \`[HP:@${characterNames[1]}: -1d6: powód]\`, \`[DZIENNIK:@${characterNames[0]}:trop:tytuł]treść[/DZIENNIK]\`. ` +
          `Bez prefiksu @Imię skutek trafia do postaci AKTYWNEJ - więc ZAWSZE oznaczaj właściciela, gdy zmiana dotyczy postaci innej niż aktualnie grająca.`
      );
    }
  }

  return additionalContext;
}
