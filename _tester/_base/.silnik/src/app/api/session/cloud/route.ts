import { NextRequest, NextResponse } from 'next/server';
import { googleCloudStorageService } from '@/lib/google-cloud-storage-service-fixed';
import { resolveUserId } from '@/lib/auth-user';
import { indexingService } from '@/lib/vector-db/indexing-service';

// Typy dla sesji chmurowych
interface CloudSession {
  id: string;
  name: string;
  date: string;
  character: unknown;
  messages: unknown[];
  adventureText: string;
  notes: string;
  status: 'active' | 'paused' | 'completed';
  userId: string;
  lastUpdated: string;
  version: string;
  size: number;
}

interface CloudSessionMetadata {
  userId: string;
  totalSessions: number;
  lastSync: string;
  storageUsed: number;
}

// Generowanie unikalnego ID użytkownika (na podstawie IP i user agent)
function generateUserId(request: NextRequest): string {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const combined = `${ip}-${userAgent}`;

  // Prosta funkcja hash
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `user_${Math.abs(hash)}`;
}

// POST - Zapisywanie sesji do chmury (Google Cloud Storage)
export async function POST(request: NextRequest) {
  try {
    const { sessionData, sessionId, userId } = await request.json();

    if (!sessionData) {
      return NextResponse.json(
        { error: 'Session data is required' },
        { status: 400 }
      );
    }

    const finalUserId = await resolveUserId(userId || generateUserId(request));
    const finalSessionId = sessionId || `session_${Date.now()}`;

    // Przygotowanie danych sesji
    const cloudSession: CloudSession = {
      ...sessionData,
      id: finalSessionId,
      userId: finalUserId,
      lastUpdated: new Date().toISOString(),
      version: '1.0',
      size: JSON.stringify(sessionData).length,
    };

    // Nazwa pliku w Google Cloud Storage
    const fileName = `sessions/${finalUserId}/${finalSessionId}.json`;

    // Upload do Google Cloud Storage
    const sessionJson = JSON.stringify(cloudSession, null, 2);
    const result = await googleCloudStorageService.uploadFile(
      sessionJson,
      fileName,
      {
        metadata: { contentType: 'application/json' },
        public: false,
      }
    );

    // Aktualizacja metadanych użytkownika
    await updateUserMetadata(finalUserId, sessionJson.length);

    return NextResponse.json({
      success: true,
      message: 'Session saved to cloud successfully',
      sessionId: finalSessionId,
      userId: finalUserId,
      url: result.url,
      size: result.size,
      lastUpdated: cloudSession.lastUpdated,
    });
  } catch (error) {
    console.error('Error saving session to cloud:', error);

    if (error instanceof Error) {
      if (
        error.message.includes('GOOGLE_CLOUD') ||
        error.message.includes('Storage not initialized') ||
        error.message.includes('bucket')
      ) {
        return NextResponse.json(
          {
            error: 'Google Cloud Storage configuration error',
            details:
              'Check GOOGLE_CLOUD_STORAGE_BUCKET and credentials in .env.local',
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to save session to cloud',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET - Ładowanie sesji z chmury
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const sessionId = searchParams.get('sessionId');
    const listAll = searchParams.get('listAll') === 'true';
    const test = searchParams.get('test') === 'true';

    // Test endpoint - sprawdź czy API jest dostępne
    if (test) {
      try {
        await googleCloudStorageService.initialize();
        return NextResponse.json({
          status: 'available',
          message:
            'Cloud Sessions API is configured and ready (Google Cloud Storage)',
          provider: 'google-cloud-storage',
        });
      } catch (initError) {
        return NextResponse.json(
          {
            status: 'unavailable',
            message: 'Cloud Sessions API not configured',
            error:
              initError instanceof Error ? initError.message : 'Unknown error',
          },
          { status: 503 }
        );
      }
    }

    const finalUserId = await resolveUserId(userId || generateUserId(request));

    if (listAll) {
      // Lista wszystkich sesji użytkownika
      return await listUserSessions(finalUserId);
    } else if (sessionId) {
      // Pojedyncza sesja
      return await getSingleSession(finalUserId, sessionId);
    } else {
      return NextResponse.json(
        { error: 'Either sessionId or listAll=true is required' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error loading session from cloud:', error);
    return NextResponse.json(
      {
        error: 'Failed to load session from cloud',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// DELETE - Usuwanie sesji z chmury
export async function DELETE(request: NextRequest) {
  try {
    const { sessionId, userId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const finalUserId = await resolveUserId(userId || generateUserId(request));
    const fileName = `sessions/${finalUserId}/${sessionId}.json`;

    // Usunięcie z Google Cloud Storage
    await googleCloudStorageService.deleteFile(fileName);

    // IND-115: usuń też lokalny store namespace sessions/{sessionId} (orphan fix).
    let sessionNamespaceCleared = false;
    try {
      await indexingService.deleteSession(sessionId);
      sessionNamespaceCleared = true;
    } catch (cleanupError) {
      console.warn(
        `⚠️ Could not clear local vector store namespace for session ${sessionId}:`,
        cleanupError
      );
      // Kontynuuj - delete sukces, namespace orphan acceptable fallback
    }

    // Aktualizacja metadanych
    await updateUserMetadata(finalUserId, 0);

    return NextResponse.json({
      success: true,
      message: 'Session deleted from cloud successfully',
      sessionId,
      sessionNamespaceCleared,
    });
  } catch (error) {
    console.error('Error deleting session from cloud:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete session from cloud',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Funkcje pomocnicze
async function listUserSessions(userId: string) {
  try {
    const files = await googleCloudStorageService.listFiles(
      `sessions/${userId}/`
    );

    const sessions = await Promise.all(
      files.map(async (file) => {
        try {
          const buffer = await googleCloudStorageService.downloadFile(
            file.name
          );
          const sessionData = JSON.parse(buffer.toString());
          return {
            id: sessionData.id,
            name: sessionData.name,
            date: sessionData.date,
            status: sessionData.status,
            lastUpdated: sessionData.lastUpdated,
            size: sessionData.size,
            url: file.publicUrl,
          };
        } catch (error) {
          console.error(`Error loading session ${file.name}:`, error);
          return null;
        }
      })
    );

    const validSessions = sessions.filter((session) => session !== null);

    return NextResponse.json({
      success: true,
      sessions: validSessions,
      totalCount: validSessions.length,
      userId,
    });
  } catch (error) {
    console.error('Error listing user sessions:', error);
    return NextResponse.json({
      success: true,
      sessions: [],
      totalCount: 0,
      userId,
    });
  }
}

async function getSingleSession(userId: string, sessionId: string) {
  try {
    const fileName = `sessions/${userId}/${sessionId}.json`;
    const buffer = await googleCloudStorageService.downloadFile(fileName);
    const sessionData = JSON.parse(buffer.toString());

    return NextResponse.json({
      success: true,
      session: sessionData,
      url: `gs://zew-app-storage/${fileName}`,
    });
  } catch (error) {
    console.error('Error getting single session:', error);
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }
}

async function updateUserMetadata(userId: string, additionalSize: number) {
  try {
    const metadataFile = `metadata/${userId}/user_metadata.json`;

    // Pobierz obecne metadane
    let metadata: CloudSessionMetadata = {
      userId,
      totalSessions: 0,
      lastSync: new Date().toISOString(),
      storageUsed: 0,
    };

    try {
      const buffer = await googleCloudStorageService.downloadFile(metadataFile);
      metadata = JSON.parse(buffer.toString());
    } catch {
      // Jeśli nie ma metadanych, użyj domyślnych
    }

    // Aktualizuj metadane
    metadata.lastSync = new Date().toISOString();
    metadata.storageUsed += additionalSize;
    metadata.totalSessions = Math.max(0, metadata.totalSessions);

    // Zapisz zaktualizowane metadane
    await googleCloudStorageService.uploadFile(
      JSON.stringify(metadata, null, 2),
      metadataFile,
      {
        metadata: { contentType: 'application/json' },
        public: false,
      }
    );
  } catch (error) {
    console.error('Error updating user metadata:', error);
    // Nie rzucaj błędu - metadane to tylko dodatkowa funkcjonalność
  }
}
