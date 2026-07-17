import { NextRequest, NextResponse } from 'next/server';
import { generateNPCName } from '@/lib/immersion/names-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const usage = (searchParams.get('usage') || 'eng') as 'eng' | 'ita' | 'iri' | 'ger';
    const gender = (searchParams.get('gender') || 'm') as 'm' | 'f';

    if (!['eng', 'ita', 'iri', 'ger'].includes(usage) || !['m', 'f'].includes(gender)) {
      return NextResponse.json({ error: 'Invalid parameters. usage must be eng|ita|iri|ger, gender must be m|f.' }, { status: 400 });
    }

    const result = await generateNPCName(usage, gender);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('NPC Identity API Route failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate NPC identity.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
