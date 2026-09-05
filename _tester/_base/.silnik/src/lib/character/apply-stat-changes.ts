/**
 * Most między tagami MG a kartą postaci - automatyczna utrata/odzysk SAN i HP
 * w trakcie sesji (Faza 5 audytu mechaniki, BRAK-1 + Issue #48 Poczytalność RAW).
 *
 * AI zgłasza zmiany strukturalnymi tagami w surowej narracji:
 *   [SANITY: -3: widok rozkładających się zwłok]
 *   [HP: -5: cios nożem]   (ujemne = utrata, dodatnie = leczenie)
 * Aplikacja sumuje delty i odejmuje/dodaje do karty z pełną egzekucją progów CoC 7e RAW:
 *   - utrata >= 5 SAN -> zdarzenie 'int_check_required'
 *   - utrata 1/5 dziennej SAN -> Czasowa Niepoczytalność + 'underlyingInsanity'
 *   - 'underlyingInsanity' -> każda utrata odpala atak szaleństwa
 *   - próg Mity Cthulhu > SAN -> redukcja strat SAN o 50%
 *
 * Wzorzec (ref-equality skip + wywołanie raz po pełnym streamie) jak
 * `appendJournalFromText` (IND-201). Tag jest usuwany z czatu przez
 * `narrative/cleanup.ts`, więc gracz nie widzi surowego znacznika.
 */

import type { Character } from '@/lib/types';
import { rollDiceFormula } from '@/lib/dice-utils';
import { resolveCharacterByName } from './match-by-name';
import { applySanityDelta, type SanityEvent } from '@/lib/sanity/sanity-engine';

export type { SanityEvent };

// Delta: stała ze znakiem (±N) ALBO notacja kości (±NdM, ±NdM±K). Obrażenia CoC są
// prawie zawsze kościowe (szpony 1d6, upadek 1d4), więc MG emituje np. [HP: -1D6: ...].
// Opcjonalny prefiks `@Imię:` wskazuje właściciela zmiany w duecie (fallback: aktywna
// postać). Powód dowolny do ']'. Globalne - sumujemy wszystkie wystąpienia.
const DELTA = String.raw`[+-]?(?:\d+[dD]\d+(?:[+-]\d+)?|\d+)`;
const SANITY_TAG = new RegExp(
  `\\[SANITY:\\s*(?:@(?<who>[^:\\]]+?)\\s*:\\s*)?(?<delta>${DELTA})(?:\\s*:\\s*(?<reason>[^\\]]*))?\\]`,
  'gi'
);
const HP_TAG = new RegExp(
  `\\[HP:\\s*(?:@(?<who>[^:\\]]+?)\\s*:\\s*)?(?<delta>${DELTA})(?:\\s*:[^\\]]*)?\\]`,
  'gi'
);

/**
 * Zamienia surową deltę na liczbę. Notacja kości (zawiera `d`/`D`) jest rzucana
 * przez `rollDiceFormula` ("Tacka liczy wszystko") - znak z przodu steruje kierunkiem
 * (`-1d6` = utrata), null z formuły → 0. Stała → `parseInt`.
 */
function parseDelta(raw: string): number {
  if (/[dD]/.test(raw)) {
    const sign = raw.trim().startsWith('-') ? -1 : 1;
    const formula = raw.replace(/^[+-]/, '');
    const rolled = rollDiceFormula(formula);
    return rolled ? sign * Math.abs(rolled.total) : 0;
  }
  return parseInt(raw, 10);
}

/** Clamp do [0, max]; gdy max nieokreślony - tylko dolne ograniczenie (0). */
function clampStat(value: number, max: number | undefined): number {
  const lower = Math.max(0, value);
  return max != null ? Math.min(max, lower) : lower;
}

interface SanityTagMatch {
  who?: string;
  delta: number;
  reason?: string;
}

/**
 * Zbiera tagi SAN z tekstu z rozbiciem na deltę i powód.
 */
function collectSanityMatches(text: string): SanityTagMatch[] {
  const matches: SanityTagMatch[] = [];
  SANITY_TAG.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = SANITY_TAG.exec(text)) !== null) {
    const delta = parseDelta(match.groups?.delta ?? '0');
    if (delta !== 0) {
      matches.push({
        who: match.groups?.who?.trim(),
        delta,
        reason: match.groups?.reason?.trim()
      });
    }
  }
  return matches;
}

/** Sumuje wszystkie delty HP pasujące do wzorca. */
function sumHpDeltas(text: string): number {
  let total = 0;
  let match: RegExpExecArray | null;
  HP_TAG.lastIndex = 0;
  while ((match = HP_TAG.exec(text)) !== null) {
    total += parseDelta(match.groups?.delta ?? '0');
  }
  return total;
}

/**
 * Aplikuje zmiany SAN/HP z tagów [SANITY:]/[HP:] w surowym tekście MG dla pojedynczego badacza.
 * Zwraca TEN SAM obiekt (referencyjnie), gdy nie ma żadnej zmiany - caller
 * może tanio pominąć zapis/persist (jak przy appendJournalFromText).
 */
