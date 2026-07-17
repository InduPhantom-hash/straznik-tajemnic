/**
 * PDF Text Extraction API - Ulepszona wersja
 *
 * Używa gemini-2.0-flash do ekstrakcji pełnego tekstu z PDF.
 * Zapisuje wynik jako plik tekstowy w Gemini Files API.
 * Umożliwia modelom 2.5/3.x dostęp do treści bez użycia formatu PDF.
 *
 * Ulepszenia:
 * - Retry z exponential backoff dla błędów sieciowych
 * - Ekstrakcja w chunkach dla dużych PDFów (>50 stron)
 * - Lepsze logowanie błędów
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPartFromUri } from '@google/genai';
import { getGeminiClient } from '@/lib/gemini-client-pool';
import { DEFAULT_GEMINI_MODEL } from '@/lib/ai-providers/constants';
import {
  QUALITY_PRESETS,
  type QualityPresetName,
} from '@/lib/ai-presets/definitions';

// IND-66 C4: model resolved per `qualityPreset` z body (ULTRA → gemini-3.1-pro
// dla lepszej precyzji ekstrakcji tekstów technicznych jak zasady CoC). Fallback
// do DEFAULT_GEMINI_MODEL gdy preset brak lub `custom` (settings: null).
function resolveExtractionModel(qualityPreset?: string): string {
  if (!qualityPreset) return DEFAULT_GEMINI_MODEL;
  const preset = QUALITY_PRESETS[qualityPreset as QualityPresetName];
  return preset?.settings?.model ?? DEFAULT_GEMINI_MODEL;
}
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 2000;

// Funkcja retry z exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  initialDelay: number = INITIAL_RETRY_DELAY_MS
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const errorMessage = lastError.message || '';

      // Nie retry dla błędów 400/401/403 (nie ma sensu)
      if (
        errorMessage.includes('400') ||
        errorMessage.includes('401') ||
        errorMessage.includes('403') ||
        errorMessage.includes('permission')
      ) {
        throw lastError;
      }

      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(
          `⏳ Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pdfFileUri, fileName, type, qualityPreset } = body;
    const extractionModel = resolveExtractionModel(qualityPreset);

    if (!pdfFileUri) {
      return NextResponse.json(
        { error: 'Brak URI pliku PDF (pdfFileUri)' },
        { status: 400 }
      );
    }

    if (!type || (type !== 'rules' && type !== 'adventure')) {
      return NextResponse.json(
        { error: 'Nieprawidłowy typ. Musi być "rules" lub "adventure"' },
        { status: 400 }
      );
    }

    // Pobierz klucz API
    const apiKey =
      request.headers.get('X-Gemini-Api-Key') || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Brak klucza API Gemini' },
        { status: 401 }
      );
    }

    console.log(
      `📄 Starting PDF text extraction for: ${fileName || pdfFileUri}`
    );
    console.log(`📎 PDF File URI: ${pdfFileUri}`);

    // Inicjalizuj Gemini przez pool
    const client = getGeminiClient(apiKey);
    if (!client) {
      return NextResponse.json(
        { error: 'Nie udało się zainicjalizować klienta Gemini' },
        { status: 401 }
      );
    }

    // Ekstrakcja wieloetapowa dla dużych dokumentów
    // Dla dokumentów >300 stron, dzielimy na części
    const extractionPrompts = [
      {
        name: 'part1',
        prompt: `Wyodrębnij tekst z PIERWSZEJ POŁOWY tego dokumentu PDF (od początku do mniej więcej połowy dokumentu).
Zachowaj pełną strukturę i formatowanie:
- Tytuły i nagłówki oznacz # (markdown)
- Zachowaj wszystkie tabele, statystyki, opisy
- NIE pomijaj żadnych szczegółów - to jest ekstrakcja 1:1
- NIE dodawaj komentarzy ani interpretacji

Zwróć TYLKO wyekstraktowany tekst z pierwszej połowy dokumentu.`,
      },
      {
        name: 'part2',
        prompt: `Wyodrębnij tekst z DRUGIEJ POŁOWY tego dokumentu PDF (od połowy do końca dokumentu).
Zachowaj pełną strukturę i formatowanie:
- Tytuły i nagłówki oznacz # (markdown)
- Zachowaj wszystkie tabele, statystyki, opisy
- NIE pomijaj żadnych szczegółów - to jest ekstrakcja 1:1
- NIE dodawaj komentarzy ani interpretacji

Zwróć TYLKO wyekstraktowany tekst z drugiej połowy dokumentu.`,
      },
    ];
    let extractedText = '';
    let extractionSuccess = false;

    // Próba ekstrakcji całego dokumentu
    for (const { name, prompt } of extractionPrompts) {
      console.log(`📝 Attempting extraction: ${name}...`);

      try {
        const result = await withRetry(async () => {
          return client.models.generateContent({
            model: extractionModel,
            contents: [
              { text: prompt },
              createPartFromUri(pdfFileUri, 'application/pdf'),
            ],
            config: {
              maxOutputTokens: 65536, // Maksymalna długość odpowiedzi
            },
          });
        });

        // result.text jest property nullable w nowym SDK — wzorzec z
        // adventure/analyze/route.ts:106 (`?? ''` fallback obowiązkowy)
        const text = result.text ?? '';

        if (text && text.length > 100) {
          extractedText += text;
          extractionSuccess = true;
          console.log(
            `✅ Extraction '${name}' succeeded: ${text.length} chars`
          );
        } else {
          console.warn(`⚠️ Extraction '${name}' returned too short result`);
        }
      } catch (extractError) {
        console.error(`❌ Extraction '${name}' failed:`, extractError);
        // Kontynuuj do następnego chunka
      }
    }

    if (!extractionSuccess || extractedText.length < 100) {
      console.error('❌ All extraction attempts failed');
      return NextResponse.json(
        {
          error: 'Ekstrakcja tekstu nie powiodła się po wszystkich próbach',
          details: 'Plik może być uszkodzony, zabezpieczony lub zbyt duży',
        },
        { status: 500 }
      );
    }

    console.log(`✅ Total extracted: ${extractedText.length} characters`);

    // Zapisz wyekstraktowany tekst jako nowy plik w Gemini Files API.
    // `@google/genai` Files API przyjmuje Blob bezpośrednio — zamiast temp file IO
    // owijamy Buffer w Uint8Array (TS strict: Buffer<ArrayBufferLike> nie jest BlobPart)
    const textBuffer = Buffer.from(extractedText, 'utf-8');
    const textBlob = new Blob([new Uint8Array(textBuffer)], {
      type: 'text/plain',
    });

    // Upload pliku tekstowego do Gemini Files API z retry
    const uploadResponse = await withRetry(async () => {
      return client.files.upload({
        file: textBlob,
        config: {
          displayName: `${fileName || type}_extracted_text`,
          mimeType: 'text/plain',
        },
      });
    });

    const uploadedName = uploadResponse.name;
    if (!uploadedName) {
      console.error('❌ Upload response without `name`:', uploadResponse);
      return NextResponse.json(
        {
          error: 'Brak identyfikatora uploadowanego pliku w odpowiedzi Gemini',
        },
        { status: 500 }
      );
    }

    if (!uploadResponse.uri) {
      console.error('❌ Upload response without `uri`:', uploadResponse);
      return NextResponse.json(
        { error: 'Brak URI uploadowanego pliku w odpowiedzi Gemini' },
        { status: 500 }
      );
    }

    console.log(`📤 Uploaded text file to Gemini: ${uploadResponse.uri}`);

    // Poczekaj na przetworzenie pliku — w nowym SDK response jest "płaski"
    // (`.name` / `.uri` bezpośrednio, nie `.file.name` / `.file.uri`)
    let file = await client.files.get({ name: uploadedName });
    let attempts = 0;
    const maxAttempts = 15; // Zwiększona liczba prób

    while (file.state === 'PROCESSING' && attempts < maxAttempts) {
      console.log(
        `⏳ File processing... (attempt ${attempts + 1}/${maxAttempts})`
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
      file = await client.files.get({ name: uploadedName });
      attempts++;
    }

    if (file.state !== 'ACTIVE') {
      console.error(`❌ File processing failed. State: ${file.state}`);
      return NextResponse.json(
        { error: `Przetwarzanie pliku nie powiodło się. Stan: ${file.state}` },
        { status: 500 }
      );
    }

    console.log(`✅ Text file ready: ${file.uri}`);

    return NextResponse.json({
      success: true,
      textFileUri: file.uri,
      textFileName: file.displayName,
      originalPdfUri: pdfFileUri,
      extractedLength: extractedText.length,
      type,
    });
  } catch (error) {
    console.error('❌ PDF text extraction error:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Nieznany błąd';

    // Bardziej szczegółowe komunikaty błędów
    let userFriendlyError = 'Błąd podczas ekstrakcji tekstu z PDF';
    if (errorMessage.includes('403') || errorMessage.includes('permission')) {
      userFriendlyError =
        'Brak dostępu do pliku PDF - plik mógł wygasnąć (pliki wygasają po 48h)';
    } else if (errorMessage.includes('429')) {
      userFriendlyError = 'Przekroczono limit API - spróbuj ponownie za chwilę';
    } else if (
      errorMessage.includes('timeout') ||
      errorMessage.includes('DEADLINE')
    ) {
      userFriendlyError =
        'Przekroczono czas oczekiwania - plik może być za duży';
    }

    return NextResponse.json(
      {
        success: false,
        error: userFriendlyError,
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
