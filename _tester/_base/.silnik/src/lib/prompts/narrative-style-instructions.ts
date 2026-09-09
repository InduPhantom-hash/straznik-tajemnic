import type { AISettings } from '../ai-settings/types';

/**
 * Buduje instrukcje stylu narracji MG na podstawie parametrów z Ustawień
 * (Długość odpowiedzi, Poziom szczegółowości, Kreatywność).
 * Likwiduje problem 'ślepych pokręteł' (Issue #279).
 */
export function buildNarrativeStyleInstructions(
  style?: AISettings['gameMasterNarration']['style'],
  behavior?: AISettings['gameMasterNarration']['behavior'],
  locale: 'pl' | 'en' = 'pl'
): string {
  const responseLength = style?.responseLength || 'medium';
  const detailLevel = style?.detailLevel || 'standard';
  const creativity = behavior?.creativity || 'balanced';

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

  return instructions;
}
