'use client';

/**
 * PregenCharacterSelector - Selektor gotowych postaci (pregenów) ze scenariusza
 *
 * Pozwala graczowi na:
 * 1. Natychmiastowe wybranie gotowej postaci (np. Badacz A, B, C, D) jednym kliknięciem.
 * 2. Przejście do dostosowania pregena w Kreatorze Badacza z zachowaniem danych startowych.
 * 3. Wybór stworzenia własnej postaci od zera w standardowym kreatorze.
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from './button';
import { Users, Sparkles, UserCheck, Edit3, ArrowRight, Shield, Award, Heart, Brain, Zap } from 'lucide-react';
import type { PregenCharacterConcept } from '@/lib/adventures-data';
import type { Character } from '@/lib/types';
import type { CharacterStats } from '@/lib/data/character';
import { calculateDerived as libCalculateDerived, getWealthInfo as libGetWealthInfo } from '@/lib/character';
import { BASE_SKILLS } from '@/lib/data/character';

interface PregenCharacterSelectorProps {
  pregens: PregenCharacterConcept[];
  adventureTitle?: string;
  onSelectCharacter: (character: Character) => void;
  onCustomizeInWizard: (pregen: PregenCharacterConcept) => void;
  onCreateFromScratch: () => void;
  className?: string;
}

/**
 * Konwertuje koncept pregena ze scenariusza na pełnoprawny obiekt Character
 */
export function buildCharacterFromPregen(
  pregen: PregenCharacterConcept,
  adventureTitle?: string
): Character {
  const age = pregen.age ?? 25;
  const rawStats = pregen.stats ?? {};

  const stats: CharacterStats = {
    str: rawStats.str ?? rawStats.STR ?? 50,
    con: rawStats.con ?? rawStats.CON ?? 50,
    siz: rawStats.siz ?? rawStats.SIZ ?? 50,
    dex: rawStats.dex ?? rawStats.DEX ?? 50,
    app: rawStats.app ?? rawStats.APP ?? 50,
    int: rawStats.int ?? rawStats.INT ?? 60,
    pow: rawStats.pow ?? rawStats.POW ?? 50,
    edu: rawStats.edu ?? rawStats.EDU ?? 60,
    luck: rawStats.luck ?? rawStats.LUCK ?? 50,
  };

  const derived = libCalculateDerived(stats, age, 'classic');
  const wealth = libGetWealthInfo(30);

  // Bazowe umiejętności + dopisane z pregena
  const skills: Record<string, number> = {
    ...BASE_SKILLS,
    'Język Ojczysty': stats.edu,
    Unik: Math.floor(stats.dex / 2),
  };

  if (Array.isArray(pregen.skills)) {
    for (const skillEntry of pregen.skills) {
      // Obsługa formatów "Spostrzegawczość 60%", "Spostrzegawczość: 60" lub "Przetrwanie (Dzicz): 55"
      const match = skillEntry.match(/^(.*?)(?::\s*|\s+)(\d+)\s*%?$/);
      if (match) {
        const skillName = match[1].trim();
        const skillValue = parseInt(match[2], 10);
        skills[skillName] = skillValue;
      } else {
        const trimmed = skillEntry.trim();
        if (trimmed) skills[trimmed] = 50;
      }
    }
  }

  const id = pregen.id || `pregen-${Date.now()}`;
  const occupation = pregen.occupation || 'Badacz Tajemnic';

  return {
    id,
    name: pregen.name,
    playerName: '',
    age,
    gender: pregen.gender === 'female' ? 'female' : pregen.gender === 'male' ? 'male' : undefined,
    occupation,
    archetype: undefined,
    str: stats.str,
    con: stats.con,
    siz: stats.siz,
    dex: stats.dex,
    app: stats.app,
    int: stats.int,
    pow: stats.pow,
    edu: stats.edu,
    luck: stats.luck,
    hp: derived.hp,
    san: derived.san,
    mp: derived.mp,
    maxHp: derived.hp,
    maxSan: 99,
    maxMp: derived.mp,
    move: derived.movement,
    damageBonus: derived.damageBonus,
    build: derived.build,
    dayStartSan: derived.san,
    dailySanLoss: 0,
    insanityState: 'none',
    underlyingInsanity: false,
    activeBoutOfMadness: null,
    skills,
    cash: wealth.cashAmount,
    spendingLevel: wealth.spendingAmount,
    currency: wealth.currency,
    era: wealth.era,
    background: pregen.background || '',
    notes: adventureTitle ? `Postać predefiniowana ze scenariusza: ${adventureTitle}` : '',
    experience: {
      totalXP: 0,
      availableXP: 0,
      earnedThisSession: 0,
      maxEarnedThisSession: 6,
    },
    developmentHistory: [],
    rulesetVariant: 'classic',
    luckSpentThisSession: 0,
    isActive: true,
    lastUsed: new Date(),
  };
}

