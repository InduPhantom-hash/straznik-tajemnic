/**
 * Session Export - Settings section formatter
 */

import { AISettings, QUALITY_PRESETS } from '../ai-settings';

export function formatSettingsSection(settings: AISettings): string {
  let md = `## ⚙️ Ustawienia Gracza\n\n`;

  // Preset
  const presetName =
    QUALITY_PRESETS[settings.qualityPreset]?.name || settings.qualityPreset;
  md += `### Profil Jakości: ${presetName}\n\n`;

  // Gemini
  md += `### Model AI\n`;
  md += `- **Model:** ${settings.geminiSettings.model}\n`;
  md += `- **Temperatura:** ${settings.geminiSettings.temperature}\n`;
  md += `- **Thinking Level:** ${settings.geminiSettings.thinkingLevel || 'auto'}\n`;
  md += `- **Max tokenów:** ${settings.geminiSettings.maxOutputTokens}\n\n`;

  // Voice
  md += `### Głos\n`;
  md += `- **Włączony:** ${settings.voiceSettings.enabled ? 'Tak' : 'Nie'}\n`;
  if (settings.voiceSettings.enabled) {
    md += `- **Głos:** ${settings.voiceSettings.voiceId || 'domyślny'}\n`;
    md += `- **Prędkość:** ${settings.voiceSettings.speakingRate}x\n`;
    md += `- **Głośność:** ${settings.voiceSettings.volume}%\n`;
    md += `- **Tylko narrator:** ${settings.voiceSettings.narratorOnly ? 'Tak' : 'Nie'}\n`;
  }
  md += `\n`;

  // Obrazy
  md += `### Obrazy\n`;
  md += `- **Włączone:** ${settings.imageGenerationEnabled ? 'Tak' : 'Nie'}\n`;
  if (settings.imageGenerationEnabled) {
    md += `- **Jakość:** ${settings.replicateSettings.quality}\n`;
    md += `- **Styl:** ${settings.replicateSettings.style}\n`;
    md += `- **Auto portrety:** ${settings.replicateSettings.autoGeneratePortraits ? 'Tak' : 'Nie'}\n`;
    md += `- **Auto NPC:** ${settings.replicateSettings.autoGenerateNPCs ? 'Tak' : 'Nie'}\n`;
  }
  md += `\n`;

  // Session Zero
  if (settings.sessionZero?.completed) {
    const sz = settings.sessionZero;
    md += `### Session Zero\n`;
    md += `- **Era:** ${sz.era}\n`;
    md += `- **Ton:** ${sz.tone}\n`;
    md += `- **Trudność:** ${sz.difficulty}\n`;
    if (sz.lines?.length)
      md += `- **Linie (zakazane):** ${sz.lines.join(', ')}\n`;
    if (sz.veils?.length)
      md += `- **Zasłony (fade-to-black):** ${sz.veils.join(', ')}\n`;
    if (sz.safetyWord) md += `- **Słowo bezpieczeństwa:** ${sz.safetyWord}\n`;
    md += `\n`;
  }

  // Koszty
  md += `### Kontrola Kosztów\n`;
  md += `- **Budżet miesięczny:** $${settings.costControl.monthlyBudget}\n`;
  md += `- **Zużycie w miesiącu:** $${settings.costControl.currentMonthUsage.toFixed(4)}\n`;
  md += `- **Koszt sesji:** $${settings.costControl.sessionCost?.toFixed(4) || '0.0000'}\n`;
  md += `- **Tokeny sesji:** ${settings.costControl.sessionTokens || 0}\n`;
  md += `\n`;

  md += `---\n\n`;
  return md;
}
