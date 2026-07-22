import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { inferWeaponDamage, inferWeaponSkill, isWeapon } from '@/lib/combat/weapon-context';
import type { EquipmentCategory, EquipmentItem, EquipmentModifiers } from '@/lib/types';

interface EnrichRequest {
  name: string;
  description?: string;
  category?: EquipmentCategory;
  era?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: EnrichRequest = await req.json();
    const { name, description = '', category = 'tool', era = '1920s' } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Brak nazwy przedmiotu' },
        { status: 400 }
      );
    }

    // Domniemana broń na podstawie podanej nazwy/kategorii
    const dummyItem: EquipmentItem = {
      id: 'temp',
      name,
      category,
      description,
    };
    const looksWeapon = category === 'weapon' || isWeapon(dummyItem);
    const weaponInfo = looksWeapon ? inferWeaponDamage(dummyItem) : undefined;
    const inferredDamage = typeof weaponInfo === 'string' ? weaponInfo : weaponInfo?.damage;
    const inferredRange = typeof weaponInfo === 'object' ? weaponInfo?.range : undefined;
    const inferredSkill = looksWeapon ? inferWeaponSkill(dummyItem) : undefined;

    const apiKey =
      req.headers.get('X-Gemini-Api-Key') ||
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    // Fallback gdy brak klucza API
    if (!apiKey) {
      const fallbackModifiers: EquipmentModifiers | undefined = looksWeapon
        ? {
            ...(inferredDamage ? { damage: inferredDamage } : {}),
            ...(inferredRange ? { range: inferredRange } : {}),
            ...(inferredSkill ? { skill: inferredSkill } : {}),
          }
        : undefined;

      return NextResponse.json({
        name,
        description: description || `Przedmiot epoki ${era}, przydatny w trakcie śledztwa.`,
        category: looksWeapon ? 'weapon' : category,
        value: looksWeapon ? 25 : 5,
        weight: looksWeapon ? 2 : 1,
        modifiers: fallbackModifiers,
        enriched: false,
      });
    }

    // AI Enrichment przez Gemini Flash
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.6-flash',
    });

    const prompt = `Jesteś ekspertem ds. ekwipunku Call of Cthulhu 7e z epoki ${era}. Przeanalizuj i wzbogać przedmiot:
Nazwa: "${name}"
Początkowy opis: "${description}"
Kategoria: "${category}"

Wygeneruj wyłącznie czysty obiekt JSON (bez znaczników markdown) zawierający polskie pola:
{
  "description": "Zwięzły, sensoryczny opis z fakturą, wykończeniem i historią z epoki (max 2 zdania)",
  "value": "Szacunkowa wartość w dolarach USD z epoki 1920s (liczba całkowita)",
  "weight": "Waga w kg lub funtach (liczba)",
  "damage": "Obrażenia broni w formacie CoC 7e (np. 1d6, 1d10+2) lub null jeśli to nie broń",
  "skill": "Umiejętność CoC 7e (np. Broń Palna (Krótka), Walka Wręcz (Bijatyka)) lub null"
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Defensywne czyszczenie i parsowanie JSON
    const cleanJsonText = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let aiData: any = {};
    try {
      aiData = JSON.parse(cleanJsonText);
    } catch (parseErr) {
      console.warn('Enrich JSON parse warning, fallbacking text:', parseErr);
    }

    const finalDescription =
      aiData.description || description || `Przedmiot z epoki ${era}.`;
    const finalValue =
      typeof aiData.value === 'number' ? aiData.value : looksWeapon ? 25 : 5;
    const finalWeight = typeof aiData.weight === 'number' ? aiData.weight : 1;

    const damage = typeof aiData.damage === 'string' ? aiData.damage : inferredDamage;
    const skill = typeof aiData.skill === 'string' ? aiData.skill : inferredSkill;

    const modifiers: EquipmentModifiers | undefined =
      damage || skill || inferredRange
        ? {
            ...(damage ? { damage } : {}),
            ...(inferredRange ? { range: inferredRange } : {}),
            ...(skill ? { skill } : {}),
          }
        : undefined;

    return NextResponse.json({
      name,
      description: finalDescription,
      category: looksWeapon ? 'weapon' : category,
      value: finalValue,
      weight: finalWeight,
      modifiers,
      enriched: true,
    });
  } catch (error) {
    console.error('Błąd w /api/equipment/enrich:', error);
    return NextResponse.json(
      { error: 'Nie udało się wzbogacić przedmiotu' },
      { status: 500 }
    );
  }
}
