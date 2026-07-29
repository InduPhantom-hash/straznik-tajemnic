import { NextResponse } from 'next/server';
import { getGeminiClient } from '@/lib/gemini-client-pool';
import { DEFAULT_CHAT_MODEL } from '@/lib/model-registry';

/**
 * Szablon / Szkielet (Scaffold) dla Adventure Creator Engine (Etap 4).
 * Silnik odpowiada za wygenerowanie grafu fabularnego na podstawie analiz z dziedziny narratologii.
 * W przyszłości połączy się z SQLite w celu persystencji struktury kampanii.
 */

const NARRATOLOGY_SYSTEM_PROMPT = `
Jesteś Głównym Reżyserem (Adventure Creator) w grze Zew Cthulhu.
Twoim zadaniem jest wygenerowanie struktury kampanii w postaci grafu JSON.

Będziesz bazował na naukowych strukturach narratologicznych Weird Fiction:
1. 4 Akty Obłędu (Wprowadzenie, Śledztwo, Konfrontacja z Niepojętym, Upadek/Ucieczka)
2. Niewiarygodny Narrator (Zacieranie granicy między jawą a snem)
3. Oneiromancja i oniryzm (Złudzenia zmysłowe rosnące wraz z biegiem fabuły)

Odpowiedz ZAWSZE w formacie czystego JSON:
{
  "title": "Tytuł kampanii",
  "nodes": [
    {
      "id": "scene_1",
      "title": "Tytuł Sceny",
      "act": 1,
      "description": "Opis",
      "sensory_illusions": "Czy narrator widzi/czuje coś, co nie jest prawdą?",
      "connections": ["scene_2", "scene_3"]
    }
  ]
}
`;

export async function POST(req: Request) {
  try {
    const { theme, apiKey } = await req.json();

    if (!theme) {
      return NextResponse.json({ error: 'Brak motywu (theme)' }, { status: 400 });
    }

    const ai = getGeminiClient(apiKey || process.env.GEMINI_API_KEY);
    if (!ai) {
      return NextResponse.json({ error: 'Brak klucza API' }, { status: 500 });
    }

    // Call LLM for generation
    const response = await ai.models.generateContent({
      model: DEFAULT_CHAT_MODEL, // default model for large generation
      contents: `Wygeneruj graf dla motywu: ${theme}`,
      config: {
        systemInstruction: NARRATOLOGY_SYSTEM_PROMPT,
        temperature: 0.7,
        responseMimeType: 'application/json',
      },
    });

    const jsonText = response.text ?? '';
    let graphData = null;
    
    try {
      graphData = JSON.parse(jsonText || '{}');
    } catch (e) {
      console.error('Błąd parsowania JSON grafu przygody:', e);
      return NextResponse.json({ error: 'LLM zwrócił nieprawidłowy format JSON' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Wygenerowano szkielet kampanii.',
      graph: graphData
    });

  } catch (error: any) {
    console.error('Adventure Creator Error:', error);
    return NextResponse.json(
      { error: error.message || 'Wewnętrzny błąd serwera' },
      { status: 500 }
    );
  }
}
