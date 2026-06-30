'use client';

import type { FormEvent } from 'react';
import { useState, useEffect } from 'react';
import { Button } from './button';
import { Textarea } from './textarea';

// IND-101 (sesja 97): typ wydzielony do `@/lib/journal/types` (1 source of truth).
// Re-eksport zachowuje backward compat z caller'em `src/app/journal/page.tsx:3`.
export type { JournalEntry } from '@/lib/journal/types';
import type { JournalEntry } from '@/lib/journal/types';

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
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [journalId, setJournalId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // Ładowanie dziennika z chmury
  const loadJournal = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/journal');
      const data = await response.json();

      if (data.success && data.journal) {
        setJournalId(data.journal.id);
        onEntriesChange(data.journal.entries || []);
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

      const url = journalId ? '/api/journal' : '/api/journal';
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

    // Auto-save po usunięciu wpisu
    setTimeout(() => saveJournal(), 1000);
  };

  // Eksport do Markdown
  const exportToMarkdown = () => {
    const markdown = generateMarkdown(entries);
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dziennik_kampanii_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Generowanie Markdown z wpisów
  const generateMarkdown = (entriesToExport: JournalEntry[]): string => {
    let md = `# 📖 Dziennik Kampanii\n\n`;
    md += `> Wyeksportowano: ${new Date().toLocaleDateString('pl-PL')} ${new Date().toLocaleTimeString('pl-PL')}\n\n`;
    md += `---\n\n`;

    // Grupowanie według kategorii
    const byCategory = entriesToExport.reduce(
      (acc, entry) => {
        if (!acc[entry.category]) acc[entry.category] = [];
        acc[entry.category].push(entry);
        return acc;
      },
      {} as Record<string, JournalEntry[]>
    );

    for (const [category, categoryEntries] of Object.entries(byCategory)) {
      md += `## ${category}\n\n`;

      for (const entry of categoryEntries) {
        md += `### ${entry.title}\n\n`;
        md += `**Data:** ${entry.date}`;
        if (entry.isAutoGenerated) {
          md += ` _(automatycznie wygenerowane)_`;
        }
        md += `\n\n`;
        md += `${entry.content}\n\n`;

        if (entry.tags.length > 0) {
          md += `**Tagi:** ${entry.tags.map((t) => `\`#${t}\``).join(', ')}\n\n`;
        }

        md += `---\n\n`;
      }
    }

    md += `\n*Wygenerowano przez Zew Cthulhu App*\n`;
    return md;
  };

  // Eksport do PDF (używa drukowania przeglądarki)
  const exportToPDF = () => {
    // Tworzymy tymczasowe okno z formatowaniem do druku
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Proszę odblokować wyskakujące okna, aby wyeksportować PDF.');
      return;
    }

    const html = `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <title>Dziennik Kampanii - ${new Date().toLocaleDateString('pl-PL')}</title>
  <style>
    body {
      font-family: 'Georgia', serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      color: #333;
      line-height: 1.6;
    }
    h1 { 
      text-align: center; 
      border-bottom: 2px solid #8B4513;
      padding-bottom: 20px;
      color: #2c1810;
    }
    h2 { 
      color: #8B4513;
      margin-top: 30px;
      border-bottom: 1px solid #ddd;
      padding-bottom: 10px;
    }
    h3 { 
      color: #4a3c31;
      margin-bottom: 5px;
    }
    .entry {
      background: #faf8f5;
      padding: 15px 20px;
      margin: 15px 0;
      border-left: 3px solid #8B4513;
      page-break-inside: avoid;
    }
    .meta {
      font-size: 0.85em;
      color: #666;
      margin-bottom: 10px;
    }
    .auto-tag {
      background: #e3f2fd;
      color: #1565c0;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.75em;
    }
    .tags {
      margin-top: 10px;
    }
    .tag {
      background: #f0f0f0;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.8em;
      margin-right: 5px;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      color: #999;
      font-size: 0.9em;
    }
    @media print {
      body { padding: 20px; }
      .entry { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>📖 Dziennik Kampanii</h1>
  <p style="text-align: center; color: #666;">Call of Cthulhu • Wyeksportowano: ${new Date().toLocaleDateString('pl-PL')}</p>
  
  ${Object.entries(
    entries.reduce(
      (acc, entry) => {
        if (!acc[entry.category]) acc[entry.category] = [];
        acc[entry.category].push(entry);
        return acc;
      },
      {} as Record<string, JournalEntry[]>
    )
  )
    .map(
      ([category, categoryEntries]) => `
    <h2>${category}</h2>
    ${categoryEntries
      .map(
        (entry) => `
      <div class="entry">
        <h3>${entry.title}</h3>
        <div class="meta">
          📅 ${entry.date}
          ${entry.isAutoGenerated ? '<span class="auto-tag">Auto</span>' : ''}
        </div>
        <p>${entry.content.replace(/\n/g, '<br>')}</p>
        ${
          entry.tags.length > 0
            ? `
          <div class="tags">
            ${entry.tags.map((tag) => `<span class="tag">#${tag}</span>`).join('')}
          </div>
        `
            : ''
        }
      </div>
    `
      )
      .join('')}
  `
    )
    .join('')}
  
  <div class="footer">
    <p>Wygenerowano przez Zew Cthulhu App</p>
  </div>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();

    // Czekamy na załadowanie i drukujemy
    printWindow.onload = () => {
      printWindow.print();
    };
  };
  const filteredEntries = entries
    .filter((entry) => !filterCategory || entry.category === filterCategory)
    .filter(
      (entry) =>
        !searchQuery ||
        entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.tags.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

  const entriesByCategory = filteredEntries.reduce(
    (acc, entry) => {
      if (!acc[entry.category]) acc[entry.category] = [];
      acc[entry.category].push(entry);
      return acc;
    },
    {} as Record<string, JournalEntry[]>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl p-6 w-[90vw] max-w-[1440px] max-h-[90vh] overflow-y-auto">
        <div className="text-foreground space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-3xl font-bold text-foreground">
              📖 Dziennik Kampanii
            </h3>
            <div className="flex gap-3 flex-wrap">
              <Button
                onClick={() => setShowAddForm(true)}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-foreground font-semibold rounded-xl transition-all duration-300 hover:scale-105"
              >
                ➕ Dodaj Wpis
              </Button>
              <Button
                onClick={saveJournal}
                disabled={isSaving}
                className="px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-foreground font-semibold rounded-xl transition-all duration-300 hover:scale-105 disabled:opacity-50"
              >
                {isSaving ? '💾 Zapisywanie...' : '💾 Zapisz'}
              </Button>
              <Button
                onClick={loadJournal}
                disabled={isLoading}
                className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-foreground font-semibold rounded-xl transition-all duration-300 hover:scale-105 disabled:opacity-50"
              >
                {isLoading ? '🔄 Ładowanie...' : '🔄 Odśwież'}
              </Button>
              <Button
                onClick={exportToMarkdown}
                disabled={entries.length === 0}
                className="px-4 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-foreground font-semibold rounded-xl transition-all duration-300 hover:scale-105 disabled:opacity-50"
                title="Eksportuj do pliku Markdown"
              >
                📝 Markdown
              </Button>
              <Button
                onClick={exportToPDF}
                disabled={entries.length === 0}
                className="px-4 py-3 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-foreground font-semibold rounded-xl transition-all duration-300 hover:scale-105 disabled:opacity-50"
                title="Eksportuj do PDF (drukowanie)"
              >
                📄 PDF
              </Button>
              {onClose && (
                <Button
                  onClick={onClose}
                  className="px-4 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-muted text-foreground font-semibold rounded-xl transition-all duration-300 hover:scale-105"
                >
                  ✕ Zamknij
                </Button>
              )}
            </div>
          </div>

          {/* Statystyki */}
          <div className="grid grid-cols-4 gap-4 p-4 bg-black/30 backdrop-blur-xl border border-white/20 rounded-2xl">
            <div className="text-center">
              <div className="text-sm font-medium text-foreground">
                Wszystkie Wpisy
              </div>
              <div className="text-lg font-bold text-purple-400">
                {entries.length}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-foreground">
                Auto-generowane
              </div>
              <div className="text-lg font-bold text-blue-400">
                {entries.filter((e) => e.isAutoGenerated).length}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-foreground">
                Kategorie
              </div>
              <div className="text-lg font-bold text-green-400">
                {new Set(entries.map((e) => e.category)).size}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-foreground">
                Ostatnio zapisano
              </div>
              <div className="text-lg font-bold text-yellow-400">
                {lastSaved
                  ? new Date(lastSaved).toLocaleTimeString('pl-PL')
                  : 'Nigdy'}
              </div>
            </div>
          </div>

          {/* Filtry i wyszukiwanie */}
          <div className="flex gap-3 flex-wrap">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 bg-black/50 border border-white/20 rounded-xl text-foreground focus:border-purple-500 focus:outline-none"
            >
              <option value="">Wszystkie kategorie</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Szukaj w dzienniku..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 bg-black/50 border border-white/20 rounded-xl text-foreground focus:border-purple-500 focus:outline-none flex-1 min-w-48"
            />
          </div>

          {/* Lista wpisów pogrupowana według kategorii */}
          <div className="space-y-6 max-h-96 overflow-y-auto">
            {Object.entries(entriesByCategory).map(
              ([category, categoryEntries]) => (
                <div key={category} className="space-y-3">
                  <h4 className="font-bold text-amber-800 border-b border-amber-300 pb-1">
                    {category} ({categoryEntries.length})
                  </h4>
                  <div className="space-y-3">
                    {categoryEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className={`p-4 rounded border transition-colors ${
                          entry.isAutoGenerated
                            ? 'bg-blue-900/30 border-blue-400/50'
                            : 'bg-amber-900/30 border-amber-400/50'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h5
                                className={`font-bold ${
                                  entry.isAutoGenerated
                                    ? 'text-blue-300'
                                    : 'text-amber-200'
                                }`}
                              >
                                {entry.title}
                              </h5>
                              {entry.isAutoGenerated && (
                                <span className="text-xs bg-blue-800/50 text-blue-200 px-2 py-1 rounded">
                                  Auto
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {entry.date}
                              </span>
                            </div>
                            <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">
                              {entry.content}
                            </p>
                            {entry.tags.length > 0 && (
                              <div className="flex gap-1 mt-2 flex-wrap">
                                {entry.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="text-xs bg-muted/50 text-foreground px-2 py-1 rounded"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1 ml-2">
                            <Button
                              onClick={() => setEditingEntry(entry)}
                              variant="outline"
                              size="sm"
                              className="text-xs"
                            >
                              Edytuj
                            </Button>
                            <Button
                              onClick={() => deleteEntry(entry.id)}
                              variant="outline"
                              size="sm"
                              className="text-xs text-red-600 hover:bg-red-50"
                            >
                              Usuń
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>

          {/* Brak wpisów */}
          {filteredEntries.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {entries.length === 0 ? (
                <div>
                  <p className="text-lg font-medium mb-2 text-foreground">
                    Dziennik jest pusty
                  </p>
                  <p className="text-sm text-foreground">
                    Dodaj pierwszy wpis lub rozpocznij grę, aby wygenerować
                    automatyczne wpisy.
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-medium mb-2 text-foreground">
                    Brak wyników wyszukiwania
                  </p>
                  <p className="text-sm text-foreground">
                    Spróbuj zmienić filtry lub wyszukiwanie.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Formularz dodawania */}
          {showAddForm && (
            <AddEntryForm
              onAdd={addEntry}
              onCancel={() => setShowAddForm(false)}
              categories={categories}
              defaultTags={defaultTags}
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
      </div>
    </div>
  );
}

interface AddEntryFormProps {
  onAdd: (entry: Omit<JournalEntry, 'id' | 'date'>) => void;
  onCancel: () => void;
  categories: string[];
  defaultTags: string[];
}

function AddEntryForm({
  onAdd,
  onCancel,
  categories,
  defaultTags,
}: AddEntryFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: categories[0],
    tags: [] as string[],
    isAutoGenerated: false,
  });
  const [newTag, setNewTag] = useState('');

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

  return (
    <div className="text-foreground space-y-6">
      <h3 className="text-2xl font-bold text-center">
        📖 Dodaj Nowy Wpis do Dziennika
      </h3>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2 text-foreground">
            Tytuł
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            className="w-full p-3 bg-black/50 border border-white/20 rounded-xl text-foreground focus:border-purple-500 focus:outline-none"
            placeholder="np. Spotkanie z dziwnym człowiekiem"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-foreground">
            Treść
          </label>
          <textarea
            value={formData.content}
            onChange={(e) =>
              setFormData({ ...formData, content: e.target.value })
            }
            className="w-full p-3 bg-black/50 border border-white/20 rounded-xl text-foreground focus:border-purple-500 focus:outline-none min-h-32"
            placeholder="Opisz co się wydarzyło..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-foreground">
            Kategoria
          </label>
          <select
            value={formData.category}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value })
            }
            className="w-full p-3 bg-black/50 border border-white/20 rounded-xl text-foreground focus:border-purple-500 focus:outline-none"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-foreground">
            Tagi
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-600 text-foreground"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-1 hover:text-red-300"
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
              className="flex-1 p-2 bg-black/50 border border-white/20 rounded-lg text-foreground focus:border-purple-500 focus:outline-none"
              placeholder="Dodaj tag..."
              onKeyPress={(e) =>
                e.key === 'Enter' && (e.preventDefault(), addTag(newTag))
              }
            />
            <Button
              type="button"
              onClick={() => addTag(newTag)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-foreground rounded-lg"
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
                className="px-2 py-1 text-xs bg-muted hover:bg-muted text-foreground rounded"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="autoGenerated"
            checked={formData.isAutoGenerated}
            onChange={(e) =>
              setFormData({ ...formData, isAutoGenerated: e.target.checked })
            }
            className="w-4 h-4 text-purple-600 bg-black/50 border-white/20 rounded focus:ring-purple-500 focus:ring-2"
          />
          <label
            htmlFor="autoGenerated"
            className="ml-2 text-sm text-foreground"
          >
            Wygenerowane automatycznie przez AI
          </label>
        </div>

        <div className="flex gap-3">
          <Button
            type="submit"
            className="flex-1 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-foreground font-semibold rounded-xl transition-all duration-300 hover:scale-105"
            disabled={!formData.title.trim() || !formData.content.trim()}
          >
            ➕ Dodaj
          </Button>
          <Button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-muted text-foreground font-semibold rounded-xl transition-all duration-300 hover:scale-105"
          >
            ❌ Anuluj
          </Button>
        </div>
      </form>
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
}: EditEntryFormProps) {
  const [formData, setFormData] = useState(entry);
  const [newTag, setNewTag] = useState('');

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg p-6 w-[90vw] max-w-[1440px] mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold mb-4 text-foreground">
          Edytuj Wpis w Dzienniku
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">
              Tytuł
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full p-2 border border-border rounded bg-muted text-foreground"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">
              Treść
            </label>
            <Textarea
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              className="min-h-32 bg-muted text-foreground border-border"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">
              Kategoria
            </label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              className="w-full p-2 border border-border rounded bg-muted text-foreground"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">
              Tagi
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Dodaj tag..."
                className="flex-1 p-2 border border-border rounded bg-muted text-foreground placeholder:text-muted-foreground"
                onKeyDown={(e) =>
                  e.key === 'Enter' && (e.preventDefault(), addTag(newTag))
                }
              />
              <Button
                type="button"
                onClick={() => addTag(newTag)}
                variant="outline"
                size="sm"
              >
                Dodaj
              </Button>
            </div>
            <div className="flex gap-1 flex-wrap">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-blue-800/50 text-blue-200 px-2 py-1 rounded flex items-center gap-1"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              Zapisz
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Anuluj
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
