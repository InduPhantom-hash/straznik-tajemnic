'use client';

import { SafeImage } from '@/components/ui/safe-image';
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  MapPin,
  Users,
  FileText,
  Target,
  Search,
  Plus,
  Pin,
  Edit3,
  Trash2,
  X,
  Maximize2,
  Sparkles,
  Eye,
} from 'lucide-react';
import { findEquipmentTemplate, resolveCatalogAsset } from '@/lib/equipment-catalog';
import { findEntityVisualReference } from '@/lib/journal/entity-visual-resolver';
import type { Character, NPC, Location } from '@/lib/types';
import type {
  ClueCategory,
  ClueStatus,
  NpcRelationshipStatus,
  LocationSearchStatus,
} from '@/lib/journal/dossier-types';

// ------------------------------------------------------------------
// Typy - Akta Śledcze (Investigator's Dossier CoC 7e RAW)
// ------------------------------------------------------------------

export interface DiscoveryEntry {
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
  /** Wniosek Badacza / Dedukcja postaci */
  investigatorInsight?: string;
  // Pola Dossier CoC 7e RAW:
  clueCategory?: ClueCategory;
  clueStatus?: ClueStatus;
  isKeyClue?: boolean;
  sourceNpc?: string;
  foundLocation?: string;
  relationshipStatus?: NpcRelationshipStatus;
  occupation?: string;
  firstImpression?: string;
  keyInformation?: string;
  searchStatus?: LocationSearchStatus;
  addressOrRegion?: string;
  discoveredClueIds?: string[];
}

export type DiscoveryCategory = 'places' | 'characters' | 'items' | 'quests';

interface DiscoveriesViewProps {
  entries: DiscoveryEntry[];
  onEditEntry: (entry: DiscoveryEntry) => void;
  onDeleteEntry: (id: string) => void;
  /** Callback przypinania elementu do tablicy badacza przez szufladę poszlak */
  onPinToBoard?: (entry: DiscoveryEntry) => void;
  searchQuery?: string;
  activeCharacter?: Character | null;
  npcs?: NPC[];
  locations?: Location[];
}

// ------------------------------------------------------------------
// Stałe
// ------------------------------------------------------------------

type CategoryLabelKey = 'categoryPlaces' | 'categoryCharacters' | 'categoryItems' | 'categoryQuests';
type EmptyTextKey = 'emptyPlaces' | 'emptyCharacters' | 'emptyItems' | 'emptyQuests';
type QuestStatusLabelKey = 'questActive' | 'questCompleted' | 'questFailed';

const CATEGORIES: {
  key: DiscoveryCategory;
  labelKey: CategoryLabelKey;
  Icon: typeof MapPin;
  types: string[];
  emptyTextKey: EmptyTextKey;
}[] = [
  {
    key: 'places',
    labelKey: 'categoryPlaces',
    Icon: MapPin,
    types: ['encyclopedia_location', 'location'],
    emptyTextKey: 'emptyPlaces',
  },
  {
    key: 'characters',
    labelKey: 'categoryCharacters',
    Icon: Users,
    types: ['encyclopedia_character', 'npc', 'character'],
    emptyTextKey: 'emptyCharacters',
  },
  {
    key: 'items',
    labelKey: 'categoryItems',
    Icon: FileText,
    types: ['encyclopedia_item', 'item', 'discovery', 'document', 'handout'],
    emptyTextKey: 'emptyItems',
  },
  {
    key: 'quests',
    labelKey: 'categoryQuests',
    Icon: Target,
    types: ['quest', 'clue', 'evidence'],
    emptyTextKey: 'emptyQuests',
  },
];

const QUEST_STATUS_STYLE: Record<string, { bg: string; border: string; text: string; labelKey: QuestStatusLabelKey }> = {
  active: { bg: 'bg-[#2a1b12]', border: 'border-[#bfa15f]', text: 'text-[#f4ebd0]', labelKey: 'questActive' },
  completed: { bg: 'bg-[#142310]', border: 'border-[#73a15c]', text: 'text-[#a3d18e]', labelKey: 'questCompleted' },
  failed: { bg: 'bg-[#2b1010]', border: 'border-[#a84d4d]', text: 'text-[#e3a8a8]', labelKey: 'questFailed' },
};

