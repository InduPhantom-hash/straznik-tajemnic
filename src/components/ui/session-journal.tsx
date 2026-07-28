'use client';

import type { FormEvent } from 'react';
import { useState, useMemo, useCallback } from 'react';
import { Button } from './button';
import { Textarea } from './textarea';
import { cn } from '@/lib/utils';
import {
  Search,
  Plus,
  Trash2,
  Edit3,
  X,
  BookOpen,
  CheckCircle2,
  Circle,
  Download,
} from 'lucide-react';
import { InvestigatorBoard } from './investigator-board';
import { EvidenceNode, EvidenceRelation, InvestigatorBoardState } from '@/types/investigator-board';
import { convertEntriesToBoardNodes } from '@/lib/journal/convert-entries';
import type { JournalEntry, JournalEventType, Character, JournalEntryType, QuestObjective, ExtendedJournalEntry } from '@/lib/types';

interface SessionJournalProps {
  character: Character;
  onUpdateCharacter: (character: Character) => void;
  onClose: () => void;
  currentInGameDate?: string;
  sharedJournal?: JournalEntry[];
  onUpdateSharedJournal?: (journal: JournalEntry[]) => void;
  participantNames?: string[];
}

const categories = [
  'Wydarzenia',
  'Odkrycia',
  'Spotkania',
  'Walka',
  'Badania',
  'Sny',
  'Wizje',
  'Notatki',
  'Inne',
];

const defaultTags = [
  'Cthulhu',
  'Kult',
  'Koszmary',
  'Badania',
  'Walka',
  'Tajemnice',
  'NPC',
  'Lokalizacje',
  'Artefakty',
  'Zaklęcia',
];

