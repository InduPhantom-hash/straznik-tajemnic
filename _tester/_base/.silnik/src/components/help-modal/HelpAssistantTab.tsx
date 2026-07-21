'use client';

import React, { useState } from 'react';

export function HelpAssistantTab() {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    setAnswer(null);

    try {
      const res = await fetch('/api/chat-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Działasz jako Asystent Pomocy w grze RPG Zew Cthulhu 7e. Odpowiedz zwięźle i konkretnie na pytanie gracza dotyczące zasad, mechaniki lub lore epoki: ${query}`,
        }),
      });

      if (!res.ok) {
        throw new Error('Nie udało się uzyskać odpowiedzi od Asystenta.');
      }

      const data = await res.json();
      setAnswer(data.response || data.text || 'Brak odpowiedzi.');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Wystąpił nieznany błąd.';
      setAnswer(`⚠️ Błąd: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 text-gray-200">
      <div className="p-3 bg-gray-900/60 border border-amber-900/30 rounded text-xs text-gray-300">
        <p>💡 <strong>Asystent RAG Pomocy:</strong> Zadaj pytanie odnośnie mechaniki Zewu Cthulhu 7. edycji lub realiów epoki. Asystent udzieli zwięzłej odpowiedzi bez wpływania na narrację Twojej sesji.</p>
      </div>

      <form onSubmit={handleAsk} className="flex gap-2">
        <input
          type="text"
          placeholder="np. Jak działa rzut przymuszony (Push Roll)?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 px-3 py-2 bg-gray-900 border border-amber-900/50 rounded text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-500"
        />
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="px-4 py-2 bg-amber-900/80 hover:bg-amber-800 disabled:opacity-50 text-amber-200 text-xs font-semibold rounded border border-amber-700/50 transition-colors"
        >
          {isLoading ? 'Szukam...' : 'Zadaj Pytanie'}
        </button>
      </form>

      {answer && (
        <div className="p-4 bg-gray-900 border border-amber-900/40 rounded space-y-2">
          <h5 className="text-xs font-serif text-amber-400 font-bold uppercase tracking-wider">Odpowiedź Asystenta</h5>
          <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">{answer}</p>
        </div>
      )}
    </div>
  );
}
