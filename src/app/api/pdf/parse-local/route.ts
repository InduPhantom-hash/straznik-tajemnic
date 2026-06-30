/**
 * API endpoint: PDF przygody (FormData) → Gemini File API → pdf-memory.
 * Wersja publiczna „Strażnik Tajemnic AI" - upload przygody BEZ Google Cloud Storage.
 *
 * Odpowiednik /api/pdf/parse (GCS-first) dla trybu publicznego: gracz wgrywa
 * własny scenariusz PDF, plik parsowany w pamięci serwera → upload natywnego PDF
 * do Gemini File API → zapis adventureGeminiFileUri w pdf-memory (gameplay
 * attachuje plik przez buildPdfStrategy). Zero chmury - jedyne wyjście to
 * Gemini File API (na kluczu gracza). Wzorzec łączy ingest-local (FormData +
 * parse w pamięci + BYOK) i pdf/parse (Gemini File API + pdf-memory).
 *
 * POST FormData { file: PDF, fileName? } + nagłówek X-Gemini-Api-Key
 *   → { success, geminiFileUri, fileName }
 */

import { NextRequest, NextResponse } from 'next/server';
import { pdfParserService } from '@/lib/pdf-parser-service';
import {
  uploadNativePDFToGemini,
  uploadPDFTextToGemini,
} from '@/lib/gemini-file-service';

export const maxDuration = 300; // 5 min - duże PDFy przygód
export const runtime = 'nodejs';

const MAX_PDF_BYTES = 500 * 1024 * 1024; // 500 MB (spójnie z /api/pdf/ingest-local)

export async function POST(request: NextRequest) {
  try {
    // Klucz BYOK (nagłówek z localStorage gracza) lub env fallback - wymagany do
    // uploadu pliku do Gemini File API. Wzorzec 1:1 z ingest-local:33 / tts/gemini:207.
    const apiKey =
      request.headers.get('X-Gemini-Api-Key')?.trim() ||
      process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Wklej swój klucz Google AI Studio w ustawieniach',
          code: 'BYOK_KEY_MISSING',
        },
        { status: 401 }
      );
    }

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

    const fileNameRaw = formData.get('fileName');
    const displayFileName =
      (typeof fileNameRaw === 'string' && fileNameRaw) ||
      file.name ||
      'adventure.pdf';

    // Parse PDF w pamięci (pdf-parse na buforze - GCS-free). Tekst używany tylko
    // jako fallback gdy natywny upload PDF do Gemini się nie uda.
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let parsedText = '';
    try {
      const parsed = await pdfParserService.parsePDFBuffer(buffer);
      parsedText = parsed.text;
      console.log(
        `📄 PDF przygody sparsowany lokalnie: ${parsed.pages} stron, ${parsedText.length} znaków ("${displayFileName}")`
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

    // Upload natywnego PDF do Gemini File API (OCR + tabele + layout). Fallback:
    // upload sparsowanego tekstu. Oba na kluczu gracza. Wzorzec z pdf/parse:80-105.
    let geminiFileUri: string | undefined;
    let geminiMimeType = 'application/pdf';
    try {
      geminiFileUri = await uploadNativePDFToGemini(
        buffer,
        displayFileName,
        apiKey
      );
    } catch (nativeError) {
      console.warn(
        '⚠️ Native PDF upload nieudany, fallback na tekst:',
        nativeError
      );
      if (parsedText && parsedText.length > 0) {
        try {
          geminiFileUri = await uploadPDFTextToGemini(
            parsedText,
            displayFileName,
            apiKey
          );
          geminiMimeType = 'text/plain';
        } catch (textError) {
          console.error('❌ Text upload też nieudany:', textError);
        }
      }
    }

    if (!geminiFileUri) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Nie udało się wgrać PDF do Gemini File API. Sprawdź klucz API oraz limity.',
        },
        { status: 502 }
      );
    }

    // Zapis adventureGeminiFileUri do pdf-memory - gameplay attachuje plik przez
    // buildPdfStrategy. Mirror pdf/parse:110-127. Best-effort: błąd nie blokuje
    // (geminiFileUri trafia też do rekordu CustomAdventure po stronie hooka).
    try {
      await fetch(`${request.nextUrl.origin}/api/pdf-memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'adventure',
          geminiFileUri,
          geminiMimeType,
          filename: displayFileName,
        }),
      });
    } catch (memoryError) {
      console.warn('⚠️ Nie udało się zapisać do pdf-memory:', memoryError);
    }

    return NextResponse.json({
      success: true,
      geminiFileUri,
      // mimeType faktycznie wgranego pliku (application/pdf dla natywnego uploadu,
      // text/plain dla fallbacku tekstowego). Konsument (analyze) MUSI go użyć w
      // fileData.mimeType - hardcoded text/plain dla PDF = mismatch → Gemini 500.
      geminiMimeType,
      fileName: displayFileName,
    });
  } catch (error) {
    console.error('❌ parse-local API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Nieznany błąd',
      },
      { status: 500 }
    );
  }
}
