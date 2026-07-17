import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { SUMMARY_SYSTEM_PROMPT, SUMMARY_MODEL } from '@/lib/auto-summary-service';

/**
 * API Endpoint: /api/context/summarize
 * 
 * Streszcza wiadomości używając Gemini Flash
 */

const DEFAULT_GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request: NextRequest) {
    try {
        const { action, text, messages, model } = await request.json();

        if (!text && !messages) {
            return NextResponse.json(
                { error: 'text or messages are required' },
                { status: 400 }
            );
        }

        // Pobierz klucz API
        const headerApiKey = request.headers.get('X-Gemini-Api-Key');
        const apiKey = headerApiKey || DEFAULT_GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: 'Gemini API key not configured' },
                { status: 401 }
            );
        }

        const ai = new GoogleGenAI({ apiKey });
        const summaryModel = model || SUMMARY_MODEL;

        // Przygotuj tekst do streszczenia
        let inputText = text;
        if (!inputText && messages) {
            inputText = messages
                .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'GRACZ' : 'MG'}: ${m.content}`)
                .join('\n\n');
        }

        const prompt = `${SUMMARY_SYSTEM_PROMPT}

---

TEKST DO STRESZCZENIA:

${inputText.slice(0, 8000)}

---

Odpowiedź w formacie JSON:
{
  "summary": "Główne streszczenie (3-5 zdań)",
  "keyFacts": ["fakt 1", "fakt 2", ...],
  "mentionedNPCs": ["imię NPC 1", "imię NPC 2", ...],
  "mentionedLocations": ["lokacja 1", "lokacja 2", ...]
}`;

        // Wywołaj Gemini
        const result = await ai.models.generateContent({
            model: summaryModel,
            contents: prompt,
            config: {
                temperature: 0.3,  // Niska temperatura dla spójnych streszczeń
                maxOutputTokens: 500,
            },
        });
        let responseText = result.text ?? '';

        // Parsuj JSON z odpowiedzi
        try {
            // Wyczyść odpowiedź z markdown code blocks
            responseText = responseText
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();

            const parsed = JSON.parse(responseText);

            return NextResponse.json({
                success: true,
                summary: parsed.summary || '',
                keyFacts: parsed.keyFacts || [],
                mentionedNPCs: parsed.mentionedNPCs || [],
                mentionedLocations: parsed.mentionedLocations || [],
                model: summaryModel
            });

        } catch (parseError) {
            // Fallback - użyj surowego tekstu jako streszczenia
            console.warn('⚠️ Failed to parse JSON, using raw text');

            return NextResponse.json({
                success: true,
                summary: responseText.slice(0, 500),
                keyFacts: [],
                mentionedNPCs: [],
                mentionedLocations: [],
                model: summaryModel
            });
        }

    } catch (error) {
        console.error('Error generating summary:', error);
        return NextResponse.json(
            { error: 'Failed to generate summary', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
