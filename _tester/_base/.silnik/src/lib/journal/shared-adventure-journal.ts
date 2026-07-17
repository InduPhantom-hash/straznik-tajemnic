import type { Character, JournalEntry } from '@/lib/types';

function timestampValue(entry: JournalEntry): number {
  const value = new Date(entry.updatedAt ?? entry.timestamp).getTime();
  return Number.isFinite(value) ? value : 0;
}

function upsertLatest(
  entries: Map<string, JournalEntry>,
  entry: JournalEntry
): void {
  const existing = entries.get(entry.id);
  if (!existing || timestampValue(entry) >= timestampValue(existing)) {
    entries.set(entry.id, entry);
  }
}

/**
 * Scala dzienniki badaczy w jeden widok przygody. Id wpisu jest kluczem
 * deduplikacji, dzięki czemu stare kopie tego samego wpisu nie są mnożone.
 */
export function mergeAdventureJournalEntries(
  characters: Character[],
  adventureJournalId?: string
): JournalEntry[] {
  const entries = new Map<string, JournalEntry>();

  characters.forEach((character) => {
    (character.journal ?? []).forEach((entry) => {
      const belongsToCurrentAdventure =
        !adventureJournalId ||
        !entry.adventureJournalId ||
        entry.adventureJournalId === adventureJournalId;
      if (belongsToCurrentAdventure) upsertLatest(entries, entry);
    });
  });

  return [...entries.values()].sort(
    (left, right) => timestampValue(right) - timestampValue(left)
  );
}

function deduplicateEntries(journal: JournalEntry[]): JournalEntry[] {
  const entries = new Map<string, JournalEntry>();
  journal.forEach((entry) => {
    upsertLatest(entries, entry);
  });
  return [...entries.values()].sort(
    (left, right) => timestampValue(right) - timestampValue(left)
  );
}

/**
 * Jednorazowa migracja starszych wpisów bez identyfikatora przygody. Dzięki niej
 * kolejna przygoda nie przejmie historii poprzedniego duetu.
 */
export function scopeAdventureJournalEntries(
  characters: Character[],
  participantIds: string[],
  adventureJournalId: string
): Character[] {
  const ids = new Set(participantIds);
  let changed = false;

  const updated = characters.map((character) => {
    if (!ids.has(character.id) || !character.journal?.length) return character;
    let characterChanged = false;
    const journal = character.journal.map((entry) => {
      if (entry.adventureJournalId) return entry;
      characterChanged = true;
      return { ...entry, adventureJournalId };
    });
    if (!characterChanged) return character;
    changed = true;
    return { ...character, journal };
  });

  return changed ? updated : characters;
}

/**
 * Zapisuje wspólny dziennik do obu kart należących do bieżącej przygody.
 * Pozostałe postacie z lokalnego katalogu nie są zmieniane.
 */
export function synchronizeAdventureJournal(
  characters: Character[],
  participantIds: string[],
  journal: JournalEntry[],
  adventureJournalId?: string
): Character[] {
  const ids = new Set(participantIds);
  const deduplicated = deduplicateEntries(
    adventureJournalId
      ? journal.map((entry) => ({ ...entry, adventureJournalId }))
      : journal
  );

  return characters.map((character) =>
    ids.has(character.id)
      ? {
          ...character,
          journal: adventureJournalId
            ? [
                ...(character.journal ?? []).filter(
                  (entry) =>
                    entry.adventureJournalId &&
                    entry.adventureJournalId !== adventureJournalId
                ),
                ...deduplicated,
              ]
            : [...deduplicated],
        }
      : character
  );
}
