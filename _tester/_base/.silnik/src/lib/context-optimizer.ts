/**
 * Context Optimizer
 * 
 * Inteligentnie wybiera wiadomości z długiej historii konwersacji
 * dla sesji z setkami lub tysiącami wiadomości.
 * 
 * Strategia:
 * - Ostatnie N wiadomości (najważniejsze dla bieżącego kontekstu)
 * - Pierwsze M wiadomości (początek sesji - charakter, setting, początki przygody)
 * - Archiwalne chunki z GCS (streszczenia starych wiadomości)
 * - To zapewnia ciągłość narracji przy zachowaniu limitów tokenów
 */

// OPT-06: Shared constants — single source of truth
import { ARCHIVE_THRESHOLD, MAX_INLINE_MESSAGES } from './constants/context';
export { ARCHIVE_THRESHOLD, MAX_INLINE_MESSAGES };

interface Message {
  role: string;
  content: string;
  timestamp?: Date;
}

interface ContextSelection {
  messages: Message[];
  strategy: 'all' | 'recent' | 'smart';
  totalMessages: number;
  selectedMessages: number;
}

/**
 * Inteligentnie wybiera wiadomości z długiej historii
 * 
 * @param messages - Pełna lista wiadomości
 * @param maxMessages - Maksymalna liczba wiadomości do wyboru (domyślnie 100)
 * @returns Wybrane wiadomości + metadane o strategii
 */
export function selectOptimalContext(
  messages: Message[],
  maxMessages: number = 100
): ContextSelection {
  const totalMessages = messages?.length || 0;

  // Jeśli mało wiadomości, użyj wszystkich
  if (totalMessages <= maxMessages) {
    return {
      messages: messages || [],
      strategy: 'all',
      totalMessages,
      selectedMessages: totalMessages,
    };
  }

  // Jeśli contextMemory jest małe (np. 50), użyj tylko ostatnich
  if (maxMessages < 50) {
    const recent = (messages || []).slice(-maxMessages);
    return {
      messages: recent,
      strategy: 'recent',
      totalMessages,
      selectedMessages: recent.length,
    };
  }

  // Inteligentny wybór dla długich sesji:
  // - Pierwsze 20% z maxMessages (kontekst początku sesji)
  // - Ostatnie 80% z maxMessages (bieżący kontekst)
  const startCount = Math.max(1, Math.floor(maxMessages * 0.2)); // 20% na początek
  const recentCount = maxMessages - startCount; // 80% na ostatnie

  const startMessages = (messages || []).slice(0, startCount);
  const recentMessages = (messages || []).slice(-recentCount);

  // OPT-07: O(n) deduplikacja zamiast O(n²) findIndex
  const combined = [...startMessages, ...recentMessages];
  const seen = new Set<string>();
  const uniqueMessages = combined.filter(msg => {
    const key = `${msg.role}:${msg.content.slice(0, 200)}:${msg.timestamp?.getTime() ?? 0}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    messages: uniqueMessages,
    strategy: 'smart',
    totalMessages,
    selectedMessages: uniqueMessages.length,
  };
}

/**
 * Wrapper dla kompatybilności z istniejącym kodem
 * Zwraca tylko wybrane wiadomości
 */
export function getOptimizedMessages(
  messages: Message[] | undefined,
  contextMemory: number
): Message[] {
  if (!messages || messages.length === 0) {
    return [];
  }

  // Jeśli contextMemory jest małe (< 100), użyj prostego slice
  if (contextMemory < 100) {
    return messages.slice(-contextMemory);
  }

  // Dla większych wartości, użyj inteligentnego wyboru
  // Maksymalnie 300 wiadomości (zwiększono z 200 dla lepszego kontekstu)
  // Starsze wiadomości są archiwizowane do GCS przez CloudContextService
  const maxMessages = Math.min(contextMemory, MAX_INLINE_MESSAGES);
  const selection = selectOptimalContext(messages, maxMessages);

  return selection.messages;
}

