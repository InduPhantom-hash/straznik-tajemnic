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

    // BYOK: Test połączenia z UI Settings testuje wyłącznie wpisany klucz (bez cichego fallbacku do .env.local).
    // Jeśli apiKey nie został podany w body, zwracamy 400.
    const effectiveKey = typeof apiKey === 'string' ? apiKey.trim() : null;

    if (!effectiveKey) {
      return NextResponse.json(
        {
          error: 'Brak klucza API Gemini',
          details: 'Wpisz klucz API w formularzu, aby przetestować połączenie.',
        },
        { status: 400 }
      );
    }
    const client = getGeminiClient(effectiveKey);

    if (!client) {
      return NextResponse.json(
        {
          error: 'Błąd inicjalizacji klienta Gemini',
          details: 'Nie udało się zainicjalizować klienta dla podanego klucza API.',
        },
        { status: 400 }
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

        let statusCode = 500;
        // Szczegółowe informacje o błędzie
        if (
          testError.message.includes('API key') ||
          testError.message.includes('401') ||
          testError.message.includes('400') ||
          testError.message.includes('INVALID_ARGUMENT') ||
          testError.message.includes('PERMISSION_DENIED')
        ) {
          errorMessage = 'Nieprawidłowy klucz API Gemini';
          errorDetails =
            'Podany klucz API nie przeszedł pomyślnie autoryzacji w Google AI Studio.';
          statusCode = 401;
        } else if (
          testError.message.includes('quota') ||
          testError.message.includes('429')
        ) {
          errorMessage = 'Przekroczono limit zapytań';
          errorDetails =
            'Spróbuj ponownie za chwilę lub sprawdź limity na https://makersuite.google.com';
          statusCode = 429;
        } else if (
          testError.message.includes('model') ||
          testError.message.includes('404')
        ) {
          errorMessage = 'Model nie jest dostępny';
          errorDetails =
            'Sprawdź czy wybrany model Gemini jest dostępny w Twoim regionie';
          statusCode = 404;
        }

        return NextResponse.json(
          {
            success: false,
            error: errorMessage,
            details: errorDetails,
            timestamp: new Date().toISOString(),
          },
          { status: statusCode }
        );
      }
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
