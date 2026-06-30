/**
 * Session Export - Messages section formatter
 */

import type { SessionExportData } from './types';

export function formatMessagesSection(
  messages: SessionExportData['messages']
): string {
  let md = `## 💬 Zapis Rozmowy\n\n`;

  for (const msg of messages) {
    const role = msg.role === 'user' ? '**Gracz:**' : '**MG:**';
    const timestamp = msg.timestamp
      ? ` *(${new Date(msg.timestamp).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })})*`
      : '';

    // Skróć bardzo długie wiadomości
    const content =
      msg.content.length > 3000
        ? msg.content.substring(0, 3000) + '\n\n*[...wiadomość skrócona...]*'
        : msg.content;

    md += `${role}${timestamp}\n\n`;
    md += `${content}\n`;

    // Obrazy w kontekście wiadomości
    if (msg.generatedImages && msg.generatedImages.length > 0) {
      md += `\n`;
      for (const imgUrl of msg.generatedImages) {
        md += `![Wygenerowana ilustracja](${imgUrl})\n`;
      }
    }

    md += `\n---\n\n`;
  }

  return md;
}
