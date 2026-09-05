'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Newspaper } from 'lucide-react';

interface TTSHardLoadingScreenProps {
  isBuffering: boolean;
  adventureTitle?: string;
  region?: string;
}

export const TTSHardLoadingScreen: React.FC<TTSHardLoadingScreenProps> = ({
  isBuffering,
  adventureTitle,
  region,
}) => {
  const t = useTranslations('TtsHardLoadingScreen');
  const [shouldRender, setShouldRender] = useState(isBuffering);
  const [isVisible, setIsVisible] = useState(isBuffering);

  // Wylosuj jeden z wycinków kroniki epoki raz na czas trwania buforowania
  const clippingIndex = useMemo(() => Math.floor(Math.random() * 3) + 1, []);

  const clipping = useMemo(() => {
    if (clippingIndex === 2) {
      return {
        source: t('clip2Source'),
        headline: t('clip2Headline'),
        text: t('clip2Text'),
      };
    }
    if (clippingIndex === 3) {
      return {
        source: t('clip3Source'),
        headline: t('clip3Headline'),
        text: t('clip3Text'),
      };
    }
    return {
      source: t('clip1Source'),
      headline: t('clip1Headline'),
      text: t('clip1Text'),
    };
  }, [clippingIndex, t]);

  // Płynna animacja wejścia i wyjścia kurtyny (fade-out przy starcie narracji)
  useEffect(() => {
    if (isBuffering) {
      setShouldRender(true);
      const animTimer = setTimeout(() => setIsVisible(true), 20);
      return () => clearTimeout(animTimer);
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setShouldRender(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isBuffering]);

  if (!shouldRender) return null;

  return (
    <div
      className={`absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md overflow-hidden transition-opacity duration-500 ease-out px-4 ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Szmaragdowy glow w tle */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[50vw] h-[50vw] bg-emerald-950/25 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="w-full max-w-xl text-center space-y-6 relative z-10">
        {/* Spinner i wskaźnik oczekiwania */}
        <div className="relative w-14 h-14 mx-auto">
          <Loader2 className="w-14 h-14 animate-spin text-emerald-400 absolute inset-0 drop-shadow-[0_0_12px_rgba(52,211,153,0.4)]" />
          <div className="absolute inset-0 border-2 border-emerald-900/40 rounded-full" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl md:text-2xl font-serif text-emerald-400 tracking-widest uppercase drop-shadow-md">
            {t('preparingSession')}
          </h2>
          {(adventureTitle || region) && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/50 border border-emerald-800/40 text-xs font-mono text-emerald-300/90 tracking-wide">
              <span>📍</span>
              <span>{region ? `${region} · ` : ''}{adventureTitle || ''}</span>
            </div>
          )}
        </div>

        {/* Karta wycinka z kroniki epoki (wątek poboczny) */}
        <div className="text-left border border-emerald-900/40 bg-zinc-950/80 rounded-lg p-5 md:p-6 shadow-2xl relative overflow-hidden backdrop-blur-sm">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-600/40 to-transparent" />
          <div className="flex items-center justify-between border-b border-emerald-900/30 pb-2 mb-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-emerald-400/90">
              <Newspaper className="w-3.5 h-3.5 text-emerald-500" />
              {t('dispatchHeader')}
            </span>
            <span className="text-xs font-mono text-zinc-400">
              {clipping.source}
            </span>
          </div>

          <h3 className="font-serif text-base md:text-lg font-bold text-zinc-100 tracking-wide mb-2 italic">
            „{clipping.headline}”
          </h3>
          <p className="font-serif text-xs md:text-sm text-zinc-400 leading-relaxed">
            {clipping.text}
          </p>
        </div>

        <p className="text-zinc-500 text-xs tracking-wider animate-pulse">
          {t('bufferingNarrator')}
        </p>
      </div>
    </div>
  );
};
