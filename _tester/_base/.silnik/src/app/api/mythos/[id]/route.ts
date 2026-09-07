import { NextRequest, NextResponse } from 'next/server';
import { getMythosRecord } from '@/lib/mythos/server';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 });
  }

  const entry = getMythosRecord(id);
  if (!entry) {
    return NextResponse.json({ error: 'Mythos entry not found' }, { status: 404 });
  }

  return NextResponse.json({ entry });
}
