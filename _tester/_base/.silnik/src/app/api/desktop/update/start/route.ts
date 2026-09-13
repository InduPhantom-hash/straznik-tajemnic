import { NextResponse } from 'next/server';
import { isAiGenerationActive } from '@/lib/desktop/generation-state';
import { checkForDesktopUpdate, startDetachedUpdate } from '@/lib/desktop/update-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (process.env.STRAZNIK_DESKTOP_UPDATE !== '1') return NextResponse.json({ message: 'Desktop updates are unavailable.' }, { status: 404 });
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ message: 'Update request rejected.' }, { status: 403 });
  if (isAiGenerationActive()) return NextResponse.json({ message: 'AI response generation is active.' }, { status: 409 });
  if (process.env.ZEW_DESKTOP_SELF_UPDATE !== '1') return NextResponse.json({ message: 'Repository self-modification is disabled.' }, { status: 409 });
  try {
    const check = await checkForDesktopUpdate();
    if (!check.available || !check.manifest) return NextResponse.json({ message: 'No stable update is available.' }, { status: 409 });
    const pid = await startDetachedUpdate(check.manifest);
    return NextResponse.json({ accepted: true, pid, version: check.manifest.version }, { status: 202 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
