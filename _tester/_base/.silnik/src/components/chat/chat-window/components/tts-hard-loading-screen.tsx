'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Play, Scroll, MapPin, Sparkles, Compass } from 'lucide-react';
import type { AdventureContext } from '@/lib/types';
import type { ResolvedEraContext } from '@/lib/era';

export interface TTSHardLoadingScreenProps {
  isBuffering?: boolean;
  isStarting?: boolean;
  isReadyToEnter?: boolean;
  startProgress?: number;
  startStatus?: string;
  onConfirmEnterGame?: () => void;
  adventureTitle?: string;
  adventureDescription?: string;
  region?: string;
  eraContext?: ResolvedEraContext | null;
  adventureContext?: AdventureContext | null;
}

export const TTSHardLoadingScreen: React.FC<TTSHardLoadingScreenProps> = ({
  isBuffering = false,
  isStarting = false,
  isReadyToEnter = false,
  startProgress = 0,
  startStatus = '',
  onConfirmEnterGame,
  adventureTitle,
  adventureDescription,
  region,
  eraContext,
  adventureContext,
}) => {
  const t = useTranslations('TtsHardLoadingScreen');

  const isActive = isStarting || isBuffering || isReadyToEnter;
  const [shouldRender, setShouldRender] = useState(isActive);
  const [isVisible, setIsVisible] = useState(isActive);

  // Autostart muzyki YouTube w tle przy pojawieniu się ekranu (Issue #157)
  useEffect(() => {
    if (isVisible && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('zew:start-music'));
    }
  }, [isVisible]);

  // Płynna animacja wejścia i wyjścia kurtyny
  useEffect(() => {
    if (isActive) {
      setShouldRender(true);
      const animTimer = setTimeout(() => setIsVisible(true), 20);
      return () => clearTimeout(animTimer);
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setShouldRender(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  // Dynamiczne dane przygody
  const title = adventureTitle || adventureContext?.title || t('chronicleDossier');
  const location = region || adventureContext?.location || adventureContext?.country;
  const eraLabel =
    adventureContext?.eraLabel ||
    adventureContext?.yearRange ||
    (eraContext?.effectiveYear ? String(eraContext.effectiveYear) : undefined);

  // Wprowadzenie fabularne: hook > description > default
  const storyHook = useMemo(() => {
    if (adventureContext?.hook) return adventureContext.hook;
    if (adventureContext?.description) return adventureContext.description;
    if (adventureDescription) return adventureDescription;
    return t('defaultChronicleIntro');
  }, [adventureContext?.hook, adventureContext?.description, adventureDescription, t]);

  const themes = useMemo(() => {
    return adventureContext?.themes || [];
  }, [adventureContext?.themes]);

  const handleConfirm = () => {
    if (onConfirmEnterGame) {
      onConfirmEnterGame();
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('zew:confirm-enter-game'));
    }
  };

  if (!shouldRender) return null;

  const isCompleted = isReadyToEnter || startProgress >= 100;
  const displayProgress = Math.min(100, Math.max(startProgress, 5));

  return (
    <div
      data-testid="tts-hard-loading-screen"
      className={`absolute inset-0 z-[100] flex flex-col items-center justify-center bg-[#0a0b08]/98 backdrop-blur-xl overflow-hidden transition-opacity duration-500 ease-out px-4 select-none ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Tło Dark Art Déco: radialny mosiężny glow i winieta */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(201,169,74,0.12)_0%,rgba(14,15,11,0.85)_55%,rgba(10,11,8,0.98)_100%)] pointer-events-none" />
      <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.95)] pointer-events-none" />

      {/* Geometryczne narożniki Art Déco */}
      <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-brass/60 pointer-events-none">
        <div className="absolute top-1 left-1 w-2 h-2 bg-brass/80 rotate-45" />
      </div>
      <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-brass/60 pointer-events-none">
        <div className="absolute top-1 right-1 w-2 h-2 bg-brass/80 rotate-45" />
      </div>
      <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-brass/60 pointer-events-none">
        <div className="absolute bottom-1 left-1 w-2 h-2 bg-brass/80 rotate-45" />
      </div>
      <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-brass/60 pointer-events-none">
        <div className="absolute bottom-1 right-1 w-2 h-2 bg-brass/80 rotate-45" />
      </div>

      <div className="w-full max-w-xl text-center space-y-6 relative z-10">
        {/* Górny nagłówek i status */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-black/60 border border-brass/40 text-[11px] font-special-elite text-brass/90 tracking-widest uppercase shadow-[0_0_15px_rgba(201,169,74,0.15)]">
            <Compass className="w-3.5 h-3.5 text-brass animate-spin-slow" />
            <span>{t('preparingSession')}</span>
          </div>

          {(location || eraLabel) && (
            <div className="flex items-center justify-center gap-2 text-xs font-mono text-zinc-400 tracking-wider">
              {location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-brass/80" />
                  <span>{location}</span>
                </span>
              )}
              {location && eraLabel && <span className="text-brass/40">·</span>}
              {eraLabel && <span className="text-brass/90">{eraLabel}</span>}
            </div>
          )}
        </div>

        {/* Dynamiczna Karta Kroniki Śledztwa */}
        <div className="text-left border border-brass/40 bg-zinc-950/85 rounded-lg p-5 md:p-6 shadow-[0_0_35px_rgba(0,0,0,0.85)] relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-brass/70 to-transparent" />

          <div className="flex items-center justify-between border-b border-brass/25 pb-2.5 mb-3">
            <span className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-brass font-bold">
              <Scroll className="w-3.5 h-3.5 text-brass" />
              {t('chronicleDossier')}
            </span>
            {eraLabel && (
              <span className="text-[11px] font-mono text-zinc-400">
                {eraLabel}
              </span>
            )}
          </div>

          <h3 className="font-display text-base md:text-xl font-bold text-zinc-100 tracking-wide mb-2 italic">
            „{title}”
          </h3>

          <p className="font-special-elite text-xs md:text-sm text-zinc-300 leading-relaxed max-h-36 overflow-y-auto pr-1">
            {storyHook}
          </p>

          {themes.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-3.5 pt-2.5 border-t border-brass/20">
              <span className="text-[10px] font-mono text-brass/70 mr-1 uppercase">
                {t('themesLabel')}
              </span>
              {themes.map((theme, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded text-[10px] font-special-elite bg-brass/10 border border-brass/30 text-brass/90"
                >
                  {theme}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Pasek Postępu Art Déco (0-100%) */}
        <div className="w-full space-y-2">
          <div className="w-full h-3 bg-black/80 rounded-full border border-brass/40 overflow-hidden relative shadow-[inset_0_1px_4px_rgba(0,0,0,0.9)] p-[1px]">
            <div
              data-testid="loading-screen-progress-bar"
              className="h-full bg-gradient-to-r from-[#997a38] via-[#e5c158] to-[#997a38] rounded-full transition-all duration-500 ease-out relative shadow-[0_0_15px_rgba(201,169,74,0.5)]"
              style={{ width: `${displayProgress}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-special-elite text-brass/90 tracking-[0.08em] px-1">
            <span className="flex items-center gap-2 truncate text-left">
              {!isCompleted && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-brass animate-ping shrink-0" />
              )}
              <span className="truncate">
                {isCompleted ? t('chronicleReady') : startStatus || t('generatingStory')}
              </span>
            </span>
            <span className="font-mono text-brass ml-2 shrink-0">{displayProgress}%</span>
          </div>
        </div>

        {/* Dolna strefa: Spinner podczas ładowania LUB przycisk CTA po 100% */}
        <div className="pt-2 flex flex-col items-center justify-center min-h-[72px]">
          {isCompleted ? (
            <div className="flex flex-col items-center gap-2 animate-in fade-in zoom-in-95 duration-300">
              <button
                type="button"
                onClick={handleConfirm}
                data-testid="loading-screen-enter-cta"
                className="group relative px-8 py-3.5 bg-gradient-to-r from-[#997a38] via-[#e5c158] to-[#997a38] hover:from-[#b38f42] hover:via-[#f3cf65] hover:to-[#b38f42] text-zinc-950 font-display font-bold text-sm md:text-base uppercase tracking-[0.2em] rounded border-2 border-brass shadow-[0_0_25px_rgba(201,169,74,0.45)] hover:shadow-[0_0_45px_rgba(201,169,74,0.8)] hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-zinc-950 text-zinc-950 transition-transform group-hover:scale-110" />
                <span>{t('enterAdventure')}</span>
                <Sparkles className="w-4 h-4 text-zinc-950 animate-pulse" />
              </button>
              <p className="text-[11px] font-special-elite text-brass/75 tracking-wider animate-pulse">
                {t('awaitingAccept')}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-zinc-500 text-xs font-special-elite tracking-wider">
              <Loader2 className="w-4 h-4 animate-spin text-brass/80" />
              <span>{t('bufferingNarrator')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
