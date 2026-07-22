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
  isGameStart?: boolean;
  characters?: Character[];
  npcs?: NpcContextEntry[];
  currentLocation?: string;
  hotSeatConfig?: { enabled?: boolean; players?: HotSeatPlayerEntry[] };
  tone?: 'purist' | 'pulp' | 'noir' | 'neutral';
  /** Sekcja danych immersyjnych (astronomia, gazety, ceny epoki) - wstrzykiwana gdy dostępna. */
  immersionSection?: string;
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
    isGameStart,
    characters,
  } = opts;

  const additionalContext: string[] = [timePromptSection];

  // C1: recap przy wznowieniu zapisanej gry - instrukcja "zrób recap w tej turze".
  if (sessionRecapSection) {
    additionalContext.push(sessionRecapSection);
  }

  // IND-223: jawne oznaczenie postaci gracza (steruje człowiek). Wstrzykiwane
  // ZAWSZE (nie cache'owane jak gmProtocol), by AI dostawało konkretne imię i
  // twardy zakaz grania za gracza nawet po przejściu na compact protokół.
  // IND-223: jawne oznaczenie postaci gracza w trybie SOLO. W trybie Hot Seat z 2+ postaciami
  // ta sekcja jest zastępowana dedykowanym blokiem ## TRYB GRY DLA DWÓCH OSÓB.
  const isHotSeatActive = hotSeatConfig?.enabled && (hotSeatConfig?.players?.length ?? 0) >= 2;
  if (playerCharacterName && !isHotSeatActive) {
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

  // Wstrzykiwanie Ustawy Przygody na podstawie tonu (dynamiczne pacingi z debaty)
  const sessionTone = opts.tone || 'purist';
  if (sessionTone === 'noir') {
    additionalContext.push(
      `\n## USTAWA O PRZYGODZIE NOIR\n` +
      `1. Prowadź grę w stylu Noir (powolne tempo, slow-burn, mrok, beznadzieja). NPC prezentują oficjalną Maskę, ale kierują się Ukrytym Celem/Strachem (są nieufni, podejrzliwi).\n` +
      `2. Zasoby są skrajnie ograniczone (rzadka amunicja, brak gotowych środków obrony).\n` +
      `3. CIĘCIA MONTAŻOWE: Teleportuj postać do nowej lokacji natychmiast po jej zadeklarowaniu. Jeśli jednak gracz wprost chce zrobić coś w drodze (np. czytać, przepytać kierowcę), rozegraj to jako mikro-scenę w podróży przed przeniesieniem.\n` +
      `4. SZALEŃSTWO: Przy stracie Poczytalności narzucaj traumę, fobie i luki w pamięci bezpośrednio w opisie zachowania badacza (jako wyjątek od sprawczości). Nigdy nie pisz o punktach ani mechanice w narracji.`
    );
  } else if (sessionTone === 'pulp') {
    additionalContext.push(
      `\n## USTAWA O PRZYGODZIE PULP CTHULHU\n` +
      `1. Prowadź grę w stylu Pulp/Wild Science (dynamiczna akcja, pościgi, anomalie). Badacze są twardsi i rany goją się szybciej.\n` +
      `2. CIĘCIA MONTAŻOWE: Pomijaj zbędne przejścia i od razu wrzucaj badaczy w centrum akcji nowej lokacji, chyba że gracz zadeklarował konkretną czynność w trakcie drogi.\n` +
      `3. SZALEŃSTWO: Utrata poczytalności wywołuje widowiskowy, filmowy szał lub nagłe popadnięcie w nietypową fobię opisaną sensorycznie. Brak mechanicznego języka w narracji.`
    );
  } else if (sessionTone === 'purist') {
    additionalContext.push(
      `\n## USTAWA O PRZYGODZIE KLASYCZNEJ (LOVECRAFTIAN)\n` +
      `1. Prowadź grę w klasycznym stylu Lovecrafta (powolne popadanie w szaleństwo, badanie starych ksiąg i rodów). NPC skrywają swoje prawdziwe oblicze pod Maską.\n` +
      `2. CIĘCIA MONTAŻOWE: Domyślnie teleportuj badacza do nowej lokacji. Jeśli gracz wprost opisał chęć zrobienia czegoś w podróży (np. lektura, obserwacja), rozegraj to przed cięciem.\n` +
      `3. SZALEŃSTWO: Narzucaj traumę i czasową amnezję bezpośrednio w opisie badacza po porażce SAN. Zakaz używania pojęć mechanicznych (punktów, testów) w prozie opisu.`
    );
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

  // Etap 3: dane immersyjne (astronomia, gazety epoki, przelicznik cen) - wzbogacają narrację.
  if (opts.immersionSection) additionalContext.push(opts.immersionSection);

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
      
      let duetContext = `\n## TRYB GRY DLA DWÓCH OSÓB (HOT SEAT / DRUŻYNA)\n` +
        `KRYTYCZNE NADPISANIE ROLI: Ta gra NIE jest jednoosobowa. W grze uczestniczy ZESPÓŁ badaczy: ${characterNames.join(', ')}.\n` +
        `1. FORMA NARRACJI: Opisuj świat i sceny w liczbie mnogiej ("Widzicie...", "Stajecie przed...", "Wchodzicie...") lub w ujęciach adresowanych ("@${characterNames[0]}..., podczas gdy @${characterNames[1]}..."). NIGDY nie zwracaj się do nich jak do pojedynczej osoby w 2. osobie l.poj.\n` +
        `2. RELACJA I WSPÓLNY CEL: Prowadź grę z uwzględnieniem faktu, że bohaterowie współpracują. Podkreślaj ich interakcje, relacje oraz to, co sprowadziło ich razem w dany punkt czasu i przestrzeni.\n` +
        `3. ADRESOWANIE I AKCJE: Sceny wspólne opisuj dla obu postaci. Kwestie i akcje kierowane do JEDNEJ postaci poprzedzaj tagiem @ImięPostaci: (np. @${characterNames[0]}: ...).\n` +
        `4. ZAKOŃCZENIE TURY: Zamiast jednego [Co robisz?] ZAWSZE kończ pytaniem do KAŻDEJ postaci osobno: ${endingMarkers}.\n` +
        `5. PRZYPISANIE SKUTKÓW: Przy zmianach SAN/HP/dziennika dodawaj prefiks @Imię: \`[SANITY:@${characterNames[0]}: -1d4: powód]\`, \`[HP:@${characterNames[1]}: -1d6: powód]\`, \`[DZIENNIK:@${characterNames[0]}:trop:tytuł]treść[/DZIENNIK]\`.\n`;

      if (isGameStart && characters && characters.length >= 2) {
        duetContext += `\n### WPROWADZENIE DLA DUETU (ROZPOCZĘCIE GRY)\n` +
          `Otwierasz grę dla dwójki graczy. Twoja pierwsza tura musi nakreślić wspólny początek z myślą o obu postaciach:\n` +
          `1. OPISZ RELACJĘ I SPOTKANIE: Opisz jak postacie się tam znalazły, dlaczego podróżują/działają razem, co je łączy i dlaczego są w tym miejscu i czasie w tym samym momencie.\n` +
          `2. DRUŻYNOWY HAK: Zwiąż hook przygody ze wspólnym celem obu postaci, odwołując się do ich tła z kart.\n` +
          `3. FORMA: Zwróć się bezpośrednio do obu postaci jednocześnie w liczbie mnogiej.\n\n` +
          `Dane bohaterów do zarysowania relacji i spotkania:\n`;
        
        characters.forEach((char) => {
          duetContext += `- **${char.name}** (${char.occupation}): ${char.background || ''}\n` +
            `  * Koncept: ${char.characterConcept || ''}\n` +
            `  * Osobowość i Cechy: ${(char.traits || []).join(', ')}. ${((char as unknown) as Record<string, unknown>).personality || ''}\n` +
            `  * Kluczowa osoba: ${char.significantPerson || ''}\n` +
            `  * Ważne miejsce: ${char.meaningfulLocation || ''}\n` +
            `  * Cenne posiadanie: ${char.treasuredPossession || ''}\n` +
            `  * Historia: ${char.backstory || ''}\n`;
        });
      }

      additionalContext.push(duetContext);
    }
  }

  return additionalContext;
}
