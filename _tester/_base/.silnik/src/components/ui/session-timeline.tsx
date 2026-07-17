'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from './button';

// Typy wydarzeń na osi czasu
export const EVENT_TYPES = {
  combat: { icon: '⚔️', color: 'bg-red-500', label: 'Walka' },
  discovery: { icon: '🔍', color: 'bg-yellow-500', label: 'Odkrycie' },
  npc: { icon: '👤', color: 'bg-blue-500', label: 'NPC' },
  sanity: { icon: '🧠', color: 'bg-purple-500', label: 'Poczytalność' },
  clue: { icon: '📜', color: 'bg-green-500', label: 'Trop' },
  location: { icon: '📍', color: 'bg-orange-500', label: 'Lokacja' },
  ritual: { icon: '🕯️', color: 'bg-pink-500', label: 'Rytuał' },
  death: { icon: '💀', color: 'bg-muted', label: 'Śmierć' },
  bookmark: { icon: '⭐', color: 'bg-amber-500', label: 'Zakładka' },
  note: { icon: '📝', color: 'bg-cyan-500', label: 'Notatka' },
} as const;

export type EventType = keyof typeof EVENT_TYPES;

export interface TimelineEvent {
  id: string;
  type: EventType;
  title: string;
  description: string;
  timestamp: string;
  sessionId?: string;
  messageIndex?: number;
  isBookmarked?: boolean;
  tags?: string[];
}

interface SessionTimelineProps {
  messages?: Array<{ role: string; content: string; timestamp?: string }>;
  sessionId?: string;
  onJumpToEvent?: (event: TimelineEvent) => void;
}

