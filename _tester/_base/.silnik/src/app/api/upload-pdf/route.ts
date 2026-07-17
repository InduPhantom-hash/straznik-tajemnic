import { NextRequest, NextResponse } from 'next/server';
import { googleCloudStorageService } from '@/lib/google-cloud-storage-service-fixed';
import fs from 'fs';
import path from 'path';

// Fallback: katalog lokalny używany TYLKO w dev (`npm run dev`).
// UWAGA: katalog NIE jest tworzony przy ładowaniu modułu - na Vercel FS jest
// read-only poza /tmp, a mkdirSync przy imporcie wywracał cold start (IND-168).
// Tworzenie katalogu przeniesione do bloku catch (leniwie, w try/catch).
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Brak pliku do przesłania' },
        { status: 400 }
      );
    }

    // Sprawdź czy to PDF
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Tylko pliki PDF są dozwolone' },
        { status: 400 }
      );
    }

    // Sprawdź rozmiar pliku (max 500MB)
    if (file.size > 500 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Plik jest za duży. Maksymalny rozmiar to 500MB' },
        { status: 400 }
      );
    }

    // Generuj unikalną nazwę pliku
    const timestamp = Date.now();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `pdfs/${timestamp}-${safeFileName}`;

    // Konwertuj File do Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    try {
      // Próba uploadu do Google Cloud Storage
      // NIE używamy public: true bo bucket ma włączony Uniform bucket-level access
      const uploadResult = await googleCloudStorageService.uploadFile(
        buffer,
        fileName,
        {
          metadata: {
            contentType: 'application/pdf',
            cacheControl: 'public, max-age=31536000', // 1 rok
          },
          public: false, // Bucket ma Uniform access - pliki będą dostępne przez signed URLs
          resumable: true, // Wznowienie w przypadku błędu
        }
      );

      console.log('✅ PDF uploaded to Google Cloud Storage:', uploadResult.url);

      return NextResponse.json({
        success: true,
        url: uploadResult.url,
        filename: file.name,
        size: uploadResult.size,
        uploadedAt: new Date().toISOString(),
        storage: 'google-cloud',
      });
    } catch (cloudError) {
      // Fallback lokalny - działa tylko gdy FS jest zapisywalny (dev `npm run dev`).
      // Na Vercel write rzuci EROFS (read-only FS) - łapiemy i zwracamy czytelny 503
      // zamiast wywracać request (IND-168).
      console.warn(
        '⚠️ Google Cloud Storage unavailable, próba zapisu lokalnego:',
        cloudError
      );

      try {
        // Leniwe utworzenie katalogu (nie przy ładowaniu modułu - patrz nota wyżej)
        if (!fs.existsSync(UPLOADS_DIR)) {
          fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        }

        const localFileName = `pdf-${timestamp}-${safeFileName}`;
        const filePath = path.join(UPLOADS_DIR, localFileName);

        fs.writeFileSync(filePath, buffer);

        const fileUrl = `/uploads/${localFileName}`;

        return NextResponse.json({
          success: true,
          url: fileUrl,
          filename: file.name,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          storage: 'local',
          warning: 'Google Cloud Storage niedostępny - plik zapisany lokalnie',
        });
      } catch (localError) {
        // Read-only FS (Vercel serverless) - ani GCS, ani dysk lokalny nie zadziałały.
        console.error(
          '❌ Lokalny zapis nieudany (prawdopodobnie read-only FS):',
          localError
        );

        return NextResponse.json(
          {
            error:
              'Nie udało się zapisać pliku: Google Cloud Storage niedostępny, a zapis lokalny jest zablokowany (serverless read-only FS).',
            details:
              cloudError instanceof Error
                ? cloudError.message
                : 'Google Cloud Storage error',
          },
          { status: 503 }
        );
      }
    }
  } catch (error) {
    console.error('Błąd podczas uploadu PDF:', error);

    return NextResponse.json(
      {
        error: 'Wystąpił błąd podczas przesyłania pliku',
        details: error instanceof Error ? error.message : 'Nieznany błąd',
      },
      { status: 500 }
    );
  }
}
