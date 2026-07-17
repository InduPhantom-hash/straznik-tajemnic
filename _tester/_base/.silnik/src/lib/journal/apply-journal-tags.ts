import type { Character, JournalEntry } from '@/lib/types';
import type { JournalTagEntry } from '@/lib/parsers/types';
import { extractJournalTags } from '@/lib/parsers/journal-parser';
import { extractLatestTagLocation } from '@/lib/parsers/event-parser';
import { resolveCharacterByName } from '@/lib/character/match-by-name';

/**
 * Most między parserem tagów MG a dziennikiem postaci.
 *
 * IND-201: parser `extractJournalTags` istniał i miał testy, ale jego wynik trafiał
 * wyłącznie do Director's State (clue tracking, `director-state.ts`) - NIGDY do
 * `character.journal`, czyli dziennika widocznego w modalu sesji (`session-journal.tsx`).
 * Efekt: gracz widział "Dziennik jest pusty" mimo tagów [DZIENNIK:] w narracji.
 *
 * UWAGA na dwa typy `JournalEntry`:
 *  - `@/lib/types`            → `character.journal` (modal sesji, useSceneSummary)  ← TEN
 *  - `@/lib/journal/types`    → standalone `/journal` page (osobny system)
 */

/**
 * Mapuje tagi [DZIENNIK:typ:tytuł] na wpisy `character.journal`. Id jest deterministyczne
 * (`messageId` + index), więc dopisywanie jest idempotentne: ponowne przetworzenie tej samej
 * wiadomości (np. re-fire onMetadata - patrz IND-200) nie tworzy duplikatów.
 *
 * `JournalTagEntry.type` jest już znormalizowany przez parser (typeMap PL→EN) do tego samego
 * unionu co `JournalEventType`, więc mapowanie typu jest 1:1 bez konwersji.
 */
export function buildJournalEntriesFromTags(
  tags: JournalTagEntry[],
  messageId: string
): JournalEntry[] {
  return tags.map((tag, index) => ({
    id: `journal-${messageId}-${index}`,
    timestamp: new Date(),
    inGameDate: tag.inGameDate,
    type: tag.type,
    title: tag.title,
    content: tag.content,
    tags: [],
    isBookmarked: false,
  }));
}

/**
 * IND-267: most `[LOKACJA: Nazwa: opis]` → wpis dziennika typu `location`.
 *
 * NPC/odkrycia/tropy idą przez `[DZIENNIK:]`, ale lokacje AI emituje WYŁĄCZNIE przez
 * osobny tor `[LOKACJA:]` - przez co kategoria "Lokacje" w dzienniku (modal sesji) była
 * ZAWSZE pusta mimo że typ `location` istnieje w `JournalEventType` i UI go renderuje.
 * Ten most domyka lukę: najnowszy `[LOKACJA:]` z tury staje się wpisem `location`.
 *
 * Id jest deterministyczne (`location-${messageId}`) - jeden wpis lokacji na wiadomość,
 * więc ponowne przetworzenie tej samej tury jest idempotentne (dedup w callerze).
 */
export function buildLocationEntryFromText(
  rawText: string,
  messageId: string
): JournalEntry | null {
  const location = extractLatestTagLocation(rawText);
  if (!location) return null;

  return {
    id: `location-${messageId}`,
    timestamp: new Date(),
    type: 'location',
    title: location.name,
    content: location.description,
    tags: [],
    isBookmarked: false,
  };
}

/**
 * Ekstrahuje tagi [DZIENNIK:] oraz [LOKACJA:] z SUROWEGO tekstu odpowiedzi MG (tagi są usuwane
 * dopiero w renderze przez `narrative/cleanup.ts`, więc `fullText` wciąż je niesie) i dopisuje
 * brakujące wpisy do `character.journal` z deduplikacją po deterministycznym id.
 *
 * Zwraca TEN SAM obiekt postaci (referencyjnie), gdy nie ma nic do dodania - caller może
 * tanio sprawdzić `updated !== character` i pominąć zbędny zapis/persist/render.
 */
export function appendJournalFromText(
  character: Character,
  rawText: string,
  messageId: string
): Character {
  // [DZIENNIK:] tagi (NPC/odkrycia/tropy) + IND-267: najnowszy [LOKACJA:] jako wpis `location`.
  const candidates = buildJournalEntriesFromTags(
    extractJournalTags(rawText),
    messageId
  );
  const locationEntry = buildLocationEntryFromText(rawText, messageId);
  if (locationEntry) candidates.push(locationEntry);

  if (candidates.length === 0) return character;

  const existing = character.journal ?? [];
  const existingIds = new Set(existing.map((entry) => entry.id));
  const fresh = candidates.filter((entry) => !existingIds.has(entry.id));

  if (fresh.length === 0) return character;

  return { ...character, journal: [...existing, ...fresh] };
}

/**
 * Wariant party-aware (duet / Hot Seat): wpis `[DZIENNIK:@Imię:...]` trafia do
 * dziennika postaci wskazanej prefiksem `@Imię` (fallback: aktywna postać).
 * Lokacja `[LOKACJA:]` (element wspólny świata) idzie do aktywnej. Bez tego wpis
 * „Eleanor straciła kontrolę" lądował w dzienniku Marcusa.
 *
 * Id wpisów jest deterministyczne (`journal-${messageId}-${index}`) - idempotentne
 * względem re-fire tej samej wiadomości (dedup po id w obrębie każdej postaci).
 */
export function appendJournalToParty(
  characters: Character[],
  activeCharacter: Character,
  rawText: string,
  messageId: string
): { characters: Character[]; activeCharacter: Character; changed: boolean } {
  const tags = extractJournalTags(rawText);
  const locationEntry = buildLocationEntryFromText(rawText, messageId);

  // Grupuj wpisy per postać (po @Imię, fallback aktywna). Globalny index po tags
  // zachowuje stabilne id (jak w appendJournalFromText) → idempotencja.
  const entriesByChar = new Map<string, JournalEntry[]>();
  const push = (charId: string, entry: JournalEntry) => {
    const list = entriesByChar.get(charId) ?? [];
    list.push(entry);
    entriesByChar.set(charId, list);
  };

  tags.forEach((tag, index) => {
    const target = resolveCharacterByName(characters, tag.who, activeCharacter);
    push(target.id, {
      id: `journal-${messageId}-${index}`,
      timestamp: new Date(),
      inGameDate: tag.inGameDate,
      type: tag.type,
      title: tag.title,
      content: tag.content,
      tags: [],
      isBookmarked: false,
    });
  });
  if (locationEntry) push(activeCharacter.id, locationEntry);

  if (entriesByChar.size === 0) {
    return { characters, activeCharacter, changed: false };
  }

  let changed = false;
  const apply = (c: Character): Character => {
    const candidates = entriesByChar.get(c.id);
    if (!candidates || candidates.length === 0) return c;
    const existing = c.journal ?? [];
    const existingIds = new Set(existing.map((e) => e.id));
    const fresh = candidates.filter((e) => !existingIds.has(e.id));
    if (fresh.length === 0) return c;
    changed = true;
    return { ...c, journal: [...existing, ...fresh] };
  };

  const nextCharacters = characters.map(apply);
  const nextActive =
    nextCharacters.find((c) => c.id === activeCharacter.id) ??
    apply(activeCharacter);

  return { characters: nextCharacters, activeCharacter: nextActive, changed };
}
