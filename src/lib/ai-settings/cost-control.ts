import { loadAISettings, saveAISettings } from './storage';
import { trackEvent } from '@/lib/posthog';

// Kontrola kosztów
export const canMakeAIRequest = (
  requestType: 'image' | 'voice' | 'text'
): boolean => {
  const settings = loadAISettings();

  if (!settings.costControl.enabled) return true;

  // Sprawdź miesięczny budżet (dzienny limit żądań usunięty - #6, niepotrzebny w Home).
  if (
    settings.costControl.currentMonthUsage >= settings.costControl.monthlyBudget
  ) {
    return false;
  }

  return true;
};

export const recordAIRequest = (
  requestType: 'image' | 'voice' | 'text',
  cost: number = 0.01,
  model?: string,
  tokens: number = 0
) => {
  // Sprawdź czy jesteśmy po stronie klienta (localStorage nie działa na serwerze)
  if (typeof window === 'undefined') {
    console.log(
      `💰 AI Request (server-side, skipped recording): ${requestType}${model ? ` (${model})` : ''}, cost: $${cost.toFixed(4)}, tokens: ${tokens}`
    );
    return;
  }

  const settings = loadAISettings();

  if (!settings.costControl.enabled) return;

  // Zaktualizuj dzienne użycie
  const today = new Date().toDateString();
  const dailyUsageKey = `ai_usage_${today}`;
  const dailyUsage = parseInt(localStorage.getItem(dailyUsageKey) || '0');
  localStorage.setItem(dailyUsageKey, (dailyUsage + 1).toString());

  // Zaktualizuj dzienne tokeny
  const dailyTokensKey = `ai_tokens_${today}`;
  const dailyTokens = parseInt(localStorage.getItem(dailyTokensKey) || '0');
  const newDailyTokens = dailyTokens + tokens;
  localStorage.setItem(dailyTokensKey, newDailyTokens.toString());

  // Zaktualizuj miesięczne użycie i liczniki tokenów
  const newMonthlyUsage = settings.costControl.currentMonthUsage + cost;
  const newSessionTokens = (settings.costControl.sessionTokens || 0) + tokens;
  const newTotalTokens = (settings.costControl.totalTokens || 0) + tokens;

  const updatedSettings = {
    ...settings,
    costControl: {
      ...settings.costControl,
      currentMonthUsage: newMonthlyUsage,
      sessionTokens: newSessionTokens,
      totalTokens: newTotalTokens,
      todayTokens: newDailyTokens,
    },
  };

  saveAISettings(updatedSettings);

  // Zapisz szczegóły użycia
  const usageDetails = {
    type: requestType,
    cost: cost,
    tokens: tokens,
    model: model || 'unknown',
    timestamp: new Date().toISOString(),
  };

  const usageHistoryKey = 'ai_usage_history';
  const history = JSON.parse(localStorage.getItem(usageHistoryKey) || '[]');
  history.push(usageDetails);

  // Zachowaj tylko ostatnie 100 rekordów
  if (history.length > 100) {
    history.splice(0, history.length - 100);
  }

  localStorage.setItem(usageHistoryKey, JSON.stringify(history));

  trackEvent('ai_request_completed', {
    requestType,
    model: model ?? 'unknown',
    costUsd: cost,
    tokens,
    monthlyTotalUsd: Math.round(newMonthlyUsage * 10000) / 10000,
  });

  console.log(
    `💰 AI Request recorded: ${requestType}${model ? ` (${model})` : ''}, cost: $${cost.toFixed(4)}, tokens: ${tokens}, monthly: $${newMonthlyUsage.toFixed(4)}`
  );
};

// Reset miesięcznego użycia
export const resetMonthlyUsage = () => {
  const settings = loadAISettings();
  const updatedSettings = {
    ...settings,
    costControl: {
      ...settings.costControl,
      currentMonthUsage: 0,
    },
  };
  saveAISettings(updatedSettings);
};

/**
 * Reset licznika tokenów dla bieżącej sesji (IND-57).
 *
 * Wywoływane w `useGameStart.handleStartGame` przy starcie nowej sesji gry.
 * NIE resetuje `totalTokens` (career-long counter - reset przez UI button w
 * Settings → Cost Control lub przez Full Reset/localStorage.clear()).
 *
 * SSR guard: na serwerze localStorage jest niedostępne, więc no-op.
 */
export const resetSessionTokens = () => {
  if (typeof window === 'undefined') return;
  const settings = loadAISettings();
  const updatedSettings = {
    ...settings,
    costControl: {
      ...settings.costControl,
      sessionTokens: 0,
    },
  };
  saveAISettings(updatedSettings);
};
