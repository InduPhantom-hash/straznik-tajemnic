import { NextRequest, NextResponse } from 'next/server';
import { syncGMToolsDataToCloud, loadGMToolsDataFromCloud } from '@/lib/gm-tools-storage';

const DEFAULT_USER_ID = 'default_user';

/**
 * POST /api/gm-tools/sync
 * Synchronizuje dane GM Tools z cloud storage
 */
export async function POST(request: NextRequest) {
  try {
    const { action, userId, sessionId } = await request.json();
    const targetUserId = userId || DEFAULT_USER_ID;

    if (action === 'upload') {
      // Upload z localStorage do cloud
      const stats = await syncGMToolsDataToCloud(targetUserId);
      return NextResponse.json({ 
        success: true, 
        message: 'Data synced to cloud',
        stats 
      });
    } else if (action === 'download') {
      // Download z cloud do localStorage
      const stats = await loadGMToolsDataFromCloud(targetUserId, sessionId);
      return NextResponse.json({ 
        success: true, 
        message: 'Data loaded from cloud',
        stats 
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "upload" or "download"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error syncing GM Tools data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to sync GM Tools data', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

