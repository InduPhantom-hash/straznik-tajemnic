/**
 * Conversation Summarizer
 *
 * Generuje AI-podsumowanie "luki" w historii konwersacji
 * (wiadomości pominięte przez strategię 20/80 context-optimizer).
 *
 * Strategia:
 * 1. Oblicz lukę - wiadomości między 20% start a 80% recent
 * 2. Jeśli cached summary jest aktualne - użyj cache
 * 3. Jeśli nie - wyślij lukę do Gemini Flash i wygeneruj streszczenie
 * 4. Cache'uj w pamięci (per sessionId)
 */

import { getGeminiClient } from './gemini-client-pool';
import { MAX_INLINE_MESSAGES } from './context-optimizer';
import { DEFAULT_GEMINI_MODEL } from './ai-providers/constants';

// === INTERFEJSY ===

interface ConversationSummary {
  sessionId: string;
  version: number;
  coveredRange: { startIdx: number; endIdx: number };
  rawPromptText: string;
  generatedAt: string;
  lastAccessedAt: number; // IND-77: TTL tracking - timestamp ms ostatniego użycia/zapisu
}

interface Message {
  role: string;
  content: string;
}

// === KONFIGURACJA ===

export const SUMMARIZATION_THRESHOLD = 80;
const CACHE_STALENESS_DELTA = 20; // Re-generuj gdy luka urosła o 20+ wiadomości
const MAX_GAP_MESSAGES = 100; // Max wiadomości do streszczenia w jednym callu
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // IND-77: 2h TTL - typowa długość sesji CoC + zapas

// === CACHE ===

const summaryCache = new Map<string, ConversationSummary>();

/**
 * IND-77: Lazy sweep - usuwa expired entries (lastAccessedAt < now - TTL).
 * Wywoływane przy każdym set() jako housekeeping; brak setInterval = brak overhead w runtime.
 */
function sweepExpired(now: number = Date.now()): void {
  const cutoff = now - CACHE_TTL_MS;
  for (const [sessionId, summary] of summaryCache.entries()) {
    if (summary.lastAccessedAt < cutoff) {
      summaryCache.delete(sessionId);
    }
  }
}

/**
 * IND-77: Reset cache state - exported dla testów (analog wzorca _resetX z sesji 78+93+94).
 */
export function _resetSummaryCache(): void {
  summaryCache.clear();
}

/**
 * IND-77: Inspect cache size - exported dla testów regression guard.
 */
export function _getSummaryCacheSize(): number {
  return summaryCache.size;
}

// === PROMPT DO STRESZCZENIA ===

const SUMMARY_PROMPT = `Jesteś asystentem Mistrza Gry w sesji RPG Zew Cthulhu 7. edycja.
Podsumuj poniższe fragmenty sesji w zwięzły sposób, wyodrębniając:

1. KLUCZOWE WYDARZENIA (max 8 punktów, chronologicznie)
2. AKTYWNE NPC (imię + 1 zdanie o roli/statusie, max 6)
3. ODKRYTE WSKAZÓWKI (max 6 - tropy, dokumenty, przesłuchania)
4. NIEROZWIĄZANE WĄTKI (max 4 - pytania bez odpowiedzi, zagrożenia)

Odpowiedz WYŁĄCZNIE w formacie JSON:
{
  "keyEvents": ["..."],
  "activeNPCs": ["..."],
  "discoveredClues": ["..."],
  "unresolvedThreads": ["..."]
}`;

// === FUNKCJE ===

/**
 * Oblicza indeksy luki pomijanej przez strategię 20/80.
 */
function calculateGapRange(
  totalMessages: number,
  maxInline: number
): { start: number; end: number } | null {
  if (totalMessages <= maxInline) return null;

  const startCount = Math.max(1, Math.floor(maxInline * 0.2));
  const recentCount = maxInline - startCount;
  const gapStart = startCount;
  const gapEnd = totalMessages - recentCount;

  if (gapEnd <= gapStart) return null;
  return { start: gapStart, end: gapEnd };
}

/**
 * Formatuje wiadomości z luki na tekst do streszczenia.
 */
