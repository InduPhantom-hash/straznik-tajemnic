'use client';

import React, { useState } from 'react';

interface MonsterEntry {
  name: string;
  category: string;
  sanLoss: string;
  description: string;
}

const BESTIARY_DATA: MonsterEntry[] = [
  {
    name: 'Cthulhu',
    category: 'Wielcy Dawni',
    sanLoss: '1k10/1k100',
    description: 'Tytaniczny arcykapłan Wielkich Dawnych, spoczywający w uśpieniu w zatopionym mieście R\'lyeh.',
  },
  {
    name: 'Ghul (Ghoul)',
    category: 'Rasy Służące',
    sanLoss: '0/1k6',
    description: 'Psowate, pokraczne stworzenia cmentarne odżywiające się ciałami zmarłych.',
  },
  {
    name: 'Deep One (Głębinowy)',
    category: 'Rasy Służące',
    sanLoss: '0/1k6',
    description: 'Amfibijne istoty zamieszkujące głębiny oceanów, czczące Dagona i Cthulhu.',
  },
  {
    name: 'Nyarlathotep',
    category: 'Zewnętrzni Bogowie',
    sanLoss: '1k6/1k20',
    description: 'Pełzający Chaos, posłaniec Zewnętrznych Bogów o tysiącu twarzy i postaci.',
  },
];

export function BestiaryRulesTab() {
  const [subTab, setSubTab] = useState<'RULES' | 'BESTIARY'>('RULES');
  const [searchMonster, setSearchMonster] = useState('');

  const filteredMonsters = BESTIARY_DATA.filter((m) =>
    m.name.toLowerCase().includes(searchMonster.toLowerCase()) ||
    m.category.toLowerCase().includes(searchMonster.toLowerCase())
  );

  return (
    <div className="space-y-4 text-gray-200">
      <div className="flex gap-2 border-b border-amber-900/40 pb-2">
        <button
          onClick={() => setSubTab('RULES')}
          className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
            subTab === 'RULES'
              ? 'bg-amber-900/60 text-amber-300 border border-amber-700/50'
              : 'bg-gray-900 text-gray-400 hover:text-gray-200'
          }`}
        >
          🎲 Zasady CoC 7e
        </button>
        <button
          onClick={() => setSubTab('BESTIARY')}
          className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
            subTab === 'BESTIARY'
              ? 'bg-amber-900/60 text-amber-300 border border-amber-700/50'
              : 'bg-gray-900 text-gray-400 hover:text-gray-200'
          }`}
        >
          👾 Bestiariusz Mitów
        </button>
      </div>

      {subTab === 'RULES' ? (
        <div className="space-y-4 text-sm leading-relaxed text-gray-300">
          <div className="p-3 bg-gray-900/80 border border-amber-900/30 rounded">
            <h4 className="text-amber-400 font-serif font-bold mb-1">🎲 Testy Umiejętności (k100)</h4>
            <p>Rzut wykonuje się dwiema kośćmi k10 (dziesiątki i jedności). Wynik musisz uznać za udany, gdy jest równy lub niższy od wartości umiejętności badacza.</p>
            <ul className="list-disc list-inside mt-2 text-xs space-y-1 text-gray-400">
              <li><strong>Zwykły:</strong> Wynik ≤ Wartość umiejętności.</li>
              <li><strong>Trudny:</strong> Wynik ≤ 1/2 Wartości umiejętności.</li>
              <li><strong>Ekstremalny:</strong> Wynik ≤ 1/5 Wartości umiejętności.</li>
              <li><strong>Krytyk:</strong> Wynik równy 01.</li>
              <li><strong>Fumble (Porażka):</strong> Wynik 96-100 (lub 100 przy wartości ≥ 50).</li>
            </ul>
          </div>

          <div className="p-3 bg-gray-900/80 border border-amber-900/30 rounded">
            <h4 className="text-amber-400 font-serif font-bold mb-1">🧠 Poczytalność (SAN) i Obłęd</h4>
            <p>Kontakt z okropieństwami Mitów wymusza rzut na Poczytalność. Nieudany rzut powoduje utratę punktów SAN.</p>
            <ul className="list-disc list-inside mt-2 text-xs space-y-1 text-gray-400">
              <li><strong>Chwilowe Szaleństwo:</strong> Utrata ≥ 5 SAN w jednym rzucie.</li>
              <li><strong>Długotrwałe Szaleństwo:</strong> Utrata 1/5 SAN w trakcie jednego dnia gry.</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Szukaj stwora..."
            value={searchMonster}
            onChange={(e) => setSearchMonster(e.target.value)}
            className="w-full px-3 py-1.5 bg-gray-900 border border-amber-900/40 rounded text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-amber-500"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
            {filteredMonsters.map((monster) => (
              <div key={monster.name} className="p-3 bg-gray-900/90 border border-amber-900/30 rounded flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <h5 className="font-serif font-bold text-amber-300 text-sm">{monster.name}</h5>
                    <span className="text-[10px] px-1.5 py-0.5 bg-amber-950 text-amber-400 border border-amber-800/50 rounded">
                      SAN: {monster.sanLoss}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest">{monster.category}</span>
                  <p className="text-xs text-gray-300 mt-2">{monster.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
