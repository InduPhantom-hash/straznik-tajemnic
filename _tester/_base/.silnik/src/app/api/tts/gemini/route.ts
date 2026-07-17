/**
 * Gemini TTS endpoint (IND-49)
 *
 * Hybrydowa migracja TTS - provider `gemini` dla LOW/MID/HIGH preset (~50× taniej
 * od ElevenLabs przy zachowaniu naturalności). ULTRA + SFX zostają na ElevenLabs.
 *
 * Docs: https://ai.google.dev/gemini-api/docs/speech-generation
 * Cennik: https://ai.google.dev/gemini-api/docs/pricing
 *
 * Ograniczenia (Gemini 2.5 Flash TTS preview):
 * - Brak streamingu (UX regres dla długich narracji vs ElevenLabs).
 * - Output ~few minutes per call → quality drift, chunking obowiązkowy dla dłuższych.
 * - Format: PCM s16le 24kHz mono → wymaga konwersji do WAV (`pcmToWav`).
 * - Multi-speaker max 2 (limit dla scen z 3+ NPC).
 * - Status `preview` - API/cennik mogą się zmienić.
 * - Brak dedykowanych głosów PL - używaj `languageCode: 'pl-PL'` na prebuilcie.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Modality } from '@google/genai';
import * as Sentry from '@sentry/nextjs';
import { getGeminiClient } from '@/lib/gemini-client-pool';
import { resolveUserId } from '@/lib/auth-user';
import { recordUserUsage, ttsCostPerChar } from '@/lib/user-usage';
import { pcmToWav } from '@/lib/audio/pcm-to-wav';
import {
  GEMINI_VOICES,
  DEFAULT_GEMINI_VOICE,
  isValidGeminiVoice,
} from '@/lib/gemini-voices';

const DEFAULT_MODEL = 'gemini-2.5-flash-preview-tts';
const DEFAULT_LANGUAGE_CODE = 'pl-PL';
const PCM_SAMPLE_RATE = 24000;
const PCM_CHANNELS = 1;
const PCM_BITS_PER_SAMPLE = 16;

// IND-191: parametry odporności na rate-limit i błędy transient.
const DEFAULT_RETRY_AFTER_SEC = 30; // gdy Gemini nie poda retryDelay przy 429
const TRANSIENT_RETRY_MAX = 2; // próby dla 500/503 (NIE dla 429 - free-tier ~35s > timeout)
const TRANSIENT_BACKOFF_MS = 500; // backoff 500 → 1000 ms

// IND-236 (analog IND-232 dla obrazów): model TTS bywa flaky - czasem zwraca tekst
// zamiast audio. Objawia się jako 400 "Model tried to generate text..." LUB jako
// odpowiedź 200 bez inlineData. To błąd TREŚCIOWO przejściowy (kolejna próba zwykle
// daje audio), więc ponawiamy do 3× - tak jak retry obrazu Gemini.
const TEXT_RESPONSE_RETRY_MAX = 3;

// IND-236: wzorzec komunikatu Gemini gdy model TTS "próbuje pisać tekst" zamiast
// generować audio. Łapie oba warianty Google ("Model tried to generate text..."
// oraz "...should only be used for TTS").
const TEXT_INSTEAD_OF_AUDIO_RE = /tried to generate text|only be used for TTS/i;

/**
 * IND-191: klasyfikuje błąd z SDK `@google/genai`.
 *
 * Detekcja przez `name === 'ApiError'` + odczyt `status` (HTTP code) - odporniejsze
 * na mocki niż `instanceof` (mock klasy = inna referencja). SDK pakuje JSON odpowiedzi
 * w `.message`, skąd wyciągamy `retryDelay` przy 429 (`"retryDelay":"35s"`).
 *
 * IND-236: `isRetryableTextResponse` = 400 z message "tried to generate text"
 * (lub sentinel braku inlineData). Treściowo przejściowy → ponawialny do 3×.
 */
