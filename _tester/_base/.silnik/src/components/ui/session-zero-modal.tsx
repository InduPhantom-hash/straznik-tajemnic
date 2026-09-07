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
import { fetchWithApiKeys } from '@/lib/api-keys-service';
import { collectSSEText } from '@/lib/sse-parser';
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
    icon: '🐙',
  },
  {
    id: 'pulp',
    icon: '💥',
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
  const [briefingDocType] = useState<BriefingDocType>('telegram');
  const [interviewMessages, setInterviewMessages] = useState<
    Array<{ role: 'assistant' | 'user'; content: string }>
  >([]);
  const [interviewInput, setInterviewInput] = useState('');
  const [interviewQuestionIndex, setInterviewQuestionIndex] = useState(0);
  const [interviewAnswers, setInterviewAnswers] = useState<string[]>([]);
  const [interviewProposal, setInterviewProposal] = useState<{
    summary: string;
    investigatorHook?: string;
    keyConnection?: string;
    importantPlace?: string;
    treasuredItem?: string;
    characterConcept?: string;
    backstory?: string;
  } | null>(null);
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [interviewError, setInterviewError] = useState<string | null>(null);

  const interviewQuestions = useMemo(
    () => [
      t('interviewQuestionMotivation', {
        name: activeCharacter?.name || t('interviewInvestigatorFallback'),
        adventure: adventureContext?.title || t('interviewAdventureFallback'),
      }),
      t('interviewQuestionConnection'),
      t('interviewQuestionAnchor'),
    ],
    [activeCharacter?.name, adventureContext?.title, t]
  );

  useEffect(() => {
    if (open) {
      setStep(1);
      setInterviewQuestionIndex(0);
      setInterviewAnswers([]);
      setInterviewProposal(null);
      setInterviewInput('');
      setInterviewError(null);
      setInterviewMessages([
        { role: 'assistant', content: interviewQuestions[0] },
      ]);

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

  const buildInterviewProposal = async (answers: string[]) => {
    setInterviewLoading(true);
    setInterviewError(null);
    try {
      const prompt = `
Przygotuj propozycję uzupełnienia postaci do gry Call of Cthulhu 7e.
Zwróć wyłącznie poprawny JSON bez markdownu w formacie:
{"summary":"...","investigatorHook":"...","keyConnection":"...","importantPlace":"...","treasuredItem":"...","characterConcept":"...","backstory":"..."}

Przygoda: ${adventureContext?.title || 'nie wybrano'}
Opis przygody: ${adventureContext?.description || ''}
Miejsce i czas: ${adventureContext?.location || ''}, ${adventureContext?.yearRange || ''}
Postać: ${activeCharacter?.name || ''}; zawód: ${activeCharacter?.occupation || ''}; koncept: ${activeCharacter?.characterConcept || ''}; tło: ${activeCharacter?.background || activeCharacter?.backstory || ''}
Dotychczasowe ważne dane: osoba=${activeCharacter?.significantPerson || ''}; miejsce=${activeCharacter?.meaningfulLocation || ''}; przedmiot=${activeCharacter?.treasuredPossession || ''}

Odpowiedzi gracza:
1. ${answers[0] || ''}
2. ${answers[1] || ''}
3. ${answers[2] || ''}

Nie zmieniaj statystyk, umiejętności, zawodu ani ekwipunku. Pisz konkretnie, bez dopisywania faktów nieobecnych w odpowiedziach.
Język odpowiedzi: ${locale === 'en' ? 'English' : 'Polish'}.
`.trim();
      const response = await fetchWithApiKeys('/api/ai/utility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, json: true, responseMimeType: 'application/json' }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || t('interviewError'));
      }
      const raw = await collectSSEText(response);
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      const proposal = JSON.parse(cleaned) as {
        summary?: string;
        investigatorHook?: string;
        keyConnection?: string;
        importantPlace?: string;
        treasuredItem?: string;
        characterConcept?: string;
        backstory?: string;
      };
      setInterviewProposal({
        summary: proposal.summary || t('interviewProposalFallback'),
        investigatorHook: proposal.investigatorHook,
        keyConnection: proposal.keyConnection,
        importantPlace: proposal.importantPlace,
        treasuredItem: proposal.treasuredItem,
        characterConcept: proposal.characterConcept,
        backstory: proposal.backstory,
      });
      setInterviewMessages((messages) => [
        ...messages,
        { role: 'assistant', content: t('interviewProposalReady') },
      ]);
    } catch (error) {
      setInterviewError(error instanceof Error ? error.message : t('interviewError'));
    } finally {
      setInterviewLoading(false);
    }
  };

  const submitInterviewAnswer = async () => {
    const answer = interviewInput.trim();
    if (!answer || interviewLoading || interviewProposal) return;
    const nextAnswers = [...interviewAnswers, answer];
    setInterviewAnswers(nextAnswers);
    setInterviewInput('');
    setInterviewMessages((messages) => [
      ...messages,
      { role: 'user', content: answer },
    ]);
    if (interviewQuestionIndex < interviewQuestions.length - 1) {
      const nextIndex = interviewQuestionIndex + 1;
      setInterviewQuestionIndex(nextIndex);
      setInterviewMessages((messages) => [
        ...messages,
        { role: 'assistant', content: interviewQuestions[nextIndex] },
      ]);
    } else {
      await buildInterviewProposal(nextAnswers);
    }
  };

  const acceptInterviewProposal = () => {
    if (!interviewProposal) return;
    setSettings((current) => ({
      ...current,
      investigatorHook: interviewProposal.investigatorHook || current.investigatorHook,
      anchors: {
        ...current.anchors,
        keyConnection: interviewProposal.keyConnection || current.anchors?.keyConnection,
        importantPlace: interviewProposal.importantPlace || current.anchors?.importantPlace,
        treasuredItem: interviewProposal.treasuredItem || current.anchors?.treasuredItem,
      },
    }));
    if (activeCharacter && onCharacterUpdate) {
      onCharacterUpdate({
        ...activeCharacter,
        characterConcept: interviewProposal.characterConcept || activeCharacter.characterConcept,
        backstory: interviewProposal.backstory || activeCharacter.backstory,
        significantPerson: interviewProposal.keyConnection || activeCharacter.significantPerson,
        meaningfulLocation: interviewProposal.importantPlace || activeCharacter.meaningfulLocation,
        treasuredPossession: interviewProposal.treasuredItem || activeCharacter.treasuredPossession,
      });
    }
    setInterviewMessages((messages) => [
      ...messages,
      { role: 'assistant', content: t('interviewAccepted') },
    ]);
    setInterviewProposal(null);
  };

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
                      onClick={() =>
                        setSettings({
                          ...settings,
                          tone: tn.id as SessionZeroSettings['tone'],
                        })
                      }
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
                          ? 'border border-primary bg-primary/10 shadow-[0_0_14px_rgba(13,148,136,0.22)]'
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
          <div className="space-y-6">
            <div>
              <div className="font-display text-xl font-semibold uppercase tracking-[0.1em] text-brass">
                {t('step2Header')}
              </div>
              <p className="mt-1 font-serif text-lg italic text-muted-foreground">
                {t('step2Intro')}
              </p>
            </div>

            <div className="border border-primary/35 bg-[#101817] p-4 text-sm text-foreground/90">
              <p>{t('interviewIntro')}</p>
              <p className="mt-2 text-xs text-muted-foreground">{t('interviewOptionalHint')}</p>
            </div>

            <div className="max-h-80 space-y-3 overflow-y-auto border border-brass/25 bg-black/25 p-4">
              {interviewMessages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`max-w-[92%] border p-3 text-sm ${
                    message.role === 'assistant'
                      ? 'border-brass/25 bg-[#17130e] text-foreground'
                      : 'ml-auto border-primary/30 bg-primary/10 text-primary-foreground'
                  }`}
                >
                  <div className="mb-1 text-[10px] font-special-elite uppercase tracking-wider text-muted-foreground">
                    {message.role === 'assistant' ? t('interviewAssistantName') : t('interviewPlayerName')}
                  </div>
                  {message.content}
                </div>
              ))}
            </div>

            {!interviewProposal && (
              <div className="space-y-2">
                <Textarea
                  value={interviewInput}
                  onChange={(event) => setInterviewInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void submitInterviewAnswer();
                    }
                  }}
                  placeholder={t('interviewInputPlaceholder')}
                  rows={3}
                  disabled={interviewLoading}
                />
                <div className="flex flex-wrap justify-between gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(3)}>
                    {t('interviewSkip')}
                  </Button>
                  <Button type="button" onClick={() => void submitInterviewAnswer()} disabled={!interviewInput.trim() || interviewLoading}>
                    {interviewLoading ? t('interviewPreparing') : t('interviewSend')}
                  </Button>
                </div>
              </div>
            )}

            {interviewError && (
              <div className="border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {interviewError}
              </div>
            )}

            {interviewProposal && (
              <div className="space-y-3 border border-primary/45 bg-primary/10 p-4">
                <h3 className="font-display text-sm uppercase tracking-wider text-primary">
                  {t('interviewProposalTitle')}
                </h3>
                <p className="text-sm text-foreground/90">{interviewProposal.summary}</p>
                <div className="grid gap-2 text-xs md:grid-cols-2">
                  {[
                    [t('hookSectionLabel'), interviewProposal.investigatorHook],
                    [t('keyConnectionLabel'), interviewProposal.keyConnection],
                    [t('importantPlaceLabel'), interviewProposal.importantPlace],
                    [t('treasuredItemLabel'), interviewProposal.treasuredItem],
                  ].map(([label, value]) => value && (
                    <div key={label} className="border border-brass/20 bg-black/25 p-2">
                      <span className="block text-brass/70">{label}</span>
                      <span>{value}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={acceptInterviewProposal}>
                    {t('interviewAccept')}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setInterviewProposal(null)}>
                    {t('interviewEditAgain')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        );

      case 99:
        return (
          <div className="space-y-6">
            <div>
              <div className="font-display text-xl font-semibold uppercase tracking-[0.1em] text-brass">
                {t('step3Header')}
              </div>
              <p className="mt-1 font-serif text-lg italic text-muted-foreground">
                {t('step3Intro')}
              </p>
              {activeCharacter?.name && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none bg-brass/10 border border-brass/30 text-xs font-special-elite text-brass/90">
                  <span>⚓</span>
                  <span>{t('importedFromCharacter', { name: activeCharacter.name })}</span>
                </div>
              )}
            </div>

            {/* Diegetyczna Kartoteka Powiązań Badacza */}
            <div className="relative border border-brass/35 bg-[#14100c] p-6 shadow-md space-y-6">
              {/* Kątowniki Art Déco */}
              <span className="absolute left-1.5 top-1.5 h-3 w-3 border-l-2 border-t-2 border-brass/50" />
              <span className="absolute right-1.5 top-1.5 h-3 w-3 border-r-2 border-t-2 border-brass/50" />
              <span className="absolute left-1.5 bottom-1.5 h-3 w-3 border-l-2 border-b-2 border-brass/50" />
              <span className="absolute right-1.5 bottom-1.5 h-3 w-3 border-r-2 border-b-2 border-brass/50" />

              {/* Nagłówek Kartoteki */}
              <div className="border-b border-brass/20 pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rotate-45 bg-brass" />
                  <span className="font-display text-xs sm:text-sm font-semibold uppercase tracking-[0.16em] text-gold">
                    {t('anchorsDossierHeader')}
                  </span>
                </div>
                <p className="text-[11px] font-serif italic text-muted-foreground mt-0.5">
                  {t('anchorsDossierSub')}
                </p>
              </div>

              {/* 1. Ważna Osoba */}
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
                  className="font-special-elite text-sm bg-black/40 border-brass/30 focus:border-brass text-foreground rounded-none"
                />
                {/* Sugestie ważnych osób */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {SUGGESTED_KEY_CONNECTIONS.map((key) => {
                    const val = t(key);
                    const isSelected = settings.anchors?.keyConnection === val;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          setSettings({
                            ...settings,
                            anchors: {
                              ...settings.anchors,
                              keyConnection: val,
                            },
                          })
                        }
                        className={`px-2 py-1 font-special-elite text-[11px] tracking-wider border rounded-none transition-all cursor-pointer ${
                          isSelected
                            ? 'border-primary bg-primary/15 text-primary shadow-[0_0_8px_rgba(13,148,136,0.25)]'
                            : 'border-brass/20 bg-black/30 text-muted-foreground hover:border-brass/50 hover:text-brass'
                        }`}
                      >
                        + {val}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Znaczące Miejsce */}
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
                  className="font-special-elite text-sm bg-black/40 border-brass/30 focus:border-brass text-foreground rounded-none"
                />
                {/* Sugestie miejsc */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {SUGGESTED_IMPORTANT_PLACES.map((key) => {
                    const val = t(key);
                    const isSelected = settings.anchors?.importantPlace === val;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          setSettings({
                            ...settings,
                            anchors: {
                              ...settings.anchors,
                              importantPlace: val,
                            },
                          })
                        }
                        className={`px-2 py-1 font-special-elite text-[11px] tracking-wider border rounded-none transition-all cursor-pointer ${
                          isSelected
                            ? 'border-primary bg-primary/15 text-primary shadow-[0_0_8px_rgba(13,148,136,0.25)]'
                            : 'border-brass/20 bg-black/30 text-muted-foreground hover:border-brass/50 hover:text-brass'
                        }`}
                      >
                        + {val}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Cenny Przedmiot */}
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
                  className="font-special-elite text-sm bg-black/40 border-brass/30 focus:border-brass text-foreground rounded-none"
                />
                {/* Sugestie cennych przedmiotów */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {SUGGESTED_TREASURED_ITEMS.map((key) => {
                    const val = t(key);
                    const isSelected = settings.anchors?.treasuredItem === val;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          setSettings({
                            ...settings,
                            anchors: {
                              ...settings.anchors,
                              treasuredItem: val,
                            },
                          })
                        }
                        className={`px-2 py-1 font-special-elite text-[11px] tracking-wider border rounded-none transition-all cursor-pointer ${
                          isSelected
                            ? 'border-primary bg-primary/15 text-primary shadow-[0_0_8px_rgba(13,148,136,0.25)]'
                            : 'border-brass/20 bg-black/30 text-muted-foreground hover:border-brass/50 hover:text-brass'
                        }`}
                      >
                        + {val}
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
