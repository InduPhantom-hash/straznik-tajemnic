'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './dialog';
import { Button } from './button';
import { Label } from './label';
import { Input } from './input';
import { HelpIcon } from './tooltip';
import {
  saveAISettings,
  loadAISettings,
  AISettings,
  type SessionZeroSettings,
} from '@/lib/ai-settings';
import { AdventureContext } from '@/lib/adventures-data';

interface SessionZeroModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: (settings: SessionZeroSettings) => void;
  adventureContext?: AdventureContext; // Opcjonalny kontekst przygody
}

// FEATURE:#18 - Tryb narracji: pełne RPG, priorytet fabuły, czysta narracja
const NARRATIVE_MODES = [
  {
    id: 'full_rpg',
    icon: '🎲',
    color: 'text-blue-400',
  },
  {
    id: 'story_priority',
    icon: '📖',
    color: 'text-purple-400',
  },
  {
    id: 'pure_narrative',
    icon: '✨',
    color: 'text-emerald-400',
  },
];

const DIFFICULTIES = [
  {
    id: 'easy',
    icon: '🌱',
  },
  {
    id: 'normal',
    icon: '⚖️',
  },
  {
    id: 'hard',
    icon: '🔥',
  },
  {
    id: 'deadly',
    icon: '💀',
  },
];

const SUGGESTED_LINES_KEYS = [
  'violenceAnimals',
  'suicide',
  'claustrophobia',
  'spidersInsects',
  'cannibalism',
  'lossOfControl',
] as const;

const SUGGESTED_VEILS_KEYS = [
  'bodyHorror',
  'surgeriesAmputation',
  'ritualsBlood',
  'claustrophobia',
  'spidersInsects',
] as const;

