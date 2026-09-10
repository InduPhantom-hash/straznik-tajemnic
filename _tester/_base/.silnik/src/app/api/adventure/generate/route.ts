import { NextResponse } from 'next/server';
import {
  dramatronEngine,
  dramatronToAdventureContext,
  dramatronToInvestigatorDossier,
  dramatronToRAGDocuments,
  maskDramatronForPlayer,
} from '@/lib/adventure-generator';
import type { DramatronEra, DramatronTone } from '@/lib/adventure-generator/types';
import { indexTexts } from '@/lib/vector-db/indexing-service';
import { localVectorStore } from '@/lib/vector-db/local-vector-store';

const ALLOWED_ERAS: readonly DramatronEra[] = ['classic', 'gaslight', 'noir', 'prl', 'modern'];
const ALLOWED_TONES: readonly DramatronTone[] = ['purist', 'pulp', 'noir'];

export async function POST(req: Request) {
  try {
    const rawBody = await req.json().catch(() => null);
    if (!rawBody || typeof rawBody !== 'object') {
      return NextResponse.json(
        { error: 'Nieprawidłowe ciało żądania (oczekiwano obiektu JSON).' },
        { status: 400 }
      );
    }

    const body = rawBody as Record<string, unknown>;

    const theme = typeof body.theme === 'string' ? body.theme.slice(0, 500) : undefined;
    const era = (typeof body.era === 'string' && (ALLOWED_ERAS as readonly string[]).includes(body.era))
      ? (body.era as DramatronEra)
      : undefined;
    const exactYear = typeof body.exactYear === 'string' ? body.exactYear.slice(0, 20) : undefined;
    const location = typeof body.location === 'string' ? body.location.slice(0, 100) : undefined;
    const country = typeof body.country === 'string' ? body.country.slice(0, 100) : undefined;
    const tone = (typeof body.tone === 'string' && (ALLOWED_TONES as readonly string[]).includes(body.tone))
      ? (body.tone as DramatronTone)
      : undefined;
    const mythosEntity = typeof body.mythosEntity === 'string' ? body.mythosEntity.slice(0, 100) : undefined;
    const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : undefined;
    const locale = body.locale === 'en' ? 'en' : 'pl';
    const forPlayer = Boolean(body.forPlayer);

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
      source: safeDramatron.source || 'ai',
    });
  } catch (error) {
    console.error('Błąd endpointu /api/adventure/generate:', error);
    const message = error instanceof Error ? error.message : 'Wewnętrzny błąd serwera';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
