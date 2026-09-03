import type { EquipmentCategory } from '../types';
import type { EquipmentEvent, EquipmentEventAction } from './types';

/**
 * Parsuje tagi manipulacji ekwipunkiem z tekstu generowanego przez AI GM:
 *
 * 1. Użycie / zużycie zasobu:
 *    [EKWIPUNEK: ZUZYJ | Morfina | 1]
 *    [EKWIPUNEK: ZUŻYJ | Bandaże]
 *    [EKWIPUNEK:@Margaret: ZUZYJ | Morfina | 2]
 *
 * 2. Usunięcie przedmiotu (zniszczenie, zgubienie, oddanie):
 *    [EKWIPUNEK: USUN | Pusta fiolka]
 *    [EKWIPUNEK: USUŃ | Klucz]
 *    [EKWIPUNEK:@Tomasz: USUN | Zapałki]
 *
 * 3. Dodanie nowego przedmiotu (znalezienie, nagroda):
 *    [EKWIPUNEK: DODAJ | Mosiężny klucz | tool | Ciężki klucz do krypty]
 *    [EKWIPUNEK: DODAJ | Stara fotografia]
 *    [EKWIPUNEK:@Margaret: DODAJ | Rewolwer .38 | weapon | Znaleziony w biurku]
 */
export function extractEquipmentEvents(text: string): EquipmentEvent[] {
  if (!text || !text.includes('[EKWIPUNEK:')) return [];

  const events: EquipmentEvent[] = [];
  // Pattern dopasowujący [EKWIPUNEK: ...] z opcjonalnym adresatem duetowym @Postać:
  const tagPattern = /\[EKWIPUNEK(?::@([^:]+))?:\s*([^|\]]+)(?:\|([^|\]]*))?(?:\|([^|\]]*))?(?:\|([^\]]*))?\]/gi;

  let match: RegExpExecArray | null;
  while ((match = tagPattern.exec(text)) !== null) {
    const rawCharacter = match[1]?.trim();
    const rawAction = match[2]?.trim().toLowerCase();
    const param1 = match[3]?.trim() || '';
    const param2 = match[4]?.trim() || '';
    const param3 = match[5]?.trim() || '';

    let action: EquipmentEventAction | null = null;
    if (rawAction === 'zuzyj' || rawAction === 'zużyj' || rawAction === 'uzyj' || rawAction === 'użyj' || rawAction === 'use') {
      action = 'use';
    } else if (rawAction === 'usun' || rawAction === 'usuń' || rawAction === 'remove' || rawAction === 'delete') {
      action = 'remove';
    } else if (rawAction === 'dodaj' || rawAction === 'add') {
      action = 'add';
    }

    if (!action) continue;

    if (action === 'use') {
      // Format: [EKWIPUNEK: ZUZYJ | Nazwa | ilosc]
      const itemName = param1;
      if (!itemName) continue;
      const parsedQty = parseInt(param2, 10);
      const quantity = !isNaN(parsedQty) && parsedQty > 0 ? parsedQty : 1;

      events.push({
        action: 'use',
        itemName,
        quantity,
        characterName: rawCharacter,
        rawText: match[0],
      });
    } else if (action === 'remove') {
      // Format: [EKWIPUNEK: USUN | Nazwa]
      const itemName = param1;
      if (!itemName) continue;

      events.push({
        action: 'remove',
        itemName,
        characterName: rawCharacter,
        rawText: match[0],
      });
    } else if (action === 'add') {
      // Format: [EKWIPUNEK: DODAJ | Nazwa | kategoria | opis]
      const itemName = param1;
      if (!itemName) continue;

      let category: EquipmentCategory = 'personal';
      const catCandidate = param2.toLowerCase();
      const validCategories: EquipmentCategory[] = [
        'weapon',
        'armor',
        'tool',
        'document',
        'artifact',
        'personal',
        'medical',
        'occult',
      ];
      if (validCategories.includes(catCandidate as EquipmentCategory)) {
        category = catCandidate as EquipmentCategory;
      }

      const description = param3 || undefined;

      events.push({
        action: 'add',
        itemName,
        category,
        description,
        characterName: rawCharacter,
        rawText: match[0],
      });
    }
  }

  return events;
}
