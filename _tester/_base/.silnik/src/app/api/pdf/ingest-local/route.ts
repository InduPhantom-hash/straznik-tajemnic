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

export const maxDuration = 300; // 5 min - duże podręczniki (setki stron)
export const runtime = 'nodejs';

/**
 * GET: Statystyki lokalnego namespace'u
 * ?type=rules lub ?type=adventure
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'rules' | 'adventure';

    if (!type || (type !== 'rules' && type !== 'adventure')) {
      return NextResponse.json(
        { error: 'Podaj ?type=rules lub ?type=adventure' },
        { status: 400 }
      );
    }

    const stats = await pdfIndexingService.getNamespaceStats(type);

    return NextResponse.json({
      success: true,
      ...stats,
      initialized: true,
    });
  } catch (error) {
    console.error('❌ PDF local ingest stats error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Nieznany błąd',
      },
      { status: 500 }
    );
  }
}

const MAX_PDF_BYTES = 500 * 1024 * 1024; // 500 MB (spójnie z /api/upload-pdf)
const MIN_TEXT_LENGTH = 100;

function indexingError(
  error: string,
  status: number,
  start: number,
  namespace = ''
) {
  return NextResponse.json(
    {
      success: false,
      indexed: 0,
      failed: 0,
      totalChunks: 0,
      namespace,
      durationMs: Date.now() - start,
      error,
    },
    { status }
  );
}

export async function POST(request: NextRequest) {
  const start = Date.now();
  try {
    // Klucz Gemini: BYOK (nagłówek z localStorage gracza) lub env fallback.
    // Wzorzec 1:1 z index-to-pinecone:67 - wymagany do liczenia embeddingów.
    const geminiApiKey =
      request.headers.get('X-Gemini-Api-Key') || process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
      return indexingError(
        'Brak klucza API Gemini (wymagany do generowania embeddingów)',
        401,
        start
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
        return indexingError(
          'Brak pliku PDF (pole formularza "file")',
          400,
          start
        );
      }
      if (file.type !== 'application/pdf') {
        return indexingError('Tylko pliki PDF są dozwolone', 400, start);
      }
      if (file.size > MAX_PDF_BYTES) {
        return indexingError(
          'Plik jest za duży. Maksymalny rozmiar to 500MB',
          400,
          start
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
        return indexingError(
          `Błąd parsowania PDF: ${
            parseError instanceof Error ? parseError.message : 'Nieznany błąd'
          }`,
          422,
          start,
          type === 'rules' ? 'rules' : 'adventures'
        );
      }
    }

    if (!pdfText || pdfText.length < MIN_TEXT_LENGTH) {
      return indexingError(
        `Tekst za krótki do indeksowania (${
          pdfText?.length ?? 0
        } znaków, minimum ${MIN_TEXT_LENGTH}). PDF może być skanem bez warstwy tekstowej (OCR).`,
        422,
        start,
        type === 'rules' ? 'rules' : 'adventures'
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

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ ingest-local API error:', error);
    return indexingError(
      error instanceof Error ? error.message : 'Nieznany błąd',
      500,
      start
    );
  }
}
