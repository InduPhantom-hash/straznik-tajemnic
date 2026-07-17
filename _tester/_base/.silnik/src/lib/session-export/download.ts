/**
 * Session Export - Download entry points (DOM + localStorage)
 */

import type { SessionExportData } from './types';
import { exportSessionToMarkdown } from './orchestrator';

/**
 * Pobiera eksport jako plik .md
 */
export function downloadSessionAsMarkdown(
  session: SessionExportData,
  filename?: string
): void {
  const markdown = exportSessionToMarkdown(session);
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download =
    filename || `sesja_zew_${new Date().toISOString().split('T')[0]}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Szybki eksport aktualnej sesji z localStorage
 */
export function exportCurrentSession(): void {
  if (typeof window === 'undefined') {
    console.error('❌ Export: window is undefined (SSR)');
    return;
  }

  console.log('📤 Starting session export...');

  try {
    // Pobierz dane z localStorage
    const messagesJson = localStorage.getItem('messages');
    const characterJson = localStorage.getItem('activeCharacter');

    console.log(
      '📤 Messages found:',
      !!messagesJson,
      'Character found:',
      !!characterJson
    );

    const messages = messagesJson ? JSON.parse(messagesJson) : [];
    const character = characterJson ? JSON.parse(characterJson) : null;

    console.log(
      '📤 Parsed messages:',
      messages.length,
      'Character:',
      character?.name
    );

    // Zbierz obrazy z wiadomości
    const images: string[] = [];
    for (const msg of messages) {
      if (msg.generatedImages) {
        images.push(...msg.generatedImages);
      }
    }

    const sessionData: SessionExportData = {
      name: 'Aktualna Sesja',
      date: new Date(),
      character,
      messages,
      images,
    };

    console.log('📤 Session data prepared, generating markdown...');

    // Generuj markdown z obsługą błędów
    let markdown: string;
    try {
      markdown = exportSessionToMarkdown(sessionData);
      console.log('📤 Markdown generated, length:', markdown.length);
    } catch (mdError) {
      console.error('❌ Error generating markdown:', mdError);
      // Fallback - prosty eksport
      markdown = `# Eksport Sesji (Fallback)\n\n`;
      markdown += `**Data:** ${new Date().toLocaleString('pl-PL')}\n\n`;
      markdown += `## Wiadomości (${messages.length})\n\n`;
      for (const msg of messages) {
        markdown += `**${msg.role}:** ${msg.content?.substring(0, 500) || '(puste)'}\n\n---\n\n`;
      }
      markdown += `\n\n## Błąd podczas pełnego eksportu\n\`\`\`\n${mdError}\n\`\`\`\n`;
    }

    // Pobierz plik
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = `sesja_zew_${new Date().toISOString().split('T')[0]}.md`;
    a.download = filename;

    console.log('📤 Downloading as:', filename);

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('✅ Session exported successfully');
  } catch (error) {
    console.error('❌ Export failed:', error);

    // Pokaż błąd użytkownikowi w sposób który nie zniknie
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Full error:', error);

    // Użyj setTimeout aby alert nie był blokowany przez inne operacje
    setTimeout(() => {
      alert(
        `❌ Błąd eksportu sesji:\n\n${errorMsg}\n\nSprawdź konsolę (F12) po więcej szczegółów.`
      );
    }, 100);
  }
}
