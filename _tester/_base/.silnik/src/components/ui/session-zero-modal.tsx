'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
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
import { Skull, Zap } from 'lucide-react';
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

const TONES = [
  {
    id: 'purist',
    icon: Skull,
  },
  {
    id: 'pulp',
    icon: Zap,
  },
] as const;

type BriefingDocType = 'telegram' | 'letter' | 'dossier';

const SUGGESTED_KEY_CONNECTIONS = [
  'anchorConnectionMentor',
  'anchorConnectionPartner',
  'anchorConnectionSibling',
  'anchorConnectionComrade',
  'anchorConnectionClient',
] as const;

const SUGGESTED_IMPORTANT_PLACES = [
  'anchorPlaceStudy',
  'anchorPlaceHome',
  'anchorPlaceLibrary',
  'anchorPlaceClub',
  'anchorPlaceHarbor',
] as const;

const SUGGESTED_TREASURED_ITEMS = [
  'anchorItemWatch',
  'anchorItemLocket',
  'anchorItemJournal',
  'anchorItemLighter',
  'anchorItemCoin',
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
  onCharacterUpdate,
  playerCharacters,
}: SessionZeroModalProps) {
  const t = useTranslations('SessionZeroModal');
  const locale = useLocale();

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
  const rawSuggestedTone =
    (adventureContext?.tone as SessionZeroSettings['tone']) || 'purist';
  const suggestedTone = rawSuggestedTone === 'noir' ? 'purist' : rawSuggestedTone;

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
    eraFilter: 'historical_realia',
    rulesetVariant: adventureContext?.rulesetVariant || (suggestedTone === 'pulp' ? 'pulp' : 'classic'),
    pulpLevel: suggestedTone === 'pulp' ? 'medium' : undefined,
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
  const [briefingDocType, setBriefingDocType] = useState<BriefingDocType>('telegram');

  useEffect(() => {
    if (open) {
      setStep(1);
      setBriefingDocType('telegram');

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

      const rawLoadedTone =
        (adventureContext?.tone as SessionZeroSettings['tone']) ??
        loaded.tone ??
        'purist';
      const effectiveTone = rawLoadedTone === 'noir' ? 'purist' : rawLoadedTone;

      setSettings({
        era: adventureContext?.era || loaded.era || 'classic',
        tone: effectiveTone,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, adventureContext, activeCharacter]);

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

  const totalSteps = 3;
  const STEP_LABELS = [
    t('step1Label'),
    t('step2Label'),
    t('step3Label'),
  ];

  const renderBriefingDocument = () => {
    switch (briefingDocType) {
      case 'telegram':
        return (
          <div className="relative border-2 border-yellow-800/40 bg-[#16130b] p-5 shadow-lg">
            {/* Kątowniki Art Déco */}
            <span className="absolute left-1.5 top-1.5 h-3 w-3 border-l-2 border-t-2 border-yellow-700/60" />
            <span className="absolute right-1.5 top-1.5 h-3 w-3 border-r-2 border-t-2 border-yellow-700/60" />
            <span className="absolute left-1.5 bottom-1.5 h-3 w-3 border-l-2 border-b-2 border-yellow-700/60" />
            <span className="absolute right-1.5 bottom-1.5 h-3 w-3 border-r-2 border-b-2 border-yellow-700/60" />

            {/* Nagłówek Western Union */}
            <div className="border-b-2 border-yellow-700/40 pb-3 text-center">
              <div className="flex items-center justify-between mb-1 text-[10px] font-special-elite text-yellow-600/70 tracking-widest uppercase">
                <span>FORM N° 1920-A</span>
                <span className="border border-destructive/70 bg-destructive/15 text-destructive px-1.5 py-0.5 font-bold tracking-widest rotate-[-2deg]">
                  {t('briefingStampUrgent')} · STOP
                </span>
                <span>NIGHT LETTER</span>
              </div>
              <div className="font-special-elite text-base sm:text-lg font-black tracking-[0.25em] text-yellow-500/90 uppercase">
                {t('telegramWesternUnion')}
              </div>
              <div className="font-special-elite text-[10px] tracking-[0.2em] text-yellow-600/80 uppercase mt-0.5">
                {t('telegramSubheader')}
              </div>
            </div>

            {/* Pasek metadanych depeszy */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-2.5 border-b border-yellow-800/30 text-xs font-special-elite text-yellow-400/80">
              <div>
                <span className="text-yellow-600/70 text-[10px] block uppercase">{t('telegramSender')}:</span>
                <span className="font-bold truncate block">{adventureContext?.location || 'ARKHAM, MASS.'}</span>
              </div>
              <div>
                <span className="text-yellow-600/70 text-[10px] block uppercase">{t('telegramDate')}:</span>
                <span className="font-bold truncate block">{adventureContext?.yearRange || 'OCTOBER 1926'}</span>
              </div>
              <div>
                <span className="text-yellow-600/70 text-[10px] block uppercase">{t('telegramAddressee')}:</span>
                <span className="font-bold truncate block">
                  {activeCharacter?.name || activeCharacter?.playerName || 'INVESTIGATOR'}
                </span>
              </div>
            </div>

            {/* Treść depeszy */}
            <div className="mt-3">
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
                className="w-full font-special-elite text-sm text-yellow-100/95 leading-relaxed bg-black/40 border border-yellow-900/40 focus:border-yellow-600/70 p-3 rounded-none resize-y"
              />
            </div>
          </div>
        );

      case 'letter':
        return (
          <div className="relative border border-brass/40 bg-[#15120d] p-6 shadow-lg">
            {/* Kątowniki Art Déco */}
            <span className="absolute left-1.5 top-1.5 h-3 w-3 border-l-2 border-t-2 border-brass/60" />
            <span className="absolute right-1.5 top-1.5 h-3 w-3 border-r-2 border-t-2 border-brass/60" />
            <span className="absolute left-1.5 bottom-1.5 h-3 w-3 border-l-2 border-b-2 border-brass/60" />
            <span className="absolute right-1.5 bottom-1.5 h-3 w-3 border-r-2 border-b-2 border-brass/60" />

            {/* Nagłówek Papeterii */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-brass/25 pb-3 gap-2">
              <div>
                <div className="font-display text-sm sm:text-base font-bold uppercase tracking-[0.18em] text-gold flex items-center gap-2">
                  <span>⚜</span>
                  <span>{adventureContext?.title ? adventureContext.title.toUpperCase() : 'ZLECENIE ŚLEDCZE'}</span>
                </div>
                <div className="font-serif italic text-xs text-brass/70">
                  {t('docTypeLetter')} · {adventureContext?.location || 'Nowa Anglia'}
                </div>
              </div>
              <div className="font-serif italic text-xs text-brass/80 sm:text-right">
                {adventureContext?.yearRange || 'Rok 1926'}
              </div>
            </div>

            {/* Zwrot grzecznościowy */}
            <div className="mt-3 font-serif italic text-xs text-foreground/80">
              {t('letterSalutation')} {activeCharacter?.name ? <strong className="text-gold font-normal">{activeCharacter.name}</strong> : ''}
            </div>

            {/* Treść listu */}
            <div className="mt-2">
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
                className="w-full font-serif text-sm italic text-foreground/95 leading-relaxed bg-black/35 border border-brass/25 focus:border-brass/70 p-3.5 rounded-none resize-y"
              />
            </div>

            {/* Podpis zlecający */}
            <div className="mt-3 text-right">
              <p className="font-serif italic text-xs text-brass/70">{t('letterSignoff')}</p>
              <p className="font-display text-xs uppercase tracking-wider text-gold mt-0.5">
                — {adventureContext?.suggestedArchetypes?.[0] || 'Zleceniodawca Śledztwa'}
              </p>
            </div>
          </div>
        );

      case 'dossier':
        return (
          <div className="relative border-2 border-brass/50 bg-[#120f0c] p-5 shadow-lg">
            {/* Kątowniki Art Déco */}
            <span className="absolute left-1.5 top-1.5 h-3 w-3 border-l-2 border-t-2 border-brass/70" />
            <span className="absolute right-1.5 top-1.5 h-3 w-3 border-r-2 border-t-2 border-brass/70" />
            <span className="absolute left-1.5 bottom-1.5 h-3 w-3 border-l-2 border-b-2 border-brass/70" />
            <span className="absolute right-1.5 bottom-1.5 h-3 w-3 border-r-2 border-b-2 border-brass/70" />

            {/* Belka akt policyjnych / teczki */}
            <div className="flex flex-wrap items-center justify-between border-b border-brass/40 pb-3 gap-2">
              <div className="flex items-center gap-2">
                <span className="border border-destructive/70 bg-destructive/15 text-destructive px-2 py-0.5 font-special-elite text-xs uppercase tracking-widest">
                  {t('briefingStampConfidential')}
                </span>
                <span className="font-special-elite text-xs uppercase tracking-wider text-muted-foreground">
                  {t('dossierCaseNumber')} {adventureContext?.id ? adventureContext.id.toUpperCase() : '1920-X'}
                </span>
              </div>
              <div className="font-special-elite text-xs text-brass/80">
                LOKALIZACJA: {adventureContext?.location || 'ARKHAM'}
              </div>
            </div>

            {/* Metryka sprawy */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-2 py-1.5 text-xs font-special-elite text-muted-foreground border-b border-border/70">
              <div>
                <span className="text-brass/70">{t('dossierSubject')}</span>{' '}
                <span className="text-foreground font-semibold">{adventureContext?.title || 'NIEZNANA SPRAWA'}</span>
              </div>
              <div>
                <span className="text-brass/70">{t('dossierSummary')}</span>
              </div>
            </div>

            {/* Raport wstępny w teczce */}
            <div className="mt-2">
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
                className="w-full font-special-elite text-sm text-foreground leading-relaxed bg-black/40 border border-border/80 focus:border-brass/70 p-3 rounded-none resize-y"
              />
            </div>
          </div>
        );
    }
  };

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

            {partyCharacters.length > 1 && (
              <div className="border border-primary/35 bg-primary/10 p-4 text-sm text-foreground/90">
                <p className="font-special-elite text-xs uppercase tracking-wider text-primary">
                  {t('partyContextTitle', { players: partyCharacters.length })}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {partyCharacters.map((character) => character.playerName || character.name).join(', ')}
                </p>
              </div>
            )}

            {/* Konwencja opowieści */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2 font-special-elite text-xs uppercase tracking-[0.16em] text-brass">
                {t('conventionSectionLabel')}
                <HelpIcon content={t('conventionSectionHelp')} />
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TONES.map((tn) => {
                  const isSelected = settings.tone === tn.id;
                  return (
                    <button
                      key={tn.id}
                      type="button"
                      onClick={() => {
                        const isPulp = tn.id === 'pulp';
                        setSettings({
                          ...settings,
                          tone: tn.id as SessionZeroSettings['tone'],
                          rulesetVariant: isPulp ? 'pulp' : 'classic',
                          pulpLevel: isPulp ? (settings.pulpLevel || 'medium') : undefined,
                        });
                      }}
                      className={`relative p-4 text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border border-primary bg-primary/10 shadow-[0_0_14px_rgba(13,148,136,0.22)]'
                          : 'border border-brass/28 bg-[#16130f] hover:border-brass/55'
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute left-2 top-2 h-3 w-3 border-l-2 border-t-2 border-primary/60" />
                      )}
                      <div className="mb-2 flex items-center gap-2">
                        <tn.icon className="h-5 w-5 text-brass shrink-0" />
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

              {/* Pulpometr (RAW Pulp Cthulhu Level) */}
              {settings.tone === 'pulp' && (
                <div className="mt-4 p-4 border border-primary/35 bg-[#121815] space-y-3 animate-in fade-in duration-200">
                  <Label className="flex items-center gap-2 font-special-elite text-xs uppercase tracking-[0.16em] text-primary">
                    <span>⚡</span>
                    {t('pulpLevelSectionLabel')}
                    <HelpIcon content={t('pulpLevelSectionHelp')} />
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {[
                      { id: 'low', name: t('pulpLevelDaringName'), desc: t('pulpLevelDaringDesc') },
                      { id: 'medium', name: t('pulpLevelHeroicName'), desc: t('pulpLevelHeroicDesc') },
                      { id: 'high', name: t('pulpLevelPulpName'), desc: t('pulpLevelPulpDesc') },
                      { id: 'apex', name: t('pulpLevelApexName'), desc: t('pulpLevelApexDesc') },
                    ].map((lvl) => {
                      const isLevelSelected = (settings.pulpLevel || 'medium') === lvl.id;
                      return (
                        <button
                          key={lvl.id}
                          type="button"
                          onClick={() => setSettings({ ...settings, pulpLevel: lvl.id as SessionZeroSettings['pulpLevel'] })}
                          className={`p-3 text-left transition-all cursor-pointer ${
                            isLevelSelected
                              ? 'border border-primary bg-primary/20 shadow-[0_0_10px_rgba(13,148,136,0.3)]'
                              : 'border border-primary/20 bg-[#161a18] hover:border-primary/50'
                          }`}
                        >
                          <div className="font-display text-xs font-semibold uppercase tracking-wider text-foreground mb-1">
                            {lvl.name}
                          </div>
                          <div className="font-serif text-xs italic text-muted-foreground">
                            {lvl.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="font-serif text-xs italic text-muted-foreground/80 border-t border-primary/20 pt-2">
                    ℹ️ {t('pulpDisclaimer')}
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <div className="font-display text-xl font-semibold uppercase tracking-[0.1em] text-brass">
                {t('step2Header')}
              </div>
              <p className="mt-1 font-serif text-lg italic text-muted-foreground">
                {t('step2Intro')}
              </p>
            </div>

            {/* Wybór formatu dokumentu odprawy */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <Label className="font-special-elite text-xs uppercase tracking-[0.16em] text-brass">
                  {t('docTypeSelectorLabel')}
                </Label>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant={briefingDocType === 'telegram' ? 'default' : 'outline'}
                    onClick={() => setBriefingDocType('telegram')}
                    className="font-special-elite text-xs"
                  >
                    {t('docTypeTelegram')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={briefingDocType === 'letter' ? 'default' : 'outline'}
                    onClick={() => setBriefingDocType('letter')}
                    className="font-special-elite text-xs"
                  >
                    {t('docTypeLetter')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={briefingDocType === 'dossier' ? 'default' : 'outline'}
                    onClick={() => setBriefingDocType('dossier')}
                    className="font-special-elite text-xs"
                  >
                    {t('docTypeDossier')}
                  </Button>
                </div>
              </div>

              {renderBriefingDocument()}
            </div>

            {/* Opcjonalny Haczyk Wejścia Badacza */}
            <div className="border border-brass/25 bg-black/25 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 font-special-elite text-xs uppercase tracking-[0.16em] text-brass">
                  {t('hookSectionLabel')}
                  <HelpIcon content={t('hookSectionHelp')} />
                </Label>
                {adventureContext?.hook && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-[11px] font-special-elite text-muted-foreground hover:text-brass"
                    onClick={() => {
                      setSettings((current) => ({
                        ...current,
                        investigatorHook: adventureContext.hook || '',
                      }));
                    }}
                  >
                    {t('restoreOriginalHook')}
                  </Button>
                )}
              </div>
              <Input
                value={settings.investigatorHook || ''}
                onChange={(e) =>
                  setSettings((current) => ({
                    ...current,
                    investigatorHook: e.target.value,
                  }))
                }
                placeholder={t('hookPlaceholder')}
                className="font-special-elite text-sm bg-black/40 border-brass/30 focus:border-brass text-foreground rounded-none"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { key: 'hookJob', text: t('hookJob') },
                  { key: 'hookFamily', text: t('hookFamily') },
                  { key: 'hookAcademic', text: t('hookAcademic') },
                  { key: 'hookDebt', text: t('hookDebt') },
                  { key: 'hookAccident', text: t('hookAccident') },
                ].map(({ key, text }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      setSettings((current) => ({
                        ...current,
                        investigatorHook: text,
                      }))
                    }
                    className="px-2 py-1 font-special-elite text-[11px] tracking-wider border border-brass/20 bg-black/30 text-muted-foreground hover:border-brass/50 hover:text-brass transition-all cursor-pointer rounded-none"
                  >
                    + {text}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 3:
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
                    {settings.eraFilter === 'historical_realia' ? t('eraFilterHistoricalName') : t('eraFilterModernName')}
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
