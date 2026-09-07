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
  const eraLabel = eraContext?.effectiveYear ? String(eraContext.effectiveYear) : undefined;

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
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#070806]/98 backdrop-blur-2xl overflow-y-auto overflow-x-hidden transition-opacity duration-500 ease-out px-4 py-6 md:p-8 select-none ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Tło Dark Art Déco: głęboki radialny mosiężny glow, winieta i delikatne promienie */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(201,169,74,0.14)_0%,rgba(14,16,12,0.88)_50%,rgba(7,8,6,0.99)_100%)] pointer-events-none" />
      <div className="absolute inset-0 shadow-[inset_0_0_160px_rgba(0,0,0,0.96)] pointer-events-none" />
      <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#c9a94a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* Zewnętrzne geometryczne narożniki Art Déco */}
      <div className="absolute top-5 left-5 w-16 h-16 border-t-2 border-l-2 border-brass/50 pointer-events-none hidden sm:block">
        <div className="absolute top-1.5 left-1.5 w-2.5 h-2.5 bg-brass/80 rotate-45" />
      </div>
      <div className="absolute top-5 right-5 w-16 h-16 border-t-2 border-r-2 border-brass/50 pointer-events-none hidden sm:block">
        <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-brass/80 rotate-45" />
      </div>
      <div className="absolute bottom-5 left-5 w-16 h-16 border-b-2 border-l-2 border-brass/50 pointer-events-none hidden sm:block">
        <div className="absolute bottom-1.5 left-1.5 w-2.5 h-2.5 bg-brass/80 rotate-45" />
      </div>
      <div className="absolute bottom-5 right-5 w-16 h-16 border-b-2 border-r-2 border-brass/50 pointer-events-none hidden sm:block">
        <div className="absolute bottom-1.5 right-1.5 w-2.5 h-2.5 bg-brass/80 rotate-45" />
      </div>

      <div className="w-full max-w-5xl text-center space-y-6 md:space-y-8 relative z-10 my-auto">
        {/* Górny badge statusu i geolokalizacja */}
        <div className="space-y-2.5">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-black/70 border border-brass/50 text-xs font-special-elite text-brass tracking-[0.14em] uppercase shadow-[0_0_20px_rgba(201,169,74,0.2)]">
            <Compass className="w-4 h-4 text-brass animate-spin-slow" />
            <span>{t('preparingSession')}</span>
          </div>

          {(location || eraLabel) && (
            <div className="flex items-center justify-center gap-3 text-xs md:text-sm font-mono text-foreground/80 tracking-wider">
              {location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-gold" />
                  <span className="text-foreground">{location}</span>
                </span>
              )}
              {location && eraLabel && <span className="text-brass/50 font-bold">·</span>}
              {eraLabel && (
                <span className="px-2 py-0.5 rounded bg-brass/10 border border-brass/30 text-brass font-bold">
                  {eraLabel}
                </span>
              )}
            </div>
          )}
        </div>

        {/* 2-kolumnowy panel główny: Lewa = Akta Śledztwa, Prawa = Wycinek prasowy epoki */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6 text-left">
          {/* Lewa kolumna: Dossier Przygody (7 kolumn) */}
          <div className="lg:col-span-7 border border-brass/45 bg-card/90 rounded-lg p-6 md:p-8 shadow-[0_0_40px_rgba(0,0,0,0.9)] relative overflow-hidden backdrop-blur-lg flex flex-col justify-between">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-brass to-transparent" />

            <div>
              <div className="flex items-center justify-between border-b border-brass/25 pb-3 mb-4">
                <span className="inline-flex items-center gap-2.5 text-xs font-mono uppercase tracking-widest text-brass font-bold">
                  <Scroll className="w-4 h-4 text-gold" />
                  {t('chronicleDossier')}
                </span>
                {eraLabel && (
                  <span className="text-xs font-mono text-muted-foreground">
                    {eraLabel}
                  </span>
                )}
              </div>

              <h3 className="font-display text-xl md:text-3xl font-bold text-foreground tracking-wide mb-4 italic leading-tight">
                „{title}”
              </h3>

              <div className="relative pl-3 border-l-2 border-gold/40 my-2">
                <p className="font-special-elite text-sm md:text-base text-foreground/90 leading-relaxed max-h-56 overflow-y-auto pr-2">
                  {storyHook}
                </p>
              </div>
            </div>

            {themes.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-brass/20">
                <span className="text-xs font-mono text-brass/80 mr-1 uppercase tracking-wider">
                  {t('themesLabel')}
                </span>
                {themes.map((theme, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded text-xs font-special-elite bg-brass/15 border border-brass/40 text-brass shadow-sm"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Prawa kolumna: bezspoilerowy hook wybranej przygody */}
          <div className="lg:col-span-5 border border-brass/35 bg-gradient-to-b from-[#141510]/90 to-[#0c0d09]/95 rounded-lg p-5 md:p-6 shadow-[0_0_35px_rgba(0,0,0,0.85)] relative overflow-hidden backdrop-blur-md flex flex-col justify-between">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-brass/30 via-gold/60 to-brass/30" />

            <div>
              <div className="flex items-center justify-between border-b border-brass/20 pb-2.5 mb-3">
                <span className="text-[11px] font-mono uppercase tracking-widest text-brass/90 font-semibold">
                  {t('hookHeader')}
                </span>
                <span className="w-2 h-2 rounded-full bg-gold/70 animate-pulse" />
              </div>

              <div className="relative pl-3 border-l-2 border-gold/40">
                <p className="font-serif italic text-sm text-muted-foreground leading-relaxed">
                  {storyHook}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-brass/20 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
              <span>{t('spoilerFree')}</span>
              <span className="text-brass/60">{t('confidential')}</span>
            </div>
          </div>
        </div>

        {/* Pasek Postępu Art Déco (0-100%) - powiększony i wyrazisty */}
        <div className="w-full max-w-3xl mx-auto space-y-2.5">
          <div className="w-full h-4 bg-black/90 rounded-full border-2 border-brass/60 overflow-hidden relative shadow-[inset_0_2px_6px_rgba(0,0,0,0.95)] p-[1.5px]">
            <div
              data-testid="loading-screen-progress-bar"
              className="h-full bg-gradient-to-r from-[#997a38] via-[#e5c158] to-[#997a38] rounded-full transition-all duration-500 ease-out relative shadow-[0_0_20px_rgba(201,169,74,0.6)]"
              style={{ width: `${displayProgress}%` }}
            >
              <div className="absolute inset-0 bg-white/25 animate-pulse" />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs md:text-sm font-special-elite text-brass tracking-[0.08em] px-2">
            <span className="flex items-center gap-2.5 truncate text-left">
              {!isCompleted && (
                <span className="inline-block w-2 h-2 rounded-full bg-gold animate-ping shrink-0" />
              )}
              <span className="truncate text-foreground/90">
                {isCompleted ? t('chronicleReady') : startStatus || t('generatingStory')}
              </span>
            </span>
            <span className="font-mono text-gold font-bold ml-2 shrink-0 text-sm">
              {displayProgress}%
            </span>
          </div>
        </div>

        {/* Dolna strefa Hero CTA: Spinner podczas ładowania LUB wielki przycisk wejścia po 100% */}
        <div className="pt-2 flex flex-col items-center justify-center min-h-[84px]">
          {isCompleted ? (
            <div className="flex flex-col items-center gap-2.5 animate-in fade-in zoom-in-95 duration-300">
              <button
                type="button"
                onClick={handleConfirm}
                data-testid="loading-screen-enter-cta"
                className="group relative px-10 py-4 bg-gradient-to-r from-[#997a38] via-[#f0cc66] to-[#997a38] hover:from-[#b38f42] hover:via-[#ffde7a] hover:to-[#b38f42] text-background font-display font-bold text-base md:text-lg uppercase tracking-[0.22em] rounded-md border-2 border-gold shadow-[0_0_35px_rgba(201,169,74,0.55)] hover:shadow-[0_0_55px_rgba(201,169,74,0.9)] hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-3 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-background text-background transition-transform group-hover:scale-125" />
                <span>{t('enterAdventure')}</span>
                <Sparkles className="w-5 h-5 text-background animate-pulse" />
              </button>
              <p className="text-xs font-special-elite text-gold/90 tracking-widest uppercase animate-pulse">
                {t('awaitingAccept')}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 text-muted-foreground text-xs md:text-sm font-special-elite tracking-wider">
              <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin text-gold" />
              <span>{t('bufferingNarrator')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
