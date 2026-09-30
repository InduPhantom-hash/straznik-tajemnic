import { normalizeSkillName } from '@/lib/skill-test-resolver';

export interface PendingSanityResolution {
  characterName?: string;
  failed: boolean;
  skillName: string;
}

const SAN_SYNONYMS = new Set([
  'poczytalnosc',
  'san',
  'sanity',
  'rozsadek',
  'punkty rozsadku',
  'zdrowie psychiczne',
]);

export function isSanitySkillName(skillName: string): boolean {
  if (!skillName) return false;
  const norm = normalizeSkillName(skillName);
  return (
    SAN_SYNONYMS.has(norm) ||
    norm.includes('poczytalnosc') ||
    norm.includes('sanity') ||
    /\bsan\b/.test(norm) ||
    norm.includes('rozsadek') ||
    norm.includes('zdrowie psychiczne')
  );
}

/**
 * Wykrywa oczekujące rozstrzygnięcia testów Poczytalności z wiadomości gracza.
 * Obsługuje rzuty z Tacki ([🎲 Test:...]), format systemowy [DICE_ROLL],
 * rzuty pojedyncze oraz zbiorcze wiadomości Duet (Hot Seat).
 */
export function detectPendingSanityTestResolution(message: string): PendingSanityResolution[] {
  if (!message || typeof message !== 'string') return [];

  const resolutions: PendingSanityResolution[] = [];
  const trimmed = message.trim();

  // 1. Tacka format: [🎲 Test: ...] lub [🎯 Test: ...]
  // Np. [🎲 Test: Poczytalność (50%)]
  // lub [🎲 Test: @Margaret Sullivan: Poczytalność (45%)]
  const tackaRegex = /\[(?:🎲|🎯)?\s*Test:\s*(?:@(?<charName>[^:\n\]]+):\s*)?(?<skill>[^(\]\n]+)(?:\s*\((?<target>\d+)%\))?\](?<details>[\s\S]*?)(?=(?:\[(?:🎲|🎯)?\s*Test:|\[DICE_ROLL\]|$))/gi;
  let match: RegExpExecArray | null;

  while ((match = tackaRegex.exec(trimmed)) !== null) {
    const rawSkill = match.groups?.skill?.trim() || '';
    if (!isSanitySkillName(rawSkill)) continue;

    const charName = match.groups?.charName?.trim() || undefined;
    const details = match.groups?.details || '';
    const targetStr = match.groups?.target;
    const target = targetStr ? parseInt(targetStr, 10) : undefined;

    let failed = false;
    if (/fumble|pech/i.test(details)) {
      failed = true;
    } else if (/niezdany|porażka|porazka|fail|❌/i.test(details)) {
      failed = true;
    } else if (/sukces|success|zdany|✅|✨/i.test(details)) {
      failed = false;
    } else {
      const rollMatch = /Wynik:\s*(\d+)/i.exec(details);
      if (rollMatch && target !== undefined) {
        const rollVal = parseInt(rollMatch[1], 10);
        failed = rollVal > target;
      }
    }

    resolutions.push({
      characterName: charName,
      failed,
      skillName: rawSkill,
    });
  }

  // 2. Format [DICE_ROLL] (pojedynczy lub zbiorczy z Duet)
  // Np. [DICE_ROLL] @Margaret Sullivan: test umiejętności "Poczytalność" (50%): wynik 75, PORAŻKA - PORAŻKA
  // lub [DICE_ROLL] Edward Carnby wykonał test umiejętności "Poczytalność"...
  // lub [DICE_ROLL] test umiejętności "Poczytalność" (50%): wynik 20, SUKCES - SUKCES
  const diceRollRegex = /\[DICE_ROLL\]\s*(?:(?:@?(?<charName>[A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż.\s]+?)(?::|\s+wykonał)\s+)?)test\s+umiejętności\s+"(?<skill>[^"]+)"(?:\s*\((?<target>\d+)%\))?:\s*wynik\s*(?<total>\d+),\s*(?<outcome>[^\n]+)/gi;

  while ((match = diceRollRegex.exec(trimmed)) !== null) {
    const rawSkill = match.groups?.skill?.trim() || '';
    if (!isSanitySkillName(rawSkill)) continue;

    const charName = match.groups?.charName?.trim() || undefined;
    const outcome = match.groups?.outcome || '';
    const targetStr = match.groups?.target;
    const totalStr = match.groups?.total;
    const target = targetStr ? parseInt(targetStr, 10) : undefined;
    const total = totalStr ? parseInt(totalStr, 10) : undefined;

    let failed = false;
    if (/fumble|pech/i.test(outcome)) {
      failed = true;
    } else if (/porażka|porazka|fail|niezdany|❌/i.test(outcome)) {
      failed = true;
    } else if (/sukces|success|zdany|✅/i.test(outcome)) {
      failed = false;
    } else if (total !== undefined && target !== undefined) {
      failed = total > target;
    }

    // Unikaj duplikatów jeśli ta sama postać została już sparsowana z Tacki
    const existingIdx = resolutions.findIndex(
      (r) => (r.characterName || '').toLowerCase() === (charName || '').toLowerCase()
    );
    if (existingIdx >= 0) {
      resolutions[existingIdx] = {
        characterName: charName,
        failed,
        skillName: rawSkill,
      };
    } else {
      resolutions.push({
        characterName: charName,
        failed,
        skillName: rawSkill,
      });
    }
  }

  return resolutions;
}

