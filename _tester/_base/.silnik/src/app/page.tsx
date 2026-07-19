'use client';

import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  Campaign,
  AdventureContext,
  Message,
  Character,
  JournalEntry,
} from '@/lib/types';
import {
  loadAISettings,
  saveAISettings,
  withVoiceEnabled,
  initializeDefaultPrompt,
} from '@/lib/ai-settings';
import type { AISettings } from '@/lib/ai-settings/types';
import { settingsEmitter } from '@/lib/settings-event-emitter';
import { appendRollToJournal } from '@/lib/journal/build-roll-entry';
import { useFirstRun } from '@/hooks/useFirstRun';
import { persistCharacters } from '@/lib/character-cloud-sync';
import { CthulhuSidebar } from '@/components/sidebar/CthulhuSidebar';
import { CharacterSheet } from '@/components/ui/character-sheet';
import { APIUsageCounter } from '@/components/ui/api-usage-counter';
import { useHotSeat } from '@/components/ui/player-switcher';
import { HotSeatSetup } from '@/components/ui/hot-seat-setup';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { CutscenePlayer } from '@/components/ui/cutscene-player';

// === HOOKI ===
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
import { getApiKeyHeaders } from '@/lib/api-keys-service';
import { hydrateCharacterImages } from '@/lib/character-image-store';
import { useSkillMarking } from '@/hooks/useSkillMarking';
import { markSkillForImprovement } from '@/lib/skill-migration';
import { toast } from '@/components/ui/use-toast';
import {
  findPlayerIndexForCharacter,
  getSessionCharacters,
} from '@/lib/hot-seat/session-party';
import {
  scopeAdventureJournalEntries,
  synchronizeAdventureJournal,
} from '@/lib/journal/shared-adventure-journal';

import { useEquipmentThumbnails } from '@/hooks/useEquipmentThumbnails';
import { migrateEquipmentCatalog } from '@/lib/equipment-catalog';

// Dynamic imports dla ciężkich komponentów
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

