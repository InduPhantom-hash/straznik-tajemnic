'use client';

/**
 * BottomLinks - drugorzędne akcje pod onboardingiem (Dark Art Déco, makieta karta 02).
 * Rząd ghost-buttonów Cinzel: zapis, klucze API i desktopowy zimny start.
 *
 * Tylko re-skin - handlery i warunkowość bez zmian.
 */

import { FC, useState } from 'react';
import { Settings } from 'lucide-react';

const GHOST_BTN =
  'flex-1 font-display font-semibold uppercase tracking-[0.14em] text-[10px] py-2 px-3 text-muted-foreground/60 bg-transparent border border-brass/20 hover:border-brass/60 hover:text-brass transition-colors cursor-pointer';

interface BottomLinksProps {
  onLoadSave?: () => void;
  onOpenApiKeys?: () => void;
  onOpenRulebook?: () => void;
  onColdStart?: () => void;
}

export const BottomLinks: FC<BottomLinksProps> = ({
  onLoadSave,
  onOpenApiKeys,
  onOpenRulebook,
  onColdStart,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!onLoadSave && !onOpenApiKeys && !onOpenRulebook && !onColdStart) return null;

  return (
    <div className="flex flex-col items-center gap-3 z-20 mt-4">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-muted-foreground/40 hover:text-brass/80 transition-colors rounded-full hover:bg-brass/10"
        title="Opcje zaawansowane"
      >
        <Settings className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="flex flex-wrap justify-center gap-2 w-[min(550px,90vw)] animate-in fade-in-50 slide-in-from-top-2 duration-200">
          {onLoadSave && (
            <button onClick={onLoadSave} className={GHOST_BTN}>
              Wczytaj zapis
            </button>
          )}
          {onOpenApiKeys && (
            <button onClick={onOpenApiKeys} className={GHOST_BTN}>
              Klucze API
            </button>
          )}
          {onOpenRulebook && (
            <button onClick={onOpenRulebook} className={GHOST_BTN}>
              Podręcznik zasad
            </button>
          )}
          {onColdStart && (
            <button onClick={onColdStart} className={GHOST_BTN}>
              Zimny start
            </button>
          )}
        </div>
      )}
    </div>
  );
};
