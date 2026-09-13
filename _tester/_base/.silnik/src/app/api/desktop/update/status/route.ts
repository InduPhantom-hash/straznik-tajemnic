import { NextResponse } from 'next/server';
import { readUpdateStatus } from '@/lib/desktop/update-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (process.env.STRAZNIK_DESKTOP_UPDATE !== '1') return NextResponse.json({ message: 'Desktop updates are unavailable.' }, { status: 404 });
  return NextResponse.json(await readUpdateStatus());
}
