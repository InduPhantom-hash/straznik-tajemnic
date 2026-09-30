import type { AISettings } from '../ai-settings/types';

export interface NarrativeStyleOptions {
  turnsInCurrentLocation?: number;
}

/**
 * Buduje instrukcje stylu narracji MG na podstawie parametrów z Ustawień
 * (Długość odpowiedzi, Poziom szczegółowości, Kreatywność).
 * Likwiduje problem 'ślepych pokręteł' (Issue #279) oraz pętle sensoryczne (Issue #563).
 */
export function buildNarrativeStyleInstructions(
  style?: Partial<AISettings['gameMasterNarration']['style']>,
  behavior?: Partial<AISettings['gameMasterNarration']['behavior']>,
  locale: 'pl' | 'en' = 'pl',
  options?: NarrativeStyleOptions
): string {
  const responseLength = style?.responseLength || 'medium';
  const detailLevel = style?.detailLevel || 'standard';
  const creativity = behavior?.creativity || 'balanced';
  const isSubsequentTurn = Boolean(options?.turnsInCurrentLocation && options.turnsInCurrentLocation > 0);

  if (locale === 'en') {
    let instructions = '\n\n## KEEPER NARRATION STYLE & PACING CALIBRATION\n';

    // Response length
    if (responseLength === 'short') {
      instructions +=
        '- **Response Length (CONCISE):** Keep descriptions brief and punchy (1-2 sentences per scene/beat). Prioritize rapid back-and-forth interaction.\n';
    } else if (responseLength === 'long') {
      instructions +=
        '- **Response Length (EXPANSIVE):** Deliver rich, multi-paragraph literary prose with full scene immersion, environmental depth, and somatic reactions.\n';
    } else {
      instructions +=
        '- **Response Length (BALANCED):** Deliver 3-5 well-crafted sentences per turn, balancing pacing and descriptive depth.\n';
    }

    // Detail level
    if (detailLevel === 'minimal') {
      instructions +=
        '- **Detail Level (MINIMAL):** Focus strictly on actionable, functional clues and core physical geography. Avoid heavy embellishment.\n';
    } else if (detailLevel === 'detailed') {
      instructions +=
        '- **Detail Level (DETAILED):** Heavily engage 2-3 sensory channels (smell, draft, texture, temperature, ominous sounds) and historical authenticity.\n';
    } else {
      instructions +=
        '- **Detail Level (STANDARD):** Maintain classic Lovecraftian atmospheric grounding without overwhelming the player.\n';
    }

    // Creativity
    if (creativity === 'conservative') {
      instructions +=
        '- **Creativity (CONSERVATIVE):** Strictly follow established scenario canon, existing NPC behaviors, and explicit written clues.\n';
    } else if (creativity === 'creative') {
      instructions +=
        '- **Creativity (CREATIVE):** Freely improvise surprising twists, evocative environmental hazards, and vivid psychological manifestations within Mythos themes.\n';
    } else {
      instructions +=
        '- **Creativity (BALANCED):** Stay grounded in the investigation while tastefully adapting to unexpected player actions.\n';
    }

    // Sentence rhythm & audio pacing (Issue #561)
    instructions +=
      '- **Sentence Rhythm & Audio Cadence (BALANCED FLOW):** Balance sentence rhythm across descriptive prose so it flows smoothly for audiobook narration. Avoid extreme sentence-length contrasts (such as alternating one-word fragments with sprawling run-on sentences) within a single paragraph.\n';

    // Iron Rule: Anti-Habituation (Single Anchor) - always present (Issue #563)
    instructions +=
      '- **Anti-Habituation (Single Anchor - SENSORY MEMORY):** Establish the static sensory baseline of a location or building (persistent smells like carbolic/mildew, baseline cold/frost, dead silence, static architecture) ONLY ONCE upon first entry. On subsequent turns in the same location or zone, forbid repeating static background anchors and rotate to dynamic senses (tactile+visual) and investigative action.\n';

    if (isSubsequentTurn) {
      const turnNumber = (options?.turnsInCurrentLocation ?? 1) + 1;
      instructions +=
        `- **ACTIVE SUBSEQUENT TURN IN LOCATION (Turn #${turnNumber} - ANTI-HABITUATION ENFORCED / NO FILLER):** The investigator has already absorbed the static sensory baseline of this location. Strictly forbid repeating ambient smells (carbolic, mildew), constant room temperature/frost, or dead silence. Drive straight to tangible object interactions, NPC reactions, and dynamic changes without redundant scene re-establishment.\n`;
    }

    return instructions;
  }

  // Polish locale
  let instructions = '\n\n## KALIBRACJA STYLU I DŁUGOŚCI NARRACJI MG\n';

  // Response length
  if (responseLength === 'short') {
    instructions +=
      '- **Długość odpowiedzi (KRÓTKA):** Trzymaj opisy w zwięzłej, dynamicznej formie (1-2 zdania na turę). Skup się na szybkiej interakcji ping-pong z graczem.\n';
  } else if (responseLength === 'long') {
    instructions +=
      '- **Długość odpowiedzi (DŁUGA):** Twórz wieloakapitowe, bogate opisy w duchu powieści grozy Lovecrafta, z pełną głębią klimatyczną i reakcjami somatycznymi.\n';
  } else {
    instructions +=
      '- **Długość odpowiedzi (ŚREDNIA):** Prowadź zbalansowaną narrację (3-5 zdań na turę), łącząc klimat z płynnym tempem rozgrywki.\n';
  }

  // Detail level
  if (detailLevel === 'minimal') {
    instructions +=
      '- **Szczegółowość (MINIMALNA):** Podawaj tylko kluczowe, namacalne fakty i bezpośrednie poszlaki. Ogranicz poetyckie ozdobniki.\n';
  } else if (detailLevel === 'detailed') {
    instructions +=
      '- **Szczegółowość (SZCZEGÓŁOWA):** Angażuj minimum 2-3 kanały sensoryczne (zapach, wilgoć, temperatura, chrzęst, faktura) oraz realizm epoki.\n';
  } else {
    instructions +=
      '- **Szczegółowość (STANDARDOWA):** Utrzymuj klasyczny, lovecraftowski nastrój bez przeładowywania gracza nadmiarem drobiazgów.\n';
  }

  // Creativity
  if (creativity === 'conservative') {
    instructions +=
      '- **Kreatywność (KONSERWATYWNA):** Rygorystycznie trzymaj się faktów ze scenariusza, zachowań NPC i podanych w RAG poszlak.\n';
  } else if (creativity === 'creative') {
    instructions +=
      '- **Kreatywność (KREATYWNA):** Śmiało improwizuj nieoczekiwane komplikacje, anomalie pogodowe i psychologiczne omamy w duchu Mitów Cthulhu.\n';
  } else {
    instructions +=
      '- **Kreatywność (ZBALANSOWANA):** Zachowaj równowagę między wiernością śledztwu a naturalnym reagowaniem na nietypowe pomysły gracza.\n';
  }

  // Sentence rhythm & audio pacing (Issue #561)
  instructions +=
    '- **Rytmika fraz i płynność lektora (ZRÓWNOWAŻONA KADENCJA):** Zrównoważ rytmikę fraz w prozie opisowej, aby tekst brzmiał naturalnie i płynnie w odczycie lektora audiobooka. Unikaj skrajnych kontrastów długości zdań (np. przeplatania jednowyrazowych równoważników z wielokrotnie złożonymi tasiemcami) w jednym akapicie.\n';

  // Iron Rule: Anti-Habituation (Single Anchor) - always present (Issue #563)
  instructions +=
    '- **Anti-Habituation (Single Anchor - PAMIĘĆ SENSORYCZNA):** Stałą kotwicę sensoryczną lokacji lub obiektu (zapachy tła jak karbol czy stęchizna, stały chłód/mróz, martwą ciszę, architekturę) opisuj WYŁĄCZNIE RAZ przy pierwszym wejściu. W kolejnych turach w tej samej lokacji lub strefie obowiązuje zakaz powtarzania stałego tła; przejdź na zmysły dynamiczne (dotyk+wzrok) i działanie śledcze.\n';

  // Active subsequent turn enforcement (Issue #563)
  if (isSubsequentTurn) {
    const turnNumber = (options?.turnsInCurrentLocation ?? 1) + 1;
    instructions +=
      `- **AKTYWNA TURA KOLEJNA W LOKACJI (Tura #${turnNumber} - ANTI-HABITUATION / LIKWIDACJA PĘTLI / NO FILLER):** Badacz zaadaptował się już do stałego tła sensorycznego tej lokacji. Bezwzględny zakaz powtarzania stałych zapachów (karbol, stęchizna), stałego chłodu/mrozu i martwej ciszy. Przejdź od razu do interakcji z badanymi obiektami lub NPC bez ponownego ustawiania sceny.\n`;
  }

  return instructions;
}

