/**
 * Sound Director Service (Issue #162 + Issue #463 + Issue #561)
 *
 * Integruje stan gry (Poczytalność / SAN, nastrój sceny [NASTRÓJ:], lokację,
 * zdarzenia regułowe oraz rolę mówcy) w precyzyjne dyrektywy wokalne (Audio Prompting)
 * dla Gemini TTS API (gemini-3.1-flash-tts-preview / gemini-2.5-flash-preview-tts).
 *
 * Filozofia Narratora Radiowego z Histerezą Sceny (Issue #561):
 * 1. Zrównoważony, dynamiczny ton bazowy (Audiobook Baseline):
 *    Klarowna, zaangażowana narracja radiowa w naturalnym tempie i z wyrazistą dykcją,
 *    która nie usypia i nie nuży gracza przy dłuższych sesjach.
 * 2. Wygładzanie tempa na poziomie akapitu/sceny (Scene-Level Hysteresis):
 *    Ton i tempo lektora pozostają spójne w obrębie całego akapitu/sceny. Gwałtowne
 *    przejścia w szept ('whisper') lub bieg akcji ('action') są zastrzeżone wyłącznie
 *    dla krytycznych zdarzeń regułowych (szok SAN >= 5, SAN <= 25%, walka/pościg),
 *    a nie pojedynczych słów w prozie.
 * 3. Subtelne tło nastroju sceny ([NASTRÓJ:]):
 *    Nadaje ogólny koloryt i klimat opowieści (noir / cosmic mystery), bez spowalniania
 *    tempa i bez narzucania monotonnego szeptu na cały blok tekstu.
 */

import type { Character } from '../types';

export interface SoundDirectorContext {
  san?: number;
  maxSan?: number;
  mood?: string;
  location?: string;
  isNpc?: boolean;
  speakerName?: string;
  npcRole?: string;
  npcGender?: 'male' | 'female';
  npcAge?: 'young' | 'adult' | 'old';
  npcOccupation?: string;
  npcPersonality?: string;
  recentSanLoss?: number;
  sentenceText?: string;
  hasActiveCombat?: boolean;
}

export type SentencePacing = 'whisper' | 'action' | 'baseline';

export interface SentencePacingContext {
  san?: number;
  maxSan?: number;
  mood?: string;
  hasActiveCombat?: boolean;
}

/**
 * Sprawdza, czy tekst zawiera jawny znacznik walki lub pościgu GM Protocol.
 */