// Fala 2 - kreator pierwszego uruchomienia (klucz Gemini → podręcznik → indeks lokalny)
const FirstRunWizard = dynamic(
  () =>
    import('@/components/onboarding/FirstRunWizard').then((mod) => ({
      default: mod.FirstRunWizard,
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

/**
 * Główny komponent strony
 * Zrefaktoryzowany z użyciem dedykowanych hooków i layoutu
 */
export default function Home() {
  // === CORE HOOKS ===
  const tts = useTTS();
  const charMgmt = useCharacterManagement();

  // Wybrany kontekst przygody
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

  // IND-230: Faza Rozwoju CoC. Wynik testu [WYNIK:] z narracji MG ->
  // useChat.onSkillResults -> processSkillResults oznacza udane testy (bez Szczęścia,
  // z wykluczeniem Credit Rating/Mythos). handleUpdateCharacter persystuje postać.
  const skillMarking = useSkillMarking(
    charMgmt.activeCharacter,
    charMgmt.handleUpdateCharacter
  );
  const [showDevelopmentModal, setShowDevelopmentModal] = useState(false);
  const [sheetCharacter, setSheetCharacter] = useState<Character | null>(null);

  // IND-246: Hot Seat przed useChat - useChat wysyła hotSeat.config do /api/chat.
  const hotSeat = useHotSeat(charMgmt.characters);

  const { generateThumbnailsInBackground } = useEquipmentThumbnails({
    activeCharacter: charMgmt.activeCharacter,
    adventureContext,
    setActiveCharacter: charMgmt.setActiveCharacter,
    setCharacters: charMgmt.setCharacters,
  });

  const chat = useChat({
    pdfMemory: pdf.pdfMemory,
    activeCharacter: charMgmt.activeCharacter,
    characters: charMgmt.characters,
    setCharacters: charMgmt.setCharacters,
    setActiveCharacter: charMgmt.setActiveCharacter,
    voiceEnabled: tts.voiceEnabled,
    isTTSEnabled: tts.isTTSEnabled,
    generateVoiceForMessage: tts.generateVoiceForMessage,
    // M6 sesja 146: generateMultiVoice DROPPED per D3.
    addToQueue: tts.addToQueue,
    adventureContext,
    aiSettings,
    // W duecie oznaczenie wynika z faktycznego rzutu konkretnej postaci
    // (onJournalRoll poniżej), a nie z późniejszego tagu MG przypisanego do
    // globalnie aktywnego badacza.
    onSkillResults: hotSeat.config.enabled
      ? undefined
      : skillMarking.processSkillResults,
    hotSeatConfig: hotSeat.config,
    onSwitchHotSeatPlayer: hotSeat.switchPlayer,
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
    restoreHotSeatConfig: hotSeat.restoreConfig,
    clearDeclarations: chat.clearDeclarations,
  });

  // UI STATE
  const [showGMTools, setShowGMTools] = useState(false);
  const [activeGMTool, setActiveGMTool] = useState<string | null>(null);
  const [showHotSeatSetup, setShowHotSeatSetup] = useState(false);
  const [showApiKeysModal, setShowApiKeysModal] = useState(false);
  // Fala 2: kreator pierwszego uruchomienia (klucz Gemini → podręcznik → indeks lokalny)
  const [showFirstRunWizard, setShowFirstRunWizard] = useState(false);
  // "Nowa przygoda" z opcją zapisu: gdy true, po udanym zapisie resetujemy do kreatora
  const [pendingNewAdventure, setPendingNewAdventure] = useState(false);

  // Refs
  const openSessionZeroRef = useRef<(() => void) | null>(null);
  const openAdventureSelectorRef = useRef<(() => void) | null>(null);

  // Game State
  // Hydration-safe: SSR i PIERWSZY render klienta = false (brak dostępu do
  // localStorage przy hydratacji). Realne wartości dociągane po mount w
  // useEffect niżej. Czytanie localStorage w useState initializer dawało
  // SSR(false) != klient(localStorage) -> hydration mismatch na CthulhuSidebar
  // (className hideSidebarPanel) i WelcomeScreen.
  const [hasStartedGame, setHasStartedGame] = useState(false);
  const [sessionZeroCompleted, setSessionZeroCompleted] = useState(false);

  const customAdventures = useCustomAdventures();
  const cutsceneManager = useCutscene();
  // Fala 2: stan pierwszego uruchomienia (klucz + niepuste data/rag/rules → canPlay)
  const firstRun = useFirstRun();

  // === NOWE HOOKI (REFAKTORYZACJA) ===

  const { handleSummarizeScene, isSummarizingScene } = useSceneSummary({
    messages: chat.messages,
    activeCharacter: charMgmt.activeCharacter,
    adventureTitle: adventureContext?.title,
    setActiveCharacter: charMgmt.setActiveCharacter,
    setCharacters: charMgmt.setCharacters,
    characters: charMgmt.characters,
  });

  // IND-273 T3: proaktywny self-check klucza/modeli Gemini. onInvalidKey
  // stabilizowany useCallback (setShowApiKeysModal stałe) → runHealthCheck stały
  // → mount effect odpala raz.
  const handleInvalidKey = useCallback(() => setShowApiKeysModal(true), []);
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
    },
    aiSettings,
  });

  // W duecie gracz docelowy jest zawsze przekazywany przez jego własne miejsce
  // na ekranie startowym. localStorage przenosi tę jawną decyzję przez routing.
  const stampDuetTargetPlayer = useCallback(
    (playerName?: string) => {
      if (hotSeat.config.enabled && playerName) {
        localStorage.setItem('hotSeatCreatingPlayerName', playerName);
      }
    },
    [hotSeat.config.enabled]
  );

  const handleCreateCharacterForDuet = useCallback(
    (playerName?: string) => {
      stampDuetTargetPlayer(playerName);
      charMgmt.handleCharacterCreate();
    },
    [stampDuetTargetPlayer, charMgmt]
  );

  const handlePickCharacterForDuet = useCallback(
    (playerName?: string) => {
      stampDuetTargetPlayer(playerName);
      charMgmt.handleCharacterManage();
    },
    [stampDuetTargetPlayer, charMgmt]
  );

  const [showPredefinedSelector, setShowPredefinedSelector] = useState(false);
  const [predefinedTargetPlayer, setPredefinedTargetPlayer] = useState<
    string | undefined
  >();

  const handleSelectPredefinedCharacter = useCallback(
    (character: Character) => {
      const targetPlayer =
        predefinedTargetPlayer ||
        localStorage.getItem('hotSeatCreatingPlayerName') ||
        undefined;
      const stamped: Character = {
        ...character,
        id: `${character.id}_${Date.now()}`,
        sourcePresetId: character.id,
        playerName: targetPlayer || character.playerName,
      };

      if (targetPlayer) {
        localStorage.removeItem('hotSeatCreatingPlayerName');
      }

      const existingCharacters = charMgmt.characters.map((existing) =>
        targetPlayer && existing.playerName === targetPlayer
          ? { ...existing, playerName: '' }
          : existing
      );
      existingCharacters.push(stamped);

      charMgmt.setCharacters(existingCharacters);
      charMgmt.setActiveCharacter(stamped);
      persistCharacters(existingCharacters);

      setShowPredefinedSelector(false);
      setPredefinedTargetPlayer(undefined);
    },
    [charMgmt, predefinedTargetPlayer]
  );

  const unavailablePresetIds = hotSeat.config.enabled
    ? charMgmt.characters
        .filter(
          (character) =>
            character.playerName &&
            character.playerName !== predefinedTargetPlayer
        )
        .map((character) => character.sourcePresetId)
        .filter((id): id is string => !!id)
    : [];

  // Faza 4 + C2: guard startu duetu. TWARDY wymóg - każdy gracz musi mieć
  // WŁASNĄ, jawnie przypisaną postać (po imieniu gracza), i muszą to być 2
  // RÓŻNE postacie. Bez tego NIE startujemy (zamiast cichego pozycyjnego
  // fallbacku z bindCharactersByPlayerName, który po cichu przydzielał pierwszą
  // wolną postać). Solo: przepuszczamy prosto do handleStartGame.
  const handleStartGameGuarded = useCallback(() => {
    if (hotSeat.config.enabled) {
      const players = hotSeat.config.players;

      // Mapowanie po imieniu gracza: każdy gracz -> jego postać (playerName).
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
          ? `Każdy gracz musi mieć własną postać. Brakuje postaci dla: ${missing.join(', ')}. ` +
            'Użyj "Stwórz nową postać" lub "Wybierz z katalogu" dla każdego gracza.'
          : 'Obaj gracze nie mogą grać tą samą postacią - przypisz dwie różne postacie.';
        toast({
          title: 'Tryb dla dwojga niegotowy',
          description,
          variant: 'destructive',
        });
        return;
      }

      // Komplet po imionach potwierdzony - utrwal przypisanie w configu Hot Seat.
      hotSeat.bindCharactersByPlayerName(charMgmt.characters);
    }
    handleStartGame();
  }, [hotSeat, charMgmt.characters, handleStartGame]);

  // C3: przełączenie gracza (przełącznik osadzony w sidebarze). Przełącza
  // aktywnego gracza Hot Seat + ustawia jego postać jako aktywną w UI.
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

  // W rozpoczętej sesji duetowej widoki gry dostają wyłącznie dwie postacie
  // jawnie przypisane w HotSeatConfig. Lokalny katalog pozostaje nietknięty.
  const sessionCharacters = useMemo(() => {
    return getSessionCharacters(
      charMgmt.characters,
      hotSeat.config,
      hasStartedGame
    );
  }, [hasStartedGame, hotSeat.config, charMgmt.characters]);
  const allCharacters = charMgmt.characters;
  const handleCharactersChange = charMgmt.handleCharactersChange;

  const handleSessionCharacterSwitch = useCallback(
    (character: Character) => {
      if (hasStartedGame && hotSeat.config.enabled) {
        const playerIndex = findPlayerIndexForCharacter(
          hotSeat.config,
          character.id
        );
        if (playerIndex >= 0) {
          handleSwitchPlayer(playerIndex);
          return;
        }
      }
      charMgmt.handleCharacterSwitch(character);
    },
    [hasStartedGame, hotSeat.config, handleSwitchPlayer, charMgmt]
  );

  const handleUpdateAdventureJournal = useCallback(
    (journal: JournalEntry[]) => {
      const participantIds = sessionCharacters.map((character) => character.id);
      const updatedCharacters = synchronizeAdventureJournal(
        allCharacters,
        participantIds,
        journal,
        hotSeat.config.adventureJournalId
      );
      handleCharactersChange(updatedCharacters);
    },
    [
      allCharacters,
      handleCharactersChange,
      hotSeat.config.adventureJournalId,
      sessionCharacters,
    ]
  );

  // Starsze dzienniki nie miały identyfikatora przebiegu. Przypisujemy je raz
  // po rozpoczęciu sesji, a późniejsze przygody widzą już tylko własne wpisy.
  useEffect(() => {
    const adventureJournalId = hotSeat.config.adventureJournalId;
    if (
      !hasStartedGame ||
      !hotSeat.config.enabled ||
      !adventureJournalId ||
      sessionCharacters.length < 2
    ) {
      return;
    }
    const participantIds = sessionCharacters.map((character) => character.id);
    const scopedCharacters = scopeAdventureJournalEntries(
      allCharacters,
      participantIds,
      adventureJournalId
    );
    if (scopedCharacters !== allCharacters) {
      handleCharactersChange(scopedCharacters);
    }
  }, [
    allCharacters,
    handleCharactersChange,
    hasStartedGame,
    hotSeat.config.adventureJournalId,
    hotSeat.config.enabled,
    sessionCharacters,
  ]);

  // === EFFECTS ===
  // IND-150: split 52-lin useEffect (7 odpowiedzialności) na 4 useEffects per SRP.
  // Każdy mount-only (deps []), nie pogarsza pre-existing react-hooks/exhaustive-deps.

  // 1. Init default GM prompt (async one-shot)
  useEffect(() => {
    initializeDefaultPrompt().then((initialized) => {
      if (initialized) console.log('✅ Default GM prompt initialized');
    });
  }, []);

  // 1a. IND-273 T3: self-check zdrowia klucza/modeli przy starcie (TTL 24h dławi).
  // Zły klucz → modal BYOK (handleInvalidKey), brak modelu → toast + fallback.
  useEffect(() => {
    runHealthCheck();
  }, [runHealthCheck]);

  // 1a-bis. IND-273 T5b: auto-odświeżenie cennika Gemini (TTL 24h po stronie
  // serwera). Fire-and-forget; tanie gdy cache świeży (bez LLM). Po sukcesie serwer
  // nakłada overlay i licznik kosztów liczy świeższymi stawkami. Błąd = cisza (bundled).
  useEffect(() => {
    fetch('/api/pricing/refresh', { headers: getApiKeyHeaders() }).catch(
      () => {}
    );
  }, []);

  // 1b. Fala 2 - pierwsze uruchomienie ("Strażnik Tajemnic"): bez klucza Gemini LUB
  // bez wgranego podręcznika (pusty lokalny indeks data/rag/rules) pokazujemy kreator.
  // RAG jest lokalny - podręcznik wnosi gracz. W trybie lokalnym (LOCAL_MODE=true +
  // pełne data/rag) firstRun.needsWizard=false, więc kreator się nie pojawia (produkt A).
  useEffect(() => {
    if (!firstRun.loading && firstRun.needsWizard) setShowFirstRunWizard(true);
  }, [firstRun.loading, firstRun.needsWizard]);

  // 1c. Hydration-safe: dociągnij flagi stanu gry z localStorage PO mount.
  // useState startuje na false (= SSR), tu ustawiamy realną wartość, więc
  // pierwszy render klienta zgadza się z serwerem (brak hydration mismatch).
  useEffect(() => {
    if (localStorage.getItem('has_started_game') === 'true') {
      setHasStartedGame(true);
    }
    if (localStorage.getItem('session_zero_completed') === 'true') {
      setSessionZeroCompleted(true);
    }
  }, []);

  // 1d. DUET (Hot Seat): activePlayerIndex jest ŹRÓDŁEM PRAWDY aktywnej postaci.
  // Wymuszamy charMgmt.activeCharacter na postać aktywnego gracza za każdym razem,
  // gdy zmieni się indeks lub przypisanie postaci (switch / load / bind postaci po
  // imieniu). Bez tej synchronizacji activeCharacter (panele, Faza Rozwoju, atrybucja
  // tagów [SANITY:]/[HP:]/[DZIENNIK:]) rozjeżdżał się z etykietą przełącznika 🔄 -
  // panele czytały Marcusa, gdy przełącznik wskazywał Eleanor.
  useEffect(() => {
    if (!hotSeat.config.enabled) return;
    const player = hotSeat.config.players[hotSeat.config.activePlayerIndex];
    if (!player?.characterId) return;
    const target = charMgmt.characters.find((c) => c.id === player.characterId);
    if (target && target.id !== charMgmt.activeCharacter?.id) {
      charMgmt.setActiveCharacter(target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hotSeat.config,
    charMgmt.characters,
    charMgmt.activeCharacter,
    charMgmt.setActiveCharacter,
  ]);

  // Automatyczne generowanie grafik dla przedmiotów w tle przy zmianie postaci
  useEffect(() => {
    if (charMgmt.activeCharacter) {
      generateThumbnailsInBackground();
    }
  }, [charMgmt.activeCharacter, generateThumbnailsInBackground]);

  // 2. Load localStorage data (chat / characters / campaigns / pdf)
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
        const chars = (JSON.parse(savedChars) as Character[]).map((character) => ({
          ...character,
          equipment: migrateEquipmentCatalog(character.equipment),
        }));
        charMgmt.setCharacters(chars);
        if (chars.length > 0) charMgmt.setActiveCharacter(chars[0]);
        // IND-262: portret + miniatury ekwipunku żyją w IndexedDB (wycięte z
        // localStorage przez quota). Dociągnij je do rosteru po załadowaniu.
        hydrateCharacterImages(chars)
          .then((hydrated) => {
            charMgmt.setCharacters(hydrated);
            if (hydrated.length > 0) charMgmt.setActiveCharacter(hydrated[0]);
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

  // 3. Load AISettings + initialize TTS state
  useEffect(() => {
    const settings = loadAISettings();
    setAiSettings(settings);
    setVoiceFeatureAvailable(true);
    // IND-86: googleTTSEnabled DROPPED - voiceSettings.enabled = single source of truth
    const ttsEnabled = settings.voiceSettings?.enabled !== false;
    tts.setVoiceEnabled(ttsEnabled);
    tts.setIsTTSEnabled(ttsEnabled);
  }, []);

  // 4. Subscribe to reactive settings changes (settingsEmitter)
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

  // IND-258: przełącznik „Narracja bez lektora" w sidebarze. Pisze trwałe
  // voiceSettings.enabled przez saveAISettings → settingsEmitter → subskrypcja
  // (3. useEffect) ustawia runtime flagi TTS. Niezależny od presetu, sticky.
  const handleToggleNarrator = (enabled: boolean) => {
    saveAISettings(withVoiceEnabled(aiSettings ?? loadAISettings(), enabled));
    if (!enabled) {
      tts.stopCurrentAudio();
    }
  };

  const handleColdStart = useCallback(async () => {
    const confirmed = window.confirm(
      'Zimny start aplikacji usunie bieżącą sesję, postacie, ustawienia i zapisane gry. Automatyczna kopia zapisów zostanie zachowana, podobnie jak baza wiedzy (zasady, przygody i Mity). Czy kontynuować?'
    );
    if (!confirmed) return;

    try {
      const response = await fetch('/api/desktop/cold-start', {
        method: 'POST',
      });
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        window.alert(
          result.message ??
            'Pełny zimny start jest dostępny tylko w aplikacji uruchomionej przez launcher.'
        );
        return;
      }

      toast({
        title: 'Uruchamiam zimny start',
        description: 'Aplikacja zamknie się i za chwilę otworzy ponownie.',
      });
    } catch {
      window.alert(
        'Nie udało się przekazać polecenia do launchera. Uruchom aplikację ponownie i spróbuj jeszcze raz.'
      );
    }
  }, []);

  // "Nowa przygoda": pełny reset scenariusza → powrót do ekranu głównego (kreatora).
  // Czyści czat + wybraną przygodę + Sesję Zero, ale ZACHOWUJE postacie (roster) i
  // zasady (pdf_memory). Kontynuacja sesji z sejwu jest niezależna (handleLoadFullSave).
  const handleNewAdventure = () => {
    const adventureJournalId = hotSeat.config.adventureJournalId;
    if (adventureJournalId) {
      const scopedCharacters = scopeAdventureJournalEntries(
        charMgmt.characters,
        sessionCharacters.map((character) => character.id),
        adventureJournalId
      );
      if (scopedCharacters !== charMgmt.characters) {
        charMgmt.handleCharactersChange(scopedCharacters);
      }
    }
    chat.clearDeclarations();
    chat.setMessages([]);
    localStorage.removeItem('chat-messages');
    tts.stopCurrentAudio();
    // Muzyka tła (YouTube) gra tylko w trakcie gry - przy powrocie do menu cichnie.
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
    localStorage.removeItem('adventure_journal_id');
    // #7: tryb gry (Solo / duet) jest per-przygoda - nowa przygoda wraca do Solo.
    hotSeat.disableHotSeat();
  };

  // #7: wybór trybu Solo - wyłącza Hot Seat i (jeśli jest aktywna postać)
  // zapisuje imię gracza na jej karcie. Binding postaci do graczy to osobna faza.
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
          characters={sessionCharacters}
          onCharacterSwitch={handleSessionCharacterSwitch}
          onCharacterCreate={handleCreateCharacterForDuet}
          onCharacterManage={charMgmt.handleCharacterManage}
          onUpdateCharacter={charMgmt.handleUpdateCharacter}
          onUpdateSharedJournal={handleUpdateAdventureJournal}
          handleSendMessage={chat.handleSendMessage}
          activeGameState={charMgmt.activeGameState}
          voiceFeatureAvailable={voiceFeatureAvailable}
          voiceEnabled={tts.voiceEnabled}
          setVoiceEnabled={tts.setVoiceEnabled}
          isTTSEnabled={tts.isTTSEnabled}
          setIsTTSEnabled={tts.setIsTTSEnabled}
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
            // #4: "Wczytaj" otwiera katalog lokalnych sejwów (FullGameSaveModal),
            // a NIE legacy GameSession (chmura + "zapisz w trybie load").
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
          customAdventures={customAdventures.customAdventures}
          onUploadAdventure={customAdventures.uploadAdventure}
          onDeleteAdventure={customAdventures.deleteAdventure}
          isUploadingAdventure={customAdventures.isLoading}
          uploadProgressAdventure={customAdventures.uploadProgress}
          loadingStatusAdventure={customAdventures.loadingStatus}
          hotSeatConfig={hotSeat.config}
          aiSettings={aiSettings ?? undefined}
          onUpdateAISettings={setAiSettings}
        />
      }
      modals={
        <>
          {save.showFullSaveModal && (
            <FullGameSaveModal
              isOpen={save.showFullSaveModal}
              onClose={() => {
                save.setShowFullSaveModal(false);
                // Anulowanie zapisu NIE resetuje gry - kasujemy oczekujący reset
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
                      hotSeatConfig: hotSeat.config.enabled
                        ? hotSeat.config
                        : undefined,
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

          {showGMTools && activeGMTool && (
            <GMToolsModal
              tool={activeGMTool}
              onClose={() => {
                setShowGMTools(false);
                setActiveGMTool(null);
              }}
              activeCharacter={charMgmt.activeCharacter}
              currentLocation={chat.currentLocation}
              sessionId={charMgmt.activeGameState?.session?.id}
            />
          )}

          <ApiKeysModal
            open={showApiKeysModal}
            onOpenChange={setShowApiKeysModal}
          />

          {/* Fala 2 - kreator pierwszego uruchomienia (gate dla produktu B) */}
          <FirstRunWizard
            open={showFirstRunWizard}
            gated={!firstRun.canPlay}
            onCompleted={async () => {
              await firstRun.refresh();
              setShowFirstRunWizard(false);
            }}
            onClose={() => setShowFirstRunWizard(false)}
          />

          {/* IND-230: Faza Rozwoju CoC - rzuty na poprawę oznaczonych umiejętności */}
          {showDevelopmentModal && charMgmt.activeCharacter && (
            <DevelopmentPhaseModal
              isOpen={showDevelopmentModal}
              onClose={() => setShowDevelopmentModal(false)}
              character={charMgmt.activeCharacter}
              onCharacterUpdate={charMgmt.handleUpdateCharacter}
              characters={charMgmt.characters}
              onActiveCharacterChange={charMgmt.handleCharacterSwitch}
            />
          )}

          <APIUsageCounter />

          <HotSeatSetup
            open={showHotSeatSetup}
            onClose={() => setShowHotSeatSetup(false)}
            onStartHotSeat={hotSeat.initHotSeat}
            onChooseSolo={handleChooseSolo}
          />

          {sheetCharacter && (
            <CharacterSheet
              open={!!sheetCharacter}
              onOpenChange={(open) => !open && setSheetCharacter(null)}
              character={sheetCharacter}
              onCharacterUpdate={charMgmt.handleUpdateCharacter}
              characters={charMgmt.characters}
              onCharacterChange={(char) => {
                charMgmt.handleCharacterSwitch(char);
                setSheetCharacter(char);
              }}
            />
          )}

          {/* C3: przełącznik graczy przeniesiony do CthulhuSidebar (osadzony
              między panelem postaci a przyciskami akcji). */}

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
        </>
      }
    >
      <ChatWindow
        messages={chat.messages}
        newMessage={chat.newMessage}
        setNewMessage={chat.setNewMessage}
        handleSendMessage={chat.handleSendMessage}
        currentAudio={tts.currentAudio}
        stopCurrentAudio={tts.stopCurrentAudio}
        toggleAudioPause={tts.toggleAudioPause}
        isAudioPaused={tts.isAudioPaused}
        isTTSEnabled={tts.isTTSEnabled}
        activeCharacter={charMgmt.activeCharacter}
        characters={hasStartedGame ? sessionCharacters : charMgmt.characters}
        onJournalRoll={(roll, justification, characterId) => {
          const c =
            charMgmt.characters.find(
              (character) => character.id === characterId
            ) ?? charMgmt.activeCharacter;
          if (!c) return;
          let updated = appendRollToJournal(c, roll, justification);
          if (roll.passedRequirement && !roll.luckSpent && roll.skillName) {
            updated = markSkillForImprovement(updated, roll.skillName);
          }
          if (updated !== c) charMgmt.handleUpdateCharacter(updated);
        }}
        onSpendLuck={(amount, characterId) => {
          const c =
            charMgmt.characters.find(
              (character) => character.id === characterId
            ) ?? charMgmt.activeCharacter;
          if (!c) return;
          charMgmt.handleUpdateCharacter({
            ...c,
            luck: Math.max(0, c.luck - amount),
          });
        }}
        onUploadRules={() => document.getElementById('rules-upload')?.click()}
        onSelectAdventure={() => openAdventureSelectorRef.current?.()}
        onSessionZero={() => openSessionZeroRef.current?.()}
        hasAdventure={!!adventureContext}
        adventureTitle={adventureContext?.title}
        region={adventureContext?.location}
        currentLocation={chat.currentLocation}
        onCreateCharacter={handleCreateCharacterForDuet}
        onPickPredefinedCharacter={(playerName) => {
          stampDuetTargetPlayer(playerName);
          setPredefinedTargetPlayer(playerName);
          setShowPredefinedSelector(true);
        }}
        onPickCharacter={handlePickCharacterForDuet}
        onOpenCharacterSheet={setSheetCharacter}
        onSummarizeScene={handleSummarizeScene}
        isSummarizingScene={isSummarizingScene}
        isLoading={chat.isLoading}
        isDuet={chat.isDuet}
        pendingDeclarations={chat.pendingDeclarations}
        playersAwaitingDeclaration={chat.playersAwaitingDeclaration}
        onAddDeclaration={chat.addDeclaration}
        onPassDeclaration={chat.passDeclaration}
        currentPlayerName={chat.currentPlayerName}
        isTurnReady={chat.isTurnReady}
        onSendTurn={chat.sendTurn}
        onConfirmAcquiredItem={chat.confirmAcquiredItem}
        onDismissAcquiredItem={chat.dismissAcquiredItem}
        onStartGame={
          firstRun.canPlay
            ? handleStartGameGuarded
            : () => setShowFirstRunWizard(true)
        }
        onChoosePlayMode={() => setShowHotSeatSetup(true)}
        onLoadSave={() => {
          save.setSaveModalMode('load');
          save.setShowFullSaveModal(true);
        }}
        hasRules={!!pdf.pdfMemory.rulesUrl}
        hasSessionZero={sessionZeroCompleted}
        hasStartedGame={hasStartedGame}
        onOpenApiKeys={() => setShowApiKeysModal(true)}
        onColdStart={handleColdStart}
        hotSeatConfig={hotSeat.config}
        onSwitchPlayer={handleSwitchPlayer}
        onDisableHotSeat={hotSeat.disableHotSeat}
      />
      {showPredefinedSelector && (
        <PredefinedCharactersSelector
          isOpen={showPredefinedSelector}
          onClose={() => {
            setShowPredefinedSelector(false);
            setPredefinedTargetPlayer(undefined);
            localStorage.removeItem('hotSeatCreatingPlayerName');
          }}
          onSelectCharacter={handleSelectPredefinedCharacter}
          currentEra={adventureContext?.era || 'classic'}
          targetPlayerName={predefinedTargetPlayer}
          unavailablePresetIds={unavailablePresetIds}
        />
      )}
    </ChatLayout>
  );
}
