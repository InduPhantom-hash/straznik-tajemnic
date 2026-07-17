/**
 * GeminiChatProvider - wrapper nad Google Generative AI SDK
 * Przenosi logikę z chat/route.ts do reużywalnej klasy
 *
 * IND-12 PR-B Faza 2: pełne mapowanie GeminiExtraOptions na parametry SDK:
 * - generationConfig: topK, candidateCount, stopSequences, seed, penalties, mimeType, schema
 * - safetySettings: array obiektów {category, threshold} z enums SDK
 * - tools: JSON parser + walidacja kształtu + wrap w functionDeclarations
 * IND-13: aktywacja Gemini Context Caching przez resolvedCachedContent + cachedContent w config
 * IND-19: migracja SDK @google/generative-ai (EOL) → @google/genai
 */

import {
  GoogleGenAI,
  HarmCategory,
  HarmBlockThreshold,
  ThinkingLevel,
  type Part,
  type SafetySetting,
  type Content,
  type CachedContent,
  type GenerateContentResponse,
} from '@google/genai';
import type {
  IChatProvider,
  ChatCompletionRequest,
  StreamingChatResult,
  ChatResult,
  CompletionUsage,
} from './types';
import { DEFAULT_GEMINI_MODEL } from './constants';
import * as Sentry from '@sentry/nextjs';

/** Mapowanie string-owych progów bezpieczeństwa (z UI) na enum SDK Gemini */
const HARM_THRESHOLD_MAP: Record<string, HarmBlockThreshold> = {
  BLOCK_NONE: HarmBlockThreshold.BLOCK_NONE,
  BLOCK_ONLY_HIGH: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  BLOCK_MEDIUM_AND_ABOVE: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  BLOCK_LOW_AND_ABOVE: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
};

/**
 * Budżet myślenia dla gemini-2.5-* = 0 (myślenie WYŁĄCZONE). Dwa powody:
 *
 * 1. IND-199: domyślne AUTOMATIC thinking (budget -1) przy dużym prompcie zżera
 *    maxOutputTokens → finishReason MAX_TOKENS z pustym text (cichy HTTP 200,
 *    pusty dymek MG). Mniej myślenia = niższe ryzyko.
 * 2. Duplikacja narracji (pre-flight 2026-06-24): gemini-2.5-flash z budżetem
 *    myślenia > 0 emituje CAŁĄ treść myślenia jako PIERWSZY chunk strumienia z
 *    `part.thought === false` (NIE flagowany jako thought, rozmiar ~= budżet).
 *    Getter SDK `.text` pomija tylko `part.thought === true`, więc to
 *    "myślenie-jako-tekst" trafia do fullText, a potem właściwa odpowiedź dochodzi
 *    jako delty → CAŁA narracja (MYŚLI_MG + proza + [Co robisz?]) renderowana
 *    DWA RAZY. `includeThoughts: true` NIE przeflagowuje (zweryfikowane: chunk#0
 *    dalej thought:false). Budget 0 → brak chunku myślenia → brak duplikacji.
 *
 * Dotyczy TYLKO presetu HIGH (jedyny chat na gemini-2.5; LOW/MID/ULTRA =
 * gemini-3.x → thinkingLevel, osobny tor - do osobnego sprawdzenia czy też cieknie).
 */
const THINKING_BUDGET_GEMINI_25 = 0;

/** IND-199: budżet myślenia dla retry po pustej odpowiedzi - 0 wyłącza myślenie (flash). */
const THINKING_BUDGET_RETRY = 0;

/**
 * IND-199: in-character fallback gdy model zwraca pustkę nawet po retry. Zamiast
 * cichego pustego dymka - jawny komunikat, by gracz wiedział że ma powtórzyć akcję.
 */
const EMPTY_RESPONSE_FALLBACK =
  'Mgła spowija na chwilę umysł Mistrza Gry, a wątek narracji się rwie. (Wyślij swoją akcję ponownie.)';

/**
 * IND-203: mapowanie poziomu myślenia z UI ('low'/'medium'/'high') na enum SDK
 * (ThinkingLevel.LOW/MEDIUM/HIGH). 'auto' celowo pominięte - oznacza "model decyduje",
 * więc thinkingConfig.thinkingLevel nie jest wtedy ustawiany.
 */
const THINKING_LEVEL_MAP: Record<'low' | 'medium' | 'high', ThinkingLevel> = {
  low: ThinkingLevel.LOW,
  medium: ThinkingLevel.MEDIUM,
  high: ThinkingLevel.HIGH,
};

export class GeminiChatProvider implements IChatProvider {
  readonly type = 'gemini' as const;
  private ai: GoogleGenAI;
  private modelId: string;

  constructor(apiKey: string, modelId?: string) {
    this.ai = new GoogleGenAI({ apiKey });
    this.modelId = modelId || DEFAULT_GEMINI_MODEL;
  }

