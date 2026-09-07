import { NextResponse } from 'next/server';
import { getMythosIndex } from '@/lib/mythos/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const entries = getMythosIndex();
  return NextResponse.json({
    entries,
    total: entries.length,
    status: entries.length > 0 ? 'ready' : 'empty',
  });
}
