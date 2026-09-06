'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Film, Play, ArrowLeft } from 'lucide-react';
import { useCutscene } from '@/hooks/useCutscene';
import { CutscenePlayer } from '@/components/ui/cutscene-player';
import { CutsceneSegment } from '@/lib/types';
import { useTranslations } from 'next-intl';

export default function CutscenePrototype() {
  const t = useTranslations('Page');
  const cutsceneManager = useCutscene();
  const [customText, setCustomText] = useState('');

  const DEMO_CUTSCENE: CutsceneSegment[] = [
    {
      id: 'intro-1',
      text: t('demoCutscene.segment1'),
      duration: 4000,
    },
    {
      id: 'intro-2',
      text: t('demoCutscene.segment2'),
      duration: 4000,
    },
    {
      id: 'intro-3',
      text: t('demoCutscene.segment3'),
      duration: 5000,
    },
  ];

  const handleStartDemo = () => {
    cutsceneManager.startCutscene(DEMO_CUTSCENE);
  };

  const handleStartCustom = () => {
    if (!customText.trim()) return;

    const segments: CutsceneSegment[] = customText
      .split(/\n\n+/)
      .filter((s) => s.trim())
      .map((text, i) => ({
        id: `custom-${Date.now()}-${i}`,
        text: text.trim(),
        duration: Math.max(3000, text.length * 50),
      }));

    if (segments.length > 0) {
      cutsceneManager.startCutscene(segments);
    }
  };

  const placeholder = [
    t('customSection.placeholder1'),
    t('customSection.placeholder2'),
    t('customSection.placeholder3'),
  ].join('\n\n');

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/prototypes"
          className="text-muted-foreground hover:text-brass text-sm mb-4 inline-flex items-center gap-1 transition-colors font-display uppercase tracking-wider"
        >
          <ArrowLeft size={16} />
          {t('backToPrototypes')}
        </Link>

        <h1 className="text-2xl font-bold font-display uppercase tracking-wider text-brass flex items-center gap-2 mb-2">
          <Film className="w-6 h-6 text-primary" />
          {t('title')}
        </h1>
        <p className="text-muted-foreground mb-8">{t('description')}</p>

        <div className="bg-card border border-brass/30 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold font-display tracking-wider text-foreground mb-3">{t('demoSection.title')}</h2>
          <p className="text-muted-foreground text-sm mb-4">{t('demoSection.description')}</p>
          <button
            onClick={handleStartDemo}
            className="w-full py-3 rounded-lg font-semibold font-display uppercase tracking-wider flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm"
          >
            <Play size={20} />
            {t('demoSection.startButton')}
          </button>
        </div>

        <div className="bg-card border border-brass/30 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold font-display tracking-wider text-foreground mb-3">{t('customSection.title')}</h2>
          <p className="text-muted-foreground text-sm mb-4">{t('customSection.description')}</p>
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder={placeholder}
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
            {t('customSection.startButton')}
          </button>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold font-display tracking-wider text-brass mb-2">{t('controlsInfo.title')}</h3>
          <ul className="text-muted-foreground text-sm space-y-1">
            <li>
              <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-xs text-foreground font-mono">Space</kbd> -{' '}
              {t('controlsInfo.pauseResume')}
            </li>
            <li>
              <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-xs text-foreground font-mono">→</kbd>{' '}
              <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-xs text-foreground font-mono">Enter</kbd> -{' '}
              {t('controlsInfo.nextSegment')}
            </li>
            <li>
              <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-xs text-foreground font-mono">M</kbd> -{' '}
              {t('controlsInfo.muteUnmute')}
            </li>
            <li>
              <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-xs text-foreground font-mono">Esc</kbd> -{' '}
              {t('controlsInfo.skipCutscene')}
            </li>
          </ul>
        </div>
      </div>

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
