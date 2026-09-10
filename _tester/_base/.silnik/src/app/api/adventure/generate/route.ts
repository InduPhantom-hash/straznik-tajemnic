import { NextResponse } from 'next/server';
import {
  dramatronEngine,
  dramatronToAdventureContext,
  dramatronToInvestigatorDossier,
  dramatronToRAGDocuments,
  maskDramatronForPlayer,
} from '@/lib/adventure-generator';
import { indexTexts } from '@/lib/vector-db/indexing-service';
import { localVectorStore } from '@/lib/vector-db/local-vector-store';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      theme,
      era,
      exactYear,
      location,
      country,
      tone,
      mythosEntity,
      apiKey,
      locale = 'pl',
      forPlayer = false,
    } = body;

    const dramatron = await dramatronEngine.generateAI({
      theme,
      era,
      exactYear,
      location,
      country,
      tone,
      mythosEntity,
      apiKey,
      locale,
    });

    const safeDramatron = forPlayer ? maskDramatronForPlayer(dramatron) : dramatron;
    const adventure = dramatronToAdventureContext(safeDramatron, forPlayer);
    const dossier = dramatronToInvestigatorDossier(safeDramatron, forPlayer);

    if (localVectorStore.initialized) {
      try {
        const ragDocs = dramatronToRAGDocuments(safeDramatron);
        await indexTexts(ragDocs, `adventures/${adventure.id}`);
      } catch (ragError) {
        console.warn('Ostrzeżenie: Indeksowanie RAG dla Dramatrona pominięte:', ragError);
      }
    }

    return NextResponse.json({
      success: true,
      adventure,
      dossier,
      dramatron: safeDramatron,
    });
  } catch (error) {
    console.error('Błąd endpointu /api/adventure/generate:', error);
    const message = error instanceof Error ? error.message : 'Wewnętrzny błąd serwera';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
