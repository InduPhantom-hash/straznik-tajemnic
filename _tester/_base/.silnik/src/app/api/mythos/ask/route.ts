import { NextRequest, NextResponse } from 'next/server';
import { searchMythos } from '@/lib/mythos/server';
import { validateMythosAskQuery } from '@/lib/mythos/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 }
    );
  }

  const validation = validateMythosAskQuery(body);
  if (!validation.isValid) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 }
    );
  }

  const { query, limit } = validation.data;
  const sources = searchMythos(query, limit);

  const answer = sources.length > 0
    ? sources.map((source) => `${source.term}: ${source.shortDefinition}`).join('\n\n')
    : null;

  return NextResponse.json({
    answer,
    sources,
    totalMatches: sources.length,
  });
}
