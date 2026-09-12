'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  Message,
  Character,
  GameTime,
  AdventureContext,
  HotSeatConfig,
  HotSeatPlayer,
  JournalEntry,
  NPC,
} from '@/lib/types';
import {
  createChaseState,
  speedRollOutcomeFromCheck,
  type ChaseState,
} from '@/lib/chase/chase-engine';
import { evaluateSkillCheck, rollD100 } from '@/lib/dice-utils';
import {
  resolveTestValue,
  resolveSkillBaseValue,
  UNKNOWN_SKILL_BASE,
} from '@/lib/skill-test-resolver';
import {
  sanitizeCharacterForApi,
  sanitizeHistoryForApi,
} from '@/lib/chat-history-sanitizer';
import type { SkillTestData } from '@/lib/parsers/types';
import type { SkillTestResult } from '@/lib/response-parser';
import {
  extractHazardEvents,
  extractSkillResults,
  extractSpellCastEvents,
  extractTomeStudyEvents,
  stripMeleeAttackTags,
} from '@/lib/parsers/mechanics-parser';
import { extractLatestTagLocation } from '@/lib/parsers/event-parser';
import { fetchWithApiKeys, hasRequiredKeys } from '@/lib/api-keys-service';
import { timeManager } from '@/lib/time-manager';
import { parseSSEStream, createSseParseErrorHandler } from '@/lib/sse-parser';
import { trackEvent } from '@/lib/posthog';
import type { AISettings } from '@/lib/ai-settings/types';
import {
  imageCooldownMsForLevel,
  MAX_IMAGES_PER_SCENE,
} from '@/lib/constants/chat';
import { resolveImageLevel } from '@/lib/prompts/image-instructions';
import { VisualBeliefGraph } from '@/lib/images/visual-belief-graph';
import { directSceneIllustrations } from '@/lib/images/proactive-scene-director';
import { appendJournalToParty } from '@/lib/journal/apply-journal-tags';
import { applyStatChangesToParty } from '@/lib/character/apply-stat-changes';
import { applyEquipmentEventsToParty } from '@/lib/character/apply-equipment-events';
import { toast } from '@/components/ui/use-toast';
import { resolveCharacterByName } from '@/lib/character/match-by-name';
import { persistCharacters } from '@/lib/character-cloud-sync';
import { persistentMediaCache } from '@/lib/persistent-media-cache';
import { createEquipmentItem } from '@/lib/equipment-data';
import {
  createAcquiredEquipmentSeed,
  extractAcquiredItemProposals,
} from '@/lib/acquired-equipment';
import {
  buildEquipmentImagePrompt,
  isCharacterBoundEquipment,
} from '@/lib/equipment-prompt-builder';
import { resolveEraVisualProfile } from '@/lib/era-visual-style';
import { isCheatCommand, executeCheatCommand } from '@/lib/cheats/cheat-engine';
import type {
  CombatResolution,
  PendingMeleeAttack,
  DefenseChoice,
  ManeuverType,
} from '@/lib/combat/combat-resolver';
import {
  createCombatRoundJournal,
  loadCombatJournal,
  resolveCombatJournalEvent,
  saveCombatJournal,
  type CombatRoundJournal,
} from '@/lib/combat/combat-transaction';
import {
  getCombatDefenseWeapons,
  type CombatDefenseWeaponOption,
} from '@/lib/combat/weapon-context';
import { loadCampaignMemoryScope } from '@/core/memory/campaign-scope';

const MESSAGES_STORAGE_KEY = 'zew_chat_messages';
const ACTIVE_CHASE_STORAGE_KEY = 'zew_active_chase_state';

type MechanicsContext = {
  chase?: ChaseState;
  combat?: { resolutions: CombatResolution[] };
};

function loadNpcSnapshot(): NPC[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem('gm_npcs') || '[]');
    return Array.isArray(parsed) ? (parsed as NPC[]) : [];
  } catch {
    return [];
  }
}

/**
 * Zadanie 6 (hardening demo-safe): chwilowy blip sieci ≠ crash gry.
 *
 * `fetch` rzuca `TypeError` ("Failed to fetch" w Chrome, "NetworkError" w Firefox)
 * przy zerwaniu połączenia - to inny przypadek niż odpowiedź serwera z błędem
 * (np. 500), którą zwraca normalnie jako `Response`. Tu ponawiamy WYŁĄCZNIE błędy
 * sieciowe (1-2 próby, krótki backoff). HTTP 4xx/5xx idą dalej do callera bez
 * retry (to nie jest blip - ponawianie nic nie da). Minimal-touch: opakowuje
 * istniejące `fetchWithApiKeys`, nie zmienia reszty przepływu.
 */
function isNetworkBlip(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  // Niektóre środowiska rzucają zwykły Error z komunikatem sieciowym.
  const msg = error instanceof Error ? error.message : String(error);
  return /failed to fetch|networkerror|network request failed/i.test(msg);
}

async function fetchWithRetry(
  url: string,
  options: Parameters<typeof fetchWithApiKeys>[1],
  retries = 2,
  backoffMs = 300
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetchWithApiKeys(url, options);
    } catch (error) {
      lastError = error;
      // Ponawiamy tylko chwilowe błędy sieci; reszta (np. przerwany abort, bugi
      // kodu) leci od razu do callera.
      if (!isNetworkBlip(error) || attempt === retries) throw error;
      await new Promise((resolve) =>
        setTimeout(resolve, backoffMs * (attempt + 1))
      );
    }
  }
  throw lastError;
}

/**
 * IND-142: manual type guard dla persistowanego Message (localStorage JSON parse).
 * Single-instance + best-effort: niezgodne wpisy pomijamy, korumpowane localStorage = reset.
 */
function isPersistedMessage(raw: unknown): raw is {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string | number;
} {
  if (!raw || typeof raw !== 'object') return false;
  const m = raw as Record<string, unknown>;
  if (typeof m.id !== 'string') return false;
  if (m.role !== 'user' && m.role !== 'assistant') return false;
  if (typeof m.content !== 'string') return false;
  if (typeof m.timestamp !== 'string' && typeof m.timestamp !== 'number')
    return false;
  return true;
}

/**
 * Parser zwraca skillTests ze skillValue=0 ("uzupełnione z karty postaci").
 * Dociągamy wartość przez `resolveTestValue` (IND-229), który obsługuje:
 *  - Poczytalność/SAN → character.san,
 *  - testy cech (Siła/Inteligencja/Moc…) → charakterystyki,
 *  - warianty/synonimy nazw umiejętności (np. "Komputerologia" → "Komputery").
 * Wcześniej resolver szukał tylko w `character.skills`, więc SAN i cechy zawsze były 0%.
 * Snapshot w momencie żądania (Hot Seat: wartość należy do gracza aktywnego przy teście).
 */
export function resolveSkillTestValues(
  tests: SkillTestData[],
  character: Character | null,
  characters: Character[] = []
): SkillTestData[] {
  if (!character) return tests;
  const roster = characters.length > 0 ? characters : [character];
  return tests.map((test) => {
    const target = resolveCharacterByName(
      roster,
      test.characterName,
      character
    );
    return {
      ...test,
      characterId: target.id,
      characterName: target.name,
      // Degradacja: karta postaci → bazowa tabela CoC 7e (BASE_SKILLS) → stała.
      // NIGDY 0% (próg ≤0 = absurdalny test gwarantowanej porażki).
      skillValue:
        resolveTestValue(test.skillName, target) ??
        resolveSkillBaseValue(test.skillName) ??
        UNKNOWN_SKILL_BASE,
    };
  });
}

/**
 * Faza 3 Hot Seat: rozwiązuje characterId → characterName dla każdego gracza,
 * by serwerowy blok duetu (build-context.ts) mógł adresować postacie po imieniu
 * (`@ImięPostaci:`). `HotSeatPlayer` w configu trzyma tylko `characterId` -
 * build-context czyta `characterName`, więc bez tego mapowania adresowanie duetu
 * nigdy nie ruszy.
 *
 * Forward-compatible: gdy `characterId` nie wskazuje istniejącej postaci (binding
 * jeszcze nie istnieje), `characterName` zostaje `undefined` → JSON.stringify je
 * pomija → blok duetu się nie wstrzykuje (poprawnie, brak halucynowanych imion).
 *
 * @returns kopia configu z wzbogaconymi graczami; `null/undefined` przechodzi 1:1.
 */
function resolveHotSeatCharacterNames(
  config: HotSeatConfig | null | undefined,
  characters: Character[]
):
  | (HotSeatConfig & {
      players: (HotSeatPlayer & { characterName?: string })[];
    })
  | null
  | undefined {
  if (!config) return config;
  return {
    ...config,
    players: config.players.map((player) => ({
      ...player,
      characterName: characters.find((c) => c.id === player.characterId)?.name,
    })),
  };
}

export interface ImageToGenerate {
  prompt: string;
  style?:
    | 'horror'
    | 'vintage'
    | 'realistic'
    | 'artistic'
    | 'portrait'
    | 'item'
    | 'location';
  priority?: 'high' | 'normal';
  isMythos?: boolean;
  type?: 'portrait' | 'scene' | 'location' | 'item' | 'monster' | 'vision';
  aspectRatio?: string;
  portraitName?: string;
  itemName?: string;
  locationName?: string;
}

/**
 * C4 (duet): pojedyncza deklaracja gracza w buforze tury. Enter w trybie dla
 * dwojga DOKŁADA deklarację (nie wysyła) - dopiero "Wyślij turę" składa je w
 * jedną wiadomość do MG z atrybucją gracza/postaci.
 */
