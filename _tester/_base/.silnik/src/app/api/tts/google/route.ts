/**
 * Google Text-to-Speech API endpoint
 * Główny endpoint do generowania mowy za pomocą Google Cloud TTS
 */

import { NextRequest, NextResponse } from 'next/server';
import { logApiEvent, generateTraceId, startTimer } from '@/lib/telemetry';
import { cleanResponseText } from '@/lib/parsers/text-cleaner';

// IND-160: typy dla GET /api/tts/google (lista głosów Google Cloud TTS).
// Wcześniej `voice: any` w map() i `(a: any, b: any)` w sort() — cleanup
// pre-existing dług ESLint po sesji 63.
interface GoogleVoiceFromAPI {
  name?: string;
  ssmlGender?: 'MALE' | 'FEMALE' | 'NEUTRAL';
  // Inne pola z Google TTS API ignorowane (languageCodes, naturalSampleRateHertz).
}

interface FormattedVoice {
  voiceId: string;
  name: string;
  displayName: string;
  fullName: string;
  gender: string;
  genderPL: string;
  description: string;
  type: string;
  typeEmoji: string;
  priority: number;
  language: string;
  category: string;
}

export async function POST(request: NextRequest) {
  const traceId = request.headers.get('x-trace-id') ?? generateTraceId();
  const timer = startTimer();
  console.log('🎙️ POST /api/tts/google received', { traceId });
  try {
    const { text, settings } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Brak tekstu do przetworzenia' },
        { status: 400 }
      );
    }

    console.log(`🎙️ TTS request: ${text.substring(0, 100)}...`);

    // Kompresuj tekst (usuń didaskalia, polecenia gracza)
    const compressedText = compressTextForTTS(text);

    console.log(
      `📝 Text compression: ${text.length} -> ${compressedText.length} characters`
    );

    // Pobierz klucz API (preferuj nagłówek, potem env)
    const headerApiKey = request.headers.get('X-Gemini-Api-Key');
    const apiKey =
      headerApiKey ||
      process.env.GOOGLE_CLOUD_API_KEY ||
      process.env.GEMINI_API_KEY;
    const hasUserKey = !!headerApiKey;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: hasUserKey
            ? 'Twój klucz API jest pusty. Sprawdź ustawienia.'
            : 'Google Cloud API key not configured',
        },
        { status: hasUserKey ? 401 : 500 }
      );
    }

    if (hasUserKey) {
      console.log('🔑 Using user-provided API key for Google TTS');
    }

    // Chirp3-HD voices don't support pitch parameter
    // Chirp3-HD voices don't support pitch parameter
    const isChirp3Voice = settings.voiceName?.includes('Chirp3');

    const requestPayload = {
      input: { text: compressedText },
      voice: {
        languageCode: settings.languageCode || 'pl-PL',
        name: settings.voiceName,
        ssmlGender: settings.gender || 'NEUTRAL',
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: settings.speakingRate || 1.0,
        ...(isChirp3Voice ? {} : { pitch: settings.pitch || 0 }),
        volumeGainDb: settings.volumeGainDb || 0,
        effectsProfileId: settings.effectsProfileId || [],
      },
    };

    console.log(
      `📡 Sending to Google TTS: Voice=${requestPayload.voice.name}, Gender=${requestPayload.voice.ssmlGender}`
    );

    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Google TTS API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const audioContent = data.audioContent; // Base64 encoded audio

    // Zwróć audio jako Data URL zamiast uploadować do Cloud Storage
    // To rozwiązuje problem uprawnień i jest szybsze
    const audioDataUrl = `data:audio/mp3;base64,${audioContent}`;

    console.log(
      `✅ Speech generated, size: ${((audioContent.length * 0.75) / 1024).toFixed(2)} KB`
    );

    // Szacunkowy koszt (Google TTS: $4 per 1M characters for WaveNet)
    const cost = (compressedText.length / 1000000) * 4;
    const duration = estimateDuration(compressedText, settings.speakingRate);

    return NextResponse.json({
      success: true,
      audioUrl: audioDataUrl,
      duration,
      cost,
      timestamp: new Date().toISOString(),
      originalLength: text.length,
      compressedLength: compressedText.length,
    });
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.stack || error.message : String(error);
    // IND-67: drop fs.appendFileSync('./src/api-debug.log') — Vercel READ-ONLY FS.
    // console.error → Vercel Logs auto-collect; logApiEvent dodaje Sentry breadcrumb.
    console.error('Błąd podczas generowania mowy:', errorMsg);

    await logApiEvent({
      traceId,
      endpoint: '/api/tts/google',
      provider: 'google',
      status: 500,
      durationMs: timer.elapsed(),
      result: 'error',
      errorCode:
        error instanceof Error ? error.constructor.name : 'UnknownError',
      errorMsg: error instanceof Error ? error.message : String(error),
    }).catch(() => {});

    return NextResponse.json(
      {
        error: 'Wystąpił błąd podczas generowania audio',
        details: error instanceof Error ? error.message : 'Nieznany błąd',
      },
      { status: 500 }
    );
  }
}

