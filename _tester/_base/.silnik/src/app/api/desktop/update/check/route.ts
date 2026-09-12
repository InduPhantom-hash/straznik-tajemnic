import { NextResponse } from 'next/server';
import { checkForDesktopUpdate } from '@/lib/desktop/update-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (process.env.STRAZNIK_DESKTOP_UPDATE !== '1') return NextResponse.json({ message: 'Desktop updates are unavailable.' }, { status: 404 });
  try {
    return NextResponse.json(await checkForDesktopUpdate());
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
