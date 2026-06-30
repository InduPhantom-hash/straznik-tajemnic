'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Pause, Play, SkipForward, Volume2, VolumeX, X } from 'lucide-react';
import { CutsceneState } from '@/lib/types';

interface CutscenePlayerProps {
  cutscene: CutsceneState;
  onSegmentComplete: () => void;
  onSkip: () => void;
  onPause: () => void;
  onResume: () => void;
  onMute: () => void;
  onClose: () => void;
}

/**
 * CutscenePlayer - Wyświetla automatyczną narrację w stylu cutscenki
 *
 * Features:
 * - Efekt typewriter dla tekstu
 * - Automatyczne przejście do kolejnego segmentu
 * - Synchronizacja z TTS (jeśli dostępne)
 * - Kontrolki: Pauza, Pomiń, Wycisz
 * - Wskaźnik postępu
 */
export function CutscenePlayer({
  cutscene,
  onSegmentComplete,
  onSkip,
  onPause,
  onResume,
  onMute,
  onClose,
}: CutscenePlayerProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const typewriterAudioRef = useRef<HTMLAudioElement | null>(null);

  const currentSegment = cutscene.segments[cutscene.currentIndex];

  // Inicjalizacja dźwięku maszyny do pisania
  useEffect(() => {
    if (typeof window !== 'undefined') {
      typewriterAudioRef.current = new Audio('/sounds/typewriter.mp3');
      typewriterAudioRef.current.loop = true;
      typewriterAudioRef.current.volume = 0.3; // Subtelny dźwięk w tle
    }
    return () => {
      if (typewriterAudioRef.current) {
        typewriterAudioRef.current.pause();
        typewriterAudioRef.current = null;
      }
    };
  }, []);

  // Kontrola dźwięku typewriter przy zmianie stanu pisania/pauzy/mute
  useEffect(() => {
    if (!typewriterAudioRef.current) return;

    if (isTyping && !cutscene.isPaused && !cutscene.isMuted) {
      typewriterAudioRef.current.play().catch(() => {
        // Autoplay może być zablokowany - ignorujemy
      });
    } else {
      typewriterAudioRef.current.pause();
    }
  }, [isTyping, cutscene.isPaused, cutscene.isMuted]);

  // Efekt typewriter dla tekstu
  useEffect(() => {
    if (!currentSegment || cutscene.isPaused) {
      return;
    }

    // Reset tekstu przy nowym segmencie
    setDisplayedText('');
    setIsTyping(true);

    let charIndex = 0;
    const text = currentSegment.text;
    const typingSpeed = 25; // ms per character (~40 chars/sec)

    typingIntervalRef.current = setInterval(() => {
      if (charIndex < text.length) {
        setDisplayedText(text.slice(0, charIndex + 1));
        charIndex++;
      } else {
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
        }
        setIsTyping(false);

        // Jeśli nie ma TTS, automatycznie przejdź po 2 sekundach
        if (!currentSegment.voiceUrl) {
          const duration = currentSegment.duration || 2000;
          setTimeout(() => {
            if (!cutscene.isPaused) {
              onSegmentComplete();
            }
          }, duration);
        }
      }
    }, typingSpeed);

    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
    };
  }, [currentSegment, cutscene.isPaused, cutscene.currentIndex]);

  // Audio handling
  const handleAudioEnded = useCallback(() => {
    onSegmentComplete();
  }, [onSegmentComplete]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === ' ' || e.key === 'Space') {
        e.preventDefault();
        cutscene.isPaused ? onResume() : onPause();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        onSegmentComplete();
      } else if (e.key === 'm' || e.key === 'M') {
        onMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    cutscene.isPaused,
    onClose,
    onPause,
    onResume,
    onSegmentComplete,
    onMute,
  ]);

  if (!cutscene.isActive || !currentSegment) {
    return null;
  }

  const progress =
    ((cutscene.currentIndex + 1) / cutscene.segments.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#0a0c0f]">
      {/* Tło déco: sunburst + radialna poświata + mgła emerald + winieta */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(70% 60% at 50% 50%, #15120c 0%, #0a0c0f 60%, #060708 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 animate-cutscene-spin"
        style={{
          background:
            'repeating-conic-gradient(from 0deg at 50% 50%, rgba(201,162,39,.04) 0deg 1.2deg, transparent 1.2deg 5deg)',
        }}
      />
      <div
        className="pointer-events-none absolute left-[-10%] right-[-10%] top-[30%] h-[50%]"
        style={{
          background:
            'radial-gradient(60% 100% at 50% 50%, rgba(13,148,136,.08), transparent 70%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ boxShadow: 'inset 0 0 240px 80px rgba(0,0,0,.85)' }}
      />
      {/* Narożniki déco pełnego ekranu */}
      <span className="pointer-events-none absolute top-5 left-5 w-12 h-12 border-t-2 border-l-2 border-brass/50" />
      <span className="pointer-events-none absolute top-5 right-5 w-12 h-12 border-t-2 border-r-2 border-brass/50" />
      <span className="pointer-events-none absolute bottom-5 left-5 w-12 h-12 border-b-2 border-l-2 border-brass/50" />
      <span className="pointer-events-none absolute bottom-5 right-5 w-12 h-12 border-b-2 border-r-2 border-brass/50" />

      {/* Header */}
      <div className="relative z-10 p-4 flex items-center justify-between border-b border-brass/20">
        <div className="flex items-center gap-3">
          <span className="text-primary font-display uppercase tracking-[0.24em] text-xs font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            CUTSCENA
          </span>
          <span className="text-muted-foreground text-sm font-special-elite tracking-[0.12em]">
            {cutscene.currentIndex + 1} / {cutscene.segments.length}
          </span>
        </div>

        {/* Controls - déco złoty outline */}
        <div className="flex items-center gap-2">
          <button
            onClick={cutscene.isPaused ? onResume : onPause}
            className="p-2 border border-brass/35 bg-brass/[0.04] text-brass hover:bg-brass/10 hover:border-brass/60 transition-colors"
            title={cutscene.isPaused ? 'Wznów (Spacja)' : 'Pauza (Spacja)'}
          >
            {cutscene.isPaused ? <Play size={18} /> : <Pause size={18} />}
          </button>

          <button
            onClick={onMute}
            className="p-2 border border-brass/35 bg-brass/[0.04] text-brass hover:bg-brass/10 hover:border-brass/60 transition-colors"
            title="Wycisz (M)"
          >
            {cutscene.isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          <button
            onClick={onSegmentComplete}
            className="p-2 border border-brass/35 bg-brass/[0.04] text-brass hover:bg-brass/10 hover:border-brass/60 transition-colors"
            title="Następny segment (→)"
          >
            <SkipForward size={18} />
          </button>

          <div className="w-px h-6 bg-brass/30 mx-1" />

          <button
            onClick={onClose}
            className="p-2 border border-brass/45 bg-brass/[0.04] text-brass hover:bg-destructive/40 hover:border-destructive/60 hover:text-foreground transition-colors"
            title="Pomiń cutscenę (Esc)"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-8 overflow-hidden text-center">
        {/* Image w ramce déco */}
        {currentSegment.imageUrl && (
          <div className="relative mb-8 max-w-2xl animate-fade-in border border-brass/50 bg-gradient-to-br from-[#16130f] to-[#0a0c0f] shadow-[0_0_40px_rgba(0,0,0,0.6)]">
            <span className="pointer-events-none absolute top-2 left-2 z-10 w-5 h-5 border-t-2 border-l-2 border-brass" />
            <span className="pointer-events-none absolute top-2 right-2 z-10 w-5 h-5 border-t-2 border-r-2 border-brass" />
            <span className="pointer-events-none absolute bottom-2 left-2 z-10 w-5 h-5 border-b-2 border-l-2 border-brass" />
            <span className="pointer-events-none absolute bottom-2 right-2 z-10 w-5 h-5 border-b-2 border-r-2 border-brass" />
            <img
              src={currentSegment.imageUrl}
              alt="Scene"
              className="shadow-2xl shadow-black/50 max-h-[40vh] object-contain"
            />
          </div>
        )}

        {/* Separator déco nad tekstem */}
        <div className="flex items-center gap-3 justify-center mb-6">
          <div className="w-[60px] h-px bg-gradient-to-r from-transparent to-gold" />
          <div className="w-[7px] h-[7px] bg-brass rotate-45" />
          <div className="w-[60px] h-px bg-gradient-to-l from-transparent to-gold" />
        </div>

        {/* Text with typewriter effect */}
        <div className="max-w-3xl text-center px-4">
          <p className="text-xl md:text-2xl text-foreground/90 leading-relaxed font-serif italic">
            {displayedText}
            {isTyping && (
              <span className="ml-1 inline-block w-0.5 h-6 bg-primary animate-pulse" />
            )}
          </p>
        </div>

        {/* Paused indicator */}
        {cutscene.isPaused && (
          <div className="mt-6 text-brass text-sm flex items-center gap-2 font-special-elite uppercase tracking-[0.12em]">
            <Pause size={14} />
            PAUZA - naciśnij Spację aby kontynuować
          </div>
        )}
      </div>

      {/* Progress bar - déco shimmer */}
      <div className="relative z-10 h-1.5 bg-[#1f1a14] border-t border-brass/25 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#0a6b62] to-primary shadow-[0_0_12px_rgba(13,148,136,0.5)] transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Keyboard hints */}
      <div className="relative z-10 p-2 text-center text-xs text-muted-foreground border-t border-brass/20 font-special-elite tracking-[0.08em]">
        <span className="mx-2">Spacja: Pauza</span>
        <span className="mx-2">→: Dalej</span>
        <span className="mx-2">M: Wycisz</span>
        <span className="mx-2">Esc: Pomiń</span>
      </div>

      {/* Audio element (hidden) */}
      {currentSegment.voiceUrl && !cutscene.isMuted && (
        <audio
          ref={audioRef}
          src={currentSegment.voiceUrl}
          autoPlay={!cutscene.isPaused}
          onEnded={handleAudioEnded}
        />
      )}

      {/* CSS animations */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
        @keyframes cutscene-spin {
          to {
            transform: rotate(360deg);
          }
        }
        .animate-cutscene-spin {
          animation: cutscene-spin 90s linear infinite;
        }
      `}</style>
    </div>
  );
}
