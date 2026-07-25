/**
 * ElevenLabs TTS endpoint (Silnik)
 *
 * Endpoint ElevenLabs z BYOK, retry, rate-limit, Sentry i usage tracking.
 */

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { resolveUserId } from '@/lib/auth-user';
import { recordUserUsage } from '@/lib/user-usage';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

const ELEVENLABS_MODELS = {
  multilingual_v2: 'eleven_multilingual_v2',
  turbo_v2_5: 'eleven_turbo_v2_5',
} as const;

type ElevenLabsModelKey = keyof typeof ELEVENLABS_MODELS;

const DEFAULT_MODEL: ElevenLabsModelKey = 'multilingual_v2';

const COST_PER_1K_CHARS: Record<ElevenLabsModelKey, number> = {
  multilingual_v2: 0.18,
  turbo_v2_5: 0.045,
};

const DEFAULT_VOICE_SETTINGS = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.0,
  use_speaker_boost: true,
};

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
      if (response.status === 401 || response.status === 403 || response.status === 400) {
        return response;
      }
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

    const modelKey = model && model in ELEVENLABS_MODELS ? model : DEFAULT_MODEL;
    const modelId = ELEVENLABS_MODELS[modelKey];

    const mergedSettings = {
      ...DEFAULT_VOICE_SETTINGS,
      ...(voice_settings || {}),
    };

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

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error');

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

    const audioBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(audioBuffer).toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${base64}`;

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

export async function GET() {
  return NextResponse.json({
    success: true,
    models: Object.entries(ELEVENLABS_MODELS).map(([key, id]) => ({
      key,
      modelId: id,
      costPer1kChars: COST_PER_1K_CHARS[key as ElevenLabsModelKey],
    })),
    defaultModel: DEFAULT_MODEL,
  });
}
