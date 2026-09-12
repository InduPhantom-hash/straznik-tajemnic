'use client';

/**
 * BottomLinks - drugorzędne akcje pod onboardingiem (Dark Art Déco, makieta karta 02).
 * Rząd ghost-buttonów Cinzel: zapis, klucze API i desktopowy zimny start.
 *
 * Tylko re-skin - handlery i warunkowość bez zmian.
 */

import { FC, useState } from 'react';
import { Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';

const GHOST_BTN =
  'flex-1 font-display font-semibold uppercase tracking-[0.14em] text-[10px] py-2 px-3 text-muted-foreground/60 bg-transparent border border-brass/20 hover:border-brass/60 hover:text-brass transition-colors cursor-pointer';

interface BottomLinksProps {
  onLoadSave?: () => void;
  onOpenApiKeys?: () => void;
  onOpenRulebook?: () => void;
  onOpenHelp?: () => void;
  onOpenBetaStatus?: () => void;
  onOpenBetaFeedback?: () => void;
  onColdStart?: () => void;
}

export const BottomLinks: FC<BottomLinksProps> = ({
  onLoadSave,
  onOpenApiKeys,
  onOpenRulebook,
  onOpenHelp,
  onOpenBetaStatus,
  onOpenBetaFeedback,
  onColdStart,
}) => {
  const t = useTranslations('BottomLinks');
  const [isOpen, setIsOpen] = useState(false);

  if (!onLoadSave && !onOpenApiKeys && !onOpenRulebook && !onOpenHelp && !onOpenBetaStatus && !onOpenBetaFeedback && !onColdStart) return null;

  return (
    <div className="flex flex-col items-center gap-3 z-20 mt-4">
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-muted-foreground/40 hover:text-brass/80 transition-colors rounded-full hover:bg-brass/10 cursor-pointer"
        title={t('advancedOptions')}
      >
        <Settings className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="flex flex-wrap justify-center gap-2 w-[min(640px,90vw)] animate-in fade-in-50 slide-in-from-top-2 duration-200">
          {onLoadSave && (
            <button type="button" onClick={onLoadSave} className={GHOST_BTN}>
              {t('loadSave')}
            </button>
          )}
          {onOpenApiKeys && (
            <button type="button" onClick={onOpenApiKeys} className={GHOST_BTN}>
              {t('apiKeys')}
            </button>
          )}
          {onOpenRulebook && (
            <button type="button" onClick={onOpenRulebook} className={GHOST_BTN}>
              {t('rulebook')}
            </button>
          )}
          {onOpenHelp && (
            <button type="button" onClick={onOpenHelp} className={GHOST_BTN}>
              {t('compendium')}
            </button>
          )}
          {onOpenBetaStatus && (
            <button type="button" onClick={onOpenBetaStatus} className={GHOST_BTN}>
              {t('betaStatus')}
            </button>
          )}
          {onOpenBetaFeedback && (
            <button type="button" onClick={onOpenBetaFeedback} className={GHOST_BTN}>
              {t('betaFeedback')}
            </button>
          )}
          {onColdStart && (
            <button type="button" onClick={onColdStart} className={GHOST_BTN}>
              {t('coldStart')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