export function applyStatChangesFromText(
  character: Character,
  rawText: string,
  onSanityEvent?: (event: SanityEvent) => void
): Character {
  const sanMatches = collectSanityMatches(rawText);
  const hpDelta = sumHpDeltas(rawText);
  if (sanMatches.length === 0 && hpDelta === 0) return character;

  let next = { ...character };

  // Aplikuj każdą zmianę SAN przez regułowy silnik Poczytalności CoC 7e
  for (const match of sanMatches) {
    const result = applySanityDelta(next, match.delta, match.reason);
    next = result.nextCharacter;
    for (const event of result.events) {
      onSanityEvent?.(event);
    }
  }

  if (hpDelta !== 0) {
    next.hp = clampStat(character.hp + hpDelta, character.maxHp);
    const maxHp = character.maxHp || character.hp || 10;
    const threshold = Math.floor(maxHp / 2);
    if (hpDelta <= -threshold) {
      next.hasMajorWound = true;
    }
    if (next.hp <= 0) {
      next.isUnconscious = true;
      if (next.hasMajorWound) {
        next.isDying = true;
      }
    } else if (next.hp > 0 && next.isDying) {
      next.isDying = false;
    }
  }

  return next;
}

/** Zbiera delty HP (po jednym rzucie na tag) z grupowaniem po docelowej postaci. */
function collectHpDeltas(
  text: string,
  characters: Character[],
  active: Character
): Map<string, number> {
  const byChar = new Map<string, number>();
  HP_TAG.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = HP_TAG.exec(text)) !== null) {
    const target = resolveCharacterByName(
      characters,
      match.groups?.who,
      active
    );
    const delta = parseDelta(match.groups?.delta ?? '0');
    if (delta !== 0) {
      byChar.set(target.id, (byChar.get(target.id) ?? 0) + delta);
    }
  }
  return byChar;
}

/**
 * Wariant party-aware (duet / Hot Seat): kieruje każdą zmianę SAN/HP do postaci
 * wskazanej prefiksem `@Imię` w tagu (`[SANITY:@Eleanor: -1]`), a bez prefiksu - do
 * `activeCharacter` (fallback, zachowuje zachowanie single-player).
 *
 * Zwraca zaktualizowaną listę postaci + zsynchronizowaną aktywną + flagę `changed`
 * oraz listę wyemitowanych zdarzeń psychicznych `sanityEvents`.
 */
export function applyStatChangesToParty(
  characters: Character[],
  activeCharacter: Character,
  rawText: string,
  onSanityEvent?: (event: SanityEvent) => void
): {
  characters: Character[];
  activeCharacter: Character;
  changed: boolean;
  sanityEvents: SanityEvent[];
} {
  const sanMatches = collectSanityMatches(rawText);
  const hpByChar = collectHpDeltas(rawText, characters, activeCharacter);

  if (sanMatches.length === 0 && hpByChar.size === 0) {
    return { characters, activeCharacter, changed: false, sanityEvents: [] };
  }

  // Zgrupuj zmiany SAN po postaci
  const sanByChar = new Map<string, Array<{ delta: number; reason?: string }>>();
  for (const m of sanMatches) {
    const target = resolveCharacterByName(characters, m.who, activeCharacter);
    const list = sanByChar.get(target.id) ?? [];
    list.push({ delta: m.delta, reason: m.reason });
    sanByChar.set(target.id, list);
  }

  let changed = false;
  const allEvents: SanityEvent[] = [];

  const apply = (c: Character): Character => {
    const sanList = sanByChar.get(c.id);
    const hpD = hpByChar.get(c.id) ?? 0;
    if (!sanList && hpD === 0) return c;

    changed = true;
    let next = { ...c };

    if (sanList) {
      for (const entry of sanList) {
        const res = applySanityDelta(next, entry.delta, entry.reason);
        next = res.nextCharacter;
        for (const ev of res.events) {
          allEvents.push(ev);
          onSanityEvent?.(ev);
        }
      }
    }

    if (hpD !== 0) {
      next.hp = clampStat(c.hp + hpD, c.maxHp);
      const maxHp = c.maxHp || c.hp || 10;
      const threshold = Math.floor(maxHp / 2);
      if (hpD <= -threshold) {
        next.hasMajorWound = true;
      }
      if (next.hp <= 0) {
        next.isUnconscious = true;
        if (next.hasMajorWound) {
          next.isDying = true;
        }
      } else if (next.hp > 0 && next.isDying) {
        next.isDying = false;
      }
    }

    return next;
  };

  const nextCharacters = characters.map(apply);
  const nextActive =
    nextCharacters.find((c) => c.id === activeCharacter.id) ??
    apply(activeCharacter);

  return {
    characters: nextCharacters,
    activeCharacter: nextActive,
    changed,
    sanityEvents: allEvents
  };
}
