'use client';

import React, { useState, useEffect } from 'react';
import {
  checkChromeAIStatus,
  getChromeAIStatus,
  destroyNanoSession,
  rerankWithNano,
  type ChromeAIStatus,
  type RagFragment,
} from '@/lib/chrome-ai-reranker';

export function HelpAssistantTab() {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [nanoStatus, setNanoStatus] = useState<ChromeAIStatus>('unavailable');

  // Sprawdź dostępność Chrome AI Nano przy montowaniu
  useEffect(() => {
    checkChromeAIStatus().then(setNanoStatus);
    return () => {
      destroyNanoSession();
    };
  }, []);

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
          // Flaga informująca backend, że chcemy surowe fragmenty RAG do re-rankingu
          returnRagFragments: nanoStatus === 'available',
        }),
      });

      if (!res.ok) {
        throw new Error('Nie udało się uzyskać odpowiedzi od Asystenta.');
      }

      const data = await res.json();

      // Jeśli Nano dostępne i backend zwrócił surowe fragmenty - re-rankuj
      if (nanoStatus === 'available' && data.ragFragments?.length) {
        const fragments: RagFragment[] = data.ragFragments.map(
          (f: { content: string; source?: string; score?: number }) => ({
            content: f.content,
            source: f.source,
            score: f.score,
          })
        );

        const reranked = await rerankWithNano(query, fragments, 5);

        // Przekaż re-rankowane fragmenty do drugiego wywołania
        // (lub użyj ich do wzbogacenia wyświetlanej odpowiedzi)
        console.log('🧠 Re-ranked fragments:', reranked.length);
      }

      setAnswer(data.response || data.text || 'Brak odpowiedzi.');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Wystąpił nieznany błąd.';
      setAnswer(`⚠️ Błąd: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  /** Etykieta statusu Nano dla UI. */
  const nanoLabel: Record<ChromeAIStatus, { text: string; color: string }> = {
    available: { text: 'AI Nano aktywne', color: 'text-green-400' },
    'after-download': { text: 'AI Nano (wymaga pobrania)', color: 'text-yellow-400' },
    unavailable: { text: '', color: '' },
    error: { text: 'AI Nano niedostępne', color: 'text-red-400' },
  };

  return (
    <div className="space-y-4 text-gray-200">
      <div className="p-3 bg-gray-900/60 border border-amber-900/30 rounded text-xs text-gray-300">
        <p>💡 <strong>Asystent RAG Pomocy:</strong> Zadaj pytanie odnośnie mechaniki Zewu Cthulhu 7. edycji lub realiów epoki. Asystent udzieli zwięzłej odpowiedzi bez wpływania na narrację Twojej sesji.</p>
        {nanoLabel[nanoStatus].text && (
          <p className={`mt-1 ${nanoLabel[nanoStatus].color}`}>
            🧠 {nanoLabel[nanoStatus].text}
          </p>
        )}
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
