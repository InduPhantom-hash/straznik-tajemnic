import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient } from '@/lib/gemini-client-pool';
import { buildCustomVocabulary } from '@/lib/audio/cthulhu-vocabulary';

export const runtime = 'nodejs';

export const DEFAULT_TRANSCRIBE_MODEL = 'gemini-3.5-transcribe';
export const FALLBACK_TRANSCRIBE_MODELS = ['gemini-2.5-flash', 'gemini-3.5-flash'];

interface TranscribeSegment {
  speaker: string;
  text: string;
}

interface TranscribeResponseBody {
  text: string;
  segments?: TranscribeSegment[];
}

/**
 * Bezpiecznie parsuje pole tekstowe jako JSON lub listę stringów
 */
function parseStringOrJsonList(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((item) => (typeof item === 'string' ? item : JSON.stringify(item)));
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((item) =>
            typeof item === 'string'
              ? item
              : typeof item === 'object' && item !== null
                ? (item as { name?: string; characterName?: string }).characterName ||
                  (item as { name?: string }).name ||
                  JSON.stringify(item)
                : String(item)
          );
        }
      } catch {
        // Ignoruj błąd parsowania, traktuj jak zwykły string
      }
    }
    return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

export async function POST(request: NextRequest) {
  try {
    const apiKey =
      request.headers.get('X-Gemini-Api-Key')?.trim() ||
      process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Brak klucza API Gemini. Wklej klucz w Ustawieniach.',
          code: 'BYOK_KEY_MISSING',
        },
        { status: 401 }
      );
    }

    const client = getGeminiClient(apiKey);
    if (!client) {
      return NextResponse.json(
        {
          success: false,
          error: 'Twój klucz API Gemini jest pusty. Sprawdź Ustawienia.',
          code: 'BYOK_KEY_MISSING',
        },
        { status: 401 }
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Błąd przetwarzania formularza multipart/form-data',
        },
        { status: 400 }
      );
    }

    const audioEntry = formData.get('audio');
    if (!audioEntry || !(audioEntry instanceof Blob)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Brak pliku audio w żądaniu',
        },
        { status: 400 }
      );
    }

    const audioBlob = audioEntry;
    if (audioBlob.size === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Plik audio jest pusty',
        },
        { status: 400 }
      );
    }

    const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
    if (audioBlob.size > MAX_AUDIO_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: 'Plik audio przekracza dopuszczalny limit rozmiaru (25 MB)',
        },
        { status: 400 }
      );
    }

    const mode = (formData.get('mode')?.toString() || 'solo') as 'solo' | 'duet';
    const language = formData.get('language')?.toString() || 'pl';
    const rawInvestigators = formData.get('investigators');
    const rawSceneNpcs = formData.get('sceneNpcs');
    const location = formData.get('location')?.toString();

    const investigators = parseStringOrJsonList(rawInvestigators);
    const sceneNpcs = parseStringOrJsonList(rawSceneNpcs);

    const { promptSnippet } = buildCustomVocabulary({
      investigators,
      sceneNpcs,
      location,
    });

    const isPolish = language.toLowerCase().startsWith('pl');
    const systemPrompt = `Jesteś ekspertem transkrypcji mowy dla sesji gry fabularnej Zew Cthulhu 7e (Call of Cthulhu) w języku ${
      isPolish ? 'polskim' : 'angielskim'
    }.
Twoim zadaniem jest zamiana nagrania mowy graczy na czysty, uporządkowany tekst.

ZASADY TRANSLACJI:
1. Smart Transcription: Bezwzględnie usuń zająknięcia, pauzy wypełnione ("eee", "yyy", "uhm", "aaa", "hmmm", "no ten tego") oraz powtórzenia słów wynikające z wahania. Zachowaj intencję odgrywania roli, wypowiedzi w pierwszej i trzeciej osobie oraz deklaracje mechaniczne.
2. Custom Vocabulary: Ściśle przestrzegaj poprawnej pisowni nazw własnych z poniższego słownika Mitów i sesji:
${promptSnippet}
3. Diarizacja (podział na mówców):
${
  mode === 'duet'
    ? `Nagranie może zawierać wypowiedzi dwóch graczy (Speaker 1 i Speaker 2).
