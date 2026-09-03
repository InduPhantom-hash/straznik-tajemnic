import { NextRequest, NextResponse } from 'next/server';
import { loadAISettings, getGameMasterPrompt } from '@/lib/ai-settings';
import { DEFAULT_GEMINI_MODEL } from '@/lib/ai-providers/constants';
import { getContextLimit } from '@/lib/model-registry';
import { getOptimizedMessages } from '@/lib/context-optimizer';
import { Character, Message, type GameTime } from '@/lib/types';
import { extractCommand, handleCommand } from '@/lib/command-handler';
import { detectGameContext } from '@/lib/prompt-section-parser';
import { GeminiChatProvider } from '@/lib/ai-providers';
import { getContextAwareGMProtocol } from '@/lib/prompts/gm-protocol';
import {
  isSessionResume,
  buildSessionRecapInstruction,
} from '@/lib/session-recap';
import { getEmbeddingDimensions } from '@/lib/embedding-service';
import {
  buildAdditionalContext,
  buildPlayerSkillsSection,
  buildPlayerEquipmentSection,
  buildPlayerFinancesSection,
  NpcContextEntry,
  HotSeatPlayerEntry,
} from './build-context';
import { buildHandoutsContext } from './build-handouts-context';
import type { AdventureHandout } from '@/lib/adventures-data';
import { buildGeminiOptions } from './build-gemini-options';
import { buildPdfStrategy, PdfMemoryAttachments } from './build-pdf-strategy';
import { buildTimeContext } from './build-time-context';
import { createSseStream } from './create-sse-stream';
import { resolveGeminiCache } from './resolve-gemini-cache';
import { runRAGAndSummary } from './run-rag-summary';
import { resolveSettings } from './resolve-settings';
import { buildPlayerWeaponContext } from '@/lib/combat/weapon-context';
import { resolveUserId, scopeSessionId } from '@/lib/auth-user';
import * as Sentry from '@sentry/nextjs';
import { isModelNotFoundError } from './model-fallback';
import { fetchImmersionContext } from './build-immersion-context';
import {
  isResolvedEraContext,
  resolveGameEraContext,
  type ResolvedEraContext,
} from '@/lib/era';
import { assertExactEraContext } from '@/lib/world-setup';

/**
 * Rozwiązuje klucz Gemini dla requestu.
 * WERSJA LOKALNA (zew-app-local): priorytet ma nagłówek X-Gemini-Api-Key
 * (localStorage, jeśli gracz wpisał własny), a fallbackiem jest serwerowy
 * GEMINI_API_KEY z .env.local. Dzięki temu na prywatnym localhoście narracja
 * działa bez ręcznego wpisywania klucza w modal (i znika błąd 401 po zamknięciu
 * modala). Klucz nigdy nie pochodzi z body ani z Clerk privateMetadata.
 */
function resolveGeminiApiKey(request: NextRequest): string | null {
  const key = request.headers.get('X-Gemini-Api-Key')?.trim();
  return key || process.env.GEMINI_API_KEY?.trim() || null;
}

export interface ChatPipelineInput {
  request: NextRequest;
  body: Record<string, unknown>;
  traceId: string;
  timer: { elapsed: () => number };
}

/**
 * Orchestrator AI GM chat pipeline (IND-184 extract z route.ts POST handler).
 *
 * 1-shot pipeline: command → settings → provider → time/cache/RAG → context → PDF → stream → SSE.
 * Zwraca Response (early returns dla command/disabled/no-prompt/no-key, finalny SSE stream dla
 * happy path). Wszystkie błędy bubble up do route.ts catch (telemetry + 500 NextResponse).
 *
 * Plik 264 lin > 200 (CLAUDE.md guardrail) - świadoma akceptacja: brak naturalnego split
 * pointu dalej (Strategia B `micro split` rejected w research IND-184). Orchestrator 1-shot,
 * 8 helperów już wyciągniętych w sesji 123+126. Dalsze rozbijanie generuje boilerplate bez wartości.
 */
