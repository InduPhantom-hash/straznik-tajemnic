/**
 * Session Export - Stats section formatter
 */

import type { SessionExportData } from './types';

export function formatStatsSection(
  session: SessionExportData,
  imageCount: number
): string {
  let md = `## 📊 Statystyki Sesji\n\n`;

  const userMessages = session.messages.filter((m) => m.role === 'user').length;
  const aiMessages = session.messages.filter(
    (m) => m.role === 'assistant'
  ).length;

  md += `| Metryka | Wartość |\n`;
  md += `|---------|--------|\n`;
  md += `| Wiadomości gracza | ${userMessages} |\n`;
  md += `| Wiadomości MG | ${aiMessages} |\n`;
  md += `| Łącznie wiadomości | ${session.messages.length} |\n`;
  md += `| Wygenerowane obrazy | ${imageCount} |\n`;

  if (session.character?.journal) {
    md += `| Wpisy dziennika | ${session.character.journal.length} |\n`;
  }
  // Ekwipunek - usunięty (do reimplementacji)

  md += `\n`;
  return md;
}
