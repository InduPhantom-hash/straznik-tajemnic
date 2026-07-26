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
  sourceAttribution?: string;
  license?: string;
  isPublicDomain?: boolean;
}

type DatasetType = 'lovecraft-mythos' | 'pl-1990s-2000s';

export function EpochWikiTab() {
  const [currentDataset, setCurrentDataset] = useState<DatasetType>('lovecraft-mythos');
  const [entries, setEntries] = useState<WikiEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeEntry, setActiveEntry] = useState<WikiEntry | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    setIsLoading(true);
    const dataPath = `/data/epochs/${currentDataset}/dictionary_wiki.json`;

    fetch(dataPath)
      .then((res) => {
        if (!res.ok) throw new Error('Nie znaleziono danych encyklopedii.');
        return res.json();
      })
      .then((data: WikiEntry[]) => {
        setEntries(data);
        setActiveEntry(data.length > 0 ? data[0] : null);
        setSelectedCategory('ALL');
        setIsLoading(false);
      })
      .catch((err) => {
        console.warn('Brak załadowanych danych encyklopedii:', err);
        setEntries([]);
        setActiveEntry(null);
        setIsLoading(false);
      });
  }, [currentDataset]);

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
    <div className="flex flex-col gap-4 text-gray-200 bg-gray-900/90 p-4 rounded-lg border border-amber-900/40 min-h-[620px]">
      {/* Przełącznik Słowników / Baz Wiedzy */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-900/40 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">📜</span>
          <h3 className="text-lg font-serif text-amber-400 font-semibold">
            {currentDataset === 'lovecraft-mythos' ? 'Encyklopedia Mitów Cthulhu' : 'Encyklopedia Epoki (PL 1990-2000)'}
          </h3>
        </div>

        <div className="flex items-center bg-gray-950 p-1 rounded-md border border-amber-900/50">
          <button
            onClick={() => setCurrentDataset('lovecraft-mythos')}
            className={`px-3 py-1.5 rounded text-xs font-serif transition-colors ${
              currentDataset === 'lovecraft-mythos'
                ? 'bg-amber-900/80 text-amber-200 font-medium shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            🐙 Mity Cthulhu (Fandom Wiki)
          </button>
          <button
            onClick={() => setCurrentDataset('pl-1990s-2000s')}
            className={`px-3 py-1.5 rounded text-xs font-serif transition-colors ${
              currentDataset === 'pl-1990s-2000s'
                ? 'bg-amber-900/80 text-amber-200 font-medium shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            🇵🇱 Polska (1990-2000)
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 h-[520px]">
        {/* Panel boczny - Lista haseł i filtry */}
        <div className="w-full md:w-1/3 flex flex-col gap-3 border-b md:border-b-0 md:border-r border-amber-900/30 pr-0 md:pr-4">
          {/* Wyszukiwarka */}
          <input
            type="text"
            placeholder="Szukaj pojęcia, potwora, księgi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-amber-900/50 rounded text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-500"
          />

          {/* Filtr kategorii */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-amber-900/50 rounded text-sm text-gray-100 focus:outline-none focus:border-amber-500 text-xs"
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
            {isLoading ? (
              <div className="p-4 text-center text-xs text-amber-500/80 animate-pulse">Ładowanie haseł encyklopedii...</div>
            ) : filteredEntries.length === 0 ? (
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
                  <div className="truncate font-serif">{entry.term}</div>
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
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs text-amber-500 uppercase tracking-widest font-mono">
                    {activeEntry.categoryTitle}
                  </span>

                  {/* Plakietka Licencyjna / Informacyjna */}
                  <div className="flex items-center gap-1.5">
                    {activeEntry.isPublicDomain && (
                      <span className="text-[10px] bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 px-2 py-0.5 rounded font-mono">
                        🏛️ Domena Publiczna (H.P. Lovecraft)
                      </span>
                    )}
                    {activeEntry.license && (
                      <span className="text-[10px] bg-amber-950/80 border border-amber-700/60 text-amber-300 px-2 py-0.5 rounded font-mono">
                        ⚖️ CC-BY-SA 3.0 (Fandom Wiki)
                      </span>
                    )}
                  </div>
                </div>

                <h2 className="text-2xl font-serif text-amber-200 mt-1">{activeEntry.term}</h2>
              </div>

              <div className="prose prose-invert prose-amber max-w-none text-sm leading-relaxed whitespace-pre-line text-gray-300">
                {activeEntry.fullContent}
              </div>

              {/* Sekcja Uznania Autorstwa & Licencji w stopce wpisu */}
              <div className="pt-4 border-t border-amber-900/30 flex flex-col gap-2 text-xs text-gray-400 bg-gray-950/40 p-3 rounded border border-amber-950">
                <div className="flex items-center gap-2">
                  <span className="text-amber-500">ℹ️ Przypis autorski i prawo:</span>
                  <span className="text-gray-300">
                    {activeEntry.sourceAttribution || 'Społeczność The H.P. Lovecraft Wiki (Fandom)'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 leading-tight">
                  Treść pochodzi ze społecznościowej encyklopedii The H.P. Lovecraft Wiki na platformie Fandom i udostępniana jest zgodnie z licencją Creative Commons Attribution-ShareAlike (CC-BY-SA 3.0 / 4.0). Oryginalna twórczość H.P. Lovecrafta pozostaje w Domenie Publicznej.
                </p>
              </div>

              {activeEntry.tags && activeEntry.tags.length > 0 && (
                <div className="pt-2 flex flex-wrap gap-1">
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
              <p className="text-sm">Wybierz hasło z listy po lewej stronie, aby wyświetlić szczegóły i definicje.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
