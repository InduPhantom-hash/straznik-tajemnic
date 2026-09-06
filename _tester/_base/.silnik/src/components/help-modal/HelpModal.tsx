'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { EpochWikiTab } from './EpochWikiTab';
import { BestiaryRulesTab } from './BestiaryRulesTab';
import { HelpAssistantTab } from './HelpAssistantTab';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const t = useTranslations('HelpModal');
  const [activeTab, setActiveTab] = useState<'EPOCH_WIKI' | 'RULES_BESTIARY' | 'INTERFACE' | 'RAG_ASSISTANT' | 'COPYRIGHT'>('EPOCH_WIKI');

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-[80vw] h-[78vh] max-h-[85vh] bg-card border border-brass/40 rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Nagłówek Modalu */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/90">
          <div className="flex items-center gap-2">
            <span className="text-xl">🕯️</span>
            <h2 className="text-lg font-serif text-brass font-semibold tracking-wide">
              {t('title')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-brass text-xl font-bold px-2 py-1 transition-colors"
            title={t('closeTitle')}
          >
            ✕
          </button>
        </div>

        {/* Zakładki Nawigacji Pomocy */}
        <div className="flex border-b border-border bg-input/40 px-6 pt-2 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('EPOCH_WIKI')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'EPOCH_WIKI'
                ? 'border-brass text-brass bg-brass/10'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('tabEpochWiki')}
          </button>
          <button
            onClick={() => setActiveTab('RULES_BESTIARY')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'RULES_BESTIARY'
                ? 'border-brass text-brass bg-brass/10'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('tabRulesBestiary')}
          </button>
          <button
            onClick={() => setActiveTab('INTERFACE')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'INTERFACE'
                ? 'border-brass text-brass bg-brass/10'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('tabInterface')}
          </button>
          <button
            onClick={() => setActiveTab('RAG_ASSISTANT')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'RAG_ASSISTANT'
                ? 'border-brass text-brass bg-brass/10'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('tabAssistant')}
          </button>
          <button
            onClick={() => setActiveTab('COPYRIGHT')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'COPYRIGHT'
                ? 'border-brass text-brass bg-brass/10'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('tabCopyright')}
          </button>
        </div>

        {/* Zawartość Aktywnej Zakładki */}
        <div className="p-6 overflow-y-auto flex-1 bg-background">
          {activeTab === 'EPOCH_WIKI' && <EpochWikiTab />}
          {activeTab === 'RULES_BESTIARY' && <BestiaryRulesTab />}
          {activeTab === 'RAG_ASSISTANT' && <HelpAssistantTab />}
          {activeTab === 'INTERFACE' && (
            <div className="text-foreground/90 text-xs space-y-3 p-4 bg-card/60 border border-border rounded-md">
              <h3 className="text-brass font-serif text-sm font-bold">{t('interfaceTitle')}</h3>
              <p>• <strong>{t('interfaceChatLabel')}</strong> {t('interfaceChatText')}</p>
              <p>• <strong>{t('interfaceDiceLabel')}</strong> {t('interfaceDiceText')}</p>
              <p>• <strong>{t('interfaceBoardLabel')}</strong> {t('interfaceBoardText')}</p>
            </div>
          )}
          {activeTab === 'COPYRIGHT' && (
            <div className="text-foreground/90 text-xs space-y-3 p-4 bg-card/60 border border-border rounded-md">
              <h3 className="text-brass font-serif text-sm font-bold">{t('copyrightTitle')}</h3>
              <p>{t('copyrightFanProject')}</p>
              <p>{t('copyrightPublicDomain')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
