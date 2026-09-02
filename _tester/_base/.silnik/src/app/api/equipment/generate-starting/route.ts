/**
 * Deterministyczny endpoint wyposażenia startowego.
 * AI nie wybiera przedmiotów, mechaniki, dostępności ani wartości.
 */

import { NextRequest, NextResponse } from 'next/server';
import type { EquipmentItem, EquipmentVisualEra } from '@/lib/types';
import {
  findEquipmentByName,
  createEquipmentItem,
  OCCUPATION_EQUIPMENT_ALIASES,
  getStartingEquipmentForOccupation,
} from '@/lib/equipment-data';
import {
  looksLikeWeapon,
  inferWeaponDamage,
} from '@/lib/combat/weapon-context';
import { resolveEraVisualProfile } from '@/lib/era-visual-style';

export async function POST(request: NextRequest) {
  try {
    const {
      occupation,
      era,
      creditRating = 30,
    } = await request.json();

    if (!occupation) {
      return NextResponse.json(
        { error: 'Occupation is required' },
        { status: 400 }
      );
    }

    if (typeof era !== 'string' || !era.trim()) {
      return NextResponse.json(
        { error: 'Exact era or year is required' },
        { status: 400 }
      );
    }

    const predefinedItems = getStartingEquipmentForOccupation(occupation);

    // Twórz przedmioty z predefiniowanej listy
    const equipment: EquipmentItem[] = [];
    const targetEra = resolveEraVisualProfile(era) as EquipmentVisualEra;

    for (const itemName of predefinedItems) {
      const template = findEquipmentByName(itemName);
      if (template) {
        equipment.push(createEquipmentItem(template, 'starting', targetEra));
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
            equipment.push(createEquipmentItem(template, 'starting', targetEra));
          }
        }
      }
    }

    console.log(
      `✅ Generated ${equipment.length} starting items for ${occupation}`
    );

    return NextResponse.json({
      success: true,
      equipment,
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
    mode: 'deterministic',
    aiEnrichment: false,
    occupations: Object.keys(OCCUPATION_EQUIPMENT_ALIASES),
  });
}
