'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Message } from '@/lib/types';
import { loadAISettings } from '@/lib/ai-settings';

// M6 sesja 146: import DialogueLine + generateMultiVoice DROPPED per D3 (drop multi-voice).
// Sesja 147 Faza 2: multi-voice WRACA wyłącznie dla preset=ultra (słuchowisko
// radiowe). MID/HIGH wciąż jednym głosem narratora. Marker `@Imię:` parsowany
// linia po linii z text.
import { loadNpcVoiceMap } from '@/lib/npc-voice-mapping';

interface QueueItem {
  text: string;
  voiceId?: string; // override z multi-voice; undefined → settings.voiceSettings.voiceId
}

export interface TTSState {
  voiceEnabled: boolean;
  isGeneratingVoice: boolean;
  currentAudio: HTMLAudioElement | null;
  isNarratorOnly: boolean;
  isTTSEnabled: boolean;
  isAudioPaused: boolean;
  queueStatus: {
    queueLength: number;
    totalCharacters: number;
    processing: boolean;
  };
}

export interface UseTTSReturn extends TTSState {
  setVoiceEnabled: (value: boolean) => void;
  setIsNarratorOnly: (value: boolean) => void;
  setIsTTSEnabled: (value: boolean) => void;
  generateVoiceForMessage: (
    message: Message,
    messages: Message[]
  ) => Promise<void>;
  // M6 sesja 146: generateMultiVoice DROPPED per D3.
  stopCurrentAudio: () => void;
  toggleAudioPause: () => void;
  addToQueue: (text: string, messageId?: string, flush?: boolean) => void;
}

/**
 * Usuwa didaskalia, tagi systemowe i formatowanie z tekstu przed TTS
 */
import {
  cleanResponseText,
  stripMultilineArtifacts,
} from '@/lib/parsers/text-cleaner';
import { getApiKeyHeaders } from '@/lib/api-keys-service';

/**
 * IND-196: model Gemini TTS dobierany wg ROLI mówcy, nie długości zdania.
 * Eliminuje przeskoki w obrębie jednej narracji - poprzedni auto-route per-zdanie
 * (>300 znaków, sesja 146 M1) fragmentował wypowiedź MG między modele = "dwa głosy".
 *
 * Demo HIGH 2026-06-23: narrator → Flash (był Pro). Demo gra na presecie HIGH gdzie
 * szybkość lektora ma priorytet - A/B odsłuch Charon Pro vs Flash potwierdził
 * akceptowalną barwę, a Flash ~2x szybszy (lektor rusza ~15s wcześniej). Oba modele
 * Flash = zero przeskoków (sedno IND-196 zachowane). Powrót na Pro = zmień stałą niżej.
 */
const TTS_MODEL_NARRATOR = 'gemini-2.5-flash-preview-tts';
const TTS_MODEL_NPC = 'gemini-2.5-flash-preview-tts';

/**
 * IND-191: parametry odporności kolejki TTS na rate-limit / błędy transient.
 * Kolejka jest już SEKWENCYJNA (worker `await fetch` jeden segment na raz) - to bazowy
 * throttle. Retry honorujący `Retry-After` rozkłada rate reaktywnie (po 429 czekamy
 * `retryDelay` nim ponowimy → RPM sam spada pod limit). Cap chroni UX przed zawieszeniem
 * na pełne ~35s free-tier retryDelay.
 */
const MAX_TTS_RETRIES = 2; // próby ponowienia segmentu (poza pierwszą)
const MAX_RETRY_WAIT_MS = 8000; // cap czekania po 429 (free-tier podaje ~35s)
const TRANSIENT_RETRY_WAIT_MS = 400; // backoff dla 500/503/network

