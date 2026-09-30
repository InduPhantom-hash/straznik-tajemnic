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
 *
 * Uwaga: Używamy numerowanych grup przechwytujących (match[N]) zamiast nazwanych (?<name>),
 * ze względu na cel kompilacji ES2017 w tsconfig.json.
 */
export function detectPendingSanityTestResolution(message: string): PendingSanityResolution[] {
  if (!message || typeof message !== 'string') return [];

  const resolutions: PendingSanityResolution[] = [];
  const trimmed = message.trim();

  // 1. Tacka format: [🎲 Test: ...] lub [🎯 Test: ...]
  // match[1]: charName (@...)
  // match[2]: skill
  // match[3]: target (%)
  // match[4]: details
  const tackaRegex = /\[(?:🎲|🎯)?\s*Test:\s*(?:@([^:\n\]]+):\s*)?([^(\]\n]+)(?:\s*\((\d+)%\))?\]([\s\S]*?)(?=(?:\[(?:🎲|🎯)?\s*Test:|\[DICE_ROLL\]|$))/gi;
  let match: RegExpExecArray | null;

  while ((match = tackaRegex.exec(trimmed)) !== null) {
    const rawSkill = match[2]?.trim() || '';
    if (!isSanitySkillName(rawSkill)) continue;

    const charName = match[1]?.trim() || undefined;
    const details = match[4] || '';
    const targetStr = match[3];
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
  // match[1]: charName
  // match[2]: skill
  // match[3]: target (%)
  // match[4]: total
  // match[5]: outcome
  const diceRollRegex = /\[DICE_ROLL\]\s*(?:(?:@?([A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż.\s]+?)(?::|\s+wykonał)\s+)?)test\s+umiejętności\s+"([^"]+)"(?:\s*\((\d+)%\))?:\s*wynik\s*(\d+),\s*([^\n]+)/gi;

  while ((match = diceRollRegex.exec(trimmed)) !== null) {
    const rawSkill = match[2]?.trim() || '';
    if (!isSanitySkillName(rawSkill)) continue;

    const charName = match[1]?.trim() || undefined;
    const outcome = match[5] || '';
    const targetStr = match[3];
    const totalStr = match[4];
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
 * match[1]: who (@...)
 */
export function hasSanityTagForCharacter(text: string, characterName?: string): boolean {
  if (!text) return false;

  const sanityTagRegex = /\[SANITY:\s*(?:@([^:\]]+?)\s*:\s*)?[+-]?\s*(?:\d+[dDkK]\d+(?:[+-]\d+)?|\d+)(?:\s*:[^\]]*)?\]/gi;
  let match: RegExpExecArray | null;

  while ((match = sanityTagRegex.exec(text)) !== null) {
    const who = match[1]?.trim();
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