function classifyTtsError(error: unknown): {
  httpStatus: number;
  retryAfterSec: number | null;
  isRateLimit: boolean;
  isTransient: boolean;
  isRetryableTextResponse: boolean;
} {
  const err = error as { name?: string; status?: number; message?: string };
  const status = typeof err?.status === 'number' ? err.status : 0;

  if (status === 429) {
    const match = err?.message?.match(/"retryDelay":\s*"(\d+)s"/);
    const retryAfterSec = match
      ? parseInt(match[1], 10)
      : DEFAULT_RETRY_AFTER_SEC;
    return {
      httpStatus: 429,
      retryAfterSec,
      isRateLimit: true,
      isTransient: false,
      isRetryableTextResponse: false,
    };
  }
  if (status === 503 || status === 500) {
    return {
      httpStatus: status,
      retryAfterSec: null,
      isRateLimit: false,
      isTransient: true,
      isRetryableTextResponse: false,
    };
  }
  if (status >= 400 && status < 500) {
    // IND-236: tylko "text-instead-of-audio" (400) jest ponawialny. Pozostałe 400
    // (zły głos, zła treść, 401) to odmowy trwałe - retry tylko by spowolniło.
    return {
      httpStatus: status,
      retryAfterSec: null,
      isRateLimit: false,
      isTransient: false,
      isRetryableTextResponse: TEXT_INSTEAD_OF_AUDIO_RE.test(
        err?.message ?? ''
      ),
    };
  }
  return {
    httpStatus: 500,
    retryAfterSec: null,
    isRateLimit: false,
    isTransient: false,
    isRetryableTextResponse: false,
  };
}

/**
 * IND-236: sentinel rzucany gdy Gemini zwróci 200 bez `inlineData` (model "napisał
 * tekst" zamiast audio bez błędu HTTP). `status:400` + message z "tried to generate
 * text" sprawia, że `classifyTtsError` traktuje go jak text-response → ponawialny.
 * Flaga `isTtsNoAudio` pozwala w `catch` POST zachować user-friendly 500 + komunikat.
 */
function makeNoAudioError(): Error {
  return Object.assign(
    new Error(
      'Model tried to generate text instead of audio (brak inlineData)'
    ),
    { name: 'ApiError', status: 400, isTtsNoAudio: true }
  );
}

/**
 * IND-191 + IND-236: retry server-side z limitem zależnym od typu błędu.
 *
 * - transient (500/503): do TRANSIENT_RETRY_MAX (IND-191).
 * - text-instead-of-audio (400 "tried to generate text" lub brak inlineData):
 *   do TEXT_RESPONSE_RETRY_MAX (IND-236, analog retry obrazu).
 * - pozostałe (429, inne 400, 401): brak retry (maxForType=0 → throw od razu).
 *
 * Rate-limit (429) NIE jest tu ponawiany - free-tier `retryDelay` (~35s) przekracza
 * Vercel function timeout. 429 propaguje do catch → klient dostaje 429 + Retry-After
 * i sam zarządza ponowieniem segmentu (useTTS).
 */
