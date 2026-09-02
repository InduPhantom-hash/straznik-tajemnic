import { useCallback, useRef } from 'react';
import {
  Character,
  Message,
  PdfMemory,
  AdventureContext,
  HotSeatPlayer,
} from '@/lib/types';
import type { AISettings } from '@/lib/ai-settings/types';
import { fetchWithApiKeys } from '@/lib/api-keys-service';
import { parseSSEStream, createSseParseErrorHandler } from '@/lib/sse-parser';
import { timeManager } from '@/lib/time-manager';
// M6 sesja 146: DialogueLine import DROPPED per D3 (multi-voice odchodzi).
import { trackEvent } from '@/lib/posthog';
import { resetSessionTokens } from '@/lib/ai-settings/cost-control';
import { appendJournalFromText } from '@/lib/journal/apply-journal-tags';
import { persistCharacters } from '@/lib/character-cloud-sync';
import { persistentMediaCache } from '@/lib/persistent-media-cache';
import { useEquipmentThumbnails } from './useEquipmentThumbnails';
import { sanitizeCharacterForApi } from '@/lib/chat-history-sanitizer';
import { getEraVehicleVisualDescription } from '@/lib/era-visual-style';
import { resolveGameEraContext, type ResolvedEraContext } from '@/lib/era';
import {
  hasBlockingSetupFailure,
  isWorldSetupBundle,
  loadStoredWorldSetup,
  storeWorldSetup,
  type WorldSetupBundleV1,
} from '@/lib/world-setup';

/**
 * Zadanie 6 (hardening demo-safe): chwilowy blip sieci ≠ crash startu gry.
 * Ponawia WYŁĄCZNIE błędy sieciowe (`fetch` rzuca `TypeError`: "Failed to fetch" /
 * "NetworkError") - 1-2 próby, krótki backoff. Odpowiedzi HTTP (np. 500) idą do
 * callera bez retry. Minimal-touch: opakowuje istniejące `fetchWithApiKeys`.
 */
function isNetworkBlip(error: unknown): boolean {
  if (error instanceof TypeError) return true;
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
      if (!isNetworkBlip(error) || attempt === retries) throw error;
      await new Promise((resolve) =>
        setTimeout(resolve, backoffMs * (attempt + 1))
      );
    }
  }
  throw lastError;
}

function createPresetWorldSetup(
  adventure: AdventureContext,
  eraContext: ResolvedEraContext
): WorldSetupBundleV1 {
  const createdAt = new Date().toISOString();
  const conflicts = (adventure.conflicts ?? []).map((conflict) => ({
    ...conflict,
    factions: conflict.factions.map((faction) => ({ ...faction })),
  }));

  return {
    schemaVersion: 1,
    id: `preset_${adventure.id ?? 'adventure'}_${Date.now()}`,
    scenarioId: adventure.id ?? 'preset-adventure',
    adventureTitle: adventure.title,
    createdAt,
    canonRevision: 1,
    eraContext,
    eraManifestId: null,
    adventureGraph: {
      source: 'preset',
      conflicts,
      setupAsymmetry: adventure.setupAsymmetry ?? {},
      graph: adventure.graph ?? null,
    },
    factions: conflicts.flatMap((conflict) => conflict.factions),
    npcs: [],
    locations: adventure.location ? [{ name: adventure.location }] : [],
    items: [],
    events: [],
    openingScene: { location: adventure.location ?? '' },
    nearestBranches: conflicts,
    adventureContent: JSON.stringify({
      hook: adventure.hook,
      description: adventure.description,
      conflicts,
      graph: adventure.graph,
    }),
    supplementalInformation: [],
    sources: [],
    knowledgeGaps: [
      'Szybka przygoda używa lokalnego kanonu. Opcjonalny research historyczny nie blokuje startu.',
    ],
    exceptions: [],
    phaseResults: [
      {
        phase: 'era',
        status: 'passed',
        critical: true,
        retryable: false,
        durationMs: 0,
        estimatedCostUsd: 0,
        completedAt: createdAt,
      },
      {
        phase: 'adventure-graph',
        status: conflicts.length > 0 ? 'passed' : 'degraded',
        critical: false,
        retryable: true,
        durationMs: 0,
        estimatedCostUsd: 0,
        message:
          conflicts.length > 0
            ? undefined
            : 'Preset nie zawiera gotowego grafu konfliktu.',
        completedAt: createdAt,
      },
      {
        phase: 'historical-research',
        status: 'degraded',
        critical: false,
        retryable: true,
        durationMs: 0,
        estimatedCostUsd: 0,
        message: 'Research online jest pomijany przy szybkim starcie.',
        completedAt: createdAt,
      },
    ],
  };
}

