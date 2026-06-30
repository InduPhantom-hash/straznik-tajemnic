/**
 * AI Cost Tracker - Śledzenie i kontrola kosztów API
 *
 * Wyodrębniona logika z ai-settings.ts dla zgodności z zasadą <200 linii/plik.
 * @module ai-cost-tracker
 */

// IND-275 T1: cennik Gemini scentralizowany w model-registry; re-export pod
// historyczną nazwą GEMINI_PRICING (callerzy + testy bez zmian). calculateGeminiCost
// (niżej) i klucz `default` zostają tutaj. REPLICATE_PRICING bez zmian (osobny tor).
import { GEMINI_PRICING } from './model-registry';
import { getGeminiPricing } from './pricing/pricing-data';

// ========================================
// REPLICATE PRICING
// ========================================

const REPLICATE_PRICING: Record<
  string,
  { base: number; steps: number; size: number }
> = {
  'stability-ai/stable-diffusion': {
    base: 0.0023,
    steps: 0.0001,
    size: 0.0001,
  },
  'stability-ai/sdxl': { base: 0.0046, steps: 0.0002, size: 0.0002 },
  'runwayml/stable-diffusion-v1-5': {
    base: 0.0023,
    steps: 0.0001,
    size: 0.0001,
  },
  'stability-ai/stable-diffusion-xl-base-1.0': {
    base: 0.0046,
    steps: 0.0002,
    size: 0.0002,
  },
  'stability-ai/stable-diffusion-3-medium': {
    base: 0.0092,
    steps: 0.0004,
    size: 0.0004,
  },
};

// ========================================
// GEMINI PRICING (per 1M tokens)
// ========================================

// Re-export z model-registry (single source of truth, IND-275 T1).
export { GEMINI_PRICING };

/**
 * Oblicza koszt generowania obrazu w Replicate
 */
export function calculateReplicateCost(
  model: string,
  numInferenceSteps: number,
  width: number,
  height: number
): number {
  const modelPricing =
    REPLICATE_PRICING[model] ||
    REPLICATE_PRICING['stability-ai/stable-diffusion'];

  const stepCost = modelPricing.steps * numInferenceSteps;
  const sizeMultiplier = (width * height) / (512 * 512);
  const sizeCost = modelPricing.size * sizeMultiplier;

  return modelPricing.base + stepCost + sizeCost;
}

/**
 * Cached input tokens (OPT-26 context cache) są tańsze niż świeże.
 * Gemini 2.5 nalicza cached input ~25% stawki input (75% rabat). <<VERIFY_THIS>>
 * (zweryfikować przy aktualizacji cennika - ai.google.dev/gemini-api/docs/pricing)
 */
const CACHED_INPUT_RATE = 0.25;

/**
 * Oblicza koszt żądania Gemini.
 *
 * @param inputTokens  Pełna liczba tokenów wejścia (promptTokenCount - ZAWIERA cached).
 * @param cachedTokens Tokeny obsłużone z cache (cachedContentTokenCount). Naliczane
 *                     z rabatem CACHED_INPUT_RATE. Domyślnie 0 (brak cache / backward-compat).
 */
export function calculateGeminiCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cachedTokens: number = 0
): number {
  const table = getGeminiPricing();
  const pricing = table[model] || table['default'];
  // promptTokenCount zawiera cached - rozdziel na świeże (pełna stawka) + cached (rabat).
  const freshInput = Math.max(0, inputTokens - cachedTokens);
  const inputCost =
    (freshInput / 1_000_000) * pricing.input +
    (cachedTokens / 1_000_000) * pricing.input * CACHED_INPUT_RATE;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

// ========================================
// USAGE TRACKING
// ========================================

interface UsageRecord {
  type: 'image' | 'voice' | 'text';
  cost: number;
  tokens: number;
  model: string;
  timestamp: string;
}

const USAGE_HISTORY_KEY = 'ai_usage_history';
const MAX_HISTORY_RECORDS = 100;

/**
 * Pobiera historię użycia API
 */
export function getUsageHistory(limit: number = 50): UsageRecord[] {
  if (typeof window === 'undefined') return [];
  const history = JSON.parse(localStorage.getItem(USAGE_HISTORY_KEY) || '[]');
  return history.slice(-limit);
}

/**
 * Zapisuje rekord użycia do historii
 */
export function saveUsageRecord(record: UsageRecord): void {
  if (typeof window === 'undefined') return;

  const history = getUsageHistory(MAX_HISTORY_RECORDS);
  history.push(record);

  // Zachowaj tylko ostatnie rekordy
  if (history.length > MAX_HISTORY_RECORDS) {
    history.splice(0, history.length - MAX_HISTORY_RECORDS);
  }

  localStorage.setItem(USAGE_HISTORY_KEY, JSON.stringify(history));
}

/**
 * Pobiera statystyki użycia
 */
/**
 * Statystyki użycia API - return type funkcji `getUsageStats()`.
 * Eksportowane jako interface dla typowania konsumentów (IND-17 quick win #1).
 */
export interface UsageStats {
  todayUsage: number;
  thisMonthUsage: number;
  modelUsage: Record<string, number>;
  totalRequests: number;
  averageCost: number;
}

export function getUsageStats(): UsageStats {
  const history = getUsageHistory(MAX_HISTORY_RECORDS);
  const today = new Date().toDateString();
  const now = new Date();

  const todayUsage = history
    .filter((record) => new Date(record.timestamp).toDateString() === today)
    .reduce((sum, record) => sum + record.cost, 0);

  const thisMonthUsage = history
    .filter((record) => {
      const recordDate = new Date(record.timestamp);
      return (
        recordDate.getMonth() === now.getMonth() &&
        recordDate.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, record) => sum + record.cost, 0);

  const modelUsage = history.reduce((acc: Record<string, number>, record) => {
    acc[record.model] = (acc[record.model] || 0) + record.cost;
    return acc;
  }, {});

  const totalCost = history.reduce((sum, record) => sum + record.cost, 0);

  return {
    todayUsage,
    thisMonthUsage,
    modelUsage,
    totalRequests: history.length,
    averageCost: history.length > 0 ? totalCost / history.length : 0,
  };
}

// ========================================
// COST CONTROL HELPERS
// ========================================
//
// IND-52: `canMakeAIRequest` zostało zdropowane z tego pliku - pełna wersja
// z side-effect (`loadAISettings()`) żyje w `ai-settings/cost-control.ts`.
// Tu pozostają tylko pure helpers (`incrementDailyUsage`, `updateDailyTokens`).
// Pricing tables (REPLICATE_PRICING + GEMINI_PRICING) i kalkulatory też zostają.

/**
 * Inkrementuje dzienny licznik użycia
 */
export function incrementDailyUsage(): number {
  const today = new Date().toDateString();
  const dailyUsageKey = `ai_usage_${today}`;
  const dailyUsage = parseInt(localStorage.getItem(dailyUsageKey) || '0') + 1;
  localStorage.setItem(dailyUsageKey, dailyUsage.toString());
  return dailyUsage;
}

/**
 * Aktualizuje dzienny licznik tokenów
 */
export function updateDailyTokens(tokens: number): number {
  const today = new Date().toDateString();
  const dailyTokensKey = `ai_tokens_${today}`;
  const dailyTokens =
    parseInt(localStorage.getItem(dailyTokensKey) || '0') + tokens;
  localStorage.setItem(dailyTokensKey, dailyTokens.toString());
  return dailyTokens;
}
