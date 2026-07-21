'use client';

import React, { useState } from 'react';
import { EpochWikiTab } from './EpochWikiTab';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [activeTab, setActiveTab] = useState<'INTERFACE' | 'RULES' | 'EPOCH_WIKI'>('EPOCH_WIKI');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-5xl bg-gray-950 border border-amber-900/60 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Nagłówek Modalu */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-900/40 bg-gray-900/60">
          <div className="flex items-center gap-2">
            <span className="text-xl">🕯️</span>
            <h2 className="text-lg font-serif text-amber-400 font-semibold tracking-wide">
              Pomoc & Baza Wiedzy Badacza
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
        <div className="flex border-b border-amber-900/30 bg-gray-900/30 px-6 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('EPOCH_WIKI')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'EPOCH_WIKI'
                ? 'border-amber-500 text-amber-300 bg-amber-950/30'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            🇵🇱 Polska (1990–2000)
          </button>
          <button
            onClick={() => setActiveTab('RULES')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'RULES'
                ? 'border-amber-500 text-amber-300 bg-amber-950/30'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            🎲 Mechanika CoC 7e
          </button>
          <button
            onClick={() => setActiveTab('INTERFACE')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'INTERFACE'
                ? 'border-amber-500 text-amber-300 bg-amber-950/30'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            🖥️ Interfejs Aplikacji
          </button>
        </div>

        {/* Zawartość Aktywnej Zakładki */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-950">
          {activeTab === 'EPOCH_WIKI' && <EpochWikiTab />}
          {activeTab === 'RULES' && (
            <div className="text-gray-300 text-sm space-y-3 p-4">
              <h3 className="text-amber-400 font-serif text-base">Skrót Zasad Zewu Cthulhu 7. Edycji</h3>
              <p>• <strong>Rzuty kośćmi:</strong> K100 (dwie kości dziesięciościenne) poniżej wartości umiejętności.</p>
              <p>• <strong>Progi sukcesu:</strong> Zwykły (≤ wartość), Trudny (≤ 1/2 wartości), Ekstremalny (≤ 1/5 wartości).</p>
              <p>• <strong>Poczytalność (SAN):</strong> Spadek poczytalności następuje po nieudanych testach obłędu.</p>
            </div>
          )}
          {activeTab === 'INTERFACE' && (
            <div className="text-gray-300 text-sm space-y-3 p-4">
              <h3 className="text-amber-400 font-serif text-base">Instrukcja Interfejsu</h3>
              <p>• <strong>Czat Narracyjny:</strong> Główna przestrzeń komunikacji z Mistrzem Gry.</p>
              <p>• <strong>Tablica Badacza:</strong> Automatycznie porządkowane poszlaki i zebrane dowody.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
