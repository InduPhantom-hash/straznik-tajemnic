'use client';

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  MapPin,
  Users,
  Sword,
  FileText,
  Pin,
  Edit3,
  Trash2,
  Target,
  Eye,
} from 'lucide-react';

// ------------------------------------------------------------------
// Typy - reużywamy ExtendedJournalEntry z session-journal
// ------------------------------------------------------------------

interface DiscoveryEntry {
  id: string;
  title: string;
  content: string;
  type: string;
  tags?: string[];
  imageUrl?: string;
  imageStatus?: string;
  inGameDate?: string;
  timestamp?: number;
  questStatus?: 'active' | 'completed' | 'failed';
  objectives?: Array<{
    id: string;
    description: string;
    completed?: boolean;
    dateCompleted?: string;
  }>;
}

type DiscoveryCategory = 'places' | 'characters' | 'items' | 'quests';

interface DiscoveriesViewProps {
  entries: DiscoveryEntry[];
  onEditEntry: (entry: DiscoveryEntry) => void;
  onDeleteEntry: (id: string) => void;
  /** Callback przypinania elementu do tablicy badacza przez szufladę poszlak */
  onPinToBoard?: (entry: DiscoveryEntry) => void;
  searchQuery?: string;
}

// ------------------------------------------------------------------
// Stałe
// ------------------------------------------------------------------

const CATEGORIES: {
  key: DiscoveryCategory;
  label: string;
  Icon: typeof MapPin;
  types: string[];
  emptyText: string;
}[] = [
  {
    key: 'places',
    label: 'Miejsca',
    Icon: MapPin,
    types: ['encyclopedia_location'],
    emptyText: 'Nie odkryto jeszcze żadnych lokacji.',
  },
  {
    key: 'characters',
    label: 'Postacie',
    Icon: Users,
    types: ['encyclopedia_character'],
    emptyText: 'Nie spotkano jeszcze żadnych postaci.',
  },
  {
    key: 'items',
    label: 'Przedmioty',
    Icon: Sword,
    types: ['encyclopedia_item'],
    emptyText: 'Nie znaleziono jeszcze żadnych przedmiotów.',
  },
  {
    key: 'quests',
    label: 'Misje',
    Icon: Target,
    types: ['quest'],
    emptyText: 'Brak misji w dzienniku.',
  },
];

const QUEST_STATUS_STYLE: Record<string, { bg: string; border: string; text: string; label: string }> = {
  active: { bg: 'bg-[#2a1b12]', border: 'border-[#bfa15f]', text: 'text-[#f4ebd0]', label: 'Aktywna' },
  completed: { bg: 'bg-[#142310]', border: 'border-[#73a15c]', text: 'text-[#a3d18e]', label: 'Ukończona' },
  failed: { bg: 'bg-[#2b1010]', border: 'border-[#a84d4d]', text: 'text-[#e3a8a8]', label: 'Nieudana' },
};

// ------------------------------------------------------------------
// Komponent
// ------------------------------------------------------------------

