'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
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
import { useFirstRun } from '@/hooks/useFirstRun';
import { CthulhuSidebar } from '@/components/sidebar/CthulhuSidebar';
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
import { useFullReset } from '@/hooks/useFullReset';
import { toast } from '@/components/ui/use-toast';
import { BUILT_IN_ADVENTURES } from '@/lib/adventures-data';
import { PREDEFINED_CHARACTERS } from '@/lib/immersion/predefined-characters';

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

  // IND-246: Hot Seat przed useChat - useChat wysyła hotSeat.config do /api/chat.
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
    // M6 sesja 146: generateMultiVoice DROPPED per D3.
    addToQueue: tts.addToQueue,
    adventureContext,
    aiSettings,
    onSkillResults: skillMarking.processSkillResults,
    hotSeatConfig: hotSeat.config,
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
  const fullReset = useFullReset();

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

  // Faza 2 + C2: gdy duet aktywny, stwórz/wybierz postać zapamiętuje (kanał
  // localStorage) dla którego gracza ją przypisujemy. Dzięki temu /characters/new
  // (tworzenie) oraz /characters (wybór z katalogu) ostemplują `playerName`,
  // a guard C2 może wymagać jawnego przypisania 2 RÓŻNYCH postaci po imieniu.
  // Solo: zachowanie bez zmian (zero setItem).
  const stampDuetTargetPlayer = useCallback(() => {
    if (hotSeat.config.enabled && hotSeat.config.players.length >= 2) {
      const nextUnbound = hotSeat.config.players.find(
        (p) =>
          !charMgmt.characters.some((c) => c.playerName === p.name) &&
          !p.characterId
      );
      const target = nextUnbound?.name ?? hotSeat.config.players[0]?.name;
      if (target) localStorage.setItem('hotSeatCreatingPlayerName', target);
    }
  }, [hotSeat.config, charMgmt.characters]);

  const handleCreateCharacterForDuet = useCallback(() => {
    stampDuetTargetPlayer();
    charMgmt.handleCharacterCreate();
  }, [stampDuetTargetPlayer, charMgmt]);

  const handlePickCharacterForDuet = useCallback(() => {
    stampDuetTargetPlayer();
    charMgmt.handleCharacterManage();
  }, [stampDuetTargetPlayer, charMgmt]);

  const [showPredefinedSelector, setShowPredefinedSelector] = useState(false);

  const handleSelectPredefinedCharacter = useCallback((character: Character) => {
    const stamped = {
      ...character,
      id: `${character.id}_${Date.now()}` // zrób unikalne ID per instancja postaci
    };
    
    // Obsługa Hot Seat
    const targetPlayer = localStorage.getItem('hotSeatCreatingPlayerName');
    if (targetPlayer) {
      stamped.playerName = targetPlayer;
      localStorage.removeItem('hotSeatCreatingPlayerName');
    }

    const existingCharacters = [...charMgmt.characters];
    existingCharacters.push(stamped);
    
    // Zapisz przez charMgmt i zaktualizuj aktywnego badacza
    charMgmt.setCharacters(existingCharacters);
    charMgmt.setActiveCharacter(stamped);
    
    // Persystencja
    const { persistCharacters } = require('@/lib/character-cloud-sync');
    persistCharacters(existingCharacters);
    
    setShowPredefinedSelector(false);
  }, [charMgmt]);

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
  const handleQuickStartOnboarding = useCallback(
    (adventureId: string, characterId: string) => {
      // 1. Ustaw przygodę
      const adv = BUILT_IN_ADVENTURES.find((a) => a.id === adventureId);
      if (adv) {
        setAdventureContext(adv);
        if (typeof window !== 'undefined') {
          localStorage.setItem('adventure_context', JSON.stringify(adv));
        }
      }

      // 2. Ustaw postać z presetów
      const preset = PREDEFINED_CHARACTERS.find((c) => c.id === characterId);
      if (preset) {
        const stamped: Character = {
          ...preset,
          id: `char_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        };
        const updatedList = [...charMgmt.characters, stamped];
        charMgmt.setCharacters(updatedList);
        charMgmt.setActiveCharacter(stamped);
        try {
          const { persistCharacters } = require('@/lib/character-cloud-sync');
          persistCharacters(updatedList);
        } catch {
          // fallback lokalny
        }
      }
      setShowFirstRunWizard(false);
    },
    [charMgmt]
  );

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
        const chars = JSON.parse(savedChars) as Character[];
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
  };

  // "Nowa przygoda": pełny reset scenariusza → powrót do ekranu głównego (kreatora).
  // Czyści czat + wybraną przygodę + Sesję Zero, ale ZACHOWUJE postacie (roster) i
  // zasady (pdf_memory). Kontynuacja sesji z sejwu jest niezależna (handleLoadFullSave).
  const handleNewAdventure = () => {
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
            onQuickStart={handleQuickStartOnboarding}
            onClose={() => setShowFirstRunWizard(false)}
          />

          {/* IND-230: Faza Rozwoju CoC - rzuty na poprawę oznaczonych umiejętności */}
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
        onUploadRules={() => document.getElementById('rules-upload')?.click()}
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
        isDuet={chat.isDuet}
        pendingDeclarations={chat.pendingDeclarations}
        playersAwaitingDeclaration={chat.playersAwaitingDeclaration}
        onAddDeclaration={chat.addDeclaration}
        onSendTurn={chat.sendTurn}
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
        onColdStart={fullReset.handleFullReset}
        hasRules={!!pdf.pdfMemory.rulesUrl}
        hasSessionZero={sessionZeroCompleted}
        hasStartedGame={hasStartedGame}
        onOpenApiKeys={() => setShowApiKeysModal(true)}
        hotSeatConfig={hotSeat.config}
      />
      {showPredefinedSelector && (
        <PredefinedCharactersSelector
          isOpen={showPredefinedSelector}
          onClose={() => setShowPredefinedSelector(false)}
          onSelectCharacter={handleSelectPredefinedCharacter}
          currentEra={adventureContext?.era || 'classic'}
        />
      )}
    </ChatLayout>
  );
}
