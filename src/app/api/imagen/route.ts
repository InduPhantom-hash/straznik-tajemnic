/**
 * Image Generation API endpoint (Zew-App-Local)
 *
 * Jeden klucz Gemini: wszystkie obrazy generuje Gemini image (rodzina Gemini API,
 * ten sam klucz z Google AI Studio co czat / TTS / embeddingi). Zero fallbacków -
 * Vertex AI i Replicate wycięte ze ścieżki (osobne konta/klucze). Zwraca data URL.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { resolveUserId } from '@/lib/auth-user';
import { recordUserUsage } from '@/lib/user-usage';
import { generateTraceId, startTimer, logApiEvent } from '@/lib/telemetry';
import { DEFAULT_IMAGE_MODEL } from '@/lib/model-registry';

// Cache dla wygenerowanych obrazów
const imageCache = new Map<
  string,
  { url: string; timestamp: number; provider: string }
>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 godzina

export async function POST(request: NextRequest) {
  // IND-257: telemetria obrazów - logApiEvent fire-and-forget przy każdym wyjściu
  // generacji (sukces z costUsd, błędy ze statusem). Wcześniej /api/imagen w ogóle
  // nie był logowany, więc liczby/kosztu obrazów nie dało się mierzyć z
  // telemetry.jsonl (raport playtestu Z2). traceId/timer przed `try`, by również
  // zewnętrzny catch mógł zalogować błąd. Walidacja 400 i endpoint 'test' pominięte
  // świadomie - to nie próby generacji obrazu.
  const traceId = generateTraceId();
  const timer = startTimer();
  const logImagen = (
    status: number,
    result: 'success' | 'error',
    opts: { costUsd?: number; cached?: boolean; errorMsg?: string } = {}
  ) =>
    logApiEvent({
      traceId,
      endpoint: '/api/imagen',
      provider: 'gemini',
      model: DEFAULT_IMAGE_MODEL,
      status,
      durationMs: timer.elapsed(),
      result,
      costUsd: opts.costUsd,
      errorMsg: opts.errorMsg,
      meta: opts.cached != null ? { cached: opts.cached } : undefined,
    }).catch(() => {});

  try {
    const body = await request.json();
    const { prompt, style = 'horror', seed } = body;

    // Walidacja promptu
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
      return NextResponse.json(
        { error: 'Prompt is required and must be at least 3 characters' },
        { status: 400 }
      );
    }

    // Test endpoint - diagnostyka providera (Zew-App-Local: tylko Gemini).
    if (prompt === 'test') {
      const hasGemini = !!process.env.GEMINI_API_KEY;
      return NextResponse.json({
        status: hasGemini ? 'available' : 'no_providers',
        configuredCount: hasGemini ? 1 : 0,
        providers: {
          gemini: {
            available: hasGemini,
            priority: 1,
            env: { GEMINI_API_KEY: hasGemini ? 'set' : 'missing' },
            model: DEFAULT_IMAGE_MODEL,
            hint: !hasGemini
              ? 'Set GEMINI_API_KEY in .env.local (klucz z Google AI Studio)'
              : undefined,
          },
        },
      });
    }

    // Sprawdź cache. `seed` (opcjonalny) trafia do klucza: gdy klient go
    // przekaże (np. "Generuj ponownie" portret z A5 - losowy nonce na każdy
    // klik), hash jest inny → cache miss → świeży obraz. Bez `seed` zachowanie
    // jest identyczne jak dotąd (sceny NIE wysyłają seed → cache działa normalnie).
    const seedSuffix = seed != null && seed !== '' ? `-${String(seed)}` : '';
    const cacheKey = crypto
      .createHash('md5')
      .update(`${prompt}-${style}${seedSuffix}`)
      .digest('hex');
    const cached = imageCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('🎯 Using cached image result');
      logImagen(200, 'success', { costUsd: 0, cached: true });
      return NextResponse.json({
        success: true,
        imageUrl: cached.url,
        provider: `${cached.provider}-cached`,
        cost: 0,
        metadata: { source: 'cache' },
      });
    }

    let result: {
      success: boolean;
      imageUrl: string;
      provider: string;
      cost: number;
    } | null = null;
    let lastError = '';

    // Zew-App-Local: jedyny provider obrazów to Gemini image (rodzina Gemini API,
    // ten sam klucz z Google AI Studio co czat / TTS / embeddingi). Zero fallbacków.
    // Klucz BYOK: priorytet ma nagłówek X-Gemini-Api-Key (localStorage gracza),
    // fallback serwerowy GEMINI_API_KEY z .env.local (wzorzec 1:1 z tts/gemini:207).
    // Brak obu = 401 BYOK_KEY_MISSING (nie 500) - klient pokazuje modal wklejenia klucza.
    const apiKey =
      request.headers.get('X-Gemini-Api-Key')?.trim() ||
      process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      logImagen(401, 'error', { errorMsg: 'BYOK_KEY_MISSING' });
      return NextResponse.json(
        {
          error: 'Wklej swój klucz Google AI Studio w ustawieniach',
          code: 'BYOK_KEY_MISSING',
        },
        { status: 401 }
      );
    }

    console.log('🎨 Generuję obraz przez Gemini...');
    const model = DEFAULT_IMAGE_MODEL;

    // Rozszerz prompt. 2026-06-28: domyślnie REALIZM epoki (świat rzeczywisty lat 20.,
    // film/noir) zamiast doklejania na sztywno "cosmic horror, Lovecraftian, eerie" -
    // to nadpisywało realistyczny prompt MG i wszystko wychodziło w mackach. Grozę i
    // nadprzyrodzone wnosi TREŚĆ promptu MG (gdy scena tego wymaga), nie blanket-suffix.
    let enhancedPrompt = prompt;
    if (style === 'horror') {
      enhancedPrompt = `${prompt}, 1920s period-accurate, realistic, cinematic film-grain, moody natural lighting, film noir aesthetic, muted color palette, highly detailed`;
    } else if (style === 'portrait') {
      enhancedPrompt = `${prompt}, 1920s period-accurate portrait photography, realistic, head and shoulders shot, cinematic lighting, film-grain, highly detailed expression`;
    }

    // IND-232: gemini-2.5-flash-image bywa flaky - czasem zwraca sam TEKST zamiast
    // obrazu (brak inlineData), co dawniej kończyło się twardym 500 przy losowych
    // turach. Ponawiamy do MAX_ATTEMPTS razy, gdy odpowiedź nie zawiera danych obrazu
    // lub błąd jest przejściowy (5xx/429/sieć). Prompt jawnie żąda WYŁĄCZNIE obrazu,
    // żeby zmniejszyć szansę odpowiedzi tekstowej. Błędy trwałe (4xx poza 429, np. zły
    // klucz/prompt) przerywają pętlę od razu - nie ma sensu ich powtarzać.
    // 2026-06-28 (portable): flakiness jest LOSOWA, nie trwała - log pokazywał portret
    // padający 3/3 na samym tekście, a sąsiednie wywołania udawały się dopiero w próbie
    // 2-3. Podniesiono 3→6, bo koszt nalicza się tylko na sukcesie (recordUserUsage na
    // ścieżce 200), więc dodatkowe próby tekstowe nie obciążają budżetu.
    const MAX_ATTEMPTS = 6;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS && !result; attempt++) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [
                    {
                      text: `Output a single generated image. Do NOT reply with any text, caption, refusal or description - return only the image. Image content: ${enhancedPrompt}`,
                    },
                  ],
                },
              ],
              generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          lastError = `Gemini API ${response.status}: ${errorData?.error?.message || response.statusText}`;
          console.warn(
            `⚠️ Gemini API error (próba ${attempt}/${MAX_ATTEMPTS}): ${lastError}`
          );
          // 4xx poza 429 = błąd trwały (zły klucz/prompt) - nie ponawiaj.
          if (response.status < 500 && response.status !== 429) break;
        } else {
          const data = await response.json();
          const candidates = data.candidates || [];

          for (const candidate of candidates) {
            const parts = candidate.content?.parts || [];
            for (const part of parts) {
              if (part.inlineData?.mimeType?.startsWith('image/')) {
                const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                result = {
                  success: true,
                  imageUrl,
                  provider: 'gemini',
                  cost: 0.02,
                };
                console.log(
                  `✅ Gemini succeeded (próba ${attempt}/${MAX_ATTEMPTS})`
                );
                break;
              }
            }
            if (result) break;
          }

          if (!result) {
            lastError = 'Gemini responded but did not return image data';
            console.warn(
              `⚠️ Gemini bez obrazu (próba ${attempt}/${MAX_ATTEMPTS}). Candidates: ${JSON.stringify(candidates.map((c: { content?: { parts?: { text?: string }[] } }) => c.content?.parts?.map((p) => Object.keys(p))))}`
            );
            // brak obrazu = ponawiamy (model czasem zwraca samą odpowiedź tekstową).
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Gemini error';
        console.warn(
          `⚠️ Gemini error (próba ${attempt}/${MAX_ATTEMPTS}): ${lastError}`
        );
      }

      // Backoff przed kolejną próbą: flakiness ("did not return image data" / 5xx)
      // bywa chwilowa, a natychmiastowe ponowienie trafiało w ten sam błąd.
      // Eksponencjalnie (300ms, 600ms, 1.2s...), cap 2s by zmieścić się w timeout.
      if (!result && attempt < MAX_ATTEMPTS) {
        await new Promise((r) =>
          setTimeout(r, Math.min(300 * 2 ** (attempt - 1), 2000))
        );
      }
    }

    // Jeśli generacja nie zadziałała
    if (!result) {
      console.error(`❌ Gemini image generation failed: ${lastError}`);
      logImagen(500, 'error', { errorMsg: lastError });
      return NextResponse.json(
        {
          error: 'Image generation failed',
          lastError,
          hint: 'Sprawdź GEMINI_API_KEY (klucz z Google AI Studio) oraz limity API.',
        },
        { status: 500 }
      );
    }

    // Zapisz do cache
    if (result.imageUrl) {
      imageCache.set(cacheKey, {
        url: result.imageUrl,
        timestamp: Date.now(),
        provider: result.provider || 'unknown',
      });

      // IND-168 Faza 6: licznik zużycia per-konto (fire-and-forget). Do wycięcia w Liście 2.
      const imageCost = typeof result.cost === 'number' ? result.cost : 0.02;
      resolveUserId('local')
        .then((uid) => recordUserUsage(uid, { type: 'image', cost: imageCost }))
        .catch(() => {});
    }

    logImagen(200, 'success', { costUsd: result.cost, cached: false });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Image generation error:', error);
    logImagen(500, 'error', {
      errorMsg: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to generate image',
      },
      { status: 500 }
    );
  }
}

// GET - sprawdź status providera (Zew-App-Local: tylko Gemini)
export async function GET() {
  const hasGemini = !!process.env.GEMINI_API_KEY;

  return NextResponse.json({
    available: hasGemini,
    providers: {
      gemini: {
        available: hasGemini,
        priority: 1,
        quality: '⭐⭐⭐',
        cost: '$0.02/image (Gemini Image)',
        model: DEFAULT_IMAGE_MODEL,
      },
    },
  });
}
