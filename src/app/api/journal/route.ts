import { NextRequest, NextResponse } from 'next/server';
import { resolveUserId } from '@/lib/auth-user';
import { saveJournalLocally, loadJournalLocally } from '@/lib/journal-storage';

function generateUserId(request: NextRequest): string {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const combined = `${ip}-${userAgent}`;

  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `user_${Math.abs(hash)}`;
}

// POST - Zapisywanie dziennika lokalnie
export async function POST(request: NextRequest) {
  try {
    const { journalData, journalId, userId } = await request.json();

    if (!journalData) {
      return NextResponse.json(
        { error: 'Journal data is required' },
        { status: 400 }
      );
    }

    const finalUserId = await resolveUserId(userId || generateUserId(request));
    const finalJournalId = journalId || `journal_${Date.now()}`;

    const cloudJournal = {
      ...journalData,
      id: finalJournalId,
      userId: finalUserId,
      lastUpdated: new Date().toISOString(),
      version: '1.0',
      size: JSON.stringify(journalData).length,
    };

    const success = saveJournalLocally(finalUserId, finalJournalId, cloudJournal);
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to save journal locally' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Journal saved locally',
      journalId: finalJournalId,
      userId: finalUserId,
      size: cloudJournal.size,
      lastUpdated: cloudJournal.lastUpdated,
    });
  } catch (error) {
    console.error('Error saving journal:', error);
    return NextResponse.json(
      {
        error: 'Failed to save journal',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET - Ładowanie dziennika z lokalnego dysku
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const journalId = searchParams.get('journalId');
    const test = searchParams.get('test') === 'true';

    if (test) {
      return NextResponse.json({
        status: 'available',
        message: 'Journal Local API is configured and ready',
      });
    }

    const finalUserId = await resolveUserId(userId || generateUserId(request));
    const targetJournalId = journalId || 'latest_journal';

    const journal = loadJournalLocally(finalUserId, targetJournalId);

    if (!journal) {
      return NextResponse.json({
        success: true,
        journal: {
          id: targetJournalId,
          name: 'Mój Dziennik Badacza',
          date: new Date().toISOString(),
          entries: [],
          userId: finalUserId,
          lastUpdated: new Date().toISOString(),
          version: '1.0',
          size: 0,
        },
        isNew: true,
      });
    }

    return NextResponse.json({
      success: true,
      journal,
    });
  } catch (error) {
    console.error('Error loading journal:', error);
    return NextResponse.json(
      {
        error: 'Failed to load journal',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// PUT - Aktualizacja dziennika
export async function PUT(request: NextRequest) {
  return POST(request);
}

// DELETE - Usuwanie dziennika z dysku
export async function DELETE(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Journal delete requested',
  });
}

