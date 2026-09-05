'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { Textarea } from './textarea';
import { HelpIcon } from './tooltip';
import {
  saveAISettings,
  loadAISettings,
  AISettings,
  type SessionZeroSettings,
  type SessionZeroAnchors,
  type EraFilterMode,
} from '@/lib/ai-settings';
import { AdventureContext } from '@/lib/adventures-data';
import type { Character } from '@/lib/types';

interface SessionZeroModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: (settings: SessionZeroSettings) => void;
  adventureContext?: AdventureContext;
  activeCharacter?: Character | null;
}

const TONES = [
  {
    id: 'purist',
    icon: '🐙',
  },
  {
    id: 'pulp',
    icon: '💥',
  },
  {
    id: 'noir',
    icon: '🕵️',
  },
] as const;

const NARRATIVE_MODES = [
  {
    id: 'full_rpg',
    icon: '🎲',
  },
  {
    id: 'story_priority',
    icon: '📖',
  },
  {
    id: 'pure_narrative',
    icon: '✨',
  },
] as const;

const SUGGESTED_HOOK_KEYS = [
  'hookJob',
  'hookFamily',
  'hookAcademic',
  'hookDebt',
  'hookAccident',
] as const;

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
  activeCharacter,
}: SessionZeroModalProps) {
  const t = useTranslations('SessionZeroModal');

  const toneNames: Record<string, string> = {
    purist: t('tonePuristName'),
    pulp: t('tonePulpName'),
    noir: t('toneNoirName'),
  };
  const toneDescriptions: Record<string, string> = {
    purist: t('tonePuristDescription'),
    pulp: t('tonePulpDescription'),
    noir: t('toneNoirDescription'),
  };

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

  const defaultLines = useMemo(
    () => [t('defaultLineViolenceChildren'), t('defaultLineSexualViolence')],
    [t]
  );
  const defaultVeils = useMemo(
    () => [t('defaultVeilTortures'), t('defaultVeilInjuries')],
    [t]
  );

  const [step, setStep] = useState(1);

  const suggestedEra = adventureContext?.era || 'classic';
  const suggestedTone = (adventureContext?.tone as SessionZeroSettings['tone']) || 'purist';

  const [settings, setSettings] = useState<SessionZeroSettings>({
    era: suggestedEra,
    tone: suggestedTone,
    narrativeMode: 'full_rpg',
    difficulty: adventureContext?.difficulty || 'normal',
    lines: [...defaultLines],
    veils: [...defaultVeils],
    safetyWord: '',
    playerName: '',
    completed: false,
    briefing: '',
    investigatorHook: '',
    anchors: {
      keyConnection: '',
      importantPlace: '',
      treasuredItem: '',
    },
    eraFilter: 'authentic_1920s',
  });

  const [newLine, setNewLine] = useState('');
  const [newVeil, setNewVeil] = useState('');

  useEffect(() => {
    if (open) {
      setStep(1);

      const aiSettings = loadAISettings();
      const loaded = (aiSettings.sessionZero || {}) as Partial<SessionZeroSettings> & {
        playstyle?: string;
      };

      const defaultBriefing =
        loaded.briefing ||
        adventureContext?.hook ||
        adventureContext?.description ||
        '';

      const defaultHook =
        loaded.investigatorHook ||
        activeCharacter?.characterConcept ||
        '';

      const defaultAnchors: SessionZeroAnchors = {
        keyConnection:
          loaded.anchors?.keyConnection ||
          activeCharacter?.significantPerson ||
          '',
        importantPlace:
          loaded.anchors?.importantPlace ||
          activeCharacter?.meaningfulLocation ||
          '',
        treasuredItem:
          loaded.anchors?.treasuredItem ||
          activeCharacter?.treasuredPossession ||
          '',
      };

      const defaultEraFilter: EraFilterMode =
        loaded.eraFilter || 'authentic_1920s';

      setSettings({
        era: adventureContext?.era || loaded.era || 'classic',
        tone: (adventureContext?.tone as SessionZeroSettings['tone']) ?? loaded.tone ?? 'purist',
        narrativeMode:
          loaded.narrativeMode ||
          (loaded.playstyle === 'storytelling'
            ? 'story_priority'
            : 'full_rpg'),
        difficulty: loaded.difficulty || adventureContext?.difficulty || 'normal',
        lines: loaded.lines && loaded.lines.length > 0 ? loaded.lines : [...defaultLines],
        veils: loaded.veils && loaded.veils.length > 0 ? loaded.veils : [...defaultVeils],
        safetyWord: loaded.safetyWord || '',
        playerName: activeCharacter?.playerName || loaded.playerName || '',
        completed: false,
        briefing: defaultBriefing,
        investigatorHook: defaultHook,
        anchors: defaultAnchors,
        eraFilter: defaultEraFilter,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, adventureContext, activeCharacter]);

  const handleComplete = () => {
    const completedSettings: SessionZeroSettings = { ...settings, completed: true };

    const aiSettings = loadAISettings();
    const updatedSettings: AISettings = {
      ...aiSettings,
      sessionZero: completedSettings,
    };
    saveAISettings(updatedSettings);

    onComplete(completedSettings);
    onClose();
  };

  const totalSteps = 4;
  const STEP_LABELS = [
    t('step1Label'),
    t('step2Label'),
    t('step3Label'),
    t('step4Label'),
  ];

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-8">
            <div>
              <div className="font-display text-xl font-semibold uppercase tracking-[0.1em] text-brass">
                {t('step1Header')}
              </div>
              <p className="mt-1 font-serif text-lg italic text-muted-foreground">
                {t('step1Intro')}
              </p>
            </div>

            {/* Konwencja opowieści */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2 font-special-elite text-xs uppercase tracking-[0.16em] text-brass">
                {t('conventionSectionLabel')}
                <HelpIcon content={t('conventionSectionHelp')} />
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {TONES.map((tn) => {
                  const isSelected = settings.tone === tn.id;
                  return (
                    <button
                      key={tn.id}
                      type="button"
                      onClick={() =>
                        setSettings({
                          ...settings,
                          tone: tn.id as SessionZeroSettings['tone'],
                        })
                      }
                      className={`relative p-4 text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border border-primary bg-[#0e1413] shadow-[0_0_14px_rgba(13,148,136,0.18)]'
                          : 'border border-brass/28 bg-[#16130f] hover:border-brass/55'
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute left-2 top-2 h-3 w-3 border-l-2 border-t-2 border-primary/60" />
                      )}
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-2xl">{tn.icon}</span>
                        <span className="font-display text-sm font-semibold uppercase tracking-[0.06em] text-foreground">
                          {toneNames[tn.id]}
                        </span>
                      </div>
                      <p className="font-serif text-sm italic text-muted-foreground">
                        {toneDescriptions[tn.id]}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tryb narracji */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2 font-special-elite text-xs uppercase tracking-[0.16em] text-brass">
                {t('narrativeModeLabel')}
                <HelpIcon content={t('narrativeModeHelp')} />
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {NARRATIVE_MODES.map((mode) => {
                  const isSelected = settings.narrativeMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() =>
                        setSettings({
                          ...settings,
                          narrativeMode:
                            mode.id as SessionZeroSettings['narrativeMode'],
                        })
                      }
                      className={`relative p-4 text-left transition-all cursor-pointer ${
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
                      <p className="font-serif text-sm italic text-muted-foreground">
                        {narrativeModeDescriptions[mode.id]}
                      </p>
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
            <div>
              <div className="font-display text-xl font-semibold uppercase tracking-[0.1em] text-brass">
                {t('step2Header')}
              </div>
              <p className="mt-1 font-serif text-lg italic text-muted-foreground">
                {t('step2Intro')}
              </p>
            </div>

            {/* Karta Odprawy */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 font-special-elite text-xs uppercase tracking-[0.16em] text-brass">
                {t('briefingSectionLabel')}
                <HelpIcon content={t('briefingSectionHelp')} />
              </Label>
              <Textarea
                value={settings.briefing || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    briefing: e.target.value,
                  })
                }
                placeholder={t('briefingPlaceholder')}
                rows={4}
                className="w-full font-serif text-sm bg-black/40 border-brass/30 focus:border-brass text-foreground"
              />
            </div>

            {/* Haczyk Badacza */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 font-special-elite text-xs uppercase tracking-[0.16em] text-brass">
                {t('hookSectionLabel')}
                <HelpIcon content={t('hookSectionHelp')} />
              </Label>
              <Textarea
                value={settings.investigatorHook || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    investigatorHook: e.target.value,
                  })
                }
                placeholder={t('hookPlaceholder')}
                rows={2}
                className="w-full font-serif text-sm bg-black/40 border-brass/30 focus:border-brass text-foreground"
              />

              {/* Sugerowane haczyki */}
              <div className="pt-1">
                <div className="mb-1.5 font-special-elite text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                  {t('suggestedHooksLabel')}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_HOOK_KEYS.map((key) => {
                    const text = t(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          setSettings({
                            ...settings,
                            investigatorHook: text,
                          })
                        }
                        className="px-2.5 py-1 rounded-none font-special-elite text-xs tracking-wider border border-brass/25 bg-black/40 text-muted-foreground hover:border-brass/60 hover:text-brass transition-colors cursor-pointer"
                      >
                        + {text}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-8">
            <div>
              <div className="font-display text-xl font-semibold uppercase tracking-[0.1em] text-brass">
                {t('step3Header')}
              </div>
              <p className="mt-1 font-serif text-lg italic text-muted-foreground">
                {t('step3Intro')}
              </p>
            </div>

            {/* Ważna Osoba */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 font-special-elite text-xs uppercase tracking-[0.16em] text-brass">
                {t('keyConnectionLabel')}
                <HelpIcon content={t('keyConnectionHelp')} />
              </Label>
              <Input
                value={settings.anchors?.keyConnection || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    anchors: {
                      ...settings.anchors,
                      keyConnection: e.target.value,
                    },
                  })
                }
                placeholder={t('keyConnectionPlaceholder')}
                className="font-serif text-sm bg-black/40 border-brass/30 focus:border-brass text-foreground"
              />
            </div>

            {/* Znaczące Miejsce */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 font-special-elite text-xs uppercase tracking-[0.16em] text-brass">
                {t('importantPlaceLabel')}
                <HelpIcon content={t('importantPlaceHelp')} />
              </Label>
              <Input
                value={settings.anchors?.importantPlace || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    anchors: {
                      ...settings.anchors,
                      importantPlace: e.target.value,
                    },
                  })
                }
                placeholder={t('importantPlacePlaceholder')}
                className="font-serif text-sm bg-black/40 border-brass/30 focus:border-brass text-foreground"
              />
            </div>

            {/* Cenny Przedmiot */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 font-special-elite text-xs uppercase tracking-[0.16em] text-brass">
                {t('treasuredItemLabel')}
                <HelpIcon content={t('treasuredItemHelp')} />
              </Label>
              <Input
                value={settings.anchors?.treasuredItem || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    anchors: {
                      ...settings.anchors,
                      treasuredItem: e.target.value,
                    },
                  })
                }
                placeholder={t('treasuredItemPlaceholder')}
                className="font-serif text-sm bg-black/40 border-brass/30 focus:border-brass text-foreground"
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-8">
            <div>
              <div className="font-display text-xl font-semibold uppercase tracking-[0.1em] text-brass">
                {t('step4Header')}
              </div>
              <p className="mt-1 font-serif text-lg italic text-muted-foreground">
                {t('step4Intro')}
              </p>
            </div>

            {/* Filtr epoki lat 20. */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2 font-special-elite text-xs uppercase tracking-[0.16em] text-brass">
                {t('eraFilterSectionLabel')}
                <HelpIcon content={t('eraFilterSectionHelp')} />
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() =>
                    setSettings({
                      ...settings,
                      eraFilter: 'authentic_1920s',
                    })
                  }
                  className={`p-4 text-left transition-all cursor-pointer ${
                    settings.eraFilter === 'authentic_1920s'
                      ? 'border border-primary bg-[#0e1413] shadow-[0_0_14px_rgba(13,148,136,0.18)]'
                      : 'border border-brass/28 bg-[#16130f] hover:border-brass/55'
                  }`}
                >
                  <div className="font-display text-sm font-semibold uppercase tracking-[0.06em] text-foreground">
                    {t('eraFilterAuthenticName')}
                  </div>
                  <p className="mt-1 font-serif text-xs italic text-muted-foreground">
                    {t('eraFilterAuthenticDesc')}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setSettings({
                      ...settings,
                      eraFilter: 'modern_sensibilities',
                    })
                  }
                  className={`p-4 text-left transition-all cursor-pointer ${
                    settings.eraFilter === 'modern_sensibilities'
                      ? 'border border-primary bg-[#0e1413] shadow-[0_0_14px_rgba(13,148,136,0.18)]'
                      : 'border border-brass/28 bg-[#16130f] hover:border-brass/55'
                  }`}
                >
                  <div className="font-display text-sm font-semibold uppercase tracking-[0.06em] text-foreground">
                    {t('eraFilterModernName')}
                  </div>
                  <p className="mt-1 font-serif text-xs italic text-muted-foreground">
                    {t('eraFilterModernDesc')}
                  </p>
                </button>
              </div>
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
                      type="button"
                      onClick={() =>
                        setSettings({
                          ...settings,
                          lines: settings.lines.filter((_, i) => i !== idx),
                        })
                      }
                      className="text-base leading-none hover:text-foreground cursor-pointer"
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
                  type="button"
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
                      type="button"
                      onClick={() =>
                        setSettings({
                          ...settings,
                          veils: settings.veils.filter((_, i) => i !== idx),
                        })
                      }
                      className="text-base leading-none hover:text-foreground cursor-pointer"
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
                  type="button"
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

            {/* Podsumowanie ustaleń */}
            <div className="relative border border-primary/40 bg-card p-5 space-y-4">
              <span className="absolute left-2 top-2 h-3 w-3 border-l-[1.5px] border-t-[1.5px] border-primary/60" />
              <div className="text-center">
                <div className="font-special-elite text-xs uppercase tracking-[0.3em] text-primary">
                  {t('step3Kicker')}
                </div>
                <h3 className="mt-1 font-display-decorative text-xl font-black uppercase tracking-[0.12em] text-foreground">
                  {t('step3Title')}
                </h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-2 border border-brass/20 bg-black/30">
                  <span className="font-special-elite text-brass/70 uppercase block">{t('summaryConvention')}</span>
                  <span className="font-display font-medium text-foreground">{toneNames[settings.tone]}</span>
                </div>
                <div className="p-2 border border-brass/20 bg-black/30">
                  <span className="font-special-elite text-brass/70 uppercase block">{t('summaryNarrativeMode')}</span>
                  <span className="font-display font-medium text-foreground">{narrativeModeNames[settings.narrativeMode]}</span>
                </div>
                <div className="p-2 border border-brass/20 bg-black/30">
                  <span className="font-special-elite text-brass/70 uppercase block">{t('summaryKeyConnection')}</span>
                  <span className="font-display font-medium text-foreground truncate block">{settings.anchors?.keyConnection || t('none')}</span>
                </div>
                <div className="p-2 border border-brass/20 bg-black/30">
                  <span className="font-special-elite text-brass/70 uppercase block">{t('summaryEraFilter')}</span>
                  <span className="font-display font-medium text-foreground">
                    {settings.eraFilter === 'authentic_1920s' ? t('eraFilterAuthenticName') : t('eraFilterModernName')}
                  </span>
                </div>
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
              <span className="text-brass/40">·</span>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="text-brass/80 hover:text-brass underline uppercase tracking-wider cursor-pointer"
              >
                {t('backToStep3')}
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