function formatGapMessages(
  messages: Message[],
  start: number,
  end: number
): string {
  const gap = messages.slice(start, Math.min(end, start + MAX_GAP_MESSAGES));
  return gap
    .map((m, i) => {
      const role = m.role === 'user' ? 'GRACZ' : 'MG';
      return `[${start + i}] ${role}: ${m.content.slice(0, 500)}`;
    })
    .join('\n\n');
}

/**
 * Buduje tekst injection z surowego JSON summary.
 */
function buildPromptText(
  parsed: {
    keyEvents: string[];
    activeNPCs: string[];
    discoveredClues: string[];
    unresolvedThreads: string[];
  },
  range: { start: number; end: number }
): string {
  const parts: string[] = [
    `## STRESZCZENIE SESJI (wiadomości ${range.start}-${range.end})`,
  ];

  if (parsed.keyEvents?.length > 0) {
    parts.push(`**Wydarzenia:** ${parsed.keyEvents.join('; ')}`);
  }
  if (parsed.activeNPCs?.length > 0) {
    parts.push(`**NPC:** ${parsed.activeNPCs.join(', ')}`);
  }
  if (parsed.discoveredClues?.length > 0) {
    parts.push(`**Wskazówki:** ${parsed.discoveredClues.join('; ')}`);
  }
  if (parsed.unresolvedThreads?.length > 0) {
    parts.push(`**Otwarte wątki:** ${parsed.unresolvedThreads.join('; ')}`);
  }

  return parts.join('\n');
}

/**
 * Pobiera lub generuje streszczenie luki w historii konwersacji.
 *
 * @returns Tekst do injection w prompt lub null jeśli nie potrzebne/błąd
 */
export async function getOrGenerateSummary(
  messages: Message[] | undefined,
  sessionId: string,
  apiKey: string
): Promise<string | null> {
  if (!messages || messages.length < SUMMARIZATION_THRESHOLD) return null;

  const gap = calculateGapRange(messages.length, MAX_INLINE_MESSAGES);
  if (!gap) return null;

  // Sprawdź cache (IND-77: TTL check przed staleness delta)
  const now = Date.now();
  const cached = summaryCache.get(sessionId);
  if (cached) {
    const expired = cached.lastAccessedAt < now - CACHE_TTL_MS;
    if (expired) {
      summaryCache.delete(sessionId);
    } else if (
      Math.abs(cached.coveredRange.endIdx - gap.end) < CACHE_STALENESS_DELTA
    ) {
      // Cache hit: refresh lastAccessedAt + return
      cached.lastAccessedAt = now;
      return cached.rawPromptText;
    }
  }

  // Generuj nowe streszczenie
  try {
    const gapText = formatGapMessages(messages, gap.start, gap.end);
    if (!gapText) return null;

    // IND-79 (C3): użyj pool zamiast nowego klienta per request - reuse HTTP connection + RAM
    const client = getGeminiClient(apiKey);
    if (!client) return null;

    const result = await client.models.generateContent({
      model: DEFAULT_GEMINI_MODEL,
      contents: gapText,
      config: {
        systemInstruction: SUMMARY_PROMPT,
        temperature: 0.1,
        topP: 0.9,
        maxOutputTokens: 800,
      },
    });

    if (!result.text) return null;

    // Parse JSON z odpowiedzi (wyciągnij JSON nawet jeśli owinięty w markdown)
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    const promptText = buildPromptText(parsed, gap);

    // Cache (IND-77: sweep expired przed set + lastAccessedAt tracking)
    sweepExpired(now);
    const summary: ConversationSummary = {
      sessionId,
      version: (cached?.version || 0) + 1,
      coveredRange: { startIdx: gap.start, endIdx: gap.end },
      rawPromptText: promptText,
      generatedAt: new Date().toISOString(),
      lastAccessedAt: now,
    };
    summaryCache.set(sessionId, summary);

    console.log(
      `📝 Summary generated: v${summary.version}, gap ${gap.start}-${gap.end} (${gap.end - gap.start} msgs)`
    );
    return promptText;
  } catch (err) {
    console.warn('⚠️ Summary generation failed:', err);
    return null;
  }
}