export async function runChatPipeline({
  request,
  body,
  traceId,
  timer,
}: ChatPipelineInput): Promise<Response> {
  const {
    message,
    character,
    characters = [],
    messages,
    pdfMemory,
    npcs,
    currentLocation,
    gameContextPrompt,
    skipContext,
    adventureContext,
    eraContext: requestedEraContext,
    gameTime: requestedGameTime,
    isGameStart,
    aiSettings: clientAISettings,
    hotSeatConfig,
    directorEvent,
    locale: requestedLocale,
  } = body as {
    message: string;
    character?: Character | null;
    characters?: Character[];
    messages?: Message[];
    pdfMemory?: PdfMemoryAttachments | null;
    npcs?: NpcContextEntry[];
    currentLocation?: string;
    gameContextPrompt?: string;
    skipContext?: boolean;
    adventureContext?: {
      era?: string;
      eraLabel?: string;
      yearRange?: string;
      country?: string;
      sourceBookId?: string;
      handouts?: AdventureHandout[];
      tone?: 'purist' | 'pulp' | 'noir' | 'neutral';
    } | null;
    eraContext?: ResolvedEraContext;
    gameTime?: GameTime;
    isGameStart?: boolean;
    aiSettings?: { sessionId?: string } & Record<string, unknown>;
    hotSeatConfig?: { enabled?: boolean; players?: HotSeatPlayerEntry[] };
    directorEvent?: { title: string; description: string };
    locale?: 'pl' | 'en';
  };
  const locale = requestedLocale === 'en' ? 'en' : 'pl';

  // Komendy lokalne
  const command = extractCommand(message);
  if (command) {
    const commandResponse = handleCommand(
      command,
      character as Character | null
    );
    if (commandResponse !== null) {
      return NextResponse.json({
        response: commandResponse,
        isCommand: true,
      });
    }
  }

  // Ustawienia i Prompty - IND-183 micro 1/5
  const aiSettings = resolveSettings(loadAISettings(), clientAISettings);

  if (!aiSettings.gameMasterNarration.enabled) {
    return NextResponse.json({
      response:
        locale === 'en' ? 'AI narration is disabled.' : 'Narracja AI jest wyłączona.',
    });
  }

  const contextMemory =
    aiSettings.gameMasterNarration.behavior.contextMemory || 1000;
  const recentMessages = getOptimizedMessages(messages, contextMemory);
  const gameContext = detectGameContext(message, recentMessages, character);
  // IND-194: pełny path z przekazanym aiSettings (zmergowany z clientAISettings, lin 120).
  // Wcześniej getOptimizedGameMasterPrompt/getGameMasterPrompt re-czytały loadAISettings()
  // serwerowo → pusta localStorage → mainPrompt (.md gracza) gubiony. Teraz mainPrompt dociera.
  const systemPrompt = getGameMasterPrompt(aiSettings, locale);

  if (process.env.DEBUG_GM_PROMPT === '1') {
    console.log(
      '[GM_PROMPT] systemPromptLen=',
      systemPrompt.length,
      'mainPromptLen=',
      aiSettings.gameMasterNarration.prompts.mainPrompt?.length ?? 0
    );
  }

  if (!systemPrompt) {
    return NextResponse.json(
      {
        error:
          locale === 'en'
            ? 'The AI Game Master system prompt is missing'
            : 'Brak system prompt dla AI Game Master',
        details:
          locale === 'en'
            ? 'Configure gameMasterNarration.prompts in Settings'
            : 'gameMasterNarration.prompts wymaga konfiguracji w Settings',
      },
      { status: 500 }
    );
  }

  // === GEMINI PROVIDER ===
  const apiKey = resolveGeminiApiKey(request);

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          locale === 'en'
            ? 'Add your Google AI Studio key in Settings'
            : 'Wklej swój klucz Google AI Studio w ustawieniach',
        code: 'BYOK_KEY_MISSING',
      },
      { status: 401 }
    );
  }

  const modelId = aiSettings.geminiSettings.model || DEFAULT_GEMINI_MODEL;
  const provider = new GeminiChatProvider(apiKey, modelId);

  // route.ts importuje `body.gameTime` do singletona przed wejściem w pipeline.
  // Kolejne tury muszą rozwiązywać epokę z aktualnego czasu sceny, nie z pierwszego
  // roku szerokiego zakresu scenariusza.
  const { timeManager } = await import('@/lib/time-manager');
  const currentGameTime = timeManager.getTime();

  let eraContext: ResolvedEraContext;
  try {
    eraContext = isResolvedEraContext(requestedEraContext)
      ? requestedEraContext
      : resolveGameEraContext({
          gameTime: requestedGameTime ? currentGameTime : null,
          adventure: adventureContext,
        });
    assertExactEraContext(eraContext);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          locale === 'en'
            ? 'The exact year and country are required before narration can start.'
            : 'Przed rozpoczęciem narracji wymagany jest dokładny rok i kraj.',
        code: 'ERA_CONTEXT_REQUIRED',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 400 }
    );
  }

  // === TIME & ERA CONTEXT === - IND-183 micro 2/5
  const { timePromptSection, eraRules } = buildTimeContext({
    eraContext,
  });

  // Wyciagnij date gry z time-managera (YYYY-MM-DD) dla immersji.
  const gameDate = `${currentGameTime.year}-${String(currentGameTime.month + 1).padStart(2, '0')}-${String(currentGameTime.day).padStart(2, '0')}`;

  // === OPT-21: CONTEXT-AWARE GM PROTOCOL ===
  const messageCount = messages?.length || 0;
  const gmProtocol = getContextAwareGMProtocol(messageCount);

  // === R3 (latencja): trzy niezalezne galezi sieciowe ROWNOLEGLE ===
  // Cache promptu (OPT-26) NIE zalezy od sessionId; lancuch userId->sessionId->RAG
  // (OPT-09) NIE zalezy od cache. Immersja (Etap 3) NIE zalezy od zadnego z powyzszych.
  // Promise.all -> koszt = najwolniejsza z trzech zamiast sumy.
  const [resolvedCachedContent, ragResult, immersionSection] = await Promise.all([
    resolveGeminiCache({
      enableCache: aiSettings.geminiSettings.enableCache,
      cacheTTL: aiSettings.geminiSettings.cacheTTL,
      apiKey,
      modelId,
      systemPrompt,
      eraRules,
      gmProtocol,
    }),
    (async () => {
      const ragUserId = await resolveUserId('');
      const sessionId = scopeSessionId(ragUserId, clientAISettings?.sessionId);
      const { ragSection, summarySection, ragMeta } = await runRAGAndSummary({
        message,
        messages,
        sessionId,
        apiKey,
        geminiKey: apiKey,
        // Zaweża RAG 'adventures' do ksiazki aktywnej przygody (DriveThruRPG).
        adventureSource: adventureContext?.sourceBookId,
      });
      return { ragUserId, sessionId, ragSection, summarySection, ragMeta };
    })(),
    // Etap 3: dane immersyjne (astronomia, gazety, ceny epoki) - rownolegle z cache i RAG.
    fetchImmersionContext({
      gameDate,
      eraContext,
    }),
  ]);
  const { ragUserId, sessionId, ragSection, summarySection, ragMeta } =
    ragResult;

  // === BUDUJ KONTEKST (additionalContext) - IND-71 micro 1/3 ===
  // C1: recap przy wznowieniu zapisanej gry (isGameStart + istnieje historia rozmowy).
  const sessionRecapSection = isSessionResume(isGameStart, messageCount)
    ? buildSessionRecapInstruction()
    : null;

  const activeTone = aiSettings.sessionZero?.tone || adventureContext?.tone || 'purist';

  const additionalContext = buildAdditionalContext({
    timePromptSection,
    gmProtocol,
    gameContext,
    resolvedCachedContent,
    sessionId,
    ragSection,
    summarySection,
    // Realne handouty przygody (DriveThruRPG) - MG dostaje markdown obrazów do pokazania.
    handoutsSection: buildHandoutsContext(adventureContext?.handouts),
    sessionRecapSection,
    skipContext,
    gameContextPrompt,
    npcs,
    currentLocation,
    hotSeatConfig,
    // IND-223: oznacz postac gracza jako sterowana przez czlowieka
    playerCharacterName: character?.name,
    tone: activeTone as 'purist' | 'pulp' | 'noir' | 'neutral',
    // Uzbrojenie postaci -> AI prowadzi walke narracyjnie znajac bron + umiejetnosc + obrazenia
    playerWeaponsSection: buildPlayerWeaponContext(character ?? null),
    // Lista umiejetnosci postaci -> AI wzywa testy nazwami z karty (eliminuje Tacke 0%)
    playerSkillsSection: buildPlayerSkillsSection(character ?? null),
    // Ekwipunek uzytkowy postaci -> AI wie co badacz ma przy sobie (narzedzia, medykamenty, dokumenty)
    playerEquipmentSection: buildPlayerEquipmentSection(character ?? null),
    // Status majatkowy postaci -> AI zna poziom wydatkow i gotowke wg CoC 7e RAW
    playerFinancesSection: buildPlayerFinancesSection(character ?? null),
    // Etap 3: dane immersyjne (astronomia, gazety epoki, przelicznik cen)
    immersionSection,
    directorEventSection:
      directorEvent &&
      (directorEvent.title?.trim() || directorEvent.description?.trim())
        ? `\n## INSTRUKCJA REŻYSERSKA\n[MG wrzucił to losowe wydarzenie. Wpleć je organicznie w swoją narrację, nie przerywając głównego wątku]\n${directorEvent.title.replace(/\[/g, '(').replace(/\]/g, ')')}: ${directorEvent.description.replace(/\[/g, '(').replace(/\]/g, ')')}\n`
        : undefined,
    isGameStart,
    characters,
    era: String(eraContext.effectiveYear),
    locale,
  });

  if (message.includes('[KONIEC_SESJI:FINAL]') || message.includes('[KONIEC_SESJI_FINAL]')) {
    additionalContext.push(
      '[INSTRUKCJA SPECJALNA - KONIEC SESJI (KROK 2 - FINAŁ)]: To jest ostatnia tura gracza w tej sesji. Uwzględnij jego finałową akcję, napisz klimatyczny epilog / monolog podsumowujący sesję w stylu Lovecrafta, zakończony niepokojącym cliffhangerem lub refleksją badacza. Na samym końcu wypowiedzi, w osobnej linii, wypisz DOKŁADNIE: [KONIEC_SESJI:POTWIERDZENIE]. NIE dodawaj pytania "Co robisz?".'
    );
  } else if (message.includes('[KONIEC_SESJI]')) {
    additionalContext.push(
      '[INSTRUKCJA SPECJALNA - KONIEC SESJI (KROK 1 - DOMKNIĘCIE SCENY)]: Gracz zgłosił chęć zakończenia sesji. Zmierzaj do domknięcia bieżącej sceny i postaw gracza przed ostatnią, finałową decyzją lub gestem w tej sesji. Zakończ wypowiedź otwartym pytaniem [Co robisz?]. ABSOLUTNIE NIE wypisuj tagu [KONIEC_SESJI:POTWIERDZENIE].'
    );
  }

  additionalContext.push(
    locale === 'en'
      ? `\n## OUTPUT LANGUAGE: ENGLISH\nWrite every player-visible sentence, question, journal title, journal body, category and tag content in English only. Do not use Polish. Use only these canonical English structural tags: [JOURNAL:type:title]body[/JOURNAL] and [LOCATION: name: atmosphere]. Use English journal types such as clue, discovery, note, location, combat and item. End an opening scene with [What do you do?].`
      : `\n## JĘZYK WYJŚCIA: POLSKI\nPisz wszystkie zdania widoczne dla gracza, pytania, tytuły i treści dziennika wyłącznie po polsku. Używaj tagów [DZIENNIK:typ:tytuł]treść[/DZIENNIK] oraz [LOKACJA: nazwa: atmosfera]. Kończ scenę otwierającą znacznikiem [Co robisz?].`
  );

  // === PDF STRATEGY (OPT-01) === - IND-183 micro 4/5
  const { fileAttachments } = buildPdfStrategy({
    pdfMemory,
    message,
    messages,
    isGameStart,
  });

  // === OPT-27: PRE-FLIGHT TOKEN ESTIMATION ===
  const estimateTokens = (text: string) => Math.ceil(text.length / 4);
  const totalEstTokens =
    additionalContext.reduce((sum, ctx) => sum + estimateTokens(ctx), 0) +
    estimateTokens(systemPrompt) +
    fileAttachments.length * 10000;

  // IND-275 T1: limity okna kontekstowego z model-registry (getContextLimit).
  const contextLimit = getContextLimit(modelId);
  const safeLimit = Math.floor(contextLimit * 0.8);

  if (totalEstTokens > safeLimit) {
    console.warn(
      `⚠️ Pre-flight: ~${totalEstTokens} tokens exceeds 80% of ${contextLimit}. Trimming context.`
    );
  }

  // === STREAMING via Provider === - IND-183 micro 5/5
  const chatGeminiOptions = buildGeminiOptions({
    geminiSettings: aiSettings.geminiSettings,
    additionalContext,
    fileAttachments,
    resolvedCachedContent,
  });

  const streamArgs = {
    systemPrompt,
    messages: recentMessages.map((msg: { role: string; content: string }) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    userMessage: message,
    temperature: aiSettings.geminiSettings.temperature,
    topP: aiSettings.geminiSettings.topP,
    maxOutputTokens: aiSettings.geminiSettings.maxOutputTokens,
    geminiOptions: chatGeminiOptions,
  };

  // IND-222: graceful fallback. Gdy skonfigurowany model zwróci 404 NOT_FOUND
  // (literówka w nazwie presetu / Google wycofał wariant), logujemy + ponawiamy
  // na DEFAULT_GEMINI_MODEL zamiast wywalać turę na 500. streamChat woła
  // generateContentStream EAGER (gemini-provider:263), więc 404 rzuca się tu na
  // await - łapalne. Dla złego modelu cache też się wywala 404 → resolveGeminiCache
  // zwraca null, więc chatGeminiOptions nie ma cachedContent przypisanego do
  // martwego modelu → streamArgs bezpieczne do reuse na modelu fallback.
  let effectiveModelId = modelId;
  let streamResult: Awaited<ReturnType<typeof provider.streamChat>>;
  try {
    streamResult = await provider.streamChat(streamArgs);
  } catch (err) {
    if (isModelNotFoundError(err) && modelId !== DEFAULT_GEMINI_MODEL) {
      console.warn(
        `⚠️ IND-222: model "${modelId}" zwrócił 404 NOT_FOUND → fallback na "${DEFAULT_GEMINI_MODEL}"`
      );
      Sentry.captureMessage(
        `Gemini model 404 → fallback: ${modelId} → ${DEFAULT_GEMINI_MODEL}`,
        { level: 'warning', tags: { feature: 'chat', issue: 'IND-222' } }
      );
      effectiveModelId = DEFAULT_GEMINI_MODEL;
      const fallbackProvider = new GeminiChatProvider(
        apiKey,
        DEFAULT_GEMINI_MODEL
      );
      streamResult = await fallbackProvider.streamChat(streamArgs);
    } else {
      throw err;
    }
  }
  const { stream: providerStream, getUsage, getFinishReason } = streamResult;

  // === SSE STREAM + POST-STREAM SIDE EFFECTS - IND-71 micro 3/3 ===
  const sseStream = createSseStream({
    providerStream,
    getUsage,
    getFinishReason,
    sessionId,
    message,
    character: character ?? undefined,
    modelId: effectiveModelId,
    traceId,
    timer,
    ragMeta,
    embeddingDim: getEmbeddingDimensions(),
    ragVersion: process.env.RAG_VERSION === 'v2' ? 'v2' : 'v1',
    // IND-168 Faza 6: reuse rozwiązanego ragUserId (Clerk > '' dev) dla licznika
    // zużycia per-konto; user-usage normalizuje puste -> 'local'.
    userId: ragUserId,
  });

  return new Response(sseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
