import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient } from '@/lib/gemini-client-pool';

/**
 * /api/chat-test — endpoint testu połączenia z Gemini API.
 *
 * Po IND-30 (sesje 20+21) + sesja 22 cleanup: endpoint służy WYŁĄCZNIE do walidacji
 * klucza API z UI Settings. Wcześniejszy "chat flow" (linie 118-227 w wersji
 * przed-cleanup) był nieosiągalny — jedyny caller produkcyjny `gemini-service.ts:337`
 * (`checkAPIStatus`) zawsze wysyła `testConnection: true`. Cleanup usunął ~150 lin
 * dead code i uprościł imports. POST bez `testConnection: true` zwraca explicit 400.
 *
 * Body: { testConnection: true, apiKey?: string }
 *  - apiKey priorytet → fallback do GEMINI_API_KEY env → 500 jeśli oba puste
 *  - brak testConnection → 400 (chat flow usunięty)
 */
export async function POST(request: NextRequest) {
  try {
    const { testConnection, apiKey } = await request.json();

    // IND-30: Resolve klucza API z body (priorytet) z fallbackiem do env.
    // Wcześniej endpoint inicjalizował GoogleGenAI singleton z env na poziomie modułu,
    // ignorując klucz wpisany w UI Settings. Teraz UI dostarcza klucz przez body request,
    // env zostaje jako safety net (np. dla test E2E bez UI lub server-side wywołań).
    const effectiveKey =
      apiKey?.trim() || process.env.GEMINI_API_KEY?.trim() || null;
    const client = getGeminiClient(effectiveKey);

    if (!client) {
      console.error('❌ Gemini API Test: Brak klucza API (body i env puste)');
      return NextResponse.json(
        {
          error: 'Brak klucza API Gemini',
          details:
            'Wpisz klucz w Ustawieniach lub skonfiguruj GEMINI_API_KEY w środowisku',
        },
        { status: 500 }
      );
    }

    // Sesja 22 cleanup: chat flow usunięty (dead code, jedyny caller zawsze wysyła
    // testConnection: true). Bez flag → 400 explicit zamiast implicit nieprawidłowego
    // zachowania.
    if (!testConnection) {
      return NextResponse.json(
        {
          error:
            'Endpoint służy wyłącznie do testowania połączenia. Użyj testConnection: true.',
        },
        { status: 400 }
      );
    }

    try {
      // Użyj stabilnego modelu do testu połączenia
      const testModels = ['gemini-2.0-flash', 'gemini-2.5-flash'];
      let lastError: Error | null = null;

      for (const modelName of testModels) {
        try {
          const testResult = await client.models.generateContent({
            model: modelName,
            contents: 'Hello',
          });
          const testText = testResult.text ?? '';

          return NextResponse.json({
            success: true,
            response: 'Połączenie z Gemini API działa poprawnie',
            model: modelName,
            testResponse: testText.substring(0, 50) + '...',
          });
        } catch (modelError) {
          lastError =
            modelError instanceof Error
              ? modelError
              : new Error(String(modelError));
          console.log(`⚠️ Model ${modelName} nie działa, próbuję następny...`);
          continue;
        }
      }

      // Jeśli wszystkie modele nie zadziałały, zwróć błąd
      throw lastError || new Error('Wszystkie modele testowe nie zadziałały');
    } catch (testError) {
      console.error(
        '❌ Test połączenia Gemini API nie powiódł się:',
        testError
      );

      let errorMessage = 'Test połączenia nie powiódł się';
      let errorDetails = '';

      if (testError instanceof Error) {
        errorDetails = testError.message;

        // Szczegółowe informacje o błędzie
        if (
          testError.message.includes('API key') ||
          testError.message.includes('401')
        ) {
          errorMessage = 'Nieprawidłowy klucz API Gemini';
          errorDetails =
            'Błąd konfiguracji API. Skontaktuj się z pomocą techniczną';
        } else if (
          testError.message.includes('quota') ||
          testError.message.includes('429')
        ) {
          errorMessage = 'Przekroczono limit zapytań';
          errorDetails =
            'Spróbuj ponownie za chwilę lub sprawdź limity na https://makersuite.google.com';
        } else if (
          testError.message.includes('model') ||
          testError.message.includes('404')
        ) {
          errorMessage = 'Model nie jest dostępny';
          errorDetails =
            'Sprawdź czy wybrany model Gemini jest dostępny w Twoim regionie';
        }
      }

      return NextResponse.json(
        {
          error: errorMessage,
          details: errorDetails,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    // W3: outer catch ZACHOWANY z oryginału — `client.models.generateContent()` w block
    // testConnection dalej może rzucać API key/quota/network; obsługuje też
    // `request.json()` parse error.
    console.error('❌ Błąd API chat-test:', error);

    let errorMessage = 'Wystąpił błąd podczas generowania odpowiedzi';
    let errorDetails = '';

    if (error instanceof Error) {
      console.error('Typ błędu:', error.name);
      console.error('Wiadomość błędu:', error.message);
      console.error('Stack trace:', error.stack);

      // Szczegółowe informacje o błędzie dla użytkownika
      if (error.message.includes('API key')) {
        errorMessage = 'Problem z kluczem API Gemini';
        errorDetails =
          'Błąd konfiguracji API. Skontaktuj się z pomocą techniczną';
      } else if (
        error.message.includes('quota') ||
        error.message.includes('limit')
      ) {
        errorMessage = 'Przekroczono limit zapytań do API Gemini';
        errorDetails =
          'Spróbuj ponownie za chwilę lub sprawdź limity na https://makersuite.google.com';
      } else if (
        error.message.includes('network') ||
        error.message.includes('fetch')
      ) {
        errorMessage = 'Problem z połączeniem do API Gemini';
        errorDetails = 'Sprawdź połączenie z internetem';
      } else {
        errorDetails = error.message;
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
