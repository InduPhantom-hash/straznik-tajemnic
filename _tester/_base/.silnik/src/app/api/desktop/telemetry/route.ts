import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { getWritableDataDir } from '@/lib/paths';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { level = 'INFO', message = '', details = null, source = 'frontend' } = body;

    const timestamp = new Date().toISOString();
    const formattedDetails = details ? ` | details: ${JSON.stringify(details)}` : '';
    const logLine = `[${timestamp}] [UI:${source}] [${String(level).toUpperCase()}] ${message}${formattedDetails}\n`;

    // 1. Zapis do aktywnego pliku sesji supervisora (jeśli zdefiniowany)
    const sessionLog = process.env.ZEW_SESSION_LOG_FILE;
    if (sessionLog) {
      try {
        await appendFile(sessionLog, logLine, 'utf8');
      } catch (_) {}
    }

    // 2. Rezerwowy zapis do katalogu danych aplikacji
    const fallbackDir = path.join(getWritableDataDir(), 'logs');
    await mkdir(fallbackDir, { recursive: true });
    await appendFile(path.join(fallbackDir, 'ui-telemetry.log'), logLine, 'utf8');

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Błąd zapisu logu' },
      { status: 500 }
    );
  }
}
