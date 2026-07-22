import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { DEFAULT_GEMINI_MODEL } from '@/lib/ai-providers/constants';

const getGenAI = (apiKey: string): GoogleGenAI => new GoogleGenAI({ apiKey });

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface CliffhangerRequest {
  messages: Message[];
  characterName?: string;
  adventureTitle?: string;
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

    const body: CliffhangerRequest = await request.json();
    const { messages, characterName, adventureTitle } = body;

    if (!messages || messages.length < 2) {
      return NextResponse.json(
        { error: 'Zbyt mało wiadomości do sformułowania cliffhangera' },
        { status: 400 }
      );
    }

    // Weź ostatnie 6 wiadomości (lub mniej)
    const recentMessages = messages.slice(-6);

    const conversationText = recentMessages
      .map((m) => `${m.role === 'assistant' ? 'MG' : 'Gracz'}: ${m.content}`)
      .join('\n\n');

    const prompt = `Jesteś Mistrzem Gry (Strażnikiem Tajemnic) w mrocznym świecie Call of Cthulhu. Prowadzisz grę dla gracza o imieniu: ${characterName || 'Badacz'}. Przygoda: ${adventureTitle || 'Nieznana przygoda'}.
Sesja właśnie dobiega końca. Twoim zadaniem jest uciąć akcję w piku emocjonalnym (NAGLE), stawiając jasne, niepokojące pytanie dramaturgiczne lub opisując niespodziewane, niepokojące wydarzenie, które zawiesza akcję w próżni.

ZASADY:
- Bądź niezwykle nagły. Utnij akcję w ułamku sekundy, przerywając aktualny wątek (np. tuż przed rzutem kostką, otwarciem drzwi lub przed uderzeniem potwora).
- Zastosuj jeden z trzech trybów cliffhangera na podstawie ostatniego fragmentu:
  1. PYTANIE DRAMATURGICZNE (np. "Czy zdołasz pociągnąć za spust, zanim zimne palce zacisną się na twoim gardle?")
  2. NADAJĄCE WYDARZENIE ZEWNĘTRZNE (np. "W tym momencie żarówka pęka z głośnym hukiem, a w absolutnej ciemności słyszysz chrobot pazurów tuż obok...")
  3. DYLEMAT MORALNY (np. "Musisz wybrać natychmiast - ratujesz uciekające dziecko czy zabierasz księgę z płomieni?")
- Używaj mrocznego, sensorycznego, klimatycznego języka Lovecrafta (skup się na jednym detalu: chłód, smród stęchlizny, dziwny dźwięk).
- Twoja odpowiedź must zakończyć się dramatycznym pytaniem lub zdaniem zawieszonym w próżni.
- NIE odpowiadaj JSON-em. Odpowiedz czystą, klimatyczną narracją w drugiej osobie liczby pojedynczej ("widzisz", "słyszysz", "musisz").

OSTATNI FRAGMENT ROZGRYWKI:
${conversationText}

Napisz nagły cliffhanger:`;

    const genAI = getGenAI(apiKey);

    const result = await genAI.models.generateContent({
      model: DEFAULT_GEMINI_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.85,
        maxOutputTokens: 500,
      },
    });

    const cliffhangerText = result.text?.trim() ?? 'Nagle zapada absolutna ciemność...';

    // Lovecraftowskie klimatyczne pożegnania dla Outra
    const outroTemplates = [
      "Mrok nie śpi, a cienie Arkham wydłużają się w nieskończoność. Dziękujemy za wspólną sesję.",
      "Kolejna strona zapisków zostaje zamknięta, lecz pradawny strach czeka w uśpieniu. Do zobaczenia na kolejnej sesji.",
      "Czy to był tylko sen, czy prawda, która powoli odbiera ci zmysły? Dziękujemy za wspólną grę.",
      "Cienie gęstnieją, a gwiazdy sprzyjają nieuniknionemu. Dziękujemy za wspólną sesję.",
      "Wasze umysły na chwilę wracają do względnego spokoju... ale koszmar wciąż trwa w ukryciu. Dziękujemy za wspólną sesję."
    ];
    const outro = outroTemplates[Math.floor(Math.random() * outroTemplates.length)];

    return NextResponse.json({
      success: true,
      cliffhanger: cliffhangerText,
      outro: outro,
    });
  } catch (error) {
    console.error('Cliffhanger generation error:', error);
    return NextResponse.json(
      { error: 'Błąd podczas generowania cliffhangera' },
      { status: 500 }
    );
  }
}
