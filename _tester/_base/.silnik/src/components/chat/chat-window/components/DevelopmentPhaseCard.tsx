'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Character, SkillData } from '@/lib/types';
import { getMarkedSkills, clearAllSkillMarks } from '@/lib/skill-migration';
import {
  characterDevelopment,
  DevelopmentRollResult,
  EDURollResult,
} from '@/lib/character-development';
import { Button } from '../../../ui/button';
import { Textarea } from '../../../ui/textarea';
import { Sparkles, Dices, Check, X, Heart, Clover, Brain, Save } from 'lucide-react';

interface DevelopmentPhaseCardProps {
  character: Character;
  onCharacterUpdate: (char: Character) => void;
  className?: string;
}

export function DevelopmentPhaseCard({
  character,
  onCharacterUpdate,
  className = '',
}: DevelopmentPhaseCardProps) {
  const t = useTranslations('DevelopmentPhaseCard');
  const [phase, setPhase] = useState<'ready' | 'rolling' | 'done'>('ready');
  const [skillResults, setSkillResults] = useState<DevelopmentRollResult[]>([]);
  const [luckResult, setLuckResult] = useState<EDURollResult | null>(null);
  const [selfHelpText, setSelfHelpText] = useState('');
  const [selfHelpSan, setSelfHelpSan] = useState<number | null>(null);
  const [currentSkillIndex, setCurrentSkillIndex] = useState(0);

  const markedSkills = getMarkedSkills(character);

  const runDevelopment = async () => {
    setPhase('rolling');
    const newResults: DevelopmentRollResult[] = [];
    let updatedCharacter = { ...character };
    const updatedSkills = { ...character.skills };

    // FAZA 1: Rzuty na umiejętności
    for (let i = 0; i < markedSkills.length; i++) {
      const skill = markedSkills[i];
      setCurrentSkillIndex(i);
      await new Promise((r) => setTimeout(r, 600));

      const result = characterDevelopment.rollSkillDevelopment(
        skill.name,
        skill.value
      );

      if (result.success && result.newValue !== undefined) {
        const currentSkill = updatedSkills[skill.name];
        const currentSkillData: SkillData =
          typeof currentSkill === 'number'
            ? { value: currentSkill, markedForImprovement: false }
            : currentSkill;

        updatedSkills[skill.name] = {
          ...currentSkillData,
          value: result.newValue,
          markedForImprovement: false,
          improvementHistory: [
            ...(currentSkillData.improvementHistory || []),
            {
              date: new Date(),
              oldValue: skill.value,
              newValue: result.newValue,
              method: 'development_phase' as const,
              rollValue: result.roll,
              improvementRoll: result.improvement,
            },
          ],
        };

        if (result.sanityBonus) {
          const mythosSkill = character.skills['Mity Cthulhu'] || character.skills['Cthulhu Mythos'];
          const mythosValue =
            typeof mythosSkill === 'object' && mythosSkill !== null
              ? mythosSkill.value
              : Number(mythosSkill || 0);
          const maxSan = Math.max(0, 99 - mythosValue);
          updatedCharacter.san = Math.min(
            maxSan,
            (updatedCharacter.san || 0) + result.sanityBonus
          );
        }
      } else {
        const currentSkill = updatedSkills[skill.name];
        if (typeof currentSkill !== 'number') {
          updatedSkills[skill.name] = {
            ...currentSkill,
            markedForImprovement: false,
          };
        }
      }

      newResults.push(result);
      setSkillResults([...newResults]);
    }

    // FAZA 2: Odzysk Szczęścia
    await new Promise((r) => setTimeout(r, 600));
    const luckRoll = characterDevelopment.rollLuckRecovery(updatedCharacter.luck || 0);
    setLuckResult(luckRoll);
    if (luckRoll.success && luckRoll.newValue !== undefined) {
      updatedCharacter.luck = luckRoll.newValue;
    }

    // Wyczyszczenie wszystkich oznaczeń umiejętności po fazie rozwoju
    updatedCharacter = clearAllSkillMarks({
      ...updatedCharacter,
      skills: updatedSkills,
    });

    onCharacterUpdate(updatedCharacter);
    setPhase('done');
  };

  const handleSelfHelp = () => {
    if (!selfHelpText.trim()) return;
    const sanGain = characterDevelopment.rollSanityRecovery(); // 1K6 CoC 7e RAW (str. 186-187)
    const mythosSkill = character.skills['Mity Cthulhu'] || character.skills['Cthulhu Mythos'];
    const mythosValue =
      typeof mythosSkill === 'object' && mythosSkill !== null
        ? mythosSkill.value
        : Number(mythosSkill || 0);
    const maxSan = character.maxSan ?? Math.max(0, 99 - mythosValue);
    const oldSan = character.san || 0;
    const newSan = Math.min(maxSan, oldSan + sanGain);
    const actualGain = newSan - oldSan;
    setSelfHelpSan(actualGain);
    onCharacterUpdate({
      ...character,
      san: newSan,
    });
  };

  return (
    <div
      className={`mt-4 rounded-xl border border-amber-500/40 bg-gradient-to-b from-zinc-950/90 via-zinc-900/90 to-amber-950/30 p-5 shadow-xl text-amber-100 font-special-elite ${className}`}
    >
      {/* Nagłówek */}
      <div className="flex items-center justify-between border-b border-amber-500/30 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
          <h3 className="text-lg font-bold text-amber-300 tracking-wide">
            {t('title')}
          </h3>
        </div>
        <span className="text-xs bg-amber-900/40 border border-amber-500/30 px-2.5 py-1 rounded-full text-amber-300 font-sans">
          {t('successfulTests', { count: markedSkills.length })}
        </span>
      </div>

      {/* Stan poczatkowy: Ready */}
      {phase === 'ready' && (
        <div className="space-y-4">
          <p className="text-sm text-zinc-300 leading-relaxed font-sans">
            {t('introPre')}
            <span className="text-amber-300 font-semibold">{t('introAccent')}</span>
            {t('introPost')}
          </p>

          {markedSkills.length > 0 ? (
            <div className="bg-black/30 rounded-lg p-3 border border-amber-500/20 max-h-40 overflow-y-auto">
              <span className="text-xs text-amber-400/80 block mb-2 font-mono uppercase tracking-wider">
                {t('skillsToTest')}
              </span>
              <div className="flex flex-wrap gap-2">
                {markedSkills.map((s) => (
                  <span
                    key={s.name}
                    className="text-xs bg-zinc-800/80 border border-zinc-700 text-zinc-200 px-2 py-1 rounded flex items-center gap-1.5"
                  >
                    <Check className="w-3 h-3 text-emerald-400" />
                    {s.name}: <strong className="text-amber-300">{s.value}%</strong>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800 text-xs text-zinc-400 italic">
              {t('noMarkedSkills')}
            </div>
          )}

          <Button
            onClick={runDevelopment}
            className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-zinc-950 font-bold py-2.5 shadow-lg flex items-center justify-center gap-2"
          >
            <Dices className="w-4 h-4" />
            {t('startButton')}
          </Button>
        </div>
      )}

      {/* Stan w trakcie rzutów: Rolling */}
      {phase === 'rolling' && (
        <div className="space-y-3 py-2">
          <div className="flex items-center justify-between text-xs text-amber-400 font-mono">
            <span>{t('rollingLabel')}</span>
            <span>
              {currentSkillIndex + 1} / {Math.max(1, markedSkills.length)}
            </span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {skillResults.map((res, i) => (
              <div
                key={i}
                className={`p-2.5 rounded text-xs border flex items-center justify-between transition-all ${
                  res.success
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  {res.success ? (
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <X className="w-4 h-4 text-zinc-500 shrink-0" />
                  )}
                  <span>
                    <strong className="text-zinc-100">{res.skillName}</strong>{' '}
                    ({res.oldValue}%) ➔{' '}
                    {t('skillRollLine', {
                      name: res.skillName,
                      old: res.oldValue,
                      roll: res.roll,
                    })}
                  </span>
                </div>

                {res.success ? (
                  <span className="text-emerald-300 font-bold bg-emerald-900/40 px-2 py-0.5 rounded border border-emerald-500/30">
                    +{res.improvement}% ➔ {res.newValue}%
                  </span>
                ) : (
                  <span className="text-zinc-500">{t('noChange')}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stan po zakończeniu rzutów: Done */}
      {phase === 'done' && (
        <div className="space-y-4">
          <div className="bg-emerald-950/30 border border-emerald-500/30 p-3.5 rounded-lg space-y-2 text-xs">
            <h4 className="font-bold text-emerald-300 flex items-center gap-1.5 text-sm">
              <Check className="w-4 h-4 text-emerald-400" />
              {t('summaryTitle')}
            </h4>

            <ul className="space-y-1 text-emerald-100/90 pl-1">
              {skillResults.filter((r) => r.success).length > 0 ? (
                skillResults
                  .filter((r) => r.success)
                  .map((r, i) => (
                    <li key={i} className="flex items-center justify-between">
                      <span>{t('summaryItem', { name: r.skillName })}</span>
                      <span className="text-emerald-300 font-bold">
                        {r.oldValue}% ➔ {r.newValue}% (+{r.improvement}%)
                      </span>
                    </li>
                  ))
              ) : (
                <li className="italic text-zinc-400">{t('noGrowth')}</li>
              )}
            </ul>

            {luckResult && (
              <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between text-amber-200">
                <span className="flex items-center gap-1.5">
                  <Clover className="w-3.5 h-3.5 text-emerald-400" />
                  {t('luckRollLine', { roll: luckResult.roll })}
                </span>
                {luckResult.success ? (
                  <strong className="text-emerald-300">{t('luckRecovered', { improvement: luckResult.improvement ?? 0 })}</strong>
                ) : (
                  <span className="text-zinc-400">{t('noChange')}</span>
                )}
              </div>
            )}
          </div>

          {/* Sekcja Samopomocy (Odzysk SAN) */}
          <div className="bg-black/30 border border-amber-500/20 p-3.5 rounded-lg space-y-2.5">
            <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5 font-mono uppercase tracking-wider">
              <Heart className="w-3.5 h-3.5 text-rose-400" />
              {t('selfHelpTitle')}
            </h4>
            {selfHelpSan === null ? (
              <div className="space-y-2">
                <p className="text-[11px] text-zinc-400 font-sans">
                  {t('selfHelpPrompt')}
                </p>
                <Textarea
                  value={selfHelpText}
                  onChange={(e) => setSelfHelpText(e.target.value)}
                  placeholder={t('selfHelpPlaceholder')}
                  rows={2}
                  className="text-xs bg-zinc-900/80 border-zinc-700 text-zinc-200"
                />
                <Button
                  onClick={handleSelfHelp}
                  disabled={!selfHelpText.trim()}
                  variant="outline"
                  className="w-full text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                >
                  <Brain className="w-3.5 h-3.5 mr-1.5" />
                  {t('selfHelpButton')}
                </Button>
              </div>
            ) : (
              <div className="p-2 bg-rose-950/30 border border-rose-500/30 rounded text-xs text-rose-200 flex items-center justify-between">
                <span>{t('recoveredSan')}</span>
                <strong className="text-rose-300 font-bold text-sm">+{selfHelpSan} SAN</strong>
              </div>
            )}
          </div>

          {/* Potwierdzenie zapisu */}
          <div className="text-center pt-2">
            <span className="text-xs text-emerald-400 font-mono flex items-center justify-center gap-1.5">
              <Save className="w-3.5 h-3.5 text-emerald-400" />
              {t('thanksMessage')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
