import { NextRequest, NextResponse } from 'next/server';
import { GeminiChatProvider } from '@/lib/ai-providers';
import { DEFAULT_GEMINI_MODEL } from '@/lib/ai-providers/constants';
import * as Sentry from '@sentry/nextjs';

/**
 * /api/ai/utility - neutralny kanał AI dla zadań narzędziowych (NIE narracja GM).
 *
 * Powód (playtest 2026-06-18): kreator postaci reużywał `/api/chat`, który ZAWSZE
 * wstrzykuje personę Strażnika Tajemnic + GM Protocol. Po hartowaniu role-locka
 * (IND-223 "ABSOLUTNY ZAKAZ opuszczania roli" + "instrukcji/myśli MG nigdy jako goły
 * tekst") AI odmawiało wygenerowania suchego JSON-a z punktami umiejętności i wypluwało
 * `[MYŚLI_MG: ...]` → `JSON.parse` w kreatorze padał ("Błąd parsowania odpowiedzi AI").
 *
 * Ten endpoint daje kreatorowi (rozdział umiejętności, losowanie postaci, rekomendacje,
 * ekwipunek, pola tła) osobny kanał BEZ persony GM, BEZ RAG, BEZ gmProtocol i BEZ
 * efektów ubocznych (Pinecone/director-state/telemetria). Zwraca DOKŁADNIE to, o co
 * prosi prompt (zwykle JSON lub prosta lista).
 *
 * Klucz (IND-231, wersja lokalna Zew Home): priorytet ma nagłówek `X-Gemini-Api-Key`
 * (localStorage, jeśli gracz wpisał własny), a fallbackiem jest serwerowy
 * `GEMINI_API_KEY` z `.env.local`. Dzięki temu na prywatnym localhoście kreator AI
 * działa bez ręcznego wpisywania klucza (spójne z `/api/chat` i `/api/imagen`, które
 * w tej wersji TEŻ mają fallback env). Brak obu → 401.
 *
 * Format odpowiedzi: SSE `data: {type:'text',content}\n\n` (kompatybilny z
 * `collectSSEText` - kreator nie zmienia obsługi odpowiedzi, tylko URL).
 */

const UTILITY_SYSTEM_PROMPT = `Jesteś precyzyjnym asystentem generującym dane dla aplikacji RPG Call of Cthulhu 7ed.
Wykonujesz DOKŁADNIE instrukcję użytkownika i zwracasz WYŁĄCZNIE żądany wynik (zwykle czysty JSON albo prosta lista tekstowa).
NIE wcielasz się w żadną postać, NIE jesteś Strażnikiem Tajemnic, NIE prowadzisz narracji.
NIGDY nie dodawaj komentarzy, wyjaśnień, tagów typu [MYŚLI_MG:] ani prozy - tylko surowy wynik, o który proszono.`;

function resolveGeminiApiKey(request: NextRequest): string | null {
  const key = request.headers.get('X-Gemini-Api-Key')?.trim();
  return key || process.env.GEMINI_API_KEY?.trim() || null;
}

export async function POST(request: NextRequest) {
  const apiKey = resolveGeminiApiKey(request);
  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'Wklej swój klucz Google AI Studio w ustawieniach',
        code: 'BYOK_KEY_MISSING',
      },
      { status: 401 }
    );
  }

  let body: { message?: unknown; prompt?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Nieprawidłowe body JSON' },
      { status: 400 }
    );
  }

  // Akceptuj `message` (spójne z kreatorem) lub `prompt` jako alias.
  const raw = typeof body?.message === 'string' ? body.message : body?.prompt;
  const userMessage = typeof raw === 'string' ? raw.trim() : '';
  if (!userMessage) {
    return NextResponse.json({ error: 'Brak promptu' }, { status: 400 });
  }

  const provider = new GeminiChatProvider(apiKey, DEFAULT_GEMINI_MODEL);

  let stream: Awaited<ReturnType<typeof provider.streamChat>>['stream'];
  try {
    // streamChat woła generateContentStream EAGER (gemini-provider) - błędy klucza/modelu
    // rzucają się tutaj na await, więc łapiemy je i zwracamy czysty status zamiast 500.
    ({ stream } = await provider.streamChat({
      systemPrompt: UTILITY_SYSTEM_PROMPT,
      messages: [],
      userMessage,
      // Niska temperatura - zadania narzędziowe wymagają deterministycznego,
      // poprawnego strukturalnie wyniku (JSON/lista), nie kreatywnej narracji.
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 4096,
    }));
  } catch (err) {
    Sentry.captureException(err, { tags: { endpoint: '/api/ai/utility' } });
    return NextResponse.json(
      {
        error: 'Błąd generowania danych przez AI',
        details: err instanceof Error ? err.message : 'Nieznany błąd',
      },
      { status: 502 }
    );
  }

  const encoder = new TextEncoder();
  const sseStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.text) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'text', content: chunk.text })}\n\n`
              )
            );
          }
        }
        // Pusta metadata domyka strumień (collectSSEText ignoruje, ale spójne z /api/chat).
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'metadata' })}\n\n`)
        );
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
  });

  return new Response(sseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