export function DiscoveriesView({
  entries,
  onEditEntry,
  onDeleteEntry,
  onPinToBoard,
  searchQuery = '',
}: DiscoveriesViewProps) {
  const [activeCategory, setActiveCategory] = useState<DiscoveryCategory>('places');
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  // Filtrowanie po kategorii i wyszukiwaniu
  const categoryConfig = CATEGORIES.find((c) => c.key === activeCategory)!;

  const categoryEntries = useMemo(() => {
    let filtered = entries.filter((e) => categoryConfig.types.includes(e.type));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.content.toLowerCase().includes(q) ||
          e.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [entries, activeCategory, searchQuery, categoryConfig.types]);

  // Liczniki per kategoria (bez filtra wyszukiwania)
  const counts = useMemo(() => {
    const result: Record<DiscoveryCategory, number> = { places: 0, characters: 0, items: 0, quests: 0 };
    for (const entry of entries) {
      for (const cat of CATEGORIES) {
        if (cat.types.includes(entry.type)) {
          result[cat.key]++;
          break;
        }
      }
    }
    return result;
  }, [entries]);

  const selectedEntry = categoryEntries.find((e) => e.id === selectedEntryId) || categoryEntries[0] || null;

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* === LEWY SIDEBAR: Kategorie + Lista === */}
      <div className="w-72 flex flex-col border-r-2 border-[#3a2518] bg-[#120905]">
        {/* Kategorie */}
        <div className="p-3 border-b border-[#3a2518] space-y-1">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => {
                  setActiveCategory(cat.key);
                  setSelectedEntryId(null);
                }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-md font-serif text-sm transition-all',
                  isActive
                    ? 'bg-[#3a2518] text-[#f4ebd0] border border-[#bfa15f]/40 shadow-inner'
                    : 'text-[#a29182] hover:text-[#e2d4c9] hover:bg-[#1a110a] border border-transparent'
                )}
              >
                <cat.Icon className={cn('h-4 w-4 flex-shrink-0', isActive ? 'text-[#bfa15f]' : 'text-[#8a7667]')} />
                <span className="flex-1 text-left">{cat.label}</span>
                <span className={cn(
                  'text-[10px] font-bold min-w-[20px] text-center rounded-full px-1.5 py-0.5',
                  isActive ? 'bg-[#bfa15f]/20 text-[#bfa15f]' : 'bg-[#3a2518]/50 text-[#8a7667]'
                )}>
                  {counts[cat.key]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Lista elementów w wybranej kategorii */}
        <div className="flex-1 overflow-y-auto journal-scroll p-3 space-y-1.5">
          {categoryEntries.map((entry) => {
            const isSelected = selectedEntry?.id === entry.id;
            const questStyle = entry.questStatus ? QUEST_STATUS_STYLE[entry.questStatus] : null;

            return (
              <button
                key={entry.id}
                onClick={() => setSelectedEntryId(entry.id)}
                className={cn(
                  'w-full text-left p-3 rounded-md transition-all font-serif border',
                  isSelected
                    ? 'bg-[#3a2518] text-[#f4ebd0] border-[#bfa15f] shadow-md'
                    : questStyle
                      ? `${questStyle.bg} hover:brightness-110 border-transparent ${questStyle.text}`
                      : 'bg-[#1c120c] hover:bg-[#2a1b12] border-transparent text-[#e2d4c9]'
                )}
              >
                <div className="font-bold text-sm leading-snug">{entry.title}</div>
                <div className="text-[11px] mt-1 line-clamp-1 opacity-70">
                  {entry.content}
                </div>
                {questStyle && (
                  <span className={cn(
                    'inline-block mt-1.5 text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border',
                    questStyle.bg, questStyle.border, questStyle.text
                  )}>
                    {questStyle.label}
                  </span>
                )}
              </button>
            );
          })}

          {categoryEntries.length === 0 && (
            <div className="text-center py-10 text-[#8a7667] italic font-serif text-sm px-4">
              <categoryConfig.Icon className="h-10 w-10 mx-auto mb-3 text-[#3a2518]" />
              {categoryConfig.emptyText}
            </div>
          )}
        </div>
      </div>

      {/* === PRAWY PANEL: Podgląd wybranego elementu === */}
      <div className="flex-1 overflow-y-auto journal-scroll p-6 bg-[#18120c]">
        {selectedEntry ? (
          <div className="max-w-3xl mx-auto space-y-5">
            {/* Nagłówek */}
            <div className="flex justify-between items-start border-b-2 border-[#3a2518] pb-3">
              <div>
                <div className="font-special-elite text-[10px] uppercase tracking-[0.25em] text-[#bfa15f]/70 mb-1">
                  {categoryConfig.label}
                </div>
                <h3 className="text-2xl font-serif font-bold text-[#f4ebd0] leading-tight">
                  {selectedEntry.title}
                </h3>
                {selectedEntry.inGameDate && (
                  <div className="text-xs text-[#8a7667] mt-1 font-special-elite">
                    Odkryto: {selectedEntry.inGameDate}
                  </div>
                )}
                {selectedEntry.questStatus && (
                  <span className={cn(
                    'inline-block mt-2 text-xs px-2 py-0.5 rounded font-serif font-semibold border',
                    QUEST_STATUS_STYLE[selectedEntry.questStatus]?.bg,
                    QUEST_STATUS_STYLE[selectedEntry.questStatus]?.border,
                    QUEST_STATUS_STYLE[selectedEntry.questStatus]?.text,
                  )}>
                    {QUEST_STATUS_STYLE[selectedEntry.questStatus]?.label}
                  </span>
                )}
              </div>
              <div className="flex gap-1.5">
                {onPinToBoard && (
                  <button
                    onClick={() => onPinToBoard(selectedEntry)}
                    className="p-2 text-[#bfa15f] hover:bg-[#3a2518] rounded-md transition-colors border border-transparent hover:border-[#bfa15f]/30"
                    title="Przypnij do Tablicy Badacza"
                  >
                    <Pin className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => onEditEntry(selectedEntry)}
                  className="p-2 text-[#f4ebd0] hover:bg-[#3a2518] rounded-md transition-colors"
                  title="Edytuj"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDeleteEntry(selectedEntry.id)}
                  className="p-2 text-[#ff6b6b] hover:bg-[#2b1010] rounded-md transition-colors"
                  title="Usuń"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Ilustracja */}
            {selectedEntry.imageStatus === 'pending' ? (
              <div className="h-48 rounded-lg border border-[#bfa15f]/30 bg-[#0d0906] flex flex-col items-center justify-center gap-2 text-[#bfa15f]">
                <div className="w-6 h-6 border-2 border-[#bfa15f] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-serif italic">Malowanie ilustracji...</span>
              </div>
            ) : selectedEntry.imageUrl ? (
              <div className="rounded-lg overflow-hidden border border-[#bfa15f]/30 bg-[#0d0906] p-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedEntry.imageUrl}
                  alt={selectedEntry.title}
                  className="w-full max-h-64 object-cover rounded"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
              </div>
            ) : null}

            {/* Treść */}
            <div className="text-base leading-relaxed text-[#e2d4c9] whitespace-pre-wrap font-serif italic bg-[#120905] p-5 rounded-lg border border-[#3a2518]">
              {selectedEntry.content}
            </div>

            {/* Cele misji (tylko dla quest) */}
            {selectedEntry.objectives && selectedEntry.objectives.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-serif font-bold text-lg text-[#f4ebd0] border-b border-[#3a2518] pb-1">
                  Cele zadania
                </h4>
                <div className="space-y-2">
                  {selectedEntry.objectives.map((obj) => (
                    <div
                      key={obj.id}
                      className={cn(
                        'p-3 rounded border flex items-start gap-3',
                        obj.completed
                          ? 'bg-[#142310] border-[#2c4c19] text-[#a3d18e]'
                          : 'bg-[#120905] border-[#3a2518] text-[#e2d4c9]'
                      )}
                    >
                      {obj.completed ? (
                        <Eye className="h-4 w-4 mt-0.5 text-[#73a15c] flex-shrink-0" />
                      ) : (
                        <Target className="h-4 w-4 mt-0.5 text-[#8a7667] flex-shrink-0" />
                      )}
                      <div>
                        <div className={cn('text-sm font-serif', obj.completed && 'line-through text-[#8a7667]')}>
                          {obj.description}
                        </div>
                        {obj.completed && obj.dateCompleted && (
                          <span className="text-[10px] text-[#73a15c]">Ukończono: {obj.dateCompleted}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tagi */}
            {selectedEntry.tags && selectedEntry.tags.length > 0 && (
              <div className="flex gap-1.5 flex-wrap border-t border-[#3a2518] pt-3">
                {selectedEntry.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] bg-[#3a2518]/50 text-[#f4ebd0] px-2 py-0.5 rounded border border-[#bfa15f]/20"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[#8a7667] italic font-serif h-full min-h-[300px]">
            <categoryConfig.Icon className="h-16 w-16 mb-4 text-[#3a2518]" />
            <p className="text-lg mb-1">Odkrycia w kategorii: {categoryConfig.label}</p>
            <p className="text-sm">Wybierz element z listy po lewej stronie</p>
          </div>
        )}
      </div>
    </div>
  );
}
