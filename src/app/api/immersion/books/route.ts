import { NextRequest, NextResponse } from 'next/server';
import { fetchHistoricalBooks } from '@/lib/immersion/books-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || 'magic';
    const maxYearStr = searchParams.get('maxYear') || '1925';

    const maxYear = parseInt(maxYearStr);

    if (!query.trim() || isNaN(maxYear)) {
      return NextResponse.json({ error: 'Invalid parameters. q is required and maxYear must be numeric.' }, { status: 400 });
    }

    const result = await fetchHistoricalBooks(query, maxYear);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Books API Route failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve book resources.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
