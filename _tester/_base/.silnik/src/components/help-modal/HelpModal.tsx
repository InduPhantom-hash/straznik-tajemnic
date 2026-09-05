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
      <div className="relative w-[86vw] max-w-[1280px] max-h-[85vh] bg-gray-950 border border-amber-900/60 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Nagłówek Modalu */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-900/40 bg-gray-900/60">
          <div className="flex items-center gap-2">
            <span className="text-xl">🕯️</span>
            <h2 className="text-lg font-serif text-amber-400 font-semibold tracking-wide">
              {t('title')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-amber-400 text-xl font-bold px-2 py-1 transition-colors"
            title={t('closeTitle')}
          >
            ✕
          </button>
        </div>

        {/* Zakładki Nawigacji Pomocy */}
        <div className="flex border-b border-amber-900/30 bg-gray-900/30 px-6 pt-2 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('EPOCH_WIKI')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'EPOCH_WIKI'
                ? 'border-amber-500 text-amber-300 bg-amber-950/30'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {t('tabEpochWiki')}
          </button>
          <button
            onClick={() => setActiveTab('RULES_BESTIARY')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'RULES_BESTIARY'
                ? 'border-amber-500 text-amber-300 bg-amber-950/30'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {t('tabRulesBestiary')}
          </button>
          <button
            onClick={() => setActiveTab('INTERFACE')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'INTERFACE'
                ? 'border-amber-500 text-amber-300 bg-amber-950/30'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {t('tabInterface')}
          </button>
          <button
            onClick={() => setActiveTab('RAG_ASSISTANT')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'RAG_ASSISTANT'
                ? 'border-amber-500 text-amber-300 bg-amber-950/30'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {t('tabAssistant')}
          </button>
          <button
            onClick={() => setActiveTab('COPYRIGHT')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'COPYRIGHT'
                ? 'border-amber-500 text-amber-300 bg-amber-950/30'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {t('tabCopyright')}
          </button>
        </div>

        {/* Zawartość Aktywnej Zakładki */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-950">
          {activeTab === 'EPOCH_WIKI' && <EpochWikiTab />}
          {activeTab === 'RULES_BESTIARY' && <BestiaryRulesTab />}
          {activeTab === 'RAG_ASSISTANT' && <HelpAssistantTab />}
          {activeTab === 'INTERFACE' && (
            <div className="text-gray-300 text-xs space-y-3 p-4 bg-gray-900/40 border border-amber-900/30 rounded">
              <h3 className="text-amber-400 font-serif text-sm font-bold">{t('interfaceTitle')}</h3>
              <p>• <strong>{t('interfaceChatLabel')}</strong> {t('interfaceChatText')}</p>
              <p>• <strong>{t('interfaceDiceLabel')}</strong> {t('interfaceDiceText')}</p>
              <p>• <strong>{t('interfaceBoardLabel')}</strong> {t('interfaceBoardText')}</p>
            </div>
          )}
          {activeTab === 'COPYRIGHT' && (
            <div className="text-gray-300 text-xs space-y-3 p-4 bg-gray-900/40 border border-amber-900/30 rounded">
              <h3 className="text-amber-400 font-serif text-sm font-bold">{t('copyrightTitle')}</h3>
              <p>{t('copyrightFanProject')}</p>
              <p>{t('copyrightPublicDomain')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
