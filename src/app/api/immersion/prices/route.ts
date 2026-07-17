import { NextRequest, NextResponse } from 'next/server';
import { convertUSD } from '@/lib/immersion/pricing-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const amountStr = searchParams.get('amount') || '10';
    const originalYearStr = searchParams.get('originalYear') || '2026';
    const targetYearStr = searchParams.get('targetYear') || '1920';

    const amount = parseFloat(amountStr);
    const originalYear = parseInt(originalYearStr);
    const targetYear = parseInt(targetYearStr);

    if (isNaN(amount) || isNaN(originalYear) || isNaN(targetYear)) {
      return NextResponse.json({ error: 'Invalid numeric parameters provided.' }, { status: 400 });
    }

    const result = await convertUSD(amount, originalYear, targetYear);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Prices API Route failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to process price conversion.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
