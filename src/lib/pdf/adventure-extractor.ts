import { GoogleGenAI, Type } from '@google/genai';
import { AdventureStructure } from '@/types/adventure';
import { DEFAULT_CHAT_MODEL } from '@/lib/model-registry';

/**
 * Moduł Ekstraktora Encji Przygody korzystający z Gemini 3.6 Flash
 */
export async function extractAdventureEntities(
  pdfText: string,
  fileName: string,
  apiKey: string
): Promise<AdventureStructure> {
  const ai = new GoogleGenAI({ apiKey });

  // Ograniczenie długości tekstu dla bezpieczeństwa kontekstu (pierwsze ~100k znaków to z reguły pełny opis scenariusza)
  const trimmedText = pdfText.slice(0, 100000);

  const prompt = `Przeanalizuj poniższy scenariusz przygody RPG (Call of Cthulhu / Zew Cthulhu) z pliku "${fileName}" i wyekstrahuj ustrukturyzowane dane w postaci JSON.

Kluczowe wytyczne:
1. Zidentyfikuj postacie (NPC) i podziel ich opis na:
   - maskę (publiczny wygląd, pierwsze wrażenie, zachowanie),
   - ukryty cel (tajny motyw, sekrety, powiązanie z kultem lub zagadką).
2. Zidentyfikuj kluczowe lokacje wraz z panującą atmosferą i wskazówkami (keyClues).
3. Zidentyfikuj rekwizyty i dokumenty (items), a jeśli w tekście jest podany ich dosłowny treść (np. list, pamiętnik), umieść go w readContent.

Tekst scenariusza:
${trimmedText}`;

  try {
    // Używamy opublikowanego modelu gemini-3.6-flash z rejestru z JSON schema
    const result = await ai.models.generateContent({
      model: DEFAULT_CHAT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            adventureId: { type: Type.STRING },
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
            era: { type: Type.STRING },
            npcs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  role: { type: Type.STRING },
                  description: { type: Type.STRING },
                  mask: { type: Type.STRING },
                  hiddenGoal: { type: Type.STRING },
                  locationId: { type: Type.STRING },
                },
                required: ['id', 'name', 'role', 'description', 'mask', 'hiddenGoal'],
              },
            },
            locations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  atmosphere: { type: Type.STRING },
                  keyClues: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['id', 'name', 'description', 'atmosphere', 'keyClues'],
              },
            },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  type: { type: Type.STRING },
                  description: { type: Type.STRING },
                  readContent: { type: Type.STRING },
                },
                required: ['id', 'name', 'type', 'description'],
              },
            },
          },
          required: ['adventureId', 'title', 'summary', 'era', 'npcs', 'locations', 'items'],
        },
      },
    });

    const responseText = result.text?.trim() ?? '';
    if (!responseText) {
      throw new Error('Gemini API zwróciło pustą odpowiedź podczas ekstrakcji.');
    }

    const parsed = JSON.parse(responseText) as Partial<AdventureStructure>;

    const sanitizeId = (str?: string) =>
      (str || '').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();

    const adventureId =
      sanitizeId(parsed.adventureId) ||
      sanitizeId(fileName) ||
      'adventure_default';

    return {
      adventureId,
      title: parsed.title || fileName,
      summary: parsed.summary || '',
      era: parsed.era || '1920s',
      npcs: Array.isArray(parsed.npcs) ? parsed.npcs : [],
      locations: Array.isArray(parsed.locations) ? parsed.locations : [],
      items: Array.isArray(parsed.items) ? parsed.items : [],
      extractedAt: new Date().toISOString(),
    };
  } catch (error) {
    throw new Error(
      `Błąd ekstrakcji przygody: ${error instanceof Error ? error.message : 'Nieznany błąd'}`
    );
  }
}