/**
 * E1 (start lektora): minimalna długość wczesnego pierwszego segmentu na niskich
 * presetach. Pierwszy KOMPLETNY akapit intra to często jeden, długo rosnący akapit -
 * bez wczesnego startu audio rusza dopiero po flush (~koniec streamu, odczuwalna luka
 * ~1,5 min). Gdy pierwszy akapit ma już >= tylu znaków kompletnych zdań, oddajemy je
 * do TTS od razu (audio rusza w trakcie streamu). Mały próg = krótkie pierwsze audio
 * szybko; reszta akapitu dociąga normalnym batchem (spójna prozodia dalej).
 * Próg ~jedno krótkie zdanie - chroni przed mikro-blipem audio ("Wchodzisz.").
 */
const EARLY_FIRST_SEGMENT_MIN_CHARS = 40;

/**
 * IND-191: fetch TTS z ponowieniem. Zwraca `audioUrl` albo `null` (segment niemy -
 * świadoma degradacja zamiast bezpowrotnej utraty audio bez próby ratunku).
 *
 * - 429 → honoruj `Retry-After` (capped MAX_RETRY_WAIT_MS) → ponów segment.
 * - !ok (500/503) → krótki backoff → ponów.
 * - network throw → backoff → ponów.
 * - sukces → `result.success && result.audioUrl`.
 *
 * Czysta (poza hookiem) - worker ma deps `[]`, więc parametry przez stałe modułowe.
 */
async function fetchTtsWithRetry(
  url: string,
  payload: Record<string, unknown>
): Promise<string | null> {
  for (let attempt = 0; attempt <= MAX_TTS_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        // IND-206 BYOK: dołącz klucz Gemini testera (X-Gemini-Api-Key z localStorage).
        // Bez tego /api/tts/gemini zwraca 401 po przejściu na header-only (Faza A).
        headers: { 'Content-Type': 'application/json', ...getApiKeyHeaders() },
        body: JSON.stringify(payload),
      });

      // Rate-limit: czekaj Retry-After (capped) i ponów. Po wyczerpaniu → segment niemy.
      if (response.status === 429) {
        if (attempt < MAX_TTS_RETRIES) {
          const retryAfter = parseInt(
            response.headers?.get?.('Retry-After') || '',
            10
          );
          const waitMs = Number.isFinite(retryAfter)
            ? Math.min(retryAfter * 1000, MAX_RETRY_WAIT_MS)
            : TRANSIENT_RETRY_WAIT_MS;
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }
        console.warn(
          `🔇 TTS: 429 rate-limit - segment pominięty po ${MAX_TTS_RETRIES} próbach`
        );
        return null;
      }

      // Inny błąd HTTP (500/503): krótki backoff i ponów.
      if (response.ok === false) {
        if (attempt < MAX_TTS_RETRIES) {
          await new Promise((r) => setTimeout(r, TRANSIENT_RETRY_WAIT_MS));
          continue;
        }
        console.warn(
          `🔇 TTS: błąd ${response.status} - segment pominięty po ${MAX_TTS_RETRIES} próbach`
        );
        return null;
      }

      const result = await response.json();
      if (result.success && result.audioUrl) return result.audioUrl;
      return null;
    } catch (e) {
      if (attempt < MAX_TTS_RETRIES) {
        await new Promise((r) => setTimeout(r, TRANSIENT_RETRY_WAIT_MS));
        continue;
      }
      console.warn('🔇 TTS: błąd sieci - segment pominięty', e);
      return null;
    }
  }
  return null;
}

/**
 * Usuwa didaskalia, tagi systemowe i formatowanie z tekstu przed TTS
 * @deprecated Use cleanResponseText from parsers/text-cleaner instead
 */
export function removeDidaskalia(text: string): string {
  return cleanResponseText(text);
}