export function SessionZeroModal({
  open,
  onClose,
  onComplete,
  adventureContext,
}: SessionZeroModalProps) {
  const t = useTranslations('SessionZeroModal');
  const narrativeModeNames: Record<string, string> = {
    full_rpg: t('modeFullRpgName'),
    story_priority: t('modeStoryPriorityName'),
    pure_narrative: t('modePureNarrativeName'),
  };
  const narrativeModeDescriptions: Record<string, string> = {
    full_rpg: t('modeFullRpgDescription'),
    story_priority: t('modeStoryPriorityDescription'),
    pure_narrative: t('modePureNarrativeDescription'),
  };
  const difficultyNames: Record<string, string> = {
    easy: t('difficultyEasyName'),
    normal: t('difficultyNormalName'),
    hard: t('difficultyHardName'),
    deadly: t('difficultyDeadlyName'),
  };
  const difficultyDescriptions: Record<string, string> = {
    easy: t('difficultyEasyDescription'),
    normal: t('difficultyNormalDescription'),
    hard: t('difficultyHardDescription'),
    deadly: t('difficultyDeadlyDescription'),
  };
  const defaultLines = [
    t('defaultLineViolenceChildren'),
    t('defaultLineSexualViolence'),
  ];
  const defaultVeils = [t('defaultVeilTortures'), t('defaultVeilInjuries')];

  const [step, setStep] = useState(1);

  // Era sugerowana z przygody (ale gracz może ją zmienić)
  const suggestedEra = adventureContext?.era || 'classic';
  const suggestedTone = adventureContext?.tone || 'purist';

  const [settings, setSettings] = useState<SessionZeroSettings>({
    era: suggestedEra,
    tone: suggestedTone,
    narrativeMode: 'full_rpg',
    difficulty: adventureContext?.difficulty || 'normal',
    lines: [...defaultLines],
    veils: [...defaultVeils],
    // Krok "słowo bezpieczeństwa" usunięty z UI (decyzja produktowa).
    // Pusty string wyłącza instrukcję pauzy w prompcie (guard w
    // session-zero-instructions.ts: `if (sessionZero.safetyWord)`).
    safetyWord: '',
    playerName: '',
    completed: false,
  });
  const [newLine, setNewLine] = useState('');
  const [newVeil, setNewVeil] = useState('');

  // Załaduj wcześniej zapisane ustawienia. Gdy wybrano przygodę, jej
  // era/tone/difficulty mają PRIORYTET nad cache z poprzedniej gry - inaczej
  // gracz dostaje stary classic/purist mimo wyboru np. modern/pulp i musi
  // przestawiać ręcznie. Z cache zostają tylko user-specific: lines, veils,
  // safetyWord, playerName, narrativeMode.
  useEffect(() => {
    if (open) {
      // Zawsze zaczynamy od kroku 1. Wartości z poprzedniej sesji (lines, veils,
      // playerName, narrativeMode) są wstępnie wczytane jako domyślne, ale gracz
      // przechodzi kreator od początku i sam je potwierdza. Wcześniej modal po
      // ukończeniu skakał na krok 3 (podsumowanie) i NIE resetował kroku przy
      // ponownym otwarciu - przez co przy nowym wyborze przygody gracz lądował
      // od razu na kroku 3 z „wybranymi za niego" pierwszymi krokami.
      setStep(1);

      const aiSettings = loadAISettings();
      if (aiSettings.sessionZero) {
        // Fallback dla starszych zapisów bez narrativeMode
        const loaded = aiSettings.sessionZero as SessionZeroSettings & {
          playstyle?: string;
        };
        setSettings({
          ...loaded,
          // Nowa sesja: `completed` zaczyna od false, gracz musi domknąć kreator.
          completed: false,
          narrativeMode:
            loaded.narrativeMode ||
            (loaded.playstyle === 'storytelling'
              ? 'story_priority'
              : 'full_rpg'),
          ...(adventureContext
            ? {
                era: adventureContext.era,
                tone: adventureContext.tone ?? loaded.tone,
                difficulty: adventureContext.difficulty ?? loaded.difficulty,
              }
            : {}),
        });
      }
    }
  }, [open, adventureContext]);

  const handleComplete = () => {
    const completedSettings = { ...settings, completed: true };

    // Zapisz do AI Settings
    const aiSettings = loadAISettings();
    const updatedSettings: AISettings = {
      ...aiSettings,
      sessionZero: completedSettings,
    };
    saveAISettings(updatedSettings);

    onComplete(completedSettings);
    onClose();
  };

  const totalSteps = 3;

  const STEP_LABELS = [t('step1Label'), t('step2Label'), t('step3Label')];

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-8">
            {/* Nagłówek kroku */}
            <div>
              <div className="font-display text-xl font-semibold uppercase tracking-[0.1em] text-brass">
                {t('step1Header')}
              </div>
              <p className="mt-1 font-serif text-lg italic text-muted-foreground">
                {t('step1Intro')}
              </p>
            </div>

            {/* Tryb narracji */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2 font-special-elite text-xs uppercase tracking-[0.16em] text-brass">
                {t('narrativeModeLabel')}
                <HelpIcon content={t('narrativeModeHelp')} />
              </Label>
              <div className="grid grid-cols-3 gap-4">
                {NARRATIVE_MODES.map((mode) => {
                  const isSelected = settings.narrativeMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      onClick={() =>
                        setSettings({
                          ...settings,
                          narrativeMode:
                            mode.id as SessionZeroSettings['narrativeMode'],
                        })
                      }
                      className={`relative p-4 text-left transition-all ${
                        isSelected
                          ? 'border border-primary bg-[#0e1413] shadow-[0_0_14px_rgba(13,148,136,0.18)]'
                          : 'border border-brass/28 bg-[#16130f] hover:border-brass/55'
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute left-2 top-2 h-3 w-3 border-l-2 border-t-2 border-primary/60" />
                      )}
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-2xl">{mode.icon}</span>
                        <span className="font-display text-sm font-semibold uppercase tracking-[0.06em] text-foreground">
                          {narrativeModeNames[mode.id]}
                        </span>
                      </div>
                      <p className="font-serif text-base italic text-muted-foreground">
                        {narrativeModeDescriptions[mode.id]}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Trudność */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2 font-special-elite text-xs uppercase tracking-[0.16em] text-brass">
                {t('difficultyLevelLabel')}
                <HelpIcon content={t('difficultyLevelHelp')} />
              </Label>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {DIFFICULTIES.map((diff) => {
                  const isSelected = settings.difficulty === diff.id;
                  return (
                    <button
                      key={diff.id}
                      onClick={() =>
                        setSettings({
                          ...settings,
                          difficulty:
                            diff.id as SessionZeroSettings['difficulty'],
                        })
                      }
                      className={`relative p-3 text-center transition-all ${
                        isSelected
                          ? 'border border-primary bg-[#0e1413] shadow-[0_0_14px_rgba(13,148,136,0.18)]'
                          : 'border border-brass/28 bg-[#16130f] hover:border-brass/55'
                      }`}
                      title={difficultyDescriptions[diff.id]}
                    >
                      <span className="mb-1 block text-xl">{diff.icon}</span>
                      <span className="block font-special-elite text-xs uppercase tracking-[0.1em] text-foreground">
                        {difficultyNames[diff.id]}
                      </span>
                      <span className="mt-1 block font-serif text-sm italic leading-snug text-muted-foreground">
                        {difficultyDescriptions[diff.id]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-8">
            {/* Nagłówek kroku */}
            <div>
              <div className="font-display text-xl font-semibold uppercase tracking-[0.1em] text-brass">
                {t('step2Header')}
              </div>
              <p className="mt-1 font-serif text-lg italic text-muted-foreground">
                {t('step2Intro')}
              </p>
            </div>

            {/* Wyjaśnienie */}
            <div className="relative border border-brass/30 bg-card p-5">
              <span className="absolute left-2 top-2 h-3 w-3 border-l-[1.5px] border-t-[1.5px] border-brass/50" />
              <p className="mb-2 font-serif text-base italic text-muted-foreground">
                <strong className="font-special-elite text-xs uppercase tracking-[0.12em] not-italic text-destructive">
                  {t('linesTerm')}
                </strong>{' '}
                {t('linesExplainer')}
              </p>
              <p className="font-serif text-base italic text-muted-foreground">
                <strong className="font-special-elite text-xs uppercase tracking-[0.12em] not-italic text-brass">
                  {t('veilsTerm')}
                </strong>{' '}
                {t('veilsExplainer')}
              </p>
            </div>

            {/* Linie */}
            <div className="relative space-y-3 border border-destructive/30 bg-card p-5">
              <span className="absolute left-2 top-2 h-3 w-3 border-l-[1.5px] border-t-[1.5px] border-destructive/45" />
              <Label className="flex items-center gap-2 font-special-elite text-xs uppercase tracking-[0.16em] text-destructive">
                {t('linesSectionLabel')}
              </Label>
              <div className="flex flex-wrap gap-2">
                {settings.lines.map((line, idx) => (
                  <span
                    key={idx}
                    className="flex items-center gap-2 border border-destructive/40 bg-destructive/10 px-3 py-1 font-special-elite text-xs uppercase tracking-[0.08em] text-destructive"
                  >
                    {line}
                    <button
                      onClick={() =>
                        setSettings({
                          ...settings,
                          lines: settings.lines.filter((_, i) => i !== idx),
                        })
                      }
                      className="text-base leading-none hover:text-foreground"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newLine}
                  onChange={(e) => setNewLine(e.target.value)}
                  placeholder={t('lineInputPlaceholder')}
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newLine.trim()) {
                      setSettings({
                        ...settings,
                        lines: [...settings.lines, newLine.trim()],
                      });
                      setNewLine('');
                    }
                  }}
                />
                <Button
                  onClick={() => {
                    if (newLine.trim()) {
                      setSettings({
                        ...settings,
                        lines: [...settings.lines, newLine.trim()],
                      });
                      setNewLine('');
                    }
                  }}
                  variant="outline"
                  size="sm"
                >
                  {t('addButton')}
                </Button>
              </div>

              {/* Sugerowane tagi dla Linii */}
              <div className="pt-1">
                <div className="mb-1.5 font-special-elite text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                  {t('suggestedLinesLabel')}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_LINES_KEYS.map((key) => {
                    const tag = t(key);
                    const isAdded = settings.lines.includes(tag);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          if (isAdded) {
                            setSettings({
                              ...settings,
                              lines: settings.lines.filter((l) => l !== tag),
                            });
                          } else {
                            setSettings({
                              ...settings,
                              lines: [...settings.lines, tag],
                            });
                          }
                        }}
                        className={`px-2.5 py-1 rounded-none font-special-elite text-xs tracking-wider transition-colors border cursor-pointer ${
                          isAdded
                            ? 'border-destructive/70 bg-destructive/20 text-destructive'
                            : 'border-brass/25 bg-black/40 text-muted-foreground hover:border-destructive/50 hover:text-destructive'
                        }`}
                        title={isAdded ? `Usuń: ${tag}` : `Dodaj: ${tag}`}
                      >
                        {isAdded ? `✓ ${tag}` : `+ ${tag}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Zasłony */}
            <div className="relative space-y-3 border border-brass/30 bg-card p-5">
              <span className="absolute left-2 top-2 h-3 w-3 border-l-[1.5px] border-t-[1.5px] border-brass/50" />
              <Label className="flex items-center gap-2 font-special-elite text-xs uppercase tracking-[0.16em] text-brass">
                {t('veilsSectionLabel')}
              </Label>
              <div className="flex flex-wrap gap-2">
                {settings.veils.map((veil, idx) => (
                  <span
                    key={idx}
                    className="flex items-center gap-2 border border-brass/40 bg-brass/10 px-3 py-1 font-special-elite text-xs uppercase tracking-[0.08em] text-brass"
                  >
                    {veil}
                    <button
                      onClick={() =>
                        setSettings({
                          ...settings,
                          veils: settings.veils.filter((_, i) => i !== idx),
                        })
                      }
                      className="text-base leading-none hover:text-foreground"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newVeil}
                  onChange={(e) => setNewVeil(e.target.value)}
                  placeholder={t('veilInputPlaceholder')}
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newVeil.trim()) {
                      setSettings({
                        ...settings,
                        veils: [...settings.veils, newVeil.trim()],
                      });
                      setNewVeil('');
                    }
                  }}
                />
                <Button
                  onClick={() => {
                    if (newVeil.trim()) {
                      setSettings({
                        ...settings,
                        veils: [...settings.veils, newVeil.trim()],
                      });
                      setNewVeil('');
                    }
                  }}
                  variant="outline"
                  size="sm"
                >
                  {t('addButton')}
                </Button>
              </div>

              {/* Sugerowane tagi dla Zasłon */}
              <div className="pt-1">
                <div className="mb-1.5 font-special-elite text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                  {t('suggestedVeilsLabel')}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_VEILS_KEYS.map((key) => {
                    const tag = t(key);
                    const isAdded = settings.veils.includes(tag);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          if (isAdded) {
                            setSettings({
                              ...settings,
                              veils: settings.veils.filter((v) => v !== tag),
                            });
                          } else {
                            setSettings({
                              ...settings,
                              veils: [...settings.veils, tag],
                            });
                          }
                        }}
                        className={`px-2.5 py-1 rounded-none font-special-elite text-xs tracking-wider transition-colors border cursor-pointer ${
                          isAdded
                            ? 'border-brass/70 bg-brass/20 text-brass'
                            : 'border-brass/25 bg-black/40 text-muted-foreground hover:border-brass/50 hover:text-brass'
                        }`}
                        title={isAdded ? `Usuń: ${tag}` : `Dodaj: ${tag}`}
                      >
                        {isAdded ? `✓ ${tag}` : `+ ${tag}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Wskazówka Strażnika */}
            <div className="flex items-center gap-3 border-l-2 border-primary/50 bg-primary/[0.06] px-4 py-3">
              <span className="text-primary">𓂀</span>
              <div className="font-serif text-base italic text-muted-foreground">
                {t('keeperTip')}
              </div>
            </div>
          </div>
        );

      case 3:
        // Podsumowanie
        return (
          <div className="space-y-8">
            {/* Nagłówek kroku */}
            <div className="text-center">
              <div className="font-special-elite text-xs uppercase tracking-[0.3em] text-primary">
                {t('step3Kicker')}
              </div>
              <h3 className="mt-1 font-display-decorative text-2xl font-black uppercase tracking-[0.12em] text-foreground">
                {t('step3Title')}
              </h3>
              <p className="mt-1 font-serif text-lg italic text-muted-foreground">
                {t('step3Subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="relative border border-brass/30 bg-card p-5">
                <span className="absolute left-2 top-2 h-3 w-3 border-l-[1.5px] border-t-[1.5px] border-brass/50" />
                <div className="font-special-elite text-xs uppercase tracking-[0.16em] text-brass">
                  {t('summaryDifficulty')}
                </div>
                <p className="mt-2 font-display text-lg font-semibold uppercase tracking-[0.06em] text-foreground">
                  {difficultyNames[settings.difficulty]}
                </p>
              </div>

              <div className="relative border border-brass/30 bg-card p-5">
                <span className="absolute left-2 top-2 h-3 w-3 border-l-[1.5px] border-t-[1.5px] border-brass/50" />
                <div className="font-special-elite text-xs uppercase tracking-[0.16em] text-brass">
                  {t('summaryNarrativeMode')}
                </div>
                <p className="mt-2 font-display text-lg font-semibold uppercase tracking-[0.06em] text-foreground">
                  {narrativeModeNames[settings.narrativeMode]}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="relative border border-destructive/30 bg-card p-4 space-y-2">
                <span className="absolute left-2 top-2 h-3 w-3 border-l-[1.5px] border-t-[1.5px] border-destructive/45" />
                <div className="font-special-elite text-xs uppercase tracking-[0.14em] text-destructive">
                  {t('linesColon')}
                </div>
                {settings.lines.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {settings.lines.map((line, idx) => (
                      <span
                        key={idx}
                        className="border border-destructive/40 bg-destructive/10 px-3 py-1 font-special-elite text-xs uppercase tracking-[0.08em] text-destructive"
                      >
                        {line}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="font-serif italic text-muted-foreground">{t('none')}</p>
                )}
              </div>

              <div className="relative border border-brass/30 bg-card p-4 space-y-2">
                <span className="absolute left-2 top-2 h-3 w-3 border-l-[1.5px] border-t-[1.5px] border-brass/50" />
                <div className="font-special-elite text-xs uppercase tracking-[0.14em] text-brass">
                  {t('veilsColon')}
                </div>
                {settings.veils.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {settings.veils.map((veil, idx) => (
                      <span
                        key={idx}
                        className="border border-brass/40 bg-brass/10 px-3 py-1 font-special-elite text-xs uppercase tracking-[0.08em] text-brass"
                      >
                        {veil}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="font-serif italic text-muted-foreground">{t('none')}</p>
                )}
              </div>
            </div>

            <div className="flex justify-center gap-4 text-xs font-special-elite">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-brass/80 hover:text-brass underline uppercase tracking-wider cursor-pointer"
              >
                {t('backToStep1')}
              </button>
              <span className="text-brass/40">·</span>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-brass/80 hover:text-brass underline uppercase tracking-wider cursor-pointer"
              >
                {t('backToStep2')}
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent size="screen">
        <DialogHeader className="text-center sm:text-center">
          <div className="font-special-elite text-xs uppercase tracking-[0.3em] text-primary">
            {t('headerKicker')}
          </div>
          <DialogTitle className="mt-1 justify-center text-center font-display-decorative text-3xl font-black uppercase tracking-[0.12em] text-foreground">
            {t('dialogTitle')}
          </DialogTitle>
          <DialogDescription className="text-center font-serif text-base italic text-muted-foreground">
            {t('dialogDescription')}
          </DialogDescription>
        </DialogHeader>

        {/* Separator déco */}
        <div className="mt-3 flex items-center gap-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gold" />
          <span className="h-2 w-2 rotate-45 bg-brass" />
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gold" />
        </div>

        {/* Wskaźnik kroków déco */}
        <div className="mb-2 mt-5 flex items-center justify-between px-2">
          {STEP_LABELS.map((label, idx) => {
            const stepNum = idx + 1;
            const isActive = step === stepNum;
            const isDone = step > stepNum;
            return (
              <div key={label} className="contents">
                {idx > 0 && (
                  <div
                    className={`mb-5 -mx-2 h-px flex-1 transition-colors ${
                      step > idx ? 'bg-primary' : 'bg-brass/25'
                    }`}
                  />
                )}
                <button
                  type="button"
                  onClick={() => setStep(stepNum)}
                  className="flex w-36 flex-col items-center gap-2 cursor-pointer focus:outline-none group"
                >
                  <div
                    className={`flex items-center justify-center font-display text-base transition-all ${
                      isActive
                        ? 'h-11 w-11 border border-primary bg-primary font-bold text-[#04110f] shadow-[0_0_18px_rgba(13,148,136,0.5)]'
                        : isDone
                          ? 'h-10 w-10 border border-primary bg-primary/12 text-primary group-hover:border-primary/50'
                          : 'h-10 w-10 border border-brass/40 text-muted-foreground group-hover:border-brass/70'
                    }`}
                  >
                    {isDone ? '✓' : stepNum}
                  </div>
                  <div
                    className={`text-center font-special-elite text-xs uppercase tracking-[0.08em] ${
                      isActive
                        ? 'text-primary'
                        : isDone
                          ? 'text-muted-foreground group-hover:text-foreground'
                          : 'text-muted-foreground/60 group-hover:text-muted-foreground'
                    }`}
                  >
                    {label}
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {renderStep()}

        {/* Sticky Navigation Footer */}
        {step <= totalSteps && (
          <div className="sticky bottom-0 -mb-6 -mx-6 px-6 py-4 mt-8 flex items-center justify-between border-t border-brass/30 bg-card/95 backdrop-blur-md z-30 shadow-[0_-8px_20px_rgba(0,0,0,0.4)]">
            <Button
              variant="outline"
              onClick={() => (step > 1 ? setStep(step - 1) : onClose())}
            >
              {step === 1 ? t('cancelNav') : t('backNav')}
            </Button>

            <div className="font-special-elite text-xs uppercase tracking-[0.1em] text-muted-foreground">
              {t('stepCounter', { step, total: totalSteps })}
            </div>

            <Button
              onClick={() => {
                if (step < totalSteps) {
                  setStep(step + 1);
                } else {
                  handleComplete();
                }
              }}
            >
              {step === totalSteps ? t('finishAndSaveNav') : t('nextNav')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export type { SessionZeroSettings };
