/**
 * Analyze Image API Endpoint
 * Używa Gemini Vision do analizy obrazów (portrety NPC, lokalizacje, ilustracje)
 */

import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { fetchImageAsBase64 } from '@/lib/image-utils';
import { DEFAULT_GEMINI_MODEL } from '@/lib/ai-providers/constants';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI: GoogleGenAI | null = GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: GEMINI_API_KEY })
  : null;

export async function POST(request: NextRequest) {
  try {
    if (!genAI || !GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API nie jest skonfigurowane' },
        { status: 500 }
      );
    }

    const { imageUrl, prompt, context } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'imageUrl jest wymagany' },
        { status: 400 }
      );
    }

    // Pobierz obraz i przekonwertuj na base64
    const imageData = await fetchImageAsBase64(imageUrl);

    if (!imageData) {
      return NextResponse.json(
        { error: 'Nie udało się pobrać obrazu' },
        { status: 400 }
      );
    }

    console.log(`🖼️ Analyzing image: ${imageUrl.substring(0, 50)}...`);

    // Domyślny prompt do analizy obrazu w kontekście RPG
    const analysisPrompt =
      prompt ||
      `Opisz ten obraz w kontekście gry Call of Cthulhu.
Skup się na:
- Wyglądzie postaci (jeśli to portret)
- Atmosferze i nastroju
- Detalkach które mogłyby być istotne fabularnie
Odpowiedz po polsku, zwięźle (2-3 zdania).`;

    // Dodaj kontekst jeśli podany
    const fullPrompt = context
      ? `${context}\n\n${analysisPrompt}`
      : analysisPrompt;

    // Wywołaj Gemini z obrazem (szybki i tani dla analizy)
    const result = await genAI.models.generateContent({
      model: DEFAULT_GEMINI_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: imageData.mimeType,
                data: imageData.data,
              },
            },
            { text: fullPrompt },
          ],
        },
      ],
      config: {
        temperature: 0.4,
        maxOutputTokens: 500,
      },
    });

    const description = result.text ?? '';

    console.log(
      `✅ Image analysis complete: ${description.substring(0, 100)}...`
    );

    return NextResponse.json({
      success: true,
      description,
      imageUrl,
    });
  } catch (error) {
    console.error('❌ Image analysis error:', error);

    return NextResponse.json(
      {
        error: 'Błąd analizy obrazu',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
