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
    types: ['encyclopedia_location', 'location'],
    emptyText: 'Nie odkryto jeszcze żadnych lokacji.',
  },
  {
    key: 'characters',
    label: 'Postacie',
    Icon: Users,
    types: ['encyclopedia_character', 'npc'],
    emptyText: 'Nie spotkano jeszcze żadnych postaci.',
  },
  {
    key: 'items',
    label: 'Przedmioty',
    Icon: Sword,
    types: ['encyclopedia_item', 'item', 'discovery'],
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
          e.title?.toLowerCase().includes(q) ||
          e.content?.toLowerCase().includes(q) ||
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
                  'w-full text-left p-3 rounded-md transition-all font-serif border-l-4 border-y border-r',
                  isSelected
                    ? 'bg-[#2a1b12] text-[#f4ebd0] border-l-[#bfa15f] border-y-[#3a2518] border-r-[#3a2518] shadow-md translate-x-1'
                    : questStyle
                      ? `${questStyle.bg} hover:brightness-110 border-l-${questStyle.border.split('-')[1]} border-y-transparent border-r-transparent ${questStyle.text}`
                      : 'bg-[#18120c] hover:bg-[#21160f] border-l-[#3a2518] border-y-transparent border-r-transparent text-[#e2d4c9]'
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

      {/* === PRAWY PANEL: Podgląd wybranego elementu (AKTA ŚLEDCZE) === */}
      <div className="flex-1 overflow-y-auto journal-scroll p-6 bg-[#120c08] relative">
        {selectedEntry ? (
          <div className="max-w-2xl mx-auto">
            {/* Teczka / Akta */}
            <div className="bg-[#e4d8c6] text-[#2c241b] rounded shadow-[2px_4px_16px_rgba(0,0,0,0.6)] relative p-8 md:p-10 border border-[#d1c2ab] before:absolute before:inset-0 before:bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] before:opacity-30 before:pointer-events-none">
              
              {/* Pieczątka */}
              {selectedEntry.type !== 'quest' && (
                <div className="absolute top-6 right-8 border-4 border-[#8a1c1c] text-[#8a1c1c] opacity-60 font-special-elite text-xl px-2 py-1 transform rotate-[15deg] uppercase pointer-events-none">
                  POUFNE
                </div>
              )}

              {/* Header Akt */}
              <div className="border-b-2 border-[#2c241b]/30 pb-4 mb-6 relative">
                <div className="font-special-elite text-xs uppercase tracking-[0.2em] text-[#2c241b]/60 mb-2">
                  Dossier :: {categoryConfig.label}
                </div>
                
                <div className="flex justify-between items-start gap-4">
                  <h3 className="text-3xl font-special-elite font-bold text-[#1a140f] leading-tight flex-1">
                    {selectedEntry.title}
                  </h3>

                  {/* Przyciski narzędzi */}
                  <div className="flex gap-1.5 opacity-60 hover:opacity-100 transition-opacity shrink-0">
                    {onPinToBoard && (
                      <button
                        onClick={() => onPinToBoard(selectedEntry)}
                        className="p-1.5 text-[#2c241b] hover:bg-[#2c241b]/10 rounded transition-colors"
                        title="Przypnij do Tablicy Badacza"
                      >
                        <Pin className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      onClick={() => onEditEntry(selectedEntry)}
                      className="p-1.5 text-[#2c241b] hover:bg-[#2c241b]/10 rounded transition-colors"
                      title="Edytuj"
                    >
                      <Edit3 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => onDeleteEntry(selectedEntry.id)}
                      className="p-1.5 text-[#8a1c1c] hover:bg-[#8a1c1c]/10 rounded transition-colors"
                      title="Usuń"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 mt-3">
                  {selectedEntry.inGameDate && (
                    <div className="text-xs text-[#2c241b]/70 font-special-elite font-bold">
                      DATA ZAPISU: {selectedEntry.inGameDate}
                    </div>
                  )}
                  {selectedEntry.questStatus && (
                    <div className="text-xs font-special-elite font-bold flex items-center gap-1.5">
                      STATUS:
                      <span className={cn(
                        'px-1.5 py-0.5 rounded border uppercase',
                        selectedEntry.questStatus === 'active' ? 'bg-[#2c241b]/10 border-[#2c241b]/40 text-[#2c241b]' :
                        selectedEntry.questStatus === 'completed' ? 'bg-[#73a15c]/20 border-[#73a15c] text-[#335620]' :
                        'bg-[#8a1c1c]/20 border-[#8a1c1c] text-[#6e1313]'
                      )}>
                        {QUEST_STATUS_STYLE[selectedEntry.questStatus]?.label}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Zdjęcie (Spinacz / Polaroids) */}
              {selectedEntry.imageStatus === 'pending' ? (
                <div className="float-right w-1/2 ml-6 mb-4 h-48 bg-[#d8cbb5] p-4 flex flex-col items-center justify-center gap-2 text-[#5c4a3d] border border-[#d8cbb5] shadow-inner transform rotate-2">
                  <div className="w-5 h-5 border-2 border-[#5c4a3d] border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs font-special-elite italic">Wywyoływanie zdjęcia...</span>
                </div>
              ) : selectedEntry.imageUrl ? (
                <div className="float-right w-[45%] ml-6 mb-4 relative z-10">
                  <div className="bg-[#fcfbf9] p-2 pb-8 shadow-[1px_2px_8px_rgba(0,0,0,0.4)] transform rotate-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedEntry.imageUrl}
                      alt={selectedEntry.title}
                      className="w-full h-auto object-cover border border-[#e0e0e0] mix-blend-multiply sepia-[0.2]"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                    <div className="absolute bottom-2 left-0 right-0 text-center font-special-elite text-[10px] text-black/60 italic">
                      Załącznik A
                    </div>
                  </div>
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[#2c241b]/40 text-2xl rotate-45 z-20">
                    📎
                  </div>
                </div>
              ) : null}

              {/* Treść Akt (Maszyna do pisania) */}
              <div className="text-base leading-relaxed text-[#1a140f] whitespace-pre-wrap font-special-elite">
                {selectedEntry.content}
              </div>

              {/* Cele zadania dla questów */}
              {selectedEntry.objectives && selectedEntry.objectives.length > 0 && (
                <div className="mt-8 pt-6 border-t-2 border-[#2c241b]/20 clear-both">
                  <h4 className="font-special-elite font-bold text-lg text-[#1a140f] mb-4">
                    WYTYCZNE ZADANIA
                  </h4>
                  <div className="space-y-3">
                    {selectedEntry.objectives.map((obj) => (
                      <div
                        key={obj.id}
                        className={cn(
                          'p-3 flex items-start gap-3 relative',
                          obj.completed ? 'text-[#1a140f]/50' : 'text-[#1a140f]'
                        )}
                      >
                        {/* Box do odfajkowania maszynowy */}
                        <div className="mt-0.5 font-special-elite text-lg font-bold w-6">
                          {obj.completed ? '[x]' : '[ ]'}
                        </div>
                        <div>
                          <div className={cn('text-sm font-special-elite', obj.completed && 'line-through')}>
                            {obj.description}
                          </div>
                          {obj.completed && obj.dateCompleted && (
                            <span className="text-[10px] font-bold text-[#1a140f]/60 mt-1 block">ZREALIZOWANO: {obj.dateCompleted}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tagi Maszynowe */}
              {selectedEntry.tags && selectedEntry.tags.length > 0 && (
                <div className="flex gap-2 flex-wrap mt-8 pt-4 border-t border-[#2c241b]/10 clear-both">
                  {selectedEntry.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] font-special-elite text-[#1a140f]/80 uppercase tracking-wider"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
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
