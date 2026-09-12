import { JournalTagEntry } from './types';
import type { ClueProvenance, ClueCategory } from '../journal/dossier-types';

/**
 * Wykrywa jawną deklarację proweniencji epistemicznej ze wskazanego segmentu tagu lub tekstu.
 * Obsługuje formaty z prefiksem (np. "źródło:obserwacja", "source:testimony")
 * oraz bezpośrednie słowa kluczowe w języku polskim i angielskim.
 */
export function parseClueProvenance(segment: string): ClueProvenance | undefined {
  if (!segment) return undefined;
  let s = segment.trim().toLowerCase();

  // Usuń prefiksy typu źródło:, zrodlo:, source:, proweniencja:, provenance:
  s = s.replace(/^(?:źródło|zrodlo|source|proweniencja|provenance)\s*:\s*/i, '').trim();

  // 1. Observed / Zaobserwowane
  if (
    /(?:^|[^\p{L}])(?:observed|observation|obserwacja|obserwacje|zaobserwowane|spostrzeżenie|spostrzezenie|widok|naoczne|naoczny|oględziny|ogledziny)(?:[^\p{L}]|$)/iu.test(
      s
    )
  ) {
    return 'observed';
  }

  // 2. Testimony / Usłyszane / Zeznanie
  if (
    /(?:^|[^\p{L}])(?:testimony|statement|witness|hearsay|interview|zeznanie|zeznania|usłyszane|uslyszane|świadek|swiadek|świadectwo|swiadectwo|wywiad|relacja|rozmowa)(?:[^\p{L}]|$)/iu.test(
      s
    )
  ) {
    return 'testimony';
  }

  // 3. Deduction / Dedukcja
  if (
    /(?:^|[^\p{L}])(?:deduction|insight|inference|conclusion|hypothesis|dedukcja|wniosek|wnioskowanie|analiza|pomysł|pomysl|hipoteza)(?:[^\p{L}]|$)/iu.test(
      s
    )
  ) {
    return 'deduction';
  }

  // 4. Handout / Dokument
  if (
    /(?:^|[^\p{L}])(?:handout|document|letter|clipping|record|file|tape|photo|photograph|dokument|list|wycinek|gazeta|prasa|artykuł|artykul|pismo|fotografia|zdjęcie|zdjecie|akta|notatka|notatki|zapiski|rejestr|taśma|tasma)(?:[^\p{L}]|$)/iu.test(
      s
    )
  ) {
    return 'handout';
  }

  return undefined;
}

/**
 * Automatyczna heurystyka wnioskowania proweniencji poszlaki (Zero-Effort Ledger).
 * Używana, gdy MG nie określił wprost proweniencji w tagu.
 */
export function inferClueProvenance(
  title: string,
  content: string,
  category?: ClueCategory
): ClueProvenance {
  if (category === 'document') return 'handout';
  if (category === 'testimony') return 'testimony';

  const text = `${title} ${content}`.toLowerCase();

  // Świadek / rozmowa / zeznanie (przed handoutem, aby zeznania specjalistów nie kolidowały ze słowem 'list')
  if (
    /(?:^|[^\p{L}])(?:mówi|mówił|mówiła|mówią|said|claims)(?:[^\p{L}]|$)|twierdzi|zeznaje|powiedział|powiedziała|relacjonuje|świadek|świadk|wywiad|rozmow|zeznan|słowa|informator|testified|witness|interview|statement|hearsay/iu.test(
      text
    )
  ) {
    return 'testimony';
  }

  // Handout / dokumenty - zabezpieczone granice słów dla krótkich/kolizyjnych rdzeni (list, akt, file, tape itp.)
  if (
    /(?:^|[^\p{L}])(?:akt|akta|aktach|aktów|file|book|list|listu|listem|liście|listy|listów|letter|letters|tape|tapes|photo|photos|prasa|prasy|prasie)(?:[^\p{L}]|$)|kopert|telegram|raport|dziennik|wycinek|gazet|artykuł|dokument|pismo|notatk|zapisk|fotografi|zdjęci|taśm|nagrani|rejestr|książk|księg|folder|teczk|document|clipping|article|recording|journal|diary/iu.test(
      text
    )
  ) {
    return 'handout';
  }

  // Dedukcja / wniosek
  if (
    /dedukcj|wniosek|wniosk|analiz|wynika z|pomysł|hipotez|zrozumiał|połączył|deduces|concludes|hypothesis|insight|realizes/iu.test(
      text
    )
  ) {
    return 'deduction';
  }

  // Domyślnie zaobserwowane (oględziny, ślad fizyczny, zmysły, forensic)
  return 'observed';
}

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

