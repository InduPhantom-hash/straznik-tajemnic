'use client';

import { useState, useMemo, useCallback } from 'react';
import { Button } from './button';
import { Character, JournalEntry, JournalEventType } from '@/lib/types';
import { cleanMarkdown } from '@/lib/utils';

// ============================================================================
// STAŁE
// ============================================================================

const EVENT_TYPES: Record<
  JournalEventType,
  { icon: string; label: string; color: string; borderColor: string }
> = {
  combat: {
    icon: '⚔️',
    label: 'Walka',
    color: 'bg-red-500',
    borderColor: '#ef4444',
  },
  discovery: {
    icon: '🔍',
    label: 'Odkrycie',
    color: 'bg-yellow-500',
    borderColor: '#eab308',
  },
  npc: {
    icon: '👤',
    label: 'NPC',
    color: 'bg-blue-500',
    borderColor: '#3b82f6',
  },
  sanity: {
    icon: '🧠',
    label: 'Poczytalność',
    color: 'bg-purple-500',
    borderColor: '#a855f7',
  },
  clue: {
    icon: '📜',
    label: 'Trop',
    color: 'bg-green-500',
    borderColor: '#22c55e',
  },
  location: {
    icon: '📍',
    label: 'Lokacja',
    color: 'bg-orange-500',
    borderColor: '#f97316',
  },
  ritual: {
    icon: '🕯️',
    label: 'Rytuał',
    color: 'bg-pink-500',
    borderColor: '#ec4899',
  },
  death: {
    icon: '💀',
    label: 'Śmierć',
    color: 'bg-gray-500',
    borderColor: '#6b7280',
  },
  bookmark: {
    icon: '⭐',
    label: 'Zakładka',
    color: 'bg-emerald-500',
    borderColor: '#10b981',
  },
  note: {
    icon: '📝',
    label: 'Notatka',
    color: 'bg-cyan-500',
    borderColor: '#06b6d4',
  },
};

// ============================================================================
// TYPY
// ============================================================================

interface SessionJournalProps {
  character: Character;
  onUpdateCharacter: (character: Character) => void;
  onClose: () => void;
  currentInGameDate?: string;
}

// ============================================================================
// GŁÓWNY KOMPONENT
// ============================================================================

