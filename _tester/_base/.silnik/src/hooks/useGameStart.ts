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
import { useEquipmentThumbnails } from './useEquipmentThumbnails';
import { sanitizeCharacterForApi } from '@/lib/chat-history-sanitizer';

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

interface UseGameStartProps {
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
}: UseGameStartProps) {
  // IND-271: kolejka auto-generacji miniatur ekwipunku w tle (fire-and-forget
  // po starcie gry, NIE blokuje startu; cache-aware - pomija itemy z imageUrl).
  const { generateThumbnailsInBackground } = useEquipmentThumbnails({
    activeCharacter,
    adventureContext,
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
            characters.find((c) => c.id === p.characterId)
          )
          .filter((c): c is Character => !!c)
      : activeCharacter
        ? [activeCharacter]
        : [];

    let prompt = 'Zaczynamy przygodę!\n\n';

    if (allPlayerCharacters.length > 1) {
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
      prompt += `**KONTEKST PRZYGODY:**\n- Tytuł: ${adventureContext.title}\n- Lokalizacja: ${adventureContext.location}, ${adventureContext.country}\n- Hook: ${adventureContext.hook}\n\n`;
    }

    // IND-261: TURA WPROWADZAJĄCA = wyjątek od limitu długości (IND-213). Onboarding
    // dla kogoś, kto nie zna Lovecrafta ani CoC - świat + miejsce + czas, potem hook.
    // Działa wyłącznie na tę jedną turę (wiadomość użytkownika nadpisuje protokół MG);
    // kolejne tury wracają do zwięzłej długości narzuconej przez gm-protocol.
    prompt +=
      'To jest TURA WPROWADZAJĄCA do gry. WYJĄTEK: wyłącznie dla tej jednej, pierwszej tury ' +
      'zignoruj limit "max 2 akapity" z protokołu MG - napisz pełniejsze, klimatyczne ' +
      'wprowadzenie (3-5 akapitów). Kolejne tury wracają do normalnej, zwięzłej długości.\n\n' +
      'Pisz dla kogoś, kto NIE zna Lovecrafta ani zasad CoC 7e - po prostu chce zagrać. ' +
      'Wprowadzaj go w świat POWOLI i naturalnie, bez żargonu i bez wykładu, w drugiej osobie ' +
      '("Widzisz...", "Czujesz..."). Zachowaj kolejność:\n' +
      '1. Nakreśl świat i realia: gdzie i KIEDY jesteśmy (era, miejsce akcji, pora) - tak, by ' +
      'osoba z zewnątrz od razu poczuła klimat epoki.\n' +
      '2. Gdzie konkretnie znajduje się postać gracza i DLACZEGO akurat tam się znalazła.\n' +
      '3. Zawiąż fabułę: KONIECZNIE wykorzystaj HOOK przygody jako konkretny punkt zaczepienia ' +
      'i powód do działania - nie poprzestawaj na opisie tła.\n' +
      '4. Zasiej delikatnie atmosferę Mitów Cthulhu (niepokój, groza pod powierzchnią). Jeśli w ' +
      '[RAG_CONTEXT] jest pasujące lore Mitów lub punkty zaczepienia autora przygody, wpleć je ' +
      'subtelnie - atmosfera ponad ekspozycję, BEZ wysypu nazw własnych i bez spoilerów.\n\n' +
      'NIE graj za postać gracza (steruje nią człowiek). NIE powtarzaj ani nie duplikuj sceny. ' +
      'Oznacz miejsce startu znacznikiem [LOKACJA: Nazwa miejsca: krótka atmosfera] - ' +
      'zapali pineskę lokacji w nagłówku. Dodaj też wpis otwierający do dziennika: ' +
      '[DZIENNIK:notatka:Początek śledztwa]1-2 zdania: gdzie jestem i co mnie tu sprowadza.[/DZIENNIK] ' +
      'Oba znaczniki są niewidoczne w narracji - UI je przechwytuje. ' +
      'Zakończ otwartym pytaniem [Co robisz?] w OSOBNEJ linii.\n';
    return prompt;
  }, [activeCharacter, characters, hotSeatConfig, adventureContext]);

  /**
   * Generuje obraz intro równolegle ze strumieniowaniem tekstu.
   *
   * IND-148: fire-and-forget (NIE await w handleStartGame), ale błędy są teraz
   * user-visible - catch dodaje system message do chat ze wskazówką "sprawdź
   * klucze API w Settings". Wcześniej catch tylko `console.warn`, więc user
   * widział pusty obraz bez ostrzeżenia (5 scenariuszy errors silently swallowed:
   * replicateEnabled=false, 401, 429, network, provider chain exhausted).
   */
  const generateIntroImage = useCallback(async () => {
    try {
      const locationContext =
        adventureContext?.location || 'mysterious New England town';
      const imagePrompt = `Atmospheric establishing shot, ${locationContext}, Call of Cthulhu style, moody lighting, vintage horror, cinematic.`;
      const response = await fetchWithRetry('/api/imagen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // IND-216: establishing shot w formacie pocztówkowym 16:9 (orchestrator
        // forwarduje ...body do Vertex/Replicate). Render kadruje object-cover.
        body: JSON.stringify({
          prompt: imagePrompt,
          style: 'horror',
          aspectRatio: '16:9',
        }),
      });

      if (!response.ok) {
        throw new Error(`Image API ${response.status}: ${response.statusText}`);
      }

      const imageData = await response.json();
      if (!imageData.imageUrl) {
        throw new Error('Brak imageUrl w odpowiedzi API');
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `gm-intro-image-${crypto.randomUUID()}`,
          role: 'assistant',
          content: `![Wprowadzenie](${imageData.imageUrl})`,
          timestamp: new Date(),
        },
      ]);
    } catch (e) {
      console.warn('Intro image generation failed:', e);
      setMessages((prev) => [
        ...prev,
        {
          id: `gm-intro-image-error-${crypto.randomUUID()}`,
          role: 'assistant',
          content:
            '⚠️ Nie udało się wygenerować obrazu intro. Sprawdź klucze API w Settings (image provider: Replicate / Vertex AI / Gemini).',
          timestamp: new Date(),
        },
      ]);
    }
  }, [adventureContext, setMessages]);

  // IND-174 (port): guard przeciw podwójnemu startowi gry (double-click
  // "Rozpocznij", re-fire). Bez tego współbieżne wywołania handleStartGame
  // generują DWA openingi - setMessages([]) nie chroni, bo oba appendują przez
  // różne assistantMessageId. useRef zamiast state: synchroniczny, bez okna race.
  const isStartingRef = useRef(false);

  const handleStartGame = useCallback(async () => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    // IND-273 T3: self-check klucza/modeli (fire-and-forget, TTL dławi, nie blokuje startu).
    runHealthCheck?.();
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
    generateIntroImage(); // Równolegle z generowaniem tekstu

    // Wymuś oczyszczenie starych, wadliwych miniatur przy starcie nowej gry
    if (activeCharacter) {
      const resetEquipment = (activeCharacter.equipment ?? []).map((item) => ({
        ...item,
        imageUrl: undefined,
        imagePrompt: undefined,
      }));
      const updatedCharacter = { ...activeCharacter, equipment: resetEquipment };
      
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
    generateThumbnailsInBackground();

    try {
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
          adventureContext: adventureContext,
          isGameStart: true,
          aiSettings: aiSettings,
          gameTime: timeManager.getTime(),
        }),
      });

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
      // Zadanie 6: po wyczerpaniu retry pokaż graczowi co się stało zamiast pustego
      // ekranu - blip sieci dostaje wskazówkę "spróbuj ponownie", inny błąd ogólny.
      const friendly = isNetworkBlip(error)
        ? '⚠️ Chwilowy problem z połączeniem przy starcie gry - kliknij „Rozpocznij" jeszcze raz.'
        : '⚠️ Nie udało się rozpocząć gry. Sprawdź połączenie i klucz API, po czym spróbuj ponownie.';
      setMessages((prev) => [
        ...prev,
        {
          id: `gm-intro-error-${crypto.randomUUID()}`,
          role: 'assistant',
          content: friendly,
          timestamp: new Date(),
        },
      ]);
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
  ]);

  return { handleStartGame };
}
