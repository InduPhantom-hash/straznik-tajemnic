import type { Character } from '@/lib/types';
import type { JournalTagEntry } from '@/lib/parsers/types';
import type { ClueEntry, ClueStatus } from '@/lib/journal/dossier-types';
import type { RevealedMemoryFact } from './types';
import { extractJournalTags, extractNpcTags, extractItemTags, synthesizeClueFact, parseClueProvenance, inferClueProvenance } from '@/lib/parsers/journal-parser';
import { extractLatestTagLocation } from '@/lib/parsers/event-parser';
import { cleanResponseText, stripHiddenMemoryContent } from '@/lib/parsers/text-cleaner';

const key = (value: string) => value.trim().toLowerCase();

/** Exact unique matches only: ambiguous names never merge separate entities. */
export function uniqueNamed<T>(entries: T[], name: string, getName: (entry: T) => string): T | undefined {
  const matches = entries.filter((entry) => key(getName(entry)) === key(name));
  return matches.length === 1 ? matches[0] : undefined;
}

export function resolveRevealedRecipient(characters: Character[], who?: string, active?: Character): Character | undefined {
  if (!who?.trim()) return active ?? characters[0];
  return uniqueNamed(characters, who, (c) => c.name) ??
    uniqueNamed(characters, who, (c) => c.name.trim().split(/\s+/)[0]);
}

export function revealedEntityId(kind: 'npc' | 'location', messageId: string, name: string): string {
  return `${kind}-${messageId}-${encodeURIComponent(key(name))}`;
}

export function isPublicCurrentClue(clue: Pick<ClueEntry, 'status' | 'discoveryStatus' | 'epistemicLayer'>): boolean {
  return clue.status !== 'disproven' && clue.status !== 'superseded' &&
    clue.discoveryStatus !== 'unrevealed' && clue.epistemicLayer !== 'keeper_truth';
}

export function parseRevealedClue(tag: JournalTagEntry) {
  const [title, ...titleMetadata] = tag.title.split('|').map((s) => s.trim());
  const [content, ...metadata] = tag.content.split('|').map((s) => s.trim());
  const segments = [...titleMetadata, ...(tag.inGameDate ? [tag.inGameDate] : []), ...metadata];
  const explicitStatus = segments.map((s) => s.match(/^(?:status\s*:\s*)?(confirmed|unconfirmed|disproven|superseded)$/i)?.[1]?.toLowerCase()).find(Boolean) as ClueStatus | undefined;
  const provenance = segments.map(parseClueProvenance).filter(Boolean).pop() ?? inferClueProvenance(title, content);
  const replacement = metadata.map((s) => s.match(/^(zastępuje|unieważnia|obala|supersedes|refutes):\s*(.+)$/i)).find(Boolean);
  return {
    title, content, fact: synthesizeClueFact(title, content), provenance, explicitStatus,
    status: explicitStatus ?? (provenance === 'deduction' ? 'unconfirmed' : 'confirmed') as ClueStatus,
    replacementTarget: replacement?.[2]?.trim(),
    replacementStatus: (replacement && /^(obala|refutes)$/i.test(replacement[1]) ? 'disproven' : 'superseded') as ClueStatus,
  };
}

export function findReplacedClue(clues: ClueEntry[], target?: string): ClueEntry | undefined {
  if (!target) return undefined;
  return uniqueNamed(clues, target, (c) => c.id) ?? uniqueNamed(clues, target, (c) => c.title);
}

/** Drop private blocks BEFORE the tag parsers see any nested public-looking tags. */
export function parseRevealedTags(rawText: string) {
  const hidden = 'OBSERWACJA|OBSERVATION|SEKRETY_MG|KEEPER_SECRETS|MYŚLI_MG|MYSLI_MG|GM_THOUGHTS|KEEPER_THOUGHTS|CEL_NARRACYJNY|NARRATIVE_GOAL|NASTRÓJ|NASTROJ|MOOD';
  let text = rawText.replace(new RegExp(`\\[(${hidden})(?::[^\\]]*)?\\][\\s\\S]*?\\[\\/\\1\\]`, 'gi'), '');
  // Unclosed private block: fail closed (stream interruption).
  text = text.replace(new RegExp(`\\[(?:${hidden})\\][\\s\\S]*$`, 'gi'), '');
  // Inline private tags can contain nested journal tags, so balance brackets.
  const start = new RegExp(`\\[(?:${hidden}):`, 'gi');
  let match: RegExpExecArray | null;
  while ((match = start.exec(text))) {
    let depth = 1;
    let end = match.index + match[0].length;
    while (end < text.length && depth > 0) {
      if (text[end] === '[') depth++;
      if (text[end] === ']') depth--;
      end++;
    }
    text = text.slice(0, match.index) + text.slice(end);
    start.lastIndex = match.index;
  }
  text = stripHiddenMemoryContent(text).replace(/```[\s\S]*?(?:```|$)/g, '');
  const journalTags = extractJournalTags(text);
  // Parse each standalone tag separately: the legacy parser deduplicates by name,
  // losing different recipients with the same NPC/item name in one turn.
  const npcTags = [...text.matchAll(/\[NPC:(?:[^\]])*\]/gi)].flatMap((m) => extractNpcTags(m[0]));
  const itemTags = [...text.matchAll(/\[(?:PRZEDMIOT|ITEM):(?:[^\]])*\]/gi)].flatMap((m) => extractItemTags(m[0]));
  for (const tag of journalTags) {
    const source = `[JOURNAL:${tag.who ? `@${tag.who}:` : ''}${tag.type}:${tag.title}]${tag.content}[/JOURNAL]`;
    if (tag.type === 'npc') npcTags.push(...extractNpcTags(source));
    if (tag.type === 'item') itemTags.push(...extractItemTags(source));
  }
  return { text, journalTags, npcTags, itemTags, location: extractLatestTagLocation(text) };
}

