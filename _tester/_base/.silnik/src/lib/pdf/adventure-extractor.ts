import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { AdventureStructure } from '@/types/adventure';

/**
 * Moduł Ekstraktora Encji Przygody korzystający z Gemini 3.6 Flash
 */
export async function extractAdventureEntities(
  pdfText: string,
  fileName: string,
  apiKey: string
): Promise<AdventureStructure> {
  const genAI = new GoogleGenerativeAI(apiKey);

  // Używamy opublikowanego 21 lipca 2026 r. modelu gemini-3.6-flash z JSON schema
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.6-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          adventureId: { type: SchemaType.STRING },
          title: { type: SchemaType.STRING },
          summary: { type: SchemaType.STRING },
          era: { type: SchemaType.STRING },
          npcs: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                id: { type: SchemaType.STRING },
                name: { type: SchemaType.STRING },
                role: { type: SchemaType.STRING },
                description: { type: SchemaType.STRING },
                mask: { type: SchemaType.STRING },
                hiddenGoal: { type: SchemaType.STRING },
                locationId: { type: SchemaType.STRING },
              },
              required: ['id', 'name', 'role', 'description', 'mask', 'hiddenGoal'],
            },
          },
          locations: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                id: { type: SchemaType.STRING },
                name: { type: SchemaType.STRING },
                description: { type: SchemaType.STRING },
                atmosphere: { type: SchemaType.STRING },
                keyClues: {
                  type: SchemaType.ARRAY,
                  items: { type: SchemaType.STRING },
                },
              },
              required: ['id', 'name', 'description', 'atmosphere', 'keyClues'],
            },
          },
          items: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                id: { type: SchemaType.STRING },
                name: { type: SchemaType.STRING },
                type: { type: SchemaType.STRING },
                description: { type: SchemaType.STRING },
                readContent: { type: SchemaType.STRING },
              },
              required: ['id', 'name', 'type', 'description'],
            },
          },
        },
        required: ['adventureId', 'title', 'summary', 'era', 'npcs', 'locations', 'items'],
      },
    },
  });

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

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();
  const parsed = JSON.parse(responseText) as AdventureStructure;

  parsed.extractedAt = new Date().toISOString();
  if (!parsed.adventureId) {
    parsed.adventureId = fileName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  }

  return parsed;
}
