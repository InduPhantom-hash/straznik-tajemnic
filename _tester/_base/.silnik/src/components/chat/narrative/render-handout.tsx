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
import { Volume2, Play, Pause, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { AudioReelPlayer } from '@/components/ui/audio-reel-player';
import { DocumentViewer } from '@/components/ui/document-viewer';

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
    <div className="mt-3 pt-2.5 border-t border-brass/20 flex items-center justify-between gap-3 bg-input/40 px-3 py-2 rounded border border-brass/30">
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

function HandoutCard({ section }: { section: Section }) {
  const t = useTranslations('NarrativeFormatter');
  const styles = getHandoutStyles(section.handoutType);
  const [isExpanded, setIsExpanded] = useState(!section.stickyNote);

  return (
    <div className={`my-4 font-mono text-sm ${styles.container}`}>
      {section.stickyNote && (
        <div className="mb-3 p-3.5 rounded bg-[#201811] border border-brass/50 shadow-md font-sans text-xs">
          <div className="flex items-center justify-between gap-2 mb-2.5 pb-1.5 border-b border-brass/30">
            <div className="flex items-center gap-1.5 text-gold font-display font-bold text-xs uppercase tracking-wider">
              <span aria-hidden="true" className="select-none">📌</span>
              <span>{t('stickyNoteTitle')}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-1 text-[11px] font-special-elite text-brass hover:text-gold transition-colors py-0.5 px-2 rounded bg-brass/10 hover:bg-brass/20 border border-brass/30 cursor-pointer select-none active:scale-95"
            >
              <span>{isExpanded ? t('collapseDocument') : t('expandDocument')}</span>
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
          <div className="space-y-1.5 font-serif">
            {section.stickyNote.who && (
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 text-[#d8cfc0]">
                <span className="font-semibold text-brass/90 min-w-[90px] shrink-0 font-sans text-[11px] uppercase tracking-wide">
                  {t('stickyNoteWho')}
                </span>
                <span className="font-medium text-[#f3ede2]">{section.stickyNote.who}</span>
              </div>
            )}
            {section.stickyNote.about && (
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 text-[#d8cfc0]">
                <span className="font-semibold text-brass/90 min-w-[90px] shrink-0 font-sans text-[11px] uppercase tracking-wide">
                  {t('stickyNoteAbout')}
                </span>
                <span>{section.stickyNote.about}</span>
              </div>
            )}
            {section.stickyNote.clue && (
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1">
                <span className="font-semibold text-amber-400 min-w-[90px] shrink-0 font-sans text-[11px] uppercase tracking-wide">
                  {t('stickyNoteClue')}
                </span>
                <span className="text-amber-200 font-semibold">{section.stickyNote.clue}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {isExpanded && (
        <>
          {styles.header && (
            <div className={styles.headerClass}>{styles.header}</div>
          )}
          <pre className={`whitespace-pre-wrap ${styles.content}`}>
            {section.content}
          </pre>
          {section.imageUrl && (
            <div className="mt-3">
              <DocumentViewer
                imageUrl={section.imageUrl}
                title={styles.header || 'Rekwizyt'}
                docTypeLabel={section.handoutType}
              />
            </div>
          )}
          {section.audioUrl && (
            <div className="mt-3">
              <AudioReelPlayer
                audioUrl={section.audioUrl}
                transcript={section.content}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function renderHandout(section: Section, key: number): ReactNode {
  return <HandoutCard key={key} section={section} />;
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
        container: 'bg-card/90 border border-brass/40 rounded p-4 shadow-md',
        content: 'text-foreground font-serif',
        header: '📰 WYCINEK PRASOWY',
        headerClass:
          'text-gold text-xs font-bold mb-2 border-b border-brass/30 pb-1 font-display tracking-wider',
      };

    case 'letter':
      return {
        container:
          'bg-card/95 border border-brass/30 rounded p-4 shadow-lg',
        content: 'text-foreground italic font-serif',
        header: '✉️ LIST',
        headerClass: 'text-brass text-xs font-bold mb-2 font-display',
      };

    case 'telegram':
      return {
        container: 'bg-secondary/40 border-2 border-brass/50 rounded p-3',
        content: 'text-foreground uppercase tracking-wide font-mono',
        header: '📧 TELEGRAM',
        headerClass: 'text-gold text-xs font-bold mb-2 tracking-widest font-mono',
      };

    case 'report':
      return {
        container: 'bg-secondary/50 border border-border rounded p-4',
        content: 'text-foreground font-mono',
        header: '📋 RAPORT OFICJALNY',
        headerClass:
          'text-brass text-xs font-bold mb-2 uppercase tracking-wide font-display',
      };

    case 'diary':
      // Sepia + italic - analog do handout-generator diary HTML (Brush Script MT + sepia gradient + plama atramentu).
      // Dark Art Déco: karta akt z mosiężną ramką i złotym nagłówkiem.
      return {
        container:
          'bg-card/95 border border-brass/40 rounded p-4 shadow-inner',
        content: 'text-foreground italic font-serif',
        header: '📓 DZIENNIK',
        headerClass: 'text-gold text-xs font-bold mb-2 tracking-wide font-display',
      };

    case 'book':
      return {
        container:
          'bg-card/95 border border-primary/40 rounded p-4',
        content: 'text-foreground italic font-serif',
        header: '📜 FRAGMENT KSIĘGI',
        headerClass: 'text-primary text-xs font-bold mb-2 font-display',
      };

    default:
      return {
        container: 'bg-muted/50 border border-border rounded p-3',
        content: 'text-muted-foreground',
      };
  }
}
