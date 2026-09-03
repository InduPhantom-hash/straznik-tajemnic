'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import dynamic from 'next/dynamic';
import { Campaign, AdventureContext, Message, Character } from '@/lib/types';
import {
  loadAISettings,
  saveAISettings,
  withVoiceEnabled,
  initializeDefaultPrompt,
} from '@/lib/ai-settings';
import type { AISettings } from '@/lib/ai-settings/types';
import { settingsEmitter } from '@/lib/settings-event-emitter';
import { appendRollToJournal } from '@/lib/journal/build-roll-entry';
import { CthulhuSidebar } from '@/components/sidebar/CthulhuSidebar';
import { APIUsageCounter } from '@/components/ui/api-usage-counter';
import { useHotSeat } from '@/components/ui/player-switcher';
import { HotSeatSetup } from '@/components/ui/hot-seat-setup';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { CutscenePlayer } from '@/components/ui/cutscene-player';
import { HardLoadingScreen } from '@/components/ui/hard-loading-screen';
import { LanguageSelectionModal } from '@/components/onboarding/language-selection-modal';
import { CharacterWizardV2 } from '@/components/ui/character-wizard';
import { persistCharacters } from '@/lib/character-cloud-sync';


import { useTTS } from '@/hooks/useTTS';
import { usePdfMemory } from '@/hooks/usePdfMemory';
import { useCharacterManagement } from '@/hooks/useCharacterManagement';
import { useFullSave } from '@/hooks/useFullSave';
import { useChat } from '@/hooks/useChat';
import { useCustomAdventures } from '@/hooks/useCustomAdventures';
import { useCutscene } from '@/hooks/useCutscene';
import { useSceneSummary } from '@/hooks/useSceneSummary';
import { useGameStart } from '@/hooks/useGameStart';
import { useHealthCheck } from '@/hooks/useHealthCheck';
import { getApiKeyHeaders, hasRequiredKeys } from '@/lib/api-keys-service';
import { useRulesStatus } from '@/hooks/useRulesStatus';
import { hydrateCharacterImages } from '@/lib/character-image-store';
import { useSkillMarking } from '@/hooks/useSkillMarking';
import { useFullReset } from '@/hooks/useFullReset';
import { toast } from '@/components/ui/use-toast';
import {
  BUILT_IN_ADVENTURES,
  STREFA_11_ADVENTURES,
  getAdventureById,
} from '@/lib/adventures-data';
import { PREDEFINED_CHARACTERS } from '@/lib/immersion/predefined-characters';
import { getStrefa11CharactersForAdventure } from '@/lib/immersion/strefa-11-characters';
import { buildPredefinedEquipment } from '@/lib/immersion/predefined-equipment';
import {
  localizeStrefa11Adventure,
  localizeStrefa11Character,
} from '@/lib/immersion/strefa-11-localization';
import type { RandomEvent } from '@/lib/random-event-generator';
import { resolveGameEraContext } from '@/lib/era';
import { resolveEraVisualProfile } from '@/lib/era-visual-style';
import { timeManager } from '@/lib/time-manager';


const ChatWindow = dynamic(
  () =>
    import('@/components/chat/ChatWindow').then((mod) => ({
      default: mod.ChatWindow,
    })),
  {
    loading: () => (
      <div className="animate-pulse bg-gray-800 rounded-lg h-96" />
    ),
    ssr: false,
  }
);

const FullGameSaveModal = dynamic(
  () =>
    import('@/components/ui/full-game-save-modal').then((mod) => ({
      default: mod.FullGameSaveModal,
    })),
  {
    ssr: false,
  }
);

const GMToolsModal = dynamic(
  () =>
    import('@/components/ui/gm-tools-modal').then((mod) => ({
      default: mod.GMToolsModal,
    })),
  {
    ssr: false,
  }
);

const DevelopmentPhaseModal = dynamic(
  () =>
    import('@/components/dialogs/DevelopmentPhaseModal').then((mod) => ({
      default: mod.DevelopmentPhaseModal,
    })),
  { ssr: false }
);

const ApiKeysModal = dynamic(
  () =>
    import('@/components/dialogs/ApiKeysModal').then((mod) => ({
      default: mod.ApiKeysModal,
    })),
  {
    ssr: false,
  }
);

const RulebookModal = dynamic(
  () =>
    import('@/components/dialogs/RulebookModal').then((mod) => ({
      default: mod.RulebookModal,
    })),
  {
    ssr: false,
  }
);
const PredefinedCharactersSelector = dynamic(
  () =>
    import('@/components/ui/predefined-characters-selector').then((mod) => ({
      default: mod.PredefinedCharactersSelector,
    })),
  {
    ssr: false,
  }
);


