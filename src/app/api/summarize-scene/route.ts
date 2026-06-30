import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { DEFAULT_GEMINI_MODEL } from '@/lib/ai-providers/constants';
import type { JournalEntry, JournalEventType } from '@/lib/types';

// IND-206 BYOK + IND-231 (Zew Home): klient Gemini z kluczem testera (nagłówek)
// LUB fallback na serwerowy GEMINI_API_KEY (.env.local) - offline jeden klucz.
const getGenAI = (apiKey: string): GoogleGenAI => new GoogleGenAI({ apiKey });

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface SummarizeRequest {
  messages: Message[];
  characterName?: string;
  adventureTitle?: string;
}

// IND-269: surowy kształt JSON zwracany przez model (NIE jest to JournalEntry).
interface RawSceneSummary {
  title?: unknown;
  type?: unknown;
  summary?: unknown;
  location?: unknown;
  npcs?: unknown;
  significance?: unknown;
  playerActions?: unknown;
}

// IND-269: typy z promptu modelu → JournalEventType (typy dziennika z @/lib/types).
// Mapowanie semantyczne: dialog z NPC → npc, śledztwo → trop, groza → poczytalność,
// podróż → lokacja. Nieznane → notatka (renderer ma DEFAULT_TYPE_INFO, ale wolimy poprawną ikonę).
const SCENE_TYPE_MAP: Record<string, JournalEventType> = {
  discovery: 'discovery',
  combat: 'combat',
  dialogue: 'npc',
  investigation: 'clue',
  horror: 'sanity',
  travel: 'location',
};

function mapSceneType(raw: unknown): JournalEventType {
  return (typeof raw === 'string' && SCENE_TYPE_MAP[raw]) || 'note';
}

// IND-269 (demo hardening): neutralne fallbacki, by wpis nigdy nie był pusty
// ani nie pokazywał alarmującego "Nieznana scena" na żywym demo.
const FALLBACK_TITLE = 'Zapisek z sesji';
const FALLBACK_CONTENT =
  'Kontynuowałeś przygodę - szczegóły nie zostały podsumowane.';

// IND-269: złóż treść wpisu z 3 pól modelu. JournalEntry.content jest renderowany
// (session-journal.tsx) - bez tego wpis ma sam tytuł. cleanMarkdown czyści formatowanie.
// Gdy model zwróci poprawny JSON bez pól treści → FALLBACK_CONTENT (nigdy pusty wpis).
function buildSceneContent(raw: RawSceneSummary): string {
  const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
  const content = [
    str(raw.summary),
    str(raw.significance) && `Znaczenie: ${str(raw.significance)}`,
    str(raw.playerActions) && `Działania: ${str(raw.playerActions)}`,
  ]
    .filter(Boolean)
    .join('\n\n');
  return content || FALLBACK_CONTENT;
}

// IND-269: surowy JSON modelu → poprawny JournalEntry (content/type/tags/isBookmarked/metadata).
// Hook useSceneSummary pushuje to 1:1 do character.journal - kształt MUSI się zgadzać z @/lib/types.
function toJournalEntry(raw: RawSceneSummary): JournalEntry {
  const npcs = Array.isArray(raw.npcs)
    ? raw.npcs.filter(
        (n): n is string => typeof n === 'string' && n.trim().length > 0
      )
    : [];
  const location = typeof raw.location === 'string' ? raw.location.trim() : '';
  const metadata: JournalEntry['metadata'] = {};
  if (location) metadata.locationName = location;
  if (npcs.length) metadata.npcName = npcs.join(', ');

  return {
    id: `journal_${Date.now()}`,
    timestamp: new Date(), // NextResponse serializuje do ISO; renderer owija new Date()
    type: mapSceneType(raw.type),
    title:
      (typeof raw.title === 'string' && raw.title.trim()) || FALLBACK_TITLE,
    content: buildSceneContent(raw),
    tags: [],
    isBookmarked: false,
    metadata,
  };
}

/**
 * API do generowania podsumowania sceny dla dziennika sesji
 * POST /api/summarize-scene
 */
