import { NextRequest, NextResponse } from 'next/server';
import { NPC } from '@/lib/types';
import {
  saveNPCsToCloud,
  loadNPCsFromCloud,
  deleteNPCsFromCloud,
} from '@/lib/gm-tools-storage';

const DEFAULT_USER_ID = 'default_user';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || DEFAULT_USER_ID;

    try {
      const npcs = await loadNPCsFromCloud(userId);
      console.log(`✅ NPCs loaded from cloud for user ${userId}`);
      return NextResponse.json({ success: true, npcs });
    } catch (error) {
      console.log(
        `⚠️ No NPCs found in cloud for user ${userId}, trying localStorage fallback`
      );

      // Fallback do localStorage jeśli cloud storage nie działa
      return NextResponse.json({
        success: true,
        npcs: [],
        message: 'Use localStorage.getItem("gm_npcs") on client side',
        storageType: 'localStorage',
      });
    }
  } catch (error) {
    console.error('Error fetching NPCs:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch NPCs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { npcs, userId: requestUserId } = await request.json();
    const userId = requestUserId || DEFAULT_USER_ID;

    if (!Array.isArray(npcs)) {
      return NextResponse.json(
        { error: 'Invalid NPC data format' },
        { status: 400 }
      );
    }

    try {
      await saveNPCsToCloud(npcs, userId);
      console.log(`✅ NPCs saved to cloud for user ${userId}`);
      return NextResponse.json({
        success: true,
        message: 'NPCs saved successfully to cloud',
      });
    } catch (error) {
      console.error('Error saving NPCs to cloud:', error);
      // Fallback - zwróć informację, że należy zapisać lokalnie
      return NextResponse.json({
        success: true,
        message:
          'Cloud storage unavailable. Save to localStorage: localStorage.setItem("gm_npcs", JSON.stringify(npcs))',
        storageType: 'localStorage',
      });
    }
  } catch (error) {
    console.error('Error saving NPCs:', error);
    return NextResponse.json(
      {
        error: 'Failed to save NPCs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || DEFAULT_USER_ID;

    console.log(`🗑️ DELETE /api/npc/list - Clearing NPCs for user ${userId}`);

    // IND-105: faktycznie usuń plik z GCS (idempotent — 404 OK).
    // Wcześniej był to stub zwracający success bez side effect, przez co
    // Pełny Reset NPCów cloud-side był BROKEN od initial commit `ecb7555`.
    await deleteNPCsFromCloud(userId);

    return NextResponse.json({
      success: true,
      message: 'NPC list cleared from cloud storage',
      npcsCleared: true,
    });
  } catch (error) {
    console.error('Error clearing NPCs:', error);
    return NextResponse.json(
      {
        error: 'Failed to clear NPCs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
