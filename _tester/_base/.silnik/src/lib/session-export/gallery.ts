/**
 * Session Export - Gallery section formatter
 */

import type { SessionExportData } from './types';

export function collectAllImages(session: SessionExportData): string[] {
  const images: string[] = [];

  // Obrazy z sesji głównej
  if (session.images) {
    images.push(...session.images);
  }

  // Obrazy z wiadomości
  for (const msg of session.messages) {
    if (msg.generatedImages) {
      images.push(...msg.generatedImages);
    }
  }

  // Portret postaci
  if (session.character?.portraitUrl) {
    images.push(session.character.portraitUrl);
  }

  // Obrazy z ekwipunku - USUNIĘTE (moduł do reimplementacji)

  // Deduplikacja
  return [...new Set(images)];
}

export function formatGallerySection(images: string[]): string {
  let md = `## 🖼️ Galeria Obrazów\n\n`;
  md += `Łącznie wygenerowano **${images.length}** obrazów w tej sesji.\n\n`;

  for (let i = 0; i < images.length; i++) {
    md += `![Obraz ${i + 1}](${images[i]})\n\n`;
  }

  md += `---\n\n`;
  return md;
}