export function SessionJournal({
  character,
  onUpdateCharacter,
  onClose,
  currentInGameDate,
  sharedJournal,
  onUpdateSharedJournal,
  participantNames = [],
}: SessionJournalProps) {
  const [activeTab, setActiveTab] = useState<JournalEntryType>('board');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ExtendedJournalEntry | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [encyclopediaSubTab, setEncyclopediaSubTab] = useState<
    'location' | 'character' | 'item'
  >('character');

  // Stan Tablicy Badacza z automatycznym odtworzeniem z postaci / sharedJournal
  const savedBoardState = character.investigatorBoard;

  const initialNodes = useMemo(() => {
    const rawEntries = (sharedJournal ?? character.journal ?? []) as unknown as JournalEntry[];
    const existingNodes = savedBoardState?.nodes || [];
    // Zachowujemy stare karty ułożone przez Gracza i domergowujemy nowe z dziennika
    return convertEntriesToBoardNodes(rawEntries, existingNodes);
  }, [character.journal, sharedJournal, savedBoardState]);

  const [boardNodes, setBoardNodes] = useState<EvidenceNode[]>(initialNodes);
  const [boardRelations, setBoardRelations] = useState<EvidenceRelation[]>(
    savedBoardState?.relations || []
  );

  // Funkcja pomocnicza zapisująca zaktualizowaną tablicę badacza do postaci
  const syncInvestigatorBoard = useCallback(
    (nodes: EvidenceNode[], relations: EvidenceRelation[]) => {
      const updatedBoardState: InvestigatorBoardState = {
        characterId: character.id,
        nodes,
        relations,
        lastUpdated: new Date().toISOString(),
      };

      onUpdateCharacter({
        ...character,
        investigatorBoard: updatedBoardState,
      });
    },
    [character, onUpdateCharacter]
  );

  const handleUpdateNodes = useCallback(
    (nodes: EvidenceNode[]) => {
      setBoardNodes(nodes);
      syncInvestigatorBoard(nodes, boardRelations);
    },
    [boardRelations, syncInvestigatorBoard]
  );

  const handleUpdateRelations = useCallback(
    (relations: EvidenceRelation[]) => {
      setBoardRelations(relations);
      syncInvestigatorBoard(boardNodes, relations);
    },
    [boardNodes, syncInvestigatorBoard]
  );

  const isShared = sharedJournal !== undefined;

  // Duet czyta scalony dziennik przygody, solo zachowuje dziennik postaci.
  const entries = useMemo(() => {
    const rawEntries = (sharedJournal ??
      character.journal ??
      []) as unknown as ExtendedJournalEntry[];
    return rawEntries.map((entry) => ({
      ...entry,
      type: entry.type || 'journal', // Domyślnie starsze wpisy stają się częścią kroniki
    })) as ExtendedJournalEntry[];
  }, [character.journal, sharedJournal]);

  const updateCharacterJournal = useCallback(
    (newEntries: ExtendedJournalEntry[]) => {
      if (onUpdateSharedJournal) {
        onUpdateSharedJournal(newEntries as unknown as JournalEntry[]);
        return;
      }
      onUpdateCharacter({
        ...character,
        journal: newEntries as unknown as JournalEntry[],
      });
    },
    [character, onUpdateCharacter, onUpdateSharedJournal]
  );

  const addEntry = (entry: Omit<ExtendedJournalEntry, 'id' | 'timestamp'>) => {
    const newEntry: ExtendedJournalEntry = {
      ...entry,
      id: `journal_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date(),
      inGameDate: entry.inGameDate || currentInGameDate,
    };
    const updatedEntries = [newEntry, ...entries];
    updateCharacterJournal(updatedEntries);
    setShowAddForm(false);
  };

  const updateEntry = (updatedEntry: ExtendedJournalEntry) => {
    const updatedEntries = entries.map((entry) =>
      entry.id === updatedEntry.id
        ? { ...updatedEntry, updatedAt: new Date() }
        : entry
    );
    updateCharacterJournal(updatedEntries);
    setEditingEntry(null);
  };

  const deleteEntry = (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten wpis z księgi przygód?'))
      return;
    const updatedEntries = entries.filter((entry) => entry.id !== id);
    updateCharacterJournal(updatedEntries);
    if (selectedQuestId === id) {
      setSelectedQuestId(null);
    }
  };

  // Śledzenie nieprzeczytanych wpisów w konkretnych zakładkach
  const journalSeenKey = isShared
    ? `unseen_journal_detail_${[...participantNames].sort().join('_')}`
    : character
      ? `unseen_detail_${character.id}`
      : null;

  const unseenCounts = useMemo(() => {
    if (!journalSeenKey) return { quest: 0, journal: 0, encyclopedia: 0, note: 0 };
    const questCount = entries.filter(e => e.type === 'quest').length;
    const journalCount = entries.filter(e => e.type === 'journal').length;
    const encyclopediaCount = entries.filter(e => 
      ['encyclopedia_character', 'encyclopedia_location', 'encyclopedia_item'].includes(e.type)
    ).length;
    const noteCount = entries.filter(e => e.type === 'note').length;
    
    const stored = localStorage.getItem(journalSeenKey);
    // Jeśli brak danych w LocalStorage (pierwsze wejście po załadowaniu przygody/Zimnym Starcie), oznaczamy wszystko jako przeczytane by nie spamować czerwonymi cyferkami.
    const seenData = stored ? JSON.parse(stored) : { quest: questCount, journal: journalCount, encyclopedia: encyclopediaCount, note: noteCount };
    if (!stored) localStorage.setItem(journalSeenKey, JSON.stringify(seenData));

    return {
      quest: Math.max(0, questCount - (seenData.quest || 0)),
      journal: Math.max(0, journalCount - (seenData.journal || 0)),
      encyclopedia: Math.max(0, encyclopediaCount - (seenData.encyclopedia || 0)),
      note: Math.max(0, noteCount - (seenData.note || 0)),
      location: 0, // upraszczamy podkategorie
      character: 0,
      item: 0
    };
  }, [entries, journalSeenKey]);

  // Resetowanie powiadomień dla danej zakładki po jej aktywacji
  const markTabAsSeen = useCallback((tab: JournalEntryType) => {
    if (!journalSeenKey) return;
    const stored = localStorage.getItem(journalSeenKey);
    const seenData = stored ? JSON.parse(stored) : { quest: 0, journal: 0, encyclopedia: 0, note: 0 };
    
    const questCount = entries.filter(e => e.type === 'quest').length;
    const journalCount = entries.filter(e => e.type === 'journal').length;
    const encyclopediaCount = entries.filter(e => 
      ['encyclopedia_character', 'encyclopedia_location', 'encyclopedia_item'].includes(e.type)
    ).length;
    const noteCount = entries.filter(e => e.type === 'note').length;

    if (tab === 'quest') seenData.quest = questCount;
    else if (tab === 'journal') seenData.journal = journalCount;
    else if (tab === 'encyclopedia_character' || tab === 'encyclopedia_location' || tab === 'encyclopedia_item') {
      seenData.encyclopedia = encyclopediaCount;
    }
    else if (tab === 'note') seenData.note = noteCount;

    localStorage.setItem(journalSeenKey, JSON.stringify(seenData));
  }, [entries, journalSeenKey]);

  // Uruchomienie resetu dla domyślnej zakładki przy otwarciu
  useState(() => {
    markTabAsSeen(activeTab);
  });

  const handleTabChange = (tab: JournalEntryType) => {
    setActiveTab(tab);
    markTabAsSeen(tab);
    if (tab === 'quest') {
      setSelectedQuestId(null);
    }
  };

  // Filtrowanie wpisów według wyszukiwania i typu
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // Dopasowanie do zakładki
      if (activeTab === 'quest' && entry.type !== 'quest') return false;
      if (activeTab === 'journal' && entry.type !== 'journal') return false;
      if (activeTab === 'note' && entry.type !== 'note') return false;
      if (activeTab === 'encyclopedia_character') {
        if (
          entry.type !== 'encyclopedia_character' &&
          entry.type !== 'encyclopedia_location' &&
          entry.type !== 'encyclopedia_item'
        ) {
          return false;
        }

        // Sprawdzamy podzakładkę encyklopedii
        if (
          encyclopediaSubTab === 'character' &&
          entry.type !== 'encyclopedia_character'
        )
          return false;
        if (
          encyclopediaSubTab === 'location' &&
          entry.type !== 'encyclopedia_location'
        )
          return false;
        if (encyclopediaSubTab === 'item' && entry.type !== 'encyclopedia_item')
          return false;
      }

      // Dopasowanie do wyszukiwania
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        entry.title.toLowerCase().includes(query) ||
        entry.content.toLowerCase().includes(query) ||
        (entry.tags &&
          entry.tags.some((tag) => tag.toLowerCase().includes(query)))
      );
    });
  }, [entries, activeTab, encyclopediaSubTab, searchQuery]);

  const activeQuests = useMemo(
    () =>
      filteredEntries.filter(
        (e) => e.questStatus === 'active' || !e.questStatus
      ),
    [filteredEntries]
  );
  const completedQuests = useMemo(
    () => filteredEntries.filter((e) => e.questStatus === 'completed'),
    [filteredEntries]
  );
  const failedQuests = useMemo(
    () => filteredEntries.filter((e) => e.questStatus === 'failed'),
    [filteredEntries]
  );

  const selectedQuest = useMemo(() => {
    return (
      filteredEntries.find((e) => e.id === selectedQuestId) ||
      filteredEntries[0]
    );
  }, [filteredEntries, selectedQuestId]);

  // Eksport Dziennika do pliku Markdown (Pure Helper / Local Download)
  const exportToMarkdown = useCallback(() => {
    const owner = isShared ? participantNames.join(' i ') : character.name;
    let md = `# 📖 Dziennik Przygody${owner ? `: ${owner}` : ''}\n\n`;
    md += `*Eksport: ${new Date().toLocaleString('pl-PL')}*\n\n---\n\n`;

    const quests = entries.filter((e) => e.type === 'quest');
    if (quests.length > 0) {
      md += `## ⚔️ Misje i Zadania\n\n`;
      quests.forEach((q) => {
        const status =
          q.questStatus === 'completed'
            ? '🟢 UKOŃCZONE'
            : q.questStatus === 'failed'
              ? '🔴 NIEUDANE'
              : '🟡 AKTYWNE';
        md += `### ${q.title} [${status}]\n`;
        if (q.inGameDate)
          md += `*Czas w grze: ${q.inGameDate} (Dzień ${q.gameDay || 1}, godz. ${q.gameHour || 12})*\n\n`;
        md += `${q.content}\n\n`;
        if (q.objectives && q.objectives.length > 0) {
          md += `**Cele:**\n`;
          q.objectives.forEach((obj) => {
            md += `- [${obj.completed ? 'x' : ' '}] ${obj.description}${obj.completed && obj.dateCompleted ? ` (Ukończono: ${obj.dateCompleted})` : ''}\n`;
          });
          md += `\n`;
        }
        md += `---\n\n`;
      });
    }

    const journalEntries = entries.filter((e) => e.type === 'journal');
    if (journalEntries.length > 0) {
      md += `## 📔 Kronika Wydarzeń\n\n`;
      journalEntries.forEach((e) => {
        md += `### ${e.title}\n`;
        const formattedDate = e.inGameDate || (e.timestamp ? new Date(e.timestamp).toLocaleDateString('pl-PL') : '');
        md += `*Data: ${formattedDate}*\n\n`;
        md += `${e.content}\n\n`;
        if (e.tags && e.tags.length > 0) {
          md += `*Tagi: ${e.tags.map((t) => `#${t}`).join(', ')}*\n\n`;
        }
        md += `---\n\n`;
      });
    }

    const encProps = entries.filter((e) =>
      [
        'encyclopedia_character',
        'encyclopedia_location',
        'encyclopedia_item',
      ].includes(e.type)
    );
    if (encProps.length > 0) {
      md += `## 📚 Encyklopedia Wiedzy\n\n`;
      encProps.forEach((e) => {
        const typeLabel =
          e.type === 'encyclopedia_character'
            ? 'Postać'
            : e.type === 'encyclopedia_location'
              ? 'Lokacja'
              : 'Przedmiot';
        md += `### ${e.title} [${typeLabel}]\n\n`;
        md += `${e.content}\n\n`;
        md += `---\n\n`;
      });
    }

    const notes = entries.filter((e) => e.type === 'note');
    if (notes.length > 0) {
      md += `## 📝 Notatki i Teorie\n\n`;
      notes.forEach((e) => {
        md += `### ${e.title}\n`;
        const formattedNoteDate = e.timestamp ? new Date(e.timestamp).toLocaleDateString('pl-PL') : '';
        md += `*Zapisano: ${formattedNoteDate}*\n\n`;
        md += `${e.content}\n\n`;
        md += `---\n\n`;
      });
    }

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      isShared
        ? 'dziennik_przygody_duet.md'
        : `dziennik_sesji_${character.name.replace(/\s+/g, '_').toLowerCase()}.md`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [character.name, entries, isShared, participantNames]);

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {/* RPG-styled Container wg Design Systemu (ostre krawędzie, border-brass) */}
      <div className="deco-corners relative bg-[#0c0a07] border border-[#c9a227]/25 shadow-[0_0_50px_rgba(201,162,39,0.15)] w-[95vw] max-w-[1500px] h-[90vh] flex flex-col text-[#ebe8dc]">
        {/* Narożniki Deco */}
        <span className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#c9a227]/60 pointer-events-none z-10" />
        <span className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#c9a227]/60 pointer-events-none z-10" />
        <span className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#c9a227]/60 pointer-events-none z-10" />
        <span className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#c9a227]/60 pointer-events-none z-10" />

        {/* Nagłówek i Główne Zakładki */}
        <div className="bg-[#16130f] border-b border-[#c9a227]/25 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 relative z-20">
          <div className="flex items-center gap-3">
            <BookOpen className="h-7 w-7 text-[#c9a227]" />
            <div>
              <div className="font-special-elite text-[10px] uppercase tracking-[0.32em] text-[#0d9488]">Przegląd akt</div>
              <h2 className="text-[26px] font-display font-bold uppercase tracking-[0.1em] text-[#ebe8dc] mt-1.5 leading-none">
                DZIENNIK SESJI
              </h2>
              {isShared && participantNames.length > 0 && (
                <p className="text-[11px] font-special-elite tracking-[0.1em] text-[#c9a227] mt-2">
                  WSPÓLNY DLA: {participantNames.join(' i ')}
                </p>
              )}
            </div>
          </div>

          {/* Zakładki na górze */}
          <div className="flex bg-[#120b07] p-1 rounded-lg border border-amber-900/60">
            <button
              onClick={() => handleTabChange('board')}
          <div className="flex bg-[#0c0a07] border border-[#c9a227]/25 p-1">
            <button
              onClick={() => handleTabChange('quest')}
              className={cn(
                'px-5 py-2.5 text-[11px] font-special-elite uppercase tracking-[0.15em] transition-all relative flex items-center gap-2 font-bold',
                activeTab === 'quest'
                  ? 'bg-transparent text-[#c9a227] border border-[#c9a227]/40 shadow-[inset_0_0_15px_rgba(201,162,39,0.15)]'
                  : 'text-[#8a8472] hover:text-[#b3a892] border border-transparent hover:border-[#c9a227]/20'
              )}
            >
              Misje
              {unseenCounts.quest > 0 && (
                <span className="bg-[#d9685f]/10 border border-[#d9685f]/40 text-[#d9685f] text-[10px] rounded-none px-2 py-0.5 ml-1">
                  {unseenCounts.quest} Nowych
                </span>
              )}
            </button>
            <button
              onClick={() => handleTabChange('journal')}
              className={cn(
                'px-5 py-2.5 text-[11px] font-special-elite uppercase tracking-[0.15em] transition-all relative flex items-center gap-2 font-bold',
                activeTab === 'journal'
                  ? 'bg-transparent text-[#c9a227] border border-[#c9a227]/40 shadow-[inset_0_0_15px_rgba(201,162,39,0.15)]'
                  : 'text-[#8a8472] hover:text-[#b3a892] border border-transparent hover:border-[#c9a227]/20'
              )}
            >
              Kronika
              {unseenCounts.journal > 0 && (
                <span className="bg-[#d9685f]/10 border border-[#d9685f]/40 text-[#d9685f] text-[10px] rounded-none px-2 py-0.5 ml-1">
                  {unseenCounts.journal} Nowych
                </span>
              )}
            </button>
            <button
              onClick={() => handleTabChange('encyclopedia')}
              className={cn(
                'px-5 py-2.5 text-[11px] font-special-elite uppercase tracking-[0.15em] transition-all relative flex items-center gap-2 font-bold',
                activeTab === 'encyclopedia'
                  ? 'bg-transparent text-[#c9a227] border border-[#c9a227]/40 shadow-[inset_0_0_15px_rgba(201,162,39,0.15)]'
                  : 'text-[#8a8472] hover:text-[#b3a892] border border-transparent hover:border-[#c9a227]/20'
              )}
            >
              Encyklopedia
              {unseenCounts.encyclopedia > 0 && (
                <span className="bg-[#d9685f]/10 border border-[#d9685f]/40 text-[#d9685f] text-[10px] rounded-none px-2 py-0.5 ml-1">
                  {unseenCounts.encyclopedia} Nowe
                </span>
              )}
            </button>
            <button
              onClick={() => handleTabChange('note')}
              className={cn(
                'px-5 py-2.5 text-[11px] font-special-elite uppercase tracking-[0.15em] transition-all relative flex items-center gap-2 font-bold',
                activeTab === 'note'
                  ? 'bg-transparent text-[#c9a227] border border-[#c9a227]/40 shadow-[inset_0_0_15px_rgba(201,162,39,0.15)]'
                  : 'text-[#8a8472] hover:text-[#b3a892] border border-transparent hover:border-[#c9a227]/20'
              )}
            >
              Notatki
              {unseenCounts.note > 0 && (
                <span className="bg-[#d9685f]/10 border border-[#d9685f]/40 text-[#d9685f] text-[10px] rounded-none px-2 py-0.5 ml-1">
                  {unseenCounts.note} Nowych
                </span>
              )}
            </button>
          </div>

          {/* Narzędzia i Przyciski */}
          <div className="flex gap-2 items-center">
            <Button
              onClick={() => setShowAddForm(true)}
              className="bg-amber-900/60 hover:bg-amber-800/60 text-amber-400 border border-amber-500/50/40 font-serif"
            >
              <Plus className="h-4 w-4 mr-1" /> Dodaj notatkę
            </Button>
            <Button
              onClick={() => {
                import('@/lib/test-journal-data').then(({ MOCK_JOURNAL_ENTRIES, MOCK_BOARD_NODES, MOCK_BOARD_RELATIONS }) => {
                  updateCharacterJournal([...MOCK_JOURNAL_ENTRIES, ...entries]);
                  setBoardNodes(MOCK_BOARD_NODES);
                  setBoardRelations(MOCK_BOARD_RELATIONS);
                });
              }}
              className="bg-amber-900/40 hover:bg-amber-800/50 text-amber-500 border border-amber-500/50/40 font-serif text-xs"
              title="Wypełnij dziennik przykładowymi wpisami testowymi"
            >
              🧪 Wypełnij testowo
            </Button>
            <Button
              onClick={exportToMarkdown}
              className="bg-[#2c4021] hover:bg-[#39532b] text-amber-400 border border-amber-500/50/40 font-serif"
            >
              <Download className="h-4 w-4 mr-1" /> Eksport MD
            </Button>
            {onClose && (
              <button
                onClick={onClose}
                className="ml-3 p-2 bg-[#4a1c1c] hover:bg-[#632525] rounded-md border border-[#942c2c] text-amber-400 transition-colors"
                title="Zamknij dziennik"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Wyszukiwarka */}
        <div className="bg-[#18100b] border-b border-amber-900/60 px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center bg-gray-950/80 rounded-md px-3 py-1.5 w-full sm:max-w-md border border-amber-900/60">
            <Search className="h-4 w-4 text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Wyszukaj frazę..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-sm w-full outline-none text-[#ebe8dc] placeholder-gray-600"
            />
          </div>
        </div>

        {/* Zawartość zakładek */}
        <div className="flex-1 flex overflow-hidden bg-gray-950/50 text-[#ebe8dc]">
          {/* 0. SEKCJA TABLICY BADACZA */}
          {activeTab === 'board' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <InvestigatorBoard
                nodes={boardNodes}
                relations={boardRelations}
                onUpdateNodes={handleUpdateNodes}
                onUpdateRelations={handleUpdateRelations}
              />
            </div>
          )}

          {/* 2. SEKCJA KRONIKI */}
          {activeTab === 'journal' && (
            <div className="flex-1 overflow-y-auto p-6 bg-gray-950/50 space-y-6">
              <div className="max-w-4xl mx-auto space-y-4">
                <div className="flex justify-between items-center border-b border-amber-900/60 pb-2">
                  <h3 className="text-xl font-serif font-bold text-amber-400">
                    Chronologia Wydarzeń
                  </h3>
                  <span className="text-sm text-gray-400">
                    {filteredEntries.length} wpisów
                  </span>
                </div>

                <div className="relative border-l-2 border-amber-500/50/40 pl-6 ml-4 space-y-6">
                  {filteredEntries.map((entry) => (
                    <div key={entry.id} className="relative">
                      {/* Oś czasu */}
                      <span className="absolute -left-[31px] top-1 bg-[#bfa15f] border-4 border-[#18120c] rounded-full h-4 w-4"></span>

                      <div className="bg-[#100d09] border border-[#c9a227]/20 rounded-lg p-4 shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-lg font-serif font-bold text-amber-400 flex items-center gap-2">
                              {entry.title}
                              {entry.isAutoGenerated && (
                                <span className="text-[10px] bg-[#273a4b] text-amber-400 border border-amber-500/50/30 px-1.5 py-0.5 rounded uppercase font-sans">
                                  Auto
                                </span>
                              )}
                            </h4>
                            <div className="text-xs text-gray-400 mt-0.5 flex gap-3">
                              <span>
                                📅{' '}
                                {entry.inGameDate ||
                                  (entry.timestamp
                                    ? new Date(entry.timestamp).toLocaleDateString('pl-PL')
                                    : '')}
                              </span>
                              {entry.gameDay && (
                                <span>⏳ Dzień {entry.gameDay}</span>
                              )}
                              {entry.category && (
                                <span>📁 Kategoria: {entry.category}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-1">
                            <button
                              onClick={() => setEditingEntry(entry)}
                              className="p-1 text-amber-400 hover:bg-amber-900/40 rounded transition-colors"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteEntry(entry.id)}
                              className="p-1 text-red-400 hover:bg-red-950/40 rounded transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {entry.imageUrl && (
                          <div className="mt-3 my-2 max-h-48 overflow-hidden rounded border border-amber-500/50/30 bg-gray-950/80 p-1">
                            <img
                              src={entry.imageUrl}
                              alt={entry.title}
                              className="w-full h-44 object-cover rounded"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        <p className="text-sm mt-2 whitespace-pre-wrap font-serif text-[#ebe8dc]">
                          {entry.content}
                        </p>

                        {entry.tags && entry.tags.length > 0 && (
                          <div className="flex gap-1 mt-2.5 flex-wrap">
                            {entry.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[11px] bg-amber-900/40 text-amber-400 px-2 py-0.5 rounded border border-amber-500/50/30"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {filteredEntries.length === 0 && (
                    <div className="text-center py-12 text-gray-400 italic font-serif">
                      Kronika jest pusta. Wpisy z przygód pojawią się tutaj
                      chronologicznie.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 3. SEKCJA ENCYKLOPEDII */}
          {activeTab === 'encyclopedia_character' && (
            <div className="flex-1 flex overflow-hidden">
              {/* Podzakładki encyklopedii */}
              <div className="w-1/4 border-r border-amber-900/60 bg-gray-900/40 p-4 flex flex-col gap-2">
                <div className="font-serif font-bold text-xs uppercase tracking-wider text-amber-500 border-b border-amber-900/60 pb-2 mb-2">
                  Kategorie wiedzy
                </div>
                <button
                  onClick={() => handleEncyclopediaSubTabChange('location')}
                  className={cn(
                    'w-full text-left px-4 py-2.5 rounded font-serif transition-colors border flex justify-between items-center',
                    encyclopediaSubTab === 'location'
                      ? 'bg-amber-900/40 text-amber-400 border-amber-500/50 font-semibold'
                      : 'bg-gray-950/95 backdrop-blur-md hover:bg-gray-900/80 border-transparent text-[#ebe8dc]'
                  )}
                >
                  <span>Miejsca</span>
                  {unseenCounts.location > 0 && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}
                </button>
                <button
                  onClick={() => handleEncyclopediaSubTabChange('character')}
                  className={cn(
                    'w-full text-left px-4 py-2.5 rounded font-serif transition-colors border flex justify-between items-center',
                    encyclopediaSubTab === 'character'
                      ? 'bg-amber-900/40 text-amber-400 border-amber-500/50 font-semibold'
                      : 'bg-gray-950/95 backdrop-blur-md hover:bg-gray-900/80 border-transparent text-gray-300'
                  )}
                >
                  <span>Postacie</span>
                  {unseenCounts.character > 0 && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}
                </button>
                <button
                  onClick={() => handleEncyclopediaSubTabChange('item')}
                  className={cn(
                    'w-full text-left px-4 py-2.5 rounded font-serif transition-colors border flex justify-between items-center',
                    encyclopediaSubTab === 'item'
                      ? 'bg-amber-900/40 text-amber-400 border-amber-500/50 font-semibold'
                      : 'bg-gray-950/95 backdrop-blur-md hover:bg-gray-900/80 border-transparent text-gray-300'
                  )}
                >
                  <span>Przedmioty</span>
                  {unseenCounts.item > 0 && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}
                </button>
                <button
                  onClick={() => handleEncyclopediaSubTabChange('quest')}
                  className={cn(
                    'w-full text-left px-4 py-2.5 rounded font-serif transition-colors border flex justify-between items-center',
                    encyclopediaSubTab === 'quest'
                      ? 'bg-amber-900/40 text-amber-400 border-amber-500/50 font-semibold'
                      : 'bg-gray-950/95 backdrop-blur-md hover:bg-gray-900/80 border-transparent text-gray-300'
                  )}
                >
                  <span>Misje</span>
                  {unseenCounts.quest > 0 && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}
                </button>
              </div>

              {/* Grid wpisów */}
              <div className="flex-1 overflow-y-auto p-6 bg-gray-950/50">
                {encyclopediaSubTab !== 'quest' && (
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="bg-gray-900/40 border border-amber-900/60 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow relative flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start border-b border-amber-900/60 pb-2">
                          <h4 className="text-lg font-serif font-bold text-amber-400">
                            {entry.title}
                          </h4>
                          <div className="flex gap-1">
                            <button
                              onClick={() => setEditingEntry(entry)}
                              className="p-1 text-amber-400 hover:bg-amber-900/40 rounded transition-colors"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteEntry(entry.id)}
                              className="p-1 text-red-400 hover:bg-red-950/40 rounded transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
)}
{/* PODZAKŁADKA MISJI W ODKRYCIACH */}
          {encyclopediaSubTab === 'quest' && (
            <div className="flex-1 flex overflow-hidden">
              {/* Lewa kolumna: Lista misji */}
              <div className="w-1/3 border-r-2 border-amber-900/60 overflow-y-auto bg-gray-900/40 p-4 space-y-4">
                <div className="font-serif font-bold text-xs uppercase tracking-wider text-amber-500 border-b border-amber-900/60 pb-1">
                  Aktywne przygody ({activeQuests.length})
                </div>
                <div className="space-y-1.5">
                  {activeQuests.map((quest) => (
                    <button
                      key={quest.id}
                      onClick={() => setSelectedQuestId(quest.id)}
                      className={cn(
                        'w-full text-left p-3 rounded-md transition-all font-serif border',
                        selectedQuestId === quest.id ||
                          (!selectedQuestId && selectedQuest?.id === quest.id)
                          ? 'bg-amber-900/40 text-amber-400 border-amber-500/50 shadow-md'
                          : 'bg-gray-950/95 backdrop-blur-md hover:bg-gray-900/80 border-transparent text-gray-300'
                      )}
                    >
                      <div className="font-bold text-base">{quest.title}</div>
                      <div className="text-xs mt-1 line-clamp-1 opacity-80">
                        {quest.content}
                      </div>
                    </button>
                  ))}
                  {activeQuests.length === 0 && (
                    <div className="text-sm text-center py-6 text-gray-400 italic">
                      Brak aktywnych misji
                    </div>
                  )}
                </div>

                {completedQuests.length > 0 && (
                  <>
                    <div className="font-serif font-bold text-xs uppercase tracking-wider text-[#73a15c] border-b border-amber-900/60 pt-4 pb-1">
                      Ukończone przygody ({completedQuests.length})
                    </div>
                    <div className="space-y-1.5">
                      {completedQuests.map((quest) => (
                        <button
                          key={quest.id}
                          onClick={() => setSelectedQuestId(quest.id)}
                          className={cn(
                            'w-full text-left p-3 rounded-md transition-all font-serif border opacity-80',
                            selectedQuestId === quest.id
                              ? 'bg-amber-900/40 text-amber-400 border-amber-500/50 shadow-md'
                              : 'bg-[#142310] hover:bg-[#1d3318] border-transparent text-[#a3d18e]'
                          )}
                        >
                          <div className="font-bold text-base">
                            {quest.title}
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {failedQuests.length > 0 && (
                  <>
                    <div className="font-serif font-bold text-xs uppercase tracking-wider text-[#a84d4d] border-b border-amber-900/60 pt-4 pb-1">
                      Nieudane przygody ({failedQuests.length})
                    </div>
                    <div className="space-y-1.5">
                      {failedQuests.map((quest) => (
                        <button
                          key={quest.id}
                          onClick={() => setSelectedQuestId(quest.id)}
                          className={cn(
                            'w-full text-left p-3 rounded-md transition-all font-serif border opacity-80',
                            selectedQuestId === quest.id
                              ? 'bg-amber-900/40 text-amber-400 border-amber-500/50 shadow-md'
                              : 'bg-red-950/40 hover:bg-[#3d1818] border-transparent text-[#e3a8a8]'
                          )}
                        >
                          <div className="font-bold text-base">
                            {quest.title}
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Prawa kolumna: Szczegóły wybranej misji */}
              <div className="flex-1 overflow-y-auto p-6 bg-gray-950/50 flex flex-col justify-between">
                {selectedQuest ? (
                  <div className="space-y-6">
                    <div className="flex justify-between items-start border-b-2 border-amber-900/60 pb-3">
                      <div>
                        <h3 className="text-xl font-serif font-bold text-amber-400">
                          {selectedQuest.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={cn(
                              'text-xs px-2 py-0.5 rounded font-serif font-semibold border',
                              selectedQuest.questStatus === 'completed'
                                ? 'bg-[#142310] border-[#73a15c] text-[#a3d18e]'
                                : selectedQuest.questStatus === 'failed'
                                  ? 'bg-red-950/40 border-[#a84d4d] text-[#e3a8a8]'
                                  : 'bg-gray-900/80 border-amber-500/50 text-amber-400'
                            )}
                          >
                            {selectedQuest.questStatus === 'completed'
                              ? 'Ukończona'
                              : selectedQuest.questStatus === 'failed'
                                ? 'Nieudana'
                                : 'Aktywna'}
                          </span>
                          <span className="text-xs text-gray-400">
                            Wpis z dnia:{' '}
                            {selectedQuest.inGameDate ||
                              (selectedQuest.timestamp
                                ? new Date(selectedQuest.timestamp).toLocaleDateString('pl-PL')
                                : '')}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setEditingEntry(selectedQuest)}
                          variant="outline"
                          size="sm"
                          className="border-amber-500/50 hover:bg-gray-900/80 text-amber-400 bg-transparent"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => deleteEntry(selectedQuest.id)}
                          variant="outline"
                          size="sm"
                          className="border-[#942c2c] hover:bg-red-950/40 text-red-400 bg-transparent"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Opis misji */}
                    <div className="text-base leading-relaxed text-gray-300 whitespace-pre-wrap font-serif italic bg-gray-900/40 p-4 rounded-md border border-amber-900/60">
                      {selectedQuest.content}
                    </div>

                    {/* Cele misji */}
                    <div className="space-y-3">
                      <h4 className="font-serif font-bold text-lg text-amber-400 border-b border-amber-900/60 pb-1">
                        Postępy i Cele zadania
                      </h4>
                      <div className="space-y-3">
                        {selectedQuest.objectives &&
                        selectedQuest.objectives.length > 0 ? (
                          selectedQuest.objectives.map((obj) => (
                            <div
                              key={obj.id}
                              className={cn(
                                'p-3 rounded border flex items-start gap-3 transition-colors',
                                obj.completed
                                  ? 'bg-[#142310] border-[#2c4c19] text-[#a3d18e]'
                                  : 'bg-gray-900/40 border-amber-900/60 text-gray-300'
                              )}
                            >
                              <button
                                onClick={() => {
                                  const updatedObjectives =
                                    selectedQuest.objectives?.map((o) =>
                                      o.id === obj.id
                                        ? {
                                            ...o,
                                            completed: !o.completed,
                                            dateCompleted: !o.completed
                                              ? new Date().toLocaleDateString(
                                                  'pl-PL'
                                                )
                                              : undefined,
                                          }
                                        : o
                                    );
                                  updateEntry({
                                    ...selectedQuest,
                                    objectives: updatedObjectives,
                                  });
                                }}
                                className="mt-0.5 focus:outline-none"
                              >
                                {obj.completed ? (
                                  <CheckCircle2 className="h-5 w-5 text-[#73a15c] fill-[#142310]" />
                                ) : (
                                  <Circle className="h-5 w-5 text-gray-400" />
                                )}
                              </button>
                              <div className="flex-1">
                                <div
                                  className={cn(
                                    'text-base font-serif',
                                    obj.completed &&
                                      'line-through text-gray-400'
                                  )}
                                >
                                  {obj.description}
                                </div>
                                <div className="text-xs text-gray-400 mt-1 flex gap-2">
                                  {obj.gameDay && (
                                    <span>Dzień {obj.gameDay}</span>
                                  )}
                                  {obj.gameHour && (
                                    <span>godzina {obj.gameHour}</span>
                                  )}
                                  {obj.completed && obj.dateCompleted && (
                                    <span className="text-[#73a15c]">
                                      Ukończono: {obj.dateCompleted}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-gray-400 italic">
                            Brak celów szczegółowych. Możesz je dodać edytując
                            misję.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-400 italic font-serif">
                    Wybierz misję z listy po lewej stronie lub dodaj nową
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. SEKCJA KRONIKI */}

                        {entry.imageUrl && (
                          <div className="my-2 max-h-40 overflow-hidden rounded border border-amber-500/50/30 bg-gray-950/80 p-1">
                            <img
                              src={entry.imageUrl}
                              alt={entry.title}
                              className="w-full h-36 object-cover rounded"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        <p className="text-sm font-serif leading-relaxed text-gray-300 whitespace-pre-wrap">
                          {entry.content}
                        </p>
                      </div>

                      {entry.tags && entry.tags.length > 0 && (
                        <div className="flex gap-1 mt-3 flex-wrap border-t border-amber-900/60 pt-2">
                          {entry.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] bg-amber-900/40/50 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/50/20"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {filteredEntries.length === 0 && (
                    <div className="col-span-full text-center py-16 text-gray-400 italic font-serif">
                      Brak wpisów w tej kategorii encyklopedii.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 4. SEKCJA NOTATEK */}
          {activeTab === 'note' && (
            <div className="flex-1 overflow-y-auto p-6 bg-gray-950/50">
              <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-gray-900/40 border border-amber-900/60 hover:border-amber-500/50/50 transition-all shadow-md rounded-lg p-5 flex flex-col justify-between min-h-[220px] group"
                  >
                    <div>
                      <div className="flex justify-between items-start border-b border-amber-900/60 pb-2.5 mb-3">
                        <h4 className="font-serif font-bold text-lg text-amber-400 group-hover:text-amber-500 transition-colors leading-snug">
                          {entry.title}
                        </h4>
                        <div className="flex gap-1.5 flex-none ml-2">
                          <button
                            onClick={() => setEditingEntry(entry)}
                            className="p-1 text-gray-400 hover:text-amber-400 hover:bg-amber-900/40 rounded transition-colors"
                            title="Edytuj notatkę"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteEntry(entry.id)}
                            className="p-1 text-red-400/70 hover:text-red-400 hover:bg-red-950/40 rounded transition-colors"
                            title="Usuń notatkę"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {entry.imageUrl && (
                        <div className="my-2 max-h-40 overflow-hidden rounded border border-amber-500/50/30 bg-gray-950/80 p-1">
                          <img
                            src={entry.imageUrl}
                            alt={entry.title}
                            className="w-full h-36 object-cover rounded"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      <p className="text-sm font-serif leading-relaxed text-gray-300/90 whitespace-pre-wrap">
                        {entry.content}
                      </p>
                    </div>

                    <div className="text-xs text-gray-400 border-t border-amber-900/60/70 pt-2.5 mt-4 flex justify-between items-center font-special-elite">
                      <span>
                        📅{' '}
                        {entry.inGameDate ||
                          (entry.timestamp
                            ? new Date(entry.timestamp).toLocaleDateString('pl-PL')
                            : '')}
                      </span>
                      {entry.tags && entry.tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap justify-end">
                          {entry.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] bg-amber-900/40/60 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/50/20"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {filteredEntries.length === 0 && (
                  <div className="col-span-full text-center py-16 text-gray-400 italic font-serif">
                    Brak własnych zapisków. Dodaj nową notatkę.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Formularze dialogowe */}
      {showAddForm && (
        <AddEntryForm
          onAdd={addEntry}
          onCancel={() => setShowAddForm(false)}
          categories={categories}
          defaultTags={defaultTags}
          initialType={activeTab}
        />
      )}

      {editingEntry && (
        <EditEntryForm
          entry={editingEntry}
          onUpdate={updateEntry}
          onCancel={() => setEditingEntry(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
// FORMULARZE POMOCNICZE
// ============================================================================

interface AddEntryFormProps {
  onAdd: (entry: Omit<ExtendedJournalEntry, 'id' | 'timestamp'>) => void;
  onCancel: () => void;
  categories: string[];
  defaultTags: string[];
  initialType: JournalEntryType;
}

function AddEntryForm({
  onAdd,
  onCancel,
  categories,
  defaultTags,
  initialType,
}: AddEntryFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: categories[0],
    tags: [] as string[],
    isAutoGenerated: false,
    type: (initialType === 'encyclopedia_character'
      ? 'encyclopedia_character'
      : initialType) as JournalEntryType,
    gameDay: 1,
    gameHour: 12,
    questStatus: 'active' as 'active' | 'completed' | 'failed',
    objectives: [] as QuestObjective[],
  });
  const [newTag, setNewTag] = useState('');
  const [newObjective, setNewObjective] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (formData.title.trim() && formData.content.trim()) {
      onAdd(formData);
    }
  };

  const addTag = (tag: string) => {
    if (tag.trim() && !formData.tags.includes(tag.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tag.trim()] });
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((tag) => tag !== tagToRemove),
    });
  };

  const addObjective = () => {
    if (newObjective.trim()) {
      const obj: QuestObjective = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
        description: newObjective.trim(),
        completed: false,
        gameDay: formData.gameDay,
        gameHour: formData.gameHour,
      };
      setFormData({ ...formData, objectives: [...formData.objectives, obj] });
      setNewObjective('');
    }
  };

  const removeObjective = (id: string) => {
    setFormData({
      ...formData,
      objectives: formData.objectives.filter((o) => o.id !== id),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[60] p-4">
      <div className="bg-gray-950/95 backdrop-blur-md border-4 border-amber-900/60 rounded-xl p-6 w-[90vw] max-w-[800px] max-h-[90vh] overflow-y-auto text-gray-300 font-serif shadow-2xl">
        <div className="flex justify-between items-center border-b border-amber-900/60 pb-3 mb-5">
          <h3 className="text-xl font-bold text-amber-400">
            Dodaj nowy wpis do księgi przygód
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-amber-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-amber-400">
              Typ wpisu
            </label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  type: e.target.value as JournalEntryType,
                })
              }
              className="w-full p-2.5 bg-gray-950/80 border border-amber-900/60 rounded-md text-gray-300 focus:border-amber-500/50 focus:outline-none"
            >
              <option value="quest">Misja (Quest)</option>
              <option value="journal">Wpis do Dziennika (Kronika)</option>
              <option value="encyclopedia_character">
                Encyklopedia - Postać / Byt
              </option>
              <option value="encyclopedia_location">
                Encyklopedia - Lokacja
              </option>
              <option value="encyclopedia_item">
                Encyklopedia - Przedmiot
              </option>
              <option value="note">Własna notatka / Teoria</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-amber-400">
                Dzień kampanii
              </label>
              <input
                type="number"
                min="1"
                value={formData.gameDay}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    gameDay: parseInt(e.target.value) || 1,
                  })
                }
                className="w-full p-2.5 bg-gray-950/80 border border-amber-900/60 rounded-md text-gray-300 focus:border-amber-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-amber-400">
                Godzina
              </label>
              <input
                type="number"
                min="0"
                max="23"
                value={formData.gameHour}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    gameHour: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full p-2.5 bg-gray-950/80 border border-amber-900/60 rounded-md text-gray-300 focus:border-amber-500/50 focus:outline-none"
              />
            </div>
          </div>

          {formData.type === 'quest' && (
            <div>
              <label className="block text-sm font-medium mb-1.5 text-amber-400">
                Status misji
              </label>
              <select
                value={formData.questStatus}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    questStatus: e.target.value as
                      | 'active'
                      | 'completed'
                      | 'failed',
                  })
                }
                className="w-full p-2.5 bg-gray-950/80 border border-amber-900/60 rounded-md text-gray-300 focus:border-amber-500/50 focus:outline-none"
              >
                <option value="active">Aktywna</option>
                <option value="completed">Ukończona</option>
                <option value="failed">Nieudana</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5 text-amber-400">
              Tytuł wpisu
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full p-2.5 bg-gray-950/80 border border-amber-900/60 rounded-md text-gray-300 focus:border-amber-500/50 focus:outline-none placeholder-gray-600"
              placeholder="np. Śledztwo w Domu Corbitów"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-amber-400">
              Treść / Opis
            </label>
            <Textarea
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              className="min-h-32 bg-gray-950/80 text-gray-300 border-amber-900/60 focus-visible:ring-[#bfa15f] placeholder-gray-600"
              placeholder="Zapisz szczegóły przygody lub informacje o postaci/przedmiocie..."
              required
            />
          </div>

          {formData.type === 'quest' && (
            <div className="border border-amber-900/60 p-4 rounded-md bg-gray-950/80/40 space-y-3">
              <label className="block text-sm font-serif font-bold text-amber-400 border-b border-amber-900/60 pb-1">
                Cele zadania
              </label>
              <div className="space-y-2">
                {formData.objectives.map((obj, i) => (
                  <div
                    key={obj.id}
                    className="flex justify-between items-center bg-gray-950/80 p-2 rounded border border-amber-900/60 text-sm"
                  >
                    <span className="truncate">
                      {i + 1}. {obj.description}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeObjective(obj.id)}
                      className="text-[#942c2c] hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newObjective}
                  onChange={(e) => setNewObjective(e.target.value)}
                  placeholder="Nowy cel misji..."
                  className="flex-1 p-2 bg-gray-950/80 border border-amber-900/60 rounded-md text-sm text-gray-300 outline-none focus:border-amber-500/50"
                  onKeyDown={(e) =>
                    e.key === 'Enter' && (e.preventDefault(), addObjective())
                  }
                />
                <Button
                  type="button"
                  onClick={addObjective}
                  className="bg-amber-900/40 hover:bg-amber-800/50 text-amber-400"
                >
                  Dodaj cel
                </Button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5 text-amber-400">
              Tagi
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-amber-900/60/60 text-amber-400 border border-amber-500/50/25"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 text-gray-400 hover:text-red-400"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                className="flex-1 p-2 bg-gray-950/80 border border-amber-900/60 rounded-md text-gray-300 focus:border-amber-500/50 focus:outline-none placeholder-gray-600"
                placeholder="Dodaj własny tag..."
                onKeyDown={(e) =>
                  e.key === 'Enter' && (e.preventDefault(), addTag(newTag))
                }
              />
              <Button
                type="button"
                onClick={() => addTag(newTag)}
                className="bg-amber-900/40 hover:bg-amber-800/50 text-amber-400"
              >
                +
              </Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {defaultTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag)}
                  className="px-2 py-0.5 text-xs bg-gray-950/80 hover:bg-[#1a110a] text-gray-400 rounded border border-amber-900/60"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-3 border-t border-amber-900/60">
            <Button
              type="submit"
              className="flex-1 py-3 bg-amber-900/60 hover:bg-amber-800/60 text-amber-400 border border-amber-500/50/40"
              disabled={!formData.title.trim() || !formData.content.trim()}
            >
              Zapisz wpis
            </Button>
            <Button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 bg-gray-800/80 hover:bg-gray-700/80 text-gray-400"
            >
              Anuluj
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface EditEntryFormProps {
  entry: ExtendedJournalEntry;
  onUpdate: (entry: ExtendedJournalEntry) => void;
  onCancel: () => void;
}

function EditEntryForm({ entry, onUpdate, onCancel }: EditEntryFormProps) {
  const [formData, setFormData] = useState(entry);
  const [newTag, setNewTag] = useState('');
  const [newObjective, setNewObjective] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (formData.title.trim() && formData.content.trim()) {
      onUpdate(formData);
    }
  };

  const addTag = (tag: string) => {
    if (tag.trim() && !formData.tags.includes(tag.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tag.trim()] });
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((tag) => tag !== tagToRemove),
    });
  };

  const addObjective = () => {
    if (newObjective.trim()) {
      const obj: QuestObjective = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
        description: newObjective.trim(),
        completed: false,
        gameDay: formData.gameDay,
        gameHour: formData.gameHour,
      };
      setFormData({
        ...formData,
        objectives: [...(formData.objectives || []), obj],
      });
      setNewObjective('');
    }
  };

  const removeObjective = (id: string) => {
    setFormData({
      ...formData,
      objectives: (formData.objectives || []).filter((o) => o.id !== id),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[60] p-4">
      <div className="bg-gray-950/95 backdrop-blur-md border-4 border-amber-900/60 rounded-xl p-6 w-[90vw] max-w-[800px] max-h-[90vh] overflow-y-auto text-gray-300 font-serif shadow-2xl">
        <div className="flex justify-between items-center border-b border-amber-900/60 pb-3 mb-5">
          <h3 className="text-xl font-bold text-amber-400">
            Edytuj wpis w księdze przygód
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-amber-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-amber-400">
              Typ wpisu
            </label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  type: e.target.value as JournalEntryType,
                })
              }
              className="w-full p-2.5 bg-gray-950/80 border border-amber-900/60 rounded-md text-gray-300 focus:border-amber-500/50 focus:outline-none"
            >
              <option value="quest">Misja (Quest)</option>
              <option value="journal">Wpis do Dziennika (Kronika)</option>
              <option value="encyclopedia_character">
                Encyklopedia - Postać / Byt
              </option>
              <option value="encyclopedia_location">
                Encyklopedia - Lokacja
              </option>
              <option value="encyclopedia_item">
                Encyklopedia - Przedmiot
              </option>
              <option value="note">Własna notatka / Teoria</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-amber-400">
                Dzień kampanii
              </label>
              <input
                type="number"
                min="1"
                value={formData.gameDay || 1}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    gameDay: parseInt(e.target.value) || 1,
                  })
                }
                className="w-full p-2.5 bg-gray-950/80 border border-amber-900/60 rounded-md text-gray-300 focus:border-amber-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-amber-400">
                Godzina
              </label>
              <input
                type="number"
                min="0"
                max="23"
                value={formData.gameHour || 0}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    gameHour: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full p-2.5 bg-gray-950/80 border border-amber-900/60 rounded-md text-gray-300 focus:border-amber-500/50 focus:outline-none"
              />
            </div>
          </div>

          {formData.type === 'quest' && (
            <div>
              <label className="block text-sm font-medium mb-1.5 text-amber-400">
                Status misji
              </label>
              <select
                value={formData.questStatus || 'active'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    questStatus: e.target.value as
                      | 'active'
                      | 'completed'
                      | 'failed',
                  })
                }
                className="w-full p-2.5 bg-gray-950/80 border border-amber-900/60 rounded-md text-gray-300 focus:border-amber-500/50 focus:outline-none"
              >
                <option value="active">Aktywna</option>
                <option value="completed">Ukończona</option>
                <option value="failed">Nieudana</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5 text-amber-400">
              Tytuł wpisu
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full p-2.5 bg-gray-950/80 border border-amber-900/60 rounded-md text-gray-300 focus:border-amber-500/50 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-amber-400">
              Treść / Opis
            </label>
            <Textarea
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              className="min-h-32 bg-gray-950/80 text-gray-300 border-amber-900/60 focus-visible:ring-[#bfa15f]"
              required
            />
          </div>

          {formData.type === 'quest' && (
            <div className="border border-amber-900/60 p-4 rounded-md bg-gray-950/80/40 space-y-3">
              <label className="block text-sm font-serif font-bold text-amber-400 border-b border-amber-900/60 pb-1">
                Cele zadania
              </label>
              <div className="space-y-2">
                {(formData.objectives || []).map((obj, i) => (
                  <div
                    key={obj.id}
                    className="flex justify-between items-center bg-gray-950/80 p-2 rounded border border-amber-900/60 text-sm"
                  >
                    <span className="truncate">
                      {i + 1}. {obj.description}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeObjective(obj.id)}
                      className="text-[#942c2c] hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newObjective}
                  onChange={(e) => setNewObjective(e.target.value)}
                  placeholder="Nowy cel misji..."
                  className="flex-1 p-2 bg-gray-950/80 border border-amber-900/60 rounded-md text-sm text-gray-300 outline-none"
                  onKeyDown={(e) =>
                    e.key === 'Enter' && (e.preventDefault(), addObjective())
                  }
                />
                <Button
                  type="button"
                  onClick={addObjective}
                  className="bg-amber-900/40 hover:bg-amber-800/50 text-amber-400"
                >
                  Dodaj
                </Button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5 text-amber-400">
              Tagi
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-amber-900/60/60 text-amber-400 border border-amber-500/50/25"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 text-gray-400 hover:text-red-400"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                className="flex-1 p-2 bg-gray-950/80 border border-amber-900/60 rounded-md text-gray-300 focus:border-amber-500/50 focus:outline-none"
                placeholder="Dodaj własny tag..."
                onKeyDown={(e) =>
                  e.key === 'Enter' && (e.preventDefault(), addTag(newTag))
                }
              />
              <Button
                type="button"
                onClick={() => addTag(newTag)}
                className="bg-amber-900/40 hover:bg-amber-800/50 text-amber-400"
              >
                +
              </Button>
            </div>
          </div>

          <div className="flex gap-3 pt-3 border-t border-amber-900/60">
            <Button
              type="submit"
              className="flex-1 py-3 bg-amber-900/60 hover:bg-amber-800/60 text-amber-400 border border-amber-500/50/40"
              disabled={!formData.title.trim() || !formData.content.trim()}
            >
              Zapisz zmiany
            </Button>
            <Button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 bg-gray-800/80 hover:bg-gray-700/80 text-gray-400"
            >
              Anuluj
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
