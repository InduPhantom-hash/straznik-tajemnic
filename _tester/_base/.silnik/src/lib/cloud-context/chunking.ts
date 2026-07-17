/**
 * Cloud Context — Chunking helpers (pure functions, no GCS)
 *
 * Wyciągnięte z `cloud-context-service.ts` w IND-175 (sesja 93).
 * Zawiera pure logic dla:
 * - shouldArchive (próg archiwizacji)
 * - chunkMessages (OPT-15 scene-aware chunking)
 * - extract* (NPC/lokacje/fakty z wiadomości)
 * - createQuickSummary (fallback summary)
 * - buildContextFromChunks (render do promptu)
 */

import { gameContextService, KeyFact } from '../game-context';
import { CHUNK_SIZE, ARCHIVE_THRESHOLD } from '../constants/context';
import type { Message, CloudContextChunk } from './types';

export function shouldArchive(messages: Message[]): boolean {
  return messages.length >= ARCHIVE_THRESHOLD;
}

/**
 * OPT-15: Inteligentny chunking po granicach scen.
 * Szuka tagów [LOKACJA:], zmian nastroju, lub dużych przerw czasowych
 * jako naturalnych punktów cięcia. Fallback na stały CHUNK_SIZE.
 */
export function chunkMessages(messages: Message[]): Message[][] {
  const chunks: Message[][] = [];
  const MIN_CHUNK = Math.floor(CHUNK_SIZE * 0.6);
  const MAX_CHUNK = Math.ceil(CHUNK_SIZE * 1.4);

  const sceneBoundaries = new Set<number>();
  for (let i = 1; i < messages.length; i++) {
    const content = messages[i].content || '';
    if (/\[LOKACJA:/i.test(content)) {
      sceneBoundaries.add(i);
    }
    if (/\[WALKA:\s*(?:START|KONIEC)\]/i.test(content)) {
      sceneBoundaries.add(i);
    }
    const prevTs = messages[i - 1].timestamp;
    const currTs = messages[i].timestamp;
    if (prevTs && currTs) {
      const gap = new Date(currTs).getTime() - new Date(prevTs).getTime();
      if (gap > 30 * 60 * 1000) {
        sceneBoundaries.add(i);
      }
    }
  }

  let start = 0;
  while (start < messages.length) {
    let bestCut = Math.min(start + CHUNK_SIZE, messages.length);

    for (
      let i = start + MIN_CHUNK;
      i <= Math.min(start + MAX_CHUNK, messages.length);
      i++
    ) {
      if (sceneBoundaries.has(i)) {
        bestCut = i;
        break;
      }
    }

    if (bestCut === start + CHUNK_SIZE && bestCut < messages.length) {
      bestCut = Math.min(start + CHUNK_SIZE, messages.length);
    }

    chunks.push(messages.slice(start, bestCut));
    start = bestCut;
  }

  return chunks;
}

/**
 * Stwórz szybkie podsumowanie chunka (bez AI)
 */
export function createQuickSummary(chunk: CloudContextChunk): string {
  const userMessages = chunk.messages.filter((m) => m.role === 'user');
  const userActions = userMessages
    .slice(0, 3)
    .map((m) => m.content.slice(0, 50))
    .join('; ');

  return `Gracz: ${userActions}... (${chunk.messages.length} wiadomości)`;
}

/**
 * Wyekstrahuj nazwy NPC z wiadomości
 */
export function extractMentionedNPCs(messages: Message[]): string[] {
  const npcs = new Set<string>();
  const existingNPCs = gameContextService.getActiveNPCs();

  for (const msg of messages) {
    for (const npc of existingNPCs) {
      if (msg.content.toLowerCase().includes(npc.name.toLowerCase())) {
        npcs.add(npc.name);
      }
    }
  }

  const npcPatterns = [
    /(?:pan|pani|profesor|doktor|inspektor)\s+([A-ZĄĘÓŁŻŹĆŃŚ][a-ząęółżźćńś]+)/g,
    /([A-Z][a-z]+)\s+(?:mówi|pyta|odpowiada|krzyczy)/g,
  ];

  for (const msg of messages) {
    for (const pattern of npcPatterns) {
      const matches = msg.content.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].length > 2) {
          npcs.add(match[1]);
        }
      }
    }
  }

  return Array.from(npcs);
}

/**
 * Wyekstrahuj nazwy lokacji z wiadomości
 */
export function extractMentionedLocations(messages: Message[]): string[] {
  const locations = new Set<string>();
  const existingLocations = gameContextService.getVisitedLocations();

  for (const msg of messages) {
    for (const loc of existingLocations) {
      if (msg.content.toLowerCase().includes(loc.name.toLowerCase())) {
        locations.add(loc.name);
      }
    }
  }

  return Array.from(locations);
}

/**
 * Wyekstrahuj kluczowe fakty z wiadomości
 */
export function extractKeyFacts(messages: Message[]): Partial<KeyFact>[] {
  const facts: Partial<KeyFact>[] = [];

  const factPatterns = [
    /(?:odkrywasz|dowiadujesz się|zauważasz|znajdujesz)\s+(.+?)(?:\.|!)/gi,
    /(?:okazuje się|to znaczy|więc)\s+(.+?)(?:\.|!)/gi,
  ];

  for (const msg of messages) {
    if (msg.role !== 'assistant') continue;

    for (const pattern of factPatterns) {
      const matches = msg.content.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].length > 10) {
          facts.push({
            content: match[1].slice(0, 100),
            category: 'plot',
            source: 'ai',
            confidence: 0.7,
          });
        }
      }
    }
  }

  return facts.slice(0, 5);
}

/**
 * Buduj kontekst z chunków do wstrzyknięcia do promptu
 */
export function buildContextFromChunks(chunks: CloudContextChunk[]): string {
  if (chunks.length === 0) return '';

  const parts: string[] = ['## ARCHIWALNA HISTORIA SESJI'];

  for (const chunk of chunks) {
    if (chunk.summary) {
      parts.push(`### Część ${chunk.chunkIndex + 1}:\n${chunk.summary}`);
    } else {
      const shortSummary = createQuickSummary(chunk);
      parts.push(`### Część ${chunk.chunkIndex + 1}:\n${shortSummary}`);
    }

    if (chunk.keyFacts.length > 0) {
      parts.push(
        `Ustalone: ${chunk.keyFacts.map((f) => f.content).join('; ')}`
      );
    }

    if (chunk.mentionedNPCs.length > 0) {
      parts.push(`NPC: ${chunk.mentionedNPCs.join(', ')}`);
    }
  }

  return parts.join('\n\n');
}