// Helper functions
function compressTextForTTS(text: string): string {
  // === USUWANIE PREFIKSÓW AI ===
  // IND-160: top-level import zamiast dynamic require (był pre-existing dług
  // od sesji 63 IND-67 baseline ESLint)
  let compressed = cleanResponseText(text);

  // Ogranicz długość do 5000 znaków (limit Google TTS)
  if (compressed.length > 5000) {
    compressed = compressed.substring(0, 4997) + '...';
  }

  return compressed;
}

function estimateDuration(text: string, speakingRate: number): number {
  // Średnio 150 słów na minutę przy normalnej prędkości (1.0)
  const wordsPerMinute = 150 * speakingRate;
  const words = text.split(/\s+/).length;
  const durationInMinutes = words / wordsPerMinute;
  return Math.ceil(durationInMinutes * 60); // w sekundach
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const languageCode = searchParams.get('languageCode') || 'pl-PL';

    // Pobierz dostępne głosy z Google Cloud TTS API
    const apiKey =
      process.env.GOOGLE_CLOUD_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Cloud API key not configured' },
        { status: 500 }
      );
    }

    const url = `https://texttospeech.googleapis.com/v1/voices?languageCode=${languageCode}&key=${apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.statusText}`);
    }

    const data = await response.json();

    // Mapowanie liter na polskie imiona dla głosów
    const VOICE_NAMES: Record<string, Record<string, string>> = {
      FEMALE: {
        A: 'Anna',
        B: 'Barbara',
        C: 'Celina',
        D: 'Dorota',
        E: 'Ewa',
        F: 'Felicja',
        G: 'Grażyna',
      },
      MALE: {
        A: 'Adam',
        B: 'Bartosz',
        C: 'Cezary',
        D: 'Dawid',
        E: 'Edward',
        F: 'Filip',
        G: 'Grzegorz',
      },
      NEUTRAL: {
        A: 'Alex',
        B: 'Blake',
        C: 'Chris',
        D: 'Drew',
        E: 'Eli',
        F: 'Florian',
        G: 'Gabriel',
      },
    };

    // Formatuj głosy dla dropdowna z czytelną nazwą
    const formattedVoices: FormattedVoice[] = (
      (data.voices || []) as GoogleVoiceFromAPI[]
    )
      .map((voice): FormattedVoice => {
        const name = voice.name || '';
        const gender = voice.ssmlGender || 'NEUTRAL';
        const genderPL =
          gender === 'MALE'
            ? 'Męski'
            : gender === 'FEMALE'
              ? 'Kobiecy'
              : 'Neutralny';

        // Określ typ głosu i priorytet
        let type = 'Standard';
        let priority = 3;
        let typeEmoji = '🔊';
        let polishName = '';

        if (name.includes('Chirp3-HD')) {
          type = 'Chirp3 HD';
          priority = 1;
          typeEmoji = '✨';
          // Chirp3 HD używa nazw gwiazd, np. pl-PL-Chirp3-HD-Achird
          const starName = name.split('-').pop() || 'Voice';
          polishName = starName;
        } else if (name.includes('Wavenet')) {
          type = 'Wavenet';
          priority = 2;
          typeEmoji = '🎵';
          // Wavenet używa liter A-G
          const letterMatch = name.match(/-([A-G])$/);
          const letter = letterMatch ? letterMatch[1] : 'A';
          polishName = VOICE_NAMES[gender]?.[letter] || `Głos ${letter}`;
        } else if (name.includes('Neural')) {
          type = 'Neural';
          priority = 2;
          typeEmoji = '🧠';
          const letterMatch = name.match(/-([A-G])$/);
          const letter = letterMatch ? letterMatch[1] : 'A';
          polishName = VOICE_NAMES[gender]?.[letter] || `Głos ${letter}`;
        } else {
          const letterMatch = name.match(/-([A-G])$/);
          const letter = letterMatch ? letterMatch[1] : 'A';
          polishName = VOICE_NAMES[gender]?.[letter] || `Głos ${letter}`;
        }

        return {
          voiceId: name,
          name: `${polishName} (${type})`,
          displayName: polishName,
          fullName: name,
          gender: gender,
          genderPL: genderPL,
          description: genderPL,
          type,
          typeEmoji,
          priority,
          language: languageCode,
          category: 'narrator',
        };
      })
      // Sortuj: Chirp3 HD > Wavenet > Standard, potem alfabetycznie po imieniu
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.displayName.localeCompare(b.displayName, 'pl');
      });

    return NextResponse.json({
      success: true,
      voices: formattedVoices,
      count: formattedVoices.length,
    });
  } catch (error) {
    console.error('Błąd podczas pobierania głosów:', error);

    return NextResponse.json(
      { error: 'Wystąpił błąd podczas pobierania listy głosów' },
      { status: 500 }
    );
  }
}
