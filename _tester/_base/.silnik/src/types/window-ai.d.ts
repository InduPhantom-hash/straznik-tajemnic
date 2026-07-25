/**
 * Deklaracje typów dla Chrome Built-in AI API (window.ai).
 *
 * Chrome 127+ udostępnia Gemini Nano jako window.ai.languageModel.
 * Ten plik zapewnia bezpieczne typowanie TS bez dodatkowych zależności.
 *
 * Specyfikacja: https://developer.chrome.com/docs/ai/built-in
 * Status: Origin Trial (Chrome 127+), Stable (Chrome 131+)
 *
 * UWAGA: API jest dostępne WYŁĄCZNIE w kontekście przeglądarki (window).
 * NIE importuj tego w plikach serwerowych (route.ts, middleware.ts).
 */

interface AILanguageModelCapabilities {
  available: 'no' | 'after-download' | 'readily';
  defaultTopK?: number;
  maxTopK?: number;
  defaultTemperature?: number;
}

interface AILanguageModelCreateOptions {
  systemPrompt?: string;
  initialPrompts?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  topK?: number;
  signal?: AbortSignal;
}

interface AILanguageModel {
  prompt(input: string, options?: { signal?: AbortSignal }): Promise<string>;
  promptStreaming(input: string, options?: { signal?: AbortSignal }): ReadableStream<string>;
  countPromptTokens(input: string): Promise<number>;
  clone(): Promise<AILanguageModel>;
  destroy(): void;
  readonly tokensSoFar: number;
  readonly maxTokens: number;
  readonly tokensLeft: number;
}

interface AILanguageModelFactory {
  capabilities(): Promise<AILanguageModelCapabilities>;
  create(options?: AILanguageModelCreateOptions): Promise<AILanguageModel>;
}

interface WindowAI {
  languageModel: AILanguageModelFactory;
}

declare global {
  interface Window {
    ai?: WindowAI;
  }
}

export type {
  AILanguageModel,
  AILanguageModelFactory,
  AILanguageModelCapabilities,
  AILanguageModelCreateOptions,
  WindowAI,
};