export function PregenCharacterSelector({
  pregens,
  adventureTitle,
  onSelectCharacter,
  onCustomizeInWizard,
  onCreateFromScratch,
  className = '',
}: PregenCharacterSelectorProps) {
  const t = useTranslations('PregenCharacterSelector');
  const [selectedId, setSelectedId] = useState<string>(pregens[0]?.id || '');

  const activePregen = pregens.find((p) => p.id === selectedId) || pregens[0];

  const handleInstantSelect = (pregen: PregenCharacterConcept) => {
    const character = buildCharacterFromPregen(pregen, adventureTitle);
    onSelectCharacter(character);
  };

  return (
    <div
      data-component="pregen-character-selector"
      className={`bg-zinc-950/95 border border-brass/40 rounded-lg p-5 text-amber-50 shadow-2xl flex flex-col gap-5 ${className}`}
    >
      {/* Nagłówek sekcji */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brass/20 pb-4">
        <div>
          <div className="flex items-center gap-2 text-brass font-serif text-lg tracking-wide uppercase">
            <Users className="w-5 h-5 text-brass" />
            <h3>{t('heading')}</h3>
          </div>
          <p className="text-xs text-amber-200/70 font-mono mt-1">
            {adventureTitle
              ? t('subheadingWithAdventure', { title: adventureTitle })
              : t('subheading')}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onCreateFromScratch}
          className="border-brass/40 text-brass hover:bg-brass/10 font-mono text-xs self-start sm:self-auto cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
          {t('createFromScratch')}
        </Button>
      </div>

      {/* Siatka wyboru postaci */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Lewa kolumna: Lista pregenów do wyboru */}
        <div className="flex flex-col gap-2 md:col-span-1 border-r-0 md:border-r border-brass/20 pr-0 md:pr-4">
          <span className="text-[11px] font-mono uppercase tracking-wider text-brass/80 mb-1">
            {t('availableInvestigators', { count: pregens.length })}
          </span>

          <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
            {pregens.map((pregen) => {
              const isSelected = pregen.id === selectedId;
              return (
                <button
                  key={pregen.id}
                  type="button"
                  onClick={() => setSelectedId(pregen.id)}
                  className={`text-left p-3 rounded border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-brass/20 border-brass text-amber-100 shadow-md ring-1 ring-brass/40'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-brass/40 hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-sm text-brass tracking-wide">
                      {pregen.name}
                    </span>
                    {pregen.age && (
                      <span className="text-[10px] font-mono text-amber-300/60">
                        {t('ageYears', { age: pregen.age })}
                      </span>
                    )}
                  </div>
                  {pregen.occupation && (
                    <div className="text-xs text-amber-200/80 font-mono mt-0.5">
                      {pregen.occupation}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Prawa kolumna: Karta szczegółów wybranego Badacza */}
        {activePregen && (
          <div className="md:col-span-2 flex flex-col justify-between bg-zinc-900/80 border border-brass/30 rounded-md p-4">
            <div className="space-y-3">
              {/* Nagłówek karty */}
              <div className="border-b border-brass/20 pb-3 flex items-start justify-between">
                <div>
                  <h4 className="font-serif text-xl font-bold text-brass tracking-wider">
                    {activePregen.name}
                  </h4>
                  <div className="text-xs text-amber-200/90 font-mono flex items-center gap-3 mt-1">
                    {activePregen.occupation && (
                      <span className="bg-brass/10 px-2 py-0.5 rounded border border-brass/30">
                        {activePregen.occupation}
                      </span>
                    )}
                    {activePregen.age && (
                      <span>{t('ageYears', { age: activePregen.age })}</span>
                    )}
                    {activePregen.gender && (
                      <span>
                        {activePregen.gender === 'female'
                          ? t('genderFemale')
                          : activePregen.gender === 'male'
                          ? t('genderMale')
                          : t('genderOther')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tło fabularne */}
              {activePregen.background && (
                <div className="space-y-1">
                  <span className="text-[11px] font-mono uppercase text-brass/70 tracking-wider">
                    {t('biography')}
                  </span>
                  <p className="text-xs text-zinc-300 leading-relaxed font-serif italic bg-zinc-950/40 p-2.5 rounded border border-zinc-800/80">
                    {activePregen.background}
                  </p>
                </div>
              )}

              {/* Kluczowe statystyki (jeśli określone) */}
              {activePregen.stats && Object.keys(activePregen.stats).length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] font-mono uppercase text-brass/70 tracking-wider">
                    {t('keyStats')}
                  </span>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                    {Object.entries(activePregen.stats).map(([statKey, statVal]) => (
                      <div
                        key={statKey}
                        className="flex flex-col items-center bg-zinc-950/60 border border-brass/20 py-1 px-1.5 rounded text-center"
                      >
                        <span className="text-[9px] font-mono uppercase text-brass/80">
                          {statKey}
                        </span>
                        <span className="text-xs font-bold font-mono text-amber-200">
                          {statVal}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Kluczowe umiejętności */}
              {activePregen.skills && activePregen.skills.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] font-mono uppercase text-brass/70 tracking-wider">
                    {t('keySkills')}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {activePregen.skills.map((skill) => (
                      <span
                        key={skill}
                        className="text-[11px] font-mono bg-zinc-950/80 text-amber-200/90 border border-brass/30 px-2 py-0.5 rounded"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Dolny pasek akcji */}
            <div className="pt-4 mt-4 border-t border-brass/20 flex flex-col sm:flex-row items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCustomizeInWizard(activePregen)}
                className="w-full sm:w-auto border-brass/50 text-brass hover:bg-brass/20 font-mono text-xs cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                {t('customizeInWizard')}
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={() => handleInstantSelect(activePregen)}
                className="w-full sm:w-auto bg-brass hover:bg-brass/90 text-zinc-950 font-serif font-bold text-xs cursor-pointer shadow-lg"
              >
                <UserCheck className="w-4 h-4 mr-1.5" />
                {t('selectAndPlay')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
