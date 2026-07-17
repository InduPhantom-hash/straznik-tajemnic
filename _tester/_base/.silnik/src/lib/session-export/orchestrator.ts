/**
 * Session Export - Main orchestrator
 */

import { loadAISettings } from '../ai-settings';
import type { SessionExportData } from './types';
import { formatCharacterSection } from './character';
import { formatJournalSection } from './journal';
import { formatMessagesSection } from './messages';
import { collectAllImages, formatGallerySection } from './gallery';
import { formatSettingsSection } from './settings';
import { formatDiagnosticSection } from './diagnostic';
import { formatStatsSection } from './stats';

/**
 * Eksportuje pełną sesję do formatu Markdown
 */
export function exportSessionToMarkdown(session: SessionExportData): string {
  const now = new Date();
  const sessionDate = session.date || now;
  const settings = loadAISettings();

  let md = '';

  // === NAGŁÓWEK ===
  md += `# 📖 ${session.name || 'Sesja Zew Cthulhu'}\n\n`;
  md += `> **Data sesji:** ${sessionDate.toLocaleDateString('pl-PL')}\n`;
  md += `> **Eksport:** ${now.toLocaleDateString('pl-PL')} ${now.toLocaleTimeString('pl-PL')}\n`;
  md += `> **Aplikacja:** Zew Cthulhu App\n\n`;
  md += `---\n\n`;

  // === KARTA POSTACI ===
  if (session.character) {
    md += formatCharacterSection(session.character);
  }

  // === EKWIPUNEK - USUNIĘTY (do reimplementacji) ===

  // === DZIENNIK SESJI ===
  if (session.character?.journal && session.character.journal.length > 0) {
    md += formatJournalSection(session.character.journal);
  }

  // === ZAPIS ROZMOWY ===
  md += formatMessagesSection(session.messages);

  // === GALERIA OBRAZÓW ===
  const allImages = collectAllImages(session);
  if (allImages.length > 0) {
    md += formatGallerySection(allImages);
  }

  // === USTAWIENIA GRACZA ===
  md += formatSettingsSection(settings);

  // === SEKCJA DIAGNOSTYCZNA (dla AI) ===
  md += formatDiagnosticSection(session, settings);

  // === STATYSTYKI SESJI ===
  md += formatStatsSection(session, allImages.length);

  return md;
}
