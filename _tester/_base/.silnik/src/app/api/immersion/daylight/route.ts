import { NextRequest, NextResponse } from 'next/server';
import { getDaylightAndMoon } from '@/lib/immersion/astronomy-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || '1925-05-12';
    const latStr = searchParams.get('lat') || '42.3601';
    const lngStr = searchParams.get('lng') || '-71.0589';

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: 'Invalid parameters. Format must be YYYY-MM-DD for date, lat and lng must be numeric.' }, { status: 400 });
    }

    const result = await getDaylightAndMoon(date, lat, lng);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Daylight API Route failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve daylight data.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