Jeśli słychać dwóch różnych mówców, rozdziel ich kwestie chronologicznie na segmenty z etykietami "Speaker 1" i "Speaker 2".
Jeśli mówi tylko jedna osoba, przypisz całość do "Speaker 1".`
    : `Tryb solo: traktuj nagranie jako wypowiedź jednego gracza ("Speaker 1").`
}

FORMAT ODPOWIEDZI:
Zwróć WYŁĄCZNIE obiekt JSON (bez znaczników markdown ani dodatkowego komentarza):
{
  "text": "pełny rozpoznany tekst (wszystkich wypowiedzi razem)",
  "segments": [
    { "speaker": "Speaker 1", "text": "deklaracja lub słowa pierwszego gracza" },
    { "speaker": "Speaker 2", "text": "deklaracja lub słowa drugiego gracza" }
  ]
}`;

    let base64Audio = '';
    if (typeof (audioBlob as unknown as { arrayBuffer?: () => Promise<ArrayBuffer> }).arrayBuffer === 'function') {
      const arrayBuffer = await audioBlob.arrayBuffer();
      base64Audio = Buffer.from(arrayBuffer).toString('base64');
    } else if (Buffer.isBuffer(audioBlob)) {
      base64Audio = audioBlob.toString('base64');
    } else if (typeof (audioBlob as unknown as { text?: () => Promise<string> }).text === 'function') {
      const text = await (audioBlob as unknown as { text: () => Promise<string> }).text();
      base64Audio = Buffer.from(text).toString('base64');
    } else {
      base64Audio = Buffer.from(String(audioBlob)).toString('base64');
    }
    let mimeType = audioBlob.type || 'audio/webm';
    // Jeśli format to ogólne audio/webm;codecs=opus, Gemini woli audio/webm
    if (mimeType.includes('audio/webm')) {
      mimeType = 'audio/webm';
    } else if (mimeType.includes('audio/ogg')) {
      mimeType = 'audio/ogg';
    } else if (mimeType.includes('audio/wav') || mimeType.includes('audio/x-wav')) {
      mimeType = 'audio/wav';
    } else if (mimeType.includes('audio/mp3') || mimeType.includes('audio/mpeg')) {
      mimeType = 'audio/mp3';
    }

    const contents = [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Audio,
            },
          },
          {
            text: systemPrompt,
          },
        ],
      },
    ];

    const requestedModel =
      request.headers.get('X-Transcribe-Model')?.trim() ||
      process.env.TRANSCRIBE_MODEL?.trim() ||
      DEFAULT_TRANSCRIBE_MODEL;

    const modelsToTry = [requestedModel, ...FALLBACK_TRANSCRIBE_MODELS.filter((m) => m !== requestedModel)];

    let rawText = '';
    let usedModel = requestedModel;
    let lastError: unknown = null;

    for (const model of modelsToTry) {
      try {
        const response = await client.models.generateContent({
          model,
          contents,
          config: {
            responseMimeType: 'application/json',
          },
        });
        if (!response) {
          throw new Error(`Empty response from model ${model}`);
        }
        const extractedText =
          typeof response.text === 'function'
            ? (response as unknown as { text: () => string }).text()
            : response.text || '';
        rawText = extractedText;
        usedModel = model;
        lastError = null;
        break;
      } catch (err) {
        lastError = err;
        console.warn(`[transcribe] Model ${model} failed, trying fallback if available...`, err);
      }
    }

    if (!rawText && lastError) {
      console.error('[transcribe] All transcription models failed:', lastError);
      return NextResponse.json(
        {
          success: false,
          error: 'Błąd transkrypcji audio w Gemini API',
          details: lastError instanceof Error ? lastError.message : String(lastError),
        },
        { status: 500 }
      );
    }

    // Parsowanie odpowiedzi JSON (odporne na bloki markdown i komentarze poboczne)
    let parsed: TranscribeResponseBody;
    try {
      const jsonBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      const innerContent = jsonBlockMatch ? jsonBlockMatch[1].trim() : rawText.trim();
      let jsonStringToParse = innerContent;
      const firstBrace = innerContent.indexOf('{');
      const lastBrace = innerContent.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonStringToParse = innerContent.slice(firstBrace, lastBrace + 1);
      }
      parsed = JSON.parse(jsonStringToParse) as TranscribeResponseBody;
    } catch {
      // Fallback: jeśli model nie sformatował poprawnego JSON-a
      parsed = {
        text: rawText.trim(),
        segments: [{ speaker: 'Speaker 1', text: rawText.trim() }],
      };
    }

    const cleanedText = (parsed.text || '').trim();
    const segments = Array.isArray(parsed.segments)
      ? parsed.segments
          .map((s) => ({
            speaker: (s.speaker || 'Speaker 1').trim(),
            text: (s.text || '').trim(),
          }))
          .filter((s) => s.text.length > 0)
      : cleanedText
        ? [{ speaker: 'Speaker 1', text: cleanedText }]
        : [];

    return NextResponse.json({
      success: true,
      text: cleanedText || (segments.map((s) => s.text).join(' ') || ''),
      segments,
      mode,
      model: usedModel,
    });
  } catch (error) {
    console.error('[POST /api/transcribe] Fatal error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Wewnętrzny błąd serwera transkrypcji',
      },
      { status: 500 }
    );
  }
}
