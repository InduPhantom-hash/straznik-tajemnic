import { NextRequest, NextResponse } from 'next/server';
import { cloudContextService, CloudContextChunk } from '@/lib/cloud-context-service';

/**
 * API Endpoint: /api/context/chunk
 * 
 * Zarządza chunkami kontekstu w Google Cloud Storage
 */

// POST - Zapisz chunk do GCS
export async function POST(request: NextRequest) {
    try {
        const { chunk, userId, sessionId } = await request.json();

        if (!chunk || !userId || !sessionId) {
            return NextResponse.json(
                { error: 'chunk, userId and sessionId are required' },
                { status: 400 }
            );
        }

        const url = await cloudContextService.uploadHistoryChunk(chunk);

        return NextResponse.json({
            success: true,
            url,
            chunkIndex: chunk.chunkIndex
        });

    } catch (error) {
        console.error('Error uploading chunk:', error);
        return NextResponse.json(
            { error: 'Failed to upload chunk', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}

// GET - Pobierz chunki dla sesji
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const sessionId = searchParams.get('sessionId');
        const relevant = searchParams.get('relevant') === 'true';
        const maxChunks = parseInt(searchParams.get('maxChunks') || '5');

        if (!userId || !sessionId) {
            return NextResponse.json(
                { error: 'userId and sessionId are required' },
                { status: 400 }
            );
        }

        let chunks: CloudContextChunk[];

        if (relevant) {
            // Pobierz tylko relevantne chunki (20% początek + 80% koniec)
            chunks = await cloudContextService.downloadRelevantChunks(userId, sessionId, maxChunks);
        } else {
            // Pobierz wszystkie chunki
            chunks = await cloudContextService.downloadAllChunks(userId, sessionId);
        }

        // Zbuduj kontekst do promptu
        const contextPrompt = cloudContextService.buildContextFromChunks(chunks);

        return NextResponse.json({
            success: true,
            chunks,
            totalChunks: chunks.length,
            contextPrompt
        });

    } catch (error) {
        console.error('Error fetching chunks:', error);
        return NextResponse.json(
            { error: 'Failed to fetch chunks', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}

// DELETE - Usuń chunki dla sesji
export async function DELETE(request: NextRequest) {
    try {
        const { userId, sessionId } = await request.json();

        if (!userId || !sessionId) {
            return NextResponse.json(
                { error: 'userId and sessionId are required' },
                { status: 400 }
            );
        }

        await cloudContextService.clearSessionContext(userId, sessionId);

        return NextResponse.json({
            success: true,
            message: 'Session context cleared'
        });

    } catch (error) {
        console.error('Error clearing context:', error);
        return NextResponse.json(
            { error: 'Failed to clear context', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
