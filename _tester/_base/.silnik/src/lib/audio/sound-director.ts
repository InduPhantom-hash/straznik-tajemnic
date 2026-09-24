/**
 * Sound Director Service (Issue #162 + Issue #463)
 *
 * Integruje stan gry (Poczytalność / SAN, nastrój sceny [NASTRÓJ:], lokację,
 * treść konkretnego zdania oraz rolę mówcy) w precyzyjne dyrektywy wokalne (Audio Prompting)
 * dla Gemini TTS API (gemini-3.1-flash-tts-preview / gemini-2.5-flash-preview-tts).
 *
 * Filozofia Hybrydowego Narratora Radiowego:
 * 1. Zrównoważony, dynamiczny ton bazowy (Audiobook Baseline):
 *    Klarowna, zaangażowana narracja radiowa w naturalnym tempie i z wyrazistą dykcją,
 *    która nie usypia i nie nuży gracza przy dłuższych sesjach.
 * 2. Punktowa modulacja emocji zdań (Sentence-Level Pacing):
 *    Szepty, paraliżujący lęk, nagłe zrywy akcji czy złowrogie odkrycia są aplikowane
 *    wyłącznie do pojedynczych zdań o skrajnym ładunku dramatycznym.
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
}

export type SentencePacing = 'whisper' | 'action' | 'revelation' | 'baseline';

/**
 * Rozpoznaje ładunek dramatyczny konkretnego zdania.
 * Zwraca kategorię tempa / emocji dla lektora.
 */
export function classifySentencePacing(text?: string, recentSanLoss?: number): SentencePacing {
  if (!text) {
    if (recentSanLoss && recentSanLoss >= 5) return 'whisper';
    return 'baseline';
  }

  // 1. Bezpośredni szok SAN, paraliżujący lęk lub ciche skradanie
  const isWhisperTrigger =
    (recentSanLoss && recentSanLoss >= 5) ||
    /\[SANITY:\s*-[5-9]\d*:/i.test(text) ||
    /(?:paraliżując|wstrzymujesz\s+oddech|na\s+palcach|szeptem|w\s+absolutnej\s+ciszy|zaciska\s+gardło|dusi\s+cię|zamierasz\s+w\s+bezruchu|bezszelestnie|paniczny\s+strach|potworny\s+widok)/iu.test(
      text
    );
  if (isWhisperTrigger) {
    return 'whisper';
  }

  // 2. Nagły zryw akcji / adrenalina / starcie / ucieczka
  const isActionTrigger =
    /(?:rzuca\s+się|skacze|atakuje|strzela|wystrzał|eksplozj|uciekaj|uciekasz|biegniesz|dopada\s+cię|błyskawicznie|gwałtownie|krzyk\s+bólu)/iu.test(
      text
    );
  if (isActionTrigger) {
    return 'action';
  }

  // 3. Złowrogie makabryczne odkrycie / kulminacja
  const isRevelationTrigger =
    /(?:rozczłonkowan|zmasakrowan|pradawn(?:y|e|a|ych|ym)\s+symbol|monolit|krwaw(?:y|e|a|ych)\s+ślad|makabryczn|martw(?:e|y|ego)\s+ciał|bezwładn(?:e|ych)\s+zwłok)/iu.test(
      text
    );
  if (isRevelationTrigger) {
    return 'revelation';
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

  // 2. Punktowa modulacja emocji na poziomie konkretnego zdania
  if (sentenceText) {
    const pacing = classifySentencePacing(sentenceText, recentSanLoss);
    if (pacing === 'whisper') {
      return 'Read the following in an urgent, tense, and paranoid whisper, reflecting sudden terror, breathless panic, and cosmic dread:';
    }
    if (pacing === 'action') {
      return 'Read the following in an urgent and intense cadence with sharp, punchy diction:';
    }
    if (pacing === 'revelation') {
      return 'Read the following in a measured, ominous, and deliberate voice of dark revelation:';
    }
  }

  // 3. Kwestie Narratora - ogólny kontekst (gdy brak zdania lub zdanie to baseline)
  const currentSan = typeof san === 'number' ? san : 60;
  const sanPercentage = currentSan / Math.max(maxSan, 1);

  // Bezpośredni szok SAN w kontekście (gdy nie przekazano sentenceText)
  if ((recentSanLoss && recentSanLoss >= 5) || (!sentenceText && sanPercentage <= 0.25)) {
    return 'Read the following in an urgent, tense, and paranoid whisper, reflecting sudden terror, breathless panic, and cosmic dread:';
  }

  // Sceny dynamicznej akcji, pościgu, walki i bezpośredniego zagrożenia w nastroju sceny
  if (mood && /panik|alarm|walk|pościg|ucieczk|atak|starcie|zagrożeni/i.test(mood)) {
    return 'Read the following in an intense, thrilling cadence with dynamic momentum and crisp diction:';
  }

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
  const tagMatch = /\[SANITY:\s*(-?\d+):/i.exec(text);
  if (tagMatch) {
    const val = parseInt(tagMatch[1], 10);
    return Math.abs(val);
  }
  const naturalMatch =
    /tracisz\s+(\d+)\s+(?:punkt(?:ów|y|u)?\s+)?poczytalności/i.exec(text) ||
    /poczytalność\s+spada\s+o\s+(\d+)/i.exec(text);
  if (naturalMatch) {
    return parseInt(naturalMatch[1], 10);
  }
  return undefined;
}
