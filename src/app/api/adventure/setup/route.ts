import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { DEFAULT_GEMINI_MODEL } from '@/lib/ai-providers/constants';

const getGenAI = (apiKey: string): GoogleGenAI => new GoogleGenAI({ apiKey });

interface SetupRequest {
  adventureText: string;
  characters: Array<{
    id: string;
    name: string;
    background: string;
    occupation: string;
  }>;
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

    const body: SetupRequest = await request.json();
    const { adventureText, characters } = body;

    if (!adventureText) {
      return NextResponse.json(
        { error: 'Brak tekstu przygody do przeanalizowania' },
        { status: 400 }
      );
    }

    const charactersSummary = characters && characters.length > 0
      ? characters.map(c => `- ${c.name} (${c.occupation}): ${c.background}`).join('\n')
      : 'Brak zdefiniowanych badaczy (generowanie domyślnego asymetrycznego setupu).';

    const prompt = `Jesteś zaawansowanym projektantem scenariuszy Call of Cthulhu RPG. Twoim zadaniem jest stworzenie nieliniowego setupu przygody w oparciu o dostarczony tekst scenariusza i karty badaczy.

BADACZE:
${charactersSummary}

TEKST PRZYGODY / NOTATKI:
${adventureText}

ZADANIE:
Przekształć tę przygodę w nieliniową strukturę konfliktu (Bunkier) i wygeneruj indywidualne asymetryczne plotki/haczyki. Zwróć wynik jako poprawny JSON o następującej strukturze:

{
  "conflicts": [
    {
      "resource": "Główny punkt zderzenia/obiekt/lokacja o którą toczy się spór (np. 'Złoty totem w kaplicy')",
      "factions": [
        {
          "id": "faction_1",
          "name": "Nazwa pierwszej frakcji/NPC",
          "description": "Krótki opis frakcji",
          "goal": "Czego konkretnie pożądają w odniesieniu do zasobu",
          "motivation": "Dlaczego tego chcą (głębokie pragnienie, np. strach przed śmiercią, chęć władzy)"
        },
        {
          "id": "faction_2",
          "name": "Nazwa drugiej frakcji/NPC",
          "description": "Krótki opis frakcji przeciwnej",
          "goal": "Czego pożądają sprzecznego",
          "motivation": "Dlaczego (ich motywacja)"
        }
      ]
    }
  ],
  "setupAsymmetry": {
    "rumors": [
      "Sprzeczna plotka #1 (ogólna, krążąca w miasteczku)",
      "Sprzeczna plotka #2 (podważająca plotkę #1)"
    ],
    "characterHooks": [
      {
        "characterId": "ID postaci (przepisz z wejścia dla kogo to jest)",
        "personalHook": "Indywidualny sekret lub osobisty powód zaangażowania w śledztwo, powiązany z tłem postaci i przygody"
      }
    ]
  }
}

Wygeneruj 1-2 główne konflikty oraz asymetryczne haczyki dla każdego z przesłanych badaczy. Odpowiedz wyłącznie czystym kodem JSON.`;

    const genAI = getGenAI(apiKey);

    const result = await genAI.models.generateContent({
      model: DEFAULT_GEMINI_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    });

    const text = result.text ?? '';
    const cleanJson = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const data = JSON.parse(cleanJson);

    return NextResponse.json({
      success: true,
      setup: data,
    });
  } catch (error) {
    console.error('Setup generation error:', error);
    return NextResponse.json(
      { error: 'Błąd podczas generowania setupu przygody' },
      { status: 500 }
    );
  }
}