interface UseGameStartProps {
  locale?: 'pl' | 'en';
  setHasStartedGame: (started: boolean) => void;
  activeCharacter: Character | null;
  characters: Character[];
  setActiveCharacter: React.Dispatch<React.SetStateAction<Character | null>>;
  setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
  pdfMemory: PdfMemory;
  adventureContext: AdventureContext | null;
  hotSeatConfig: { enabled: boolean; players: HotSeatPlayer[] };
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  tts: {
    voiceEnabled: boolean;
    isTTSEnabled: boolean;
    generateVoiceForMessage: (
      message: Message,
      context: Message[]
    ) => Promise<void>;
    // M6 sesja 146: generateMultiVoice DROPPED per D3.
    addToQueue: (text: string, messageId?: string) => void;
    startInitialBuffering: () => void;
    stopCurrentAudio: () => void;
  };
  aiSettings?: AISettings | null;
  /** IND-273 T3: self-check klucza/modeli przy starcie gry (fire-and-forget, TTL dławi). */
  runHealthCheck?: () => void;
}

/**
 * Hook odpowiedzialny za logikę startu gry:
 * - Budowanie prompta wprowadzającego
 * - Równoległe generowanie obrazu intro
 * - Strumieniowanie odpowiedzi AI z obsługą TTS
 */
