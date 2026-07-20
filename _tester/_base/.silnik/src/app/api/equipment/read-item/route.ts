import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { DEFAULT_GEMINI_MODEL_LITE } from '@/lib/ai-providers/constants';
import { stripAITags } from '@/lib/parsers/text-cleaner';

function resolveGeminiApiKey(request: NextRequest): string | null {
  const key = request.headers.get('X-Gemini-Api-Key')?.trim();
  return key || process.env.GEMINI_API_KEY?.trim() || null;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = resolveGeminiApiKey(request);
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Klucz Gemini API jest wymagany' },
        { status: 401 }
      );
    }

    const {
      item,
      character,
      adventureContext,
      gameTime,
      currentLocation,
      recentHistory = [],
    } = await request.json();

    if (!item?.name) {
      return NextResponse.json(
        { error: 'Brak danych przedmiotu' },
        { status: 400 }
      );
    }

    const era = adventureContext?.eraLabel || '1920s';
    const tone = adventureContext?.tone || 'purist';
    const characterName = character?.name || 'badacz';
    const occupation = character?.occupation || 'cywil';
    
    const historySummary = recentHistory
      .slice(-4)
      .map((h: { role: string; content: string }) => `${h.role === 'user' ? 'Gracz' : 'MG'}: ${h.content.slice(0, 150)}`)
      .join('\n');

    const prompt = `Jesteś Mistrzem Gry w systemie Call of Cthulhu 7e.
Twoim zadaniem jest napisanie RZECZYWISTEJ TREŚCI dokumentu, który badacz właśnie czyta w grze.
Dokument: ${item.name}
Opis przedmiotu: ${item.description || 'brak dodatkowego opisu'}

Kontekst sesji i przygody:
- Badacz: ${characterName} (zawód: ${occupation})
- Epoka / Era: ${era}
- Lokacja, w której badacz się znajduje: ${currentLocation || 'nieznana'}
- Styl / Ton opowieści: ${tone}
- Czas w grze: ${gameTime ? `${gameTime.day}.${gameTime.month + 1}.${gameTime.year} o ${gameTime.hour}:${gameTime.minute}` : 'nieznany'}

Ostatnie wydarzenia fabularne (kontekst):
${historySummary || 'brak wcześniejszej historii'}

WYMAGANIA:
1. Napisz RZECZYWISTĄ treść dokumentu (np. listu, pamiętnika, artykułu z prasy). 
2. Pisz w 1. osobie (autor dokumentu) lub w tonie diegetycznym pasującym do tego typu zapisu.
3. Styl musi być mroczny, lovecraftowski, z epoki ${era}. Pokaż emocje autora (np. strach, determinację, szaleństwo).
4. Nie pisz wstępów ani komentarzy Mistrza Gry (np. NIE pisz "Oto co czytasz:", NIE wstawiaj tagów typu [PRZEDMIOT] ani [MYŚLI_MG]).
5. Zwróć WYŁĄCZNIE czystą treść dokumentu, gotową do natychmiastowego przeczytania przez gracza. Max 2-4 krótkie akapity.`;

    const genAI = new GoogleGenAI({ apiKey });
    const result = await genAI.models.generateContent({
      model: DEFAULT_GEMINI_MODEL_LITE,
      contents: prompt,
    });

    const rawText = result.text || '';
    const cleanText = stripAITags(rawText).trim();

    return NextResponse.json({
      success: true,
      content: cleanText,
    });
  } catch (error) {
    console.error('Error generating readable item content:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Nie udało się wygenerować treści przedmiotu',
      },
      { status: 500 }
    );
  }
}

