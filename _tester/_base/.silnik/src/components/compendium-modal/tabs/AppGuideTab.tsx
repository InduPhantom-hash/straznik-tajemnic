'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  User,
  Package,
  BookOpen,
  MessageSquare,
  Dices,
  SlidersHorizontal,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Info,
} from 'lucide-react';

type ModuleId = 'character' | 'equipment' | 'journal' | 'chat' | 'dice' | 'sidebar';

export function AppGuideTab() {
  const t = useTranslations('CompendiumModal');
  const [activeModule, setActiveModule] = useState<ModuleId>('character');

  const modules = [
    {
      id: 'character' as const,
      icon: User,
      title: t('app_characterTitle'),
      tagline: t('app_characterTagline'),
    },
    {
      id: 'equipment' as const,
      icon: Package,
      title: t('app_equipmentTitle'),
      tagline: t('app_equipmentTagline'),
    },
    {
      id: 'journal' as const,
      icon: BookOpen,
      title: t('app_journalTitle'),
      tagline: t('app_journalTagline'),
    },
    {
      id: 'chat' as const,
      icon: MessageSquare,
      title: t('app_chatTitle'),
      tagline: t('app_chatTagline'),
    },
    {
      id: 'dice' as const,
      icon: Dices,
      title: t('app_diceTitle'),
      tagline: t('app_diceTagline'),
    },
    {
      id: 'sidebar' as const,
      icon: SlidersHorizontal,
      title: t('app_sidebarTitle'),
      tagline: t('app_sidebarTagline'),
    },
  ];

  const getModuleDetails = (id: ModuleId) => {
    switch (id) {
      case 'character':
        return {
          fullTitle: t('app_characterFullTitle'),
          purpose: t('app_characterPurpose'),
          step1Title: t('app_characterStep1Title'),
          step1Desc: t('app_characterStep1Desc'),
          step2Title: t('app_characterStep2Title'),
          step2Desc: t('app_characterStep2Desc'),
          step3Title: t('app_characterStep3Title'),
          step3Desc: t('app_characterStep3Desc'),
          proTip: t('app_characterProTip'),
        };
      case 'equipment':
        return {
          fullTitle: t('app_equipmentFullTitle'),
          purpose: t('app_equipmentPurpose'),
          step1Title: t('app_equipmentStep1Title'),
          step1Desc: t('app_equipmentStep1Desc'),
          step2Title: t('app_equipmentStep2Title'),
          step2Desc: t('app_equipmentStep2Desc'),
          step3Title: t('app_equipmentStep3Title'),
          step3Desc: t('app_equipmentStep3Desc'),
          proTip: t('app_equipmentProTip'),
        };
      case 'journal':
        return {
          fullTitle: t('app_journalFullTitle'),
          purpose: t('app_journalPurpose'),
          step1Title: t('app_journalStep1Title'),
          step1Desc: t('app_journalStep1Desc'),
          step2Title: t('app_journalStep2Title'),
          step2Desc: t('app_journalStep2Desc'),
          step3Title: t('app_journalStep3Title'),
          step3Desc: t('app_journalStep3Desc'),
          proTip: t('app_journalProTip'),
        };
      case 'chat':
        return {
          fullTitle: t('app_chatFullTitle'),
          purpose: t('app_chatPurpose'),
          step1Title: t('app_chatStep1Title'),
          step1Desc: t('app_chatStep1Desc'),
          step2Title: t('app_chatStep2Title'),
          step2Desc: t('app_chatStep2Desc'),
          step3Title: t('app_chatStep3Title'),
          step3Desc: t('app_chatStep3Desc'),
          proTip: t('app_chatProTip'),
        };
      case 'dice':
        return {
          fullTitle: t('app_diceFullTitle'),
          purpose: t('app_dicePurpose'),
          step1Title: t('app_diceStep1Title'),
          step1Desc: t('app_diceStep1Desc'),
          step2Title: t('app_diceStep2Title'),
          step2Desc: t('app_diceStep2Desc'),
          step3Title: t('app_diceStep3Title'),
          step3Desc: t('app_diceStep3Desc'),
          proTip: t('app_diceProTip'),
        };
      case 'sidebar':
        return {
          fullTitle: t('app_sidebarFullTitle'),
          purpose: t('app_sidebarPurpose'),
          step1Title: t('app_sidebarStep1Title'),
          step1Desc: t('app_sidebarStep1Desc'),
          step2Title: t('app_sidebarStep2Title'),
          step2Desc: t('app_sidebarStep2Desc'),
          step3Title: t('app_sidebarStep3Title'),
          step3Desc: t('app_sidebarStep3Desc'),
          proTip: t('app_sidebarProTip'),
        };
    }
  };

  const currentDetails = getModuleDetails(activeModule);

  return (
    <div className="space-y-6">
      {/* Intro baner */}
      <div className="p-4 rounded-md border border-brass/30 bg-card/60 flex items-start gap-3">
        <Info className="w-5 h-5 text-brass mt-0.5 shrink-0" />
        <div className="space-y-1">
          <h3 className="text-sm font-serif font-bold text-brass">
            {t('app_introTitle')}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t('app_introDescription')}
          </p>
        </div>
      </div>

      {/* Atlas Interfejsu - Siatka Modułów */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {modules.map((mod) => {
          const Icon = mod.icon;
          const isSelected = activeModule === mod.id;
          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => setActiveModule(mod.id)}
              className={`p-3 rounded-md border text-left flex flex-col justify-between transition-all group relative overflow-hidden ${
                isSelected
                  ? 'border-brass bg-brass/15 shadow-[0_0_15px_rgba(184,134,11,0.2)]'
                  : 'border-border bg-card/50 hover:border-brass/50 hover:bg-card/90'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <Icon
                  className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                    isSelected ? 'text-brass' : 'text-muted-foreground group-hover:text-brass'
                  }`}
                />
                <ChevronRight
                  className={`w-3.5 h-3.5 transition-transform ${
                    isSelected ? 'text-brass rotate-90' : 'text-muted-foreground/40'
                  }`}
                />
              </div>
              <div>
                <h4
                  className={`text-xs font-serif font-bold tracking-tight line-clamp-1 ${
                    isSelected ? 'text-brass' : 'text-foreground'
                  }`}
                >
                  {mod.title}
                </h4>
                <p className="text-[10px] text-muted-foreground/80 line-clamp-1 mt-0.5 font-courier-prime">
                  {mod.tagline}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Wybrana Karta Modułu - Rozwinięte Wyjaśnienie */}
      <div className="p-6 rounded-md border border-brass/40 bg-card/80 space-y-6 shadow-md relative">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-md bg-brass/20 border border-brass/40 text-brass">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-serif font-bold text-brass uppercase tracking-wide">
                {currentDetails.fullTitle}
              </h3>
              <p className="text-xs font-courier-prime text-muted-foreground">
                {currentDetails.purpose}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-courier-prime uppercase tracking-widest px-2.5 py-1 rounded bg-input/60 border border-border text-muted-foreground">
            {t('app_moduleTag')}
          </span>
        </div>

        {/* 3 Kroki Obsługi */}
        <div className="space-y-3">
          <h4 className="text-xs font-serif font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-brass" />
            {t('app_stepsHeader')}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 rounded bg-input/40 border border-border/80 space-y-1.5">
              <div className="text-[11px] font-courier-prime font-bold text-brass">
                {t('app_step1Number')}
              </div>
              <p className="text-xs text-foreground/90 font-medium">
                {currentDetails.step1Title}
              </p>
              <p className="text-[11px] text-muted-foreground leading-normal">
                {currentDetails.step1Desc}
              </p>
            </div>

            <div className="p-3.5 rounded bg-input/40 border border-border/80 space-y-1.5">
              <div className="text-[11px] font-courier-prime font-bold text-brass">
                {t('app_step2Number')}
              </div>
              <p className="text-xs text-foreground/90 font-medium">
                {currentDetails.step2Title}
              </p>
              <p className="text-[11px] text-muted-foreground leading-normal">
                {currentDetails.step2Desc}
              </p>
            </div>

            <div className="p-3.5 rounded bg-input/40 border border-border/80 space-y-1.5">
              <div className="text-[11px] font-courier-prime font-bold text-brass">
                {t('app_step3Number')}
              </div>
              <p className="text-xs text-foreground/90 font-medium">
                {currentDetails.step3Title}
              </p>
              <p className="text-[11px] text-muted-foreground leading-normal">
                {currentDetails.step3Desc}
              </p>
            </div>
          </div>
        </div>

        {/* Wskazówka i Skróty */}
        <div className="p-3.5 rounded-md bg-brass/10 border border-brass/30 flex items-start gap-3 text-xs">
          <span className="text-base leading-none">💡</span>
          <div className="space-y-0.5">
            <strong className="text-brass font-serif font-bold">
              {t('app_proTipHeader')}:
            </strong>{' '}
            <span className="text-foreground/90 font-sans">
              {currentDetails.proTip}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
