'use client';

/**
 * BottomLinks - drugorzędne akcje pod onboardingiem (Dark Art Déco, makieta karta 02).
 * Rząd ghost-buttonów Cinzel: "Wczytaj zapis" (onLoadSave) + "Klucze API" (onOpenApiKeys).
 *
 * Tylko re-skin - handlery i warunkowość bez zmian.
 */

import type { FC } from 'react';

const GHOST_BTN =
  'flex-1 font-display font-semibold uppercase tracking-[0.14em] text-xs py-3 px-4 text-muted-foreground bg-transparent border border-brass/30 hover:border-brass/60 hover:text-brass transition-colors cursor-pointer';

interface BottomLinksProps {
  onLoadSave?: () => void;
  onOpenApiKeys?: () => void;
}

export const BottomLinks: FC<BottomLinksProps> = ({
  onLoadSave,
  onOpenApiKeys,
}) => {
  if (!onLoadSave && !onOpenApiKeys) return null;

  return (
    <div className="flex gap-3 w-[min(340px,90vw)] z-20">
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
    </div>
  );
};
