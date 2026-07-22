import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { DEFAULT_GEMINI_MODEL } from '@/lib/ai-providers/constants';

export async function POST(request: NextRequest) {
  try {
    const { prompt, style, quality, aspectRatio } = await request.json();

    // Sprawdź czy klucz API jest dostępny
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    // Walidacja danych wejściowych
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Invalid prompt provided' },
        { status: 400 }
      );
    }

    // Inicjalizacja Gemini z oficjalną biblioteką
    const ai = new GoogleGenAI({ apiKey });

    try {
      // Spróbuj użyć Gemini Imagen do generowania obrazów
      const result = await ai.models.generateContent({
        model: DEFAULT_GEMINI_MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: Buffer.from('placeholder').toString('base64'),
                },
              },
            ],
          },
        ],
      });

      // Jeśli się udało, zwróć wynik
      const generatedImage = {
        id: Date.now().toString(),
        prompt,
        imageUrl: `/api/placeholder-image?text=${encodeURIComponent(prompt)}&style=${style || 'realistic'}`,
        timestamp: new Date(),
        cost: 0.02,
        metadata: {
          style: style || 'realistic',
          quality: quality || 'medium',
          aspectRatio: aspectRatio || '1:1',
          apiResponse: result,
          note: 'Image generation attempted with Gemini Imagen',
        },
      };

      return NextResponse.json(generatedImage);
    } catch (imagenError) {
      console.log(`Gemini Imagen failed, trying fallback to ${DEFAULT_GEMINI_MODEL}...`);

      // Fallback do głównego modelu chatu
      const fallbackResult = await ai.models.generateContent({
        model: DEFAULT_GEMINI_MODEL,
        contents: `Generate an image description: ${prompt}. Style: ${style || 'realistic'}. Quality: ${quality || 'medium'}. Aspect ratio: ${aspectRatio || '1:1'}.`,
      });

      // Gemini nie może generować obrazów, więc zwracamy placeholder z opisem
      const generatedImage = {
        id: Date.now().toString(),
        prompt,
        imageUrl: `/api/placeholder-image?text=${encodeURIComponent(prompt)}&style=${style || 'realistic'}`,
        timestamp: new Date(),
        cost: 0.02,
        metadata: {
          style: style || 'realistic',
          quality: quality || 'medium',
          aspectRatio: aspectRatio || '1:1',
          apiResponse: fallbackResult,
          note: 'Gemini cannot generate images directly. Using placeholder with generated description.',
          generatedDescription: fallbackResult.text ?? '',
        },
      };

      return NextResponse.json(generatedImage);
    }
  } catch (error) {
    console.error('Gemini API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate image',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
