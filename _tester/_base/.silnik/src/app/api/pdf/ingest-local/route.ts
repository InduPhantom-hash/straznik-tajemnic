/**
 * API endpoint: PDF (FormData) → tekst → LOKALNY indeks zasad
 * Fala 2 - kreator pierwszego uruchomienia ("Strażnik Tajemnic", produkt B).
 *
 * Samodzielny, BEZ chmury (zero GCS). Gracz wgrywa własny podręcznik:
 * parse w pamięci → chunk → embedding (Gemini) → zapis do data/rag/rules.*
 * przez localVectorStore (`getWritableDataDir()` / `RAG_DATA_DIR`).
 *
 * Różni się od /api/upload-pdf (GCS-first) i /api/pdf/index-to-pinecone
 * (round-trip przez textUrl/GCS): tu plik leci od razu do pamięci serwera
 * i nigdy nie dotyka chmury - jedyne wyjście to embeddingi do Gemini.
 *
 * POST FormData { file: PDF, type?: 'rules'|'adventure' (domyślnie rules), fileName? }
 *   → { success, indexed, failed, totalChunks, namespace, durationMs }
 */

import { NextRequest, NextResponse } from 'next/server';
import { pdfIndexingService } from '@/lib/vector-db/pdf-indexing-service';
import { embeddingService } from '@/lib/embedding-service';
import { pdfParserService } from '@/lib/pdf-parser-service';
import { extractAdventureEntities } from '@/lib/pdf/adventure-extractor';
import fs from 'fs';
import path from 'path';

export const maxDuration = 300; // 5 min - duże podręczniki (setki stron)
export const runtime = 'nodejs';

const MAX_PDF_BYTES = 500 * 1024 * 1024; // 500 MB (spójnie z /api/upload-pdf)
const MIN_TEXT_LENGTH = 100;

export async function POST(request: NextRequest) {
  const start = Date.now();
  try {
    // Klucz Gemini: BYOK (nagłówek z localStorage gracza) lub env fallback.
    // Wzorzec 1:1 z index-to-pinecone:67 - wymagany do liczenia embeddingów.
    const geminiApiKey =
      request.headers.get('X-Gemini-Api-Key') || process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Brak klucza API Gemini (wymagany do generowania embeddingów)',
        },
        { status: 401 }
      );
    }

    let pdfText = '';
    let fileName = '';
    let type: 'rules' | 'adventure' = 'rules';
    let clearBefore = false;

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      pdfText = body.text;
      type = body.type === 'adventure' ? 'adventure' : 'rules';
      fileName = body.fileName || `${type}-document`;
      clearBefore = body.clearBefore === true;
    } else {
      const formData = await request.formData();
      const file = formData.get('file');

      if (!(file instanceof File)) {
        return NextResponse.json(
          { success: false, error: 'Brak pliku PDF (pole formularza "file")' },
          { status: 400 }
        );
      }
      if (file.type !== 'application/pdf') {
        return NextResponse.json(
          { success: false, error: 'Tylko pliki PDF są dozwolone' },
          { status: 400 }
        );
      }
      if (file.size > MAX_PDF_BYTES) {
        return NextResponse.json(
          {
            success: false,
            error: 'Plik jest za duży. Maksymalny rozmiar to 500MB',
          },
          { status: 400 }
        );
      }

      const rawType = formData.get('type');
      type = rawType === 'adventure' ? 'adventure' : 'rules';
      fileName =
        (typeof formData.get('fileName') === 'string'
          ? (formData.get('fileName') as string)
          : '') ||
        file.name ||
        `${type}-document`;
      clearBefore = type === 'rules';

      // Parse PDF w pamięci (pdf-parse na buforze - GCS-free).
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      try {
        const parsed = await pdfParserService.parsePDFBuffer(buffer);
        pdfText = parsed.text;
        console.log(
          `📄 PDF sparsowany lokalnie: ${parsed.pages} stron, ${pdfText.length} znaków ("${fileName}")`
        );
      } catch (parseError) {
        return NextResponse.json(
          {
            success: false,
            error: `Błąd parsowania PDF: ${
              parseError instanceof Error ? parseError.message : 'Nieznany błąd'
            }`,
          },
          { status: 422 }
        );
      }
    }

    if (!pdfText || pdfText.length < MIN_TEXT_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error: `Tekst za krótki do indeksowania (${
            pdfText?.length ?? 0
          } znaków, minimum ${MIN_TEXT_LENGTH}). PDF może być skanem bez warstwy tekstowej (OCR).`,
        },
        { status: 422 }
      );
    }

    // Embedding service na kluczu gracza; indeksowanie idzie do data/rag/ (lokalnie).
    embeddingService.initialize(geminiApiKey);

    const result = await pdfIndexingService.indexPdf({
      text: pdfText,
      type,
      fileName,
      clearBefore,
      apiKey: geminiApiKey,
    });

    if (!result.success) {
      return NextResponse.json(
        { ...result, error: result.error || 'Indeksowanie nie powiodło się' },
        { status: 500 }
      );
    }

    // Jeśli typ to 'adventure', wykonaj rozszerzoną ekstrakcję struktur przez Gemini 3.6 Flash
    let extractedAdventure = null;
    if (type === 'adventure') {
      try {
        console.log('🤖 Rozpoczynanie ekstrakcji ustrukturyzowanej przygody przez Gemini 3.6 Flash...');
        extractedAdventure = await extractAdventureEntities(pdfText, fileName, geminiApiKey);
        
        // Zapisz wyekstrahowaną strukturę lokalnie w data/adventures/
        const dataDir = path.join(process.cwd(), 'data', 'adventures');
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        const filePath = path.join(dataDir, `${extractedAdventure.adventureId}.json`);
        fs.writeFileSync(filePath, JSON.stringify(extractedAdventure, null, 2), 'utf-8');
        console.log(`💾 Zapisano ustrukturyzowane dane przygody: ${filePath}`);
      } catch (extError) {
        console.warn('⚠️ Ekstrakcja przygody przez Gemini 3.6 Flash nie powiodła się, kontynuowanie samego RAG:', extError);
      }
    }

    return NextResponse.json({
      ...result,
      extractedAdventure,
    });
  } catch (error) {
    console.error('❌ ingest-local API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Nieznany błąd',
        durationMs: Date.now() - start,
      },
      { status: 500 }
    );
  }
}

// GET /api/pdf/ingest-local?type=rules|adventure
// Zwraca statystyki lokalnego magazynu wektorów dla hooka useFirstRun
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'rules';
    const { localVectorStore } = await import('@/lib/vector-db/local-vector-store');
    const recordCount = localVectorStore.getNamespaceCount(type);

    return NextResponse.json({
      success: true,
      type,
      recordCount,
    });
  } catch (error) {
    console.error('Błąd GET ingest-local:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch rules count', recordCount: 0 },
      { status: 500 }
    );
  }
}
