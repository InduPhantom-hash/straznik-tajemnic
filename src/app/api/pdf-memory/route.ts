import { NextRequest, NextResponse } from 'next/server';
import { googleCloudStorageService } from '@/lib/google-cloud-storage-service-fixed';

// Pamięć aplikacji - w produkcji użyj Redis lub bazy danych
let pdfMemory: {
  rulesUrl?: string;
  rulesTextUrl?: string;
  rulesGeminiFileUri?: string; // File URI w Gemini API (PDF)
  rulesGeminiMimeType?: string; // MIME type pliku w Gemini (application/pdf lub text/plain)
  rulesTextGeminiFileUri?: string; // File URI w Gemini API (tekst ekstraktowany)
  rulesFileName?: string; // Nazwa pliku
  adventureUrl?: string;
  adventureTextUrl?: string;
  adventureGeminiFileUri?: string; // File URI w Gemini API (PDF)
  adventureGeminiMimeType?: string; // MIME type pliku w Gemini
  adventureTextGeminiFileUri?: string; // File URI w Gemini API (tekst ekstraktowany)
  adventureFileName?: string; // Nazwa pliku
  lastUpdated?: string;
} = {};

export async function GET() {
  return NextResponse.json({
    success: true,
    memory: pdfMemory,
  });
}

export async function POST(request: NextRequest) {
  try {
    const {
      type,
      url,
      textUrl,
      geminiFileUri,
      geminiMimeType,
      textGeminiFileUri,
      filename,
    } = await request.json();

    if (!type) {
      return NextResponse.json(
        { error: 'Brak wymaganych pól: type' },
        { status: 400 }
      );
    }

    if (type === 'rules') {
      if (url) pdfMemory.rulesUrl = url;
      if (textUrl) pdfMemory.rulesTextUrl = textUrl;
      if (geminiFileUri) pdfMemory.rulesGeminiFileUri = geminiFileUri;
      if (geminiMimeType) pdfMemory.rulesGeminiMimeType = geminiMimeType;
      if (textGeminiFileUri)
        pdfMemory.rulesTextGeminiFileUri = textGeminiFileUri;
      if (filename) pdfMemory.rulesFileName = filename;
    } else if (type === 'adventure') {
      if (url) pdfMemory.adventureUrl = url;
      if (textUrl) pdfMemory.adventureTextUrl = textUrl;
      if (geminiFileUri) pdfMemory.adventureGeminiFileUri = geminiFileUri;
      if (geminiMimeType) pdfMemory.adventureGeminiMimeType = geminiMimeType;
      if (textGeminiFileUri)
        pdfMemory.adventureTextGeminiFileUri = textGeminiFileUri;
      if (filename) pdfMemory.adventureFileName = filename;
    } else {
      return NextResponse.json(
        { error: 'Nieprawidłowy typ. Dozwolone: rules, adventure' },
        { status: 400 }
      );
    }

    pdfMemory.lastUpdated = new Date().toISOString();

    return NextResponse.json({
      success: true,
      message: `Zapisano ${type} PDF: ${filename || 'bez nazwy'}`,
      memory: pdfMemory,
    });
  } catch (error) {
    console.error('Błąd podczas zapisywania PDF w pamięci:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas zapisywania' },
      { status: 500 }
    );
  }
}

/**
 * DELETE — czyści pamięć PDF: in-memory state + GCS pliki (PDFy + notatki MG).
 *
 * IND-66 B5: pre-fix Pełny Reset czyścił TYLKO `pdfMemory = {}` (in-memory),
 * pliki w GCS `pdfs/*` + `gm-instructions/*` zostawały na zawsze (helper UI
 * mówił "USUWA WSZYSTKO" — kłamliwy). Analog IND-55/66/105/115/130/135 pattern
 * (6-ty raz Pełny Reset stub w IND-42 audytach).
 *
 * Per-file delete z graceful 404 handling — pojedyncze błędy nie blokują
 * całego cleanup (kolejne pliki dalej się usuwają).
 */
export async function DELETE() {
  try {
    pdfMemory = {};

    // IND-66 B5: czyść GCS prefixes `pdfs/` (rules + adventures PDF+txt) +
    // `gm-instructions/` (notatki MG). Per-file delete, swallow 404.
    const cleared: string[] = [];
    const failed: { fileName: string; error: string }[] = [];
    const prefixes = ['pdfs/', 'gm-instructions/'];

    for (const prefix of prefixes) {
      try {
        const files = await googleCloudStorageService.listFiles(prefix);
        for (const file of files) {
          try {
            await googleCloudStorageService.deleteFile(file.name);
            cleared.push(file.name);
          } catch (deleteError) {
            failed.push({
              fileName: file.name,
              error:
                deleteError instanceof Error
                  ? deleteError.message
                  : 'Unknown error',
            });
          }
        }
      } catch (listError) {
        console.warn(
          `⚠️ Could not list GCS files in ${prefix}:`,
          listError instanceof Error ? listError.message : listError
        );
      }
    }

    console.log(
      `🗑️ PDF memory cleared: ${cleared.length} GCS files deleted${failed.length > 0 ? `, ${failed.length} failed` : ''}`
    );

    return NextResponse.json({
      success: true,
      message: 'Pamięć PDF została wyczyszczona',
      gcsFilesCleared: cleared.length,
      gcsFilesFailed: failed.length,
    });
  } catch (error) {
    console.error('Błąd podczas czyszczenia pamięci PDF:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas czyszczenia' },
      { status: 500 }
    );
  }
}
