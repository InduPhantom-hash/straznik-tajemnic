/**
 * Most między tagami MG a kartą postaci - automatyczna utrata/odzysk SAN i HP
 * w trakcie sesji (Faza 5 audytu mechaniki, BRAK-1).
 *
 * AI zgłasza zmiany strukturalnymi tagami w surowej narracji:
 *   [SANITY: -3: widok rozkładających się zwłok]
 *   [HP: -5: cios nożem]   (ujemne = utrata, dodatnie = leczenie)
 * Aplikacja sumuje delty i odejmuje/dodaje do karty z clampem do [0, max].
 *
 * Wzorzec (ref-equality skip + wywołanie raz po pełnym streamie) jak
 * `appendJournalFromText` (IND-201). Tag jest usuwany z czatu przez
 * `narrative/cleanup.ts`, więc gracz nie widzi surowego znacznika.
 */

import type { Character } from '@/lib/types';
import { rollDiceFormula } from '@/lib/dice-utils';
import { resolveCharacterByName } from './match-by-name';

// Delta: stała ze znakiem (±N) ALBO notacja kości (±NdM, ±NdM±K). Obrażenia CoC są
// prawie zawsze kościowe (szpony 1d6, upadek 1d4), więc MG emituje np. [HP: -1D6: ...].
// Opcjonalny prefiks `@Imię:` wskazuje właściciela zmiany w duecie (fallback: aktywna
// postać). Powód dowolny do ']'. Globalne - sumujemy wszystkie wystąpienia.
const DELTA = String.raw`[+-]?(?:\d+[dD]\d+(?:[+-]\d+)?|\d+)`;
const SANITY_TAG = new RegExp(
  `\\[SANITY:\\s*(?:@(?<who>[^:\\]]+?)\\s*:\\s*)?(?<delta>${DELTA})\\s*:[^\\]]*\\]`,
  'gi'
);
const HP_TAG = new RegExp(
  `\\[HP:\\s*(?:@(?<who>[^:\\]]+?)\\s*:\\s*)?(?<delta>${DELTA})\\s*:[^\\]]*\\]`,
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

/** Sumuje wszystkie delty pasujące do wzorca (np. [HP: -2] + [HP: -1d4] = -2 - rzut). */
function sumDeltas(text: string, pattern: RegExp): number {
  let total = 0;
  let match: RegExpExecArray | null;
  pattern.lastIndex = 0;
  while ((match = pattern.exec(text)) !== null) {
    total += parseDelta(match.groups?.delta ?? '0');
  }
  return total;
}

/** Clamp do [0, max]; gdy max nieokreślony - tylko dolne ograniczenie (0). */
function clampStat(value: number, max: number | undefined): number {
  const lower = Math.max(0, value);
  return max != null ? Math.min(max, lower) : lower;
}

/**
 * Aplikuje zmiany SAN/HP z tagów [SANITY:]/[HP:] w surowym tekście MG.
 * Zwraca TEN SAM obiekt (referencyjnie), gdy nie ma żadnej zmiany - caller
 * może tanio pominąć zapis/persist (jak przy appendJournalFromText).
 */
export function applyStatChangesFromText(
  character: Character,
  rawText: string
): Character {
  const sanDelta = sumDeltas(rawText, SANITY_TAG);
  const hpDelta = sumDeltas(rawText, HP_TAG);
  if (sanDelta === 0 && hpDelta === 0) return character;

  const next = { ...character };
  if (sanDelta !== 0) {
    next.san = clampStat(character.san + sanDelta, character.maxSan ?? 99);
  }
  if (hpDelta !== 0) {
    next.hp = clampStat(character.hp + hpDelta, character.maxHp);
  }
  return next;
}

/** Zbiera delty (po jednym rzucie na tag) z grupowaniem po docelowej postaci. */
function collectDeltas(
  text: string,
  pattern: RegExp,
  characters: Character[],
  active: Character
): Map<string, number> {
  const byChar = new Map<string, number>();
  pattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
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
 * `activeCharacter` (fallback, zachowuje zachowanie single-player). Dzięki temu
 * utrata SAN/HP postaci z narracji nie ląduje już na aktywnym graczu.
 *
 * Zwraca zaktualizowaną listę postaci + zsynchronizowaną aktywną + flagę `changed`
 * (gdy false, caller pomija persist - jak przy applyStatChangesFromText).
 */
export function applyStatChangesToParty(
  characters: Character[],
  activeCharacter: Character,
  rawText: string
): { characters: Character[]; activeCharacter: Character; changed: boolean } {
  const sanByChar = collectDeltas(
    rawText,
    SANITY_TAG,
    characters,
    activeCharacter
  );
  const hpByChar = collectDeltas(rawText, HP_TAG, characters, activeCharacter);

  if (sanByChar.size === 0 && hpByChar.size === 0) {
    return { characters, activeCharacter, changed: false };
  }

  let changed = false;
  const apply = (c: Character): Character => {
    const sanD = sanByChar.get(c.id) ?? 0;
    const hpD = hpByChar.get(c.id) ?? 0;
    if (sanD === 0 && hpD === 0) return c;
    changed = true;
    const next = { ...c };
    if (sanD !== 0) next.san = clampStat(c.san + sanD, c.maxSan ?? 99);
    if (hpD !== 0) next.hp = clampStat(c.hp + hpD, c.maxHp);
    return next;
  };

  const nextCharacters = characters.map(apply);
  // Aktywna zwykle jest w `characters` - weź jej zaktualizowaną wersję; gdyby była
  // spoza listy (edge), zastosuj zmianę bezpośrednio.
  const nextActive =
    nextCharacters.find((c) => c.id === activeCharacter.id) ??
    apply(activeCharacter);

  return { characters: nextCharacters, activeCharacter: nextActive, changed };
}
