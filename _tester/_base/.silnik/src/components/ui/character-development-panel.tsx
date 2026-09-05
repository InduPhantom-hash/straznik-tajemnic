'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from './button';
import { Character, getSkillValue } from '@/lib/types';
import {
  characterDevelopment,
  CharacterDevelopmentStats,
  TraumaEvent,
  Achievement,
} from '@/lib/character-development';

interface CharacterDevelopmentPanelProps {
  character: Character;
  onCharacterUpdate: (character: Character) => void;
  onClose: () => void;
}

export function CharacterDevelopmentPanel({
  character,
  onCharacterUpdate,
  onClose,
}: CharacterDevelopmentPanelProps) {
  const t = useTranslations('CharacterDevelopmentPanel');
  const [activeTab, setActiveTab] = useState<
    'overview' | 'skills' | 'trauma' | 'achievements'
  >('overview');
  const [newTrauma, setNewTrauma] = useState<Partial<TraumaEvent>>({});
  const [showTraumaForm, setShowTraumaForm] = useState(false);

  const stats = characterDevelopment.calculateDevelopmentStats(character);

  // Handle trauma addition
  const handleAddTrauma = () => {
    if (!newTrauma.name || !newTrauma.type || !newTrauma.severity) {
      return;
    }

    const traumaData = {
      ...newTrauma,
      description:
        newTrauma.description ||
        t('defaultTraumaDescription', { type: newTrauma.type }),
      sanityLoss: newTrauma.sanityLoss || 0,
      gameplayEffect: newTrauma.gameplayEffect || t('noSpecialEffects'),
    } as Omit<TraumaEvent, 'id' | 'acquired'>;

    const updatedCharacter = characterDevelopment.addTrauma(
      character,
      traumaData
    );
    onCharacterUpdate(updatedCharacter);
    setNewTrauma({});
    setShowTraumaForm(false);
  };

  // Handle achievement grant
  const handleGrantAchievement = (
    achievementData: Omit<Achievement, 'id' | 'unlocked'>
  ) => {
    const updatedCharacter = characterDevelopment.grantAchievement(
      character,
      achievementData
    );
    onCharacterUpdate(updatedCharacter);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="deco-corners relative border border-brass/40 bg-gradient-to-br from-[#1a1610] to-[#100d09] shadow-deco w-[86vw] max-w-[1280px] max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-brass/30">
          <div>
            <div className="font-special-elite text-[14px] uppercase tracking-[0.3em] text-primary mb-1">
              {t('eyebrow')}
            </div>
            <h2 className="font-display-decorative text-xl uppercase tracking-[0.08em] text-foreground">
              {t('title', { name: character.name })}
            </h2>
            <p className="font-serif italic text-sm text-muted-foreground">
              {t('subtitle')}
            </p>
          </div>
          <Button onClick={onClose} variant="outline" size="sm">
            ✕
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-brass/30">
          {[
            { id: 'overview', label: t('tabOverview'), icon: '📊' },
            { id: 'skills', label: t('tabSkills'), icon: '🎯' },
            { id: 'trauma', label: t('tabTrauma'), icon: '🧠' },
            { id: 'achievements', label: t('tabAchievements'), icon: '🏆' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-6 py-3 font-display uppercase tracking-[0.12em] text-xs font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-brass'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Overview (bez XP) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-primary/40 bg-[rgba(13,148,136,0.06)] p-4">
                  <h3 className="font-display uppercase tracking-[0.16em] text-xs font-semibold text-primary mb-3">
                    {t('developmentCardTitle')}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-serif text-foreground/80">
                        {t('sessionsLabel')}
                      </span>
                      <span className="font-special-elite text-primary">
                        {stats.totalSessions}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-serif text-foreground/80">
                        {t('skillImprovementsLabel')}
                      </span>
                      <span className="font-special-elite text-primary">
                        {stats.totalSkillImprovements}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-serif text-foreground/80">
                        {t('devPointsLabel')}
                      </span>
                      <span className="font-special-elite text-primary">
                        +{stats.totalPointsGained}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border border-brass/40 bg-[rgba(201,162,39,0.06)] p-4">
                  <h3 className="font-display uppercase tracking-[0.16em] text-xs font-semibold text-brass mb-3">
                    {t('markedSkillsTitle')}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-serif text-foreground/80">
                        {t('forDevelopmentLabel')}
                      </span>
                      <span className="font-special-elite text-brass">
                        {stats.markedSkillsCount}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-serif text-foreground/80">
                        {t('survivalLabel')}
                      </span>
                      <span className="font-special-elite text-brass">
                        {stats.survivalRate.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  {stats.markedSkillsCount > 0 && (
                    <p className="font-serif italic text-xs text-brass/80 mt-2">
                      {t('useDevPhaseHint')}
                    </p>
                  )}
                </div>

                <div className="border border-brass/30 bg-[#16130f] p-4">
                  <h3 className="font-display uppercase tracking-[0.16em] text-xs font-semibold text-muted-foreground mb-3">
                    {t('achievementsCardTitle')}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-serif text-foreground/80">
                        {t('traumaLabel')}
                      </span>
                      <span className="font-special-elite text-destructive">
                        {stats.traumaCount}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-serif text-foreground/80">
                        {t('achievementsLabel')}
                      </span>
                      <span className="font-special-elite text-brass">
                        {stats.achievementCount}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-serif text-foreground/80">
                        {t('investigationsLabel')}
                      </span>
                      <span className="font-special-elite text-foreground">
                        {stats.investigationsSolved}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Favorite Skills */}
              {stats.favoriteSkills.length > 0 && (
                <div className="border border-brass/25 bg-[#16130f] p-4">
                  <h3 className="font-display uppercase tracking-[0.16em] text-xs font-semibold text-brass mb-3">
                    {t('favoriteSkillsTitle')}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {stats.favoriteSkills.map((skill) => (
                      <span
                        key={skill}
                        className="font-special-elite text-xs border border-primary/40 bg-primary/10 text-primary px-3 py-1"
                      >
                        {skill}: {getSkillValue(character.skills[skill])}%
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Development History */}
              {character.developmentHistory.length > 0 && (
                <div className="border border-brass/25 bg-[#16130f] p-4">
                  <h3 className="font-display uppercase tracking-[0.16em] text-xs font-semibold text-brass mb-3">
                    {t('historyTitle')}
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {character.developmentHistory
                      .slice(-10)
                      .reverse()
                      .map((entry, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center text-sm border border-brass/15 bg-[#1f1a14] p-2"
                        >
                          <span className="font-serif text-foreground">
                            {entry.description}
                          </span>
                          <span className="font-special-elite text-xs text-muted-foreground">
                            {entry.timestamp.toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'skills' && (
            <div className="space-y-6">
              {/* Zasady CoC 7e */}
              <div className="border border-brass/30 bg-[#16130f] p-4">
                <h3 className="font-display uppercase tracking-[0.16em] text-xs font-semibold text-brass mb-2">
                  {t('rulesTitle')}
                </h3>
                <ul className="font-serif text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>
                    {t.rich('rule1', {
                      strong: (chunks) => (
                        <strong className="text-primary">{chunks}</strong>
                      ),
                    })}
                  </li>
                  <li>
                    {t.rich('rule2', {
                      strong: (chunks) => (
                        <strong className="text-primary">{chunks}</strong>
                      ),
                    })}
                  </li>
                  <li>
                    {t.rich('rule3', {
                      strong: (chunks) => (
                        <strong className="text-primary">{chunks}</strong>
                      ),
                    })}
                  </li>
                  <li>
                    {t.rich('rule4', {
                      strong: (chunks) => (
                        <strong className="text-brass">{chunks}</strong>
                      ),
                    })}
                  </li>
                </ul>
              </div>

              {/* Skills List with Marks */}
              <div className="border border-brass/25 bg-[#16130f] p-4">
                <h3 className="font-display uppercase tracking-[0.16em] text-xs font-semibold text-brass mb-4">
                  {t('allSkillsTitle')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(character.skills)
                    .sort(([, a], [, b]) => getSkillValue(b) - getSkillValue(a))
                    .map(([skill, skillValue]) => {
                      const value = getSkillValue(skillValue);
                      const isMarked =
                        typeof skillValue === 'object' &&
                        skillValue !== null &&
                        skillValue.markedForImprovement;
                      return (
                        <div
                          key={skill}
                          className={`flex justify-between items-center p-2 border ${
                            isMarked
                              ? 'border-primary/40 bg-[rgba(13,148,136,0.08)] shadow-[0_0_12px_rgba(13,148,136,0.1)]'
                              : 'border-brass/20 bg-[#1f1a14]'
                          }`}
                        >
                          <span className="font-serif text-sm text-foreground flex items-center gap-1">
                            {isMarked && (
                              <span className="text-primary">✓</span>
                            )}
                            {skill}
                          </span>
                          <span
                            className={`font-special-elite text-sm ${
                              value >= 90
                                ? 'text-brass font-bold'
                                : 'text-primary'
                            }`}
                          >
                            {value}%
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'trauma' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-display uppercase tracking-[0.16em] text-sm font-semibold text-foreground">
                  {t('traumaManagementTitle')}
                </h3>
                <Button
                  onClick={() => setShowTraumaForm(!showTraumaForm)}
                  variant="destructive"
                >
                  {showTraumaForm ? t('cancelButton') : t('addTraumaButton')}
                </Button>
              </div>

              {showTraumaForm && (
                <div className="border-l-2 border-l-destructive/60 border border-destructive/30 bg-[rgba(179,50,44,0.07)] p-4">
                  <h4 className="font-display uppercase tracking-[0.14em] text-xs font-semibold text-destructive mb-4">
                    {t('newTraumaTitle')}
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block font-special-elite text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2">
                        {t('nameFieldLabel')}
                      </label>
                      <input
                        type="text"
                        value={newTrauma.name || ''}
                        onChange={(e) =>
                          setNewTrauma({ ...newTrauma, name: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-brass/30 bg-background text-foreground font-serif focus:border-brass/60 focus:outline-none"
                        placeholder={t('traumaNamePlaceholder')}
                      />
                    </div>

                    <div>
                      <label className="block font-special-elite text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2">
                        {t('typeFieldLabel')}
                      </label>
                      <select
                        value={newTrauma.type || ''}
                        onChange={(e) =>
                          setNewTrauma({
                            ...newTrauma,
                            type: e.target.value as TraumaEvent['type'],
                          })
                        }
                        className="w-full px-3 py-2 border border-brass/30 bg-background text-foreground font-serif focus:border-brass/60 focus:outline-none"
                      >
                        <option value="">{t('selectTypeOption')}</option>
                        <option value="phobia">{t('typePhobia')}</option>
                        <option value="mania">{t('typeMania')}</option>
                        <option value="delusion">{t('typeDelusion')}</option>
                        <option value="amnesia">{t('typeAmnesia')}</option>
                        <option value="other">{t('typeOther')}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-special-elite text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2">
                        {t('severityFieldLabel')}
                      </label>
                      <select
                        value={newTrauma.severity || ''}
                        onChange={(e) =>
                          setNewTrauma({
                            ...newTrauma,
                            severity: e.target.value as TraumaEvent['severity'],
                          })
                        }
                        className="w-full px-3 py-2 border border-brass/30 bg-background text-foreground font-serif focus:border-brass/60 focus:outline-none"
                      >
                        <option value="">{t('selectSeverityOption')}</option>
                        <option value="mild">{t('severityMild')}</option>
                        <option value="moderate">{t('severityModerate')}</option>
                        <option value="severe">{t('severitySevere')}</option>
                        <option value="extreme">{t('severityExtreme')}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-special-elite text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2">
                        {t('sanityLossLabel')}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="99"
                        value={newTrauma.sanityLoss || 0}
                        onChange={(e) =>
                          setNewTrauma({
                            ...newTrauma,
                            sanityLoss: parseInt(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border border-brass/30 bg-background text-foreground font-special-elite focus:border-brass/60 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block font-special-elite text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2">
                      {t('descriptionFieldLabel')}
                    </label>
                    <textarea
                      value={newTrauma.description || ''}
                      onChange={(e) =>
                        setNewTrauma({
                          ...newTrauma,
                          description: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-brass/30 bg-background text-foreground font-serif focus:border-brass/60 focus:outline-none"
                      rows={3}
                      placeholder={t('traumaDescPlaceholder')}
                    />
                  </div>

                  <Button
                    onClick={handleAddTrauma}
                    disabled={
                      !newTrauma.name || !newTrauma.type || !newTrauma.severity
                    }
                    variant="destructive"
                  >
                    {t('addTraumaSubmit')}
                  </Button>
                </div>
              )}

              {/* Current Trauma List */}
              <div className="space-y-3">
                {character.developmentHistory
                  .filter((h) => h.target === 'Trauma')
                  .map((trauma, index) => (
                    <div
                      key={index}
                      className="border-l-2 border-l-destructive/50 border border-destructive/30 bg-[rgba(179,50,44,0.07)] p-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-display uppercase tracking-[0.1em] text-xs font-semibold text-destructive">
                            {trauma.description
                              .split(' - ')[1]
                              ?.split(' - ')[0] || t('defaultTraumaName')}
                          </h4>
                          <p className="font-serif text-sm text-foreground/85 mt-1">
                            {trauma.description}
                          </p>
                          <p className="font-special-elite text-xs text-muted-foreground mt-1">
                            {t('dateLabel', {
                              date: trauma.timestamp.toLocaleDateString(),
                            })}
                          </p>
                        </div>
                        <span className="font-special-elite text-xs border border-destructive/40 bg-destructive/15 text-destructive px-2 py-1">
                          -{trauma.oldValue - trauma.newValue} PR
                        </span>
                      </div>
                    </div>
                  ))}

                {character.developmentHistory.filter(
                  (h) => h.target === 'Trauma'
                ).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="text-4xl mb-2">🧠</div>
                    <p className="font-serif italic text-base">
                      {t('noTraumas')}
                    </p>
                    <p className="font-serif italic text-sm text-muted-foreground/70">
                      {t('noTraumasHint')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'achievements' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-display uppercase tracking-[0.16em] text-sm font-semibold text-foreground">
                  {t('tabAchievements')}
                </h3>
                <Button
                  onClick={() => {
                    const achievementData = {
                      name: t('testAchievementName'),
                      description: t('testAchievementDescription'),
                      type: 'special' as const,
                      requirements: ['Test requirement'],
                    };
                    handleGrantAchievement(achievementData);
                  }}
                  className="font-display font-semibold uppercase tracking-[0.16em] text-brass bg-brass/[0.04] border border-brass/45 hover:bg-brass/10"
                >
                  {t('addAchievementButton')}
                </Button>
              </div>

              {/* Achievement List */}
              <div className="space-y-3">
                {character.developmentHistory
                  .filter((h) => h.target === 'Achievement')
                  .map((achievement, index) => (
                    <div
                      key={index}
                      className="border border-brass/35 bg-[rgba(201,162,39,0.06)] p-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-display uppercase tracking-[0.1em] text-xs font-semibold text-brass">
                            {achievement.description.split(': ')[1] ||
                              t('defaultAchievementName')}
                          </h4>
                          <p className="font-serif text-sm text-foreground/85 mt-1">
                            {achievement.description}
                          </p>
                          <p className="font-special-elite text-xs text-muted-foreground mt-1">
                            {t('dateLabel', {
                              date: achievement.timestamp.toLocaleDateString(),
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                {character.developmentHistory.filter(
                  (h) => h.target === 'Achievement'
                ).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="text-4xl mb-2">🏆</div>
                    <p className="font-serif italic text-base">
                      {t('noAchievements')}
                    </p>
                    <p className="font-serif italic text-sm text-muted-foreground/70">
                      {t('noAchievementsHint')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer (bez XP) */}
        <div className="flex justify-between items-center p-6 border-t border-brass/30">
          <div className="font-special-elite text-xs uppercase tracking-[0.1em] text-muted-foreground">
            <span className="text-brass">
              {t('footerStats', { san: character.san })}
            </span>{' '}
            •
            <span className="text-destructive">
              {t('footerHp', { hp: character.hp })}
            </span>{' '}
            • {t('footerMarked', { count: stats.markedSkillsCount })}
          </div>
          <Button onClick={onClose}>{t('closeButton')}</Button>
        </div>
      </div>
    </div>
  );
}
