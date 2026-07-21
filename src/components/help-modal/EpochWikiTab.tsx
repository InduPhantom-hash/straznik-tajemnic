'use client';

import React, { useState, useEffect } from 'react';

interface WikiEntry {
  id: string;
  category: string;
  categoryTitle: string;
  term: string;
  shortDefinition: string;
  fullContent: string;
  tags: string[];
}

export function EpochWikiTab() {
  const [entries, setEntries] = useState<WikiEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeEntry, setActiveEntry] = useState<WikiEntry | null>(null);

  useEffect(() => {
    // Wczytaj słownik z danych epoki
    fetch('/data/epochs/pl-1990s-2000s/dictionary_wiki.json')
      .then((res) => {
        if (!res.ok) throw new Error('Nie znaleziono danych encyklopedii.');
        return res.json();
      })
      .then((data: WikiEntry[]) => {
        setEntries(data);
      })
      .catch((err) => {
        console.warn('Brak załadowanych danych encyklopedii epoki:', err);
      });
  }, []);

  const categories = Array.from(new Set(entries.map((e) => e.categoryTitle)));

  const filteredEntries = entries.filter((entry) => {
    const matchesCategory = selectedCategory === 'ALL' || entry.categoryTitle === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      entry.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.fullContent.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col md:flex-row gap-4 h-[600px] text-gray-200 bg-gray-900/90 p-4 rounded-lg border border-amber-900/40">
      {/* Panel boczny - Lista haseł i filtry */}
      <div className="w-full md:w-1/3 flex flex-col gap-3 border-b md:border-b-0 md:border-r border-amber-900/30 pr-0 md:pr-4">
        <h3 className="text-lg font-serif text-amber-500 flex items-center gap-2">
          <span>📚 Encyklopedia Epoki (PL 1990-2000)</span>
        </h3>

        {/* Wyszukiwarka */}
        <input
          type="text"
          placeholder="Szukaj pojęcia, prawa, slangu..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-amber-900/50 rounded text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-500"
        />

        {/* Filtr kategorii */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-amber-900/50 rounded text-sm text-gray-100 focus:outline-none focus:border-amber-500"
        >
          <option value="ALL">Wszystkie kategorie ({entries.length})</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        {/* Lista haseł */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {filteredEntries.length === 0 ? (
            <p className="text-xs text-gray-500 italic p-2">Brak wyników dla podanych kryteriów.</p>
          ) : (
            filteredEntries.map((entry) => (
              <button
                key={entry.id}
                onClick={() => setActiveEntry(entry)}
                className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                  activeEntry?.id === entry.id
                    ? 'bg-amber-950/80 border border-amber-600/50 text-amber-300 font-medium'
                    : 'bg-gray-800/40 hover:bg-gray-800 text-gray-300'
                }`}
              >
                <div className="truncate">{entry.term}</div>
                <div className="text-[10px] text-amber-600/80 uppercase tracking-wider">{entry.categoryTitle}</div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Panel główny - Podgląd treści wybranego hasła */}
      <div className="w-full md:w-2/3 flex flex-col overflow-y-auto pl-0 md:pl-2">
        {activeEntry ? (
          <div className="space-y-4">
            <div className="border-b border-amber-900/40 pb-2">
              <span className="text-xs text-amber-500 uppercase tracking-widest font-mono">
                {activeEntry.categoryTitle}
              </span>
              <h2 className="text-xl font-serif text-amber-200 mt-1">{activeEntry.term}</h2>
            </div>

            <div className="prose prose-invert prose-amber max-w-none text-sm leading-relaxed whitespace-pre-line text-gray-300">
              {activeEntry.fullContent}
            </div>

            {activeEntry.tags && activeEntry.tags.length > 0 && (
              <div className="pt-4 border-t border-gray-800 flex flex-wrap gap-1">
                {activeEntry.tags.map((tag) => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 bg-gray-800 border border-gray-700 text-gray-400 rounded">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
            <span className="text-4xl mb-2">📜</span>
            <p className="text-sm">Wybierz hasło z listy po lewej stronie, aby wyświetlić szczegóły i kontekst historyczny z lat 90.-2000. w Polsce.</p>
          </div>
        )}
      </div>
    </div>
  );
}
