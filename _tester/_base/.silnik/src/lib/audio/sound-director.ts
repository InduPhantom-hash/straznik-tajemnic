/**
 * Sound Director Service (Issue #162)
 *
 * Integruje stan gry (Poczytalność / SAN, nastrój sceny [NASTRÓJ:], lokację
 * oraz rolę mówcy) w precyzyjne dyrektywy wokalne (Audio Prompting)
 * dla Gemini TTS API (gemini-2.5-flash-preview-tts / gemini-2.5-pro-preview-tts).
 *
 * Reguły:
 * - Dyrektywy wokalne po angielsku per specyfikację Google TTS.
 * - Model TTS interpretuje prefiks jako wskazówkę stylu, nie czytając go na głos.
 * - Jeśli brak kontekstu, stosuje klimatyczny domyślny ton Lovecrafta.
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
}

/**
 * Buduje instrukcję reżyserską dla syntezy audio.
 * Zwraca zwięzłą dyrektywę w języku angielskim.
 */
export function buildAudioDirection(context?: SoundDirectorContext): string {
  if (!context) {
    return 'Read the following in a captivating, atmospheric storytelling voice with a natural, steady pace and a suspenseful Lovecraftian undertone:';
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
  } = context;

  // 1. Kwestie NPC
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
      return 'Read the following in a terrified, trembling, and hurried voice:';
    }
    if (npcGender === 'female') {
      if (npcOccupation && /profesor|nauk|badacz|lekarz|doktor/i.test(npcOccupation)) {
        return 'Read the following in clear, articulate Polish with an intellectual, calm, and composed female voice:';
      }
      return 'Read the following in clear Polish with a natural, expressive female character voice:';
    }
    return 'Read the following in a natural, character-driven dramatic voice:';
  }

  // 2. Kwestie Narratora - modulowane przez Poczytalność (SAN) i nastrój
  const currentSan = typeof san === 'number' ? san : 60;
  const sanPercentage = currentSan / Math.max(maxSan, 1);

  // Szok po nagłej utracie SAN (≥ 5 punktów) lub krytycznie niska poczytalność
  if ((recentSanLoss && recentSanLoss >= 5) || sanPercentage <= 0.25) {
    return 'Read the following in an urgent, tense, and paranoid whisper, reflecting sudden terror and cosmic dread:';
  }

  // Obniżona poczytalność (< 50%)
  if (sanPercentage <= 0.5) {
    if (mood && /klaustrofob|dusząc|ciemn|mrocz/i.test(mood)) {
      return 'Read the following in a hushed, tense, and uneasy cadence with a steady, captivating pace:';
    }
    return 'Read the following in a tense, nervous, and suspenseful storytelling voice with a natural pace:';
  }

  // Stabilna wysoka poczytalność - dopasowanie do nastroju sceny
  if (mood) {
    if (/klaustrofob|dusząc|grobow/i.test(mood)) {
      return 'Read the following in a hushed, deep, and claustrophobic cadence, maintaining a focused and steady pace:';
    }
    if (/panik|alarm|walk|pościg|ucieczk/i.test(mood)) {
      return 'Read the following in an intense, rapid, and thrilling cadence:';
    }
    if (/oniryczn|nieostr|mgł|tajemnicz/i.test(mood)) {
      return 'Read the following in an ethereal, mysterious, and captivating cadence with a fluid, measured pace:';
    }
    if (/fałszywy spokój|spokoj/i.test(mood)) {
      return 'Read the following in a calm, crisp, but subtly eerie and watchful tone:';
    }
  }

  // Domyślny wciągający kronikarz Lovecrafta o naturalnym tempie radiowym
  return 'Read the following in a captivating, atmospheric storytelling voice with a natural, steady pace and a suspenseful Lovecraftian undertone:';
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