export interface PendingDeclaration {
  playerId: string;
  playerName: string;
  /** Imię postaci gracza (gdy przypisana) - do adresowania `@ImięPostaci`. */
  characterName?: string;
  text: string;
}

export function isTurnReady(
  declarations: PendingDeclaration[],
  players: HotSeatPlayer[]
): boolean {
  return (
    players.length >= 2 &&
    players.every((player) =>
      declarations.some((declaration) => declaration.playerId === player.id)
    )
  );
}

/**
 * C4 (duet): składa zebrane deklaracje w JEDNĄ wiadomość do MG. Format z
 * atrybucją gracza i postaci, np.:
 *   "Gracz 1 (@Eleonora): otwieram drzwi ; Gracz 2 (@Tomasz): zaglądam pod łóżko"
 * `@ImięPostaci` jest zgodne z konwencją adresowania duetu (OPT-22 / build-context).
 */
export function composeTurnFromDeclarations(
  declarations: PendingDeclaration[]
): string {
  return declarations
    .map((d, i) => {
      const who = d.characterName
        ? `${d.playerName} (@${d.characterName})`
        : d.playerName || `Gracz ${i + 1}`;
      return `${who}: ${d.text}`;
    })
    .join(' ; ');
}

export interface PdfMemory {
  rulesUrl?: string;
  rulesTextUrl?: string;
  rulesGeminiFileUri?: string;
  adventureUrl?: string;
  adventureTextUrl?: string;
  adventureGeminiFileUri?: string;
  lastUpdated?: string;
}

export type SessionEndStatus = 'idle' | 'awaiting_player_closure' | 'ended';

export interface UseChatReturn {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  newMessage: string;
  setNewMessage: React.Dispatch<React.SetStateAction<string>>;
  handleSendMessage: (
    message: string,
    mechanicsContext?: MechanicsContext
  ) => Promise<boolean>;
  pendingCombatAttack: PendingMeleeAttack | null;
  pendingCombatDefensesUsed: number;
  combatDefenseWeapons: CombatDefenseWeaponOption[];
  handleCombatDefense: (
    attack: PendingMeleeAttack,
    choice: DefenseChoice,
    weapon?: CombatDefenseWeaponOption,
    maneuverType?: ManeuverType
  ) => Promise<void>;
  handleKeyPress: (e: React.KeyboardEvent) => void;
  generateImages: (
    illustrations: ImageToGenerate[],
    messageId: string
  ) => Promise<void>;
  isLoading: boolean;
  handleContinueNarration?: (messageId?: string) => Promise<void>;

  /** IND-267: bieżąca lokacja bohatera z najnowszego [LOKACJA:] (pineska 📍 w headerze). */
  currentLocation: string;
  // === C4 (duet): bufor deklaracji + wysyłka tury ===
  /** Czy aktywny tryb dla dwojga (Hot Seat 2 graczy) - decyduje o buforowaniu. */
  isDuet: boolean;
  /** Zebrane deklaracje bieżącej tury (puste w solo). */
  pendingDeclarations: PendingDeclaration[];
  /** Gracze, którzy jeszcze nie zadeklarowali w tej turze (do podpowiedzi w UI). */
  playersAwaitingDeclaration: { id: string; name: string }[];
  /** Dokłada deklarację AKTUALNEGO gracza do bufora (Enter w duecie). */
  addDeclaration: (text: string) => void;
  /** Zapisuje jawną deklarację braku działania dla aktualnego gracza. */
  passDeclaration: () => void;
  /** Gracz, którego deklarację aktualnie wpisujemy. */
  currentPlayerName?: string;
  /** Komplet deklaracji wymagany do wysłania tury. */
  isTurnReady: boolean;
  /** Czyści bufor deklaracji bieżącej tury. */
  clearDeclarations: () => void;
  /** Składa bufor w jedną wiadomość i wysyła do MG (przycisk "Wyślij turę"). */
  sendTurn: () => void;
  confirmAcquiredItem: (
    messageId: string,
    proposalId: string,
    characterId?: string
  ) => Promise<void>;
  dismissAcquiredItem: (messageId: string, proposalId: string) => void;
  /** Stan informujący o zakończeniu sesji gier po tagu [KONIEC_SESJI:POTWIERDZENIE] */
  isSessionEnded: boolean;
  /** Dwuetapowy stan końca sesji (idle | awaiting_player_closure | ended) */
  sessionEndStatus: SessionEndStatus;
  // Retro Cheats
  cheatCombatModal: {
    attackerName: string;
    attackerWeapon?: string;
    dodgeSkill: number;
    brawlSkill: number;
    playerBuild?: number;
    attackerBuild?: number;
  } | null;
  setCheatCombatModal: React.Dispatch<
    React.SetStateAction<{
      attackerName: string;
      attackerWeapon?: string;
      dodgeSkill: number;
      brawlSkill: number;
      playerBuild?: number;
      attackerBuild?: number;
    } | null>
  >;
  cheatChaseModal: boolean;
  setCheatChaseModal: React.Dispatch<React.SetStateAction<boolean>>;
  activeChaseState: ChaseState | null;
  setActiveChaseState: React.Dispatch<React.SetStateAction<ChaseState | null>>;
}

function resolveEquipmentVisualEra(context?: AdventureContext | null): string {
  return resolveEraVisualProfile(
    context?.yearRange || context?.eraLabel || context?.era || '1920s'
  );
}

interface UseChatOptions {
  locale?: 'pl' | 'en';
  pdfMemory: PdfMemory;
  activeCharacter: Character | null;
  characters: Character[];
  setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
  setActiveCharacter: React.Dispatch<React.SetStateAction<Character | null>>;
  voiceEnabled: boolean;
  isTTSEnabled: boolean;
  generateVoiceForMessage: (
    message: Message,
    messages: Message[]
  ) => Promise<void>;
  // M6 sesja 146: generateMultiVoice DROPPED per D3.
  addToQueue: (text: string, messageId?: string) => void;
  onSkillResults?: (results: SkillTestResult[]) => void;
  adventureContext?: AdventureContext | null;
  aiSettings?: AISettings | null;
  // IND-246: konfiguracja Hot Seat (2 graczy) - wysyłana do /api/chat, by
  // serwerowy HOT SEAT FIX (build-context.ts) wstrzyknął listę obu postaci
  // do promptu AI (AI rozpoznaje i adresuje obu graczy, nie tylko aktywnego).
  hotSeatConfig?: HotSeatConfig | null;
  /** Wydarzenie z generatora fabularnego zrzucone z UI */
  pendingDirectorEvent?:
    | import('@/lib/random-event-generator').RandomEvent
    | null;
  /** Czyszczenie wydarzenia po wysłaniu do LLM */
  clearPendingDirectorEvent?: () => void;
  /** Po zapisaniu deklaracji przełącza UI na kolejnego oczekującego gracza. */
  onSwitchHotSeatPlayer?: (playerIndex: number) => void;
}