export function SessionJournal({
  character,
  onUpdateCharacter,
  onClose,
  currentInGameDate,
}: SessionJournalProps) {
  const [filterType, setFilterType] = useState<JournalEventType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Formularz nowej notatki
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    type: 'note' as JournalEventType,
    tags: '',
    inGameDate: currentInGameDate || '',
  });

  // Domyślne testowe wpisy, gdy dziennik jest pusty
  const defaultTestEntries: JournalEntry[] = [
    {
      id: 'test_1',
      timestamp: new Date('2025-09-17T14:30:00'),
      inGameDate: '17 września 1925',
      type: 'npc',
      title: 'Pierwsze spotkanie z profesorem Armitage',
      content:
        'Profesor Armitage wydawał się bardzo zaniepokojony. Mówił o dziwnych wydarzeniach w bibliotece Miskatonic. Wspomniał o zaginionych książkach i dziwnych dźwiękach dochodzących z piwnic. Jego ręce drżały, gdy pokazywał mi pożółkłe strony z dziennikiem Wilbura Whateleya.',
      tags: ['Arkham', 'Biblioteka', 'Profesor Armitage'],
      isBookmarked: true,
    },
    {
      id: 'test_2',
      timestamp: new Date('2025-09-16T21:15:00'),
      inGameDate: '16 września 1925',
      type: 'discovery',
      title: 'Odkrycie w piwnicach biblioteki',
      content:
        'W piwnicach znaleźliśmy dziwne symbole na ścianach. Wyglądały na bardzo stare, prawdopodobnie z czasów założenia uniwersytetu. Rozpoznałem niektóre z nich jako pochodzące z kultów starożytnych.',
      tags: ['Piwnice', 'Symbole', 'Kulty'],
      isBookmarked: false,
    },
    {
      id: 'test_3',
      timestamp: new Date('2025-09-15T23:45:00'),
      inGameDate: '15 września 1925',
      type: 'location',
      title: 'Nocna wizyta w Innsmouth',
      content:
        'Nigdy nie zapomnę tego, co zobaczyłem na nadbrzeżu. Postacie przemykające między magazynami, ich dziwny, kołyszący chód. Zapach słonej wody i czegoś... gnijącego. Mieszkańcy patrzyli na mnie z wrogością, a ich oczy... Boże, te oczy były zbyt duże, zbyt rybiej formy.',
      tags: ['Innsmouth', 'Nadbrzeże', 'Dziwni mieszkańcy'],
      isBookmarked: true,
    },
    {
      id: 'test_4',
      timestamp: new Date('2025-09-14T10:00:00'),
      inGameDate: '14 września 1925',
      type: 'clue',
      title: 'List od doktora Morgana',
      content:
        'Otrzymałem niepokojący list od dr. Morgana z sanatorium Arkham. Pisze o pacjencie, który mówi w nieznanym języku i rysuje na ścianach te same symbole, które widzieliśmy w piwnicach. Pacjent twierdzi, że "Oni nadchodzą ze gwiazd" i że "bramy zostaną otwarte". Muszę go odwiedzić.',
      tags: ['Sanatorium Arkham', 'Dr. Morgan', 'Przepowiednia'],
      isBookmarked: false,
    },
    {
      id: 'test_5',
      timestamp: new Date('2025-09-13T19:30:00'),
      inGameDate: '13 września 1925',
      type: 'ritual',
      title: 'Starożytny rytuał pod Bolton',
      content:
        'Podążając za wskazówkami z dziennika Whateleya, dotarliśmy do kamiennego kręgu na wzgórzach koło Bolton. Znaki na kamieniach pulsowały słabym, zielonkawym światłem kiedy zbliżył się zmierzch. Jeden z nas zemdlał i mówił przez sen w języku, którego nikt nie rozpoznał.',
      tags: ['Bolton', 'Kamienny krąg', 'Rytuał', 'Whateley'],
      isBookmarked: true,
    },
    {
      id: 'test_6',
      timestamp: new Date('2025-09-12T15:00:00'),
      inGameDate: '12 września 1925',
      type: 'discovery',
      title: 'Tajemnica zegara w ratuszu',
      content:
        'Miejscowi mówią, że stary zegar w wieży ratusza zatrzymał się dokładnie o 3:33 w nocy, kiedy zaginął burmistrz Harrington. Od tamtej pory nikt nie ośmiela się go naprawić. Słyszałem dziwne dźwięki dobiegające z wieży - jakby ktoś chodził tam w środku nocy.',
      tags: ['Ratusz', 'Zegar', 'Burmistrz Harrington', 'Zaginięcie'],
      isBookmarked: false,
    },
    {
      id: 'test_7',
      timestamp: new Date('2025-09-11T11:20:00'),
      inGameDate: '11 września 1925',
      type: 'npc',
      title: 'Przesłuchanie Josepha Curwena',
      content:
        'Joseph Curwen, antykwariusz z Salem, zgodził się odpowiedzieć na nasze pytania. Jego sklep pełen był zakurzonych tomów i dziwnych artefaktów. Kiedy zapytałem o Necronomicon, pobladł i kazał mi natychmiast wyjść. Zanim zamknął drzwi, szepnął: "Niektóra wiedza kosztuje więcej niż rozum."',
      tags: ['Salem', 'Antykwariat', 'Joseph Curwen', 'Necronomicon'],
      isBookmarked: false,
    },
    {
      id: 'test_8',
      timestamp: new Date('2025-09-10T03:00:00'),
      inGameDate: '10 września 1925',
      type: 'sanity',
      title: "Sen o R'lyeh",
      content:
        'Trzecią noc z rzędu śniłem o zatopionej metropolii. Cyklopowe mury z ciemnego kamienia, niemożliwe kąty architektury, które bolały moje oczy. Na końcu zawsze widzę TO - coś ogromnego, co czeka w ciemności morskich głębin. Budzę się z krzykiem.',
      tags: ['Koszmary', "R'lyeh", 'Cthulhu', 'Wizje'],
      isBookmarked: true,
      metadata: { sanChange: -2 },
    },
  ];

  // Wpisy dziennika - używaj bezpośrednio z postaci (bez testowych danych)
  const entries = character.journal || [];

  // ============================================================================
  // FILTROWANIE
  // ============================================================================

  const filteredEntries = useMemo(() => {
    let result = [...entries];

    // Filtr typu
    if (filterType !== 'all') {
      result = result.filter((e) => e.type === filterType);
    }

    // Filtr zakładek
    if (showBookmarksOnly) {
      result = result.filter((e) => e.isBookmarked);
    }

    // Wyszukiwanie
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(query) ||
          e.content.toLowerCase().includes(query) ||
          e.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Sortowanie od najnowszych
    result.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return result;
  }, [entries, filterType, showBookmarksOnly, searchQuery]);

  // Grupowanie po dacie in-game
  const groupedByDate = useMemo(() => {
    const groups = new Map<string, JournalEntry[]>();

    filteredEntries.forEach((entry) => {
      const dateKey =
        entry.inGameDate ||
        new Date(entry.timestamp).toLocaleDateString('pl-PL');
      const existing = groups.get(dateKey) || [];
      groups.set(dateKey, [...existing, entry]);
    });

    return groups;
  }, [filteredEntries]);

  // ============================================================================
  // AKCJE
  // ============================================================================

  const addEntry = useCallback(
    (entry: Omit<JournalEntry, 'id' | 'timestamp'>) => {
      const newEntry: JournalEntry = {
        ...entry,
        id: `journal_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        timestamp: new Date(),
      };

      const updatedCharacter: Character = {
        ...character,
        journal: [...(character.journal || []), newEntry],
      };

      onUpdateCharacter(updatedCharacter);
    },
    [character, onUpdateCharacter]
  );

  const toggleBookmark = useCallback(
    (entryId: string) => {
      const updatedJournal = (character.journal || []).map((entry) =>
        entry.id === entryId
          ? { ...entry, isBookmarked: !entry.isBookmarked }
          : entry
      );

      onUpdateCharacter({ ...character, journal: updatedJournal });
    },
    [character, onUpdateCharacter]
  );

  const deleteEntry = useCallback(
    (entryId: string) => {
      if (!confirm('Czy na pewno chcesz usunąć ten wpis?')) return;

      const updatedJournal = (character.journal || []).filter(
        (entry) => entry.id !== entryId
      );
      onUpdateCharacter({ ...character, journal: updatedJournal });
    },
    [character, onUpdateCharacter]
  );

  const handleAddNote = () => {
    if (!newNote.title.trim()) return;

    addEntry({
      type: newNote.type,
      title: newNote.title.trim(),
      content: newNote.content.trim(),
      tags: newNote.tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t),
      isBookmarked: false,
      inGameDate: newNote.inGameDate || undefined,
    });

    setNewNote({
      title: '',
      content: '',
      type: 'note',
      tags: '',
      inGameDate: currentInGameDate || '',
    });
    setIsAddingNote(false);
  };

  // ============================================================================
  // EKSPORT
  // ============================================================================

  const exportToMarkdown = useCallback(() => {
    let md = `# 📖 Dziennik Sesji: ${character.name}\n\n`;
    md += `*Eksport: ${new Date().toLocaleString('pl-PL')}*\n\n---\n\n`;

    const dates = Array.from(groupedByDate.keys());
    dates.forEach((date) => {
      md += `## ${date}\n\n`;
      const dayEntries = groupedByDate.get(date) || [];

      dayEntries.forEach((entry) => {
        const DEFAULT_TYPE_INFO = {
          icon: '📝',
          label: 'Notatka',
          color: 'bg-zinc-500',
          borderColor: '#71717a',
        };
        const typeInfo = EVENT_TYPES[entry.type] || DEFAULT_TYPE_INFO;
        md += `### ${typeInfo.icon} ${entry.title}${entry.isBookmarked ? ' ⭐' : ''}\n\n`;
        if (entry.content) md += `${entry.content}\n\n`;
        if (entry.tags.length > 0) md += `*Tagi: ${entry.tags.join(', ')}*\n\n`;
        md += `---\n\n`;
      });
    });

    // Pobierz plik
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dziennik_${character.name.replace(/\s+/g, '_')}_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [character.name, groupedByDate]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="deco-corners relative bg-gradient-to-br from-[#1a1610] to-[#100d09] border border-brass/40 shadow-deco rounded-lg w-[90vw] max-w-[1440px] max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-muted p-4 border-b border-border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-display uppercase tracking-wide text-foreground flex items-center gap-2">
              📖 Dziennik Sesji
              <span className="text-sm font-normal normal-case tracking-normal text-muted-foreground">
                ({character.name})
              </span>
            </h2>
            <div className="flex gap-2">
              <Button
                onClick={exportToMarkdown}
                variant="outline"
                className="text-sm"
              >
                📥 Eksport MD
              </Button>
              <Button
                onClick={onClose}
                variant="ghost"
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </Button>
            </div>
          </div>

          {/* Filtry */}
          <div className="flex flex-wrap gap-3 items-center">
            <select
              value={filterType}
              onChange={(e) =>
                setFilterType(e.target.value as JournalEventType | 'all')
              }
              className="px-3 py-1.5 bg-muted border border-border rounded-lg text-foreground text-sm"
            >
              <option value="all">Wszystkie typy</option>
              {(Object.keys(EVENT_TYPES) as JournalEventType[]).map((type) => (
                <option key={type} value={type}>
                  {EVENT_TYPES[type].icon} {EVENT_TYPES[type].label}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={showBookmarksOnly}
                onChange={(e) => setShowBookmarksOnly(e.target.checked)}
                className="rounded"
              />
              ⭐ Tylko zakładki
            </label>

            <input
              type="text"
              placeholder="🔍 Szukaj..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 min-w-[150px] px-3 py-1.5 bg-muted border border-border rounded-lg text-foreground text-sm"
            />

            <Button
              onClick={() => setIsAddingNote(true)}
              className="bg-primary hover:bg-primary/90 text-sm"
            >
              + Dodaj notatkę
            </Button>
          </div>
        </div>

        {/* Formularz nowej notatki */}
        {isAddingNote && (
          <div className="bg-muted/40 p-4 border-b border-brass/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Tytuł
                </label>
                <input
                  type="text"
                  value={newNote.title}
                  onChange={(e) =>
                    setNewNote((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-muted border border-border rounded text-foreground"
                  placeholder="Tytuł wpisu"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-muted-foreground mb-1">
                    Typ
                  </label>
                  <select
                    value={newNote.type}
                    onChange={(e) =>
                      setNewNote((prev) => ({
                        ...prev,
                        type: e.target.value as JournalEventType,
                      }))
                    }
                    className="w-full px-3 py-2 bg-muted border border-border rounded text-foreground"
                  >
                    {(Object.keys(EVENT_TYPES) as JournalEventType[]).map(
                      (type) => (
                        <option key={type} value={type}>
                          {EVENT_TYPES[type].icon} {EVENT_TYPES[type].label}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-muted-foreground mb-1">
                    Data w grze
                  </label>
                  <input
                    type="text"
                    value={newNote.inGameDate}
                    onChange={(e) =>
                      setNewNote((prev) => ({
                        ...prev,
                        inGameDate: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-muted border border-border rounded text-foreground"
                    placeholder="np. 11 grudnia 1925"
                  />
                </div>
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs text-muted-foreground mb-1">
                Treść
              </label>
              <textarea
                value={newNote.content}
                onChange={(e) =>
                  setNewNote((prev) => ({ ...prev, content: e.target.value }))
                }
                className="w-full px-3 py-2 bg-muted border border-border rounded text-foreground h-20"
                placeholder="Opis wydarzenia..."
              />
            </div>
            <div className="mt-3">
              <label className="block text-xs text-muted-foreground mb-1">
                Tagi (rozdzielone przecinkami)
              </label>
              <input
                type="text"
                value={newNote.tags}
                onChange={(e) =>
                  setNewNote((prev) => ({ ...prev, tags: e.target.value }))
                }
                className="w-full px-3 py-2 bg-muted border border-border rounded text-foreground"
                placeholder="arkham, biblioteka, wskazówka"
              />
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                onClick={handleAddNote}
                className="bg-primary hover:bg-primary/90"
              >
                ✓ Zapisz
              </Button>
              <Button onClick={() => setIsAddingNote(false)} variant="outline">
                Anuluj
              </Button>
            </div>
          </div>
        )}

        {/* Lista wpisów */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredEntries.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <div className="text-4xl mb-2">📖</div>
              <p>Dziennik jest pusty</p>
              <p className="text-sm mt-1">
                Dodaj pierwszą notatkę lub rozpocznij przygodę
              </p>
            </div>
          ) : (
            Array.from(groupedByDate.entries()).map(([date, dayEntries]) => (
              <div key={date} className="mb-8">
                {/* Nagłówek dnia */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-muted" />
                  <span className="text-primary font-bold text-base">
                    {date}
                  </span>
                  <div className="h-px flex-1 bg-muted" />
                </div>

                {/* Wpisy dnia */}
                {dayEntries.map((entry) => {
                  // Fallback dla niezdefiniowanych typów
                  const DEFAULT_TYPE_INFO = {
                    icon: '📝',
                    label: 'Notatka',
                    color: 'bg-zinc-500',
                    borderColor: '#71717a',
                  };
                  const typeInfo = EVENT_TYPES[entry.type] || DEFAULT_TYPE_INFO;
                  return (
                    <div
                      key={entry.id}
                      className="bg-muted/60 rounded-lg p-4 mb-3 border-l-4 hover:bg-muted transition-colors"
                      style={{ borderLeftColor: typeInfo.borderColor }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{typeInfo.icon}</span>
                          <span className="font-medium text-foreground text-base">
                            {entry.title}
                          </span>
                          {entry.isBookmarked && (
                            <span className="text-primary">⭐</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {/* Real timestamp */}
                          <span className="text-xs text-muted-foreground">
                            {new Date(entry.timestamp).toLocaleTimeString(
                              'pl-PL',
                              { hour: '2-digit', minute: '2-digit' }
                            )}
                          </span>
                          {/* In-game date if different from grouping header */}
                          {entry.inGameDate && (
                            <span
                              className="text-xs text-amber-400/70 ml-1"
                              title="Data w grze"
                            >
                              📅 {entry.inGameDate}
                            </span>
                          )}
                          <Button
                            onClick={() => toggleBookmark(entry.id)}
                            variant="ghost"
                            className="p-1 h-auto text-muted-foreground hover:text-primary"
                          >
                            {entry.isBookmarked ? '⭐' : '☆'}
                          </Button>
                          <Button
                            onClick={() => deleteEntry(entry.id)}
                            variant="ghost"
                            className="p-1 h-auto text-muted-foreground hover:text-red-400"
                          >
                            🗑️
                          </Button>
                        </div>
                      </div>

                      {entry.content && (
                        <p className="text-foreground text-base mt-2 leading-relaxed">
                          {cleanMarkdown(entry.content)}
                        </p>
                      )}

                      {/* Metadata */}
                      {entry.metadata && (
                        <div className="flex gap-3 mt-2 text-xs">
                          {entry.metadata.hpChange && (
                            <span
                              className={
                                entry.metadata.hpChange > 0
                                  ? 'text-green-400'
                                  : 'text-red-400'
                              }
                            >
                              HP: {entry.metadata.hpChange > 0 ? '+' : ''}
                              {entry.metadata.hpChange}
                            </span>
                          )}
                          {entry.metadata.sanChange && (
                            <span
                              className={
                                entry.metadata.sanChange > 0
                                  ? 'text-green-400'
                                  : 'text-purple-400'
                              }
                            >
                              SAN: {entry.metadata.sanChange > 0 ? '+' : ''}
                              {entry.metadata.sanChange}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Tagi */}
                      {entry.tags && entry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {entry.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              onClick={() => setSearchQuery(tag)}
                              className="px-2 py-0.5 bg-primary/20 text-primary border border-primary/30 rounded-full text-xs cursor-pointer hover:bg-primary/30 transition-colors"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="bg-muted/40 p-3 border-t border-brass/30 text-center text-sm text-muted-foreground">
          {entries.length}{' '}
          {entries.length === 1
            ? 'wpis'
            : entries.length >= 2 && entries.length <= 4
              ? 'wpisy'
              : 'wpisów'}{' '}
          w dzienniku
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// FUNKCJE POMOCNICZE DO AUTOMATYCZNEGO LOGOWANIA
// ============================================================================

/**
 * Dodaje automatyczny wpis do dziennika postaci
 */
export function addJournalEntry(
  character: Character,
  entry: Omit<JournalEntry, 'id' | 'timestamp'>
): Character {
  const newEntry: JournalEntry = {
    ...entry,
    id: `journal_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    timestamp: new Date(),
  };

  return {
    ...character,
    journal: [...(character.journal || []), newEntry],
  };
}

/**
 * Wykrywa typ wydarzenia na podstawie tekstu AI
 */
export function detectEventType(text: string): JournalEventType | null {
  const lower = text.toLowerCase();

  if (
    lower.includes('atak') ||
    lower.includes('walka') ||
    lower.includes('obrażeni')
  )
    return 'combat';
  if (
    lower.includes('znalaz') ||
    lower.includes('odkry') ||
    lower.includes('zauważ')
  )
    return 'discovery';
  if (
    lower.includes('przedstawia') ||
    lower.includes('poznaje') ||
    lower.match(/spotyka.*?[A-Z]/)
  )
    return 'npc';
  if (
    lower.includes('poczytaln') ||
    lower.includes('strach') ||
    lower.includes('szok')
  )
    return 'sanity';
  if (
    lower.includes('wskazówk') ||
    lower.includes('trop') ||
    lower.includes('dowód') ||
    lower.includes('list')
  )
    return 'clue';
  if (
    lower.includes('przybywa') ||
    lower.includes('wchodzi') ||
    lower.includes('dociera')
  )
    return 'location';
  if (
    lower.includes('rytuał') ||
    lower.includes('zaklęci') ||
    lower.includes('magi')
  )
    return 'ritual';
  if (
    lower.includes('umiera') ||
    lower.includes('śmierć') ||
    lower.includes('ginie')
  )
    return 'death';

  return null;
}
