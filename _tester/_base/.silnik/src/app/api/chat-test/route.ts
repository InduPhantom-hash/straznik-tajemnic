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
async function probeGeminiTier(apiKey: string): Promise<'free' | 'paid'> {
  try {
    const probeRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: '1x1 test' }],
            },
          ],
          generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
        }),
      }
    );

    if (probeRes.ok) {
      return 'paid';
    }

    // 429 z limitem 0 lub błędy uprawnień = darmowy Free Tier
    return 'free';
  } catch (err) {
    console.warn('⚠️ Gemini tier probe failed, fallback to free tier:', err);
    return 'free';
  }
}

export async function POST(request: NextRequest) {
  try {
    const { testConnection, apiKey, checkTier = true } = await request.json();

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
      // 1. Szybka ścieżka: sprawdzone modele generacji 3.x
      const testModels = [
        'gemini-3.8-flash',
        'gemini-3.6-flash',
        'gemini-3.1-flash-lite',
      ];
      let lastError: Error | null = null;

      for (const modelName of testModels) {
        try {
          const testResult = await client.models.generateContent({
            model: modelName,
            contents: 'Hello',
          });
          const testText = testResult.text ?? '';
          const tier = checkTier ? await probeGeminiTier(effectiveKey) : 'free';

          return NextResponse.json({
            success: true,
            response: 'Połączenie z Gemini API działa poprawnie',
            model: modelName,
            tier,
            testResponse: testText.substring(0, 50) + '...',
          });
        } catch (modelError) {
          lastError =
            modelError instanceof Error
              ? modelError
              : new Error(String(modelError));
          console.log(`⚠️ Model ${modelName} nie działa, próbuję kolejny...`);
          continue;
        }
      }

      // 2. Samonaprawa (odporność na przyszłe wycofania modeli przez Google):
      // Pobierz żywą listę z API i przetestuj najnowszy model wspierający generateContent.
      try {
        const pager = await client.models.list();
        const available: string[] = [];
        for await (const m of pager) {
          const name = (m.name ?? '').replace(/^models\//, '');
          if (!name || name.includes('tts') || name.includes('image') || name.includes('embedding') || name.includes('transcribe')) {
            continue;
          }
          available.push(name);
        }
        // Sprawdzaj od najnowszych
        available.reverse();

        for (const candidate of available) {
          try {
            const dynamicRes = await client.models.generateContent({
              model: candidate,
              contents: 'Hello',
            });
            const dynamicText = dynamicRes.text ?? '';
            const tier = checkTier ? await probeGeminiTier(effectiveKey) : 'free';
            return NextResponse.json({
              success: true,
              response: 'Połączenie z Gemini API działa poprawnie (wykryto dynamicznie)',
              model: candidate,
              tier,
              testResponse: dynamicText.substring(0, 50) + '...',
            });
          } catch {
            continue;
          }
        }
      } catch (listErr) {
        console.warn('⚠️ Dynamic model discovery failed:', listErr);
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
      let errorCode = 'UNKNOWN';

      if (testError instanceof Error) {
        errorDetails = testError.message;

        let statusCode = 500;
        // Szczegółowe informacje o błędzie
        if (
          testError.message.includes('API key') ||
          testError.message.includes('401') ||
          testError.message.includes('400') ||
          testError.message.includes('INVALID_ARGUMENT') ||
          testError.message.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED') ||
          testError.message.includes('UNAUTHENTICATED') ||
          testError.message.includes('API_KEY_INVALID')
        ) {
          errorCode = 'AUTH_FAILED';
          errorMessage = 'Nieprawidłowy klucz API Gemini';
          errorDetails =
            'Podany klucz API nie przeszedł autoryzacji w Google AI Studio (błąd 401/400). Upewnij się, że klucz jest poprawny, kompletny i nie został unieważniony.';
          statusCode = 401;
        } else if (
          testError.message.includes('PERMISSION_DENIED') ||
          testError.message.includes('SERVICE_DISABLED') ||
          testError.message.includes('403')
        ) {
          errorCode = 'PERMISSION_DENIED';
          errorMessage = 'Brak uprawnień do Gemini API';
          errorDetails =
            'Klucz API nie ma uprawnień do Generative Language API lub usługa jest wyłączona w projekcie Google Cloud (błąd 403).';
          statusCode = 403;
        } else if (
          testError.message.includes('quota') ||
          testError.message.includes('RESOURCE_EXHAUSTED') ||
          testError.message.includes('429')
        ) {
          errorCode = 'QUOTA_EXCEEDED';
          errorMessage = 'Przekroczono limit zapytań';
          errorDetails =
            'Przekroczono limit zapytań Gemini API (błąd 429). Sprawdź limity w Google AI Studio.';
          statusCode = 429;
        } else if (
          testError.message.includes('model') ||
          testError.message.includes('404')
        ) {
          errorCode = 'MODEL_NOT_FOUND';
          errorMessage = 'Model nie jest dostępny';
          errorDetails =
            'Sprawdź czy wybrany model Gemini jest dostępny w Twoim regionie (błąd 404).';
          statusCode = 404;
        }

        return NextResponse.json(
          {
            success: false,
            code: errorCode,
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
    let errorCode = 'UNKNOWN';

    if (error instanceof Error) {
      console.error('Typ błędu:', error.name);
      console.error('Wiadomość błędu:', error.message);
      console.error('Stack trace:', error.stack);

      // Szczegółowe informacje o błędzie dla użytkownika
      if (
        error.message.includes('API key') ||
        error.message.includes('401') ||
        error.message.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED') ||
        error.message.includes('UNAUTHENTICATED')
      ) {
        errorCode = 'AUTH_FAILED';
        errorMessage = 'Problem z kluczem API Gemini';
        errorDetails =
          'Błąd autoryzacji w Google AI Studio. Upewnij się, że klucz jest poprawny.';
      } else if (
        error.message.includes('PERMISSION_DENIED') ||
        error.message.includes('403')
      ) {
        errorCode = 'PERMISSION_DENIED';
        errorMessage = 'Brak uprawnień do API Gemini';
        errorDetails = 'Brak uprawnień w projekcie Google Cloud (kod 403).';
      } else if (
        error.message.includes('quota') ||
        error.message.includes('limit') ||
        error.message.includes('429')
      ) {
        errorCode = 'QUOTA_EXCEEDED';
        errorMessage = 'Przekroczono limit zapytań do API Gemini';
        errorDetails =
          'Spróbuj ponownie za chwilę lub sprawdź limity w Google AI Studio.';
      } else if (
        error.message.includes('network') ||
        error.message.includes('fetch')
      ) {
        errorCode = 'NETWORK_ERROR';
        errorMessage = 'Problem z połączeniem do API Gemini';
        errorDetails = 'Sprawdź połączenie z internetem';
      } else {
        errorDetails = error.message;
      }
    }

    return NextResponse.json(
      {
        success: false,
        code: errorCode,
        error: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