export async function POST(request: NextRequest) {
  try {
    // IND-206 BYOK + IND-231 (Zew Home): klucz z nagłówka X-Gemini-Api-Key
    // (localStorage testera) LUB fallback na serwerowy GEMINI_API_KEY (.env.local).
    // Offline jeden klucz zasila wszystko (czat/obrazy/lektor/dziennik). Brak obu = 401.
    const apiKey =
      request.headers.get('X-Gemini-Api-Key')?.trim() ||
      process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'Wklej swój klucz Google AI Studio w ustawieniach',
          code: 'BYOK_KEY_MISSING',
        },
        { status: 401 }
      );
    }

    const body: SummarizeRequest = await request.json();
    const { messages, characterName, adventureTitle } = body;

    if (!messages || messages.length < 2) {
      return NextResponse.json(
        { error: 'Zbyt mało wiadomości do podsumowania' },
        { status: 400 }
      );
    }

    // Weź ostatnie 10 wiadomości (lub mniej jeśli nie ma tylu)
    const recentMessages = messages.slice(-10);

    // Przygotuj tekst do analizy
    const conversationText = recentMessages
      .map((m) => `${m.role === 'assistant' ? 'MG' : 'Gracz'}: ${m.content}`)
      .join('\n\n');

    const prompt = `Jesteś analitykiem sesji RPG. Przeanalizuj poniższy fragment rozgrywki i wygeneruj wpis do dziennika sesji.

KONTEKST:
- Postać gracza: ${characterName || 'Nieznany badacz'}
- Przygoda: ${adventureTitle || 'Nieznana przygoda'}

FRAGMENT ROZGRYWKI:
${conversationText}

ZADANIE:
Wygeneruj wpis do dziennika sesji w formacie JSON:

{
  "title": "Krótki tytuł sceny (3-5 słów)",
  "type": "discovery" | "combat" | "dialogue" | "investigation" | "horror" | "travel",
  "summary": "Zwięzłe podsumowanie co się wydarzyło (2-3 zdania w drugiej osobie, np. 'Odkryłeś...')",
  "location": "Nazwa miejsca gdzie rozgrywa się scena",
  "npcs": ["Lista imion NPC biorących udział"],
  "significance": "Dlaczego ta scena jest ważna dla fabuły (1 zdanie)",
  "playerActions": "Co gracz zrobił/zdecydował (1-2 zdania)"
}

Odpowiedz TYLKO poprawnym JSON-em, bez żadnego dodatkowego tekstu.`;

    const genAI = getGenAI(apiKey);

    const result = await genAI.models.generateContent({
      model: DEFAULT_GEMINI_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.7,
        maxOutputTokens: 1024,
        // IND-269: wymuś poprawny JSON - bez tego model bywa zwracał nie-JSON,
        // JSON.parse padał i wpis lądował jako fallback "Nieznana scena".
        responseMimeType: 'application/json',
      },
    });

    const text = result.text ?? '';

    // IND-269: parsuj surowy JSON, potem zmapuj na poprawny JournalEntry.
    let raw: RawSceneSummary;
    try {
      // Wyczyść markdown code blocks jeśli są (defense-in-depth obok responseMimeType)
      const cleanJson = text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      raw = JSON.parse(cleanJson) as RawSceneSummary;
    } catch {
      console.error('Failed to parse AI response as JSON:', text);
      // Fallback - prosty wpis (też przejdzie przez toJournalEntry → poprawny kształt)
      raw = {
        title: FALLBACK_TITLE,
        type: 'investigation',
        summary: 'Kontynuowałeś swoją przygodę...',
        location: 'Nieznane miejsce',
        npcs: [],
        significance: 'Dalsza część przygody.',
        playerActions: 'Eksploracja.',
      };
    }

    return NextResponse.json({
      success: true,
      entry: toJournalEntry(raw),
    });
  } catch (error) {
    console.error('Scene summarization error:', error);
    return NextResponse.json(
      { error: 'Błąd podczas generowania podsumowania sceny' },
      { status: 500 }
    );
  }
}
