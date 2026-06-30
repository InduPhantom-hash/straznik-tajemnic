import { NextRequest, NextResponse } from 'next/server';
import { timeManager } from '@/lib/time-manager';
import { localVectorStore } from '@/lib/vector-db/local-vector-store';
import { logApiEvent, generateTraceId, startTimer } from '@/lib/telemetry';
import { runChatPipeline } from './_helpers/run-chat-pipeline';

// Zew-App-Local: RAG na lokalnym magazynie wektorów (data/rag/), bez Pinecone.
// Init tworzy katalog danych przy cold start (idempotentne, nie wymaga klucza).
localVectorStore.initialize();

export async function POST(request: NextRequest) {
  const traceId = request.headers.get('x-trace-id') ?? generateTraceId();
  const timer = startTimer();
  console.log('🚀 POST /api/chat received', { traceId });

  try {
    const body = await request.json();

    if (!body?.message)
      return NextResponse.json(
        { error: 'Wiadomość jest wymagana' },
        { status: 400 }
      );

    // Synchronizuj czas gry z klienta
    if (body.gameTime) {
      timeManager.import(body.gameTime);
    }

    return await runChatPipeline({ request, body, traceId, timer });
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.stack || error.message : String(error);
    // IND-67: drop fs.appendFileSync('./src/api-debug.log') - Vercel READ-ONLY FS.
    // console.error → Vercel Logs auto-collect; logApiEvent niżej dodaje Sentry breadcrumb.
    console.error('❌ Błąd API chat:', errorMsg);

    // Telemetria błędu - nie fire-and-forget, żeby błąd zdążył się zapisać
    await logApiEvent({
      traceId,
      endpoint: '/api/chat',
      status: 500,
      durationMs: timer.elapsed(),
      result: 'error',
      errorCode:
        error instanceof Error ? error.constructor.name : 'UnknownError',
      errorMsg: error instanceof Error ? error.message : String(error),
    }).catch(() => {});

    return NextResponse.json(
      {
        error: 'Błąd serwera',
        details: error instanceof Error ? error.message : 'Nieznany błąd',
      },
      { status: 500 }
    );
  }
}
