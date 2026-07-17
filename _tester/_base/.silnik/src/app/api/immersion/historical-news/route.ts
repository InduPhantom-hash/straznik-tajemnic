import { NextRequest, NextResponse } from 'next/server';
import { fetchHistoricalNews } from '@/lib/immersion/news-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || '1925-05-12';

    // Simple regex check for YYYY-MM-DD format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Invalid date parameter. Format must be YYYY-MM-DD.' }, { status: 400 });
    }

    const result = await fetchHistoricalNews(date);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Historical News API Route failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch historical news.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
