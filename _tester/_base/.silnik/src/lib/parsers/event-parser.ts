import { ParsedEvent } from './types';
import {
  NPC_PATTERNS,
  LOCATION_PATTERNS,
  ITEM_PATTERNS,
  TAG_LOCATION_PATTERN,
} from './patterns';

/**
 * Wykrywa wycieki promptów wizualnych w tagach lokacji i poszlak
 * (np. "35mm film photograph", "1990s authentic", "cinematic lighting", "towering gothic bookshelves").
 */
export function isVisualPromptLeak(text?: string | null): boolean {
  if (!text) return false;
  return /\b(35mm|film photograph|photograph|photography|photo|cinematic|moody lighting|dramatic lighting|lighting|authentic 19\d\ds|19\d\ds authentic|octane render|unreal engine|hyperrealistic|realistic|establishing shot|wide angle|bokeh|vintage furniture|vintage photograph|Scena #\d+|exterior|interior|gothic bookshelves|bookshelves|dust motes|study tables|period-accurate|atmospheric lighting|high resolution)\b/i.test(
    text
  );
}

/**
 * Czyści nazwę lokacji ze zbędnych prefiksów, separatorów i resztek promptów technicznych.
 */
export function sanitizeLocationName(name?: string | null): string {
  if (!name) return '';
  let clean = name
    .replace(/^Lokacja:\s*/i, '')
    .replace(/^Location:\s*/i, '');

  // Odetnij separator pionowej kreski lub dwukropka, jeśli pozostał w nazwie
  if (clean.includes('|')) {
    clean = clean.split('|')[0];
  }
  if (clean.includes(':')) {
    clean = clean.split(':')[0];
  }

  // Odetnij przecinek, jeśli po nim następuje opis wizualny / prompt po angielsku
  const commaIdx = clean.indexOf(',');
  if (commaIdx !== -1) {
    const tail = clean.substring(commaIdx + 1);
    if (
      isVisualPromptLeak(tail) ||
      /\b(19\d\ds|authentic|35mm|film|cinematic|towering|gothic|detailed|period-accurate|photo|interior|exterior|lighting|realistic|atmospheric|dark|fog|misty|vintage|bookshelves|dust|study|tables|books)\b/i.test(tail) ||
      tail.trim().length > 20
    ) {
      clean = clean.substring(0, commaIdx);
    }
  }

  clean = clean
    .replace(/["'«»\u201E\u201C\u201D]/g, '')
    .trim();

  // Twarde zabezpieczenie: jeśli nazwa nadal przekracza 45 znaków, przytnij na granicy słowa
  if (clean.length > 45) {
    const truncated = clean.substring(0, 45);
    const lastSpace = truncated.lastIndexOf(' ');
    clean = (lastSpace > 20 ? truncated.substring(0, lastSpace) : truncated).trim();
  }

  return clean;
}

/**
 * IND-267: Wyłuskuje NAJNOWSZY znacznik `[LOKACJA: Nazwa: opis]` lub `[LOKACJA: Nazwa | opis]` z surowej narracji MG.
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
    const rawTagContent = match[1].trim();
    const hasExplicitSeparator = match[2] !== undefined;

    // Jeśli mamy już poprawną lokację strukturalną (: lub |), a kolejny tag w tym samym tekście
    // to wyciek promptu bez jawnego separatora, zachowujemy dotychczasową lokację
    if (last && !hasExplicitSeparator && isVisualPromptLeak(rawTagContent)) {
      continue;
    }

    let cleanName = sanitizeLocationName(rawTagContent);
    let desc = (match[2] || '').trim();

    // Jeśli nie było separatora : ani |, ale w rawTagContent był przecinek z opisem, wyciągnij opis
    if (!desc && rawTagContent.includes(',')) {
      const commaIdx = rawTagContent.indexOf(',');
      const candidateTail = rawTagContent.substring(commaIdx + 1).trim();
      if (
        isVisualPromptLeak(candidateTail) ||
        /\b(19\d\ds|authentic|35mm|film|cinematic|towering|gothic|detailed|period-accurate|photo|interior|exterior|lighting|realistic|atmospheric|dark|fog|misty|vintage|bookshelves|dust|study|tables)\b/i.test(candidateTail)
      ) {
        desc = candidateTail;
      }
    }

    if (cleanName && cleanName.length <= 45 && !isVisualPromptLeak(cleanName)) {
      last = { name: cleanName, description: desc };
    }
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
      const rawLocation = (match[1] || match[0])?.trim();
      if (!rawLocation || isVisualPromptLeak(rawLocation)) {
        continue;
      }
      const location = sanitizeLocationName(rawLocation);
      if (
        location &&
        location.length > 2 &&
        location.length <= 45 &&
        !isVisualPromptLeak(location) &&
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
