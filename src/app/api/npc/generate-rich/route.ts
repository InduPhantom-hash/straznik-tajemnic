import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { DEFAULT_GEMINI_MODEL } from '@/lib/ai-providers/constants';

const getGenAI = (apiKey: string): GoogleGenAI => new GoogleGenAI({ apiKey });

interface NPCGenerateRequest {
  adventureTitle?: string;
  locationContext?: string;
  importance?: 'key' | 'background'; // kluczowy vs epizodyczny
  gender?: 'm' | 'f' | 'any';
  era?: string;
}

export async function POST(request: NextRequest) {
  try {
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

    const body: NPCGenerateRequest = await request.json();
    const { adventureTitle, locationContext, importance = 'background', gender = 'any', era = '1920s' } = body;

    const importancePrompt = importance === 'key'
      ? `Jest to KLUCZOWY bohater niezależny dla fabuły. Musi mieć zdefiniowany głęboki cel, motywację opartą na jego psychice/pragnieniach, ewentualne ukryte powiązania z intrygą oraz unikalny sznyt zachowania (np. tiki nerwowe, niezwykły ubiór np. burleska, nienaturalny spokój).`
      : `Jest to bohater EPIZODYCZNY (postać tła, np. gazeciarz, przechodzień, kelner). Nie twórz dla niego głębokiego tła ani skomplikowanej przeszłości. Skup się wyłącznie na jego zmysłowym zarysie i 1-2 cechach charakterystycznych.`;

    const prompt = `Jesteś generatorem barwnych postaci (NPC) do gry RPG Call of Cthulhu (era: ${era}).
Przygoda: ${adventureTitle || 'Tajemnicza sprawa'}
Aktualne miejsce spotkania / kontekst: ${locationContext || 'Miasteczko'}

ZADANIE:
Wygeneruj unikalnego bohatera niezależnego (płeć: ${gender === 'any' ? 'dowolna' : gender === 'm' ? 'mężczyzna' : 'kobieta'}).
${importancePrompt}

ZASADY TWORZENIA:
1. **Sensoryczny Opis i Cechy Kontrastowe**: Daj mu 1-2 wyraziste cechy fizyczne (np. chude, patykowate ręce przy wielkim brzuchu; wiecznie wilgotna skóra; intensywny zapach nafty; elegancki cylinder sparowany z dziurawym płaszczem).
2. **Głos i Socjolekt (Dorosłe brzmienie)**: Opisz styl wymowy NPC. Postacie mogą używać dorosłego języka (wulgaryzmy, szorstkość, strach) adekwatnego do ich pochodzenia (np. zacinanie się w stresie, charakterystyczny dialekt, seplenienie, język bardzo naukowy).
3. **Zmysłowe zakotwiczenie**: Opisz, jak postać wpisuje się w atmosferę miejsca (np. barman, z którego ubrań unosi się zapach stęchłego piwa, wycierający wiecznie lepką ladę).
4. **Triggery Akcji**: Przypisz postaci jedno mikrowydarzenie (np. nagle gubi klucze, potyka się, nerwowo rozlewa kawę, ucieka przed bezpańskim psem), które inicjuje interakcję z graczami, zamiast stać w miejscu jak kołek.

Zwróć wynik jako poprawny JSON o następującej strukturze:

{
  "name": "Imię i nazwisko postaci",
  "importance": "${importance}",
  "description": "Sensoryczny opis fizyczny i ubiór (2-3 zdania)",
  "speechStyle": "Opis socjolektu/wady wymowy i sposobu wypowiadania się",
  "quote": "Przykładowa krótka wypowiedź postaci (np. 'P-panowie... c-czego tu s-szukacie?!')",
  "behavior": "Sposób zachowania, tiki, co robi w danej chwili",
  "goal": "Czego chce w danej chwili (krótkofalowy cel)",
  "secretOrBackground": "Głęboka motywacja lub sekret (tylko jeśli kluczowy, dla epizodycznych zostaw puste)",
  "microEvent": "Mikrowydarzenie aktywujące interakcję"
}

Odpowiedz wyłącznie czystym kodem JSON.`;

    const genAI = getGenAI(apiKey);

    const result = await genAI.models.generateContent({
      model: DEFAULT_GEMINI_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.8,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
      },
    });

    const text = result.text ?? '';
    const cleanJson = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const npcData = JSON.parse(cleanJson);

    return NextResponse.json({
      success: true,
      npc: npcData,
    });
  } catch (error) {
    console.error('NPC generation error:', error);
    return NextResponse.json(
      { error: 'Błąd podczas generowania bohatera niezależnego' },
      { status: 500 }
    );
  }
}
