/**
 * API endpoint do generowania startowego ekwipunku przez AI
 * Używa zawodu, ery i Credit Rating do wygenerowania logicznej listy przedmiotów
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { EquipmentItem } from '@/lib/types';
import {
  OCCUPATION_EQUIPMENT,
  findEquipmentByName,
  createEquipmentItem,
  withEquipmentDefaults,
} from '@/lib/equipment-data';
import {
  looksLikeWeapon,
  inferWeaponDamage,
} from '@/lib/combat/weapon-context';
import { stripAITags } from '@/lib/parsers/text-cleaner';
import { DEFAULT_GEMINI_MODEL_LITE } from '@/lib/ai-providers/constants';
import { resolveEraVisualProfile } from '@/lib/era-visual-style';

export async function POST(request: NextRequest) {
  try {
    const {
      occupation,
      era = '1920s',
      creditRating = 30,
      characterName = 'Badacz',
    } = await request.json();

    if (!occupation) {
      return NextResponse.json(
        { error: 'Occupation is required' },
        { status: 400 }
      );
    }

    // Sprawdź czy mamy predefiniowany ekwipunek dla zawodu
    const predefinedItems =
      OCCUPATION_EQUIPMENT[occupation] || OCCUPATION_EQUIPMENT['default'];

    // Twórz przedmioty z predefiniowanej listy
    const equipment: EquipmentItem[] = [];
    const visualEra = resolveEraVisualProfile(era);

    for (const itemName of predefinedItems) {
      const template = findEquipmentByName(itemName);
      if (template) {
        equipment.push(createEquipmentItem(template, 'starting', visualEra));
      } else {
        // Brak szablonu (np. polska nazwa "Rewolwer .38" nie pasuje do bazy
        // anglojęzycznej). Jeśli nazwa wygląda na broń, nadaj kategorię 'weapon'
        // + obrażenia/zasięg z tabeli CoC 7e, żeby modal pokazywał pełną mechanikę.
        const probe: EquipmentItem = {
          id: `eq_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          name: itemName,
          category: 'personal',
          description: `Standardowy przedmiot dla zawodu ${occupation}`,
          condition: 'used',
          source: 'starting',
          obtainedAt: new Date(),
        };
        if (looksLikeWeapon(probe)) {
          const inferred = inferWeaponDamage(probe);
          probe.category = 'weapon';
          if (inferred) {
            probe.modifiers = {
              damage: inferred.damage,
              ...(inferred.range ? { range: inferred.range } : {}),
            };
          }
        }
        equipment.push(probe);
      }
    }

    // Dodaj przedmioty zależne od Credit Rating
    if (creditRating >= 50) {
      // Bogatsza postać - dodatkowe przedmioty
      const wealthyItems = ['Pocket Watch', 'Cigarette Case', 'Hip Flask'];
      for (const itemName of wealthyItems) {
        if (!equipment.some((e) => e.name === itemName)) {
          const template = findEquipmentByName(itemName);
          if (template) {
            equipment.push(
              createEquipmentItem(template, 'starting', visualEra)
            );
          }
        }
      }
    }

    // Opcjonalnie: użyj AI do wzbogacenia opisów (jeśli klucz API dostępny)
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && equipment.length > 0) {
      try {
        const genAI = new GoogleGenAI({ apiKey });

        const prompt = `Jesteś ekspertem od Call of Cthulhu RPG.
Dla postaci: ${characterName} (zawód: ${occupation}, era: ${era})
Dla każdego przedmiotu podaj: krótki (1-2 zdania) opis pasujący do postaci i ery
oraz wartość w dolarach z epoki ${era} (value, liczba). NIE podawaj wagi - Call of
Cthulhu 7e nie używa systemu udźwigu.
Odpowiedz TYLKO jako JSON array z obiektami {name, description, value}.
NIE używaj żadnych tagów w nawiasach kwadratowych (np. [PRZEDMIOT], [NPC], [NASTRÓJ]).
Pisz czyste, literackie opisy bez znaczników.

Przedmioty:
${equipment.map((e) => e.name).join('\n')}`;

        const result = await genAI.models.generateContent({
          model: DEFAULT_GEMINI_MODEL_LITE,
          contents: prompt,
        });
        const responseText = result.text ?? '';

        // Parsuj odpowiedź JSON
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const enrichedItems = JSON.parse(jsonMatch[0]) as {
            name: string;
            description: string;
            value?: number;
          }[];

          // Aktualizuj opisy + uzupełnij value tam, gdzie szablon go nie dał (nie
          // nadpisuj wartości z bazy szablonów). Faza 4: wagi nie przypisujemy (RAW).
          for (const enriched of enrichedItems) {
            const item = equipment.find(
              (e) => e.name.toLowerCase() === enriched.name.toLowerCase()
            );
            if (!item) continue;
            if (enriched.description) {
              item.description = stripAITags(enriched.description);
            }
            if (
              item.value === undefined &&
              typeof enriched.value === 'number'
            ) {
              item.value = enriched.value;
            }
          }
        }
      } catch (aiError) {
        console.warn(
          'AI enrichment failed, using default descriptions:',
          aiError
        );
        // Kontynuuj z domyślnymi opisami
      }
    }

    // Faza 4 (ekonomia RAW): uzupełnij brakujące value (cena referencyjna); wagi nie
    // dopisujemy - zamożność postaci opisuje Credit Rating (lib/economy), nie suma $.
    const finalEquipment = withEquipmentDefaults(equipment);

    console.log(
      `✅ Generated ${finalEquipment.length} starting items for ${occupation}`
    );

    return NextResponse.json({
      success: true,
      equipment: finalEquipment,
      occupation,
      era,
      creditRating,
      message: `Wygenerowano ${equipment.length} przedmiotów startowych dla zawodu ${occupation}`,
    });
  } catch (error) {
    console.error('Equipment generation error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate equipment',
      },
      { status: 500 }
    );
  }
}

// GET - zwraca listę dostępnych zawodów z ekwipunkiem
export async function GET() {
  return NextResponse.json({
    occupations: Object.keys(OCCUPATION_EQUIPMENT),
    totalItems: Object.values(OCCUPATION_EQUIPMENT).flat().length,
  });
}
