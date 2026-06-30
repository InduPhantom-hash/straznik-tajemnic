/**
 * Campaign Statistics
 * Zbiera i eksportuje statystyki kampanii do Markdown
 */

import { loadAISettings, getUsageStats, getUsageHistory } from './ai-settings';
import { loadTimelineEvents, exportTimelineToMarkdown } from './session-timeline';

export interface CampaignStats {
    // Ogólne
    campaignName?: string;
    startDate?: Date;
    totalSessions: number;
    totalMessages: number;

    // Koszty
    totalCost: number;
    sessionCost: number;
    todayCost: number;

    // Tokeny
    totalTokens: number;
    sessionTokens: number;
    todayTokens: number;

    // AI Usage
    geminiRequests: number;
    ttsRequests: number;
    imageRequests: number;

    // Timeline
    totalEvents: number;
    combatEvents: number;
    discoveryEvents: number;

    // Postać
    characterName?: string;
    characterLevel?: number;
}

/**
 * Zbiera statystyki z localStorage i ai-settings
 */
export function collectCampaignStats(): CampaignStats {
    const aiSettings = loadAISettings();
    const usageStats = getUsageStats();
    const usageHistory = getUsageHistory(100);
    const timelineEvents = loadTimelineEvents();

    // Pobierz wiadomości z localStorage
    let messages: any[] = [];
    try {
        const messagesJson = localStorage.getItem('messages');
        messages = messagesJson ? JSON.parse(messagesJson) : [];
    } catch (e) { }

    // Pobierz postać
    let character: any = null;
    try {
        const charJson = localStorage.getItem('activeCharacter');
        character = charJson ? JSON.parse(charJson) : null;
    } catch (e) { }

    // Zlicz typy requestów
    const geminiRequests = usageHistory.filter((r: any) => r.type === 'text').length;
    const ttsRequests = usageHistory.filter((r: any) => r.type === 'voice').length;
    const imageRequests = usageHistory.filter((r: any) => r.type === 'image').length;

    // Zlicz typy wydarzeń
    const combatEvents = timelineEvents.filter(e => e.type === 'combat').length;
    const discoveryEvents = timelineEvents.filter(e => e.type === 'discovery').length;

    return {
        totalSessions: 1, // TODO: zliczać z save'ów
        totalMessages: messages.length,

        totalCost: aiSettings.costControl.totalCost || 0,
        sessionCost: aiSettings.costControl.sessionCost || 0,
        todayCost: usageStats.todayUsage,

        totalTokens: aiSettings.costControl.totalTokens || 0,
        sessionTokens: aiSettings.costControl.sessionTokens || 0,
        todayTokens: aiSettings.costControl.todayTokens || 0,

        geminiRequests,
        ttsRequests,
        imageRequests,

        totalEvents: timelineEvents.length,
        combatEvents,
        discoveryEvents,

        characterName: character?.name,
    };
}

/**
 * Eksportuje statystyki do Markdown
 */
export function exportCampaignStatsToMarkdown(stats?: CampaignStats): string {
    const s = stats || collectCampaignStats();
    const now = new Date();

    let md = `# 📊 Statystyki Kampanii\n\n`;
    md += `> Wygenerowano: ${now.toLocaleDateString('pl-PL')} ${now.toLocaleTimeString('pl-PL')}\n\n`;
    md += `---\n\n`;

    // Postać
    if (s.characterName) {
        md += `## 👤 Postać\n\n`;
        md += `**${s.characterName}**\n\n`;
        md += `---\n\n`;
    }

    // Ogólne
    md += `## 📋 Podsumowanie\n\n`;
    md += `| Metryka | Wartość |\n|---------|--------|\n`;
    md += `| Liczba sesji | ${s.totalSessions} |\n`;
    md += `| Łączna liczba wiadomości | ${s.totalMessages} |\n`;
    md += `| Wydarzenia na timeline | ${s.totalEvents} |\n`;
    md += `| Walki | ${s.combatEvents} |\n`;
    md += `| Odkrycia | ${s.discoveryEvents} |\n\n`;

    // Koszty
    md += `## 💰 Koszty API\n\n`;
    md += `| Kategoria | Koszt (USD) |\n|-----------|------------|\n`;
    md += `| **Całkowity** | $${s.totalCost.toFixed(4)} |\n`;
    md += `| Dzisiejsza sesja | $${s.sessionCost.toFixed(4)} |\n`;
    md += `| Dziś | $${s.todayCost.toFixed(4)} |\n\n`;

    // Tokeny
    md += `## 🔢 Tokeny\n\n`;
    md += `| Kategoria | Liczba |\n|-----------|--------|\n`;
    md += `| **Całkowicie** | ${s.totalTokens.toLocaleString()} |\n`;
    md += `| Ta sesja | ${s.sessionTokens.toLocaleString()} |\n`;
    md += `| Dziś | ${s.todayTokens.toLocaleString()} |\n\n`;

    // Requesty API
    md += `## 🤖 Requesty API\n\n`;
    md += `| Typ | Liczba |\n|-----|--------|\n`;
    md += `| Gemini (tekst) | ${s.geminiRequests} |\n`;
    md += `| TTS (głos) | ${s.ttsRequests} |\n`;
    md += `| Obrazy | ${s.imageRequests} |\n\n`;

    return md;
}

/**
 * Pobiera eksport jako plik .md
 */
export function downloadCampaignStats(): void {
    const markdown = exportCampaignStatsToMarkdown();
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statystyki_kampanii_${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
}
