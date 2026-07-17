/**
 * Session Export - Diagnostic section formatter (for AI debugging)
 */

import { AISettings } from '../ai-settings';
import type { SessionExportData } from './types';

export function formatDiagnosticSection(
  session: SessionExportData,
  settings: AISettings
): string {
  let md = `## 🔧 SEKCJA DIAGNOSTYCZNA\n\n`;
  md += `> **Uwaga:** Ta sekcja zawiera surowe dane techniczne do debugowania przez AI.\n\n`;

  // === AKTYWNE PROMPTY ===
  md += `### 📜 Aktywne Prompty\n\n`;
  const prompts = settings.gameMasterNarration?.prompts;
  if (prompts) {
    if (prompts.gmInstructionsFileName) {
      md += `**Plik instrukcji:** \`${prompts.gmInstructionsFileName}\`\n\n`;
    }
    if (prompts.mainPrompt) {
      const truncatedPrompt =
        prompts.mainPrompt.length > 2000
          ? prompts.mainPrompt.substring(0, 2000) + '\n\n*[...skrócono...]*'
          : prompts.mainPrompt;
      md += `**Main Prompt:**\n\`\`\`\n${truncatedPrompt}\n\`\`\`\n\n`;
    } else {
      md += `**Main Prompt:** *(brak - używany domyślny)*\n\n`;
    }
  } else {
    md += `*(Brak skonfigurowanych promptów)*\n\n`;
  }

  // === SUROWE WIADOMOŚCI (ostatnie 10) ===
  md += `### 💬 Surowe Wiadomości (ostatnie 10)\n\n`;
  md += `> Poniżej znajdziesz dokładną treść wiadomości AI **przed formatowaniem**.\n`;
  md += `> Szukaj: tagów \`{...}\`, \`[...]\`, błędów JSON, niepoprawnych formatowań.\n\n`;

  const recentMessages = session.messages.slice(-10);
  for (let i = 0; i < recentMessages.length; i++) {
    const msg = recentMessages[i];
    const role = msg.role === 'user' ? '👤 USER' : '🤖 AI';
    const time = msg.timestamp
      ? new Date(msg.timestamp).toLocaleTimeString('pl-PL')
      : '??:??';

    md += `#### ${role} [${time}]\n\n`;

    // Metadata diagnostyczna
    if (msg.role === 'assistant') {
      md += `| Pole | Wartość |\n|------|--------|\n`;
      md += `| Model | ${msg.modelUsed || 'nieznany'} |\n`;
      md += `| Tokeny | ${msg.tokenCount || '?'} |\n`;
      md += `| Czas odpowiedzi | ${msg.responseTime ? msg.responseTime + 'ms' : '?'} |\n`;
      md += `| TTS Status | ${msg.ttsStatus || 'brak info'} |\n`;
      if (msg.ttsError) md += `| TTS Error | \`${msg.ttsError}\` |\n`;
      md += `| Obrazy | ${msg.generatedImages?.length || 0} |\n`;
      if (msg.imagePrompts?.length) {
        md += `| Image prompts | ${msg.imagePrompts.length} |\n`;
      }
      md += `\n`;
    }

    // Surowa treść w bloku kodu (widać wszystkie znaki specjalne)
    const rawContent = msg.rawContent || msg.content;
    const truncatedContent =
      rawContent.length > 3000
        ? rawContent.substring(0, 3000) + '\n\n[...SKRÓCONO...]'
        : rawContent;

    md += `\`\`\`\n${truncatedContent}\n\`\`\`\n\n`;

    // Image prompts jeśli są
    if (msg.imagePrompts && msg.imagePrompts.length > 0) {
      md += `**Prompty obrazów:**\n`;
      for (const prompt of msg.imagePrompts) {
        md += `- \`${prompt.substring(0, 200)}${prompt.length > 200 ? '...' : ''}\`\n`;
      }
      md += `\n`;
    }
  }

  // === SNAPSHOT LOCALSTORAGE ===
  md += `### 💾 Kluczowe dane localStorage\n\n`;
  if (typeof window !== 'undefined') {
    try {
      const keys = [
        'ai_settings',
        'activeCharacter',
        'messages',
        'session_zero',
        'tts_queue_status',
        'last_error',
      ];

      md += `| Klucz | Rozmiar | Obecny |\n|-------|---------|--------|\n`;
      for (const key of keys) {
        const value = localStorage.getItem(key);
        if (value) {
          const size = new Blob([value]).size;
          md += `| \`${key}\` | ${(size / 1024).toFixed(1)} KB | ✅ |\n`;
        } else {
          md += `| \`${key}\` | - | ❌ |\n`;
        }
      }
      md += `\n`;
    } catch {
      md += `*(Nie można odczytać localStorage)*\n\n`;
    }
  } else {
    md += `*(localStorage niedostępny - SSR)*\n\n`;
  }

  // === PODSUMOWANIE PROBLEMÓW ===
  md += `### ⚠️ Potencjalne problemy do sprawdzenia\n\n`;

  const issues: string[] = [];

  // Sprawdź czy TTS jest włączony ale nie działa
  // IND-86: googleTTSEnabled DROPPED - check provider enum dla Google
  if (
    settings.voiceSettings.enabled &&
    settings.voiceSettings.provider === 'google'
  ) {
    const ttsErrors = session.messages.filter((m) => m.ttsStatus === 'error');
    if (ttsErrors.length > 0) {
      issues.push(`TTS: ${ttsErrors.length} błędów generowania głosu`);
    }
  }

  // Sprawdź czy są wiadomości bez tokenów (problemy z API)
  const noTokenMsgs = session.messages.filter(
    (m) => m.role === 'assistant' && !m.tokenCount
  );
  if (
    noTokenMsgs.length >
    session.messages.filter((m) => m.role === 'assistant').length * 0.5
  ) {
    issues.push(`API: Brak danych o tokenach w większości odpowiedzi`);
  }

  // Sprawdź czy wiadomości zawierają surowe { } które nie powinny być widoczne
  const bracesInContent = session.messages.filter(
    (m) =>
      m.role === 'assistant' &&
      (m.content.includes('{}') ||
        m.content.match(/\{\s*\}/) ||
        m.content.match(/^\s*[\{\}]\s*$/m))
  );
  if (bracesInContent.length > 0) {
    issues.push(
      `Formatowanie: ${bracesInContent.length} wiadomości zawiera artefakty {}`
    );
  }

  // Sprawdź Session Zero
  if (!settings.sessionZero?.completed) {
    issues.push(`Session Zero: Nie ukończono kalibracji gry`);
  }

  if (issues.length > 0) {
    for (const issue of issues) {
      md += `- ⚠️ ${issue}\n`;
    }
  } else {
    md += `- ✅ Nie wykryto oczywistych problemów\n`;
  }
  md += `\n`;

  md += `---\n\n`;
  return md;
}
