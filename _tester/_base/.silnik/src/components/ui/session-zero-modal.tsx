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
import { HelpIcon } from './tooltip';
import {
  saveAISettings,
  loadAISettings,
  AISettings,
  type SessionZeroSettings,
  type SessionZeroAnchors,
  type SessionZeroPlayerContext,
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
  onCharacterUpdate?: (character: Character) => void;
  playerCharacters?: Character[];
}

const SUGGESTED_LINES_KEYS = [
  'defaultLineViolenceChildren',
  'defaultLineSexualViolence',
  'violenceAnimals',
  'suicide',
  'claustrophobia',
  'spidersInsects',
  'cannibalism',
  'lossOfControl',
] as const;

const SUGGESTED_VEILS_KEYS = [
  'defaultVeilTortures',
  'defaultVeilInjuries',
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
  playerCharacters,
}: SessionZeroModalProps) {
  const t = useTranslations('SessionZeroModal');

  const suggestedEra = adventureContext?.era || 'classic';
  const initialRuleset: 'classic' | 'pulp' =
    activeCharacter?.rulesetVariant ||
    adventureContext?.rulesetVariant ||
    (adventureContext?.tone === 'pulp' ? 'pulp' : 'classic');
  const initialTone: SessionZeroSettings['tone'] = initialRuleset === 'pulp' ? 'pulp' : 'purist';

  const [settings, setSettings] = useState<SessionZeroSettings>({
    era: suggestedEra,
    tone: initialTone,
    narrativeMode: 'full_rpg',
    difficulty: adventureContext?.difficulty || 'normal',
    lines: [],
    veils: [],
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
    eraFilter: 'historical_realia',
    rulesetVariant: initialRuleset,
    pulpLevel: initialRuleset === 'pulp' ? 'medium' : undefined,
  });

  const partyCharacters = useMemo(
    () => (playerCharacters && playerCharacters.length > 0
      ? playerCharacters
      : activeCharacter
        ? [activeCharacter]
        : []),
    [activeCharacter, playerCharacters]
  );

  const buildPlayerContexts = (currentSettings: SessionZeroSettings): SessionZeroPlayerContext[] =>
    partyCharacters.map((character) => {
      const isActive = character.id === activeCharacter?.id;
      return {
        characterId: character.id,
        playerName: character.playerName || character.name,
        characterName: character.name,
        investigatorHook: isActive
          ? currentSettings.investigatorHook || character.characterConcept || undefined
          : character.characterConcept || undefined,
        anchors: isActive
          ? currentSettings.anchors
          : {
              keyConnection: character.significantPerson,
              importantPlace: character.meaningfulLocation,
              treasuredItem: character.treasuredPossession,
            },
      };
    });

  const [newLine, setNewLine] = useState('');
  const [newVeil, setNewVeil] = useState('');

  useEffect(() => {
    if (open) {
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

      const loadedEraFilter = loaded.eraFilter as string | undefined;
      const defaultEraFilter: EraFilterMode =
        loadedEraFilter === 'authentic_1920s'
          ? 'historical_realia'
          : loaded.eraFilter || 'historical_realia';

      const resolvedRuleset: 'classic' | 'pulp' =
        activeCharacter?.rulesetVariant ||
        adventureContext?.rulesetVariant ||
        (adventureContext?.tone === 'pulp' ? 'pulp' : 'classic');
      const effectiveTone: SessionZeroSettings['tone'] =
        resolvedRuleset === 'pulp' ? 'pulp' : 'purist';

      setSettings({
        era: adventureContext?.era || loaded.era || 'classic',
        tone: effectiveTone,
        narrativeMode:
          loaded.narrativeMode ||
          (loaded.playstyle === 'storytelling'
            ? 'story_priority'
            : 'full_rpg'),
        difficulty: loaded.difficulty || adventureContext?.difficulty || 'normal',
        lines: Array.isArray(loaded.lines) ? loaded.lines : [],
        veils: Array.isArray(loaded.veils) ? loaded.veils : [],
        safetyWord: loaded.safetyWord || '',
        playerName: activeCharacter?.playerName || loaded.playerName || '',
        completed: false,
        briefing: defaultBriefing,
        investigatorHook: defaultHook,
        anchors: defaultAnchors,
        eraFilter: defaultEraFilter,
        rulesetVariant: resolvedRuleset,
        pulpLevel: resolvedRuleset === 'pulp' ? (loaded.pulpLevel || 'medium') : undefined,
        players: partyCharacters.map((character) => ({
          characterId: character.id,
          playerName: character.playerName || character.name,
          characterName: character.name,
          investigatorHook: character.characterConcept || undefined,
          anchors: {
            keyConnection: character.significantPerson,
            importantPlace: character.meaningfulLocation,
            treasuredItem: character.treasuredPossession,
          },
        })),
      });
    }
  }, [open, adventureContext, activeCharacter, partyCharacters]);

  const handleComplete = () => {
    const completedSettings: SessionZeroSettings = {
      ...settings,
      completed: true,
      players: buildPlayerContexts(settings),
    };

    const aiSettings = loadAISettings();
    const updatedSettings: AISettings = {
      ...aiSettings,
      sessionZero: completedSettings,
    };
    saveAISettings(updatedSettings);

    onComplete(completedSettings);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent size="screen" className="flex flex-col h-screen max-h-screen">
        <DialogHeader className="text-center sm:text-center shrink-0 pt-6 px-6">
          <div className="font-special-elite text-xs uppercase tracking-[0.3em] text-primary">
            {t('headerKicker')}
          </div>
          <DialogTitle className="mt-1 justify-center text-center font-display-decorative text-3xl font-black uppercase tracking-[0.12em] text-foreground">
            {t('dialogTitle')}
          </DialogTitle>
          <DialogDescription className="text-center font-serif text-base italic text-muted-foreground">
            {t('dialogDescription')}
          </DialogDescription>

          {/* Separator déco */}
          <div className="mt-4 flex items-center gap-4 max-w-4xl mx-auto w-full">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gold" />
            <span className="h-2 w-2 rotate-45 bg-brass" />
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gold" />
          </div>
        </DialogHeader>

        {/* Główna zawartość */}
        <div className="flex-1 overflow-y-auto px-6 py-6 max-w-5xl mx-auto w-full space-y-8">
          <div>
            <div className="font-display text-xl font-semibold uppercase tracking-[0.1em] text-brass">
              {t('boundariesHeader')}
            </div>
            <p className="mt-1 font-serif text-base md:text-lg italic text-muted-foreground">
              {t('boundariesIntro')}
            </p>
          </div>

          {/* Filtr epoki */}
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
                    eraFilter: 'historical_realia',
                  })
                }
                className={`p-4 text-left transition-all cursor-pointer ${
                  settings.eraFilter === 'historical_realia'
                    ? 'border border-primary bg-[#0e1413] shadow-[0_0_14px_rgba(13,148,136,0.18)]'
                    : 'border border-brass/28 bg-[#16130f] hover:border-brass/55'
                }`}
              >
                <div className="font-display text-sm font-semibold uppercase tracking-[0.06em] text-foreground">
                  {t('eraFilterHistoricalName')}
                </div>
                <p className="mt-1 font-serif text-xs italic text-muted-foreground">
                  {t('eraFilterHistoricalDesc')}
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
            {settings.lines.length > 0 && (
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
            )}
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
            {settings.veils.length > 0 && (
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
            )}
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
        </div>

        {/* Dolna belka nawigacji */}
        <div className="shrink-0 px-6 py-4 border-t border-brass/30 bg-card/95 backdrop-blur-md z-30 shadow-[0_-8px_20px_rgba(0,0,0,0.4)]">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <Button
              variant="outline"
              onClick={onClose}
            >
              {t('cancelNav')}
            </Button>

            <Button
              onClick={handleComplete}
            >
              {t('saveSettingsNav')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export type { SessionZeroSettings };
