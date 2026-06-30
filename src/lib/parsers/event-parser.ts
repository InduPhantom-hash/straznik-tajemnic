import { ParsedEvent } from './types';
import {
  NPC_PATTERNS,
  LOCATION_PATTERNS,
  ITEM_PATTERNS,
  TAG_LOCATION_PATTERN,
} from './patterns';

/**
 * IND-267: Wyłuskuje NAJNOWSZY znacznik `[LOKACJA: Nazwa: opis]` z surowej narracji MG.
 * AI emituje go co turę, więc bierzemy ostatni (bieżąca lokacja bohatera) jako pojedyncze
 * źródło prawdy dla pineski w headerze, kategorii "Lokacje" w dzienniku i `currentLocation`
 * wstrzykiwanego z powrotem do promptu. Zwraca `null`, gdy w tekście nie ma znacznika.
 */
export function extractLatestTagLocation(
  text: string
): { name: string; description: string } | null {
  const regex = new RegExp(TAG_LOCATION_PATTERN.source, 'gi');
  let match;
  let last: { name: string; description: string } | null = null;
  while ((match = regex.exec(text)) !== null) {
    last = { name: match[1].trim(), description: match[2].trim() };
  }
  return last;
}

export function extractNPCs(text: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  const seenNPCs = new Set<string>();

  for (const pattern of NPC_PATTERNS) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      const npcName = match[1]?.trim();
      if (
        npcName &&
        npcName.length > 2 &&
        !seenNPCs.has(npcName.toLowerCase())
      ) {
        if (!/^(ty|ja|on|ona|to|ten|ta|ci|te|tam|tu)$/i.test(npcName)) {
          seenNPCs.add(npcName.toLowerCase());
          events.push({
            type: 'npc',
            title: `Spotkano: ${npcName}`,
            description: `Nowa postać w przygodzie`,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }
  }

  return events;
}

export function extractLocations(text: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  const seenLocations = new Set<string>();

  for (const pattern of LOCATION_PATTERNS) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      const location = (match[1] || match[0])?.trim();
      if (
        location &&
        location.length > 2 &&
        !seenLocations.has(location.toLowerCase())
      ) {
        seenLocations.add(location.toLowerCase());
        events.push({
          type: 'location',
          title: `Lokacja: ${location}`,
          description: `Odwiedzone miejsce`,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  return events;
}

export function extractItems(text: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];

  for (const pattern of ITEM_PATTERNS) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      const item = match[1]?.trim();
      if (item && item.length > 2 && item.length < 50) {
        events.push({
          type: 'item',
          title: `Przedmiot: ${item}`,
          description: `Znaleziono/otrzymano`,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  return events;
}
