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
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <Link
          href="/prototypes"
          className="text-muted-foreground hover:text-brass text-sm mb-4 inline-block font-display uppercase tracking-wider transition-colors"
        >
          ← Powrót do prototypów
        </Link>

        <h1 className="text-2xl font-bold font-display uppercase tracking-wider text-brass flex items-center gap-2 mb-2">
          <Film className="w-6 h-6 text-primary" />
          Auto-GM Cutscene Prototype
        </h1>
        <p className="text-muted-foreground mb-8">
          Testuj automatyczną narrację w stylu cutscenki filmowej
        </p>

        {/* Demo Section */}
        <div className="bg-card border border-brass/30 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold font-display tracking-wider text-foreground mb-3">Demo Cutsceny</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Przykładowa cutscena w stylu Lovecrafta - 3 segmenty narracji.
          </p>
          <button
            onClick={handleStartDemo}
            className="w-full py-3 rounded-lg font-semibold font-display uppercase tracking-wider flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm"
          >
            <Play size={20} />
            Uruchom Demo
          </button>
        </div>

        {/* Custom Cutscene */}
        <div className="bg-card border border-brass/30 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold font-display tracking-wider text-foreground mb-3">Własna Cutscena</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Wpisz tekst narracji. Każdy akapit (oddzielony pustą linią) stanie się osobnym segmentem.
          </p>
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Wpisz pierwszy akapit narracji...

Wpisz drugi akapit narracji...

Wpisz trzeci akapit narracji..."
            className="w-full h-48 bg-muted border border-border rounded-lg p-3 text-foreground resize-none focus:outline-none focus:border-brass mb-4 placeholder:text-muted-foreground/50"
          />
          <button
            onClick={handleStartCustom}
            disabled={!customText.trim()}
            className={`w-full py-3 rounded-lg font-semibold font-display uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              customText.trim()
                ? 'bg-brass hover:bg-brass/90 text-primary-foreground font-bold shadow-sm'
                : 'bg-muted text-muted-foreground border border-border cursor-not-allowed'
            }`}
          >
            <Film size={20} />
            Uruchom Własną Cutscenę
          </button>
        </div>

        {/* Controls Info */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold font-display tracking-wider text-brass mb-2">Kontrolki podczas cutsceny:</h3>
          <ul className="text-muted-foreground text-sm space-y-1">
            <li><kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-xs text-foreground font-mono">Spacja</kbd> - Pauza / Wznów</li>
            <li><kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-xs text-foreground font-mono">→</kbd> lub <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-xs text-foreground font-mono">Enter</kbd> - Następny segment</li>
            <li><kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-xs text-foreground font-mono">M</kbd> - Wycisz/Włącz dźwięk</li>
            <li><kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-xs text-foreground font-mono">Esc</kbd> - Pomiń cutscenę</li>
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
