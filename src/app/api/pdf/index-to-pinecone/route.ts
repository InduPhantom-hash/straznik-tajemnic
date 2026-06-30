/**
 * API endpoint: PDF → lokalny magazyn wektorów (Zew-App-Local)
 *
 * POST: Indeksuje tekst PDF do lokalnego store (rules lub adventures namespace)
 * GET:  Zwraca statystyki namespace'u (ile wektorów)
 *
 * Pipeline:
 * 1. Pobierz tekst (bezpośrednio z body.text LUB pobierz PDF z GCS + parse on-demand)
 * 2. Chunk tekstu na segmenty ~2000 znaków z 200 overlap
 * 3. Generuj embeddingi przez Gemini (jeden klucz z Google AI Studio)
 * 4. Upsert do lokalnego store data/rag/{namespace}.json (rules / adventures)
 */

import { NextRequest, NextResponse } from 'next/server';
import { pdfIndexingService } from '@/lib/vector-db/pdf-indexing-service';
import { embeddingService } from '@/lib/embedding-service';
import { googleCloudStorageService } from '@/lib/google-cloud-storage-service-fixed';
import { pdfParserService } from '@/lib/pdf-parser-service';

/**
 * IND-60: Wyciąga fileName PDF z placeholder textUrl.
 * textUrl format z parse:86 = `https://storage.googleapis.com/{bucket}/{path}.txt`
 * (OPT-12: plik .txt NIE istnieje w GCS, ale PDF .pdf istnieje pod tą samą ścieżką).
 * Zwraca fileName w GCS z .pdf extension, lub null jeśli URL nie pasuje do wzorca.
 */
function extractPdfFileName(textUrl: string): string | null {
  try {
    const url = new URL(textUrl);
    if (!url.hostname.includes('storage.googleapis.com')) return null;
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    const fileNameTxt = parts.slice(1).join('/'); // skip bucket prefix
    return fileNameTxt.replace(/\.txt$/i, '.pdf');
  } catch {
    return null;
  }
}

export const maxDuration = 300; // 5 minut - indeksowanie dużych PDFów może trwać
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, textUrl, type, fileName, clearBefore } = body;

    // Walidacja
    if (!type || (type !== 'rules' && type !== 'adventure')) {
      return NextResponse.json(
        { error: 'Nieprawidłowy typ. Musi być "rules" lub "adventure"' },
        { status: 400 }
      );
    }

    if (!text && !textUrl) {
      return NextResponse.json(
        {
          error:
            'Brak tekstu. Podaj "text" lub "textUrl" (URL do pliku tekstowego w GCS)',
        },
        { status: 400 }
      );
    }

    // Klucz Gemini (header BYOK lub env) - wymagany do embeddingów.
    const geminiApiKey =
      request.headers.get('X-Gemini-Api-Key') || process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
      return NextResponse.json(
        {
          error: 'Brak klucza API Gemini (wymagany do generowania embeddingów)',
        },
        { status: 401 }
      );
    }

    // Inicjalizuj embedding service. Indeksowanie idzie do lokalnego store (data/rag/),
    // bez Pinecone - wszystko na jednym kluczu Gemini.
    embeddingService.initialize(geminiApiKey);

    // Pobierz tekst (bezpośrednio lub z GCS)
    let pdfText = text;

    if (!pdfText && textUrl) {
      // IND-60: textUrl to placeholder URL pliku .txt który NIE istnieje w GCS (OPT-12
      // w pdf/parse:85). Faktyczny PDF jest pod tą samą ścieżką z .pdf - pobierz
      // buffer i parse on-demand zamiast wołać ghost endpoint /api/pdf/content.
      const pdfFileName = extractPdfFileName(textUrl);
      if (!pdfFileName) {
        return NextResponse.json(
          {
            error: `Nieprawidłowy textUrl (oczekiwane GCS https URL .txt): ${textUrl}`,
          },
          { status: 400 }
        );
      }

      console.log(`📥 Downloading PDF from GCS: ${pdfFileName}`);
      let pdfBuffer: Buffer;
      try {
        pdfBuffer = await googleCloudStorageService.downloadFile(pdfFileName);
      } catch (downloadError) {
        return NextResponse.json(
          {
            error: `Nie udało się pobrać PDF z GCS: ${
              downloadError instanceof Error
                ? downloadError.message
                : 'Unknown error'
            }`,
          },
          { status: 500 }
        );
      }

      try {
        const parsed = await pdfParserService.parsePDFBuffer(pdfBuffer);
        pdfText = parsed.text;
        console.log(
          `✅ PDF parsed on-demand: ${parsed.pages} pages, ${pdfText.length} chars`
        );
      } catch (parseError) {
        return NextResponse.json(
          {
            error: `Błąd parsowania PDF: ${
              parseError instanceof Error ? parseError.message : 'Unknown error'
            }`,
          },
          { status: 500 }
        );
      }
    }

    if (!pdfText || pdfText.length < 100) {
      return NextResponse.json(
        {
          error: `Tekst za krótki do indeksowania (${pdfText?.length ?? 0} znaków, minimum 100)`,
        },
        { status: 400 }
      );
    }

    console.log(
      `📄 Starting PDF indexing: "${fileName || type}" (${pdfText.length} chars) → ${type}`
    );

    // Indeksuj
    // IND-66 C7: default `clearBefore: false` (less destructive). Re-upload tej samej
    // książki (rules) wymaga explicit `clearBefore: true` w body. Adventures dodawane
    // do namespace, NIE niszczą poprzednich przygód.
    const result = await pdfIndexingService.indexPdf({
      text: pdfText,
      type,
      fileName: fileName || `${type}-document`,
      clearBefore: clearBefore === true,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          ...result,
          error: result.error || 'Indeksowanie nie powiodło się',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ PDF indexing API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Nieznany błąd',
      },
      { status: 500 }
    );
  }
}

/**
 * GET: Statystyki namespace'u
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
    console.error('❌ PDF index stats error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Nieznany błąd',
      },
      { status: 500 }
    );
  }
}
