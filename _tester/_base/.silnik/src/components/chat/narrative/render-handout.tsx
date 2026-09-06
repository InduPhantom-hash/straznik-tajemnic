'use client';

/**
 * NarrativeFormatter renderHandout - IND-144 micro 4/8 (extract z NarrativeFormatter.tsx)
 *
 * Renderuje handout (wycinek prasowy, list, telegram, raport, dziennik, księga, notatka)
 * z dedykowanym Tailwind styling per typ. getHandoutStyles eksportowane dla testów
 * z 7 case switch matchującym HandoutType (IND-173 unifikacja z handout-generator).
 */

import { useState, useRef } from 'react';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import type { Section, HandoutType } from './types';
import { Volume2, Play, Pause, RotateCcw } from 'lucide-react';

export function HandoutAudioPlayer({ audioUrl }: { audioUrl: string }) {
  const t = useTranslations('NarrativeFormatter');
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch((e) => {
        console.warn('Playback error:', e);
        setIsPlaying(false);
      });
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
  };

  const handleRestart = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  };

  return (
    <div className="mt-3 pt-2.5 border-t border-amber-600/30 flex items-center justify-between gap-3 bg-black/40 px-3 py-2 rounded border border-brass/30">
      <audio ref={audioRef} src={audioUrl} onEnded={handleEnded} preload="none" />
      <div className="flex items-center gap-2 text-xs font-special-elite text-brass/90 uppercase tracking-wider">
        <Volume2 className="w-4 h-4 text-brass animate-pulse" />
        <span>{t('audioTrack')}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleRestart}
          className="p-1 text-brass/70 hover:text-brass transition-colors rounded hover:bg-brass/10 cursor-pointer"
          title={t('restart')}
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={togglePlay}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-special-elite bg-brass/20 hover:bg-brass/30 text-brass border border-brass/40 rounded transition-all cursor-pointer active:scale-95 shadow"
        >
          {isPlaying ? (
            <>
              <Pause className="w-3.5 h-3.5" />
              <span>{t('pause')}</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{t('play')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export function renderHandout(section: Section, key: number): ReactNode {
  const styles = getHandoutStyles(section.handoutType);

  return (
    <div key={key} className={`my-4 font-mono text-sm ${styles.container}`}>
      {styles.header && (
        <div className={styles.headerClass}>{styles.header}</div>
      )}
      <pre className={`whitespace-pre-wrap ${styles.content}`}>
        {section.content}
      </pre>
      {section.audioUrl && (
        <HandoutAudioPlayer audioUrl={section.audioUrl} />
      )}
    </div>
  );
}

export function getHandoutStyles(type?: HandoutType): {
  container: string;
  content: string;
  header?: string;
  headerClass?: string;
} {
  switch (type) {
    case 'newspaper':
      return {
        container: 'bg-amber-900/20 border-2 border-amber-700/50 rounded p-4',
        content: 'text-amber-100',
        header: '📰 WYCINEK PRASOWY',
        headerClass:
          'text-amber-400 text-xs font-bold mb-2 border-b border-amber-700/50 pb-1',
      };

    case 'letter':
      return {
        container:
          'bg-stone-800/40 border border-stone-600/50 rounded-lg p-4 shadow-lg',
        content: 'text-stone-200 italic',
        header: '✉️ LIST',
        headerClass: 'text-stone-400 text-xs font-bold mb-2',
      };

    case 'telegram':
      return {
        container: 'bg-yellow-900/30 border-2 border-yellow-600/60 rounded p-3',
        content: 'text-yellow-100 uppercase tracking-wide',
        header: '📧 TELEGRAM',
        headerClass: 'text-yellow-400 text-xs font-bold mb-2 tracking-widest',
      };

    case 'report':
      return {
        container: 'bg-slate-800/50 border border-slate-600/50 rounded p-4',
        content: 'text-slate-200',
        header: '📋 RAPORT OFICJALNY',
        headerClass:
          'text-slate-400 text-xs font-bold mb-2 uppercase tracking-wide',
      };

    case 'diary':
      // Sepia + italic - analog do handout-generator diary HTML (Brush Script MT + sepia gradient + plama atramentu).
      // Tailwind w narrative renderer: ciemniejsza sepia niż newspaper (amber-950) + brązowa ramka.
      return {
        container:
          'bg-amber-950/30 border border-amber-800/60 rounded-lg p-4 shadow-inner',
        content: 'text-amber-100 italic',
        header: '📓 DZIENNIK',
        headerClass: 'text-amber-600 text-xs font-bold mb-2 tracking-wide',
      };

    case 'book':
      return {
        container:
          'bg-purple-900/30 border border-purple-700/50 rounded-lg p-4',
        content: 'text-purple-200 italic',
        header: '📜 FRAGMENT KSIĘGI',
        headerClass: 'text-purple-400 text-xs font-bold mb-2',
      };

    default:
      return {
        container: 'bg-muted/50 border border-border rounded p-3',
        content: 'text-muted-foreground',
      };
  }
}