  async streamChat(
    request: ChatCompletionRequest
  ): Promise<StreamingChatResult> {
    // IND-12 PR-B Faza 2: czytaj z geminiOptions z fallbackiem na deprecated top-level alias
    const opts = request.geminiOptions;
    const thinkingLevel = opts?.thinkingLevel ?? request.thinkingLevel;
    const fileAttachments = opts?.fileAttachments ?? request.fileAttachments;
    const additionalContext =
      opts?.additionalContext ?? request.additionalContext;

    // === config - wszystkie pola generacji bezpośrednio (IND-19: nie ma sub-obiektu generationConfig) ===
    const config: Record<string, unknown> = {
      temperature: request.temperature,
      topP: request.topP,
      maxOutputTokens: request.maxOutputTokens,
    };
    if (opts?.topK !== undefined) config.topK = opts.topK;
    if (opts?.candidateCount !== undefined)
      config.candidateCount = opts.candidateCount;
    if (opts?.stopSequences?.length) config.stopSequences = opts.stopSequences;
    if (opts?.seed !== undefined) config.seed = opts.seed;
    if (opts?.presencePenalty !== undefined)
      config.presencePenalty = opts.presencePenalty;
    if (opts?.frequencyPenalty !== undefined)
      config.frequencyPenalty = opts.frequencyPenalty;
    if (opts?.responseMimeType !== undefined)
      config.responseMimeType = opts.responseMimeType;
    if (opts?.responseSchema !== undefined)
      config.responseSchema = opts.responseSchema;

    // Thinking level dla modeli 3.x - IND-203: SDK oczekuje go WEWNĄTRZ
    // config.thinkingConfig (nie top-level config.thinkingLevel, które było cicho
    // ignorowane → ULTRA myślał na domyślnym poziomie zamiast ustawionego).
    if (
      this.modelId.includes('gemini-3') &&
      thinkingLevel &&
      thinkingLevel !== 'auto'
    ) {
      config.thinkingConfig = {
        thinkingLevel: THINKING_LEVEL_MAP[thinkingLevel],
      };
    }

    // gemini-2.5-* (flash/pro): myślenie WYŁĄCZONE (budget 0). Powody w JSDoc
    // THINKING_BUDGET_GEMINI_25: (1) IND-199 pusta odpowiedź, (2) wyciek myślenia
    // jako pierwszy chunk (thought:false) → duplikacja narracji (pre-flight 06-24).
    if (this.modelId.includes('gemini-2.5')) {
      config.thinkingConfig = { thinkingBudget: THINKING_BUDGET_GEMINI_25 };
    }

    // === safetySettings - mapuj string UI → enum SDK ===
    if (opts?.safetySettings) {
      const s = opts.safetySettings;
      const safetySettings: SafetySetting[] = [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold:
            HARM_THRESHOLD_MAP[s.harassment] ??
            HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold:
            HARM_THRESHOLD_MAP[s.hateSpeech] ??
            HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold:
            HARM_THRESHOLD_MAP[s.sexuallyExplicit] ??
            HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold:
            HARM_THRESHOLD_MAP[s.dangerousContent] ??
            HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ];
      config.safetySettings = safetySettings;
    }

    // === tools - parser JSON + walidacja kształtu (array of {name, ...}) ===
    if (opts?.tools) {
      try {
        const rawTools = opts.tools;
        const toolArray = Array.isArray(rawTools) ? rawTools : [];
        const declarations = toolArray.filter(
          (item): item is Record<string, unknown> =>
            typeof item === 'object' && item !== null && 'name' in item
        );
        if (declarations.length > 0) {
          config.tools = [{ functionDeclarations: declarations }];
        } else {
          console.warn(
            '⚠️ Gemini tools: brak poprawnych deklaracji funkcji (oczekiwano [{name, parameters}]), ignoruję.'
          );
        }
      } catch (e) {
        console.warn('⚠️ Gemini tools error, ignoruję:', e);
      }
    }

    // === OPT-26: GEMINI CONTEXT CACHING (IND-13 / IND-19) ===
    // resolvedCachedContent jest obiektem CachedContent z getOrCreateGeminiCache() w route.ts.
    // Gdy ustawiony: cachedContent w config = cache.name (systemPrompt jest już w cache).
    const resolvedCache: CachedContent | undefined =
      opts?.resolvedCachedContent;
    const hasCachedContent = !!resolvedCache;

    if (hasCachedContent) {
      config.cachedContent = resolvedCache!.name;
      console.log(
        `✅ OPT-26: Provider używa cached content: ${resolvedCache!.name}`
      );
    } else {
      // systemInstruction - tylko gdy cache NIE aktywny
      config.systemInstruction = request.systemPrompt;
    }

    // === Buduj content parts (bez systemPrompt - idzie do config.systemInstruction) ===
    const userParts: Part[] = [];

    // Dodatkowe sekcje kontekstu (czas, RAG memory, era) - tablica stringów
    if (additionalContext) {
      for (const ctx of additionalContext) {
        userParts.push({ text: ctx });
      }
    }

    // Pliki PDF (Gemini File API URIs)
    if (fileAttachments) {
      for (const file of fileAttachments) {
        userParts.push({
          fileData: { fileUri: file.fileUri, mimeType: file.mimeType },
        });
      }
    }

    // Historia + aktualna wiadomość
    const historyText = request.messages
      .map((msg) => `${msg.role === 'user' ? 'G' : 'MG'}: ${msg.content}`)
      .join('\n');
    const secureMessage = `\n<user_input>\n${request.userMessage}\n</user_input>`;
    userParts.push({
      text: `\nHISTORIA:\n${historyText}\n\nAKTUALNA WIADOMOŚĆ:${secureMessage}\n\nODPOWIEDŹ:`,
    });

    const contents: Content[] = [{ role: 'user', parts: userParts }];

    // === Wywołanie SDK (IND-19: ai.models.generateContentStream zamiast model.generateContentStream) ===
    // Capture `ai`/`model` do zmiennych - generator (async function*) nie ma dostępu do `this`.
    const ai = this.ai;
    const model = this.modelId;
    const streamOnce = (cfg: Record<string, unknown>) =>
      ai.models.generateContentStream({ model, contents, config: cfg });

    // Capture usage + finishReason z ostatniego chunku (dostępne po zakończeniu streamu)
    let lastUsage: GenerateContentResponse['usageMetadata'] = undefined;
    let lastFinishReason: string | undefined;

    // pump - wspólna konsumpcja jednego streamu: yielduje text, zbiera usage/finishReason,
    // pomija safety-blocked chunki (chunk.text może rzucić). Reużywane przez pierwsze
    // wywołanie i retry, żeby nie duplikować pętli.
    async function* pump(
      response: Awaited<ReturnType<typeof streamOnce>>
    ): AsyncGenerator<string> {
      for await (const chunk of response) {
        try {
          if (chunk.usageMetadata) lastUsage = chunk.usageMetadata;
          const fr = chunk.candidates?.[0]?.finishReason;
          if (fr) lastFinishReason = fr;
          const text = chunk.text;
          if (text) yield text;
        } catch (e) {
          // Safety-blocked chunk, pomiń
          console.warn('⚠️ Gemini stream chunk error (safety?):', e);
          continue;
        }
      }
    }

    // EAGER pierwsze wywołanie - utrzymuje 1 wywołanie SDK dla zwykłej ścieżki (i testów
    // mapowania config, które nie konsumują streamu). Retry jest leniwy (w generatorze).
    const firstResponse = await streamOnce(config);

    // IND-199: guard pustej odpowiedzi. gemini-2.5-flash potrafi wyczerpać budżet na
    // myśleniu → finishReason MAX_TOKENS z pustym text (out:0, cichy 200). Gdy CAŁY
    // pierwszy stream nic nie wyemitował → retry RAZ z wyłączonym myśleniem (budget 0).
    // UWAGA: retry tylko dla PEŁNEJ pustki (emitted===false). Częściowy emit (trochę
    // tekstu, potem urwanie na MAX_TOKENS) NIE jest retry'owany - to byłaby duplikacja
    // narracji; urywanie długiej odpowiedzi to osobny problem (IND-73), nie IND-199.
    const stream = (async function* () {
      let emitted = false;
      for await (const text of pump(firstResponse)) {
        emitted = true;
        yield { text };
      }

      if (!emitted) {
        Sentry.addBreadcrumb({
          category: 'gemini',
          level: 'warning',
          message: 'Pusta odpowiedź Gemini - retry bez myślenia',
          data: { model, finishReason: lastFinishReason ?? 'unknown' },
        });
        const retryConfig = {
          ...config,
          thinkingConfig: { thinkingBudget: THINKING_BUDGET_RETRY },
        };
        for await (const text of pump(await streamOnce(retryConfig))) {
          emitted = true;
          yield { text };
        }

        // Nadal pusto → jawny komunikat zamiast cichego pustego dymka + Sentry (była ślepa plamka).
        if (!emitted) {
          Sentry.captureException(
            new Error(
              'Gemini: pusta odpowiedź po retry (możliwy MAX_TOKENS/safety)'
            ),
            {
              tags: { feature: 'chat', provider: 'gemini' },
              extra: { model, finishReason: lastFinishReason ?? 'unknown' },
            }
          );
          yield { text: EMPTY_RESPONSE_FALLBACK };
        }
      }
    })();

    const getUsage = async (): Promise<CompletionUsage | null> => {
      if (lastUsage) {
        return {
          totalTokens: lastUsage.totalTokenCount || 0,
          promptTokens: lastUsage.promptTokenCount,
          completionTokens: lastUsage.candidatesTokenCount,
          // OPT-26: tokeny obsłużone z cache promptu (mapowanie gubiło to pole →
          // telemetria/koszt pokazywały cached=0 mimo działającego cache).
          cachedTokens: lastUsage.cachedContentTokenCount ?? 0,
          model,
        };
      }
      return null;
    };

    return { stream, getUsage };
  }

  async chat(request: ChatCompletionRequest): Promise<ChatResult> {
    const { stream, getUsage } = await this.streamChat(request);
    let text = '';
    for await (const chunk of stream) {
      text += chunk.text;
    }
    return { text, usage: await getUsage() };
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.ai.models.generateContent({
        model: this.modelId,
        contents: 'Hello',
      });
      // Weryfikacja odpowiedzi - text jest właściwością w nowym SDK
      void response.text;
      return { success: true };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }
}