export default function Home() {
  const t = useTranslations('Page');
  
  const locale = useLocale();
  const gameLocale: 'pl' | 'en' = locale === 'en' ? 'en' : 'pl';
  
  const tts = useTTS(gameLocale);
  const charMgmt = useCharacterManagement();

  
  const [adventureContext, setAdventureContext] =
    useState<AdventureContext | null>(() => {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('adventure_context');
        return saved ? (JSON.parse(saved) as AdventureContext) : null;
      }
      return null;
    });

  const [aiSettings, setAiSettings] = useState<AISettings | null>(null);

  const pdf = usePdfMemory({
    setMessages: (fn) => chat.setMessages(fn),
  });

  
  
  
  const skillMarking = useSkillMarking(
    charMgmt.activeCharacter,
    charMgmt.handleUpdateCharacter
  );
  const [showDevelopmentModal, setShowDevelopmentModal] = useState(false);
  const [pendingDirectorEvent, setPendingDirectorEvent] =
    useState<RandomEvent | null>(null);

  
  const hotSeat = useHotSeat(charMgmt.characters);

  const chat = useChat({
    pdfMemory: pdf.pdfMemory,
    activeCharacter: charMgmt.activeCharacter,
    characters: charMgmt.characters,
    setCharacters: charMgmt.setCharacters,
    setActiveCharacter: charMgmt.setActiveCharacter,
    voiceEnabled: tts.voiceEnabled,
    isTTSEnabled: tts.isTTSEnabled,
    generateVoiceForMessage: tts.generateVoiceForMessage,
    
    addToQueue: tts.addToQueue,
    adventureContext,
    aiSettings,
    onSkillResults: skillMarking.processSkillResults,
    hotSeatConfig: hotSeat.config,
    pendingDirectorEvent,
    clearPendingDirectorEvent: () => setPendingDirectorEvent(null),
    locale: gameLocale,
  });

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [voiceFeatureAvailable, setVoiceFeatureAvailable] = useState(false);

  const save = useFullSave({
    setMessages: chat.setMessages,
    setCharacters: charMgmt.setCharacters,
    setActiveCharacter: charMgmt.setActiveCharacter,
    setCampaigns,
    setPdfMemory: pdf.setPdfMemory,
    setActiveGameState: charMgmt.setActiveGameState,
    setAiSettings,
    stopCurrentAudio: tts.stopCurrentAudio,
  });

  
  const [showGMTools, setShowGMTools] = useState(false);
  const [activeGMTool, setActiveGMTool] = useState<string | null>(null);
  const [showHotSeatSetup, setShowHotSeatSetup] = useState(false);
  const [showApiKeysModal, setShowApiKeysModal] = useState(false);
  const [showRulebookModal, setShowRulebookModal] = useState(false);
  const rulesStatus = useRulesStatus();
  
  const [languageSelectionRequired, setLanguageSelectionRequired] = useState<boolean | null>(null);
  const [rulesOnboardingCompleted, setRulesOnboardingCompleted] = useState<boolean | null>(null);
  
  const [pendingNewAdventure, setPendingNewAdventure] = useState(false);

  
  const openSessionZeroRef = useRef<(() => void) | null>(null);
  const openAdventureSelectorRef = useRef<(() => void) | null>(null);

  
  
  
  
  
  
  const [hasStartedGame, setHasStartedGame] = useState(false);
  const [sessionZeroCompleted, setSessionZeroCompleted] = useState(false);
  const [pendingGameStart, setPendingGameStart] = useState(false);

  const customAdventures = useCustomAdventures();
  const resolvedEraContext = adventureContext
    ? resolveGameEraContext({
        gameTime: hasStartedGame ? timeManager.getTime() : null,
        adventure: adventureContext,
      })
    : null;
  const cutsceneManager = useCutscene();
  
  const fullReset = useFullReset();

  

  const { handleSummarizeScene, isSummarizingScene } = useSceneSummary({
    messages: chat.messages,
    activeCharacter: charMgmt.activeCharacter,
    adventureContext: adventureContext?.title,
    setActiveCharacter: charMgmt.setActiveCharacter,
    setCharacters: charMgmt.setCharacters,
    characters: charMgmt.characters,
  });

  
  
  
  const handleInvalidKey = useCallback(() => {
    if (
      languageSelectionRequired === false &&
      localStorage.getItem('language_selected') !== null
    ) {
      setShowApiKeysModal(true);
    }
  }, [languageSelectionRequired]);
  const { runHealthCheck } = useHealthCheck({ onInvalidKey: handleInvalidKey });

  const { handleStartGame } = useGameStart({
    setHasStartedGame,
    runHealthCheck,
    activeCharacter: charMgmt.activeCharacter,
    characters: charMgmt.characters,
    setActiveCharacter: charMgmt.setActiveCharacter,
    setCharacters: charMgmt.setCharacters,
    pdfMemory: pdf.pdfMemory,
    adventureContext,
    hotSeatConfig: hotSeat.config,
    setMessages: chat.setMessages,
    tts: {
      voiceEnabled: tts.voiceEnabled,
      isTTSEnabled: tts.isTTSEnabled,
      generateVoiceForMessage: tts.generateVoiceForMessage,
      addToQueue: tts.addToQueue,
      startInitialBuffering: tts.startInitialBuffering,
      stopCurrentAudio: tts.stopCurrentAudio,
    },
    aiSettings,
    locale: gameLocale,
  });

  
  
  
  
  
  const [showCharacterWizard, setShowCharacterWizard] = useState(false);
  const [duetCreatingPlayerName, setDuetCreatingPlayerName] = useState<string | null>(null);

  const stampDuetTargetPlayer = useCallback(
    (explicitPlayerName?: string) => {
      if (explicitPlayerName) {
        try {
          localStorage.setItem('hotSeatCreatingPlayerName', explicitPlayerName);
        } catch {
          /* ignore */
        }
        return explicitPlayerName;
      }
      if (hotSeat.config.enabled && hotSeat.config.players.length >= 2) {
        const nextUnbound = hotSeat.config.players.find(
          (p) =>
            !charMgmt.characters.some((c) => c.playerName === p.name) &&
            !p.characterId
        );
        const target = nextUnbound?.name ?? hotSeat.config.players[0]?.name;
        if (target) {
          try {
            localStorage.setItem('hotSeatCreatingPlayerName', target);
          } catch {
            /* ignore */
          }
          return target;
        }
      }
      return null;
    },
    [hotSeat.config, charMgmt.characters]
  );

  const handleCreateCharacterForDuet = useCallback(
    (playerName?: string) => {
      const target = stampDuetTargetPlayer(playerName);
      setDuetCreatingPlayerName(target);
      setShowCharacterWizard(true);
    },
    [stampDuetTargetPlayer]
  );

  const handleCharacterWizardCreated = useCallback(
    (character: Character) => {
      const targetPlayer =
        duetCreatingPlayerName ||
        (typeof window !== 'undefined'
          ? localStorage.getItem('hotSeatCreatingPlayerName')
          : null);
      if (targetPlayer) {
        character.playerName = targetPlayer;
        try {
          localStorage.removeItem('hotSeatCreatingPlayerName');
        } catch {
          /* ignore */
        }
      }
      setDuetCreatingPlayerName(null);

      const updated = charMgmt.characters.map((c) => ({ ...c, isActive: false }));
      const newChar: Character = { ...character, isActive: true, lastUsed: new Date() };
      const updatedList = [...updated, newChar];

      charMgmt.setCharacters(updatedList);
      charMgmt.setActiveCharacter(newChar);
      persistCharacters(updatedList);

      setShowCharacterWizard(false);
    },
    [duetCreatingPlayerName, charMgmt]
  );

  const handlePickCharacterForDuet = useCallback(() => {
    stampDuetTargetPlayer();
    charMgmt.handleCharacterManage();
  }, [stampDuetTargetPlayer, charMgmt]);

  const [showPredefinedSelector, setShowPredefinedSelector] = useState(false);

  const handleSelectPredefinedCharacter = useCallback(
    (character: Character) => {
      const stamped = {
        ...character,
        id: `${character.id}_${Date.now()}`,
      };

      
      const targetPlayer = localStorage.getItem('hotSeatCreatingPlayerName');
      if (targetPlayer) {
        stamped.playerName = targetPlayer;
        localStorage.removeItem('hotSeatCreatingPlayerName');
      }

      const existingCharacters = [...charMgmt.characters];
      existingCharacters.push(stamped);

      
      charMgmt.setCharacters(existingCharacters);
      charMgmt.setActiveCharacter(stamped);

      
      void import('@/lib/character-cloud-sync').then(({ persistCharacters }) =>
        persistCharacters(existingCharacters)
      );

      setShowPredefinedSelector(false);
    },
    [charMgmt]
  );

  
  
  
  
  
  const handleStartGameGuarded = useCallback(() => {
    if (!hasRequiredKeys()) {
      setShowApiKeysModal(true);
      return;
    }
    if (!rulesStatus.hasRules) {
      setShowRulebookModal(true);
      return;
    }
    if (hotSeat.config.enabled) {
      const players = hotSeat.config.players;

      
      const boundIds = players.map((p) => {
        const own = charMgmt.characters.find((c) => c.playerName === p.name);
        return own?.id;
      });

      const everyoneHasOwn = boundIds.every((id) => !!id);
      const allDistinct = new Set(boundIds).size === boundIds.length;

      if (!everyoneHasOwn || !allDistinct) {
        const missing = players
          .filter((_, i) => !boundIds[i])
          .map((p) => p.name);
        const description = !everyoneHasOwn
          ? t('hotSeatMissingCharacters', { players: missing.join(', ') })
          : t('hotSeatDuplicateCharacter');
        toast({
          title: t('hotSeatNotReady'),
          description,
          variant: 'destructive',
        });
        return;
      }

      
      hotSeat.bindCharactersByPlayerName(charMgmt.characters);
    }
    handleStartGame();
  }, [hotSeat, charMgmt.characters, handleStartGame, t, rulesStatus.hasRules]);

  
  
  const handleSwitchPlayer = useCallback(
    (index: number) => {
      hotSeat.switchPlayer(index);
      const player = hotSeat.config.players[index];
      if (player) {
        const char = charMgmt.characters.find(
          (c) => c.id === player.characterId
        );
        if (char) charMgmt.setActiveCharacter(char);
      }
    },
    [hotSeat, charMgmt]
  );

  
  
  

  
  useEffect(() => {
    initializeDefaultPrompt(gameLocale).then((initialized) => {
      if (initialized) console.log('✅ Default GM prompt initialized');
    });
  }, [gameLocale]);

  
  
  useEffect(() => {
    if (languageSelectionRequired === false) runHealthCheck();
  }, [languageSelectionRequired, runHealthCheck]);

  
  
  
  useEffect(() => {
    fetch('/api/pricing/refresh', { headers: getApiKeyHeaders() }).catch(
      () => {}
    );
  }, []);

  const [pendingQuickStart, setPendingQuickStart] = useState(false);
  useEffect(() => {
    if (pendingQuickStart && charMgmt.characters.length > 0) {
      setPendingQuickStart(false);
      handleStartGameGuarded();
    }
  }, [pendingQuickStart, charMgmt.characters, handleStartGameGuarded]);

  const handleQuickStartOnboarding = useCallback(
    async (
      adventureId: string,
      characterId: string,
      mode?: 'solo' | 'hot-seat',
      player2CharacterId?: string
    ) => {
      if (!hasRequiredKeys()) {
        setShowApiKeysModal(true);
        return;
      }
      
      let adv = STREFA_11_ADVENTURES.find((a) => a.id === adventureId);
      if (!adv) adv = getAdventureById(adventureId);
      if (adv?.isStrefa11) {
        adv = localizeStrefa11Adventure(adv, locale);
      }

      if (adv) {
        setAdventureContext(adv);
        if (typeof window !== 'undefined') {
          localStorage.setItem('adventure_context', JSON.stringify(adv));
        }
      }

      
      const allCharacters = adv?.isStrefa11
        ? getStrefa11CharactersForAdventure(adv.id)
        : PREDEFINED_CHARACTERS;
      const foundPreset = allCharacters.find((c) => c.id === characterId);
      const preset = foundPreset
        ? localizeStrefa11Character(foundPreset, locale)
        : undefined;
      if (preset) {
        const targetEra = adv
          ? resolveEraVisualProfile(resolveGameEraContext({ adventure: adv }))
          : undefined;
        const stamped: Character = {
          ...preset,
          ...(targetEra
            ? { equipment: buildPredefinedEquipment(preset, targetEra) }
            : {}),
          id: `char_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          sourcePresetId: foundPreset?.id,
        };
        if (mode === 'hot-seat') {
          stamped.playerName = t('player1Name');
        }
        const updatedList = [...charMgmt.characters, stamped];

        if (mode === 'hot-seat') {
          
          let preset2 = player2CharacterId
            ? allCharacters.find((c) => c.id === player2CharacterId)
            : undefined;
          if (!preset2) {
            preset2 =
              allCharacters.find((c) => c.gender !== preset.gender) ||
              allCharacters[1];
          }

          if (preset2) {
            const localizedPreset2 = localizeStrefa11Character(preset2, locale);
            const stamped2: Character = {
              ...localizedPreset2,
              ...(targetEra
                ? { equipment: buildPredefinedEquipment(localizedPreset2, targetEra) }
                : {}),
              id: `char_${Date.now() + 1}_${Math.random().toString(36).substr(2, 4)}`,
              sourcePresetId: preset2.id,
              playerName: t('player2Name'),
            };
            updatedList.push(stamped2);
            charMgmt.setCharacters(updatedList);
            charMgmt.setActiveCharacter(stamped);

            hotSeat.restoreConfig(
              {
                enabled: true,
                players: [
                  {
                    id: `p1_${Date.now()}`,
                    name: t('player1Name'),
                    color: '#4ade80',
                    characterId: stamped.id,
                    isActive: true,
                    turnCount: 0,
                  },
                  {
                    id: `p2_${Date.now()}`,
                    name: t('player2Name'),
                    color: '#f472b6',
                    characterId: stamped2.id,
                    isActive: false,
                    turnCount: 0,
                  },
                ],
                activePlayerIndex: 0,
                allowInterruptions: true,
                showPlayerIndicator: true,
              },
              updatedList
            );
          }
        } else {
          charMgmt.setCharacters(updatedList);
          charMgmt.setActiveCharacter(stamped);
          hotSeat.restoreConfig(
            {
              enabled: false,
              players: [],
              activePlayerIndex: 0,
              allowInterruptions: true,
              showPlayerIndicator: false,
            },
            updatedList
          );
        }

        try {
          const { persistCharacters } = await import('@/lib/character-cloud-sync');
          persistCharacters(updatedList);
        } catch {
          
        }
      }
      setPendingQuickStart(true);
    },
    [charMgmt, hotSeat, handleStartGameGuarded, t, rulesStatus.hasRules]
  );

  const handleApiKeysChange = useCallback(
    (open: boolean) => {
      setShowApiKeysModal(open);
      if (!open && hasRequiredKeys()) {
        if (rulesOnboardingCompleted === false || !rulesStatus.hasRules) {
          setShowRulebookModal(true);
        }
      }
    },
    [rulesOnboardingCompleted, rulesStatus.hasRules]
  );

  const handleRulebookUploaded = useCallback(async () => {
    try {
      localStorage.setItem('rules_onboarding_completed', 'true');
    } catch {}
    setRulesOnboardingCompleted(true);
    await rulesStatus.refresh();
    setShowRulebookModal(false);
  }, [rulesStatus]);

  const handleRulebookChange = useCallback(
    (open: boolean) => {
      setShowRulebookModal(open);
      if (!open && rulesStatus.hasRules) {
        try {
          localStorage.setItem('rules_onboarding_completed', 'true');
        } catch {}
        setRulesOnboardingCompleted(true);
      }
    },
    [rulesStatus.hasRules]
  );

  // Sekwencja pierwszego startu: Język -> Klucz API -> Podręcznik Zasad CoC 7e -> Ekran Główny
  useEffect(() => {
    if (languageSelectionRequired === false) {
      if (!hasRequiredKeys()) {
        setShowApiKeysModal(true);
      } else if (
        rulesOnboardingCompleted === false ||
        (!rulesStatus.loading && !rulesStatus.hasRules)
      ) {
        setShowRulebookModal(true);
      }
    }
  }, [
    languageSelectionRequired,
    rulesOnboardingCompleted,
    rulesStatus.loading,
    rulesStatus.hasRules,
  ]);

  useEffect(() => {
    setLanguageSelectionRequired(
      localStorage.getItem('language_selected') === null
    );
    setRulesOnboardingCompleted(
      localStorage.getItem('rules_onboarding_completed') === 'true'
    );
  }, []);

  
  
  
  useEffect(() => {
    if (localStorage.getItem('has_started_game') === 'true') {
      setHasStartedGame(true);
    }
    if (localStorage.getItem('session_zero_completed') === 'true') {
      setSessionZeroCompleted(true);
    }
  }, []);

  
  
  
  
  
  
  useEffect(() => {
    if (!hotSeat.config.enabled) return;
    const player = hotSeat.config.players[hotSeat.config.activePlayerIndex];
    if (!player?.characterId) return;
    const target = charMgmt.characters.find((c) => c.id === player.characterId);
    if (target && target.id !== charMgmt.activeCharacter?.id) {
      charMgmt.setActiveCharacter(target);
    }
    
  }, [
    hotSeat.config,
    charMgmt.characters,
    charMgmt.activeCharacter,
    charMgmt.setActiveCharacter,
  ]);

  
  useEffect(() => {
    const savedChat = localStorage.getItem('chat-messages');
    if (savedChat) {
      try {
        const loadedMessages = (
          JSON.parse(savedChat) as (Message & { timestamp: string })[]
        )
          .map((msg) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }))
          .filter(
            (msg) => !msg.content.match(/^!\[[^\]]*\]\(\[IMG_BASE64\]\)$/)
          );
        chat.setMessages(loadedMessages);
      } catch (e) {
        console.error('Error loading chat:', e);
      }
    }

    const savedChars = localStorage.getItem('characters');
    if (savedChars) {
      try {
        const chars = JSON.parse(savedChars) as Character[];
        charMgmt.setCharacters(chars);
        const activeChar =
          chars.find((c) => c.isActive) ||
          (chars.length > 0 ? chars[chars.length - 1] : null);
        if (activeChar) charMgmt.setActiveCharacter(activeChar);

        hydrateCharacterImages(chars)
          .then((hydrated) => {
            charMgmt.setCharacters(hydrated);
            const activeHydrated =
              hydrated.find((c) => c.isActive) ||
              (hydrated.length > 0 ? hydrated[hydrated.length - 1] : null);
            if (activeHydrated) charMgmt.setActiveCharacter(activeHydrated);
          })
          .catch(() => {});
      } catch (e) {
        console.error('Error loading chars:', e);
      }
    }

    const savedCampaigns = localStorage.getItem('campaigns');
    if (savedCampaigns) {
      try {
        setCampaigns(JSON.parse(savedCampaigns));
      } catch (e) {
        console.error('Error loading campaigns:', e);
      }
    }

    const savedPdf = localStorage.getItem('pdf_memory');
    if (savedPdf) {
      try {
        pdf.setPdfMemory(JSON.parse(savedPdf));
      } catch (e) {
        console.error('Error loading pdf_memory:', e);
      }
    }
  }, []);

  
  useEffect(() => {
    const settings = loadAISettings();
    setAiSettings(settings);
    setVoiceFeatureAvailable(true);
    
    const ttsEnabled = settings.voiceSettings?.enabled !== false;
    tts.setVoiceEnabled(ttsEnabled);
    tts.setIsTTSEnabled(ttsEnabled);
  }, []);

  
  useEffect(() => {
    const unsubscribeSettings = settingsEmitter.subscribe((newSettings) => {
      setAiSettings(newSettings);
      const newTtsEnabled = newSettings.voiceSettings?.enabled !== false;
      tts.setVoiceEnabled(newTtsEnabled);
      tts.setIsTTSEnabled(newTtsEnabled);
    });

    return () => {
      unsubscribeSettings();
    };
  }, []);

  useEffect(() => {
    if (chat.messages.length > 0) {
      const messagesToSave = chat.messages.slice(-500).map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content.replace(
          /!\[([^\]]*)\]\(data:image\/[^)]+\)/g,
          '![obraz]([IMG_BASE64])'
        ),
        timestamp: msg.timestamp,
      }));
      localStorage.setItem('chat-messages', JSON.stringify(messagesToSave));
    }
  }, [chat.messages]);

  
  
  
  const handleToggleNarrator = (enabled: boolean) => {
    saveAISettings(withVoiceEnabled(aiSettings ?? loadAISettings(), enabled));
  };

  
  
  
  const handleNewAdventure = () => {
    chat.setMessages([]);
    localStorage.removeItem('chat-messages');
    tts.stopCurrentAudio();
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('zew:stop-music'));
    }
    charMgmt.setActiveGameState({
      currentCharacter: null,
      campaign: null,
      session: null,
      players: [],
    });
    setHasStartedGame(false);
    localStorage.setItem('has_started_game', 'false');
    setSessionZeroCompleted(false);
    localStorage.setItem('session_zero_completed', 'false');
    setAdventureContext(null);
    localStorage.removeItem('adventure_context');
    
    hotSeat.disableHotSeat();
  };

  
  
  const handleChooseSolo = useCallback(
    (player1Name: string) => {
      hotSeat.disableHotSeat();
      const active = charMgmt.activeCharacter;
      if (active && player1Name) {
        charMgmt.handleUpdateCharacter({ ...active, playerName: player1Name });
      }
    },
    [hotSeat, charMgmt]
  );

  return (
    <ChatLayout
      sidebar={
        <CthulhuSidebar
          hideSidebarPanel={!hasStartedGame}
          activeCharacter={charMgmt.activeCharacter || undefined}
          characters={charMgmt.characters}
          onCharacterSwitch={charMgmt.handleCharacterSwitch}
          onCharacterCreate={handleCreateCharacterForDuet}
          onCharacterManage={charMgmt.handleCharacterManage}
          onUpdateCharacter={charMgmt.handleUpdateCharacter}
          handleSendMessage={chat.handleSendMessage}
          activeGameState={charMgmt.activeGameState}
          voiceFeatureAvailable={voiceFeatureAvailable}
          voiceEnabled={tts.voiceEnabled}
          setVoiceEnabled={tts.setVoiceEnabled}
          isTTSEnabled={tts.isTTSEnabled}
          setIsTTSEnabled={tts.setIsTTSEnabled}
          isTTSPlaying={Boolean(tts.currentAudio && !tts.isAudioPaused)}
          onToggleNarrator={handleToggleNarrator}
          queueStatus={tts.queueStatus}
          onStartNewGame={save.handleStartNewGame}
          onNewAdventure={handleNewAdventure}
          onSaveAndNewAdventure={() => {
            setPendingNewAdventure(true);
            save.setSaveModalMode('save');
            save.setShowFullSaveModal(true);
          }}
          onOpenGameSession={() => {
            
            
            save.setSaveModalMode('load');
            save.setShowFullSaveModal(true);
          }}
          onOpenGMTools={(tool) => {
            setShowGMTools(true);
            setActiveGMTool(tool);
          }}
          onOpenDevelopmentPhase={() => setShowDevelopmentModal(true)}
          markedSkillsCount={skillMarking.markedCount}
          onSaveGame={() => {
            save.setSaveModalMode('save');
            save.setShowFullSaveModal(true);
          }}
          onOpenHotSeat={() => setShowHotSeatSetup(true)}
          onSessionZeroComplete={() => {
            setSessionZeroCompleted(true);
            localStorage.setItem('session_zero_completed', 'true');
          }}
          registerOpenSessionZero={(fn) => {
            openSessionZeroRef.current = fn;
          }}
          registerOpenAdventureSelector={(fn) => {
            openAdventureSelectorRef.current = fn;
          }}
          onAdventureSelect={setAdventureContext}
          customAdventures={customAdventures.customAdventures}
          onUploadAdventure={customAdventures.uploadAdventure}
          onDeleteAdventure={customAdventures.deleteAdventure}
          isUploadingAdventure={customAdventures.isLoading}
          uploadProgressAdventure={customAdventures.uploadProgress}
          loadingStatusAdventure={customAdventures.loadingStatus}
          hotSeatConfig={hotSeat.config}
          onSwitchPlayer={handleSwitchPlayer}
          onDisableHotSeat={hotSeat.disableHotSeat}
          aiSettings={aiSettings || undefined}
          onUpdateAISettings={(updated) => {
            setAiSettings(updated);
          }}
          isSessionEnded={chat.isSessionEnded}
          sessionEndStatus={chat.sessionEndStatus}
        />
      }
      modals={
        <>
          {save.showFullSaveModal && (
            <FullGameSaveModal
              isOpen={save.showFullSaveModal}
              onClose={() => {
                save.setShowFullSaveModal(false);
                
                setPendingNewAdventure(false);
              }}
              onSaved={() => {
                if (pendingNewAdventure) handleNewAdventure();
              }}
              mode={save.saveModalMode}
              currentData={
                save.saveModalMode === 'save'
                  ? {
                      messages: chat.messages,
                      aiSettings: aiSettings || loadAISettings(),
                      characters: charMgmt.characters,
                      activeCharacterId: charMgmt.activeCharacter?.id,
                      campaigns: campaigns,
                      activeCampaignId: charMgmt.activeGameState.campaign?.id,
                      npcs: [],
                      locations: [],
                      currentLocationId: undefined,
                      pdfMemory: pdf.pdfMemory,
                      notes: '',
                      sessionStartTime: save.sessionStartTime,
                    }
                  : undefined
              }
              onLoad={save.handleLoadFullSave}
            />
          )}

          {showGMTools && activeGMTool && resolvedEraContext && (
            <GMToolsModal
              tool={activeGMTool}
              onClose={() => {
                setShowGMTools(false);
                setActiveGMTool(null);
              }}
              activeCharacter={charMgmt.activeCharacter}
              currentLocation={chat.currentLocation}
              sessionId={charMgmt.activeGameState?.session?.id}
              eraContext={resolvedEraContext}
              onEventGenerated={(event) => {
                setPendingDirectorEvent(event);
                toast({
                  title: t('eventBufferedTitle'),
                  description: t('eventBufferedDescription'),
                });
                setShowGMTools(false);
                setActiveGMTool(null);
              }}
            />
          )}

          {languageSelectionRequired === false && (
            <>
              <ApiKeysModal
                open={showApiKeysModal}
                onOpenChange={handleApiKeysChange}
              />
              <RulebookModal
                open={showRulebookModal}
                onOpenChange={handleRulebookChange}
                gated={!rulesStatus.hasRules}
                onUploaded={handleRulebookUploaded}
                rulesCount={rulesStatus.rulesCount}
              />
            </>
          )}

          {}
          <LanguageSelectionModal
            open={languageSelectionRequired === true}
            onSelected={() => setLanguageSelectionRequired(false)}
          />

          {}
          {showDevelopmentModal && charMgmt.activeCharacter && (
            <DevelopmentPhaseModal
              isOpen={showDevelopmentModal}
              onClose={() => setShowDevelopmentModal(false)}
              character={charMgmt.activeCharacter}
              onCharacterUpdate={charMgmt.handleUpdateCharacter}
            />
          )}

          <APIUsageCounter />

          <HotSeatSetup
            open={showHotSeatSetup}
            onClose={() => setShowHotSeatSetup(false)}
            onStartHotSeat={hotSeat.initHotSeat}
            onChooseSolo={handleChooseSolo}
          />

          {}

          {cutsceneManager.isActive && (
            <CutscenePlayer
              cutscene={cutsceneManager.cutscene}
              onSegmentComplete={cutsceneManager.nextSegment}
              onSkip={cutsceneManager.skipCutscene}
              onPause={cutsceneManager.pause}
              onResume={cutsceneManager.resume}
              onMute={cutsceneManager.toggleMute}
              onClose={cutsceneManager.skipCutscene}
            />
          )}

          {showCharacterWizard && (
            <CharacterWizardV2
              onClose={() => {
                setShowCharacterWizard(false);
                setDuetCreatingPlayerName(null);
              }}
              onCharacterCreated={handleCharacterWizardCreated}
              adventureContext={adventureContext || undefined}
            />
          )}

          <HardLoadingScreen isVisible={tts.isInitialBuffering} />
        </>
      }
    >
      {languageSelectionRequired !== false ? (
        <div className="flex-1 w-full h-full bg-background relative z-10" />
      ) : (
        <ChatWindow
          messages={chat.messages}
          newMessage={chat.newMessage}
          setNewMessage={chat.setNewMessage}
          handleSendMessage={chat.handleSendMessage}
          onContinueNarration={chat.handleContinueNarration}
          currentAudio={tts.currentAudio}
          stopCurrentAudio={tts.stopCurrentAudio}
          toggleAudioPause={tts.toggleAudioPause}
          isAudioPaused={tts.isAudioPaused}
          isTTSEnabled={tts.isTTSEnabled}
          activeCharacter={charMgmt.activeCharacter}
          characters={charMgmt.characters}
          onJournalRoll={(roll, justification) => {
            const c = charMgmt.activeCharacter;
            if (!c) return;
            const updated = appendRollToJournal(c, roll, justification);
            if (updated !== c) charMgmt.handleUpdateCharacter(updated);
          }}
          onSpendLuck={(amount) => {
            const c = charMgmt.activeCharacter;
            if (!c) return;
            charMgmt.handleUpdateCharacter({
              ...c,
              luck: Math.max(0, c.luck - amount),
            });
          }}
          onUploadRules={() => setShowRulebookModal(true)}
          onSelectAdventure={() => openAdventureSelectorRef.current?.()}
          onSessionZero={() => openSessionZeroRef.current?.()}
          hasAdventure={!!adventureContext}
          adventureTitle={adventureContext?.title}
          adventureDescription={adventureContext?.description}
          region={adventureContext?.location}
          currentLocation={chat.currentLocation}
          onCreateCharacter={handleCreateCharacterForDuet}
          onPickPredefinedCharacter={() => {
            stampDuetTargetPlayer();
            setShowPredefinedSelector(true);
          }}
          onPickCharacter={handlePickCharacterForDuet}
          onSummarizeScene={handleSummarizeScene}
          isSummarizingScene={isSummarizingScene}
          isLoading={chat.isLoading}
          isInitialBuffering={tts.isInitialBuffering}
          isDuet={chat.isDuet}
          pendingDeclarations={chat.pendingDeclarations}
          playersAwaitingDeclaration={chat.playersAwaitingDeclaration}
          onAddDeclaration={chat.addDeclaration}
          onPassDeclaration={chat.passDeclaration}
          onSendTurn={chat.sendTurn}
          onSwitchPlayer={hotSeat.switchPlayer}
          onDisableHotSeat={hotSeat.disableHotSeat}
          onStartGame={handleStartGameGuarded}
          onQuickStart={handleQuickStartOnboarding}
          onChoosePlayMode={() => setShowHotSeatSetup(true)}
          onLoadSave={() => {
            save.setSaveModalMode('load');
            save.setShowFullSaveModal(true);
          }}
          onColdStart={fullReset.handleFullReset}
          hasRules={rulesStatus.hasRules}
          hasSessionZero={sessionZeroCompleted}
          hasStartedGame={hasStartedGame}
          onOpenApiKeys={() => setShowApiKeysModal(true)}
          hotSeatConfig={hotSeat.config}
          isSessionEnded={chat.isSessionEnded}
          sessionEndStatus={chat.sessionEndStatus}
          onConfirmAcquiredItem={chat.confirmAcquiredItem}
          onDismissAcquiredItem={chat.dismissAcquiredItem}
          onCharacterUpdate={charMgmt.handleUpdateCharacter}
        />
      )}
      {showPredefinedSelector && (
        <PredefinedCharactersSelector
          isOpen={showPredefinedSelector}
          onClose={() => setShowPredefinedSelector(false)}
          onSelectCharacter={handleSelectPredefinedCharacter}
          characters={
            adventureContext?.id && STREFA_11_ADVENTURES.some((adventure) => adventure.id === adventureContext.id)
              ? getStrefa11CharactersForAdventure(adventureContext.id)
              : PREDEFINED_CHARACTERS
          }
          currentEra={adventureContext?.era || 'classic'}
          filterByEra={!adventureContext?.id || !STREFA_11_ADVENTURES.some((adventure) => adventure.id === adventureContext.id)}
          eraContext={resolvedEraContext}
        />
      )}
    </ChatLayout>
  );
}
