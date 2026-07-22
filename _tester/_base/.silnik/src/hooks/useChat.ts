'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  Message,
  Character,
  GameTime,
  AdventureContext,
  HotSeatConfig,
  HotSeatPlayer,
} from '@/lib/types';
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
import { extractSkillResults } from '@/lib/parsers/mechanics-parser';
import { extractLatestTagLocation } from '@/lib/parsers/event-parser';
import { fetchWithApiKeys } from '@/lib/api-keys-service';
import { timeManager } from '@/lib/time-manager';
import { parseSSEStream, createSseParseErrorHandler } from '@/lib/sse-parser';
import { trackEvent } from '@/lib/posthog';
import type { AISettings } from '@/lib/ai-settings/types';
import {
  imageCooldownMsForLevel,
  MAX_IMAGES_PER_SCENE,
} from '@/lib/constants/chat';
import { resolveImageLevel } from '@/lib/prompts/image-instructions';
import { appendJournalToParty } from '@/lib/journal/apply-journal-tags';
import { applyStatChangesToParty } from '@/lib/character/apply-stat-changes';
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

const MESSAGES_STORAGE_KEY = 'zew_chat_messages';

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
  style?: 'horror' | 'vintage' | 'realistic' | 'artistic';
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

export interface UseChatReturn {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  newMessage: string;
  setNewMessage: React.Dispatch<React.SetStateAction<string>>;
  handleSendMessage: (message: string) => Promise<void>;
  handleKeyPress: (e: React.KeyboardEvent) => void;
  generateImages: (
    illustrations: ImageToGenerate[],
    messageId: string
  ) => Promise<void>;
  isLoading: boolean;
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
  confirmAcquiredItem: (messageId: string, proposalId: string) => Promise<void>;
  dismissAcquiredItem: (messageId: string, proposalId: string) => void;
  /** Stan informujący o zakończeniu sesji gier po tagu [KONIEC_SESJI:POTWIERDZENIE] */
  isSessionEnded: boolean;
}

function resolveEquipmentVisualEra(context?: AdventureContext | null): string {
  const year = context?.yearRange ?? '';
  if (/^(?:194[0-9])/.test(year) || context?.eraLabel?.includes('40'))
    return '1940s';
  if (/^(?:196|197|198)/.test(year) || /prl/i.test(context?.eraLabel ?? ''))
    return 'prl-1970s';
  if (context?.era === 'gaslight') return '1890s';
  if (context?.era === 'modern') return 'modern';
  return '1920s';
}

interface UseChatOptions {
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
  const [lastImageTime, setLastImageTime] = useState(0);

