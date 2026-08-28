import { JournalTagEntry } from './types';

// Wykrywanie wpisów dziennika (AI TAGS)
export function extractJournalTags(text: string): JournalTagEntry[] {
  const entries: JournalTagEntry[] = [];

  // Polish and English protocols share one persisted JournalEntry format.
  // [DZIENNIK:typ:tytuł]treść[/DZIENNIK] or [JOURNAL:type:title]body[/JOURNAL]
  // Duet adds an optional @name owner prefix.
  const journalPattern =
    /\[(?:DZIENNIK|JOURNAL):(?:@([^:\]\n]+?):)?([a-z]+):([^\]:\n]+)(?::([^\]]+))?\]([\s\S]*?)\[\/(?:DZIENNIK|JOURNAL)\]/gi;

  let match;
  while ((match = journalPattern.exec(text)) !== null) {
    const who = match[1]?.trim();
    const typeStr = match[2].toLowerCase().trim();
    const title = match[3].trim();
    const inGameDate = match[4]?.trim();
    const content = match[5].trim();

    // Mapowanie typów
    const typeMap: Record<string, JournalTagEntry['type']> = {
      walka: 'combat',
      combat: 'combat',
      fight: 'combat',
      odkrycie: 'discovery',
      discovery: 'discovery',
      find: 'discovery',
      npc: 'npc',
      spotkanie: 'npc',
      postac: 'npc',
      poczytalnosc: 'sanity',
      sanity: 'sanity',
      san: 'sanity',
      trop: 'clue',
      clue: 'clue',
      wskazowka: 'clue',
      lokacja: 'location',
      location: 'location',
      miejsce: 'location',
      rytual: 'ritual',
      ritual: 'ritual',
      magia: 'ritual',
      smierc: 'death',
      death: 'death',
      zakladka: 'bookmark',
      bookmark: 'bookmark',
      wazne: 'bookmark',
      notatka: 'note',
      note: 'note',
      info: 'note',
      misja: 'quest',
      quest: 'quest',
      zadanie: 'quest',
      kronika: 'journal',
      dziennik: 'journal',
      wydarzenie: 'journal',
      przedmiot: 'item',
      item: 'item',
      rzecz: 'item'
    };

    const type = typeMap[typeStr] || 'note';

    if (title && content) {
      entries.push({
        type,
        title,
        content,
        inGameDate,
        who,
      });
    }
  }

  return entries;
}
