'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';

interface MonsterEntry {
  name: string;
  category: string;
  sanLoss: string;
  description: string;
}

export function BestiaryRulesTab() {
  const t = useTranslations('BestiaryRulesTab');
  const [subTab, setSubTab] = useState<'RULES' | 'BESTIARY'>('RULES');
  const [searchMonster, setSearchMonster] = useState('');

  const BESTIARY_DATA: MonsterEntry[] = [
    {
      name: 'Cthulhu',
      category: t('cthulhuCategory'),
      sanLoss: '1k10/1k100',
      description: t('cthulhuDescription'),
    },
    {
      name: 'Ghul (Ghoul)',
      category: t('ghoulCategory'),
      sanLoss: '0/1k6',
      description: t('ghoulDescription'),
    },
    {
      name: t('deepOneName'),
      category: t('deepOneCategory'),
      sanLoss: '0/1k6',
      description: t('deepOneDescription'),
    },
    {
      name: 'Nyarlathotep',
      category: t('nyarlathotepCategory'),
      sanLoss: '1k6/1k20',
      description: t('nyarlathotepDescription'),
    },
  ];

  const filteredMonsters = BESTIARY_DATA.filter((m) =>
    m.name.toLowerCase().includes(searchMonster.toLowerCase()) ||
    m.category.toLowerCase().includes(searchMonster.toLowerCase())
  );

  return (
    <div className="space-y-4 text-foreground">
      <div className="flex gap-2 border-b border-border pb-2">
        <button
          onClick={() => setSubTab('RULES')}
          className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
            subTab === 'RULES'
              ? 'bg-brass/20 text-brass border border-brass/40'
              : 'bg-card text-muted-foreground hover:text-foreground border border-transparent'
          }`}
        >
          {t('tabRules')}
        </button>
        <button
          onClick={() => setSubTab('BESTIARY')}
          className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
            subTab === 'BESTIARY'
              ? 'bg-brass/20 text-brass border border-brass/40'
              : 'bg-card text-muted-foreground hover:text-foreground border border-transparent'
          }`}
        >
          {t('tabBestiary')}
        </button>
      </div>

      {subTab === 'RULES' ? (
        <div className="space-y-4 text-sm leading-relaxed text-foreground/90">
          <div className="p-3 bg-card/80 border border-border rounded">
            <h4 className="text-brass font-serif font-bold mb-1">{t('rulesSkillTestsTitle')}</h4>
            <p>{t('rulesSkillTestsText')}</p>
            <ul className="list-disc list-inside mt-2 text-xs space-y-1 text-muted-foreground">
              <li><strong>{t('rulesRegularLabel')}</strong> {t('rulesRegularText')}</li>
              <li><strong>{t('rulesHardLabel')}</strong> {t('rulesHardText')}</li>
              <li><strong>{t('rulesExtremeLabel')}</strong> {t('rulesExtremeText')}</li>
              <li><strong>{t('rulesCriticalLabel')}</strong> {t('rulesCriticalText')}</li>
              <li><strong>{t('rulesFumbleLabel')}</strong> {t('rulesFumbleText')}</li>
            </ul>
          </div>

          <div className="p-3 bg-card/80 border border-border rounded">
            <h4 className="text-brass font-serif font-bold mb-1">{t('rulesSanityTitle')}</h4>
            <p>{t('rulesSanityText')}</p>
            <ul className="list-disc list-inside mt-2 text-xs space-y-1 text-muted-foreground">
              <li><strong>{t('rulesTemporaryInsanityLabel')}</strong> {t('rulesTemporaryInsanityText')}</li>
              <li><strong>{t('rulesInsanityLabel')}</strong> {t('rulesInsanityText')}</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchMonster}
            onChange={(e) => setSearchMonster(e.target.value)}
            className="w-full px-3 py-1.5 bg-input border border-brass/30 rounded text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brass"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
            {filteredMonsters.map((monster) => (
              <div key={monster.name} className="p-3 bg-card/90 border border-border rounded flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <h5 className="font-serif font-bold text-brass text-sm">{monster.name}</h5>
                    <span className="text-[10px] px-1.5 py-0.5 bg-destructive/20 text-destructive border border-destructive/40 rounded font-mono font-bold">
                      {t('sanLossBadge', { loss: monster.sanLoss })}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{monster.category}</span>
                  <p className="text-xs text-foreground/80 mt-2">{monster.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
