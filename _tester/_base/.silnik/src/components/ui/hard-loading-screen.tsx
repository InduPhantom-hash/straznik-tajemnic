'use client';

import type { FC } from 'react';
import { useTranslations } from 'next-intl';

interface HardLoadingScreenProps {
  isVisible: boolean;
}

export const HardLoadingScreen: FC<HardLoadingScreenProps> = ({ isVisible }) => {
  const t = useTranslations('HardLoadingScreen');
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background pointer-events-auto">
      {/* Warstwy tła by utrzymać klimat */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(80% 60% at 50% 38%, #1c1812 0%, #0c0d0a 55%, #060708 100%)',
          }}
        />
        <div className="absolute inset-0 deco-sunburst-bottom" />
        <div className="deco-mist" />
        <div
          className="absolute inset-0"
          style={{ boxShadow: 'inset 0 0 220px 70px rgba(0,0,0,0.85)' }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* świeca CSS z WelcomeScreen */}
        <div className="mb-8 animate-candle-flicker">
          <div className="deco-candle" />
        </div>

        <h2 
          className="font-display font-bold text-xl md:text-2xl text-foreground uppercase tracking-[0.1em] mb-3 text-center"
          style={{ textShadow: '0 0 20px rgba(201,162,39,0.15)' }}
        >
          {t('title')}
        </h2>
        
        <div className="flex items-center gap-4 w-[min(300px,80vw)] opacity-70">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gold" />
          <span className="w-1.5 h-1.5 bg-brass rotate-45 animate-pulse" />
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gold" />
        </div>
        
        <p className="font-special-elite text-sm text-muted-foreground tracking-[0.06em] mt-6 text-center max-w-sm px-4 animate-pulse">
          {t('description')}
        </p>
      </div>
    </div>
  );
};
