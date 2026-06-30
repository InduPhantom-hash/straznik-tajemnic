/**
 * API endpoint for parsing PDF files
 * Pobiera PDF z Google Cloud Storage i parsuje go
 * Plik musi być już wcześniej wgrany do GCS (np. przez presigned URL)
 */

import { NextRequest, NextResponse } from 'next/server';
import { googleCloudStorageService } from '@/lib/google-cloud-storage-service-fixed';
import { pdfParserService } from '@/lib/pdf-parser-service';
import {
  uploadPDFTextToGemini,
  uploadNativePDFToGemini,
} from '@/lib/gemini-file-service';

export const maxDuration = 300; // 5 minut timeout
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    console.log('📥 Received request to /api/pdf/parse');

    // Pobierz dane z JSON body zamiast FormData
    const body = await request.json();
    const { fileName, type, originalFileName } = body;

    if (!fileName) {
      return NextResponse.json(
        { error: 'Brak nazwy pliku w GCS' },
        { status: 400 }
      );
    }

    if (!type || (type !== 'rules' && type !== 'adventure')) {
      return NextResponse.json(
        { error: 'Nieprawidłowy typ. Musi być "rules" lub "adventure"' },
        { status: 400 }
      );
    }

    console.log(`📄 Parsing PDF from GCS: ${fileName} (type: ${type})`);

    // Pobierz plik z Google Cloud Storage (nie sprawdzamy getFileInfo bo wymaga dodatkowych uprawnień)
    let buffer: Buffer;
    try {
      console.log(`📥 Downloading file from GCS: ${fileName}`);
      buffer = await googleCloudStorageService.downloadFile(fileName);
      console.log(`✅ File downloaded from GCS: ${buffer.length} bytes`);
    } catch (downloadError) {
      console.error('❌ Error downloading file from GCS:', downloadError);
      throw new Error(
        `Błąd podczas pobierania pliku z Google Cloud Storage: ${downloadError instanceof Error ? downloadError.message : 'Unknown error'}`
      );
    }

    // Parsuj PDF lokalnie (potrzebne dla metadanych i embeddingów RAG)
    console.log('🔄 Starting PDF parsing...');
    let parsedData;
    try {
      parsedData = await pdfParserService.parsePDFBuffer(buffer);
      console.log(
        `✅ PDF parsed successfully: ${parsedData.pages} pages, ${parsedData.text.length} characters`
      );
    } catch (parseError) {
      console.error('❌ PDF parsing failed:', parseError);
      throw parseError;
    }

    // URL do PDF w GCS
    const bucketName =
      process.env.GOOGLE_CLOUD_STORAGE_BUCKET || 'zew-app-storage';
    const pdfUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

    // OPT-11: Upload natywnego PDF do Gemini (application/pdf)
    // Gemini obsługuje natywne parsowanie z OCR, detekcją tabel i layoutem - lepsza jakość niż pdf-parse.
    // Fallback: upload sparsowanego tekstu jeśli natywny upload się nie uda.
    let geminiFileUri: string | undefined;
    const displayFileName =
      originalFileName || fileName.split('/').pop() || 'unknown.pdf';

    try {
      console.log(`📤 Uploading native PDF to Gemini File API (OPT-11)...`);
      geminiFileUri = await uploadNativePDFToGemini(buffer, displayFileName);
      console.log(
        `✅ Native PDF uploaded to Gemini File API: ${geminiFileUri}`
      );
    } catch (nativeError) {
      console.warn(
        '⚠️ Native PDF upload failed, falling back to text upload:',
        nativeError
      );
      try {
        geminiFileUri = await uploadPDFTextToGemini(
          parsedData.text,
          displayFileName
        );
        console.log(
          `✅ Fallback text uploaded to Gemini File API: ${geminiFileUri}`
        );
      } catch (textError) {
        console.error(
          '⚠️ Text upload also failed (continuing anyway):',
          textError
        );
      }
    }

    // OPT-12: Pominięcie uploadu sparsowanego tekstu do GCS (vestigial - nigdy nie konsumowany przez chat)
    const textUrl = pdfUrl.replace(/\.pdf$/i, '.txt'); // Placeholder URL dla kompatybilności

    // Zapisuj informacje do pdf-memory (włącznie z Gemini File URI)
    try {
      await fetch(`${request.nextUrl.origin}/api/pdf-memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: type || 'general',
          url: pdfUrl,
          textUrl: textUrl,
          geminiFileUri: geminiFileUri,
          geminiMimeType: 'application/pdf', // OPT-11: natywny PDF
          filename: displayFileName,
        }),
      });
    } catch (memoryError) {
      console.warn('⚠️ Failed to save to pdf-memory:', memoryError);
      // Kontynuuj - pamięć jest opcjonalna
    }

    return NextResponse.json({
      success: true,
      pdfUrl: pdfUrl,
      textUrl: textUrl,
      geminiFileUri: geminiFileUri,
      fileName: originalFileName || fileName.split('/').pop() || 'unknown.pdf',
      parsedData: {
        pages: parsedData.pages,
        textLength: parsedData.text.length,
        metadata: parsedData.metadata,
      },
      uploadedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Błąd podczas parsowania PDF:', error);
    console.error('❌ Error type:', typeof error);
    console.error('❌ Error instanceof Error:', error instanceof Error);
    if (error instanceof Error) {
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Error name:', error.name);
    }

    // Bardziej szczegółowe komunikaty błędów
    let errorMessage = 'Wystąpił błąd podczas parsowania pliku';
    let errorDetails = error instanceof Error ? error.message : String(error);

    // Sprawdź typ błędu i dostarcz bardziej pomocne komunikaty
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();

      if (
        msg.includes('failed to parse pdf') ||
        msg.includes('nie udało się sparsować')
      ) {
        errorMessage = 'Nie udało się sparsować pliku PDF';
        if (msg.includes('uszkodzony') || msg.includes('corrupt')) {
          errorDetails = 'Plik PDF jest uszkodzony';
        } else if (
          msg.includes('hasłem') ||
          msg.includes('password') ||
          msg.includes('encrypted')
        ) {
          errorDetails = 'PDF jest chroniony hasłem - nie można go sparsować';
        } else if (msg.includes('invalid') || msg.includes('nieprawidłowy')) {
          errorDetails =
            'Nieprawidłowy format PDF - plik może być uszkodzony lub w nieobsługiwanym formacie';
        } else {
          errorDetails =
            'Plik może być uszkodzony lub w nieobsługiwanym formacie';
        }
      } else if (
        msg.includes('storage not initialized') ||
        msg.includes('failed to initialize') ||
        msg.includes('google cloud')
      ) {
        errorMessage = 'Błąd konfiguracji Google Cloud Storage';
        errorDetails =
          'Sprawdź zmienne środowiskowe GOOGLE_CLOUD_STORAGE_BUCKET oraz GOOGLE_CLOUD_STORAGE_KEY_FILE (lokalnie) lub GOOGLE_CLOUD_CREDENTIALS_JSON (Vercel)';
      } else if (msg.includes('failed to upload') || msg.includes('upload')) {
        errorMessage = 'Błąd podczas uploadu do Google Cloud Storage';
        errorDetails = error.message;
      } else if (msg.includes('buffer jest pusty')) {
        errorMessage = 'Plik jest pusty';
        errorDetails = 'Wczytany plik nie zawiera danych';
      } else if (msg.includes('błąd podczas konwersji')) {
        errorMessage = 'Błąd podczas przetwarzania pliku';
        errorDetails = error.message;
      }
    }

    console.error('❌ Returning error response:', {
      errorMessage,
      errorDetails,
    });

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: errorDetails,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'general';

    // Lista plików PDF w danej kategorii
    const files = await googleCloudStorageService.listFiles(`pdfs/${type}/`);

    return NextResponse.json({
      success: true,
      files: files.map((file) => ({
        name: file.name,
        url: file.publicUrl,
        size: file.size,
        uploadedAt: file.timeCreated,
      })),
    });
  } catch (error) {
    console.error('Błąd podczas listowania plików:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas listowania plików' },
      { status: 500 }
    );
  }
}