export function useChat(options: UseChatOptions): UseChatReturn {
  const {
    pdfMemory,
    activeCharacter,
    characters,
    setCharacters,
    setActiveCharacter,
    voiceEnabled,
    isTTSEnabled,
    generateVoiceForMessage,
    onSkillResults,
    adventureContext,
    hotSeatConfig,
    onSwitchHotSeatPlayer,
    locale = 'pl',
  } = options;

  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(MESSAGES_STORAGE_KEY);
        if (saved) {
          const parsed: unknown = JSON.parse(saved);
          if (!Array.isArray(parsed)) {
            console.warn(
              'IND-142: korumpowane localStorage messages (nie tablica), resetuję'
            );
            localStorage.removeItem(MESSAGES_STORAGE_KEY);
            return [];
          }
          const valid: Message[] = [];
          for (const raw of parsed) {
            if (!isPersistedMessage(raw)) continue;
            valid.push({
              ...raw,
              timestamp: new Date(raw.timestamp),
            } as Message);
          }
          return valid;
        }
      } catch (e) {
        console.warn('IND-142: Failed to load messages:', e);
        try {
          localStorage.removeItem(MESSAGES_STORAGE_KEY);
        } catch {
          /* ignore */
        }
      }
    }
    return [];
  });
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionEnded, setIsSessionEnded] = useState(false);
  // Retro Cheats - stany modali wyzwalanych kodami [COMBAT] i [CHASE]
  const [cheatCombatModal, setCheatCombatModal] = useState<{
    attackerName: string;
    attackerWeapon?: string;
    dodgeSkill: number;
    brawlSkill: number;
    playerBuild?: number;
    attackerBuild?: number;
  } | null>(null);
  const [cheatChaseModal, setCheatChaseModal] = useState<boolean>(false);
  const combatJournalRef = useRef<CombatRoundJournal | null>(
    typeof window === 'undefined' ? null : loadCombatJournal(localStorage)
  );
  const shouldRecoverCombatCommitRef = useRef(
    combatJournalRef.current?.phase === 'committing'
  );
  const [pendingCombatAttack, setPendingCombatAttack] =
    useState<PendingMeleeAttack | null>(() => {
      const journal = combatJournalRef.current;
      return (
        journal?.attacks.find(
          (attack) =>
            !journal.resolutions.some(
              (resolution) => resolution.eventId === attack.eventId
            )
        ) ?? null
      );
    });
  const [activeChaseState, setActiveChaseState] = useState<ChaseState | null>(
    () => {
      if (typeof window === 'undefined') return null;
      try {
        const active = localStorage.getItem(ACTIVE_CHASE_STORAGE_KEY);
        if (active) return JSON.parse(active) as ChaseState;
        const stored = JSON.parse(
          localStorage.getItem(MESSAGES_STORAGE_KEY) || '[]'
        ) as Message[];
        return (
          [...stored].reverse().find((item) => item.mechanicsContext?.chase)
            ?.mechanicsContext?.chase ?? null
        );
      } catch {
        return null;
      }
    }
  );

  const [sessionEndStatus, setSessionEndStatus] =
    useState<SessionEndStatus>('idle');
  const [lastImageTime, setLastImageTime] = useState(0);

  const activeChaseStateRef = useRef<ChaseState | null>(activeChaseState);

  useEffect(() => {
    activeChaseStateRef.current = activeChaseState;
    if (typeof window === 'undefined') return;
    if (activeChaseState) {
      localStorage.setItem(
        ACTIVE_CHASE_STORAGE_KEY,
        JSON.stringify(activeChaseState)
      );
    } else {
      localStorage.removeItem(ACTIVE_CHASE_STORAGE_KEY);
    }
  }, [activeChaseState]);

  useEffect(() => {
    if (messages.length === 0) {
      setIsSessionEnded(false);
      setSessionEndStatus('idle');
    }
  }, [messages.length]);
  // C4 (duet): bufor deklaracji per gracz (pusty w solo, zerowany po wysłaniu tury).
  const [pendingDeclarations, setPendingDeclarations] = useState<
    PendingDeclaration[]
  >([]);
  // IND-267: bieżąca lokacja bohatera z najnowszego [LOKACJA:]. `currentLocation` zasila
  // pineskę 📍 w headerze; `currentLocationRef` lustruje wartość, by `handleSendMessage`
  // wysłał ją do promptu (build-context.ts) BEZ wpisywania jej w tablicę zależności callbacka.
  const [currentLocation, setCurrentLocation] = useState('');
  const currentLocationRef = useRef('');
  // 2026-06-28: licznik obrazów per scena (scena = lokacja). Cap MAX_IMAGES_PER_SCENE
  // OGRANICZA serię obrazów w jednej lokacji; resetuje się przy zmianie lokacji.
  // `lastTrackedSceneRef` pamięta lokację, dla której liczymy, by wykryć zmianę sceny.
  const sceneImageCountRef = useRef(0);
  const lastTrackedSceneRef = useRef('');
  // Visual Belief Graph (DeepMind Proactive T2I)
  const visualBeliefGraphRef = useRef<VisualBeliefGraph>(new VisualBeliefGraph());

  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      // IND-142: persistuj historię BEZ ciężkich base64 obrazów (reuse sanitizera
      // IND-237). Obrazy data: URL (~2MB każdy, generatedImages + intro inline w
      // content) przepełniały localStorage (~5MB) → QuotaExceededError crashował
      // całą apkę przez error boundary. Strip + try/catch = graceful (analog ścieżki
      // odczytu). Stan/UI renderuje z oryginału, więc obrazy nadal widać w sesji.
      try {
        localStorage.setItem(
          MESSAGES_STORAGE_KEY,
          JSON.stringify(sanitizeHistoryForApi(messages))
        );
      } catch (e) {
        console.warn('IND-142: nie udało się zapisać historii (quota?):', e);
      }
    }
  }, [messages]);

  // IND-262: hydracja obrazów scen czatu z IndexedDB na mount. Po reloadzie/crashu
  // generatedImages jest stripowane z localStorage (sanitizer), ale lekkie
  // generatedImageCacheIds przeżywają. Wczytujemy obrazy z persistentMediaCache i
  // populujemy generatedImages → obrazy "wracają na miejsce". Iterujemy po cacheIds
  // (getChatImage per indeks), NIE getAllChatImagesForMessage (urywa się na 1. luce
  // gdy zapis pośredniego indeksu padł). Persist potem znów stripuje base64 do
  // KOPII (in-memory zostaje) → localStorage nigdy nie trzyma base64, brak pętli.
  useEffect(() => {
    if (!persistentMediaCache.isAvailable()) return;
    let cancelled = false;
    void (async () => {
      const toHydrate = messages.filter(
        (m) =>
          (m.generatedImageCacheIds?.length ?? 0) > 0 &&
          (m.generatedImages?.length ?? 0) === 0
      );
      if (toHydrate.length === 0) return;
      const hydrated = new Map<string, string[]>();
      for (const m of toHydrate) {
        const ids = m.generatedImageCacheIds ?? [];
        const urls: string[] = [];
        for (let idx = 0; idx < ids.length; idx++) {
          const url = await persistentMediaCache.getChatImage(m.id, idx);
          if (url) urls.push(url);
        }
        if (urls.length > 0) hydrated.set(m.id, urls);
      }
      // cancelled guard pokrywa StrictMode double-mount: 1. run zostaje anulowany
      // przez cleanup → skip setMessages, 2. run aplikuje.
      if (cancelled || hydrated.size === 0) return;
      setMessages((prev) =>
        prev.map((m) =>
          hydrated.has(m.id) ? { ...m, generatedImages: hydrated.get(m.id) } : m
        )
      );
    })();
    return () => {
      cancelled = true;
    };
    // Run-once na mount: czyta snapshot wiadomości z initializera (localStorage).
    // Nowe wiadomości w sesji mają base64 in-memory → guard pustego generatedImages.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pineska lokacji: zasiej `currentLocation` lokacją przygody, dopóki AI nie wyemituje
  // pierwszego [LOKACJA:]. Bez tego stare sesje (gdzie tag rzadko padał) miały pustą
  // pineskę. Warunek `!currentLocationRef.current` chroni przed nadpisaniem bieżącej
  // lokacji po ruchu gracza; tag [LOKACJA:] z AI (niżej) dalej aktualizuje wartość.
  useEffect(() => {
    const loc = adventureContext?.location?.trim();
    if (loc && !currentLocationRef.current) {
      currentLocationRef.current = loc;
      setCurrentLocation(loc);
    }
  }, [adventureContext?.location]);

  // Visual Belief Graph: synchronizuj profil Badacza i epokę
  useEffect(() => {
    const era =
      adventureContext?.yearRange ||
      adventureContext?.eraLabel ||
      adventureContext?.era ||
      '1920s';
    visualBeliefGraphRef.current.setEffectiveYear(era);
    if (activeCharacter) {
      visualBeliefGraphRef.current.registerPlayer(activeCharacter, era);
    }
  }, [activeCharacter, adventureContext?.era, adventureContext?.eraLabel, adventureContext?.yearRange]);

  const generateImages = useCallback(
    async (illustrations: ImageToGenerate[], messageId: string) => {
      const generatedUrls: string[] = [];
      const generatedTypes: (
        | 'portrait'
        | 'scene'
        | 'location'
        | 'item'
        | 'monster'
        | 'vision'
      )[] = [];
      const activeEra =
        adventureContext?.yearRange ||
        adventureContext?.eraLabel ||
        adventureContext?.era ||
        '1920s';

      for (const img of illustrations) {
        const isLocation = img.type === 'location';
        const loc =
          img.locationName?.trim() || currentLocationRef.current?.trim();

        // Sprawdź persistent cache lokacji przed wywołaniem API - WYŁĄCZNIE dla ujęć lokacji (establishing shot),
        // NIGDY dla dynamicznych scen akcji, potworów ani wizji!
        if (isLocation && loc) {
          try {
            const cachedLocImage =
              await persistentMediaCache.getLocationImage(loc);
            if (cachedLocImage) {
              generatedUrls.push(cachedLocImage);
              generatedTypes.push('location');
              continue;
            }
          } catch {
            // Ignoruj błąd odczytu cache lokacji
          }
        }

        const isMythosEffective = Boolean(
          img.isMythos || img.type === 'monster' || img.type === 'vision'
        );

        const defaultStyle =
          img.style ||
          (img.type === 'portrait'
            ? 'portrait'
            : img.type === 'item'
              ? 'item'
              : img.type === 'location'
                ? 'location'
                : 'horror');

        const defaultAspectRatio =
          img.aspectRatio ||
          (img.type === 'portrait'
            ? '3:4'
            : img.type === 'item'
              ? '1:1'
              : '16:9');

        try {
          const response = await fetchWithRetry('/api/imagen', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: img.prompt,
              style: defaultStyle,
              isMythos: isMythosEffective,
              era: activeEra,
              aspectRatio: defaultAspectRatio,
              preferredProvider:
                options.aiSettings?.replicateSettings?.imageProvider || 'auto',
            }),
          });
          const result = await response.json();
          if (result.imageUrl) {
            generatedUrls.push(result.imageUrl);
            generatedTypes.push(img.type || 'scene');

            // Zapisz wygenerowany kadr lokacji do cache na przyszłe wizyty (TYLKO dla typu location!)
            if (isLocation && loc) {
              void persistentMediaCache
                .setLocationImage(loc, result.imageUrl)
                .catch(() => {});
            }
          }
        } catch (error) {
          console.error('Image Error:', error);
        }
      }

      if (generatedUrls.length > 0) {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id !== messageId) return msg;
            // IND-262: zapis obrazów do IndexedDB (persistentMediaCache, store
            // chat-images) + lekkie klucze cache w wiadomości. base64 zostaje w
            // generatedImages dla natychmiastowego renderu w sesji; po reloadzie
            // generatedImages stripowane z localStorage, więc hydrują z cache.
            const startIdx = msg.generatedImages?.length ?? 0;
            const newCacheIds = generatedUrls.map((url, i) => {
              const idx = startIdx + i;
              // fire-and-forget: błąd zapisu cache NIE blokuje renderu base64.
              // setChatImage jest idempotentny (klucz messageId_idx) → StrictMode
              // double-invoke updatera nieszkodliwy.
              void persistentMediaCache
                .setChatImage(messageId, idx, url)
                .catch(() => {});
              return `${messageId}_${idx}`;
            });
            return {
              ...msg,
              generatedImages: [
                ...(msg.generatedImages || []),
                ...generatedUrls,
              ],
              generatedImageTypes: [
                ...(msg.generatedImageTypes || []),
                ...generatedTypes,
              ],
              generatedImageCacheIds: [
                ...(msg.generatedImageCacheIds || []),
                ...newCacheIds,
              ],
            };
          })
        );

        // Synchronizacja portretów NPC z Dziennikiem oraz pamięcią persistentMediaCache
        const portraitUpdates = illustrations
          .map((img, idx) => ({ img, url: generatedUrls[idx] }))
          .filter(
            (update): update is { img: ImageToGenerate; url: string } =>
              update.img.type === 'portrait' &&
              Boolean(update.img.portraitName) &&
              Boolean(update.url)
          );

        if (portraitUpdates.length > 0) {
          portraitUpdates.forEach(({ img, url }) => {
            if (img.portraitName && url) {
              void persistentMediaCache
                .setNpcPortrait(img.portraitName, url)
                .catch(() => {});
            }
          });

          setCharacters((prevChars) => {
            let changed = false;
            const newChars = prevChars.map((char) => {
              if (!char.journal) return char;
              let charChanged = false;
              const newJournal = char.journal.map((entry) => {
                if (entry.type === 'npc') {
                  const update = portraitUpdates.find(
                    (pu) =>
                      pu.img.portraitName!.toLowerCase() ===
                      entry.title.toLowerCase()
                  );
                  if (update && entry.imageUrl !== update.url) {
                    charChanged = true;
                    return { ...entry, imageUrl: update.url };
                  }
                }
                return entry;
              });
              if (charChanged) {
                changed = true;
                return { ...char, journal: newJournal };
              }
              return char;
            });

            if (changed) {
              setTimeout(() => {
                if (typeof window !== 'undefined') persistCharacters(newChars);
              }, 0);

              setActiveCharacter((prevActive) => {
                if (!prevActive) return prevActive;
                const updatedActive = newChars.find(
                  (c) => c.id === prevActive.id
                );
                return updatedActive || prevActive;
              });
            }
            return changed ? newChars : prevChars;
          });
        }

        // Synchronizacja ilustracji przedmiotów ze stanem ekwipunku i dziennika
        const itemUpdates = illustrations
          .map((img, idx) => ({ img, url: generatedUrls[idx] }))
          .filter(
            (update) =>
              update.img.type === 'item' && update.img.itemName && update.url
          );

        if (itemUpdates.length > 0) {
          setCharacters((prevChars) => {
            let changed = false;
            const newChars = prevChars.map((char) => {
              let charChanged = false;
              const newEq = (char.equipment || []).map((eq) => {
                const match = itemUpdates.find(
                  (iu) =>
                    iu.img.itemName!.toLowerCase() === eq.name.toLowerCase()
                );
                if (match && !eq.imageUrl) {
                  charChanged = true;
                  return {
                    ...eq,
                    imageUrl: match.url,
                    visualSource: 'generated' as const,
                  };
                }
                return eq;
              });
              const newJournal = (char.journal || []).map((entry) => {
                if (entry.type === 'item') {
                  const match = itemUpdates.find(
                    (iu) =>
                      iu.img.itemName!.toLowerCase() ===
                      entry.title.toLowerCase()
                  );
                  if (match && entry.imageUrl !== match.url) {
                    charChanged = true;
                    return { ...entry, imageUrl: match.url };
                  }
                }
                return entry;
              });
              if (charChanged) {
                changed = true;
                return { ...char, equipment: newEq, journal: newJournal };
              }
              return char;
            });

            if (changed) {
              setTimeout(() => {
                if (typeof window !== 'undefined') persistCharacters(newChars);
              }, 0);

              setActiveCharacter((prevActive) => {
                if (!prevActive) return prevActive;
                const updatedActive = newChars.find(
                  (c) => c.id === prevActive.id
                );
                return updatedActive || prevActive;
              });
            }
            return changed ? newChars : prevChars;
          });
        }
      }
    },
    [setCharacters, setActiveCharacter]
  );

  const handleSendMessage = useCallback(
    async (
      message: string,
      mechanicsContext?: MechanicsContext,
      runtimeOverride?: {
        characters: Character[];
        activeCharacter: Character | null;
      }
    ) => {
      // Retro Cheat Interceptor (0 ms, 0 tokenów, wykonanie lokalne)
      if (isCheatCommand(message)) {
        const currentGameTime = timeManager.getTime();
        const userMsg: Message = {
          id: crypto.randomUUID(),
          role: 'user',
          content: message,
          timestamp: new Date(),
          gameTime: currentGameTime,
        };
        setMessages((prev) => [...prev, userMsg]);

        const locale =
          typeof window !== 'undefined' &&
          window.location.pathname.startsWith('/en')
            ? 'en'
            : 'pl';
        const execRes = executeCheatCommand(message, activeCharacter, locale);

        if (execRes.characterUpdates && activeCharacter) {
          const updatedChar: Character = {
            ...activeCharacter,
            ...execRes.characterUpdates,
          };
          setActiveCharacter(updatedChar);
          setCharacters((prev) =>
            prev.map((c) => (c.id === updatedChar.id ? updatedChar : c))
          );
          if (typeof window !== 'undefined') {
            persistCharacters(
              characters.map((c) => (c.id === updatedChar.id ? updatedChar : c))
            );
          }
        }

        if (execRes.openCombatModal) {
          setCheatCombatModal(execRes.openCombatModal);
        }
        if (execRes.openChaseModal) {
          const defaultPursuer = {
            id: 'pursuer_1',
            name: locale === 'en' ? 'The pursuer' : 'Ścigający',
            isPlayer: false,
            mov: 7,
            dex: 40,
            speedCheckValue: 50,
            skillValues: {
              Wspinaczka: 40,
              Zręczność: 40,
              Skakanie: 30,
            },
            segmentIndex: 0,
          };
          const chaseState =
            activeChaseState?.status === 'ongoing'
              ? activeChaseState
              : createChaseState({
                  fleeing: {
                    id: activeCharacter?.id || 'char_player',
                    name:
                      activeCharacter?.name ||
                      (locale === 'en' ? 'Investigator' : 'Badacz'),
                    isPlayer: true,
                    mov: activeCharacter?.move ?? 8,
                    dex: activeCharacter?.dex ?? 0,
                    segmentIndex: 2,
                  },
                  pursuers: [defaultPursuer],
                  ...(typeof activeCharacter?.con === 'number'
                    ? {
                        fleeingSpeedRoll: speedRollOutcomeFromCheck(
                          evaluateSkillCheck(rollD100(), activeCharacter.con)
                        ),
                      }
                    : {}),
                  pursuerSpeedRolls: {
                    pursuer_1: speedRollOutcomeFromCheck(
                      evaluateSkillCheck(
                        rollD100(),
                        defaultPursuer.speedCheckValue
                      )
                    ),
                  },
                });
          setActiveChaseState(chaseState);
          activeChaseStateRef.current = chaseState;
        }
        if (execRes.toastMessage) {
          toast({
            title: 'Cheat Engine',
            description: execRes.toastMessage,
          });
        }

        if (execRes.assistantMessage) {
          const assistantMsg: Message = {
            id: execRes.assistantMessage.id || crypto.randomUUID(),
            role: 'assistant',
            content: execRes.assistantMessage.content || '',
            timestamp: new Date(),
            gameTime: currentGameTime,
            chaseState: (execRes.rawCommand?.includes('CHASE') || execRes.rawCommand?.includes('POŚCIG'))
              ? activeChaseStateRef.current ?? undefined
              : undefined,
            skillTests: execRes.assistantMessage.skillTests,
            hazardEvents: execRes.assistantMessage.hazardEvents,
            spellCastEvents: execRes.assistantMessage.spellCastEvents,
            tomeStudyEvents: execRes.assistantMessage.tomeStudyEvents,
            acquiredItems: execRes.assistantMessage.acquiredItems,
            generatedImages: execRes.assistantMessage.generatedImages,
            pendingMeleeAttacks: execRes.assistantMessage.pendingMeleeAttacks,
          };
          setMessages((prev) => [...prev, assistantMsg]);
        }
        return true;
      }

      // IND-174: race condition guard. Chroni przed concurrent calls (double-click,
      // szybkie Enter, rapid programmatic invocation), które bez tego prowadziły do
      // przeplatania content streams w setMessages.map callbackach onText/onMetadata
      // dla różnych assistantMessageId. Send button w ChatWindow NIE jest disabled
      // na isLoading (lin 403: disabled={!newMessage.trim()}), więc guard tutaj jest
      // jedyną linią obrony.
      if (isLoading) return false;

      const requestCharacters = runtimeOverride?.characters ?? characters;
      const requestCharacter = runtimeOverride?.activeCharacter ?? activeCharacter;

      if (message.includes('[KONIEC_SESJI]')) {
        setSessionEndStatus('awaiting_player_closure');
      }

      let outgoingApiMessage = message;
      if (
        sessionEndStatus === 'awaiting_player_closure' &&
        !message.includes('[KONIEC_SESJI]')
      ) {
        outgoingApiMessage = `${message}\n[KONIEC_SESJI:FINAL]`;
      }

      const currentGameTime = timeManager.getTime();
      const effectiveMechanicsContext = {
        ...mechanicsContext,
        ...(activeChaseStateRef.current?.status === 'ongoing' && !mechanicsContext?.chase
          ? { chase: activeChaseStateRef.current }
          : {}),
      };
      const resolvedMechanicsContext =
        Object.keys(effectiveMechanicsContext).length > 0
          ? effectiveMechanicsContext
          : undefined;

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: message,
        timestamp: new Date(),
        gameTime: currentGameTime,
        mechanicsContext: resolvedMechanicsContext,
      };
      if (resolvedMechanicsContext?.chase) {
        setActiveChaseState(resolvedMechanicsContext.chase);
        activeChaseStateRef.current = resolvedMechanicsContext.chase;
      }
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      const sessionStartedAt =
        typeof window !== 'undefined'
          ? parseInt(localStorage.getItem('session_started_at') ?? '0', 10)
          : 0;
      trackEvent('chat_message_sent', {
        messageNumber: messages.length + 1,
        messageLength: message.length,
        sessionDurationMin: sessionStartedAt
          ? Math.round((Date.now() - sessionStartedAt) / 60000)
          : 0,
        voiceEnabled,
        hasCharacter: !!requestCharacter,
      });

      const assistantMessageId = crypto.randomUUID();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        gameTime: currentGameTime,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      try {
        // Doktryna Czystego Emulatora BYOB - Dwuskładnikowy Bloker Sesji (Runtime Hard Guard)
        const hasKey = typeof hasRequiredKeys === 'function' ? hasRequiredKeys() : true;
        const isTestEnv = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
        const hasRules =
          isTestEnv ||
          (typeof window !== 'undefined' &&
            (localStorage.getItem('rules_onboarding_completed') === 'true' ||
             !!localStorage.getItem('coc7_rulebook_profile')));

        if (!hasKey || !hasRules) {
          const locale =
            typeof window !== 'undefined' &&
            window.location.pathname.startsWith('/en')
              ? 'en'
              : 'pl';

          const warningContent = !hasKey
            ? (locale === 'en'
                ? '⚠️ API Key required. Please configure your API key to start the investigation.'
                : '⚠️ Wymagany klucz API. Skonfiguruj klucz API, aby rozpocząć śledztwo.')
            : (locale === 'en'
                ? '⚠️ CoC 7e Rulebook required (BYOB Clean Emulator). Upload your Quick-Start Rules or Keeper Rulebook to enable the Game Master.'
                : '⚠️ Wymagana Księga Zasad CoC 7e (Doktryna Czystego Emulatora BYOB). Wgraj Zasady Skrócone lub Księgę Strażnika, aby aktywować Mistrza Gry.');

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: warningContent }
                : msg
            )
          );
          setIsLoading(false);

          if (typeof window !== 'undefined') {
            if (!hasKey) {
              window.dispatchEvent(new CustomEvent('open-api-keys-modal'));
            } else {
              window.dispatchEvent(new CustomEvent('open-rulebook-modal'));
            }
          }
          return false;
        }

        const response = await fetchWithRetry('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: outgoingApiMessage,
            messages: sanitizeHistoryForApi([...messages, userMessage]),
            pdfMemory,
            character: sanitizeCharacterForApi(requestCharacter),
            characters: (requestCharacters || []).map(
              (c) => sanitizeCharacterForApi(c) as Character
            ),
            npcs: loadNpcSnapshot(),
            assistantMessageId,
            adventureContext,
            memoryScope: loadCampaignMemoryScope(),
            gameTime: timeManager.getTime(),
            currentLocation: currentLocationRef.current,
            aiSettings: options.aiSettings,
            locale,
            hotSeatConfig: resolveHotSeatCharacterNames(
              hotSeatConfig,
              requestCharacters
            ),
            directorEvent: options.pendingDirectorEvent
              ? {
                  title: options.pendingDirectorEvent.title,
                  description: options.pendingDirectorEvent.description,
                }
              : undefined,
            mechanicsContext: resolvedMechanicsContext,
          }),
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const serverMsg =
            (errorBody as Record<string, string>)?.error || response.statusText;
          throw new Error(`Chat API ${response.status}: ${serverMsg}`);
        }

        // Udane wysłanie - wyczyść oczekujące zdarzenie w UI (Faza 2 planu)
        if (options.clearPendingDirectorEvent) {
          options.clearPendingDirectorEvent();
        }

        let streamedFullText = '';
        const fullText = await parseSSEStream(response, {
          onText: (text) => {
            let cleanText = stripMeleeAttackTags(text);
            if (text.includes('[KONIEC_SESJI:POTWIERDZENIE]')) {
              cleanText = text
                .replace('[KONIEC_SESJI:POTWIERDZENIE]', '')
                .trimEnd();
              setSessionEndStatus('ended');
              setIsSessionEnded(true);
            }
            streamedFullText = cleanText;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: cleanText }
                  : msg
              )
            );
            if (voiceEnabled && isTTSEnabled) {
              options.addToQueue(cleanText, assistantMessageId);
            }
          },
          onMetadata: (metadata) => {
            if (
              Array.isArray(metadata.pendingMeleeAttacks) &&
              metadata.pendingMeleeAttacks.length > 0 &&
              typeof window !== 'undefined'
            ) {
              const attacks = metadata.pendingMeleeAttacks as PendingMeleeAttack[];
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, pendingMeleeAttacks: attacks }
                    : msg
                )
              );
              const existing = combatJournalRef.current;
              const journal =
                existing?.roundId === attacks[0].roundId
                  ? existing
                  : createCombatRoundJournal({
                      attacks,
                      roster: requestCharacters,
                      roundSeed: crypto.randomUUID(),
                    });
              combatJournalRef.current = journal;
              saveCombatJournal(localStorage, journal);
              setPendingCombatAttack(
                journal.attacks.find(
                  (attack) =>
                    !journal.resolutions.some(
                      (resolution) => resolution.eventId === attack.eventId
                    )
                ) ?? null
              );
            }
            // finishReason z metadanych (MAX_TOKENS/STOP) trafia na wiadomość -
            // steruje przyciskiem "Kontynuuj narrację" i logiką urwanych scen.
            if (metadata.finishReason) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, finishReason: String(metadata.finishReason) }
                    : msg
                )
              );
            }

            // Telemetry: PostHog ai_request_completed (spawn task 2026-05-22).
            // Server (create-sse-stream) pisze `telemetry` namespace, klient emituje.
            // PostHog jest browser-only (posthog-js), więc emit MUSI być client-side.
            if (metadata.telemetry) {
              const t = metadata.telemetry as Record<
                string,
                string | number | boolean | null
              >;
              trackEvent('ai_request_completed', {
                endpoint: '/api/chat',
                provider: 'gemini',
                ...t,
              });
            }

            // Metadane costData zapisz do wiadomości
            if (metadata.costData) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, costData: metadata.costData }
                    : msg
                )
              );
            }

            // Detekcja nowego czasu w grze z odpowiedzi AI
            if (metadata.timeUpdate) {
              const newTime = metadata.timeUpdate as GameTime;
              timeManager.setTime(newTime);
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, gameTime: newTime }
                    : msg
                )
              );
            }

            // Bug 2: tacka testów [TEST:...] - dociągnij skillValue z karty postaci
            // i dopisz do wiadomości (render w MessageCard przez SkillTestCard).
            if (
              Array.isArray(metadata.skillTests) &&
              metadata.skillTests.length > 0
            ) {
              const resolvedTests = resolveSkillTestValues(
                metadata.skillTests as unknown as SkillTestData[],
                requestCharacter,
                requestCharacters
              );
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, skillTests: resolvedTests }
                    : msg
                )
              );
            }

            if (voiceEnabled && isTTSEnabled) {
              // M6 sesja 146: drop multi-voice branch per D3. Wszystkie wiadomości
              // (włącznie z scenami NPC dialogów) idą przez generateVoiceForMessage
              // sekwencyjnie, używając ustawionego ttsVoice.
              generateVoiceForMessage(
                { ...assistantMessage, content: streamedFullText },
                [...messages, userMessage]
              );
            }

            if (
              options.aiSettings?.imageGenerationEnabled !== false &&
              metadata.illustrations &&
              metadata.illustrations.length > 0
            ) {
              const now = Date.now();
              // IND-259: throttle zależny od trybu narracji + suwaka częstotliwości
              // (ten sam poziom co prompt). Mniej narracji = krótsza przerwa.
              const imageCooldown = imageCooldownMsForLevel(
                resolveImageLevel(
                  options.aiSettings?.sessionZero?.narrativeMode,
                  options.aiSettings?.replicateSettings?.imageFrequency
                )
              );
              // 2026-06-28: reset licznika obrazów przy zmianie sceny (lokacji).
              // currentLocationRef lustruje najnowszy [LOKACJA:]; aktualizuje się PO tym
              // bloku (parsedEvents niżej + extractLatestTagLocation), więc reset wchodzi
              // o jedną turę po ruchu gracza - akceptowalne, nigdy nie blokuje gry.
              const sceneKey = currentLocationRef.current;
              if (sceneKey !== lastTrackedSceneRef.current) {
                lastTrackedSceneRef.current = sceneKey;
                sceneImageCountRef.current = 0;
              }
              const illustrationsList =
                metadata.illustrations as unknown as ImageToGenerate[];
              const hasHighPriority = illustrationsList.some(
                (img) =>
                  img.priority === 'high' ||
                  img.isMythos ||
                  img.type === 'monster' ||
                  img.type === 'vision'
              );

              if (
                hasHighPriority ||
                (now - lastImageTime >= imageCooldown &&
                  sceneImageCountRef.current < MAX_IMAGES_PER_SCENE)
              ) {
                setLastImageTime(now);
                if (!hasHighPriority) {
                  sceneImageCountRef.current += 1;
                }
                // DeepMind Proactive T2I Scene Director:
                // Zamiast naiwnego slice(0, 1), proaktywny reżyser ocenia wagę dramaturgiczną,
                // dobiera 1-3 zbalansowane kadry (lokacja / NPC / poszlaka / Mity)
                // i wzbogaca je o Visual Belief Graph.
                const era =
                  adventureContext?.yearRange ||
                  adventureContext?.eraLabel ||
                  adventureContext?.era ||
                  '1920s';
                const maxAllowed = options.aiSettings?.replicateSettings?.maxImagesPerMessage ?? 1;
                const freq = options.aiSettings?.replicateSettings?.imageFrequency || 'normal';

                const directorResult = directSceneIllustrations(illustrationsList as unknown as import('@/lib/parsers/types').ImageRequest[], {
                  maxImagesPerMessage: maxAllowed,
                  imageFrequency: freq,
                  effectiveEraOrYear: era,
                  beliefGraph: visualBeliefGraphRef.current,
                });

                if (directorResult.shots.length > 0) {
                  const curatedImages: ImageToGenerate[] = directorResult.shots.map((s) => ({
                    ...s.request,
                    prompt: s.enrichedPrompt,
                    aspectRatio: s.aspectRatio,
                  }));
                  generateImages(curatedImages, assistantMessageId);
                }
              }
            }

            // #5: fallback lokacji do pineski 📍 w headerze. AI często NIE emituje
            // tekstowego [LOKACJA:], ale serwer i tak zwraca `parsedEvents` z
            // wpisem type=location. Używamy go jako fallback; bogatszy tag tekstowy
            // (jeśli był) nadpisze to niżej przez extractLatestTagLocation.
            const parsed = metadata.parsedEvents;
            if (Array.isArray(parsed)) {
              const locEvent = [...parsed]
                .reverse()
                .find(
                  (e) =>
                    !!e &&
                    typeof e === 'object' &&
                    (e as { type?: string }).type === 'location'
                ) as { title?: string } | undefined;
              const rawTitle = locEvent?.title;
              if (typeof rawTitle === 'string' && rawTitle.trim()) {
                const name = rawTitle.replace(/^Lokacja:\s*/i, '').trim();
                if (name) {
                  currentLocationRef.current = name;
                  setCurrentLocation(name);
                }
              }
            }
          },
          // Defensive-in-depth (po IND-256): bez tego callbacku KAŻDY wyjątek
          // rzucony w onText/onMetadata był cicho połykany przez try/catch
          // parsera. Teraz prawdziwe błędy trafiają do Sentry + console.error
          // (partial-chunki JSON / SyntaxError są pomijane).
          onParseError: createSseParseErrorHandler({
            endpoint: '/api/chat',
            hook: 'useChat',
          }),
        });

        // IND-201: auto-dziennik. Po pełnym streamie dopisz wpisy [DZIENNIK:] z
        // surowej narracji MG do character.journal (modal sesji). fullText jest
        // surowy (tagi czyszczone dopiero w renderze), więc niesie [DZIENNIK:].
        // appendJournalFromText jest idempotentne (dedup po messageId).
        if (activeCharacter) {
          // Duet/Hot Seat: kieruj wpisy [DZIENNIK:] i zmiany SAN/HP do postaci
          // wskazanej prefiksem @Imię w tagu (fallback: aktywna postać). Najpierw
          // dziennik, potem staty - oba na tej samej liście postaci, jeden persist.
          // No-op (changed=false) gdy brak tagów → tani skip zapisu.
          const j = appendJournalToParty(
            characters,
            activeCharacter,
            fullText,
            assistantMessageId
          );
          const s = applyStatChangesToParty(
            j.characters,
            j.activeCharacter,
            fullText,
            (ev) => {
              if (ev.type === 'int_check_required') {
                toast({
                  title:
                    locale === 'pl'
                      ? 'Wymagany Test Inteligencji (≥ 5 SAN)'
                      : 'Intelligence Test Required (≥ 5 SAN)',
                  description: ev.message[locale === 'pl' ? 'pl' : 'en'],
                });
              } else if (ev.type === 'indefinite_insanity') {
                toast({
                  title:
                    locale === 'pl'
                      ? 'Czasowa Niepoczytalność (1/5 SAN)'
                      : 'Indefinite Insanity (1/5 SAN)',
                  description: ev.message[locale === 'pl' ? 'pl' : 'en'],
                });
              } else if (ev.type === 'bout_of_madness') {
                toast({
                  title:
                    locale === 'pl' ? 'Atak Szaleństwa' : 'Bout of Madness',
                  description: ev.message[locale === 'pl' ? 'pl' : 'en'],
                });
              } else if (ev.type === 'permanent_insanity') {
                toast({
                  title:
                    locale === 'pl'
                      ? 'Nieodwracalny Obłęd (0 SAN)'
                      : 'Permanent Insanity (0 SAN)',
                  description: ev.message[locale === 'pl' ? 'pl' : 'en'],
                });
              }
            }
          );
          const eq = applyEquipmentEventsToParty(
            s.characters,
            s.activeCharacter,
            fullText,
            (notif) => {
              if (notif.type === 'use') {
                toast({
                  title: locale === 'pl' ? 'Zużyto ekwipunek' : 'Item Used',
                  description:
                    locale === 'pl'
                      ? `${notif.characterName}: ${notif.itemName} (pozostało: ${notif.remaining})`
                      : `${notif.characterName}: ${notif.itemName} (${notif.remaining} left)`,
                });
              } else if (notif.type === 'remove') {
                toast({
                  title:
                    locale === 'pl'
                      ? 'Przedmiot wyczerpany / utracony'
                      : 'Item Depleted / Lost',
                  description:
                    locale === 'pl'
                      ? `${notif.characterName}: ${notif.itemName}`
                      : `${notif.characterName}: ${notif.itemName}`,
                });
              } else if (notif.type === 'add') {
                toast({
                  title:
                    locale === 'pl' ? 'Nowy przedmiot' : 'New Item Acquired',
                  description:
                    locale === 'pl'
                      ? `${notif.characterName}: ${notif.itemName}`
                      : `${notif.characterName}: ${notif.itemName}`,
                });
              }
            }
          );
          if (j.changed || s.changed || eq.changed) {
            setActiveCharacter(eq.activeCharacter);
            setCharacters(eq.characters);
            if (typeof window !== 'undefined') {
              persistCharacters(eq.characters);
            }
          }
        }

        // [PRZEDMIOT] pozostaje encyklopedią. Tylko osobny, świadomy tag tworzy
        // kartę "Dodaj do ekwipunku" - nigdy nie zgadujemy z zwykłej prozy MG.
        const acquiredItems = extractAcquiredItemProposals(
          fullText,
          assistantMessageId
        );
        if (acquiredItems.length > 0) {
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantMessageId
                ? { ...message, acquiredItems }
                : message
            )
          );
        }

        // Zagrożenia środowiskowe CoC 7e RAW (Issue #60), czary i tomy (Issue #252), pościgi
        const hazardEvents = extractHazardEvents(fullText);
        const spellCastEvents = extractSpellCastEvents(fullText);
        const tomeStudyEvents = extractTomeStudyEvents(fullText);
        const currentChase = activeChaseStateRef.current;
        if (hazardEvents.length > 0 || spellCastEvents.length > 0 || tomeStudyEvents.length > 0 || currentChase) {
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantMessageId
                ? {
                    ...message,
                    ...(hazardEvents.length > 0 ? { hazardEvents } : {}),
                    ...(spellCastEvents.length > 0 ? { spellCastEvents } : {}),
                    ...(tomeStudyEvents.length > 0 ? { tomeStudyEvents } : {}),
                    ...(currentChase ? { chaseState: currentChase } : {}),
                  }
                : message
            )
          );
          if (currentChase && currentChase.status !== 'ongoing') {
            setActiveChaseState(null);
            activeChaseStateRef.current = null;
          }
        }

        // IND-267: śledzenie lokacji. Najnowszy [LOKACJA:] z narracji MG zasila pineskę 📍
        // w headerze (currentLocation) i jest odsyłany do promptu w kolejnej turze
        // (currentLocationRef). Wpis dziennika typu `location` powstaje już w
        // appendJournalFromText - ten sam tor [LOKACJA:].
        const latestLocation = extractLatestTagLocation(fullText);
        if (latestLocation) {
          currentLocationRef.current = latestLocation.name;
          setCurrentLocation(latestLocation.name);
        }

        // IND-230: Faza Rozwoju CoC. Po pełnym streamie wyłuskaj wyniki testów
        // [WYNIK:] z narracji MG (SKILL_RESULT_INSTRUCTIONS każe je emitować po
        // każdym teście) i przekaż do oznaczania umiejętności. Sukces bez Szczęścia
        // oznacza umiejętność do rozwoju (logika w extractSkillResults). Oznaczenia
        // konsumuje useSkillMarking w page.tsx -> Faza Rozwoju.
        if (onSkillResults) {
          const skillResults = extractSkillResults(fullText);
          if (skillResults.length > 0) {
            onSkillResults(skillResults);
          }
        }
        return true;
      } catch (error) {
        console.error('Błąd:', error);
        trackEvent('ai_error', {
          endpoint: '/api/chat',
          errorType:
            error instanceof Error ? error.constructor.name : 'Unknown',
          errorMessage: error instanceof Error ? error.message : String(error),
          messageNumber: messages.length + 1,
        });
        const errorStr = error instanceof Error ? error.message : String(error);
        const isAuthError =
          errorStr.includes('401') ||
          errorStr.includes('BYOK_KEY') ||
          errorStr.includes('API key');

        if (isAuthError && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('open-api-keys-modal'));
        }

        // Zadanie 6: po wyczerpaniu retry rozróżnij błąd autoryzacji i blip sieci od innego błędu.
        const friendly = isAuthError
          ? locale === 'en'
            ? '⚠️ The Gemini API key is invalid or expired. Enter a valid key in Settings (key icon in menu) and try again.'
            : '⚠️ Klucz Gemini API jest nieprawidłowy lub wygasł. Wklej poprawny klucz w Ustawieniach (ikona klucza w menu) i spróbuj ponownie.'
          : isNetworkBlip(error)
            ? locale === 'en'
              ? '⚠️ A temporary connection problem occurred - try sending your message again.'
              : '⚠️ Chwilowy problem z połączeniem - spróbuj wysłać wiadomość jeszcze raz.'
            : locale === 'en'
              ? 'I am sorry, an error occurred.'
              : 'Przepraszam, wystąpił błąd.';
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId ? { ...msg, content: friendly } : msg
          )
        );
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [
      isLoading,
      messages,
      pdfMemory,
      activeCharacter,
      characters,
      setActiveCharacter,
      setCharacters,
      adventureContext,
      voiceEnabled,
      isTTSEnabled,
      generateVoiceForMessage,
      generateImages,
      lastImageTime,
      onSkillResults,
      hotSeatConfig,
      sessionEndStatus,
      activeChaseState,
      locale,
    ]
  );

  const pendingCombatDefensesUsed = pendingCombatAttack
    ? combatJournalRef.current?.resolutions.filter(
        (resolution) =>
          resolution.defenderId === pendingCombatAttack.target.characterId
      ).length ?? 0
    : 0;
  const combatDefender = pendingCombatAttack
    ? characters.find(
        (character) => character.id === pendingCombatAttack.target.characterId
      ) ?? null
    : null;
  const combatDefenseWeapons = getCombatDefenseWeapons(combatDefender);

  const handleCombatDefense = useCallback(
    async (
      attack: PendingMeleeAttack,
      choice: DefenseChoice,
      weapon?: CombatDefenseWeaponOption,
      maneuverType?: ManeuverType
    ) => {
      if (typeof window === 'undefined') return;
      const current = combatJournalRef.current;
      if (!current || current.roundId !== attack.roundId) return;

      const choiceJournal: CombatRoundJournal = {
        ...current,
        choices: {
          ...current.choices,
          [attack.eventId]: {
            choice,
            defenderWeaponId: weapon?.id,
            maneuverType,
          },
        },
      };
      saveCombatJournal(localStorage, choiceJournal);

      const resolved = resolveCombatJournalEvent({
        journal: choiceJournal,
        eventId: attack.eventId,
        choice,
        defenderWeapon: weapon,
        maneuverType,
      });
      combatJournalRef.current = resolved;
      saveCombatJournal(localStorage, resolved);

      const persisted = persistCharacters(resolved.nextRoster);
      if (!persisted.ok) {
        toast({
          title: locale === 'en' ? 'Combat not saved' : 'Nie zapisano walki',
          description:
            locale === 'en'
              ? 'Free browser storage and try the defense again.'
              : 'Zwolnij miejsce w pamięci przeglądarki i ponów obronę.',
          variant: 'destructive',
        });
        return;
      }

      setCharacters(resolved.nextRoster);
      setActiveCharacter((previous) =>
        previous
          ? resolved.nextRoster.find((character) => character.id === previous.id) ??
            previous
          : previous
      );

      const nextAttack = resolved.attacks.find(
        (candidate) =>
          !resolved.resolutions.some(
            (resolution) => resolution.eventId === candidate.eventId
          )
      );
      if (nextAttack) {
        setPendingCombatAttack(nextAttack);
        return;
      }

      const committing: CombatRoundJournal = {
        ...resolved,
        phase: 'committing',
      };
      combatJournalRef.current = committing;
      saveCombatJournal(localStorage, committing);
      setPendingCombatAttack(null);

      const nextActive = activeCharacter
        ? committing.nextRoster.find(
            (character) => character.id === activeCharacter.id
          ) ?? activeCharacter
        : null;
      const committedSuccessfully = await handleSendMessage(
        locale === 'en'
          ? 'Continue the scene from the resolved exchange of blows.'
          : 'Kontynuuj scenę od rozstrzygniętej wymiany ciosów.',
        { combat: { resolutions: committing.resolutions } },
        { characters: committing.nextRoster, activeCharacter: nextActive }
      );
      if (!committedSuccessfully) {
        setPendingCombatAttack(attack);
        toast({
          title: locale === 'en' ? 'Narration interrupted' : 'Przerwano narrację',
          description:
            locale === 'en'
              ? 'Choose the defense once more to retry without rolling again.'
              : 'Wybierz obronę ponownie. Aplikacja użyje tego samego wyniku rzutu.',
          variant: 'destructive',
        });
        return;
      }
      const committed: CombatRoundJournal = { ...committing, phase: 'committed' };
      combatJournalRef.current = committed;
      saveCombatJournal(localStorage, committed);
      localStorage.removeItem('combat_round_journal_v1');
      combatJournalRef.current = null;
    },
    [
      activeCharacter,
      handleSendMessage,
      locale,
      setActiveCharacter,
      setCharacters,
    ]
  );

  useEffect(() => {
    const journal = combatJournalRef.current;
    if (
      !shouldRecoverCombatCommitRef.current ||
      journal?.phase !== 'committing' ||
      journal.resolutions.length !== journal.attacks.length
    ) return;
    const lastAttack = journal.attacks.at(-1);
    if (!lastAttack) return;
    const storedChoice = journal.choices[lastAttack.eventId];
    if (!storedChoice) return;
    shouldRecoverCombatCommitRef.current = false;
    const weapon = combatDefenseWeapons.find(
      (candidate) => candidate.id === storedChoice.defenderWeaponId
    );
    void handleCombatDefense(
      lastAttack,
      storedChoice.choice,
      weapon,
      storedChoice.maneuverType
    );
  }, [combatDefenseWeapons, handleCombatDefense]);

  // === Ręczna kontynuacja urwanej narracji (finishReason=MAX_TOKENS) ===
  // Single-flight: równoległe wywołania (double-click, Promise.all w testach)
  // muszą dać DOKŁADNIE jedno żądanie - stąd ref zamiast stanu (synchroniczny).
  const continuationInFlightRef = useRef(false);

  const handleContinueNarration = useCallback(
    async (messageId?: string) => {
      if (continuationInFlightRef.current || isLoading) return;

      // Cel: wskazana wiadomość albo najnowsza asystenta urwana na MAX_TOKENS.
      const target = messageId
        ? messages.find(
            (m) =>
              m.id === messageId &&
              m.role === 'assistant' &&
              m.finishReason === 'MAX_TOKENS'
          )
        : [...messages]
            .reverse()
            .find(
              (m) => m.role === 'assistant' && m.finishReason === 'MAX_TOKENS'
            );
      if (!target) return;

      continuationInFlightRef.current = true;
      // Zamówienie oznaczamy PRZED wysyłką - UI natychmiast blokuje przycisk.
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === target.id ? { ...msg, continuationRequested: true } : msg
        )
      );

      setIsLoading(true);
      const assistantMessageId = crypto.randomUUID();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };
      // Kontynuacja NIE tworzy dymku gracza - instrukcja leci tylko w payloadzie.
      setMessages((prev) => [...prev, assistantMessage]);

      const markedTarget: Message = { ...target, continuationRequested: true };

      try {
        const response = await fetchWithRetry('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message:
              locale === 'en'
                ? "Continue the Game Master's previous truncated response exactly where it ended. Do not repeat it and do not comment on the interruption."
                : 'Dokończ poprzednią, urwaną wypowiedź Mistrza Gry dokładnie od miejsca, w którym się skończyła. Nie powtarzaj jej i nie komentuj przerwania.',
            messages: sanitizeHistoryForApi([markedTarget]),
            pdfMemory,
            character: sanitizeCharacterForApi(activeCharacter),
            adventureContext,
            memoryScope: loadCampaignMemoryScope(),
            gameTime: timeManager.getTime(),
            currentLocation: currentLocationRef.current,
            aiSettings: options.aiSettings,
            locale,
          }),
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const serverMsg =
            (errorBody as Record<string, string>)?.error || response.statusText;
          throw new Error(`Chat API ${response.status}: ${serverMsg}`);
        }

        let streamedFullText = '';
        const fullText = await parseSSEStream(response, {
          onText: (text) => {
            streamedFullText = text;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId ? { ...msg, content: text } : msg
              )
            );
            if (voiceEnabled && isTTSEnabled) {
              options.addToQueue(text, assistantMessageId);
            }
          },
          onMetadata: (metadata) => {
            if (metadata.finishReason) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, finishReason: String(metadata.finishReason) }
                    : msg
                )
              );
            }
            if (voiceEnabled && isTTSEnabled) {
              generateVoiceForMessage(
                { ...assistantMessage, content: streamedFullText },
                [...messages, markedTarget]
              );
            }
          },
          onParseError: createSseParseErrorHandler({
            endpoint: '/api/chat',
            hook: 'useChat:continueNarration',
          }),
        });

        void fullText;
      } catch (error) {
        console.error('Błąd kontynuacji narracji:', error);
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== assistantMessageId)
        );
      } finally {
        continuationInFlightRef.current = false;
        setIsLoading(false);
      }
    },
    [
      isLoading,
      messages,
      pdfMemory,
      activeCharacter,
      adventureContext,
      voiceEnabled,
      isTTSEnabled,
      generateVoiceForMessage,
    ]
  );

  // === C4 (duet): bufor deklaracji + wysyłka tury ===
  // Tryb dla dwojga = Hot Seat z 2+ graczami. Tylko wtedy buforujemy; solo
  // wysyła natychmiast (Enter w MessageInput → handleSendMessage bez zmian).
  const isDuet =
    !!hotSeatConfig?.enabled && (hotSeatConfig?.players?.length ?? 0) >= 2;

  const declarationSessionKey = hotSeatConfig?.enabled
    ? `${hotSeatConfig.adventureJournalId ?? 'legacy'}:${hotSeatConfig.players
        .map((player) => player.id)
        .join('|')}`
    : 'solo';

  // Deklaracje należą wyłącznie do bieżącego składu i przebiegu przygody.
  // Zmiana save'u, pary albo wyłączenie Hot Seat usuwa niedokończoną turę.
  useEffect(() => {
    setPendingDeclarations([]);
  }, [declarationSessionKey]);

  // Aktualny gracz (czyja kolej deklarować) = aktywny indeks Hot Seat.
  const currentPlayer = isDuet
    ? (hotSeatConfig!.players[hotSeatConfig!.activePlayerIndex] ?? null)
    : null;

  // Dokłada/aktualizuje deklarację AKTUALNEGO gracza (Enter w duecie). Re-wpis
  // tego samego gracza nadpisuje jego poprzednią deklarację (1 gracz = 1 wpis/turę).
  const addDeclaration = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !currentPlayer) return;
      const characterName = characters.find(
        (c) => c.id === currentPlayer.characterId
      )?.name;
      const nextDeclarations = [
        ...pendingDeclarations.filter((d) => d.playerId !== currentPlayer.id),
        {
          playerId: currentPlayer.id,
          playerName: currentPlayer.name,
          characterName,
          text: trimmed,
        },
      ];
      setPendingDeclarations(nextDeclarations);

      const players = hotSeatConfig?.players ?? [];
      const nextPlayerIndex = players.findIndex(
        (player) =>
          player.id !== currentPlayer.id &&
          !nextDeclarations.some(
            (declaration) => declaration.playerId === player.id
          )
      );
      if (nextPlayerIndex >= 0) {
        onSwitchHotSeatPlayer?.(nextPlayerIndex);
      }
    },
    [
      currentPlayer,
      characters,
      pendingDeclarations,
      hotSeatConfig,
      onSwitchHotSeatPlayer,
    ]
  );

  const passDeclaration = useCallback(() => {
    addDeclaration('Pasuję.');
  }, [addDeclaration]);

  const clearDeclarations = useCallback(() => {
    setPendingDeclarations([]);
  }, []);

  // Składa zebrane deklaracje w jedną wiadomość i wysyła przez istniejący
  // handleSendMessage (zachowuje sanitizer/cap obrazów/resolveSkillTestValues/
  // addToQueue - bufor NIE dotyka ścieżki wysyłki). Zerowanie po starcie.
  const sendTurn = useCallback(() => {
    const players = hotSeatConfig?.players ?? [];
    if (!isTurnReady(pendingDeclarations, players)) return;
    const composed = composeTurnFromDeclarations(pendingDeclarations);
    setPendingDeclarations([]);
    void handleSendMessage(composed);
  }, [pendingDeclarations, handleSendMessage, hotSeatConfig?.players]);

  // Gracze, którzy jeszcze nie zadeklarowali w tej turze (podpowiedź w UI).
  const playersAwaitingDeclaration = isDuet
    ? options
        .hotSeatConfig!.players.filter(
          (p) => !pendingDeclarations.some((d) => d.playerId === p.id)
        )
        .map((p) => ({ id: p.id, name: p.name }))
    : [];
  const turnReady = isDuet
    ? isTurnReady(pendingDeclarations, hotSeatConfig?.players ?? [])
    : false;

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (newMessage.trim()) {
          if (isDuet) addDeclaration(newMessage.trim());
          else handleSendMessage(newMessage.trim());
          setNewMessage('');
        }
      }
    },
    [newMessage, handleSendMessage, isDuet, addDeclaration]
  );

  const dismissAcquiredItem = useCallback(
    (messageId: string, proposalId: string) => {
      setMessages((prev) =>
        prev.map((message) => {
          if (message.id !== messageId) return message;
          return {
            ...message,
            acquiredItems: message.acquiredItems?.map((proposal) =>
              proposal.id === proposalId && proposal.status === 'pending'
                ? { ...proposal, status: 'dismissed' }
                : proposal
            ),
          };
        })
      );
    },
    []
  );

  const confirmAcquiredItem = useCallback(
    async (messageId: string, proposalId: string, characterId?: string) => {
      const message = messages.find((candidate) => candidate.id === messageId);
      const proposal = message?.acquiredItems?.find(
        (candidate) => candidate.id === proposalId
      );
      if (!proposal || proposal.status !== 'pending' || !activeCharacter)
        return;

      // Stan karty najpierw - podwójny klik nie może dodać dwóch egzemplarzy.
      setMessages((prev) =>
        prev.map((candidate) =>
          candidate.id === messageId
            ? {
                ...candidate,
                acquiredItems: candidate.acquiredItems?.map((item) =>
                  item.id === proposalId
                    ? { ...item, status: 'accepted' }
                    : item
                ),
              }
            : candidate
        )
      );

      let recipient = activeCharacter;
      if (characterId) {
        const explicitTarget = characters.find((c) => c.id === characterId);
        if (explicitTarget) recipient = explicitTarget;
      } else {
        recipient = resolveCharacterByName(
          characters,
          proposal.recipientName,
          activeCharacter
        );
      }
      const item = {
        ...createEquipmentItem(
          createAcquiredEquipmentSeed(proposal),
          'acquired'
        ),
        // Znalezisko z sesji jest unikalnym egzemplarzem, nawet jeżeli jego nazwa
        // odpowiada katalogowi. Katalog pozostaje zarezerwowany dla stałej bazy.
        visualSource: 'generated' as const,
        visualTreatment: proposal.visualTreatment,
        imageUrl: undefined,
      };

      const journalEntry: JournalEntry = {
        id: `journal-${item.id}`,
        timestamp: new Date(),
        type: 'item',
        title: item.name,
        content: item.description || 'Brak opisu przedmiotu.',
        tags: [],
        isBookmarked: false,
      };

      const afterAdd = characters.map((character) =>
        character.id === recipient.id
          ? {
              ...character,
              equipment: [...(character.equipment ?? []), item],
              journal: [...(character.journal ?? []), journalEntry],
            }
          : character
      );
      setCharacters(afterAdd);
      const nextActive =
        afterAdd.find((character) => character.id === activeCharacter.id) ??
        activeCharacter;
      setActiveCharacter(nextActive);
      if (typeof window !== 'undefined') persistCharacters(afterAdd);

      // Obraz nie blokuje kliknięcia ani gry. Nieudana generacja zostawia ważny
      // egzemplarz bez renderu - można go później wygenerować z modalu ekwipunku.
      try {
        const prompt = buildEquipmentImagePrompt(
          item,
          resolveEquipmentVisualEra(adventureContext),
          undefined,
          recipient
        );
        const usePortraitReference = Boolean(
          recipient.portraitUrl && isCharacterBoundEquipment(item)
        );
        const response = await fetchWithRetry(
          usePortraitReference ? '/api/flux-kontext' : '/api/imagen',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt,
              style:
                proposal.visualTreatment === 'supernatural'
                  ? 'horror'
                  : 'realistic',
              aspectRatio: '1:1',
              seed: `${recipient.id}-${item.id}`,
              ...(usePortraitReference
                ? { inputImageUrl: recipient.portraitUrl }
                : {}),
            }),
          }
        );
        if (!response.ok) return;
        const data = (await response.json()) as { imageUrl?: string };
        if (!data.imageUrl) return;

        const afterImage = afterAdd.map((character) =>
          character.id !== recipient.id
            ? character
            : {
                ...character,
                equipment: (character.equipment ?? []).map((candidate) =>
                  candidate.id === item.id
                    ? {
                        ...candidate,
                        imageUrl: data.imageUrl,
                        imagePrompt: prompt,
                      }
                    : candidate
                ),
              }
        );
        setCharacters(afterImage);
        setActiveCharacter(
          afterImage.find((character) => character.id === activeCharacter.id) ??
            activeCharacter
        );
        if (typeof window !== 'undefined') persistCharacters(afterImage);
      } catch (error) {
        console.warn(
          'Nie udało się wygenerować renderu zdobytego przedmiotu:',
          error
        );
      }
    },
    [
      activeCharacter,
      adventureContext,
      characters,
      messages,
      setActiveCharacter,
      setCharacters,
    ]
  );

  return {
    messages,
    setMessages,
    newMessage,
    setNewMessage,
    handleSendMessage,
    pendingCombatAttack,
    pendingCombatDefensesUsed,
    combatDefenseWeapons,
    handleCombatDefense,
    handleContinueNarration,
    handleKeyPress,
    generateImages,
    isLoading,
    currentLocation,
    // C4 (duet)
    isDuet,
    pendingDeclarations,
    playersAwaitingDeclaration,
    addDeclaration,
    passDeclaration,
    currentPlayerName: currentPlayer?.name,
    isTurnReady: turnReady,
    clearDeclarations,
    sendTurn,
    confirmAcquiredItem,
    dismissAcquiredItem,
    isSessionEnded,
    sessionEndStatus,
    cheatCombatModal,
    setCheatCombatModal,
    cheatChaseModal,
    setCheatChaseModal,
    activeChaseState,
    setActiveChaseState,
  };
}
