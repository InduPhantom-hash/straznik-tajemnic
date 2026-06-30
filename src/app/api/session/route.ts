import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getWritableDataDir } from '@/lib/paths';

const SESSIONS_DIR = path.join(getWritableDataDir(), 'sessions');

// IND-95: Vercel ma READ-ONLY filesystem (EROFS). Endpoint `/api/session`
// używa lokalnego FS dla persistencji sesji w dev - na produkcji silently
// broken (try-catch tłumi EROFS → 500 lub graceful fallback).
// Faktyczna persistencja sesji na produkcji idzie przez `/api/session/cloud`
// (GCS). Endpoint zostaje aktywny dla local dev (caller: `session-list.tsx:42`
// + `useFullReset.ts:70`).
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Ensure sessions directory exists (tylko w dev - na Vercel rzuca EROFS)
if (!IS_PRODUCTION) {
  try {
    if (!fs.existsSync(SESSIONS_DIR)) {
      fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    }
  } catch (error) {
    console.warn(
      '⚠️ Cannot create SESSIONS_DIR (filesystem may be read-only):',
      error
    );
  }
}

/**
 * Sanityzacja ID sesji - zapobiega atakom path traversal
 * Zezwala tylko na znaki alfanumeryczne, myślniki i podkreślenia
 */
function sanitizeSessionId(sessionId: string): string {
  if (!sessionId || typeof sessionId !== 'string') {
    throw new Error('Nieprawidłowy ID sesji');
  }
  const trimmed = sessionId.trim();
  if (!/^[a-zA-Z0-9-_]+$/.test(trimmed)) {
    throw new Error('ID sesji zawiera niedozwolone znaki');
  }
  if (trimmed.length > 100) {
    throw new Error('ID sesji jest zbyt długi');
  }
  return trimmed;
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, sessionData } = await request.json();

    if (!sessionId || !sessionData) {
      return NextResponse.json(
        { error: 'Session ID and session data are required' },
        { status: 400 }
      );
    }

    // IND-95: produkcja READ-ONLY FS - graceful fallback (caller powinien
    // używać /api/session/cloud dla persistencji)
    if (IS_PRODUCTION) {
      console.warn(
        '⚠️ /api/session POST disabled in production (READ-ONLY FS). Use /api/session/cloud instead.'
      );
      return NextResponse.json(
        {
          success: false,
          message:
            'Local session save disabled in production. Use /api/session/cloud for persistence.',
        },
        { status: 503 }
      );
    }

    // BEZPIECZEŃSTWO: Sanityzuj sessionId przed użyciem
    const safeSessionId = sanitizeSessionId(sessionId);
    const sessionFile = path.join(SESSIONS_DIR, `${safeSessionId}.json`);
    const sessionToSave = {
      ...sessionData,
      lastUpdated: new Date().toISOString(),
      version: '1.0',
    };

    fs.writeFileSync(sessionFile, JSON.stringify(sessionToSave, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Session saved successfully',
      sessionId,
    });
  } catch (error) {
    console.error('Error saving session:', error);
    return NextResponse.json(
      { error: 'Failed to save session' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    // IND-95: produkcja READ-ONLY FS - graceful return pustej listy
    if (IS_PRODUCTION) {
      console.warn(
        '⚠️ /api/session GET disabled in production (READ-ONLY FS). Use /api/session/cloud instead.'
      );
      if (!sessionId) {
        return NextResponse.json({ sessions: [] });
      }
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (!sessionId) {
      // Return list of all sessions
      const files = fs.readdirSync(SESSIONS_DIR);
      const sessions = files
        .filter((file) => file.endsWith('.json'))
        .map((file) => {
          // file z fs.readdirSync(SESSIONS_DIR) - filesystem enumeration, nie user input.
          // User-controlled paths sanityzowane przez sanitizeSessionId() (lin 16).
          const sessionData = JSON.parse(
            fs.readFileSync(path.join(SESSIONS_DIR, file), 'utf8') // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
          );
          return {
            sessionId: file.replace('.json', ''),
            sessionData: {
              sessionName:
                sessionData.sessionName || sessionData.name || 'Bez nazwy',
              description: sessionData.description || '',
              character: sessionData.character || null,
              messages: sessionData.messages || [],
              adventureText: sessionData.adventureText || '',
              timestamp:
                sessionData.lastUpdated ||
                sessionData.timestamp ||
                new Date().toISOString(),
            },
          };
        })
        .sort(
          (a, b) =>
            new Date(a.sessionData.timestamp).getTime() -
            new Date(b.sessionData.timestamp).getTime()
        );

      return NextResponse.json({ sessions });
    }

    // BEZPIECZEŃSTWO: Sanityzuj sessionId przed użyciem
    const safeSessionId = sanitizeSessionId(sessionId);
    const sessionFile = path.join(SESSIONS_DIR, `${safeSessionId}.json`);

    if (!fs.existsSync(sessionFile)) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
    return NextResponse.json({ session: sessionData });
  } catch (error) {
    console.error('Error loading session:', error);
    return NextResponse.json(
      { error: 'Failed to load session' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    // IND-95: produkcja READ-ONLY FS - nic do usunięcia, zwróć success
    // (Pełny Reset wciąż działa bo lokalne sesje na produkcji nie istnieją)
    if (IS_PRODUCTION) {
      console.warn(
        '⚠️ /api/session DELETE disabled in production (READ-ONLY FS). No local sessions to clear.'
      );
      return NextResponse.json({
        success: true,
        message: 'No local sessions on production (READ-ONLY FS)',
      });
    }

    if (!sessionId) {
      // Usuń WSZYSTKIE sesje
      console.log('🗑️ DELETE /api/session - Clearing ALL local sessions');
      const files = fs.readdirSync(SESSIONS_DIR);
      files.forEach((file) => {
        if (file.endsWith('.json')) {
          // file z fs.readdirSync(SESSIONS_DIR) - filesystem enumeration, nie user input.
          fs.unlinkSync(path.join(SESSIONS_DIR, file)); // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
        }
      });

      return NextResponse.json({
        success: true,
        message: 'All local sessions deleted successfully',
      });
    }

    // BEZPIECZEŃSTWO: Sanityzuj sessionId przed użyciem
    const safeSessionId = sanitizeSessionId(sessionId);
    const sessionFile = path.join(SESSIONS_DIR, `${safeSessionId}.json`);

    if (!fs.existsSync(sessionFile)) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    fs.unlinkSync(sessionFile);
    return NextResponse.json({
      success: true,
      message: 'Session deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}
