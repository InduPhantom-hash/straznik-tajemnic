'use client';

import React, { useState, useEffect } from 'react';
import { EpochWikiTab } from './EpochWikiTab';
import { BestiaryRulesTab } from './BestiaryRulesTab';
import { HelpAssistantTab } from './HelpAssistantTab';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [activeTab, setActiveTab] = useState<'EPOCH_WIKI' | 'RULES_BESTIARY' | 'INTERFACE' | 'RAG_ASSISTANT' | 'COPYRIGHT'>('EPOCH_WIKI');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-5xl bg-gray-950 border border-amber-900/60 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Nagłówek Modalu */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-900/40 bg-gray-900/60">
          <div className="flex items-center gap-2">
            <span className="text-xl">🕯️</span>
            <h2 className="text-lg font-serif text-amber-400 font-semibold tracking-wide">
              Pomoc & Encyklopedia Badacza
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-amber-400 text-xl font-bold px-2 py-1 transition-colors"
            title="Zamknij (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Zakładki Nawigacji Pomocy */}
        <div className="flex border-b border-amber-900/30 bg-gray-900/30 px-6 pt-2 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('EPOCH_WIKI')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'EPOCH_WIKI'
                ? 'border-amber-500 text-amber-300 bg-amber-950/30'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            🇵🇱 Polska (1990–2000)
          </button>
          <button
            onClick={() => setActiveTab('RULES_BESTIARY')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'RULES_BESTIARY'
                ? 'border-amber-500 text-amber-300 bg-amber-950/30'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            🎲 Zasady & Bestiariusz
          </button>
          <button
            onClick={() => setActiveTab('INTERFACE')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'INTERFACE'
                ? 'border-amber-500 text-amber-300 bg-amber-950/30'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            🖥️ Interfejs Aplikacji
          </button>
          <button
            onClick={() => setActiveTab('RAG_ASSISTANT')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'RAG_ASSISTANT'
                ? 'border-amber-500 text-amber-300 bg-amber-950/30'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            🤖 Asystent AI
          </button>
          <button
            onClick={() => setActiveTab('COPYRIGHT')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'COPYRIGHT'
                ? 'border-amber-500 text-amber-300 bg-amber-950/30'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            ℹ️ Prawa & Informacje
          </button>
        </div>

        {/* Zawartość Aktywnej Zakładki */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-950">
          {activeTab === 'EPOCH_WIKI' && <EpochWikiTab />}
          {activeTab === 'RULES_BESTIARY' && <BestiaryRulesTab />}
          {activeTab === 'RAG_ASSISTANT' && <HelpAssistantTab />}
          {activeTab === 'INTERFACE' && (
            <div className="text-gray-300 text-xs space-y-3 p-4 bg-gray-900/40 border border-amber-900/30 rounded">
              <h3 className="text-amber-400 font-serif text-sm font-bold">Instrukcja Interfejsu</h3>
              <p>• <strong>Czat Narracyjny:</strong> Główna przestrzeń dialogu z AI Mistrzem Gry. Możesz wpisywać akcje postaci lub używać rzutów.</p>
              <p>• <strong>Tacka Kości:</strong> Wybór kości do rzutu z automatycznym wyliczeniem stopnia sukcesu.</p>
              <p>• <strong>Tablica Badacza:</strong> Zbiór dowodów, poszlak i notatek gromadzonych automatycznie podczas kampanii.</p>
            </div>
          )}
          {activeTab === 'COPYRIGHT' && (
            <div className="text-gray-300 text-xs space-y-3 p-4 bg-gray-900/40 border border-amber-900/30 rounded">
              <h3 className="text-amber-400 font-serif text-sm font-bold">Informacje Prawne & Autorskie</h3>
              <p>Projekt Strażnik Tajemnic AI jest nieoficjalną aplikacją fanowską tworzoną w celach edukacyjnych i rozrywkowych.</p>
              <p>Wszystkie elementy twórczości H.P. Lovecrafta wykorzystane w projekcie należą do Domeny Publicznej. Zew Cthulhu / Call of Cthulhu są zastrzeżonymi znakami towarowymi firmy Chaosium Inc.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