  useEffect(() => {
    if (messages.length === 0) {
      setIsSessionEnded(false);
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

  const generateImages = useCallback(
    async (illustrations: ImageToGenerate[], messageId: string) => {
      const generatedUrls: string[] = [];
      for (const img of illustrations) {
        try {
          const response = await fetchWithRetry('/api/imagen', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: img.prompt,
              style: img.style || 'horror',
              // IND-216: sceny czatu w formacie pocztówkowym 16:9 (orchestrator
              // forwarduje ...body do Vertex/Replicate). Render i tak kadruje object-cover.
              aspectRatio: '16:9',
              preferredProvider:
                options.aiSettings?.replicateSettings?.imageProvider || 'auto',
            }),
          });
          const result = await response.json();
          if (result.imageUrl) {
            generatedUrls.push(result.imageUrl);
            // IND-272: koszt obrazu liczy server-side `recordUserUsage` w /api/imagen
            // (jedno źródło prawdy). Client-side `recordImageCost` (cost_tracking_stats)
            // był niepełnym duplikatem - usunięty.
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
              generatedImageCacheIds: [
                ...(msg.generatedImageCacheIds || []),
                ...newCacheIds,
              ],
            };
          })
        );
      }
    },
    []
  );

  const handleSendMessage = useCallback(
    async (message: string) => {
      // IND-174: race condition guard. Chroni przed concurrent calls (double-click,
      // szybkie Enter, rapid programmatic invocation), które bez tego prowadziły do
      // przeplatania content streams w setMessages.map callbackach onText/onMetadata
      // dla różnych assistantMessageId. Send button w ChatWindow NIE jest disabled
      // na isLoading (lin 403: disabled={!newMessage.trim()}), więc guard tutaj jest
      // jedyną linią obrony.
      if (isLoading) return;

      const currentGameTime = timeManager.getTime();
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: message,
        timestamp: new Date(),
        gameTime: currentGameTime,
      };
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
        hasCharacter: !!activeCharacter,
      });

      const assistantMessageId = crypto.randomUUID();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        gameTime: currentGameTime, // Początkowo ten sam czas, przy streamingu można by to zaktualizować (choć aktualnie Cthulhu-AI nie zarządza czasem wewnątrz streama w ten sposób)
      };
      setMessages((prev) => [...prev, assistantMessage]);

      try {
        // Zadanie 6: retry na chwilowy blip sieci (1-2 próby, krótki backoff).
        const response = await fetchWithRetry('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            // Demo-blocker fix (re-playtest 2026-06-24): strip base64 data: URL
            // obrazów z historii. Bez tego intro obraz (~2.4 MB w content) podbijał
            // input /api/chat ponad limit 1M tokenów → 500 od tury 2.
            messages: sanitizeHistoryForApi([...messages, userMessage]),
            pdfMemory,
            // Sanityzuj też postać: portret + miniatury ekwipunku to base64 (~MB),
            // które bez tego podbijają payload > 10 MB → 500 (regresja B2 28.06).
            character: sanitizeCharacterForApi(activeCharacter),
            characters: (characters || []).map((c) => sanitizeCharacterForApi(c) as Character),
            adventureContext,
            gameTime: timeManager.getTime(),
            // IND-267: bieżąca lokacja (z poprzedniej tury) → build-context.ts wstrzykuje
            // ją do promptu, by MG był spójny co do miejsca, w którym jest bohater.
            currentLocation: currentLocationRef.current,
            aiSettings: options.aiSettings,
            // Faza 3 Hot Seat: wzbogać każdego gracza o characterName (lookup
            // characterId → character.name). build-context.ts czyta `characterName`,
            // a HotSeatPlayer w configu ma tylko `characterId` - bez tego mapowania
            // adresowanie @ImięPostaci w duecie nigdy by nie ruszyło. Gdy characterId
            // jeszcze nie wskazuje istniejącej postaci → characterName undefined (JSON
            // je pomija) → blok duetu w build-context się nie wstrzykuje (poprawnie).
            hotSeatConfig: resolveHotSeatCharacterNames(
              hotSeatConfig,
              characters
            ),
          }),
        });

        if (!response.ok) throw new Error('Błąd połączenia');

        // Użyj uniwersalnego parsera SSE.
        // IND-256: `streamedFullText` akumuluje pełny tekst z onText, by onMetadata
        // mógł go użyć BEZ czytania zewnętrznego `fullText`. `const fullText` jest
        // przypisywany dopiero po ZAKOŃCZENIU parseSSEStream, a onMetadata jest
        // wywoływane WEWNĄTRZ parsera (przed przypisaniem) → czytanie `fullText`
        // w onMetadata rzucało TDZ ReferenceError, cicho połykany przez try/catch
        // parsera, co przerywało onMetadata przed gałęzią generowania obrazów scen.
        let streamedFullText = '';
        const fullText = await parseSSEStream(response, {
          onText: (text) => {
            let cleanText = text;
            if (text.includes('[KONIEC_SESJI:POTWIERDZENIE]')) {
              cleanText = text.replace('[KONIEC_SESJI:POTWIERDZENIE]', '').trimEnd();
              setIsSessionEnded(true);
            }
            streamedFullText = cleanText;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId ? { ...msg, content: cleanText } : msg
              )
            );
            if (voiceEnabled && isTTSEnabled) {
              options.addToQueue(cleanText, assistantMessageId);
            }
          },
          onMetadata: (metadata) => {
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
                activeCharacter,
                characters
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
              if (
                now - lastImageTime >= imageCooldown &&
                sceneImageCountRef.current < MAX_IMAGES_PER_SCENE
              ) {
                setLastImageTime(now);
                sceneImageCountRef.current += 1;
                // 2026-06-28 (portable): cap na 1 obraz sceny / turę. generateImages
                // generuje WSZYSTKIE przekazane ilustracje sekwencyjnie (5-60 s każda),
                // a w wersji portable seria obrazów zapychała limit Gemini i głodziła
                // lektora (audio rusza >1 min po tekście). Jedna ilustracja na turę
                // zwalnia limit dla TTS; cooldown międzyturowy (IND-259) zostaje.
                generateImages(
                  (
                    metadata.illustrations as unknown as ImageToGenerate[]
                  ).slice(0, 1),
                  assistantMessageId
                );
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
            fullText
          );
          if (j.changed || s.changed) {
            setActiveCharacter(s.activeCharacter);
            setCharacters(s.characters);
            if (typeof window !== 'undefined') {
              persistCharacters(s.characters);
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
      } catch (error) {
        console.error('Błąd:', error);
        trackEvent('ai_error', {
          endpoint: '/api/chat',
          errorType:
            error instanceof Error ? error.constructor.name : 'Unknown',
          errorMessage: error instanceof Error ? error.message : String(error),
          messageNumber: messages.length + 1,
        });
        // Zadanie 6: po wyczerpaniu retry rozróżnij blip sieci od innego błędu -
        // graczowi mówimy wprost, że to chwilowy problem z połączeniem i może
        // spróbować ponownie (zamiast surowego/ogólnego komunikatu).
        const friendly = isNetworkBlip(error)
          ? '⚠️ Chwilowy problem z połączeniem - spróbuj wysłać wiadomość jeszcze raz.'
          : 'Przepraszam, wystąpił błąd.';
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId ? { ...msg, content: friendly } : msg
          )
        );
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
    async (messageId: string, proposalId: string) => {
      const message = messages.find((candidate) => candidate.id === messageId);
      const proposal = message?.acquiredItems?.find(
        (candidate) => candidate.id === proposalId
      );
      if (!proposal || proposal.status !== 'pending' || !activeCharacter) return;

      // Stan karty najpierw - podwójny klik nie może dodać dwóch egzemplarzy.
      setMessages((prev) =>
        prev.map((candidate) =>
          candidate.id === messageId
            ? {
                ...candidate,
                acquiredItems: candidate.acquiredItems?.map((item) =>
                  item.id === proposalId ? { ...item, status: 'accepted' } : item
                ),
              }
            : candidate
        )
      );

      const recipient = resolveCharacterByName(
        characters,
        proposal.recipientName,
        activeCharacter
      );
      const item = {
        ...createEquipmentItem(createAcquiredEquipmentSeed(proposal), 'acquired'),
        // Znalezisko z sesji jest unikalnym egzemplarzem, nawet jeżeli jego nazwa
        // odpowiada katalogowi. Katalog pozostaje zarezerwowany dla stałej bazy.
        visualSource: 'generated' as const,
        visualTreatment: proposal.visualTreatment,
        imageUrl: undefined,
      };
      const afterAdd = characters.map((character) =>
        character.id === recipient.id
          ? { ...character, equipment: [...(character.equipment ?? []), item] }
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
              proposal.visualTreatment === 'supernatural' ? 'horror' : 'realistic',
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
                    ? { ...candidate, imageUrl: data.imageUrl, imagePrompt: prompt }
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
        console.warn('Nie udało się wygenerować renderu zdobytego przedmiotu:', error);
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
  };
}
