/**
 * Session Export - Journal section formatter
 */

import { JournalEntry, JournalEventType } from '../types';

export function formatJournalSection(journal: JournalEntry[]): string {
  let md = `## 📔 Dziennik Sesji\n\n`;

  const eventIcons: Record<JournalEventType, string> = {
    combat: '⚔️',
    discovery: '🔍',
    npc: '👤',
    sanity: '🧠',
    clue: '📜',
    location: '📍',
    ritual: '🕯️',
    death: '💀',
    bookmark: '⭐',
    note: '📝',
  };

  // Sortuj chronologicznie
  const sortedJournal = [...journal].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  for (const entry of sortedJournal) {
    const icon = eventIcons[entry.type] || '📌';
    const time = new Date(entry.timestamp).toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit',
    });

    md += `### ${icon} ${entry.title}`;
    if (entry.isBookmarked) md += ` ⭐`;
    md += `\n`;

    md += `*${time}*`;
    if (entry.inGameDate) md += ` | *W grze: ${entry.inGameDate}*`;
    md += `\n\n`;

    md += `${entry.content}\n`;

    // Metadata
    if (entry.metadata) {
      const meta = entry.metadata;
      const changes: string[] = [];
      if (meta.hpChange)
        changes.push(`HP ${meta.hpChange > 0 ? '+' : ''}${meta.hpChange}`);
      if (meta.sanChange)
        changes.push(`SAN ${meta.sanChange > 0 ? '+' : ''}${meta.sanChange}`);
      if (meta.mpChange)
        changes.push(`MP ${meta.mpChange > 0 ? '+' : ''}${meta.mpChange}`);
      if (meta.skillUsed) changes.push(`Użyto: ${meta.skillUsed}`);
      if (meta.rollResult) changes.push(`Rzut: ${meta.rollResult}`);

      if (changes.length > 0) {
        md += `\n> ${changes.join(' • ')}\n`;
      }
    }

    if (entry.tags && entry.tags.length > 0) {
      md += `\n*Tagi: ${entry.tags.join(', ')}*\n`;
    }

    md += `\n`;
  }

  md += `---\n\n`;
  return md;
}
