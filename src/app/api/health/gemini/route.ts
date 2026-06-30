/**
 * GET /api/health/gemini - self-check zdrowia klucza i modeli Gemini (IND-273 T2).
 *
 * Read-only health: woła `ai.models.list()`, waliduje klucz (200 = OK, 400/403 =
 * zły/wygasły, sieć/timeout = nieznany) i krzyżuje żywą listę modeli z rejestrem
 * (`model-registry.ts`). Łapie deprecację modeli PROAKTYWNIE (np. gemini-2.0-flash
 * zniknął 1.06.2026 → 502 w środku gry, IND-222) zanim gracz trafi na błąd.
 *
 * HTTP zawsze 200 - stan raportowany w body (upraszcza klienta useHealthCheck).
 * Tylko niespodziewany crash → 500.
 *
 * Klucz: nagłówek `X-Gemini-Api-Key` (BYOK) ma precedencję nad `process.env`
 * (wzór z run-chat-pipeline.ts - wersja lokalna zew-app-local).
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import {
  DEFAULT_CHAT_MODEL,
  PRESET_MODELS,
  EMBEDDING_MODEL,
} from '@/lib/model-registry';

export type HealthStatus = 'ok' | 'invalid_key' | 'network_error' | 'no_key';

export interface GeminiHealth {
  status: HealthStatus;
  /** true = klucz ważny, false = zły/wygasły, null = nieznany (sieć/brak klucza). */
  keyValid: boolean | null;
  /** Chat-capable ID z żywej listy (puste gdy klucz nie OK). */
  availableModels: string[];
  registry: {
    chatModelsPresent: string[];
    chatModelsMissing: string[];
    embeddingPresent: boolean;
  };
  checkedAt: string;
}

/** Klucz: nagłówek BYOK > serwerowy env (wzór run-chat-pipeline.ts:42). */
function resolveGeminiApiKey(request: NextRequest): string | null {
  const key = request.headers.get('X-Gemini-Api-Key')?.trim();
  return key || process.env.GEMINI_API_KEY?.trim() || null;
}

/**
 * Czy błąd oznacza ZŁY/wygasły klucz (vs problem sieci). Detekcja po status/message,
 * NIE instanceof (mock-safe, lekcja IND-191). 400 INVALID_ARGUMENT / 403
 * PERMISSION_DENIED = klucz zły. Inne (timeout/DNS/5xx) = stan nieznany.
 */
function isInvalidKeyError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { status?: number; code?: number; message?: string };
  const status = e.status ?? e.code;
  if (status === 400 || status === 403) return true;
  return /INVALID_ARGUMENT|PERMISSION_DENIED|API[_ ]key not valid|API_KEY_INVALID/i.test(
    e.message ?? ''
  );
}

/** Aktywne modele chat rejestru (default + 4 presety, unikalne). Bez legacy bare. */
function activeChatModels(): string[] {
  return Array.from(
    new Set([
      DEFAULT_CHAT_MODEL,
      ...Object.values(PRESET_MODELS).map((p) => p.chatModel),
    ])
  );
}

export async function GET(request: NextRequest): Promise<Response> {
  const checkedAt = new Date().toISOString();
  const emptyRegistry = {
    chatModelsPresent: [],
    chatModelsMissing: [],
    embeddingPresent: false,
  };

  const apiKey = resolveGeminiApiKey(request);
  if (!apiKey) {
    return NextResponse.json<GeminiHealth>({
      status: 'no_key',
      keyValid: null,
      availableModels: [],
      registry: emptyRegistry,
      checkedAt,
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const pager = await ai.models.list();

    const chatModels = new Set<string>();
    const embeddingModels = new Set<string>();
    for await (const m of pager) {
      const id = (m.name ?? '').replace(/^models\//, '');
      if (!id) continue;
      const actions = m.supportedActions ?? [];
      if (actions.includes('generateContent')) chatModels.add(id);
      if (actions.includes('embedContent')) embeddingModels.add(id);
    }

    const active = activeChatModels();
    const chatModelsPresent = active.filter((id) => chatModels.has(id));
    const chatModelsMissing = active.filter((id) => !chatModels.has(id));

    return NextResponse.json<GeminiHealth>({
      status: 'ok',
      keyValid: true,
      availableModels: Array.from(chatModels).sort(),
      registry: {
        chatModelsPresent,
        chatModelsMissing,
        embeddingPresent: embeddingModels.has(EMBEDDING_MODEL),
      },
      checkedAt,
    });
  } catch (err) {
    // Zły klucz vs problem sieci - tylko pierwszy oznacza keyValid:false.
    const invalidKey = isInvalidKeyError(err);
    return NextResponse.json<GeminiHealth>({
      status: invalidKey ? 'invalid_key' : 'network_error',
      keyValid: invalidKey ? false : null,
      availableModels: [],
      registry: emptyRegistry,
      checkedAt,
    });
  }
}
