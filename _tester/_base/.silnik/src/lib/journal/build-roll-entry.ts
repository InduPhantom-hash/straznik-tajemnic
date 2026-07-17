import type { Character, JournalEntry } from '@/lib/types';
import {
  type DiceRoll,
  getOutcomeInfo,
  isSuccess,
  REQUIRED_DIFFICULTY_LABELS,
} from '@/lib/dice-utils';

/**
 * Most rzut Tacki → wpis `character.journal` (D1, uproszczona Tacka sterowana [TEST:]).
 *
 * Po wykonaniu rzutu w modalu testu zapisujemy go do dziennika sesji jako wpis typu
 * `note` (📝) z metadanymi rzutu (umiejętność + wynik). Dzięki temu w dzienniku widać
 * historię testów: co testowano, w jakich okolicznościach (uzasadnienie z [TEST:]),
 * wynik liczbowy i rezultat (sukces / porażka / krytyk / fumble).
 *
 * Reużywamy kanonicznego typu `JournalEntry` z `@/lib/types` (ten sam co dziennik modalu
 * sesji + most [DZIENNIK:] w `apply-journal-tags.ts`) - bez nowego typu wpisu.
 */

/** Czytelny werdykt rzutu wg wymaganej trudności (gdy podana) lub samego poziomu. */
function rollSucceeded(roll: DiceRoll): boolean {
  if (roll.requiredDifficulty && roll.passedRequirement !== undefined) {
    return roll.passedRequirement;
  }
  return roll.outcome ? isSuccess(roll.outcome) : false;
}

/**
 * Buduje wpis dziennika z rzutu testu umiejętności.
 *
 * `justification` (uzasadnienie/okoliczności z tagu [TEST:]) wzbogaca treść, jeśli podane.
 * Zwraca `null`, gdy rzut nie jest testem umiejętności (brak skillName/outcome) - wtedy nie
 * ma czego zapisywać do dziennika.
 */
export function buildRollJournalEntry(
  roll: DiceRoll,
  justification?: string
): JournalEntry | null {
  if (!roll.skillName || roll.outcome === undefined) return null;

  const outcome = getOutcomeInfo(roll.outcome);
  const verdict = rollSucceeded(roll) ? 'sukces' : 'porażka';
  const reqLabel =
    roll.requiredDifficulty && roll.requiredDifficulty !== 'regular'
      ? ` (poziom ${REQUIRED_DIFFICULTY_LABELS[roll.requiredDifficulty]})`
      : '';

  const summary = `Rzut ${roll.total} na ${roll.skillName}${
    roll.targetValue !== undefined ? ` (${roll.targetValue}%)` : ''
  }${reqLabel} → ${outcome.emoji} ${outcome.label} - ${verdict}.`;

  const content = justification ? `${justification}\n${summary}` : summary;

  return {
    id: `roll-${roll.id}`,
    timestamp: new Date(),
    type: 'note',
    title: `Test: ${roll.skillName}`,
    content,
    tags: ['rzut'],
    isBookmarked: false,
    metadata: {
      skillUsed: roll.skillName,
      rollResult: roll.total,
    },
  };
}

/**
 * Dopisuje wpis rzutu do `character.journal` z deduplikacją po deterministycznym id
 * (`roll-${roll.id}`) - ponowny zapis tego samego rzutu nie tworzy duplikatu.
 *
 * Zwraca TEN SAM obiekt postaci (referencyjnie), gdy nie ma czego dodać - caller może
 * tanio sprawdzić `updated !== character` i pominąć zbędny zapis/persist.
 */
export function appendRollToJournal(
  character: Character,
  roll: DiceRoll,
  justification?: string
): Character {
  const entry = buildRollJournalEntry(roll, justification);
  if (!entry) return character;

  const existing = character.journal ?? [];
  if (existing.some((e) => e.id === entry.id)) return character;

  return { ...character, journal: [...existing, entry] };
}