/**
 * Syntetyzuje treść poszlaki/odkrycia do zwięzłego, 1-zdaniowego faktu śledczego (Zero-Effort Ledger).
 * Usuwa metadane, znaczniki, formatowanie markdown i przycina tekst do jednego precyzyjnego zdania.
 */
export function synthesizeClueFact(title: string, rawContent: string): string {
  if (!rawContent || !rawContent.trim()) {
    return title ? `${title.trim()}.` : '';
  }

  // 1. Usuń tagi strukturalne AI (np. [TAG: ...], [DZIENNIK:...], [/DZIENNIK])
  let text = rawContent
    .replace(/\[\/?(?:DZIENNIK|JOURNAL|NPC|LOKACJA|LOCATION|PRZEDMIOT|ITEM|TEST|SANITY|HP)[^\]]*\]/gi, '')
    .trim();

  // 2. Jeśli treść zawiera metadane oddzielone pipe (| M|I|C|E, | źródło:...), bierzemy samą treść faktu
  if (text.includes('|')) {
    text = text.split('|')[0].trim();
  }

  // 3. Usuń prefiksy typu "Poszlaka:", "Wskazówka:", "Fakt:", "Odkryto:", "Clue:", "Fact:"
  text = text.replace(/^(?:poszlaka|wskazówka|fakt|odkryto|notatka|trop|clue|discovery|fact|note)\s*:\s*/i, '');

  // 3. Usuń formatowanie Markdown (**bold**, *italic*, cytaty, listy)
  text = text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/^[-*•>]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();

  // 4. Wyodrębnij pierwsze pełne zdanie
  const sentenceMatch = text.match(/^([^.!?]+[.!?])/);
  let firstSentence = sentenceMatch ? sentenceMatch[1].trim() : text;

  // Jeśli pierwsze zdanie jest bardzo krótkie (< 15 znaków) i jest drugie zdanie, dołącz drugie
  if (firstSentence.length < 15 && text.length > firstSentence.length) {
    const remaining = text.slice(firstSentence.length).trim();
    const secondMatch = remaining.match(/^([^.!?]+[.!?])/);
    if (secondMatch) {
      firstSentence = `${firstSentence} ${secondMatch[1].trim()}`;
    }
  }

  // Ogranicz do max 150 znaków z zachowaniem słów
  if (firstSentence.length > 150) {
    firstSentence = firstSentence.slice(0, 147);
    const lastSpace = firstSentence.lastIndexOf(' ');
    if (lastSpace > 100) {
      firstSentence = firstSentence.slice(0, lastSpace);
    }
    firstSentence = `${firstSentence}...`;
  }

  // Upewnij się, że kończy się kropką (jeśli nie ma znaku końca)
  if (!/[.!?]$/.test(firstSentence)) {
    firstSentence += '.';
  }

  return firstSentence;
}

export interface ExtractedNpcTag {
  name: string;
  description: string;
  who?: string;
}

/**
 * Ekstrahuje tagi NPC z surowego tekstu odpowiedzi MG:
 * - [NPC: Imię: Opis]
 * - [DZIENNIK:npc:Imię]Opis[/DZIENNIK]
 */
export function extractNpcTags(text: string): ExtractedNpcTag[] {
  const npcs: ExtractedNpcTag[] = [];
  const seen = new Set<string>();

  // 1. [NPC: Imię: Opis] (opcjonalny prefiks @Who dla hot seat)
  const standaloneNpcPattern =
    /\[NPC:(?:@([^:\]\n]+?):)?\s*([^:\]\n]+):\s*([^\]]+)\]/gi;
  let match;
  while ((match = standaloneNpcPattern.exec(text)) !== null) {
    const who = match[1]?.trim();
    const name = match[2].trim();
    const description = match[3].trim();
    const key = name.toLowerCase();
    if (name && description && !seen.has(key)) {
      seen.add(key);
      npcs.push({ name, description, who });
    }
  }

  // 2. [DZIENNIK:npc:Imię]Opis[/DZIENNIK]
  const journalTags = extractJournalTags(text);
  for (const tag of journalTags) {
    if (tag.type === 'npc' && tag.title && tag.content) {
      const key = tag.title.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        npcs.push({
          name: tag.title.trim(),
          description: tag.content.trim(),
          who: tag.who,
        });
      }
    }
  }

  return npcs;
}
