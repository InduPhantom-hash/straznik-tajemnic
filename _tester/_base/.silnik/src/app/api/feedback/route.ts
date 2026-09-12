import { NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';

function sanitizeText(text: string): string {
  // Maskowanie kluczy API, tokenów i wrażliwych danych
  return text
    .replace(/(AIzaSy[a-zA-Z0-9_-]{33})/g, '[MASKED_GEMINI_KEY]')
    .replace(/(sk-[a-zA-Z0-9_-]{20,})/g, '[MASKED_API_KEY]')
    .replace(/("?(gemini|GEMINI_API_KEY|apiKey|key)"?\s*[:=]\s*)"[^"]+"/gi, '$1"[MASKED]"');
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    const timestamp = new Date().toISOString();
    const safeTimestamp = timestamp.replace(/[:.]/g, '-');

    const sanitizedReport = {
      timestamp,
      recipient: 'issue@callofchtulhu.pl',
      category: rawBody.category || 'general',
      description: rawBody.description ? sanitizeText(String(rawBody.description)) : '',
      diagnostics: rawBody.diagnostics || {},
    };

    const dataDir = join(process.cwd(), 'data', 'feedback');
    await fs.mkdir(dataDir, { recursive: true });
    const reportPath = join(dataDir, `feedback-${safeTimestamp}.json`);
    await fs.writeFile(reportPath, JSON.stringify(sanitizedReport, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      reportPath,
      message: 'Feedback saved successfully',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
