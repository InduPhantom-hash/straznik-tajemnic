import { NextResponse } from 'next/server';
import { PINECONE_NAMESPACES } from '@/lib/vector-db/pinecone-client';
import { localVectorStore } from '@/lib/vector-db/local-vector-store';

/**
 * IND-115: Pełny Reset cleanup dla lokalnego magazynu wektorów (Zew-App-Local).
 *
 * Czyści TYLKO session-level namespaces: npcs, world-state.
 *
 * Persistent knowledge namespaces (rules, adventures) NIE są czyszczone -
 * to baza wiedzy CoC 7e + przygody ładowane przez upload PDF, nie session data.
 * Wcześniejsza wersja czyściła też rules+adventures, co powodowało data loss
 * przy każdym Pełnym Resecie (sesja 124 → sesja 141 odkrycie).
 *
 * Per-session namespaces (sessions/{id}) są czyszczone w `/api/session/cloud DELETE`
 * (per-session cleanup wywoływany przed Pełny Reset z UI).
 *
 * Wywoływany z `useFullReset.ts` (Pełny Reset z Settings).
 */

export async function DELETE() {
  try {
    // Session-level namespaces tylko. RULES + ADVENTURES to persistent
    // knowledge (fix data loss bug - patrz JSDoc na górze pliku).
    const namespaces = [
      PINECONE_NAMESPACES.NPCS,
      PINECONE_NAMESPACES.WORLD_STATE,
    ];

    const cleared: string[] = [];
    const failed: { namespace: string; error: string }[] = [];

    for (const namespace of namespaces) {
      try {
        await localVectorStore.deleteNamespace(namespace);
        cleared.push(namespace);
      } catch (error) {
        console.warn(`⚠️ Could not clear namespace "${namespace}":`, error);
        failed.push({
          namespace,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleared ${cleared.length}/${namespaces.length} lokalnych namespaces`,
      cleared,
      failed,
    });
  } catch (error) {
    console.error('❌ Local vector store clear error:', error);
    return NextResponse.json(
      {
        error: 'Failed to clear local vector store namespaces',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
