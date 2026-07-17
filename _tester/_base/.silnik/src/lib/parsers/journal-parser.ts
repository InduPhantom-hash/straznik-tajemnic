import { JournalTagEntry } from './types';

// Wykrywanie wpisów dziennika (AI TAGS)
export function extractJournalTags(text: string): JournalTagEntry[] {
  const entries: JournalTagEntry[] = [];

  // Pattern: [DZIENNIK:typ:tytuł]treść[/DZIENNIK]
  // lub: [DZIENNIK:typ:tytuł:data_w_grze]treść[/DZIENNIK]
  // lub (duet): [DZIENNIK:@Imię:typ:tytuł]... - opcjonalny prefiks @Imię (właściciel wpisu).
  const journalPattern =
    /\[DZIENNIK:(?:@([^:\]\n]+?):)?([a-z]+):([^\]:\n]+)(?::([^\]]+))?\]([\s\S]*?)\[\/DZIENNIK\]/gi;

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
