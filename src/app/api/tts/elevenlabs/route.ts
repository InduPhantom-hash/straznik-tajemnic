/**
 * ElevenLabs TTS endpoint
 *
 * Przywrócenie integracji ElevenLabs po decyzji D2 sesji 146 (DROPPED).
 * Obsługuje dwa modele:
 *   - `eleven_multilingual_v2` (flagowy, najlepsza jakość PL, emocje aktorskie)
 *   - `eleven_turbo_v2_5` (szybki, ~100ms latencja, 4x tańszy)
 *
 * Architektura BYOK: klucz API ElevenLabs przesyłany nagłówkiem
 * `X-ElevenLabs-Api-Key` (localStorage gracza) lub fallback na serwerowy
 * `ELEVENLABS_API_KEY` z `.env.local`.
 *
 * Koszt sesji 4h RPG (szacunki):
 *   - multilingual_v2 only: ~$4-$8 (20k-40k znaków)
 *   - hybryda (v2 main + turbo bg): ~$2.50-$5.00
 */

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { resolveUserId } from '@/lib/auth-user';
import { recordUserUsage } from '@/lib/user-usage';

// --- Stałe ---

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

/** Modele ElevenLabs dostępne w Strażniku Tajemnic. */
const ELEVENLABS_MODELS = {
  multilingual_v2: 'eleven_multilingual_v2',
  turbo_v2_5: 'eleven_turbo_v2_5',
} as const;

type ElevenLabsModelKey = keyof typeof ELEVENLABS_MODELS;

/** Domyślny model (flagowy - najlepsza jakość PL). */
const DEFAULT_MODEL: ElevenLabsModelKey = 'multilingual_v2';

/** Koszty przybliżone per 1000 znaków (USD). */
const COST_PER_1K_CHARS: Record<ElevenLabsModelKey, number> = {
  multilingual_v2: 0.18,
  turbo_v2_5: 0.045,
};

/** Domyślne ustawienia głosu ElevenLabs. */
const DEFAULT_VOICE_SETTINGS = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.0,
  use_speaker_boost: true,
};

// --- Retry ---

const MAX_RETRIES = 2;
const RETRY_BACKOFF_MS = 500;

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      // Nie ponawiaj 401/403 (trwałe) ani 400 (zły request)
      if (response.status === 401 || response.status === 403 || response.status === 400) {
        return response;
      }
      // Ponawiaj 429 (rate-limit) i 5xx (transient)
      if (response.ok || attempt === retries) {
        return response;
      }
      lastError = new Error(`ElevenLabs API ${response.status}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === retries) throw lastError;
    }
    await new Promise((resolve) => setTimeout(resolve, RETRY_BACKOFF_MS * Math.pow(2, attempt)));
  }
  throw lastError;
}

// --- POST handler ---

export async function POST(request: NextRequest) {
  let loggedTextLength = 0;
  let loggedModel = DEFAULT_MODEL;

  try {
    const body = await request.json();
    const {
      text,
      voice_id,
      model,
      voice_settings,
    } = body as {
      text?: string;
      voice_id?: string;
      model?: ElevenLabsModelKey;
      voice_settings?: {
        stability?: number;
        similarity_boost?: number;
        style?: number;
        use_speaker_boost?: boolean;
      };
    };

    loggedTextLength = typeof text === 'string' ? text.length : 0;
    loggedModel = model || DEFAULT_MODEL;

    // --- Walidacja ---

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Brak tekstu do przetworzenia (pole "text")' },
        { status: 400 }
      );
    }

    if (!voice_id || typeof voice_id !== 'string') {
      return NextResponse.json(
        { error: 'Brak identyfikatora głosu (pole "voice_id")' },
        { status: 400 }
      );
    }

    // --- Klucz API (BYOK) ---

    const apiKey =
      request.headers.get('X-ElevenLabs-Api-Key')?.trim() ||
      process.env.ELEVENLABS_API_KEY?.trim();

    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'Wklej swój klucz ElevenLabs w ustawieniach',
          code: 'BYOK_KEY_MISSING',
        },
        { status: 401 }
      );
    }

    // --- Wybór modelu ---

    const modelKey = model && model in ELEVENLABS_MODELS ? model : DEFAULT_MODEL;
    const modelId = ELEVENLABS_MODELS[modelKey];

    // --- Ustawienia głosu (merge z defaultami) ---

    const mergedSettings = {
      ...DEFAULT_VOICE_SETTINGS,
      ...(voice_settings || {}),
    };

    // --- Wywołanie ElevenLabs API ---

    const url = `${ELEVENLABS_API_URL}/${voice_id}`;
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: mergedSettings,
      }),
    });

    // --- Obsługa błędów API ---

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error');

      // Rate-limit - przekaż Retry-After klientowi
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || '30';
        Sentry.addBreadcrumb({
          category: 'tts',
          level: 'warning',
          message: `ElevenLabs rate-limit (429), retryAfter=${retryAfter}s`,
        });
        return NextResponse.json(
          {
            error: 'Limit zapytań ElevenLabs przekroczony - spróbuj za chwilę',
            retryable: true,
          },
          {
            status: 429,
            headers: { 'Retry-After': retryAfter },
          }
        );
      }

      // Nieprawidłowy klucz
      if (response.status === 401) {
        return NextResponse.json(
          {
            error: 'Nieprawidłowy klucz API ElevenLabs. Sprawdź ustawienia.',
            code: 'BYOK_KEY_INVALID',
          },
          { status: 401 }
        );
      }

      Sentry.captureException(new Error(`ElevenLabs API ${response.status}: ${errorBody}`), {
        tags: { service: 'tts-elevenlabs', httpStatus: response.status },
        extra: { textLength: loggedTextLength, model: modelId },
      });

      return NextResponse.json(
        {
          error: 'Wystąpił błąd podczas generowania audio ElevenLabs',
          details: errorBody,
        },
        { status: response.status }
      );
    }

    // --- Konwersja odpowiedzi na base64 data URI ---

    const audioBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(audioBuffer).toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${base64}`;

    // --- Tracking kosztów (fire-and-forget) ---

    const ttsChars = text.length;
    const costPer1k = COST_PER_1K_CHARS[modelKey];
    resolveUserId('local')
      .then((uid) =>
        recordUserUsage(uid, {
          type: 'tts',
          cost: (ttsChars / 1000) * costPer1k,
          chars: ttsChars,
        })
      )
      .catch(() => {});

    return NextResponse.json({
      success: true,
      audioUrl,
      voice_id,
      model: modelId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('ElevenLabs TTS Route Error:', error);
    Sentry.captureException(
      error instanceof Error ? error : new Error(String(error)),
      {
        tags: { service: 'tts-elevenlabs' },
        extra: { textLength: loggedTextLength, model: loggedModel },
      }
    );
    return NextResponse.json(
      {
        error: 'Wystąpił błąd podczas generowania audio ElevenLabs',
        details: error instanceof Error ? error.message : 'Nieznany błąd',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tts/elevenlabs - info o dostępnych modelach
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    models: Object.entries(ELEVENLABS_MODELS).map(([key, id]) => ({
      key,
      modelId: id,
      costPer1kChars: COST_PER_1K_CHARS[key as ElevenLabsModelKey],
    })),
    defaultModel: DEFAULT_MODEL,
    note: 'Głosy (voice_id) zależą od konta ElevenLabs użytkownika. Użyj GET https://api.elevenlabs.io/v1/voices z kluczem API.',
  });
}
