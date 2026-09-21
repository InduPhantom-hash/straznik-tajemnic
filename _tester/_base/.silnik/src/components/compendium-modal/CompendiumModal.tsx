'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { BookOpen, Compass, Scroll, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { AppGuideTab } from './tabs/AppGuideTab';
import { RoleplayGuideTab } from './tabs/RoleplayGuideTab';
import { LovecraftLoreTab } from './tabs/LovecraftLoreTab';

export type CompendiumTab = 'APP_GUIDE' | 'ROLEPLAY_GUIDE' | 'LORE_ENCYCLOPEDIA';

export interface CompendiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: CompendiumTab;
}

export function CompendiumModal({
  isOpen,
  onClose,
  initialTab = 'APP_GUIDE',
}: CompendiumModalProps) {
  const t = useTranslations('CompendiumModal');
  const [activeTab, setActiveTab] = useState<CompendiumTab>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        size="wide"
        className="deco-corners bg-card/95 border-2 border-brass/50 shadow-2xl p-0 overflow-hidden flex flex-col h-[82vh] 2xl:h-[86vh] max-h-[88vh]"
      >
        {/* Nagłówek Dark Art Déco */}
        <header className="relative flex items-center justify-between px-6 py-4 border-b border-brass/30 bg-background/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-md bg-brass/15 border border-brass/40 text-brass text-lg">
              📜
            </span>
            <div>
              <DialogTitle className="text-lg font-serif font-bold text-brass tracking-wider uppercase">
                {t('title')}
              </DialogTitle>
              <p className="text-xs font-courier-prime text-muted-foreground">
                {t('subtitle')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-md border border-border bg-input/40 text-muted-foreground hover:text-brass hover:border-brass/40 transition-colors"
            title={t('closeTitle')}
            aria-label={t('closeTitle')}
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Zakładki Główne Kompendium */}
        <nav
          aria-label={t('navigationAria')}
          className="flex border-b border-border bg-input/30 px-6 pt-2 gap-2 overflow-x-auto"
        >
          <button
            type="button"
            onClick={() => setActiveTab('APP_GUIDE')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-serif font-bold tracking-wide border-b-2 transition-all whitespace-nowrap rounded-t-sm ${
              activeTab === 'APP_GUIDE'
                ? 'border-brass text-brass bg-brass/10 shadow-[inset_0_-2px_0_theme(colors.brass)]'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-brass/5'
            }`}
          >
            <Compass className="w-4 h-4 text-brass" />
            {t('tabAppGuide')}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ROLEPLAY_GUIDE')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-serif font-bold tracking-wide border-b-2 transition-all whitespace-nowrap rounded-t-sm ${
              activeTab === 'ROLEPLAY_GUIDE'
                ? 'border-brass text-brass bg-brass/10 shadow-[inset_0_-2px_0_theme(colors.brass)]'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-brass/5'
            }`}
          >
            <BookOpen className="w-4 h-4 text-brass" />
            {t('tabRoleplayGuide')}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('LORE_ENCYCLOPEDIA')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-serif font-bold tracking-wide border-b-2 transition-all whitespace-nowrap rounded-t-sm ${
              activeTab === 'LORE_ENCYCLOPEDIA'
                ? 'border-brass text-brass bg-brass/10 shadow-[inset_0_-2px_0_theme(colors.brass)]'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-brass/5'
            }`}
          >
            <Scroll className="w-4 h-4 text-brass" />
            {t('tabLoreEncyclopedia')}
          </button>
        </nav>

        {/* Zawartość Zakładki */}
        <main className="flex-1 overflow-y-auto p-6 bg-background/90 text-foreground">
          {activeTab === 'APP_GUIDE' && <AppGuideTab />}
          {activeTab === 'ROLEPLAY_GUIDE' && <RoleplayGuideTab />}
          {activeTab === 'LORE_ENCYCLOPEDIA' && <LovecraftLoreTab />}
        </main>

        {/* Stopka statusowa Dark Art Déco */}
        <footer className="flex items-center justify-between px-6 py-2 border-t border-border bg-card/90 text-[11px] font-courier-prime text-muted-foreground">
          <span>{t('footerNotice')}</span>
          <span className="text-brass font-bold">Miskatonic Archives • 1920s</span>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
