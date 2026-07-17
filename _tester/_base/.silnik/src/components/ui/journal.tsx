'use client';

import type { FormEvent } from 'react';
import { useState, useEffect } from 'react';
import { Button } from './button';
import { Textarea } from './textarea';
import { cn } from '@/lib/utils';
import { Search, Plus, Trash2, Edit3, X, Save, RefreshCw, FileText, BookOpen, Scroll, CheckCircle2, Circle } from 'lucide-react';

export type { JournalEntry, JournalEntryType, QuestObjective } from '@/lib/journal/types';
import type { JournalEntry, JournalEntryType, QuestObjective } from '@/lib/journal/types';

interface JournalProps {
  entries: JournalEntry[];
  onEntriesChange: (entries: JournalEntry[]) => void;
  onClose?: () => void;
  currentSessionId?: string;
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

export function Journal({
  entries,
  onEntriesChange,
  onClose,
  currentSessionId,
}: JournalProps) {
  const [activeTab, setActiveTab] = useState<JournalEntryType>('quest');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [journalId, setJournalId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  
  // Stan dla aktywnej misji po lewej stronie
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  // Stan dla podkategorii w Encyklopedii
  const [encyclopediaSubTab, setEncyclopediaSubTab] = useState<'location' | 'character' | 'item'>('character');

  // Ładowanie dziennika z chmury
  const loadJournal = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/journal');
      const data = await response.json();

      if (data.success && data.journal) {
        setJournalId(data.journal.id);
        
        // Zapewnienie, że stare wpisy bez pola type mają domyślnie 'journal'
        const processedEntries = (data.journal.entries || []).map((entry: any) => ({
          ...entry,
          type: entry.type || 'journal'
        }));
        
        onEntriesChange(processedEntries);
        setLastSaved(data.journal.lastUpdated);
      }
    } catch (error) {
      console.error('Error loading journal:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Zapisywanie dziennika do chmury
  const saveJournal = async () => {
    setIsSaving(true);
    try {
      const journalData = {
        name: 'Mój Dziennik',
        date: new Date().toISOString(),
        entries: entries,
      };

      const url = '/api/journal';
      const method = journalId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          journalData,
          journalId: journalId || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setJournalId(data.journalId);
        setLastSaved(data.lastUpdated);
      }
    } catch (error) {
      console.error('Error saving journal:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save co 30 sekund
  useEffect(() => {
    if (entries.length > 0) {
      const interval = setInterval(() => {
        saveJournal();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [entries]);

  // Ładowanie dziennika przy pierwszym renderze
  useEffect(() => {
    if (entries.length === 0) {
      loadJournal();
    }
  }, []);

  const addEntry = async (entry: Omit<JournalEntry, 'id' | 'date'>) => {
    const newEntry: JournalEntry = {
      ...entry,
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('pl-PL'),
      sessionId: currentSessionId,
    };
    const updatedEntries = [newEntry, ...entries];
    onEntriesChange(updatedEntries);
    setShowAddForm(false);

    // Auto-save po dodaniu wpisu
    setTimeout(() => saveJournal(), 1000);
  };

  const updateEntry = async (updatedEntry: JournalEntry) => {
    const updatedEntries = entries.map((entry) =>
      entry.id === updatedEntry.id ? updatedEntry : entry
    );
    onEntriesChange(updatedEntries);
    setEditingEntry(null);

    // Auto-save po edycji wpisu
    setTimeout(() => saveJournal(), 1000);
  };

  const deleteEntry = async (id: string) => {
    const updatedEntries = entries.filter((entry) => entry.id !== id);
    onEntriesChange(updatedEntries);
    if (selectedQuestId === id) {
      setSelectedQuestId(null);
    }

    // Auto-save po usunięciu wpisu
    setTimeout(() => saveJournal(), 1000);
  };

  // Filtrowanie wpisów według wyszukiwania i typu
  const filteredEntries = entries.filter((entry) => {
    // Dopasowanie do zakładki
    if (activeTab === 'quest' && entry.type !== 'quest') return false;
    if (activeTab === 'journal' && entry.type !== 'journal') return false;
    if (activeTab === 'note' && entry.type !== 'note') return false;
    if (activeTab === 'encyclopedia_character') {
      if (entry.type !== 'encyclopedia_character' && entry.type !== 'encyclopedia_location' && entry.type !== 'encyclopedia_item') {
        return false;
      }
      // Sprawdzamy podzakładkę encyklopedii
      if (encyclopediaSubTab === 'character' && entry.type !== 'encyclopedia_character') return false;
      if (encyclopediaSubTab === 'location' && entry.type !== 'encyclopedia_location') return false;
      if (encyclopediaSubTab === 'item' && entry.type !== 'encyclopedia_item') return false;
    }

    // Dopasowanie do wyszukiwania
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      entry.title.toLowerCase().includes(query) ||
      entry.content.toLowerCase().includes(query) ||
      entry.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  // Obsługa kliknięcia wyboru misji
  const activeQuests = filteredEntries.filter(e => e.questStatus === 'active' || !e.questStatus);
  const completedQuests = filteredEntries.filter(e => e.questStatus === 'completed');
  const failedQuests = filteredEntries.filter(e => e.questStatus === 'failed');

  const selectedQuest = filteredEntries.find(e => e.id === selectedQuestId) || filteredEntries[0];

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4">
      {/* RPG-styled Container (drewniana ramka, pergaminowe tło) */}
      <div className="bg-[#1c120c] border-4 border-[#3a2518] rounded-xl shadow-2xl w-[95vw] max-w-[1500px] h-[90vh] flex flex-col overflow-hidden text-[#e2d4c9]">
        
        {/* Nagłówek i Główne Zakładki (Mosiężno-drewniany styl) */}
        <div className="bg-[#2a1b12] border-b-2 border-[#3a2518] px-6 py-3 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <BookOpen className="h-7 w-7 text-[#bfa15f]" />
            <h2 className="text-2xl font-serif font-bold tracking-wider text-[#f4ebd0] drop-shadow-md">
              DZIENNIK PRZYGODY
            </h2>
          </div>

          {/* Zakładki na górze */}
          <div className="flex bg-[#120b07] p-1 rounded-lg border border-[#3a2518]">
            <button
              onClick={() => { setActiveTab('quest'); setSelectedQuestId(null); }}
              className={cn(
                "px-5 py-2 text-sm font-serif font-semibold rounded-md transition-all",
                activeTab === 'quest' 
                  ? "bg-[#3a2518] text-[#f4ebd0] shadow-inner border border-[#bfa15f]/30" 
                  : "text-[#a29182] hover:text-[#e2d4c9] hover:bg-[#1a110a]"
              )}
            >
              Misje
            </button>
            <button
              onClick={() => setActiveTab('journal')}
              className={cn(
                "px-5 py-2 text-sm font-serif font-semibold rounded-md transition-all",
                activeTab === 'journal' 
                  ? "bg-[#3a2518] text-[#f4ebd0] shadow-inner border border-[#bfa15f]/30" 
                  : "text-[#a29182] hover:text-[#e2d4c9] hover:bg-[#1a110a]"
              )}
            >
              Dziennik
            </button>
            <button
              onClick={() => setActiveTab('encyclopedia_character')}
              className={cn(
                "px-5 py-2 text-sm font-serif font-semibold rounded-md transition-all",
                activeTab === 'encyclopedia_character' 
                  ? "bg-[#3a2518] text-[#f4ebd0] shadow-inner border border-[#bfa15f]/30" 
                  : "text-[#a29182] hover:text-[#e2d4c9] hover:bg-[#1a110a]"
              )}
            >
              Encyklopedia
            </button>
            <button
              onClick={() => setActiveTab('note')}
              className={cn(
                "px-5 py-2 text-sm font-serif font-semibold rounded-md transition-all",
                activeTab === 'note' 
                  ? "bg-[#3a2518] text-[#f4ebd0] shadow-inner border border-[#bfa15f]/30" 
                  : "text-[#a29182] hover:text-[#e2d4c9] hover:bg-[#1a110a]"
              )}
            >
              Notatki
            </button>
          </div>

          {/* Narzędzia i Przyciski Zapisu/Wyjścia */}
          <div className="flex gap-2 items-center">
            <Button
              onClick={() => setShowAddForm(true)}
              className="bg-[#5c3e21] hover:bg-[#704d2b] text-[#f4ebd0] border border-[#bfa15f]/40 font-serif"
            >
              <Plus className="h-4 w-4 mr-1" /> Dodaj Wpis
            </Button>
            <Button
              onClick={saveJournal}
              disabled={isSaving}
              className="bg-[#2c4021] hover:bg-[#39532b] text-[#f4ebd0] border border-[#bfa15f]/40 font-serif"
            >
              <Save className="h-4 w-4 mr-1" /> {isSaving ? 'Zapisywanie...' : 'Zapisz'}
            </Button>
            <Button
              onClick={loadJournal}
              disabled={isLoading}
              className="bg-[#273a4b] hover:bg-[#344d63] text-[#f4ebd0] border border-[#bfa15f]/40 font-serif"
            >
              <RefreshCw className="h-4 w-4 mr-1" /> Odśwież
            </Button>
            {onClose && (
              <button
                onClick={onClose}
                className="ml-3 p-2 bg-[#4a1c1c] hover:bg-[#632525] rounded-md border border-[#942c2c] text-[#f4ebd0] transition-colors"
                title="Zamknij dziennik"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Wyszukiwarka */}
        <div className="bg-[#18100b] border-b border-[#3a2518] px-6 py-2 flex items-center justify-between">
          <div className="flex items-center bg-[#0d0906] rounded-md px-3 py-1.5 w-full max-w-md border border-[#3a2518]">
            <Search className="h-4 w-4 text-[#8a7667] mr-2" />
            <input
              type="text"
              placeholder="Wyszukaj frazę..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-sm w-full outline-none text-[#e2d4c9] placeholder-[#5a4d43]"
            />
          </div>
          {lastSaved && (
            <span className="text-xs text-[#8a7667]">
              Ostatnia synchronizacja: {new Date(lastSaved).toLocaleTimeString('pl-PL')}
            </span>
          )}
        </div>

        {/* Zawartość zakładek */}
        <div className="flex-1 flex overflow-hidden bg-[#e8dcce] text-[#2c1810]">
          
          {/* 1. SEKCJA MISJI */}
          {activeTab === 'quest' && (
            <div className="flex-1 flex overflow-hidden">
              {/* Lewa kolumna: Lista misji */}
              <div className="w-1/3 border-r-2 border-[#d9cbb9] overflow-y-auto bg-[#decab4] p-4 space-y-4">
                <div className="font-serif font-bold text-xs uppercase tracking-wider text-[#6b4c35] border-b border-[#c8b7a4] pb-1">
                  Aktywne przygody ({activeQuests.length})
                </div>
                <div className="space-y-1.5">
                  {activeQuests.map((quest) => (
                    <button
                      key={quest.id}
                      onClick={() => setSelectedQuestId(quest.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-md transition-all font-serif border",
                        (selectedQuestId === quest.id || (!selectedQuestId && selectedQuest?.id === quest.id))
                          ? "bg-[#2a1b12] text-[#f4ebd0] border-[#bfa15f] shadow-md"
                          : "bg-[#e5d4c0] hover:bg-[#d8c4ad] border-transparent text-[#3c2a1a]"
                      )}
                    >
                      <div className="font-bold text-base">{quest.title}</div>
                      <div className="text-xs mt-1 line-clamp-1 opacity-80">{quest.content}</div>
                    </button>
                  ))}
                  {activeQuests.length === 0 && (
                    <div className="text-sm text-center py-6 text-[#7c695b] italic">Brak aktywnych misji</div>
                  )}
                </div>

                {completedQuests.length > 0 && (
                  <>
                    <div className="font-serif font-bold text-xs uppercase tracking-wider text-[#496538] border-b border-[#c8b7a4] pt-4 pb-1">
                      Ukończone przygody ({completedQuests.length})
                    </div>
                    <div className="space-y-1.5">
                      {completedQuests.map((quest) => (
                        <button
                          key={quest.id}
                          onClick={() => setSelectedQuestId(quest.id)}
                          className={cn(
                            "w-full text-left p-3 rounded-md transition-all font-serif border opacity-80",
                            selectedQuestId === quest.id
                              ? "bg-[#2a1b12] text-[#f4ebd0] border-[#bfa15f] shadow-md"
                              : "bg-[#d5e2cd] hover:bg-[#c3d1b8] border-transparent text-[#2b4c19]"
                          )}
                        >
                          <div className="font-bold text-base">{quest.title}</div>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {failedQuests.length > 0 && (
                  <>
                    <div className="font-serif font-bold text-xs uppercase tracking-wider text-[#8b3d3d] border-b border-[#c8b7a4] pt-4 pb-1">
                      Nieudane przygody ({failedQuests.length})
                    </div>
                    <div className="space-y-1.5">
                      {failedQuests.map((quest) => (
                        <button
                          key={quest.id}
                          onClick={() => setSelectedQuestId(quest.id)}
                          className={cn(
                            "w-full text-left p-3 rounded-md transition-all font-serif border opacity-80",
                            selectedQuestId === quest.id
                              ? "bg-[#2a1b12] text-[#f4ebd0] border-[#bfa15f] shadow-md"
                              : "bg-[#ebd3d3] hover:bg-[#dfc1c1] border-transparent text-[#6e2929]"
                          )}
                        >
                          <div className="font-bold text-base">{quest.title}</div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Prawa kolumna: Szczegóły wybranej misji */}
              <div className="flex-1 overflow-y-auto p-6 bg-[#f5efe6] flex flex-col justify-between">
                {selectedQuest ? (
                  <div className="space-y-6">
                    <div className="flex justify-between items-start border-b-2 border-[#bfa15f]/30 pb-3">
                      <div>
                        <h3 className="text-2xl font-serif font-bold text-[#4a2e1b]">
                          {selectedQuest.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded font-serif font-semibold border",
                            selectedQuest.questStatus === 'completed' ? "bg-[#d5e2cd] border-[#496538] text-[#2b4c19]" :
                            selectedQuest.questStatus === 'failed' ? "bg-[#ebd3d3] border-[#8b3d3d] text-[#6e2929]" :
                            "bg-[#ebdcb9] border-[#bfa15f] text-[#6b4c35]"
                          )}>
                            {selectedQuest.questStatus === 'completed' ? 'Ukończona' :
                             selectedQuest.questStatus === 'failed' ? 'Nieudana' : 'Aktywna'}
                          </span>
                          <span className="text-xs text-[#7c695b]">
                            Wpis z dnia: {selectedQuest.date}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setEditingEntry(selectedQuest)}
                          variant="outline"
                          size="sm"
                          className="border-[#bfa15f] hover:bg-[#ebdcb9] text-[#2c1810]"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => deleteEntry(selectedQuest.id)}
                          variant="outline"
                          size="sm"
                          className="border-[#942c2c] hover:bg-[#ebd3d3] text-[#942c2c]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Główny opis przygody */}
                    <div className="text-base leading-relaxed text-[#2c1810] whitespace-pre-wrap font-serif italic bg-[#f0e8dc] p-4 rounded-md border border-[#e2d4c9]">
                      {selectedQuest.content}
                    </div>

                    {/* Cele misji */}
                    <div className="space-y-3">
                      <h4 className="font-serif font-bold text-lg text-[#4a2e1b] border-b border-[#ebdcb9] pb-1">
                        Postępy i Cele zadania
                      </h4>
                      <div className="space-y-3">
                        {selectedQuest.objectives && selectedQuest.objectives.length > 0 ? (
                          selectedQuest.objectives.map((obj) => (
                            <div
                              key={obj.id}
                              className={cn(
                                "p-3 rounded border flex items-start gap-3 transition-colors",
                                obj.completed
                                  ? "bg-[#e8efd8] border-[#c0d4a1] text-[#2b4c19]"
                                  : "bg-[#faf8f5] border-[#ebdcb9] text-[#4a3c31]"
                              )}
                            >
                              <button
                                onClick={() => {
                                  const updatedObjectives = selectedQuest.objectives?.map(o =>
                                    o.id === obj.id ? { ...o, completed: !o.completed, dateCompleted: !o.completed ? new Date().toLocaleDateString('pl-PL') : undefined } : o
                                  );
                                  updateEntry({ ...selectedQuest, objectives: updatedObjectives });
                                }}
                                className="mt-0.5 focus:outline-none"
                              >
                                {obj.completed ? (
                                  <CheckCircle2 className="h-5 w-5 text-[#496538] fill-[#e8efd8]" />
                                ) : (
                                  <Circle className="h-5 w-5 text-[#8a7667]" />
                                )}
                              </button>
                              <div className="flex-1">
                                <div className={cn("text-base font-serif", obj.completed && "line-through text-[#7c695b]")}>
                                  {obj.description}
                                </div>
                                <div className="text-xs text-[#7c695b] mt-1 flex gap-2">
                                  {obj.gameDay && <span>Dzień {obj.gameDay}</span>}
                                  {obj.gameHour && <span>godzina {obj.gameHour}</span>}
                                  {obj.completed && obj.dateCompleted && (
                                    <span className="text-[#496538]">Ukończono: {obj.dateCompleted}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-[#7c695b] italic">Brak wyszczególnionych celów. Możesz je dodać edytując misję.</div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-[#7c695b] italic font-serif">
                    Wybierz misję z listy po lewej stronie lub dodaj nową
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. SEKCJA DZIENNIKA (CHRONOLOGIA) */}
          {activeTab === 'journal' && (
            <div className="flex-1 overflow-y-auto p-6 bg-[#f5efe6] space-y-6">
              <div className="max-w-4xl mx-auto space-y-4">
                <div className="flex justify-between items-center border-b border-[#ebdcb9] pb-2">
                  <h3 className="text-xl font-serif font-bold text-[#4a2e1b]">Chronologia Wydarzeń</h3>
                  <span className="text-sm text-[#7c695b]">{filteredEntries.length} wpisów</span>
                </div>
                
                <div className="relative border-l-2 border-[#bfa15f]/40 pl-6 ml-4 space-y-6">
                  {filteredEntries.map((entry) => (
                    <div key={entry.id} className="relative">
                      {/* Kropka na osi czasu */}
                      <span className="absolute -left-[31px] top-1 bg-[#bfa15f] border-4 border-[#f5efe6] rounded-full h-4 w-4"></span>
                      
                      <div className="bg-[#decab4]/30 border border-[#ebdcb9] rounded-lg p-4 shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-lg font-serif font-bold text-[#4a2e1b] flex items-center gap-2">
                              {entry.title}
                              {entry.isAutoGenerated && (
                                <span className="text-[10px] bg-[#273a4b] text-[#f4ebd0] border border-[#bfa15f]/30 px-1.5 py-0.5 rounded uppercase font-sans">
                                  Auto
                                </span>
                              )}
                            </h4>
                            <div className="text-xs text-[#7c695b] mt-0.5 flex gap-3">
                              <span>📅 {entry.date}</span>
                              {entry.gameDay && <span>⏳ Dzień {entry.gameDay}</span>}
                              {entry.category && <span>📁 Kategoria: {entry.category}</span>}
                            </div>
                          </div>
                          
                          <div className="flex gap-1">
                            <button
                              onClick={() => setEditingEntry(entry)}
                              className="p-1 text-[#4a2e1b] hover:bg-[#ebdcb9] rounded transition-colors"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteEntry(entry.id)}
                              className="p-1 text-[#942c2c] hover:bg-[#ebd3d3] rounded transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        
                        <p className="text-sm mt-2 whitespace-pre-wrap font-serif text-[#2c1810]">
                          {entry.content}
                        </p>
                        
                        {entry.tags.length > 0 && (
                          <div className="flex gap-1 mt-2.5 flex-wrap">
                            {entry.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[11px] bg-[#decab4] text-[#4a2e1b] px-2 py-0.5 rounded border border-[#d9cbb9]"
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
                    <div className="text-center py-12 text-[#7c695b] italic font-serif">
                      Dziennik jest pusty. Wpisy z przygód pojawią się tutaj chronologicznie.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 3. SEKCJA ENCYKLOPEDII */}
          {activeTab === 'encyclopedia_character' && (
            <div className="flex-1 flex overflow-hidden">
              {/* Podzakładki encyklopedii (Pionowe menu po lewej) */}
              <div className="w-1/4 border-r border-[#d9cbb9] bg-[#decab4] p-4 flex flex-col gap-2">
                <div className="font-serif font-bold text-xs uppercase tracking-wider text-[#6b4c35] border-b border-[#c8b7a4] pb-2 mb-2">
                  Kategorie wiedzy
                </div>
                <button
                  onClick={() => setEncyclopediaSubTab('character')}
                  className={cn(
                    "w-full text-left px-4 py-2.5 rounded font-serif transition-colors border",
                    encyclopediaSubTab === 'character'
                      ? "bg-[#2a1b12] text-[#f4ebd0] border-[#bfa15f] font-semibold"
                      : "bg-[#e5d4c0] hover:bg-[#d8c4ad] border-transparent text-[#3c2a1a]"
                  )}
                >
                  Postaci & Byt
                </button>
                <button
                  onClick={() => setEncyclopediaSubTab('location')}
                  className={cn(
                    "w-full text-left px-4 py-2.5 rounded font-serif transition-colors border",
                    encyclopediaSubTab === 'location'
                      ? "bg-[#2a1b12] text-[#f4ebd0] border-[#bfa15f] font-semibold"
                      : "bg-[#e5d4c0] hover:bg-[#d8c4ad] border-transparent text-[#3c2a1a]"
                  )}
                >
                  Lokacje & Miejsca
                </button>
                <button
                  onClick={() => setEncyclopediaSubTab('item')}
                  className={cn(
                    "w-full text-left px-4 py-2.5 rounded font-serif transition-colors border",
                    encyclopediaSubTab === 'item'
                      ? "bg-[#2a1b12] text-[#f4ebd0] border-[#bfa15f] font-semibold"
                      : "bg-[#e5d4c0] hover:bg-[#d8c4ad] border-transparent text-[#3c2a1a]"
                  )}
                >
                  Przedmioty & Artefakty
                </button>
              </div>

              {/* Grid z zawartością wpisów encyklopedii */}
              <div className="flex-1 overflow-y-auto p-6 bg-[#f5efe6]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="bg-[#faf8f5] border border-[#ebdcb9] rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow relative flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start border-b border-[#ebdcb9] pb-2">
                          <h4 className="text-lg font-serif font-bold text-[#4a2e1b]">
                            {entry.title}
                          </h4>
                          <div className="flex gap-1">
                            <button
                              onClick={() => setEditingEntry(entry)}
                              className="p-1 text-[#4a2e1b] hover:bg-[#ebdcb9] rounded transition-colors"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteEntry(entry.id)}
                              className="p-1 text-[#942c2c] hover:bg-[#ebd3d3] rounded transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm font-serif leading-relaxed text-[#2c1810] whitespace-pre-wrap">
                          {entry.content}
                        </p>
                      </div>
                      
                      {entry.tags.length > 0 && (
                        <div className="flex gap-1 mt-3 flex-wrap border-t border-[#f0e8dc] pt-2">
                          {entry.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] bg-[#decab4]/50 text-[#4a2e1b] px-1.5 py-0.5 rounded border border-[#d9cbb9]/40"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {filteredEntries.length === 0 && (
                    <div className="col-span-full text-center py-16 text-[#7c695b] italic font-serif">
                      Brak wpisów w tej kategorii encyklopedii. Dodaj pierwszy wpis, wybierając odpowiedni typ encyklopedii.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 4. SEKCJA NOTATEK */}
          {activeTab === 'note' && (
            <div className="flex-1 overflow-y-auto p-6 bg-[#f5efe6]">
              <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
                {filteredEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-[#fffdfa] border border-[#e5d4c0] shadow-sm rounded-lg p-5 flex flex-col justify-between min-h-[220px]"
                  >
                    <div>
                      <div className="flex justify-between items-start border-b border-[#ebdcb9] pb-2 mb-3">
                        <h4 className="font-serif font-bold text-lg text-[#4a2e1b]">
                          {entry.title}
                        </h4>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditingEntry(entry)}
                            className="p-1 text-[#4a2e1b] hover:bg-[#ebdcb9] rounded transition-colors"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteEntry(entry.id)}
                            className="p-1 text-[#942c2c] hover:bg-[#ebd3d3] rounded transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm font-serif leading-relaxed text-[#3c2a1a] whitespace-pre-wrap line-clamp-6">
                        {entry.content}
                      </p>
                    </div>
                    
                    <div className="text-[11px] text-[#7c695b] border-t border-[#f0e8dc] pt-2 mt-4 flex justify-between items-center">
                      <span>📅 {entry.date}</span>
                      {entry.tags.length > 0 && (
                        <span className="truncate max-w-[120px] text-right">
                          #{entry.tags[0]}
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {filteredEntries.length === 0 && (
                  <div className="col-span-full text-center py-16 text-[#7c695b] italic font-serif">
                    Brak własnych zapisków. Użyj przycisku "Dodaj Wpis" na górze, aby zapisać swoje domysły i notatki.
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Formularz dodawania */}
      {showAddForm && (
        <AddEntryForm
          onAdd={addEntry}
          onCancel={() => setShowAddForm(false)}
          categories={categories}
          defaultTags={defaultTags}
          initialType={activeTab}
        />
      )}

      {/* Formularz edycji */}
      {editingEntry && (
        <EditEntryForm
          entry={editingEntry}
          onUpdate={updateEntry}
          onCancel={() => setEditingEntry(null)}
          categories={categories}
          defaultTags={defaultTags}
        />
      )}
    </div>
  );
}

interface AddEntryFormProps {
  onAdd: (entry: Omit<JournalEntry, 'id' | 'date'>) => void;
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
    type: (initialType === 'encyclopedia_character' ? 'encyclopedia_character' : initialType) as JournalEntryType,
    gameDay: 1,
    gameHour: 12,
    questStatus: 'active' as const,
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
        gameHour: formData.gameHour
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
      <div className="bg-[#1c120c] border-4 border-[#3a2518] rounded-xl p-6 w-[90vw] max-w-[800px] max-h-[90vh] overflow-y-auto text-[#e2d4c9] font-serif shadow-2xl">
        <div className="flex justify-between items-center border-b border-[#3a2518] pb-3 mb-5">
          <h3 className="text-xl font-bold text-[#f4ebd0]">Dodaj nowy wpis do księgi przygód</h3>
          <button onClick={onCancel} className="text-[#a29182] hover:text-[#f4ebd0]"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Typ wpisu */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[#f4ebd0]">Typ wpisu</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as JournalEntryType })}
              className="w-full p-2.5 bg-[#0d0906] border border-[#3a2518] rounded-md text-[#e2d4c9] focus:border-[#bfa15f] focus:outline-none"
            >
              <option value="quest">Misja (Quest)</option>
              <option value="journal">Wpis do Dziennika (Fabuła)</option>
              <option value="encyclopedia_character">Encyklopedia - Postać / Byt</option>
              <option value="encyclopedia_location">Encyklopedia - Lokacja</option>
              <option value="encyclopedia_item">Encyklopedia - Przedmiot</option>
              <option value="note">Własne notatki / Teorie</option>
            </select>
          </div>

          {/* Dane czasu gry */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[#f4ebd0]">Dzień kampanii</label>
              <input
                type="number"
                min="1"
                value={formData.gameDay}
                onChange={(e) => setFormData({ ...formData, gameDay: parseInt(e.target.value) || 1 })}
                className="w-full p-2.5 bg-[#0d0906] border border-[#3a2518] rounded-md text-[#e2d4c9] focus:border-[#bfa15f] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[#f4ebd0]">Godzina</label>
              <input
                type="number"
                min="0"
                max="23"
                value={formData.gameHour}
                onChange={(e) => setFormData({ ...formData, gameHour: parseInt(e.target.value) || 0 })}
                className="w-full p-2.5 bg-[#0d0906] border border-[#3a2518] rounded-md text-[#e2d4c9] focus:border-[#bfa15f] focus:outline-none"
              />
            </div>
          </div>

          {/* Dla zadań - Status */}
          {formData.type === 'quest' && (
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[#f4ebd0]">Status misji</label>
              <select
                value={formData.questStatus}
                onChange={(e) => setFormData({ ...formData, questStatus: e.target.value as any })}
                className="w-full p-2.5 bg-[#0d0906] border border-[#3a2518] rounded-md text-[#e2d4c9] focus:border-[#bfa15f] focus:outline-none"
              >
                <option value="active">Aktywna</option>
                <option value="completed">Ukończona</option>
                <option value="failed">Nieudana</option>
              </select>
            </div>
          )}

          {/* Tytuł */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[#f4ebd0]">Tytuł wpisu</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full p-2.5 bg-[#0d0906] border border-[#3a2518] rounded-md text-[#e2d4c9] focus:border-[#bfa15f] focus:outline-none placeholder-[#5a4d43]"
              placeholder="np. Badanie Biblioteki w Arkham"
              required
            />
          </div>

          {/* Treść */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[#f4ebd0]">Treść / Opis</label>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="min-h-32 bg-[#0d0906] text-[#e2d4c9] border-[#3a2518] focus-visible:ring-[#bfa15f] placeholder-[#5a4d43]"
              placeholder="Zapisz szczegóły przygody lub informacje o postaci/przedmiocie..."
              required
            />
          </div>

          {/* Cele misji (tylko dla misji) */}
          {formData.type === 'quest' && (
            <div className="border border-[#3a2518] p-4 rounded-md bg-[#0d0906]/40 space-y-3">
              <label className="block text-sm font-serif font-bold text-[#f4ebd0] border-b border-[#3a2518] pb-1">
                Cele zadania
              </label>
              <div className="space-y-2">
                {formData.objectives.map((obj, i) => (
                  <div key={obj.id} className="flex justify-between items-center bg-[#0d0906] p-2 rounded border border-[#3a2518] text-sm">
                    <span className="truncate">{i + 1}. {obj.description}</span>
                    <button type="button" onClick={() => removeObjective(obj.id)} className="text-[#942c2c] hover:text-red-400">
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
                  className="flex-1 p-2 bg-[#0d0906] border border-[#3a2518] rounded-md text-sm text-[#e2d4c9] outline-none focus:border-[#bfa15f]"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addObjective())}
                />
                <Button type="button" onClick={addObjective} className="bg-[#3a2518] hover:bg-[#503422] text-[#f4ebd0]">
                  Dodaj cel
                </Button>
              </div>
            </div>
          )}

          {/* Tagi */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[#f4ebd0]">Tagi</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-[#5c3e21]/60 text-[#f4ebd0] border border-[#bfa15f]/25"
                >
                  #{tag}
                  <button type="button" onClick={() => removeTag(tag)} className="ml-1 text-[#a29182] hover:text-red-400">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                className="flex-1 p-2 bg-[#0d0906] border border-[#3a2518] rounded-md text-[#e2d4c9] focus:border-[#bfa15f] focus:outline-none placeholder-[#5a4d43]"
                placeholder="Dodaj własny tag..."
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag(newTag))}
              />
              <Button type="button" onClick={() => addTag(newTag)} className="bg-[#3a2518] hover:bg-[#503422] text-[#f4ebd0]">
                +
              </Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {defaultTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag)}
                  className="px-2 py-0.5 text-xs bg-[#0d0906] hover:bg-[#1a110a] text-[#8a7667] rounded border border-[#3a2518]"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Przycisk Akcji */}
          <div className="flex gap-3 pt-3 border-t border-[#3a2518]">
            <Button
              type="submit"
              className="flex-1 py-3 bg-[#5c3e21] hover:bg-[#704d2b] text-[#f4ebd0] border border-[#bfa15f]/40"
              disabled={!formData.title.trim() || !formData.content.trim()}
            >
              Zapisz wpis
            </Button>
            <Button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 bg-[#38261c] hover:bg-[#4d3527] text-[#a29182]"
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
  entry: JournalEntry;
  onUpdate: (entry: JournalEntry) => void;
  onCancel: () => void;
  categories: string[];
  defaultTags: string[];
}

function EditEntryForm({
  entry,
  onUpdate,
  onCancel,
  categories,
  defaultTags,
}: EditEntryFormProps) {
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
        gameHour: formData.gameHour
      };
      setFormData({ ...formData, objectives: [...(formData.objectives || []), obj] });
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
      <div className="bg-[#1c120c] border-4 border-[#3a2518] rounded-xl p-6 w-[90vw] max-w-[800px] max-h-[90vh] overflow-y-auto text-[#e2d4c9] font-serif shadow-2xl">
        <div className="flex justify-between items-center border-b border-[#3a2518] pb-3 mb-5">
          <h3 className="text-xl font-bold text-[#f4ebd0]">Edytuj wpis w księdze przygód</h3>
          <button onClick={onCancel} className="text-[#a29182] hover:text-[#f4ebd0]"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Typ wpisu */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[#f4ebd0]">Typ wpisu</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as JournalEntryType })}
              className="w-full p-2.5 bg-[#0d0906] border border-[#3a2518] rounded-md text-[#e2d4c9] focus:border-[#bfa15f] focus:outline-none"
            >
              <option value="quest">Misja (Quest)</option>
              <option value="journal">Wpis do Dziennika (Fabuła)</option>
              <option value="encyclopedia_character">Encyklopedia - Postać / Byt</option>
              <option value="encyclopedia_location">Encyklopedia - Lokacja</option>
              <option value="encyclopedia_item">Encyklopedia - Przedmiot</option>
              <option value="note">Własne notatki / Teorie</option>
            </select>
          </div>

          {/* Dane czasu gry */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[#f4ebd0]">Dzień kampanii</label>
              <input
                type="number"
                min="1"
                value={formData.gameDay || 1}
                onChange={(e) => setFormData({ ...formData, gameDay: parseInt(e.target.value) || 1 })}
                className="w-full p-2.5 bg-[#0d0906] border border-[#3a2518] rounded-md text-[#e2d4c9] focus:border-[#bfa15f] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[#f4ebd0]">Godzina</label>
              <input
                type="number"
                min="0"
                max="23"
                value={formData.gameHour || 0}
                onChange={(e) => setFormData({ ...formData, gameHour: parseInt(e.target.value) || 0 })}
                className="w-full p-2.5 bg-[#0d0906] border border-[#3a2518] rounded-md text-[#e2d4c9] focus:border-[#bfa15f] focus:outline-none"
              />
            </div>
          </div>

          {/* Status misji */}
          {formData.type === 'quest' && (
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[#f4ebd0]">Status misji</label>
              <select
                value={formData.questStatus || 'active'}
                onChange={(e) => setFormData({ ...formData, questStatus: e.target.value as any })}
                className="w-full p-2.5 bg-[#0d0906] border border-[#3a2518] rounded-md text-[#e2d4c9] focus:border-[#bfa15f] focus:outline-none"
              >
                <option value="active">Aktywna</option>
                <option value="completed">Ukończona</option>
                <option value="failed">Nieudana</option>
              </select>
            </div>
          )}

          {/* Tytuł */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[#f4ebd0]">Tytuł wpisu</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full p-2.5 bg-[#0d0906] border border-[#3a2518] rounded-md text-[#e2d4c9] focus:border-[#bfa15f] focus:outline-none"
              required
            />
          </div>

          {/* Treść */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[#f4ebd0]">Treść / Opis</label>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="min-h-32 bg-[#0d0906] text-[#e2d4c9] border-[#3a2518] focus-visible:ring-[#bfa15f]"
              required
            />
          </div>

          {/* Cele misji (tylko dla misji) */}
          {formData.type === 'quest' && (
            <div className="border border-[#3a2518] p-4 rounded-md bg-[#0d0906]/40 space-y-3">
              <label className="block text-sm font-serif font-bold text-[#f4ebd0] border-b border-[#3a2518] pb-1">
                Cele zadania
              </label>
              <div className="space-y-2">
                {(formData.objectives || []).map((obj, i) => (
                  <div key={obj.id} className="flex justify-between items-center bg-[#0d0906] p-2 rounded border border-[#3a2518] text-sm">
                    <span className="truncate">{i + 1}. {obj.description}</span>
                    <button type="button" onClick={() => removeObjective(obj.id)} className="text-[#942c2c] hover:text-red-400">
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
                  className="flex-1 p-2 bg-[#0d0906] border border-[#3a2518] rounded-md text-sm text-[#e2d4c9] outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addObjective())}
                />
                <Button type="button" onClick={addObjective} className="bg-[#3a2518] hover:bg-[#503422] text-[#f4ebd0]">
                  Dodaj
                </Button>
              </div>
            </div>
          )}

          {/* Tagi */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[#f4ebd0]">Tagi</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-[#5c3e21]/60 text-[#f4ebd0] border border-[#bfa15f]/25"
                >
                  #{tag}
                  <button type="button" onClick={() => removeTag(tag)} className="ml-1 text-[#a29182] hover:text-red-400">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                className="flex-1 p-2 bg-[#0d0906] border border-[#3a2518] rounded-md text-[#e2d4c9] focus:border-[#bfa15f] focus:outline-none"
                placeholder="Dodaj własny tag..."
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag(newTag))}
              />
              <Button type="button" onClick={() => addTag(newTag)} className="bg-[#3a2518] hover:bg-[#503422] text-[#f4ebd0]">
                +
              </Button>
            </div>
          </div>

          {/* Przycisk Akcji */}
          <div className="flex gap-3 pt-3 border-t border-[#3a2518]">
            <Button
              type="submit"
              className="flex-1 py-3 bg-[#5c3e21] hover:bg-[#704d2b] text-[#f4ebd0] border border-[#bfa15f]/40"
              disabled={!formData.title.trim() || !formData.content.trim()}
            >
              Zapisz zmiany
            </Button>
            <Button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 bg-[#38261c] hover:bg-[#4d3527] text-[#a29182]"
            >
              Anuluj
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