// ------------------------------------------------------------------
// Komponent Główny
// ------------------------------------------------------------------

export function DiscoveriesView({
  entries,
  onEditEntry,
  onDeleteEntry,
  onPinToBoard,
  searchQuery = '',
  activeCharacter,
  npcs = [],
  locations = [],
}: DiscoveriesViewProps) {
  const t = useTranslations('DiscoveriesView');
  const [activeCategory, setActiveCategory] = useState<DiscoveryCategory>('places');
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [isEditingInsight, setIsEditingInsight] = useState(false);
  const [insightText, setInsightText] = useState('');
  const [localFastFilter, setLocalFastFilter] = useState('');
  const [isFullscreenImageOpen, setIsFullscreenImageOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Obsługa klawisza Escape dla modala pełnoekranowego
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreenImageOpen) {
        setIsFullscreenImageOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreenImageOpen]);

  // Reset pozycji przewijania przy zmianie wpisu lub kategorii
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [selectedEntryId, activeCategory]);

  const categoryConfig = CATEGORIES.find((c) => c.key === activeCategory)!;

  // Efektywne zapytanie wyszukiwania FTS (Fast Filter)
  const effectiveQuery = useMemo(() => {
    return (searchQuery || localFastFilter).trim().toLowerCase();
  }, [searchQuery, localFastFilter]);

  // Filtrowanie po kategorii i wyszukiwaniu w czasie rzeczywistym
  const categoryEntries = useMemo(() => {
    let filtered = entries.filter((e) => {
      if (categoryConfig.key === 'items' && e.clueCategory === 'document') {
        return true;
      }
      return categoryConfig.types.includes(e.type);
    });
    if (effectiveQuery) {
      filtered = filtered.filter((e) => {
        const titleMatch = e.title?.toLowerCase().includes(effectiveQuery);
        const contentMatch = e.content?.toLowerCase().includes(effectiveQuery);
        const tagMatch = e.tags?.some((tag) => tag.toLowerCase().includes(effectiveQuery));
        const sourceMatch =
          e.sourceNpc?.toLowerCase().includes(effectiveQuery) ||
          e.foundLocation?.toLowerCase().includes(effectiveQuery) ||
          e.addressOrRegion?.toLowerCase().includes(effectiveQuery) ||
          e.occupation?.toLowerCase().includes(effectiveQuery);
        const insightMatch = e.investigatorInsight?.toLowerCase().includes(effectiveQuery);
        return titleMatch || contentMatch || tagMatch || sourceMatch || insightMatch;
      });
    }
    return filtered;
  }, [entries, effectiveQuery, categoryConfig.types, categoryConfig.key]);

  // Liczniki per kategoria (bez filtra wyszukiwania)
  const counts = useMemo(() => {
    const result: Record<DiscoveryCategory, number> = { places: 0, characters: 0, items: 0, quests: 0 };
    for (const entry of entries) {
      if (entry.clueCategory === 'document') {
        result.items++;
      }
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

  // Rozwiązywanie obrazu dla wybranego wpisu
  const resolvedVisual = useMemo(() => {
    if (!selectedEntry) return null;

    if (selectedEntry.imageUrl) {
      return { imageUrl: selectedEntry.imageUrl, source: 'entry' as const };
    }

    const ref = findEntityVisualReference(selectedEntry.title, {
      character: activeCharacter,
      npcs,
      locations,
    });
    if (ref && ref.imageUrl) {
      return { imageUrl: ref.imageUrl, source: 'resolver' as const };
    }

    if (activeCategory === 'items') {
      const template = findEquipmentTemplate(selectedEntry.title);
      if (template) {
        const asset = resolveCatalogAsset(template, '1920s');
        if (asset) {
          return { imageUrl: asset, source: 'catalog' as const };
        }
      }
    }

    return null;
  }, [selectedEntry, activeCategory, activeCharacter, npcs, locations]);

  // Zmiana statusu poszlaki CoC 7e RAW (potwierdzona / hipoteza / wykluczona)
  const handleClueStatusChange = useCallback(
    (status: ClueStatus) => {
      if (!selectedEntry) return;
      onEditEntry({
        ...selectedEntry,
        clueStatus: status,
        questStatus:
          status === 'confirmed'
            ? 'completed'
            : status === 'disproven'
              ? 'failed'
              : 'active',
      });
    },
    [onEditEntry, selectedEntry]
  );

  // Zmiana relacji postaci CoC 7e
  const handleNpcRelationshipChange = useCallback(
    (rel: NpcRelationshipStatus) => {
      if (!selectedEntry) return;
      onEditEntry({
        ...selectedEntry,
        relationshipStatus: rel,
      });
    },
    [onEditEntry, selectedEntry]
  );

  // Zmiana stanu przeszukania lokacji CoC 7e
  const handleLocationSearchStatusChange = useCallback(
    (status: LocationSearchStatus) => {
      if (!selectedEntry) return;
      onEditEntry({
        ...selectedEntry,
        searchStatus: status,
      });
    },
    [onEditEntry, selectedEntry]
  );

  return (
    <div data-testid="discoveries-view" className="flex-1 flex overflow-hidden">
      {/* === LEWY SIDEBAR: Teczki Spraw + Szybki Filtr FTS + Lista === */}
      <div className="w-72 flex flex-col border-r-2 border-[#3a2518] bg-[#120905]">
        {/* Teczki Spraw (Kategorie) */}
        <div className="p-3 border-b border-[#3a2518] space-y-1">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => {
                  setActiveCategory(cat.key);
                  setSelectedEntryId(null);
                  setIsEditingInsight(false);
                }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-md font-serif text-sm transition-all group',
                  isActive
                    ? 'bg-[#3a2518] text-[#f4ebd0] border border-[#bfa15f]/60 shadow-inner'
                    : 'text-[#a29182] hover:text-[#e2d4c9] hover:bg-[#1a110a] border border-transparent'
                )}
              >
                <cat.Icon className={cn('h-4 w-4 flex-shrink-0', isActive ? 'text-[#bfa15f]' : 'text-[#8a7667]')} />
                <span className="flex-1 text-left font-bold">{t(cat.labelKey)}</span>
                <span
                  className={cn(
                    'text-xs font-mono font-bold min-w-[24px] text-center rounded-full px-2 py-0.5 border shadow-sm transition-all',
                    isActive
                      ? 'bg-[#bfa15f] text-[#120905] border-[#f4ebd0] shadow-[0_0_8px_rgba(191,161,95,0.4)]'
                      : 'bg-[#24150c] text-[#f4ebd0] border-[#bfa15f]/60 group-hover:border-[#bfa15f]'
                  )}
                >
                  {counts[cat.key]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Wyszukiwarka FTS (Fast Filter) w czasie rzeczywistym */}
        <div className="p-2 border-b border-[#3a2518] bg-[#18100b]">
          <div className="flex items-center bg-zinc-950 rounded px-2.5 py-1.5 border border-[#3a2518] focus-within:border-[#bfa15f]/80">
            <Search className="h-3.5 w-3.5 text-[#8a7667] mr-2 shrink-0" />
            <input
              type="text"
              placeholder={t('fastFilterPlaceholder')}
              value={localFastFilter}
              onChange={(e) => setLocalFastFilter(e.target.value)}
              className="bg-transparent text-xs w-full outline-none text-[#f4ebd0] placeholder-[#8a7667]"
            />
            {localFastFilter && (
              <button
                type="button"
                onClick={() => setLocalFastFilter('')}
                className="text-[#8a7667] hover:text-[#f4ebd0] p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          {effectiveQuery && (
            <div className="text-[10px] text-[#8a7667] font-mono mt-1 px-1 flex justify-between">
              <span>{t('matchingCount', { count: categoryEntries.length })}</span>
            </div>
          )}
        </div>

        {/* Lista elementów w wybranej teczce */}
        <div className="flex-1 overflow-y-auto journal-scroll p-3 space-y-1.5">
          {categoryEntries.map((entry) => {
            const isSelected = selectedEntry?.id === entry.id;
            const questStyle = entry.questStatus ? QUEST_STATUS_STYLE[entry.questStatus] : null;

            return (
              <button
                key={entry.id}
                onClick={() => {
                  setSelectedEntryId(entry.id);
                  setIsEditingInsight(false);
                }}
                className={cn(
                  'w-full text-left p-2.5 rounded-md transition-all font-serif border-l-4 border-y border-r',
                  isSelected
                    ? 'bg-[#2a1b12] text-[#f4ebd0] border-l-[#bfa15f] border-y-[#3a2518] border-r-[#3a2518] shadow-md translate-x-1'
                    : questStyle
                      ? `${questStyle.bg} hover:brightness-110 border-l-[#bfa15f]/40 border-y-transparent border-r-transparent ${questStyle.text}`
                      : 'bg-[#18120c] hover:bg-[#21160f] border-l-[#3a2518] border-y-transparent border-r-transparent text-[#e2d4c9]'
                )}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="font-bold text-sm leading-snug truncate flex-1">
                    {entry.isKeyClue && <span className="text-[#bfa15f] mr-1">⭐</span>}
                    {entry.title}
                  </div>
                  {entry.clueStatus && (
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full mt-1 shrink-0',
                        entry.clueStatus === 'confirmed'
                          ? 'bg-[#73a15c]'
                          : entry.clueStatus === 'disproven'
                            ? 'bg-[#a84d4d]'
                            : 'bg-[#bfa15f]'
                      )}
                      title={entry.clueStatus}
                    />
                  )}
                </div>

                <div className="text-[11px] mt-1 line-clamp-1 opacity-70">
                  {entry.content}
                </div>

                {/* Sub-tagi CoC 7e w liście */}
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {entry.clueCategory && (
                    <span className="text-[9px] uppercase font-mono px-1 py-0.5 rounded bg-[#24150c] text-[#bfa15f] border border-[#bfa15f]/30">
                      {entry.clueCategory === 'forensic'
                        ? t('clueCategoryForensic')
                        : entry.clueCategory === 'document'
                          ? t('clueCategoryDocument')
                          : entry.clueCategory === 'testimony'
                            ? t('clueCategoryTestimony')
                            : t('clueCategoryOccult')}
                    </span>
                  )}
                  {entry.relationshipStatus && (
                    <span className="text-[9px] uppercase font-mono px-1 py-0.5 rounded bg-[#24150c] text-[#d1c2ab] border border-[#d1c2ab]/30">
                      {entry.relationshipStatus === 'friendly'
                        ? t('npcRelFriendly')
                        : entry.relationshipStatus === 'hostile'
                          ? t('npcRelHostile')
                          : entry.relationshipStatus === 'suspicious'
                            ? t('npcRelSuspicious')
                            : entry.relationshipStatus === 'deceased'
                              ? t('npcRelDeceased')
                              : t('npcRelNeutral')}
                    </span>
                  )}
                  {entry.searchStatus && (
                    <span className="text-[9px] uppercase font-mono px-1 py-0.5 rounded bg-[#24150c] text-[#d1c2ab] border border-[#d1c2ab]/30">
                      {entry.searchStatus === 'thoroughly_searched'
                        ? t('locStatusThoroughlySearched')
                        : entry.searchStatus === 'partially_searched'
                          ? t('locStatusPartiallySearched')
                          : t('locStatusUnvisited')}
                    </span>
                  )}
                  {questStyle && !entry.clueStatus && (
                    <span
                      className={cn(
                        'text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border',
                        questStyle.bg,
                        questStyle.border,
                        questStyle.text
                      )}
                    >
                      {t(questStyle.labelKey)}
                    </span>
                  )}
                </div>
              </button>
            );
          })}

          {categoryEntries.length === 0 && (
            <div className="text-center py-10 text-[#8a7667] italic font-serif text-sm px-4">
              <categoryConfig.Icon className="h-10 w-10 mx-auto mb-3 text-[#3a2518]" />
              {t(categoryConfig.emptyTextKey)}
            </div>
          )}
        </div>
      </div>

      {/* === PRAWY PANEL: Podgląd wybranego elementu (AKTA ŚLEDCZE) === */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto journal-scroll p-6 bg-[#120c08] relative">
        {selectedEntry ? (
          <div className="max-w-2xl mx-auto">
            {/* Teczka / Karta Akt Sprawy */}
            <div className="bg-[#e4d8c6] text-[#2c241b] rounded shadow-[2px_4px_16px_rgba(0,0,0,0.6)] relative p-8 md:p-10 border border-[#d1c2ab] before:absolute before:inset-0 before:bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] before:opacity-30 before:pointer-events-none">
              {/* Pieczęć POUFNE */}
              <div className="absolute top-6 right-8 border-4 border-[#8a1c1c] text-[#8a1c1c] opacity-60 font-special-elite text-xl px-2 py-1 transform rotate-[15deg] uppercase pointer-events-none">
                {t('confidentialStamp')}
              </div>

              {/* Nagłówek Akt */}
              <div className="border-b-2 border-[#2c241b]/30 pb-4 mb-6 relative">
                <div className="font-special-elite text-xs uppercase tracking-[0.2em] text-[#2c241b]/60 mb-2 flex items-center gap-2">
                  <span>{t('dossierPrefix', { category: t(categoryConfig.labelKey) })}</span>
                  {selectedEntry.isKeyClue && (
                    <span className="bg-[#bfa15f] text-[#120905] px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 shadow-sm">
                      <Sparkles className="h-3 w-3" />
                      {t('keyClueBadge')}
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-start gap-4">
                  <h3 className="text-3xl font-special-elite font-bold text-[#1a140f] leading-tight flex-1">
                    {selectedEntry.title}
                  </h3>

                  {/* Narzędzia akt */}
                  <div className="flex gap-1.5 opacity-60 hover:opacity-100 transition-opacity shrink-0">
                    {resolvedVisual && (
                      <button
                        type="button"
                        onClick={() => setIsFullscreenImageOpen(true)}
                        className="p-1.5 text-[#2c241b] hover:bg-[#2c241b]/10 rounded transition-colors"
                        title={t('fullscreenPreview')}
                      >
                        <Maximize2 className="h-5 w-5" />
                      </button>
                    )}
                    {onPinToBoard && (
                      <button
                        type="button"
                        onClick={() => onPinToBoard(selectedEntry)}
                        className="p-1.5 text-[#2c241b] hover:bg-[#2c241b]/10 rounded transition-colors"
                        title={t('pinToBoardTitle')}
                      >
                        <Pin className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onEditEntry(selectedEntry)}
                      className="p-1.5 text-[#2c241b] hover:bg-[#2c241b]/10 rounded transition-colors"
                      title={t('editTitle')}
                    >
                      <Edit3 className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteEntry(selectedEntry.id)}
                      className="p-1.5 text-[#8a1c1c] hover:bg-[#8a1c1c]/10 rounded transition-colors"
                      title={t('deleteTitle')}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Metadane CoC 7e RAW w nagłówku */}
                <div className="flex flex-wrap items-center gap-4 mt-3">
                  {selectedEntry.inGameDate && (
                    <div className="text-xs text-[#2c241b]/70 font-special-elite font-bold">
                      {t('recordDate', { date: selectedEntry.inGameDate })}
                    </div>
                  )}

                  {/* 1. SELEKTOR STATUSU POSZLAKI */}
                  {(activeCategory === 'quests' || selectedEntry.clueStatus) && (
                    <div className="text-xs font-special-elite font-bold flex items-center gap-1.5">
                      <span>{t('statusLabel')}</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleClueStatusChange('unconfirmed')}
                          className={cn(
                            'px-2 py-0.5 rounded border text-[10px] uppercase font-bold transition-all',
                            selectedEntry.clueStatus === 'unconfirmed' || !selectedEntry.clueStatus
                              ? 'bg-[#2c241b] text-[#f4ebd0] border-[#2c241b]'
                              : 'bg-transparent text-[#2c241b]/60 border-[#2c241b]/30 hover:bg-[#2c241b]/10'
                          )}
                          title={t('changeStatusTooltip')}
                        >
                          {t('clueStatusUnconfirmed')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleClueStatusChange('confirmed')}
                          className={cn(
                            'px-2 py-0.5 rounded border text-[10px] uppercase font-bold transition-all',
                            selectedEntry.clueStatus === 'confirmed'
                              ? 'bg-[#73a15c] text-[#120905] border-[#73a15c]'
                              : 'bg-transparent text-[#335620] border-[#73a15c]/50 hover:bg-[#73a15c]/20'
                          )}
                          title={t('changeStatusTooltip')}
                        >
                          {t('clueStatusConfirmed')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleClueStatusChange('disproven')}
                          className={cn(
                            'px-2 py-0.5 rounded border text-[10px] uppercase font-bold transition-all',
                            selectedEntry.clueStatus === 'disproven'
                              ? 'bg-[#8a1c1c] text-[#f4ebd0] border-[#8a1c1c]'
                              : 'bg-transparent text-[#8a1c1c] border-[#8a1c1c]/50 hover:bg-[#8a1c1c]/20'
                          )}
                          title={t('changeStatusTooltip')}
                        >
                          {t('clueStatusDisproven')}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 2. SELEKTOR RELACJI DLA POSTACI (NPC) */}
                  {activeCategory === 'characters' && (
                    <div className="text-xs font-special-elite font-bold flex items-center gap-1.5">
                      <span>{t('relationshipLabel')}</span>
                      <div className="flex gap-1 flex-wrap">
                        {(['friendly', 'neutral', 'suspicious', 'hostile', 'deceased'] as NpcRelationshipStatus[]).map(
                          (rel) => {
                            const isCurrent = selectedEntry.relationshipStatus === rel;
                            return (
                              <button
                                key={rel}
                                type="button"
                                onClick={() => handleNpcRelationshipChange(rel)}
                                className={cn(
                                  'px-1.5 py-0.5 rounded border text-[10px] uppercase font-bold transition-all',
                                  isCurrent
                                    ? rel === 'friendly'
                                      ? 'bg-[#73a15c] text-[#120905] border-[#73a15c]'
                                      : rel === 'suspicious'
                                        ? 'bg-[#bfa15f] text-[#120905] border-[#bfa15f]'
                                        : rel === 'hostile' || rel === 'deceased'
                                          ? 'bg-[#8a1c1c] text-[#f4ebd0] border-[#8a1c1c]'
                                          : 'bg-[#2c241b] text-[#f4ebd0] border-[#2c241b]'
                                    : 'bg-transparent text-[#2c241b]/60 border-[#2c241b]/30 hover:bg-[#2c241b]/10'
                                )}
                                title={t('changeRelTooltip')}
                              >
                                {rel === 'friendly'
                                  ? t('npcRelFriendly')
                                  : rel === 'hostile'
                                    ? t('npcRelHostile')
                                    : rel === 'suspicious'
                                      ? t('npcRelSuspicious')
                                      : rel === 'deceased'
                                        ? t('npcRelDeceased')
                                        : t('npcRelNeutral')}
                              </button>
                            );
                          }
                        )}
                      </div>
                    </div>
                  )}

                  {/* 3. SELEKTOR EKSPLORACJI DLA LOKACJI */}
                  {activeCategory === 'places' && (
                    <div className="text-xs font-special-elite font-bold flex items-center gap-1.5">
                      <span>{t('searchStatusLabel')}</span>
                      <div className="flex gap-1">
                        {(
                          [
                            'unvisited',
                            'partially_searched',
                            'thoroughly_searched',
                          ] as LocationSearchStatus[]
                        ).map((status) => {
                          const isCurrent = (selectedEntry.searchStatus || 'partially_searched') === status;
                          return (
                            <button
                              key={status}
                              type="button"
                              onClick={() => handleLocationSearchStatusChange(status)}
                              className={cn(
                                'px-1.5 py-0.5 rounded border text-[10px] uppercase font-bold transition-all',
                                isCurrent
                                  ? status === 'thoroughly_searched'
                                    ? 'bg-[#73a15c] text-[#120905] border-[#73a15c]'
                                    : status === 'partially_searched'
                                      ? 'bg-[#bfa15f] text-[#120905] border-[#bfa15f]'
                                      : 'bg-[#2c241b] text-[#f4ebd0] border-[#2c241b]'
                                  : 'bg-transparent text-[#2c241b]/60 border-[#2c241b]/30 hover:bg-[#2c241b]/10'
                              )}
                              title={t('changeSearchTooltip')}
                            >
                              {status === 'thoroughly_searched'
                                ? t('locStatusThoroughlySearched')
                                : status === 'partially_searched'
                                  ? t('locStatusPartiallySearched')
                                  : t('locStatusUnvisited')}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Dodatkowe metadane: Źródło, Zawód, Rejon */}
                <div className="flex flex-wrap gap-4 mt-2 text-xs font-special-elite text-[#2c241b]/80">
                  {selectedEntry.sourceNpc && (
                    <div>
                      <span className="font-bold">{t('witnessLabel')} </span>
                      <span>{selectedEntry.sourceNpc}</span>
                    </div>
                  )}
                  {selectedEntry.foundLocation && (
                    <div>
                      <span className="font-bold">{t('locationLabel')} </span>
                      <span>{selectedEntry.foundLocation}</span>
                    </div>
                  )}
                  {selectedEntry.occupation && (
                    <div>
                      <span className="font-bold">{t('occupationLabel')} </span>
                      <span>{selectedEntry.occupation}</span>
                    </div>
                  )}
                  {selectedEntry.addressOrRegion && (
                    <div>
                      <span className="font-bold">{t('addressLabel')} </span>
                      <span>{selectedEntry.addressOrRegion}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Zdjęcie (Pionowy Polaroid Retro - klikalny podgląd) */}
              {selectedEntry.imageStatus === 'pending' ? (
                <div className="float-right w-48 sm:w-52 ml-6 mb-4 h-56 bg-[#d8cbb5] p-4 flex flex-col items-center justify-center gap-2 text-[#5c4a3d] border border-[#d8cbb5] shadow-inner transform rotate-2">
                  <div className="w-5 h-5 border-2 border-[#5c4a3d] border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs font-special-elite italic">{t('imagePending')}</span>
                </div>
              ) : resolvedVisual ? (
                <div className="float-right w-48 sm:w-52 ml-6 mb-4 relative z-10 group">
                  <div
                    onClick={() => setIsFullscreenImageOpen(true)}
                    className="bg-[#fcfbf9] p-2.5 pb-6 shadow-[2px_4px_12px_rgba(0,0,0,0.35)] transform rotate-2 border border-[#e2ded5] cursor-pointer hover:rotate-0 hover:scale-105 transition-all"
                  >
                    <div className="w-full aspect-[3/4] overflow-hidden bg-[#1a140f] border border-[#d1c2ab] relative">
                      <SafeImage
                        src={resolvedVisual.imageUrl}
                        alt={selectedEntry.title}
                        className="w-full h-full object-cover object-top mix-blend-multiply sepia-[0.2]"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                        <Eye className="h-6 w-6 drop-shadow" />
                      </div>
                    </div>
                    <div className="mt-2 text-center font-special-elite text-[9px] text-black/60 italic truncate px-1">
                      {t('attachmentPrefix', { title: selectedEntry.title })}
                    </div>
                  </div>
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[#2c241b]/50 text-2xl rotate-45 z-20 pointer-events-none">
                    📎
                  </div>
                </div>
              ) : null}

              {/* Treść Akt (Maszyna do pisania) */}
              <div className="text-base leading-relaxed text-[#1a140f] whitespace-pre-wrap font-special-elite">
                {selectedEntry.content}
              </div>

              {/* Sekcja: Wnioski Badacza / Dedukcja */}
              {isEditingInsight ? (
                <div className="bg-[#d9cbb2] border-2 border-[#8c7353] p-4 my-4 rounded shadow-sm text-[#1f1712] clear-both">
                  <div className="flex items-center gap-2 font-special-elite font-bold text-xs tracking-wider uppercase text-[#5a4428] mb-2">
                    <Search className="h-4 w-4 text-[#8c7353]" />
                    <span>{t('insightHeading')}</span>
                  </div>
                  <textarea
                    value={insightText}
                    onChange={(e) => setInsightText(e.target.value)}
                    placeholder={t('insightPlaceholder')}
                    className="w-full bg-[#f4ebd0] border border-[#8c7353] rounded p-2.5 font-special-elite text-sm text-[#1f1712] placeholder-[#8c7353]/60 focus:outline-none focus:ring-1 focus:ring-[#8c7353] min-h-[90px] resize-y"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2 mt-2.5">
                    <button
                      type="button"
                      onClick={() => setIsEditingInsight(false)}
                      className="px-3 py-1 text-xs font-special-elite text-[#5a4428] hover:text-[#1f1712] border border-[#8c7353]/50 rounded"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onEditEntry({
                          ...selectedEntry,
                          investigatorInsight: insightText.trim() || undefined,
                        });
                        setIsEditingInsight(false);
                      }}
                      className="px-3 py-1 text-xs font-special-elite bg-[#8c7353] hover:bg-[#725c40] text-[#f4ebd0] rounded font-bold transition-colors"
                    >
                      {t('saveInsight')}
                    </button>
                  </div>
                </div>
              ) : selectedEntry.investigatorInsight ? (
                <div className="bg-[#d9cbb2] border-2 border-[#8c7353] p-4 my-4 rounded shadow-sm text-[#1f1712] relative clear-both">
                  <div className="flex items-center justify-between border-b border-[#8c7353]/30 pb-2 mb-2">
                    <div className="flex items-center gap-2 font-special-elite font-bold text-xs tracking-wider uppercase text-[#5a4428]">
                      <Search className="h-4 w-4 text-[#8c7353]" />
                      <span>{t('insightHeading')}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setInsightText(selectedEntry.investigatorInsight || '');
                        setIsEditingInsight(true);
                      }}
                      className="text-xs font-special-elite text-[#5a4428] hover:text-[#1f1712] underline flex items-center gap-1 opacity-75 hover:opacity-100 transition-opacity"
                      title={t('editInsight')}
                    >
                      <Edit3 className="h-3 w-3" /> {t('editInsight')}
                    </button>
                  </div>
                  <p className="font-special-elite text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedEntry.investigatorInsight}
                  </p>
                </div>
              ) : (
                <div className="my-4 clear-both">
                  <button
                    type="button"
                    onClick={() => {
                      setInsightText('');
                      setIsEditingInsight(true);
                    }}
                    className="w-full py-2 px-3 border-2 border-dashed border-[#8c7353]/50 hover:border-[#8c7353] rounded bg-[#d9cbb2]/40 hover:bg-[#d9cbb2]/70 text-[#5a4428] font-special-elite text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t('addInsight')}
                  </button>
                </div>
              )}

              {/* Cele zadania dla legacy questów */}
              {selectedEntry.objectives && selectedEntry.objectives.length > 0 && (
                <div className="mt-8 pt-6 border-t-2 border-[#2c241b]/20 clear-both">
                  <h4 className="font-special-elite font-bold text-lg text-[#1a140f] mb-4">
                    {t('objectivesHeading')}
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
                        <div className="mt-0.5 font-special-elite text-lg font-bold w-6">
                          {obj.completed ? '[x]' : '[ ]'}
                        </div>
                        <div>
                          <div className={cn('text-sm font-special-elite', obj.completed && 'line-through')}>
                            {obj.description}
                          </div>
                          {obj.completed && obj.dateCompleted && (
                            <span className="text-[10px] font-bold text-[#1a140f]/60 mt-1 block">
                              {t('objectiveCompleted', { date: obj.dateCompleted })}
                            </span>
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
            <p className="text-lg mb-1">{t('discoveriesInCategory', { category: t(categoryConfig.labelKey) })}</p>
            <p className="text-sm">{t('selectFromList')}</p>
          </div>
        )}
      </div>

      {/* === RETRO LIGHTBOX MODAL: Pełnoekranowy podgląd wycinka/dokumentu === */}
      {isFullscreenImageOpen && resolvedVisual && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[70] p-4 sm:p-8"
          onClick={() => setIsFullscreenImageOpen(false)}
        >
          <div
            className="bg-[#1c120c] border-4 border-[#8c7353] rounded-xl p-4 max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative text-[#f4ebd0] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-[#3a2518]">
              <div className="font-special-elite text-lg font-bold text-[#bfa15f]">
                {selectedEntry?.title}
              </div>
              <button
                type="button"
                onClick={() => setIsFullscreenImageOpen(false)}
                className="p-1 text-[#a29182] hover:text-[#f4ebd0] rounded transition-colors"
                title={t('closeLightbox')}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[300px]">
              <SafeImage
                src={resolvedVisual.imageUrl}
                alt={selectedEntry?.title || ''}
                className="max-h-[68vh] w-auto object-contain rounded border-2 border-[#d1c2ab] shadow-lg sepia-[0.2]"
              />
            </div>

            {selectedEntry?.content && (
              <div className="p-3 bg-zinc-950/80 rounded border border-[#3a2518] text-xs font-special-elite text-[#d1c2ab] max-h-28 overflow-y-auto">
                {selectedEntry.content}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