/**
 * Sprawdza czy tekst zawiera już znacznik [SANITY: ...] (ogólny lub dla danej postaci).
 */
export function hasSanityTagForCharacter(text: string, characterName?: string): boolean {
  if (!text) return false;

  const sanityTagRegex = /\[SANITY:\s*(?:@(?<who>[^:\]]+?)\s*:\s*)?[+-]?\s*(?:\d+[dDkK]\d+(?:[+-]\d+)?|\d+)(?:\s*:[^\]]*)?\]/gi;
  let match: RegExpExecArray | null;

  while ((match = sanityTagRegex.exec(text)) !== null) {
    const who = match.groups?.who?.trim();
    if (!characterName) {
      // W trybie jednoosobowym dowolny tag SANITY oznacza rozstrzygnięcie przez model
      return true;
    }
    if (who) {
      const normWho = who.toLowerCase();
      const normChar = characterName.toLowerCase();
      if (normWho === normChar || normWho.includes(normChar) || normChar.includes(normWho)) {
        return true;
      }
    } else {
      // Model wyemitował tag bez prefiksu @
      return true;
    }
  }

  if (!characterName && /\[SANITY:\s*[-+]?[^\]]+\]/i.test(text)) {
    return true;
  }

  return false;
}

/**
 * Generuje brakujące fallbacki SAN dla oblanych testów Poczytalności.
 * Zgodnie z CoC RAW i ustaleniami z PO (Jakub):
 * - minimalna strata: [SANITY: -1: Szok psychiczny (auto-sędzia)]
 * - w trybie Duet: [SANITY: @ImięBadacza: -1: Szok psychiczny (auto-sędzia)]
 * - przy zdanym teście SAN brak znacznika jest traktowany jako 0 SAN (brak fallbacku).
 */
export function generateSanityFallbacks(
  fullText: string,
  resolutions: PendingSanityResolution[],
  isDuet: boolean = false
): string[] {
  const fallbacks: string[] = [];

  for (const res of resolutions) {
    // Fallback działa WYŁĄCZNIE przy porażce i fumble
    if (!res.failed) continue;

    if (hasSanityTagForCharacter(fullText, res.characterName)) {
      continue;
    }

    if (res.characterName && isDuet) {
      fallbacks.push(`[SANITY: @${res.characterName}: -1: Szok psychiczny (auto-sędzia)]`);
    } else if (res.characterName && !isDuet) {
      fallbacks.push(`[SANITY: @${res.characterName}: -1: Szok psychiczny (auto-sędzia)]`);
    } else {
      fallbacks.push(`[SANITY: -1: Szok psychiczny (auto-sędzia)]`);
    }
  }

  return fallbacks;
}
