'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Film, Play, Pause, SkipForward, X } from 'lucide-react';
import { useCutscene } from '@/hooks/useCutscene';
import { CutscenePlayer } from '@/components/ui/cutscene-player';
import { CutsceneSegment } from '@/lib/types';

// Przykładowe segmenty cutsceny w stylu Lovecrafta
const DEMO_CUTSCENE: CutsceneSegment[] = [
  {
    id: 'intro-1',
    text: 'Mgła spowija ulice Arkham niczym całun umarłych. Latarnie gazowe migoczą słabo, ich światło pochłaniane przez gęstą, nadnaturalną ciemność.',
    duration: 4000,
  },
  {
    id: 'intro-2', 
    text: 'W oddali słyszysz gong - pojedynczy, niski dźwięk, który zdaje się rezonować nie tylko w powietrzu, ale w samej tkance rzeczywistości.',
    duration: 4000,
  },
  {
    id: 'intro-3',
    text: 'Przed tobą wyrasta sylwetka starego wiktoriańskiego domu. Jego okna spoglądają na ciebie niczym puste oczodoły czaszki. Wiesz, że tutaj zaczyna się twoja podróż w nieznane.',
    duration: 5000,
  },
];

export default function CutscenePrototype() {
  const cutsceneManager = useCutscene();
  const [customText, setCustomText] = useState('');

  const handleStartDemo = () => {
    cutsceneManager.startCutscene(DEMO_CUTSCENE);
  };

  const handleStartCustom = () => {
    if (!customText.trim()) return;
    
    // Parsuj tekst na segmenty (każdy akapit = segment)
    const segments: CutsceneSegment[] = customText
      .split(/\n\n+/)
      .filter(t => t.trim())
      .map((text, i) => ({
        id: `custom-${Date.now()}-${i}`,
        text: text.trim(),
        duration: Math.max(3000, text.length * 50), // ~50ms per char
      }));
    
    if (segments.length > 0) {
      cutsceneManager.startCutscene(segments);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <Link
          href="/prototypes"
          className="text-zinc-500 hover:text-zinc-300 text-sm mb-4 inline-block"
        >
          ← Powrót do prototypów
        </Link>

        <h1 className="text-2xl font-bold text-emerald-500 flex items-center gap-2 mb-2">
          <Film className="w-6 h-6" />
          Auto-GM Cutscene Prototype
        </h1>
        <p className="text-zinc-400 mb-8">
          Testuj automatyczną narrację w stylu cutscenki filmowej
        </p>

        {/* Demo Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-3">Demo Cutsceny</h2>
          <p className="text-zinc-400 text-sm mb-4">
            Przykładowa cutscena w stylu Lovecrafta - 3 segmenty narracji.
          </p>
          <button
            onClick={handleStartDemo}
            className="w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white transition-all"
          >
            <Play size={20} />
            Uruchom Demo
          </button>
        </div>

        {/* Custom Cutscene */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-3">Własna Cutscena</h2>
          <p className="text-zinc-400 text-sm mb-4">
            Wpisz tekst narracji. Każdy akapit (oddzielony pustą linią) stanie się osobnym segmentem.
          </p>
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Wpisz pierwszy akapit narracji...

Wpisz drugi akapit narracji...

Wpisz trzeci akapit narracji..."
            className="w-full h-48 bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-zinc-200 resize-none focus:outline-none focus:border-emerald-500/50 mb-4"
          />
          <button
            onClick={handleStartCustom}
            disabled={!customText.trim()}
            className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
              customText.trim()
                ? 'bg-purple-600 hover:bg-purple-500 text-white'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          >
            <Film size={20} />
            Uruchom Własną Cutscenę
          </button>
        </div>

        {/* Controls Info */}
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-zinc-400 mb-2">Kontrolki podczas cutsceny:</h3>
          <ul className="text-zinc-500 text-sm space-y-1">
            <li><kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-xs">Spacja</kbd> — Pauza / Wznów</li>
            <li><kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-xs">→</kbd> lub <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-xs">Enter</kbd> — Następny segment</li>
            <li><kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-xs">M</kbd> — Wycisz/Włącz dźwięk</li>
            <li><kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-xs">Esc</kbd> — Pomiń cutscenę</li>
          </ul>
        </div>
      </div>

      {/* Cutscene Player */}
      {cutsceneManager.isActive && (
        <CutscenePlayer
          cutscene={cutsceneManager.cutscene}
          onSegmentComplete={cutsceneManager.nextSegment}
          onSkip={cutsceneManager.skipCutscene}
          onPause={cutsceneManager.pause}
          onResume={cutsceneManager.resume}
          onMute={cutsceneManager.toggleMute}
          onClose={cutsceneManager.skipCutscene}
        />
      )}
    </div>
  );
}
