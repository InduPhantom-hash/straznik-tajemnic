// Session Timeline Manager - zarządzanie chronologią wydarzeń w sesji

export type TimelineEventType =
  | 'player_action'
  | 'ai_narrative'
  | 'combat'
  | 'encounter'
  | 'discovery'
  | 'skill_test'
  | 'state_change'
  | 'random_event'
  | 'other';

export interface TimelineEvent {
  id: string;
  timestamp: Date;
  type: TimelineEventType;
  title: string;
  description: string;

  // Powiązania
  npcIds?: string[]; // ID powiązanych NPC
  locationId?: string; // ID powiązanej lokacji
  characterId?: string; // ID postaci gracza
  skillTestId?: string; // ID testu umiejętności
  combatId?: string; // ID walki

  // Obraz wydarzenia
  imageUrl?: string; // URL/base64 ilustracji wydarzenia

  // Metadata
  sessionId?: string;
  importance: 'low' | 'medium' | 'high';
  tags: string[];

  // Dodatkowe dane
  data?: {
    [key: string]: any;
  };
}

/**
 * Tworzy wydarzenie timeline z danych
 */
export function createTimelineEvent(
  type: TimelineEventType,
  title: string,
  description: string,
  options?: {
    npcIds?: string[];
    locationId?: string;
    characterId?: string;
    skillTestId?: string;
    combatId?: string;
    sessionId?: string;
    importance?: 'low' | 'medium' | 'high';
    tags?: string[];
    imageUrl?: string;
    data?: { [key: string]: any };
  }
): TimelineEvent {
  return {
    id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
    timestamp: new Date(),
    type,
    title,
    description,
    npcIds: options?.npcIds,
    locationId: options?.locationId,
    characterId: options?.characterId,
    skillTestId: options?.skillTestId,
    combatId: options?.combatId,
    sessionId: options?.sessionId,
    importance: options?.importance || 'medium',
    tags: options?.tags || [],
    imageUrl: options?.imageUrl,
    data: options?.data
  };
}

/**
 * Zapisuje wydarzenie do timeline
 */
export function saveTimelineEvent(event: TimelineEvent, sessionId?: string): void {
  if (typeof window === 'undefined') return;

  try {
    const key = sessionId ? `timeline_${sessionId}` : 'timeline';
    const saved = localStorage.getItem(key);
    const events: TimelineEvent[] = saved ? JSON.parse(saved).map((e: any) => ({
      ...e,
      timestamp: new Date(e.timestamp)
    })) : [];

    events.push(event);

    // Zachowaj tylko ostatnie 500 wydarzeń
    const trimmedEvents = events.slice(-500);

    localStorage.setItem(key, JSON.stringify(trimmedEvents));
  } catch (error) {
    console.error('Error saving timeline event:', error);
  }
}

/**
 * Ładuje wydarzenia z timeline
 */
export function loadTimelineEvents(sessionId?: string): TimelineEvent[] {
  if (typeof window === 'undefined') return [];

  try {
    const key = sessionId ? `timeline_${sessionId}` : 'timeline';
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved).map((e: any) => ({
        ...e,
        timestamp: new Date(e.timestamp)
      }));
    }
  } catch (error) {
    console.error('Error loading timeline events:', error);
  }

  return [];
}

/**
 * Filtruje wydarzenia
 */
export function filterTimelineEvents(
  events: TimelineEvent[],
  filters: {
    type?: TimelineEventType;
    npcId?: string;
    locationId?: string;
    characterId?: string;
    importance?: 'low' | 'medium' | 'high';
    tags?: string[];
    dateFrom?: Date;
    dateTo?: Date;
    searchQuery?: string;
  }
): TimelineEvent[] {
  let filtered = [...events];

  if (filters.type) {
    filtered = filtered.filter(e => e.type === filters.type);
  }

  if (filters.npcId) {
    filtered = filtered.filter(e => e.npcIds?.includes(filters.npcId!));
  }

  if (filters.locationId) {
    filtered = filtered.filter(e => e.locationId === filters.locationId);
  }

  if (filters.characterId) {
    filtered = filtered.filter(e => e.characterId === filters.characterId);
  }

  if (filters.importance) {
    filtered = filtered.filter(e => e.importance === filters.importance);
  }

  if (filters.tags && filters.tags.length > 0) {
    filtered = filtered.filter(e =>
      filters.tags!.some(tag => e.tags.includes(tag))
    );
  }

  if (filters.dateFrom) {
    filtered = filtered.filter(e => e.timestamp >= filters.dateFrom!);
  }

  if (filters.dateTo) {
    filtered = filtered.filter(e => e.timestamp <= filters.dateTo!);
  }

  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    filtered = filtered.filter(e =>
      e.title.toLowerCase().includes(query) ||
      e.description.toLowerCase().includes(query) ||
      e.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }

  return filtered;
}