async function generateTtsWithRetry<T>(
  operation: () => Promise<T>
): Promise<T> {
  const maxAttempts = Math.max(TRANSIENT_RETRY_MAX, TEXT_RESPONSE_RETRY_MAX);
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const { isTransient, isRetryableTextResponse } = classifyTtsError(error);
      const maxForType = isRetryableTextResponse
        ? TEXT_RESPONSE_RETRY_MAX
        : isTransient
          ? TRANSIENT_RETRY_MAX
          : 0;
      if (attempt >= maxForType) {
        throw error;
      }
      const delay = TRANSIENT_BACKOFF_MS * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

export async function POST(request: NextRequest) {
  // IND-191: dostępne w catch dla Sentry extra (text/model żyją w scope try).
  let loggedTextLength = 0;
  let loggedModel = DEFAULT_MODEL;
  try {
    const body = await request.json();
    const { text, voice, model, languageCode } = body as {
      text?: string;
      voice?: string;
      model?: string;
      languageCode?: string;
    };
    loggedTextLength = typeof text === 'string' ? text.length : 0;
    loggedModel = model || DEFAULT_MODEL;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Brak tekstu do przetworzenia (pole "text")' },
        { status: 400 }
      );
    }

    const voiceId = voice || DEFAULT_GEMINI_VOICE;
    if (!isValidGeminiVoice(voiceId)) {
      return NextResponse.json(
        {
          error: `Niewłaściwy voice "${voiceId}". Dostępne: ${GEMINI_VOICES.map((v) => v.voiceId).join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Klucz lektora (IND-231, wersja lokalna Zew Home): priorytet ma nagłówek
    // X-Gemini-Api-Key (localStorage, jeśli gracz wpisał własny), fallbackiem jest
    // serwerowy GEMINI_API_KEY z .env.local. Offline jeden klucz zasila wszystko
    // (czat/obrazy/lektor) - bez ręcznego wpisywania w modal. Brak obu = 401.
    const apiKey =
      request.headers.get('X-Gemini-Api-Key')?.trim() ||
      process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'Wklej swój klucz Google AI Studio w ustawieniach',
          code: 'BYOK_KEY_MISSING',
        },
        { status: 401 }
      );
    }

    const client = getGeminiClient(apiKey);
    if (!client) {
      return NextResponse.json(
        { error: 'Twój klucz API Gemini jest pusty. Sprawdź ustawienia.' },
        { status: 401 }
      );
    }

    // IND-191 + IND-236: retry server-side. Walidacja audio jest WEWNĄTRZ operacji -
    // brak inlineData rzuca sentinel (text-instead-of-audio) → ponowienie zamiast 500.
    // Transient (500/503) i 400 "tried to generate text" też ponawiane; 429 / inne 400
    // propagują do catch bez retry.
    const audioBase64 = await generateTtsWithRetry(async () => {
      const response = await client.models.generateContent({
        model: model || DEFAULT_MODEL,
        contents: [{ role: 'user', parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceId },
            },
            languageCode: languageCode || DEFAULT_LANGUAGE_CODE,
          },
        },
      });
      const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (!data?.data) {
        throw makeNoAudioError();
      }
      return data.data;
    });

    const audioUrl = pcmToWav(
      audioBase64,
      PCM_SAMPLE_RATE,
      PCM_CHANNELS,
      PCM_BITS_PER_SAMPLE
    );

    // IND-168 Faza 6: licznik zużycia per-konto (fire-and-forget, GCS).
    // IND-197: koszt liczony stawką zależną od modelu (narrator=Pro / NPC=Flash),
    // a nie uniform Pro - inaczej segmenty NPC (Flash) zawyżane ~2×.
    const usedModel = model || DEFAULT_MODEL;
    const ttsChars = text.length;
    resolveUserId('local')
      .then((uid) =>
        recordUserUsage(uid, {
          type: 'tts',
          cost: ttsChars * ttsCostPerChar(usedModel),
          chars: ttsChars,
        })
      )
      .catch(() => {});

    return NextResponse.json({
      success: true,
      audioUrl,
      voice: voiceId,
      model: model || DEFAULT_MODEL,
      languageCode: languageCode || DEFAULT_LANGUAGE_CODE,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Gemini TTS Route Error:', error);
    const { httpStatus, retryAfterSec, isRateLimit } = classifyTtsError(error);

    // IND-191: 429 (rate-limit) = oczekiwane przy free-tier - zwróć 429 + Retry-After,
    // klient (useTTS) ponowi segment. NIE zaśmiecaj Sentry (tylko breadcrumb).
    if (isRateLimit) {
      Sentry.addBreadcrumb({
        category: 'tts',
        level: 'warning',
        message: `Gemini TTS rate-limit (429), retryAfter=${retryAfterSec}s`,
      });
      return NextResponse.json(
        {
          error: 'Limit zapytań TTS przekroczony - spróbuj za chwilę',
          retryable: true,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfterSec ?? DEFAULT_RETRY_AFTER_SEC),
          },
        }
      );
    }

    // IND-236: po wyczerpaniu retry model nadal nie zwrócił audio (sentinel braku
    // inlineData) - zachowaj user-friendly 500 + komunikat (kontrakt sprzed IND-236).
    const isNoAudio =
      (error as { isTtsNoAudio?: boolean })?.isTtsNoAudio === true;

    // IND-191: błędy ≠429 (400 reject treści, transient 500/503 po wyczerpaniu retry,
    // text-instead-of-audio po 3 próbach, nieznane) - widoczne w Sentry (była ślepa plamka).
    Sentry.captureException(
      error instanceof Error ? error : new Error(String(error)),
      {
        tags: {
          service: 'tts-gemini',
          httpStatus: isNoAudio ? 500 : httpStatus,
        },
        extra: { textLength: loggedTextLength, model: loggedModel },
      }
    );

    if (isNoAudio) {
      return NextResponse.json(
        {
          error: 'Brak danych audio w odpowiedzi Gemini',
          details:
            'Model nie zwrócił inlineData mimo ponowień (text-instead-of-audio)',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: 'Wystąpił błąd podczas generowania audio Gemini',
        details: error instanceof Error ? error.message : 'Nieznany błąd',
      },
      { status: httpStatus }
    );
  }
}

/**
 * GET /api/tts/gemini - list dostępnych prebuiltów
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    voices: GEMINI_VOICES.map((v) => ({
      voiceId: v.voiceId,
      name: v.name,
      description: v.description,
      role: v.role,
    })),
    count: GEMINI_VOICES.length,
    defaultVoice: DEFAULT_GEMINI_VOICE,
  });
}
