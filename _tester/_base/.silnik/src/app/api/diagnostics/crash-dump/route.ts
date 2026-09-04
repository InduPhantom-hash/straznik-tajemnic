import { NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';

interface CrashDumpPayload {
  error: string;
  stack?: string;
  digest?: string;
  url?: string;
  timestamp?: string;
  userActions?: string[];
  locale?: string;
}

function sanitizeText(text: string): string {
  // Maskowanie kluczy API, tokenow i prywatnych danych
  return text
    .replace(/(AIzaSy[a-zA-Z0-9_-]{33})/g, '[MASKED_GEMINI_KEY]')
    .replace(/(sk-[a-zA-Z0-9_-]{20,})/g, '[MASKED_API_KEY]')
    .replace(/("?(gemini|GEMINI_API_KEY|apiKey|key)"?\s*[:=]\s*)"[^"]+"/gi, '$1"[MASKED]"');
}

export async function POST(request: Request) {
  try {
    const rawBody: CrashDumpPayload = await request.json();
    const timestamp = rawBody.timestamp || new Date().toISOString();
    const safeTimestamp = timestamp.replace(/[:.]/g, '-');

    const sanitizedReport = {
      timestamp,
      error: sanitizeText(rawBody.error || 'Unknown Error'),
      digest: rawBody.digest || null,
      stack: rawBody.stack ? sanitizeText(rawBody.stack) : null,
      url: rawBody.url || null,
      locale: rawBody.locale || 'unknown',
      userActions: rawBody.userActions || [],
      platform: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };

    // 1. Zapis do katalogu danych aplikacji: data/crash-reports/
    const dataDir = join(process.cwd(), 'data', 'crash-reports');
    await fs.mkdir(dataDir, { recursive: true });
    const reportPath = join(dataDir, `crash-${safeTimestamp}.json`);
    await fs.writeFile(reportPath, JSON.stringify(sanitizedReport, null, 2), 'utf-8');

    // 2. Jeśli jesteśmy na maszynie gracza (macOS desktop), zrzucamy świeży plik na Biurko
    try {
      const desktopPath = join(os.homedir(), 'Desktop', 'straznik-crash.json');
      await fs.writeFile(desktopPath, JSON.stringify(sanitizedReport, null, 2), 'utf-8');
    } catch {
      // Ignoruj brak dostępu do Pulpitu w środowiskach kontenerowych / CI
    }

    return NextResponse.json({
      success: true,
      reportPath,
      message: 'Crash dump saved successfully',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