export function useGameStart({
  setHasStartedGame,
  activeCharacter,
  characters,
  setActiveCharacter,
  setCharacters,
  pdfMemory,
  adventureContext,
  hotSeatConfig,
  setMessages,
  tts,
  aiSettings,
  runHealthCheck,
  locale = 'pl',
}: UseGameStartProps) {
  // IND-271: kolejka auto-generacji miniatur ekwipunku w tle (fire-and-forget
  // po starcie gry, NIE blokuje startu; cache-aware - pomija itemy z imageUrl).
  const { generateThumbnailsInBackground } = useEquipmentThumbnails({
    activeCharacter,
    adventureContext,
    imageGenerationEnabled: aiSettings?.imageGenerationEnabled ?? false,
    setActiveCharacter,
    setCharacters,
  });

  /**
   * Buduje prompt wprowadzający na podstawie kontekstu postaci i przygody.
   *
   * IND-261: pierwsza tura to rozszerzone wprowadzenie (onboarding nowicjusza,
   * 3-5 akapitów) - jawny wyjątek od limitu długości tur (IND-213). Nadpisanie
   * limitu żyje w samej wiadomości użytkownika, więc obejmuje TYLKO tę turę.
   */
  const buildIntroPrompt = useCallback((): string => {
    const isHotSeat = hotSeatConfig.enabled && hotSeatConfig.players.length > 1;
    const allPlayerCharacters = isHotSeat
      ? hotSeatConfig.players
          .map((p: HotSeatPlayer) =>
            characters.find(
              (c) => c.id === p.characterId || c.playerName === p.name
            )
          )
          .filter((c): c is Character => !!c)
      : activeCharacter
        ? [activeCharacter]
        : [];

    const english = locale === 'en';
    let prompt = english
      ? 'We are beginning the adventure!\n\n'
      : 'Zaczynamy przygodę!\n\n';

    if (english && allPlayerCharacters.length > 1) {
      prompt += `**IMPORTANT: This is a Hot Seat game for ${allPlayerCharacters.length} players.**\n\n--- CHARACTER CONTEXT ---\n`;
      allPlayerCharacters.forEach((char, index) => {
        prompt += `\n**Player ${index + 1} - ${char.name}:**\n- Occupation: ${char.occupation || 'unknown'}\n- Age: ${char.age || 'unknown'}\n`;
        if (char.characterConcept)
          prompt += `- Concept: ${char.characterConcept}\n`;
        if (char.background) prompt += `- Background: ${char.background}\n`;
      });
      prompt +=
        '--- END CHARACTER CONTEXT ---\n\nWrite an organic opening for every player. Do not repeat their sheet data.\n\n';
    } else if (!english && allPlayerCharacters.length > 1) {
      prompt += `**UWAGA: Gra toczy się dla ${allPlayerCharacters.length} graczy (Hot Seat mode)!**\n\n`;
      prompt += `--- KONTEKST POSTACI ---\n`;
      allPlayerCharacters.forEach((char, index) => {
        prompt += `\n**Gracz ${index + 1} - ${char.name}:**\n`;
        prompt += `- Zawód: ${char.occupation || 'nieznany'}\n`;
        prompt += `- Wiek: ${char.age || 'nieznany'}\n`;
        if (char.characterConcept)
          prompt += `- Koncept: ${char.characterConcept}\n`;
        if (char.background) prompt += `- Historia: ${char.background}\n`;
      });
      prompt += `--- KONIEC KONTEKSTU ---\n`;
      prompt +=
        '\n**WAŻNE:** Wprowadzenie MUSI uwzględnić WSZYSTKIE postacie graczy! NIE powtarzaj statystyk ani statycznych opisów postaci z bloku KONTEKST POSTACI w swojej narracji. Wpleć ewentualne nawiązania naturalnie w fabułę.\n\n';
    } else if (english && activeCharacter) {
      prompt += `--- CHARACTER CONTEXT ---\n**My character:**\n- Name: ${activeCharacter.name}\n- Occupation: ${activeCharacter.occupation || 'unknown'}\n- Age: ${activeCharacter.age || 'unknown'}\n`;
      if (activeCharacter.characterConcept)
        prompt += `- Concept: ${activeCharacter.characterConcept}\n`;
      if (activeCharacter.background)
        prompt += `- Background: ${activeCharacter.background}\n`;
      prompt +=
        '--- END CHARACTER CONTEXT ---\n\nUse this context only in the background. Do not quote or repeat it.\n\n';
    } else if (activeCharacter) {
      prompt += `--- KONTEKST POSTACI ---\n**Moja postać:**\n`;
      prompt += `- Imię: ${activeCharacter.name}\n- Zawód: ${activeCharacter.occupation || 'nieznany'}\n- Wiek: ${activeCharacter.age || 'nieznany'}\n`;
      if (activeCharacter.characterConcept)
        prompt += `- Koncept: ${activeCharacter.characterConcept}\n`;
      if (activeCharacter.background)
        prompt += `- Historia: ${activeCharacter.background}\n`;
      prompt += `--- KONIEC KONTEKSTU ---\n\n**WAŻNE:** NIE CYTUJ i NIE POWTARZAJ powyższych informacji o mojej postaci na początku odpowiedzi. Użyj ich TYLKO "w tle" (jako swojej wiedzy Mistrza Gry), aby poprowadzić narrację.\n\n`;
    }

    if (adventureContext) {
      prompt += english
        ? `**ADVENTURE CONTEXT:**\n- Title: ${adventureContext.title}\n- Location: ${adventureContext.location}, ${adventureContext.country}\n- Hook: ${adventureContext.hook}\n\n`
        : `**KONTEKST PRZYGODY:**\n- Tytuł: ${adventureContext.title}\n- Lokalizacja: ${adventureContext.location}, ${adventureContext.country}\n- Hook: ${adventureContext.hook}\n\n`;
    }

    // IND-261: TURA WPROWADZAJĄCA = wyjątek od limitu długości (IND-213). Onboarding
    // dla kogoś, kto nie zna Lovecrafta ani CoC - świat + miejsce + czas, potem hook.
    // Działa wyłącznie na tę jedną turę (wiadomość użytkownika nadpisuje protokół MG);
    // kolejne tury wracają do zwięzłej długości narzuconej przez gm-protocol.
    if (english && allPlayerCharacters.length > 1) {
      prompt +=
        'This is the opening turn for the whole party. Start with an ordinary, period-appropriate scene, establish place and mood, then introduce the adventure hook naturally. Address the party in the plural. Do not play for the characters. Mark the starting place as [LOCATION: place name: brief atmosphere]. Add one opening journal entry as [JOURNAL:note:Beginning the investigation]1-2 sentences about why the party is here.[/JOURNAL] End with [What do you do?].\n';
    } else if (!english && allPlayerCharacters.length > 1) {
      prompt +=
        'To jest TURA WPROWADZAJĄCA do gry DLA DRUŻYNY (Hot Seat mode).\n\n' +
        'WPROWADZENIE DLA DRUŻYNY - ORGANICZNY START FABUŁY:\n' +
        '1. NARRACJA I FORMA: Zwracaj się do postaci naraz w liczbie mnogiej ("Widzicie...", "Wkraczacie...") lub płynnie rozdzielaj ujęcia między bohaterów.\n' +
        '2. ORGANICZNA SCENA OTWARCIA: NIE RZUCAJ graczy od razu w gwałtowny quest ani bezpośrednie zagrożenie. Rozpocznij w naturalnej, zwyczajnej sytuacji obyczajowej (np. wspólna kolacja w restauracji, rozmowa w gabinecie, podróż pociągiem, luźna pogawędka z NPC-em).\n' +
        '3. EKSPOZYCJA I KLIMAT: Pozwól graczom zorientować się w miejscu, czasie i klimacie epoki. Pozwól im poznać świat poprzez opis otoczenia lub interakcję z NPC-em (NIGDY nie zmuszaj graczy do dyskusji między sobą na czacie). Dopiero po przedstawieniu otoczenia zasiej pierwszy delikatny sygnał niepokoju i wprowadź hak fabularny (HOOK przygody).\n' +
        '4. ZAKOŃCZENIE TURY: Zakończ turę otwartym pytaniem do drużyny: [Co robicie?]\n\n' +
        'NIE graj za postacie graczy. Oznacz miejsce startu znacznikiem [LOKACJA: Nazwa miejsca: krótka atmosfera]. ' +
        'Dodaj wpis otwierający do dziennika: [DZIENNIK:notatka:Początek śledztwa]1-2 zdania: co sprowadza naszą drużynę w to miejsce.[/DZIENNIK]\n';
    } else if (english) {
      prompt +=
        'This is the opening turn of the game. Begin with an ordinary, period-appropriate scene. Establish the location and atmosphere before introducing the adventure hook. Write in second person, do not play for the player character, and use slow-burn horror. Mark the starting place as [LOCATION: place name: brief atmosphere]. Add one opening journal entry as [JOURNAL:note:Beginning the investigation]1-2 sentences about where the character is and why they came here.[/JOURNAL] End with [What do you do?] on its own line.\n';
    } else {
      prompt +=
        'To jest TURA WPROWADZAJĄCA do gry.\n\n' +
        'ORGANICZNE WPROWADZENIE W ŚWIAT - INSTRUKCJE:\n' +
        '1. SCENA OTWARCIA: NIE RZUCAJ gracza od razu na głęboką wodę i NIE wrzucaj questa bezpośrednio w pierwszej linii. Rozpocznij od naturalnej, osadzonej w realiach sytuacji (np. postać pije poranną kawę, rozmawia o codziennych sprawach z znajomym NPC-em, przegląda prasę lub je kolację).\n' +
        '2. POZNAWANIE ŚWIATA: Buduj klimat epoki i lokacji naturalnie. Użyj rozmowy z obecnym NPC-em lub klimatycznego opisu otoczenia, by gracz mógł najpierw wyczuć gdzie jest i kim jest jego postać.\n' +
        '3. STOPNIOWE ZAWIĄZANIE AKCJI: Dopiero po zbudowaniu nastroju i wstępnej sytuacji zasiej pierwszy niepokój pod powierzchnią codzienności i wpleć HOOK przygody jako punkt zaczepienia do działania.\n' +
        '4. STYL: Pisz w drugiej osobie ("Widzisz...", "Czujesz..."), buduj atmosferę slow-burn horroru bez epatowania tanimi potworami.\n\n' +
        'NIE graj za postać gracza. Oznacz miejsce startu znacznikiem [LOKACJA: Nazwa miejsca: krótka atmosfera]. ' +
        'Dodaj też wpis otwierający do dziennika: ' +
        '[DZIENNIK:notatka:Początek śledztwa]1-2 zdania: gdzie jestem i co mnie tu sprowadza.[/DZIENNIK] ' +
        'Zakończ otwartym pytaniem [Co robisz?] w OSOBNEJ linii.\n';
    }
    return prompt;
  }, [activeCharacter, characters, hotSeatConfig, adventureContext, locale]);

  /**
   * Generuje obraz intro równolegle ze strumieniowaniem tekstu.
   *
   * IND-148: fire-and-forget (NIE await w handleStartGame), ale błędy są teraz
   * user-visible - catch dodaje system message do chat ze wskazówką "sprawdź
   * klucze API w Settings". Wcześniej catch tylko `console.warn`, więc user
   * widział pusty obraz bez ostrzeżenia (5 scenariuszy errors silently swallowed:
   * replicateEnabled=false, 401, 429, network, provider chain exhausted).
   */
  const generateIntroImage = useCallback(
    async (messageId: string) => {
      if (aiSettings?.imageGenerationEnabled === false) return;
      try {
        if (!adventureContext) {
          throw new Error('Brak kontekstu przygody dla obrazu intro.');
        }
        const eraContext = resolveGameEraContext({
          adventure: adventureContext,
        });
        const locationContext =
          adventureContext?.location || 'mysterious New England town';
        const rawEra = String(eraContext.effectiveYear);
        // Wyciągnij porę roku i aurę z aktualnego czasu gry i pogody
        const gameTime = typeof window !== 'undefined' ? timeManager.getTime() : null;
        const weather = typeof window !== 'undefined' ? timeManager.getWeather() : '';

        const month = gameTime?.month ?? 0;
        const seasonAtmosphere =
          month === 11 || month === 0 || month === 1
            ? 'winter season, cold winter atmosphere, bare trees'
            : month >= 2 && month <= 4
              ? 'spring season, cool damp atmosphere'
              : month >= 5 && month <= 7
                ? 'summer season, hazy daylight'
                : 'autumn season, chilly autumn atmosphere, fallen leaves';

        let weatherAtmosphere = 'moody natural lighting';
        if (/mgła|mgly|fog|haze/i.test(weather)) {
          weatherAtmosphere = 'misty morning fog, thick haze, eerie gloom';
        } else if (/deszcz|rain/i.test(weather)) {
          weatherAtmosphere = 'cold rain, wet glistening ground, dark overcast sky';
        } else if (/śnieg|snow|mróz|frost/i.test(weather)) {
          weatherAtmosphere = 'frost and snow dusting, freezing cold mist';
        }

        // Pojazd tylko gdy scena/lokacja wyraźnie dotyczy podróży lub drogi
        const isVehicleScene =
          /\b(car|automobile|vehicle|drive|driving|road|highway|szosa|droga|parking)\b/i.test(
            locationContext
          );
        const vehicleGuidance = isVehicleScene
          ? `, ${getEraVehicleVisualDescription(rawEra)}`
          : '';

        const imagePrompt = `Atmospheric establishing shot, ${locationContext}, ${seasonAtmosphere}, ${weatherAtmosphere}, ${rawEra} period-accurate${vehicleGuidance}, realistic, cinematic, moody lighting.`;

        const response = await fetchWithRetry('/api/imagen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: imagePrompt,
            style: 'location',
            era: rawEra,
            aspectRatio: '16:9',
          }),
        });

        if (!response.ok) {
          throw new Error(
            `Image API ${response.status}: ${response.statusText}`
          );
        }

        const imageData = await response.json();
        if (!imageData.imageUrl) {
          throw new Error('Brak imageUrl w odpowiedzi API');
        }

        setMessages((prev) =>
          prev.map((message) => {
            if (message.id !== messageId) return message;
            const imageIndex = message.generatedImages?.length ?? 0;
            void persistentMediaCache
              .setChatImage(messageId, imageIndex, imageData.imageUrl)
              .catch(() => {});
            if (adventureContext?.location) {
              void persistentMediaCache
                .setLocationImage(adventureContext.location.trim(), imageData.imageUrl)
                .catch(() => {});
            }
            return {
              ...message,
              generatedImages: [
                ...(message.generatedImages ?? []),
                imageData.imageUrl,
              ],
              generatedImageTypes: [
                ...(message.generatedImageTypes ?? []),
                'scene',
              ],
              generatedImageCacheIds: [
                ...(message.generatedImageCacheIds ?? []),
                `${messageId}_${imageIndex}`,
              ],
            };
          })
        );
      } catch (e) {
        console.warn('Intro image generation failed:', e);
        setMessages((prev) => [
          ...prev,
          {
            id: `gm-intro-image-error-${crypto.randomUUID()}`,
            role: 'assistant',
            content:
              locale === 'en'
                ? '⚠️ The intro image could not be generated. Check the Gemini API key in Settings.'
                : '⚠️ Nie udało się wygenerować obrazu intro. Sprawdź klucz Gemini API Key w Ustawieniach.',
            timestamp: new Date(),
          },
        ]);
      }
    },
    [adventureContext, aiSettings?.imageGenerationEnabled, locale, setMessages]
  );

  // IND-174 (port): guard przeciw podwójnemu startowi gry (double-click
  // "Rozpocznij", re-fire). Bez tego współbieżne wywołania handleStartGame
  // generują DWA openingi - setMessages([]) nie chroni, bo oba appendują przez
  // różne assistantMessageId. useRef zamiast state: synchroniczny, bez okna race.
  const isStartingRef = useRef(false);

  const handleStartGame = useCallback(async () => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;

    if (!adventureContext) {
      isStartingRef.current = false;
      return;
    }

    const eraContext = resolveGameEraContext({ adventure: adventureContext });
    if (!adventureContext.isCustom) {
      // Gotowe przygody mają lokalny kanon. Nie mogą wymagać odpowiedzi AI ani
      // dodatkowego kosztu tylko po to, aby wejść do pierwszej sceny.
      storeWorldSetup(createPresetWorldSetup(adventureContext, eraContext));
    } else {
      try {
        const preflightSource = JSON.stringify({
          title: adventureContext.title,
          description: adventureContext.description,
          hook: adventureContext.hook,
          conflicts: adventureContext.conflicts,
          setupAsymmetry: adventureContext.setupAsymmetry,
          graph: adventureContext.graph,
        });
        const preflightResponse = await fetchWithRetry('/api/adventure/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adventureText: preflightSource,
            scenarioId: adventureContext.id,
            adventureTitle: adventureContext.title,
            isCustomScenario: Boolean(adventureContext.isCustom),
            scenarioYearRange: adventureContext.yearRange,
            eraContext,
            characters: (characters.length > 0
              ? characters
              : activeCharacter
                ? [activeCharacter]
                : []
            ).map((character) => ({
              id: character.id,
              name: character.name,
              occupation: character.occupation || '',
              background: character.background || '',
            })),
          }),
        });

        if (!preflightResponse.ok) {
          const errorBody = await preflightResponse.json().catch(() => ({}));
          const serverMessage =
            (errorBody as { error?: string }).error ||
            preflightResponse.statusText;
          throw new Error(
            `Preflight ${preflightResponse.status}: ${serverMessage}`
          );
        }

        const preflightPayload = (await preflightResponse.json()) as {
          worldSetup?: unknown;
        };
        if (!isWorldSetupBundle(preflightPayload.worldSetup)) {
          throw new Error(
            'Preflight nie zwrócił poprawnego WorldSetupBundleV1.'
          );
        }
        if (hasBlockingSetupFailure(preflightPayload.worldSetup.phaseResults)) {
          throw new Error('Preflight wykrył krytyczny błąd setupu.');
        }
        storeWorldSetup(preflightPayload.worldSetup);
      } catch (error) {
        console.error('World preflight failed:', error);
        setHasStartedGame(false);
        setMessages([
          {
            id: `world-preflight-error-${crypto.randomUUID()}`,
            role: 'assistant',
            content:
              locale === 'en'
                ? 'The adventure cannot start because world preparation failed. Check the exact year, country, selected characters and API key, then try again.'
                : 'Nie można rozpocząć przygody, ponieważ przygotowanie świata nie przeszło bramki. Sprawdź dokładny rok, kraj, wybrane postacie i klucz API, a potem spróbuj ponownie.',
            timestamp: new Date(),
          },
        ]);
        isStartingRef.current = false;
        return;
      }
    }

    // IND-273 T3: self-check klucza/modeli (fire-and-forget, TTL dławi, nie blokuje startu).
    runHealthCheck?.();

    // Włącz hard-loading screen dla powitalnego intra TTS (zniknie po pobraniu 1 paczki)
    tts.startInitialBuffering();

    setHasStartedGame(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('has_started_game', 'true');
      localStorage.setItem('session_started_at', String(Date.now()));
      // Autostart muzyki w tle (YouTubePlayer nasłuchuje 'zew:start-music').
      // MUSI paść synchronicznie w obrębie gestu kliknięcia „Rozpocznij",
      // PRZED pierwszym await - inaczej przeglądarka zablokuje odtwarzanie dźwięku.
      window.dispatchEvent(new CustomEvent('zew:start-music'));
    }

    // IND-57: zeruj licznik tokenów bieżącej sesji (totalTokens zostaje - career counter)
    resetSessionTokens();

    trackEvent('game_started', {
      adventure: adventureContext?.title ?? 'none',
      era: adventureContext?.eraLabel ?? 'unknown',
      tone: adventureContext?.tone ?? 'unknown',
      preset: aiSettings?.qualityPreset ?? 'unknown',
      hotSeat: hotSeatConfig?.enabled ?? false,
      playersCount: hotSeatConfig?.players?.length ?? 0,
      hasCharacter: !!activeCharacter,
    });

    const introPrompt = buildIntroPrompt();
    const assistantMessageId = `gm-intro-${crypto.randomUUID()}`;

    // Bug data: ustaw zegar na erę przygody (modern->2024, classic->1925,
    // gaslight->1890) PRZED openingiem. Świeży start nadpisuje stary czas z
    // localStorage; reload zapisanej gry tu nie trafia (osobna ścieżka).
    timeManager.resetForAdventure(adventureContext);
    setMessages([]); // Wyczyść czat przed startem przygody

    // Wyczyść wyłącznie obrazy generowane dla egzemplarzy fabularnych. Katalogowe
    // assety są lokalne i muszą przetrwać start bez kosztu ani żądania do API.
    let thumbnailCharacter = activeCharacter;
    if (activeCharacter) {
      const resetEquipment = (activeCharacter.equipment ?? []).map((item) => ({
        ...item,
        ...(item.imageUrl &&
        item.imageUrl.includes('/equipment/catalog/') &&
        item.imageUrl.endsWith('.webp')
          ? {}
          : { imageUrl: undefined, imagePrompt: undefined }),
      }));
      const updatedCharacter = {
        ...activeCharacter,
        equipment: resetEquipment,
      };
      thumbnailCharacter = updatedCharacter;

      // Zaktualizuj stan lokalny i chmurę
      setCharacters((prevList) => {
        const updatedList = prevList.map((c) =>
          c.id === activeCharacter.id ? updatedCharacter : c
        );
        persistCharacters(updatedList);
        return updatedList;
      });
      setActiveCharacter(updatedCharacter);
    }

    // IND-271: miniatury ekwipunku w tle (fire-and-forget, nie blokuje startu).
    generateThumbnailsInBackground(thumbnailCharacter ?? undefined);

    try {
      const resolvedHotSeat = hotSeatConfig?.enabled
        ? {
            ...hotSeatConfig,
            players: (hotSeatConfig.players || []).map((player) => {
              const matchedChar = characters.find(
                (c) =>
                  c.id === player.characterId || c.playerName === player.name
              );
              return {
                ...player,
                characterId: matchedChar?.id || player.characterId,
                characterName: matchedChar?.name,
              };
            }),
          }
        : hotSeatConfig;

      // Zadanie 6: retry na chwilowy blip sieci przy starcie gry (1-2 próby).
      const response = await fetchWithRetry('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: introPrompt,
          messages: [],
          pdfMemory: pdfMemory,
          // Sanityzuj postać (portret + miniatury ekwipunku = base64 ~MB) by nie
          // przekroczyć limitu payloadu /api/chat (regresja B2 28.06).
          character: sanitizeCharacterForApi(activeCharacter),
          characters: (characters || []).map((c) => sanitizeCharacterForApi(c)),
          hotSeatConfig: resolvedHotSeat,
          adventureContext: adventureContext,
          eraContext: loadStoredWorldSetup()?.eraContext,
          locale,
          isGameStart: true,
          aiSettings: aiSettings,
          gameTime: timeManager.getTime(),
        }),
      });

      // Walidacja HTTP przed strumieniowaniem SSE. Bez tego serwer zwracający
      // JSON z błędem (np. 401 BYOK_KEY_MISSING) jest cicho ignorowany przez
      // parseSSEStream - żaden wiersz nie zaczyna się od "data: ", parser
      // kończy z fullText="" i blok catch się nie wykonuje, zostawiając
      // osieroconą pustą wiadomość asystenta na ekranie.
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const serverMsg =
          (errorBody as Record<string, string>)?.error || response.statusText;
        throw new Error(`Chat API ${response.status}: ${serverMsg}`);
      }

      // Dodaj pustą wiadomość asystenta do strumieniowania
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
        },
      ]);
      // Obraz należy do tej samej wiadomości MG co intro. Uruchamiamy go po
      // utworzeniu placeholdera, aby wynik nie utworzył osobnej karty czatu.
      void generateIntroImage(assistantMessageId);

      // Użyj uniwersalnego parsera SSE.
      // IND-256 (bliźniak useChat): `streamedFullText` akumuluje pełny tekst z
      // onText, by onMetadata mógł go użyć BEZ czytania zewnętrznego `fullText`.
      // `const fullText` jest przypisywany dopiero po ZAKOŃCZENIU parseSSEStream,
      // a onMetadata jest wywoływane WEWNĄTRZ parsera (przed przypisaniem) →
      // czytanie `fullText` w onMetadata rzucało TDZ ReferenceError (cicho
      // połykany przez try/catch parsera, surfaced przez onParseError → Sentry
      // na każdym starcie gry). Ten sam fix co useChat.ts:293.
      let streamedFullText = '';
      const fullText = await parseSSEStream(response, {
        onText: (text) => {
          streamedFullText = text;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId ? { ...msg, content: text } : msg
            )
          );
          // Inkrementalny TTS
          if (tts.voiceEnabled && tts.isTTSEnabled) {
            tts.addToQueue(text, assistantMessageId);
          }
        },
        onMetadata: (metadata) => {
          // finishReason z metadanych (MAX_TOKENS = urwane intro) musi trafić
          // na wiadomość - bez tego przycisk "Kontynuuj narrację" nie wie, że
          // intro jest częściowe.
          if (metadata.finishReason) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, finishReason: String(metadata.finishReason) }
                  : msg
              )
            );
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

          if (tts.voiceEnabled && tts.isTTSEnabled) {
            // M6 sesja 146: drop multi-voice branch per D3.
            tts.generateVoiceForMessage(
              {
                id: assistantMessageId,
                role: 'assistant',
                content: streamedFullText,
                timestamp: new Date(),
              },
              []
            );
          }
        },
        // Defensive-in-depth (po IND-256): eskaluje prawdziwe błędy z
        // onText/onMetadata (np. generowanie obrazu intro) do Sentry + konsoli
        // zamiast cichego połknięcia przez parser. SyntaxError partial-chunków
        // jest pomijany.
        onParseError: createSseParseErrorHandler({
          endpoint: '/api/chat',
          hook: 'useGameStart',
        }),
      });

      // IND-201: auto-dziennik dla openingu (opening idzie tym samym /api/chat
      // z gm-protocol, może nieść [DZIENNIK:]). Idempotentne (dedup po messageId).
      if (activeCharacter) {
        const updatedChar = appendJournalFromText(
          activeCharacter,
          fullText,
          assistantMessageId
        );
        if (updatedChar !== activeCharacter) {
          setActiveCharacter(updatedChar);
          const updatedList = characters.map((c) =>
            c.id === updatedChar.id ? updatedChar : c
          );
          setCharacters(updatedList);
          if (typeof window !== 'undefined') {
            persistCharacters(updatedList);
          }
        }
      }
    } catch (error) {
      console.error('Game start intro failed:', error);
      tts.stopCurrentAudio();
      // Zadanie 6: po wyczerpaniu retry pokaż graczowi co się stało zamiast pustego
      // ekranu - blip sieci dostaje wskazówkę "spróbuj ponownie", inny błąd ogólny.
      // Usuwamy osierocony pusty placeholder assistantMessageId (jeśli istnieje
      // i nie zdążył otrzymać treści) i ZASTĘPUJEMY go komunikatem błędu,
      // zamiast doklejać drugi dymek obok pustego.
      const friendly = isNetworkBlip(error)
        ? locale === 'en'
          ? '⚠️ A temporary connection problem occurred while starting the game. Try Start Adventure again.'
          : '⚠️ Chwilowy problem z połączeniem przy starcie gry - kliknij „Rozpocznij" jeszcze raz.'
        : locale === 'en'
          ? '⚠️ The game could not start. Check your connection and API key, then try again.'
          : '⚠️ Nie udało się rozpocząć gry. Sprawdź połączenie i klucz API, po czym spróbuj ponownie.';
      const errorMsg: Message = {
        id: `gm-intro-error-${crypto.randomUUID()}`,
        role: 'assistant',
        content: friendly,
        timestamp: new Date(),
      };
      setMessages((prev) => {
        // Usuń osierocony pusty dymek (content puste = nigdy nie dostał tekstu)
        const cleaned = prev.filter(
          (msg) => !(msg.id === assistantMessageId && !msg.content)
        );
        return [...cleaned, errorMsg];
      });
    } finally {
      isStartingRef.current = false;
    }
  }, [
    setHasStartedGame,
    activeCharacter,
    characters,
    setActiveCharacter,
    setCharacters,
    pdfMemory,
    adventureContext,
    hotSeatConfig,
    setMessages,
    tts,
    buildIntroPrompt,
    generateIntroImage,
    generateThumbnailsInBackground,
    aiSettings,
    runHealthCheck,
    locale,
  ]);

  return { handleStartGame };
}
