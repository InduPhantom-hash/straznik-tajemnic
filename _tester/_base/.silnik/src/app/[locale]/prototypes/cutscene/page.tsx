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
    <div className="min-h-screen bg-zinc-950 p-8">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/prototypes"
          className="text-zinc-500 hover:text-zinc-300 text-sm mb-4 inline-flex items-center gap-1 transition-colors"
        >
          <ArrowLeft size={16} />
          {t('backToPrototypes')}
        </Link>

        <h1 className="text-2xl font-bold text-emerald-500 flex items-center gap-2 mb-2">
          <Film className="w-6 h-6" />
          {t('title')}
        </h1>
        <p className="text-zinc-400 mb-8">{t('description')}</p>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-3">{t('demoSection.title')}</h2>
          <p className="text-zinc-400 text-sm mb-4">{t('demoSection.description')}</p>
          <button
            onClick={handleStartDemo}
            className="w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white transition-all"
          >
            <Play size={20} />
            {t('demoSection.startButton')}
          </button>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-3">{t('customSection.title')}</h2>
          <p className="text-zinc-400 text-sm mb-4">{t('customSection.description')}</p>
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder={placeholder}
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
            {t('customSection.startButton')}
          </button>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-zinc-400 mb-2">{t('controlsInfo.title')}</h3>
          <ul className="text-zinc-500 text-sm space-y-1">
            <li>
              <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-xs">Space</kbd> -{' '}
              {t('controlsInfo.pauseResume')}
            </li>
            <li>
              <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-xs">→</kbd>{' '}
              <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-xs">Enter</kbd> -{' '}
              {t('controlsInfo.nextSegment')}
            </li>
            <li>
              <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-xs">M</kbd> -{' '}
              {t('controlsInfo.muteUnmute')}
            </li>
            <li>
              <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-xs">Esc</kbd> -{' '}
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