/**
 * Zwięzła sekcja aktywnej tury kolejnej do wstrzyknięcia w additionalContext
 * bez duplikowania całego bloku kalibracji stylu, długości i kreatywności z systemPrompt.
 */
export function buildActiveTurnAntiHabituationSection(
  turnsInCurrentLocation: number,
  locale: 'pl' | 'en' = 'pl'
): string {
  if (turnsInCurrentLocation <= 0) return '';
  const turnNumber = turnsInCurrentLocation + 1;
  if (locale === 'en') {
    return (
      `\n## ACTIVE SUBSEQUENT TURN IN LOCATION (Turn #${turnNumber} - ANTI-HABITUATION)\n` +
      `- **Anti-Habituation (Single Anchor) ACTIVE:** The static sensory baseline of this location has already been described. Strictly forbid repeating ambient smells (carbolic, mildew), constant cold/frost, or dead silence. Rotate to dynamic senses (tactile+visual) and drive straight into investigative action or NPC interaction without filler.\n`
    );
  }
  return (
    `\n## AKTYWNA TURA KOLEJNA W LOKACJI (Tura #${turnNumber} - ANTI-HABITUATION)\n` +
    `- **Anti-Habituation (Single Anchor) AKTYWNE:** Stałe tło sensoryczne tej lokacji zostało już opisane. Bezwzględny zakaz powtarzania stałych zapachów (karbol, stęchizna), stałego chłodu/mrozu i martwej ciszy. Przejdź na zmysły dynamiczne (dotyk+wzrok) i bezpośrednio do akcji śledczej lub reakcji NPC bez wypełniaczy.\n`
  );
}