export function useTTS(): UseTTSReturn {
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(
    null
  );
  const [isTTSEnabled, setIsTTSEnabled] = useState(true);
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const [queueStatus, setQueueStatus] = useState({
    queueLength: 0,
    totalCharacters: 0,
    processing: false,
  });

  // Refs do zarządzania kolejkowaniem
  const queueRef = useRef<string[]>([]);
  // Faza 2 sesji 147: queue trzyma `{text, voiceId?}` zamiast string.
  // voiceId override pochodzi z multi-voice parser (ULTRA preset).
  // undefined → worker używa settings.voiceSettings.voiceId (current single-voice flow).
  const pendingQueueRef = useRef<QueueItem[]>([]);
  // Wartość null = TOMBSTONE: segment wyczerpał retry (500/429 → audioUrl null).
  // Player rozróżnia "brak wpisu" (undefined, czekaj) od tombstone (null, pomiń),
  // by nie blokować się na zawsze na nieudanym segmencie (urwanie lektora).
  const preloadedAudioRef = useRef<Map<number, HTMLAudioElement | null>>(
    new Map()
  );
  const isProcessingQueueRef = useRef(false);
  const isPlayingQueueRef = useRef(false);
  const currentMessageIdRef = useRef<string | null>(null);
  const rawProcessedPosRef = useRef(0); // IND-193: ostatnia długość raw (early-return skip)
  const processedSentenceCountRef = useRef(0); // IND-193: liczba zakolejkowanych pełnych zdań
  const processingIndexRef = useRef(0); // Indeks aktualnie przetwarzanego zdania w ramach wiadomości
  // Faza 2 sesji 147: pamiętamy ostatnio aktywnego mówcę NPC dla ULTRA preset.
  // Marker `@Imię:` w jednym zdaniu propaguje voiceId na kolejne zdania bez markera,
  // aż do następnego markera lub messageId reset.
  const lastNpcNameRef = useRef<string | null>(null);
  // IND-193 guard: pojedyncze flush per messageId. generateVoiceForMessage woła
  // addToQueue(content, id, true) na koniec każdej odpowiedzi - bez tej flagi
  // dwukrotne wywołanie zduplikowałoby resztkę bez terminatora (warunek flush
  // przelicza lastEnd/stripped od zera). Reset przy zmianie messageId i stopie.
  const flushedRef = useRef(false);
  // IND-200: idempotentny guard per-message. Po pełnym flush wiadomość jest
  // "zamknięta" - kolejne addToQueue dla tego samego id (spóźniony streaming async
  // lub ponowny finalize) wraca natychmiast, eliminując re-kolejkowanie całości
  // (objaw: lektor czytał narrację 2×). Komplementarny do flushedRef. Czyszczony
  // w stopCurrentAudio (wołanym też przy ID-change → nowa wiadomość startuje świeżo).
  const completedMessageIdsRef = useRef<Set<string>>(new Set());
  // demo 2026-06-22: ULTRA scala kolejne zdania o tym SAMYM voiceId w jeden segment TTS
  // (jeden spójny głos zamiast resetu prozodii per zdanie - objaw "lektor brzmi jak 3 osoby").
  // Run trzymany MIĘDZY wywołaniami addToQueue (streaming), zamykany przy zmianie mówcy lub
  // flush. Reset przy ID-change/stop (jak lastNpcNameRef), by nie przeciekał między wiadomościami.
  const openRunRef = useRef<{
    voiceId: string | undefined;
    texts: string[];
  } | null>(null);
  // E1 (start lektora): liczba znaków PIERWSZEGO akapitu już oddanych do TTS "na
  // wcześnie" - zanim akapit się domknął (`\n\n`). Na niskich presetach (LOW/MID/HIGH)
  // intro to często jeden, długo rosnący akapit; bez tego pierwsze audio czekałoby do
  // flush (~koniec streamu). Wcześnie wypychamy KOMPLETNE zdania pierwszego akapitu, a
  // pętla akapitów docina już wypowiedzianą część (slice o tę liczbę). Reset przy
  // ID-change/stop (jak openRunRef), by nie przeciekał między wiadomościami.
  const earlySpokenCharsRef = useRef(0);

  useEffect(() => {
    console.log('🔊 TTS: Hook MOUNTED');
    return () => console.log('🔊 TTS: Hook UNMOUNTED');
  }, []);

  // Reaktywne wyciszenie przy wyłączeniu lektora w runtime
  useEffect(() => {
    if (!voiceEnabled || !isTTSEnabled) {
      stopCurrentAudio();
    }
  }, [voiceEnabled, isTTSEnabled, stopCurrentAudio]);

  const stopCurrentAudio = useCallback(() => {
    console.log('🔊 TTS: STOP called. Resetting state.');
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }
    // Zatrzymaj wszystkie prekładowane audio
    preloadedAudioRef.current.forEach((audio) => {
      if (!audio) return; // tombstone (null) - brak audio do zatrzymania
      audio.pause();
      audio.currentTime = 0;
    });
    preloadedAudioRef.current.clear();
    queueRef.current = [];
    pendingQueueRef.current = [];
    isProcessingQueueRef.current = false;
    isPlayingQueueRef.current = false;
    currentMessageIdRef.current = null;
    rawProcessedPosRef.current = 0;
    processedSentenceCountRef.current = 0;
    processingIndexRef.current = 0;
    playbackIndexRef.current = 0; // IND-204: bez tego po Stop bez ID-change worker generuje od 0, a player czeka na ostatni N → cisza
    flushedRef.current = false;
    openRunRef.current = null; // demo 2026-06-22: nie przenoś niedokończonego runu narratora między wiadomościami
    earlySpokenCharsRef.current = 0; // E1: świeży kursor wczesnego startu dla nowej wiadomości
    completedMessageIdsRef.current.clear(); // IND-200
    setIsAudioPaused(false);
    setQueueStatus({ queueLength: 0, totalCharacters: 0, processing: false });
  }, [currentAudio]);

  const toggleAudioPause = useCallback(() => {
    if (currentAudio) {
      if (currentAudio.paused) {
        currentAudio.play().catch(console.error);
        setIsAudioPaused(false);
      } else {
        currentAudio.pause();
        setIsAudioPaused(true);
      }
    }
  }, [currentAudio]);

  // Worker przetwarzający kolejkę
  const runQueueWorker = useCallback(async () => {
    if (isProcessingQueueRef.current) return;
    isProcessingQueueRef.current = true;
    const currentSettings = loadAISettings();

    try {
      while (pendingQueueRef.current.length > 0) {
        // Przenieś z pending do głównej kolejki przetwarzania
        const item = pendingQueueRef.current.shift();
        if (!item) continue;
        const { text, voiceId: overrideVoiceId } = item;
        if (!text) continue;

        const index = processingIndexRef.current++;
        console.log(
          `🔊 TTS Worker: Processing segment ${index}${overrideVoiceId ? ` [voice=${overrideVoiceId}]` : ''}: "${text.substring(0, 30)}..."`
        );
        setIsGeneratingVoice(true);

        try {
          let audioUrl: string | null = null;
          // Faza 2 sesji 147: voiceId z multi-voice parsera ma priorytet nad settings.
          const effectiveVoice =
            overrideVoiceId || currentSettings.voiceSettings?.voiceId || 'Kore';

          // Zew-App-Local: jeden klucz Gemini - cały TTS przez /api/tts/gemini
          // (Google Cloud TTS wycięty, to osobny klucz). IND-196: model wg ROLI mówcy -
          // overrideVoiceId (ULTRA multi-voice NPC) → Flash, narrator MG → Flash
          // (demo HIGH 2026-06-23, był Pro - szybszy lektor). Oba Flash = zero przeskoków.
          const geminiModel = overrideVoiceId
            ? TTS_MODEL_NPC
            : TTS_MODEL_NARRATOR;
          // IND-191: fetch z retry (429 honoruje Retry-After, transient backoff).
          audioUrl = await fetchTtsWithRetry('/api/tts/gemini', {
            text,
            voice: effectiveVoice,
            model: geminiModel,
            languageCode: 'pl-PL',
          });

          if (audioUrl) {
            const audio = new Audio(audioUrl);
            audio.volume = (currentSettings.voiceSettings?.volume || 75) / 100;
            preloadedAudioRef.current.set(index, audio);
            console.log(`✅ TTS Worker: Ready segment ${index}`);

            // Spróbuj odtworzyć (jeśli to pierwszy segment lub poprzednie się skończyły)
            playFromBuffer();
          } else {
            // Segment wyczerpał retry (500/429 → fetchTtsWithRetry zwrócił null).
            // Zapisz TOMBSTONE (null), by player pominął ten indeks zamiast czekać
            // na zawsze - inaczej cała reszta narracji nie zostanie odtworzona.
            console.warn(
              `🔇 TTS Worker: segment ${index} nieudany (null) - tombstone, player pomija`
            );
            preloadedAudioRef.current.set(index, null);
            playFromBuffer();
          }
        } catch (e) {
          console.error(`❌ TTS Worker: Failed segment ${index}`, e);
        }
      }
    } finally {
      isProcessingQueueRef.current = false;
      setIsGeneratingVoice(false);

      // Jeśli w międzyczasie coś doszło, uruchom ponownie
      if (pendingQueueRef.current.length > 0) {
        runQueueWorker();
      }
    }
  }, []); // Removed 'playFromBuffer' from deps to avoid circular dependency mechanism, relying on ref stability

  const playbackIndexRef = useRef(0);

  // Odtwarzaj audio z bufora bez opóźnień
  const playFromBuffer = useCallback(async () => {
    if (isPlayingQueueRef.current) return;
    isPlayingQueueRef.current = true;

    try {
      while (true) {
        const currentIndex = playbackIndexRef.current;
        const hasEntry = preloadedAudioRef.current.has(currentIndex);
        const audio = preloadedAudioRef.current.get(currentIndex);

        // TOMBSTONE: wpis istnieje, ale audio === null (segment nieudany). Pomiń ten
        // indeks i przejdź do następnego, zamiast blokować się na brakującym audio.
        if (hasEntry && audio == null) {
          preloadedAudioRef.current.delete(currentIndex);
          playbackIndexRef.current++;
          continue;
        }

        if (!audio) {
          // Brak WPISU dla tego indeksu (jeszcze niegotowy) - jeśli worker skończył
          // i nie ma tego w pending, to koniec. Inaczej worker wciąż nad tym pracuje.
          if (
            !isProcessingQueueRef.current &&
            pendingQueueRef.current.length === 0 &&
            !preloadedAudioRef.current.has(currentIndex)
          ) {
            break; // Koniec wszystkiego
          }

          // Czekamy na worker
          await new Promise((r) => setTimeout(r, 100));
          continue;
        }

        console.log(`▶️ TTS Player: Playing segment ${currentIndex}`);
        setCurrentAudio(audio);

        await new Promise<void>((resolve) => {
          audio.onended = () => resolve();
          audio.onerror = () => resolve();
          audio.play().catch(() => resolve());
        });

        // Posprzątaj i idź do następnego
        preloadedAudioRef.current.delete(currentIndex);
        playbackIndexRef.current++;
      }
    } finally {
      isPlayingQueueRef.current = false;
      setCurrentAudio(null);
      console.log('🏁 TTS Player: Sequence finished');
    }
  }, []);

  const addToQueue = useCallback(
    (fullRawText: string, messageId?: string, flush: boolean = false) => {
      if (!voiceEnabled || !isTTSEnabled || !fullRawText) return;

      // Jeśli to zupełnie nowa wiadomość (inny ID), zresetuj postęp i audio
      if (messageId && currentMessageIdRef.current !== messageId) {
        console.log(
          `🔊 TTS ID Change: ${currentMessageIdRef.current} -> ${messageId}`
        );
        stopCurrentAudio();
        currentMessageIdRef.current = messageId;
        rawProcessedPosRef.current = 0;
        processedSentenceCountRef.current = 0;
        processingIndexRef.current = 0;
        playbackIndexRef.current = 0;
        lastNpcNameRef.current = null;
        flushedRef.current = false;
        openRunRef.current = null; // demo 2026-06-22: nowy run scalania od zera dla nowej wiadomości
        earlySpokenCharsRef.current = 0; // E1: nowy kursor wczesnego startu dla nowej wiadomości
      }

      // IND-200: wiadomość już w pełni zakolejkowana (po flush). Spóźniony streaming
      // lub ponowny finalize dla tego samego id → return (bez re-kolejkowania całości).
      // PO ID-change check: nowy id resetuje przez stopCurrentAudio (clear Setu).
      if (messageId && completedMessageIdsRef.current.has(messageId)) {
        return;
      }

      // Jeśli ID jest to samo, a tekst się nie wydłużył - nic nie rób (chyba że flush)
      if (fullRawText.length <= rawProcessedPosRef.current && !flush) {
        return;
      }
      rawProcessedPosRef.current = fullRawText.length;

      if (flush) {
        console.log(
          `🔊 TTS FLUSH for ID: ${messageId}. Raw text length: ${fullRawText.length}`
        );
      }

      // IND-193 (A'): usuń bloki WIELOLINIOWE (tagi/JSON/fence/DZIENNIK) ZACHOWUJĄC `\n`,
      // utnij niezamknięty blok z ogona (streaming), DOPIERO POTEM tnij na zdania i czyść
      // per-zdanie. Bloki nie są już rozcinane na fragmenty, więc nie przeżywają w audio.
      // `\n` zachowany → split jak dotąd → multi-voice marker @Imię: działa.
      let stripped = stripMultilineArtifacts(fullRawText);
      stripped = stripped
        .replace(/```[^`]*$/g, '')
        .replace(/\[[^\]]*$/, '')
        .replace(/\{[^}]*$/, '');

      // IND-211: kolejkujemy w JEDNOSTKACH. Non-ULTRA (LOW/MID/HIGH) → cały AKAPIT
      // jednym wywołaniem TTS - model widzi pełny kontekst akapitu, więc prozodia jest
      // spójna (koniec "dwóch głosów na zmianę" z poprzedniego cięcia per-zdanie, gdzie
      // 1 tura = ~16 izolowanych generacji bez wspólnego kontekstu). ULTRA (słuchowisko)
      // zostaje per-zdanie, bo marker @Imię: rozdziela mówców - batch akapitu zlałby ich
      // w jeden głos. Preset jest stały w obrębie wiadomości, więc processedSentenceCountRef
      // liczy spójnie (zdania dla ULTRA / akapity dla reszty); reset przy ID-change.
      const settingsForQueue = loadAISettings();
      const isUltra = settingsForQueue.qualityPreset === 'ultra';

      const pendingItems: QueueItem[] = [];

      if (isUltra) {
        // --- ULTRA: per-zdanie + multi-voice marker @Imię: (bez zmian IND-211) ---
        const sentences: string[] = [];
        let lastEnd = 0;
        const sentenceRegex = /[^.!?\n]+[.!?\n]+/g;
        let match;
        while ((match = sentenceRegex.exec(stripped)) !== null) {
          sentences.push(match[0]);
          lastEnd = match.index + match[0].length;
        }

        // Nowe pełne zdania ponad już zakolejkowane (append-only → prefiks stabilny).
        const newSentences: string[] = [];
        for (
          let i = processedSentenceCountRef.current;
          i < sentences.length;
          i++
        ) {
          const cleanSentence = removeDidaskalia(sentences[i]).trim();
          if (cleanSentence && /[\p{L}\p{N}]/u.test(cleanSentence)) {
            newSentences.push(cleanSentence);
          }
        }
        processedSentenceCountRef.current = sentences.length;

        // flush: resztka po ostatnim pełnym zdaniu (bez terminatora kończącego).
        if (flush && !flushedRef.current) {
          flushedRef.current = true;
          if (lastEnd < stripped.length) {
            const cleanRemainder = removeDidaskalia(
              stripped.slice(lastEnd)
            ).trim();
            if (cleanRemainder && /[\p{L}\p{N}]/u.test(cleanRemainder)) {
              newSentences.push(cleanRemainder);
            }
          }
        }

        const npcVoiceMap = loadNpcVoiceMap();

        // demo 2026-06-22: scalamy kolejne zdania o tym SAMYM voiceId w jeden segment
        // TTS = jeden spójny głos (koniec resetu prozodii per zdanie). Run trzymany w
        // openRunRef MIĘDZY wywołaniami (streaming), zamykany przy zmianie mówcy / flush.
        const closeRun = () => {
          const run = openRunRef.current;
          if (run && run.texts.length > 0) {
            pendingItems.push({
              text: run.texts.join(' '),
              voiceId: run.voiceId,
            });
          }
          openRunRef.current = null;
        };

        for (const sentence of newSentences) {
          // Marker `@Imię Nazwisko: dialog` na początku zdania.
          // trimStart() bo sentence regex może zwrócić zdanie z wiodącą spacją
          // (np. ". @Imię:" → drugie zdanie zaczyna się od spacji).
          const markerMatch = sentence
            .trimStart()
            .match(/^@([A-ZŁŻŚĆŃÓĄĘ][\wŁżśćńóąęŻŚĆŃÓĄĘłż ]+?):\s*([\s\S]*)$/);
          let voiceId: string | undefined;
          let textForQueue = sentence;

          if (markerMatch) {
            const npcName = markerMatch[1].trim();
            lastNpcNameRef.current = npcName;
            voiceId = npcVoiceMap.get(npcName.toLowerCase());
            // Usuwamy marker z tekstu - TTS nie powinien czytać "@Armitage:"
            textForQueue = markerMatch[2].trim() || sentence;
          } else if (lastNpcNameRef.current) {
            // Kontynuacja poprzedniego mówcy NPC (np. drugie zdanie monologu).
            voiceId = npcVoiceMap.get(lastNpcNameRef.current.toLowerCase());
          }

          // Zmiana mówcy zamyka bieżący run; ten sam voiceId (w tym narrator=undefined)
          // dokleja się do otwartego runu = jedno wywołanie TTS.
          if (openRunRef.current && openRunRef.current.voiceId !== voiceId) {
            closeRun();
          }
          if (!openRunRef.current) {
            openRunRef.current = { voiceId, texts: [] };
          }
          openRunRef.current.texts.push(textForQueue);
        }

        // flush domyka ostatni (otwarty) run - resztę narracji oddajemy jako jeden segment.
        if (flush) {
          closeRun();
        }
      } else {
        // --- Non-ULTRA: batch po AKAPICIE (IND-211, spójna prozodia narratora) ---
        // Akapit jest "kompletny" gdy NIE jest ostatni (po nim w streamie pojawił się
        // już `\n\n`) albo przy flush (koniec wiadomości). Ostatni akapit czeka na
        // kolejny `\n\n` lub flush, więc trafia do TTS w całości = jeden spójny głos.
        // Brak `\n\n` w narracji → cała wypowiedź to jeden akapit (maksymalna spójność,
        // odtwarzana po flush). processedSentenceCountRef = liczba zakolejkowanych akapitów.
        const paragraphs = stripped.split(/\n{2,}/);

        // E1 (start lektora): zanim akapity się domkną, oddaj wcześnie KOMPLETNE zdania
        // pierwszego (jeszcze rosnącego) akapitu - audio rusza w trakcie streamu zamiast
        // dopiero po flush. Tylko gdy: nie ma jeszcze żadnego skompletowanego akapitu w
        // kolejce (processedSentenceCountRef===0), nie flush, i akapit 0 jest wciąż
        // ostatnim (paragraphs.length===1). Wypychamy NOWE pełne zdania ponad już
        // wypowiedziane (earlySpokenCharsRef), gdy ich łączna długość >= progu.
        // IND-196 ujednolicił model+głos narratora (zero "dwóch głosów"), więc cięcie na
        // zdania w pierwszym akapicie kosztuje co najwyżej drobną gładkość na złączeniu.
        if (
          !flush &&
          paragraphs.length === 1 &&
          processedSentenceCountRef.current === 0
        ) {
          const firstPara = paragraphs[0];
          // Koniec ostatniego pełnego zdania pierwszego akapitu (terminator . ! ?).
          const sentenceEndRegex = /[.!?](?=\s|$)/g;
          let lastSentenceEnd = 0;
          let m;
          while ((m = sentenceEndRegex.exec(firstPara)) !== null) {
            lastSentenceEnd = m.index + 1;
          }
          if (lastSentenceEnd > earlySpokenCharsRef.current) {
            const newSpan = firstPara.slice(
              earlySpokenCharsRef.current,
              lastSentenceEnd
            );
            const cleanSpan = removeDidaskalia(newSpan).trim();
            // Pierwszy segment musi mieć sensowną długość (próg), kolejne wczesne
            // segmenty domykają zdania bez limitu (płynna kontynuacja audio).
            const isFirstEarly = earlySpokenCharsRef.current === 0;
            const longEnough =
              !isFirstEarly ||
              cleanSpan.length >= EARLY_FIRST_SEGMENT_MIN_CHARS;
            if (cleanSpan && /[\p{L}\p{N}]/u.test(cleanSpan) && longEnough) {
              pendingItems.push({ text: cleanSpan });
              earlySpokenCharsRef.current = lastSentenceEnd;
            }
          }
        }

        const completeCount = flush
          ? paragraphs.length
          : Math.max(0, paragraphs.length - 1);
        for (
          let i = processedSentenceCountRef.current;
          i < completeCount;
          i++
        ) {
          // E1: akapit 0 mógł mieć już część zdań wypowiedzianych wcześnie - dotnij ją,
          // by nie czytać 2× (slice o earlySpokenCharsRef). Pozostałe akapity bez zmian.
          const rawParagraph =
            i === 0 && earlySpokenCharsRef.current > 0
              ? paragraphs[0].slice(earlySpokenCharsRef.current)
              : paragraphs[i];
          const cleanParagraph = removeDidaskalia(rawParagraph).trim();
          if (cleanParagraph && /[\p{L}\p{N}]/u.test(cleanParagraph)) {
            pendingItems.push({ text: cleanParagraph });
          }
        }
        processedSentenceCountRef.current = completeCount;
        if (flush) flushedRef.current = true;
      }

      if (pendingItems.length > 0) {
        pendingQueueRef.current.push(...pendingItems);

        // Uruchom worker jeśli nie działa
        runQueueWorker();

        // Uruchom odtwarzacz jeśli nie działa (i mamy coś w buforze, worker to obsłuży)
        if (preloadedAudioRef.current.size > 0 && !isPlayingQueueRef.current) {
          playFromBuffer();
        }
      }

      // IND-200: flush zamyka wiadomość → oznacz ukończoną (idempotencja per-message).
      // Poza if(pendingItems) - zamykamy nawet gdy nowych jednostek już nie było.
      if (flush && messageId) {
        completedMessageIdsRef.current.add(messageId);
      }
    },
    [
      voiceEnabled,
      isTTSEnabled,
      stopCurrentAudio,
      runQueueWorker,
      playFromBuffer,
    ]
  );

  const generateVoiceForMessage = useCallback(
    async (message: Message) => {
      if (!voiceEnabled || !isTTSEnabled || message.role !== 'assistant')
        return;
      addToQueue(message.content, message.id, true);
    },
    [voiceEnabled, isTTSEnabled, addToQueue]
  );

  // M6 sesja 146: generateMultiVoice DROPPED per D3 (drop /api/tts/multi-voice).
  // NPC dialogi idą sekwencyjnie przez generateVoiceForMessage (parser cleanResponseText
  // złoży scenę w jednolity tekst). NPC voice auto-mapping per role - follow-up ticket.

  return {
    voiceEnabled,
    isGeneratingVoice,
    currentAudio,
    isTTSEnabled,
    isAudioPaused,
    queueStatus,
    isNarratorOnly: false,
    setVoiceEnabled,
    setIsTTSEnabled,
    setIsNarratorOnly: () => {},
    generateVoiceForMessage,
    stopCurrentAudio,
    toggleAudioPause,
    addToQueue,
  };
}