export function extractRevealedTurn(rawText: string, messageId: string, characters: Character[] = [], activeCharacter?: Character): { narrative: string; facts: RevealedMemoryFact[] } {
  const parsed = parseRevealedTags(rawText);
  const facts: RevealedMemoryFact[] = [];
  const party = activeCharacter && !characters.some((c) => c.id === activeCharacter.id) ? [...characters, activeCharacter] : characters;
  for (const [index, tag] of parsed.journalTags.entries()) {
    if (tag.type === 'npc' || tag.type === 'item') continue;
    const recipient = resolveRevealedRecipient(party, tag.who, activeCharacter);
    if (tag.who && !recipient) continue;
    const clue = parseRevealedClue(tag);
    const isClue = tag.type === 'clue' || tag.type === 'discovery';
    const existing = isClue ? uniqueNamed(recipient?.investigatorDossier?.clues ?? [], clue.title, (c) => c.title) : undefined;
    const entityId = isClue ? existing?.id ?? `clue-${messageId}-${index}` : undefined;
    const recipients = recipient ? [recipient.id] : [];
    facts.push({
      kind: isClue ? 'clue' : tag.type === 'location' ? 'location' : tag.type === 'note' || tag.type === 'bookmark' ? 'decision' : 'consequence',
      text: isClue ? clue.fact : `${tag.title}: ${tag.content}`,
      entityId, status: isClue ? clue.explicitStatus ?? existing?.status ?? clue.status : 'unconfirmed', recipients,
      sourceJournalEntryId: `journal-${messageId}-${index}`, provenance: isClue ? clue.provenance : 'journal',
      relatedEntityIds: existing ? [existing.sourceNpcId, existing.foundLocationId, ...(existing.linkedNodeIds ?? [])].filter((id): id is string => !!id) : [],
    });
    const replaced = isClue ? findReplacedClue(recipient?.investigatorDossier?.clues ?? [], clue.replacementTarget) : undefined;
    if (replaced && replaced.id !== entityId && replaced.discoveryStatus !== 'unrevealed' && replaced.epistemicLayer !== 'keeper_truth') {
      facts.push({ kind: 'clue', text: replaced.description, entityId: replaced.id, status: clue.replacementStatus, supersededBy: entityId, recipients, sourceJournalEntryId: `journal-${messageId}-${index}`, provenance: clue.provenance });
    }
  }
  for (const npc of parsed.npcTags) {
    const recipient = resolveRevealedRecipient(party, npc.who, activeCharacter);
    if (npc.who && !recipient) continue;
    const existing = uniqueNamed(recipient?.investigatorDossier?.npcs ?? [], npc.name, (n) => n.name);
    facts.push({ kind: 'npc', text: `${npc.name}: ${npc.description.split('|')[0].trim()}`, entityId: existing?.id ?? revealedEntityId('npc', messageId, npc.name), status: 'confirmed', recipients: recipient ? [recipient.id] : [], sourceJournalEntryId: `journal-${messageId}-npc-${key(npc.name).replace(/[^a-z0-9]/g, '-')}`, provenance: 'observed' });
  }
  for (const item of parsed.itemTags) {
    const recipient = resolveRevealedRecipient(party, item.who, activeCharacter);
    if (item.who && !recipient) continue;
    facts.push({ kind: 'consequence', text: `${item.name}: ${item.description.split('|')[0].trim()}`, status: 'confirmed', recipients: recipient ? [recipient.id] : [], sourceJournalEntryId: `journal-${messageId}-item-${key(item.name).replace(/[^a-z0-9]/g, '-')}`, provenance: 'observed' });
  }
  if (parsed.location) {
    const recipient = activeCharacter ?? party[0];
    const existing = uniqueNamed(recipient?.investigatorDossier?.locations ?? [], parsed.location.name, (l) => l.name);
    facts.push({ kind: 'location', text: `${parsed.location.name}: ${parsed.location.description.split('|')[0].trim()}`, entityId: existing?.id ?? revealedEntityId('location', messageId, parsed.location.name), status: 'confirmed', recipients: recipient ? [recipient.id] : [], sourceJournalEntryId: `location-${messageId}`, provenance: 'observed' });
  }
  // Journal bodies have their own recipient-aware records. Never duplicate
  // them into a conversation record that could have a different audience.
  const narrative = parsed.text.replace(/\[(?:DZIENNIK|JOURNAL):[^\]]*\][\s\S]*?\[\/(?:DZIENNIK|JOURNAL)\]/gi, '');
  return { narrative: cleanResponseText(narrative), facts };
}

export function extractRevealedMemoryFacts(rawText: string, messageId: string, characters: Character[] = [], activeCharacter?: Character): RevealedMemoryFact[] {
  return extractRevealedTurn(rawText, messageId, characters, activeCharacter).facts;
}