export function hasCombatOrChaseTag(text?: string): boolean {
  return (
    !!text &&
    /\[\s*(?:WALKA|WALKA_ATAK|OBRONA_WALKA|ATAK_WALKA|COMBAT|ATAK_WRĘCZ|ATAK_WRECZ|MELEE_ATTACK|OPPOSED_MELEE|MELEE_DEFENSE|POŚCIG|POSCIG|CHASE)\s*:/i.test(
      text
    )
  );
}

/**
 * Rozpoznaje tryb tempa (histereza na poziomie akapitu/sceny - Issue #561).
 * Zastrzega tryb 'whisper' i 'action' wyłącznie dla krytycznych zdarzeń regułowych
 * (utrata SAN >= 5, krytycznie niskie SAN <= 25%, jawny tag walki/pościgu lub nastrój starcia/pościgu).
 * Pojedyncze słowa w prozie ('mrok', 'chłód', 'dusi', 'wstrzymujesz oddech', 'zwłoki')
 * NIGDY nie wywracają tempa pojedynczego zdania (zwracają 'baseline').
 */
export function classifySentencePacing(
  text?: string,
  recentSanLoss?: number,
  context?: SentencePacingContext
): SentencePacing {
  const san = context?.san;
  const maxSan = context?.maxSan ?? 100;
  const sanPercentage =
    typeof san === 'number' ? san / Math.max(maxSan, 1) : 1;

  // 1. Krytyczny szok SAN (utrata >= 5 pkt, jawny tag [SANITY: -5...] lub krytycznie niskie SAN <= 25%)
  const hasCriticalSanTag =
    !!text &&
    /\[SANITY:\s*-(?:[5-9]|\d{2,}|1[dk](?:6|8|10|20|100)|[2-9][dk]\d+)\b/i.test(
      text
    );
  if (
    (recentSanLoss && recentSanLoss >= 5) ||
    hasCriticalSanTag ||
    sanPercentage <= 0.25
  ) {
    return 'whisper';
  }

  // 2. Krytyczne zdarzenie bojowe / pościg (jawny tag regułowy lub aktywny nastrój walki/pościgu)
  const hasCombatOrChaseMood =
    !!context?.mood &&
    /panik|alarm|walk|pościg|ucieczk|atak|starcie|zagrożeni/i.test(context.mood);
  if (
    context?.hasActiveCombat ||
    hasCombatOrChaseTag(text) ||
    hasCombatOrChaseMood
  ) {
    return 'action';
  }

  return 'baseline';
}

/**
 * Buduje instrukcję reżyserską dla syntezy audio.
 * Zwraca zwięzłą dyrektywę w języku angielskim per specyfikację Google TTS.
 */
export function buildAudioDirection(context?: SoundDirectorContext): string {
  if (!context) {
    return 'Read the following in clear, natural Polish with an engaging, articulate, and confident audiobook narrator voice, dynamic pacing, and crisp diction:';
  }

  const {
    san,
    maxSan = 100,
    mood,
    isNpc,
    npcRole,
    npcGender,
    npcAge,
    npcOccupation,
    recentSanLoss,
    sentenceText,
    hasActiveCombat,
  } = context;

  // 1. Kwestie NPC (zachowują aktorskie zróżnicowanie ról)
  if (isNpc) {
    if (npcRole === 'monster') {
      return 'Read the following in an eerie, unsettling, rasping, and inhuman tone:';
    }
    if (npcRole === 'old' || npcAge === 'old') {
      return 'Read the following in a mature, weathered, and gravelly character voice:';
    }
    if (npcRole === 'young' || npcAge === 'young') {
      return 'Read the following in a youthful, emotional, and expressive voice:';
    }
    if (mood && /panik|strach|groza|przeraż/i.test(mood)) {
      return 'Read the following in a terrified, trembling, and emotional voice:';
    }
    if (npcGender === 'female') {
      if (npcOccupation && /profesor|nauk|badacz|lekarz|doktor/i.test(npcOccupation)) {
        return 'Read the following in clear, articulate Polish with an intellectual, calm, and composed female voice:';
      }
      return 'Read the following in clear Polish with a natural, expressive female character voice:';
    }
    return 'Read the following in a natural, conversational character voice:';
  }

  // 2. Wygładzanie tempa na poziomie akapitu/sceny (Histereza - Issue #561)
  const currentSan = typeof san === 'number' ? san : 60;
  const sanPercentage = currentSan / Math.max(maxSan, 1);
  const pacing = classifySentencePacing(sentenceText, recentSanLoss, {
    san: currentSan,
    maxSan,
    mood,
    hasActiveCombat,
  });

  if (pacing === 'whisper') {
    return 'Read the following in an urgent, tense, and paranoid whisper, reflecting sudden terror, breathless panic, and cosmic dread:';
  }

  if (pacing === 'action') {
    return 'Read the following in an intense, thrilling cadence with dynamic momentum and crisp diction:';
  }

  // 3. Kwestie Narratora - ogólny kontekst sceny (spójny ton audiobooka w całym akapicie)
  // Obniżona poczytalność (< 50%) - trzyma napięcie i atmosferę, ale zachowuje płynne tempo audiobooka
  if (sanPercentage <= 0.5) {
    if (mood && /klaustrofob|dusząc|ciemn|mrocz/i.test(mood)) {
      return 'Read the following in clear Polish with a tense, dark, and uneasy cadence with a captivating pace:';
    }
    return 'Read the following in clear Polish with a tense, suspenseful, and engaging storytelling voice with a natural pace:';
  }

  // Stabilna wysoka poczytalność - dopasowanie podtonu nastroju do sceny
  if (mood) {
    if (/klaustrofob|dusząc|grobow/i.test(mood)) {
      return 'Read the following in clear Polish with a deep, atmospheric, and claustrophobic cadence, maintaining a focused and steady pace:';
    }
    if (/oniryczn|nieostr|mgł|tajemnicz/i.test(mood)) {
      return 'Read the following in an ethereal, mysterious, and captivating cadence with a fluid, measured pace:';
    }
    if (/fałszywy spokój|spokoj/i.test(mood)) {
      return 'Read the following in a calm, crisp, but subtly eerie and watchful tone:';
    }
  }

  // Domyślny ton bazowy: wciągający, wyrazisty narrator radiowy (nie usypia po 5 minutach)
  return 'Read the following in clear, natural Polish with an engaging, articulate, and confident audiobook narrator voice, dynamic pacing, and crisp diction:';
}

/**
 * Pobiera aktualną poczytalność aktywnego badacza z localStorage.
 */
export function getActiveCharacterSan(): { san?: number; maxSan?: number } {
  if (typeof window === 'undefined') return {};
  try {
    const saved = window.localStorage.getItem('characters');
    if (!saved) return {};
    const chars = JSON.parse(saved) as Character[];
    if (!Array.isArray(chars) || chars.length === 0) return {};
    const active = chars.find((c) => c.isActive) || chars[0];
    if (active && typeof active.san === 'number') {
      const mythosRaw = active.skills?.['cthulhu_mythos'];
      const mythosVal =
        typeof mythosRaw === 'number'
          ? mythosRaw
          : typeof mythosRaw === 'object' && mythosRaw !== null && 'value' in mythosRaw
          ? Number((mythosRaw as { value: unknown }).value) || 0
          : 0;
      const maxSan = 99 - mythosVal;
      return { san: active.san, maxSan };
    }
  } catch {
    // ignore
  }
  return {};
}

/**
 * Wyciąga tag nastroju sceny [NASTRÓJ: ...] z tekstu odpowiedzi MG.
 */
export function extractMoodFromText(text: string): string | undefined {
  if (!text) return undefined;
  const match = text.match(/\[NASTRÓJ:\s*([^\]]+)\]/i);
  return match ? match[1].trim() : undefined;
}

/**
 * Wykrywa nagłą stratę SAN w tekście (tag GM Protocol lub język naturalny).
 */
export function extractSanLossFromText(text: string): number | undefined {
  if (!text) return undefined;
  const criticalDiceMatch =
    /\[SANITY:\s*-\s*(?:1[dk](?:6|8|10|20|100)|[2-9][dk]\d+)\b/i.exec(text);
  if (criticalDiceMatch) {
    return 6;
  }
  const minorDiceMatch = /\[SANITY:\s*-\s*1[dk](?:2|3|4)\b/i.exec(text);
  if (minorDiceMatch) {
    return 2;
  }
  const tagMatch = /\[SANITY:\s*-\s*(\d+)\b/i.exec(text);
  if (tagMatch) {
    return parseInt(tagMatch[1], 10);
  }
  const naturalMatch =
    /tracisz\s+(\d+)\s+(?:punkt(?:ów|y|u)?\s+)?poczytalności/i.exec(text) ||
    /poczytalność\s+spada\s+o\s+(\d+)/i.exec(text);
  if (naturalMatch) {
    return parseInt(naturalMatch[1], 10);
  }
  return undefined;
}