export function SessionTimeline({ messages = [], sessionId, onJumpToEvent }: SessionTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [filterType, setFilterType] = useState<EventType | 'all'>('all');
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);

  // Ładowanie wydarzeń z localStorage
  useEffect(() => {
    const saved = localStorage.getItem('session_timeline_events');
    if (saved) {
      try {
        setEvents(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading timeline events:', e);
      }
    }
  }, []);

  // Zapisywanie wydarzeń
  const saveEvents = useCallback((newEvents: TimelineEvent[]) => {
    setEvents(newEvents);
    localStorage.setItem('session_timeline_events', JSON.stringify(newEvents));
  }, []);

  // Dodawanie zakładki ręcznie
  const addBookmark = useCallback((title: string, description: string = '') => {
    const newEvent: TimelineEvent = {
      id: `event_${Date.now()}`,
      type: 'bookmark',
      title,
      description,
      timestamp: new Date().toISOString(),
      sessionId,
      isBookmarked: true,
    };
    saveEvents([...events, newEvent]);
  }, [events, sessionId, saveEvents]);

  // Toggle bookmark
  const toggleBookmark = useCallback((eventId: string) => {
    const updatedEvents = events.map(e => 
      e.id === eventId ? { ...e, isBookmarked: !e.isBookmarked } : e
    );
    saveEvents(updatedEvents);
  }, [events, saveEvents]);

  // Usuwanie wydarzenia
  const deleteEvent = useCallback((eventId: string) => {
    saveEvents(events.filter(e => e.id !== eventId));
  }, [events, saveEvents]);

  // Filtrowane wydarzenia
  const filteredEvents = useMemo(() => {
    let result = events;
    
    if (filterType !== 'all') {
      result = result.filter(e => e.type === filterType);
    }
    
    if (showBookmarksOnly) {
      result = result.filter(e => e.isBookmarked);
    }
    
    return result.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [events, filterType, showBookmarksOnly]);

  // Grupowanie po dacie
  const groupedEvents = useMemo(() => {
    const groups: Record<string, TimelineEvent[]> = {};
    
    filteredEvents.forEach(event => {
      const date = new Date(event.timestamp).toLocaleDateString('pl-PL', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(event);
    });
    
    return groups;
  }, [filteredEvents]);

  const [isAddingBookmark, setIsAddingBookmark] = useState(false);
  const [newBookmarkTitle, setNewBookmarkTitle] = useState('');
  const [newBookmarkDescription, setNewBookmarkDescription] = useState('');

  const stats = useMemo(() => {
    const typeCounts: Record<string, number> = {};
    events.forEach(e => {
      typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
    });
    return typeCounts;
  }, [events]);

  return (
    <div className="bg-gradient-to-br from-amber-900/30 to-orange-900/30 border border-amber-500/30 rounded-lg overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-amber-800/20 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📜</span>
          <span className="font-medium text-amber-200">Oś Czasu</span>
          <span className="text-sm text-amber-300/70">({events.length} wydarzeń)</span>
        </div>
        <span className="text-amber-400">{isExpanded ? '▲' : '▼'}</span>
      </div>

      {isExpanded && (
        <div className="p-4 border-t border-amber-500/20 space-y-4">
          {/* Quick Stats */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats).map(([type, count]) => (
              <div 
                key={type}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${EVENT_TYPES[type as EventType].color} bg-opacity-30`}
              >
                <span>{EVENT_TYPES[type as EventType].icon}</span>
                <span>{count}</span>
              </div>
            ))}
          </div>

          {/* Filtry */}
          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as EventType | 'all')}
              className="px-3 py-1.5 bg-amber-800/30 border border-amber-500/30 rounded-lg text-amber-100 text-sm"
            >
              <option value="all">Wszystkie typy</option>
              {(Object.keys(EVENT_TYPES) as EventType[]).map((type) => (
                <option key={type} value={type}>
                  {EVENT_TYPES[type].icon} {EVENT_TYPES[type].label}
                </option>
              ))}
            </select>
            
            <label className="flex items-center gap-2 text-sm text-amber-200">
              <input
                type="checkbox"
                checked={showBookmarksOnly}
                onChange={(e) => setShowBookmarksOnly(e.target.checked)}
                className="accent-amber-500"
              />
              Tylko zakładki ⭐
            </label>
            
            <Button
              onClick={() => setIsAddingBookmark(true)}
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 ml-auto"
            >
              ➕ Dodaj znacznik
            </Button>
          </div>

          {/* Add Bookmark Form */}
          {isAddingBookmark && (
            <div className="p-3 bg-amber-800/20 rounded-lg space-y-2">
              <input
                type="text"
                placeholder="Tytuł znacznika..."
                value={newBookmarkTitle}
                onChange={(e) => setNewBookmarkTitle(e.target.value)}
                className="w-full px-3 py-2 bg-amber-800/30 border border-amber-500/30 rounded-lg text-amber-100 text-sm"
              />
              <textarea
                placeholder="Opis (opcjonalny)..."
                value={newBookmarkDescription}
                onChange={(e) => setNewBookmarkDescription(e.target.value)}
                className="w-full px-3 py-2 bg-amber-800/30 border border-amber-500/30 rounded-lg text-amber-100 text-sm h-16 resize-none"
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    if (newBookmarkTitle.trim()) {
                      addBookmark(newBookmarkTitle, newBookmarkDescription);
                      setNewBookmarkTitle('');
                      setNewBookmarkDescription('');
                      setIsAddingBookmark(false);
                    }
                  }}
                  size="sm"
                  className="bg-amber-600"
                >
                  ✓ Zapisz
                </Button>
                <Button
                  onClick={() => setIsAddingBookmark(false)}
                  size="sm"
                  variant="outline"
                  className="border-amber-500 text-amber-200"
                >
                  ✕ Anuluj
                </Button>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
            {Object.entries(groupedEvents).map(([date, dateEvents]) => (
              <div key={date}>
                <div className="text-xs text-amber-400/70 mb-2 sticky top-0 bg-amber-900/50 py-1 px-2 rounded">
                  {date}
                </div>
                <div className="space-y-2 pl-4 border-l-2 border-amber-500/30">
                  {dateEvents.map((event) => {
                    const eventType = EVENT_TYPES[event.type];
                    return (
                      <div 
                        key={event.id}
                        className="relative flex items-start gap-3 p-2 rounded-lg hover:bg-amber-800/20 transition-colors group"
                      >
                        <div className={`absolute -left-6 w-3 h-3 rounded-full ${eventType.color} border-2 border-amber-900`} />
                        <span className="text-lg">{eventType.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-amber-100 truncate">{event.title}</span>
                            {event.isBookmarked && <span className="text-amber-400">⭐</span>}
                          </div>
                          {event.description && (
                            <p className="text-xs text-amber-300/70 mt-0.5 line-clamp-2">{event.description}</p>
                          )}
                          {(event as any).imageUrl && (
                            <img 
                              src={(event as any).imageUrl} 
                              alt={event.title}
                              className="mt-2 w-24 h-16 object-cover rounded border border-amber-500/30 cursor-pointer hover:opacity-80"
                              onClick={() => window.open((event as any).imageUrl, '_blank')}
                            />
                          )}
                          <span className="text-xs text-amber-400/50">
                            {new Date(event.timestamp).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => toggleBookmark(event.id)} className="p-1 hover:bg-amber-700/50 rounded text-xs">
                            {event.isBookmarked ? '⭐' : '☆'}
                          </button>
                          <button onClick={() => onJumpToEvent?.(event)} className="p-1 hover:bg-amber-700/50 rounded text-xs">➡️</button>
                          <button onClick={() => deleteEvent(event.id)} className="p-1 hover:bg-red-700/50 rounded text-xs">🗑️</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            
            {filteredEvents.length === 0 && (
              <p className="text-amber-400/70 text-sm text-center py-8">
                Brak wydarzeń na osi czasu. Dodaj znaczniki ręcznie.
              </p>
            )}
          </div>

          {/* Export */}
          <div className="border-t border-amber-500/20 pt-3 flex gap-2">
            <Button
              onClick={async () => {
                const { exportTimelineToMarkdown } = await import('@/lib/session-timeline');
                const markdown = exportTimelineToMarkdown(events as any, `Sesja ${new Date().toLocaleDateString('pl-PL')}`);
                const blob = new Blob([markdown], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `timeline_${new Date().toISOString().split('T')[0]}.md`;
                a.click();
              }}
              size="sm"
              className="bg-amber-600/50 hover:bg-amber-600"
            >
              📥 Eksport MD
            </Button>
            <Button
              onClick={() => {
                if (confirm('Czy na pewno chcesz wyczyścić całą oś czasu?')) {
                  saveEvents([]);
                }
              }}
              size="sm"
              variant="destructive"
              className="bg-red-600/50 hover:bg-red-600"
            >
              🗑️ Wyczyść
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SessionTimeline;