/**
 * Grupuje wydarzenia według daty
 */
export function groupEventsByDate(events: TimelineEvent[]): Map<string, TimelineEvent[]> {
  const grouped = new Map<string, TimelineEvent[]>();

  events.forEach(event => {
    const dateKey = event.timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(event);
  });

  return grouped;
}

/**
 * Eksportuje timeline do JSON
 */
export function exportTimeline(events: TimelineEvent[]): string {
  return JSON.stringify(events, null, 2);
}

/**
 * Eksportuje timeline do Markdown (ze wsparciem dla obrazów)
 */
export function exportTimelineToText(events: TimelineEvent[]): string {
  const sorted = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  let md = '# 📜 Chronologia Wydarzeń\n\n';

  const grouped = groupEventsByDate(sorted);
  const dates = Array.from(grouped.keys()).sort();

  dates.forEach(date => {
    const dateEvents = grouped.get(date)!;
    const dateObj = new Date(date);
    md += `## ${dateObj.toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n\n`;

    dateEvents.forEach(event => {
      const typeEmoji = {
        combat: '⚔️',
        discovery: '🔍',
        encounter: '👤',
        skill_test: '🎲',
        player_action: '🎭',
        ai_narrative: '📖',
        state_change: '💫',
        random_event: '🎰',
        other: '📌'
      }[event.type] || '📌';

      md += `### ${typeEmoji} ${event.title}\n`;
      md += `*${event.timestamp.toLocaleTimeString('pl-PL')}*\n\n`;

      if (event.imageUrl) {
        md += `![${event.title}](${event.imageUrl})\n\n`;
      }

      if (event.description) {
        md += `${event.description}\n\n`;
      }

      if (event.tags.length > 0) {
        md += `**Tagi:** ${event.tags.map(t => `\`${t}\``).join(' ')}\n\n`;
      }

      md += `---\n\n`;
    });
  });

  return md;
}

/**
 * Eksportuje timeline do Markdown z osadzonymi obrazami (dla eksportu zewnętrznego)
 */
export function exportTimelineToMarkdown(events: TimelineEvent[], sessionName?: string): string {
  const sorted = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const now = new Date();

  let md = `# 📜 ${sessionName || 'Sesja Zew Cthulhu'}\n\n`;
  md += `> Wygenerowano: ${now.toLocaleDateString('pl-PL')} ${now.toLocaleTimeString('pl-PL')}\n\n`;
  md += `---\n\n`;

  // Statystyki
  const stats = {
    total: events.length,
    combats: events.filter(e => e.type === 'combat').length,
    discoveries: events.filter(e => e.type === 'discovery').length,
    skillTests: events.filter(e => e.type === 'skill_test').length,
    images: events.filter(e => e.imageUrl).length
  };

  md += `## 📊 Podsumowanie\n\n`;
  md += `| Kategoria | Liczba |\n|-----------|--------|\n`;
  md += `| Wszystkie wydarzenia | ${stats.total} |\n`;
  md += `| Walki | ${stats.combats} |\n`;
  md += `| Odkrycia | ${stats.discoveries} |\n`;
  md += `| Testy umiejętności | ${stats.skillTests} |\n`;
  md += `| Ilustracje | ${stats.images} |\n\n`;
  md += `---\n\n`;

  // Chronologia
  md += exportTimelineToText(sorted);

  return md;
}
