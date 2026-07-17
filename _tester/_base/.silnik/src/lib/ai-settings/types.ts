// IND-275 T1: union ID modeli Gemini scentralizowany w model-registry.
import type { GeminiModelId } from '../model-registry';

export interface AISettings {
  // === PINECONE (etap 2a) ===
  pineconeEnabled?: boolean;
  pineconeSettings?: {
    indexHost: string; // URL indeksu z dashboardu Pinecone
  };

  // === GEMINI API (Google AI) ===
  geminiEnabled: boolean;
  geminiApiKey?: string;
  geminiSettings: {
    model: GeminiModelId;
    // === Sampling ===
    temperature: number; // 0.0-2.0
    topP: number; // 0.0-1.0
    topK: number; // 1-100
    maxOutputTokens: number; // 1-8192
    candidateCount?: number; // 1-4: ile niezależnych odpowiedzi AI ma wygenerować
    seed?: number; // Ziarno losowości - ten sam seed = ten sam wynik (dla testów)
    presencePenalty?: number; // -2.0 do 2.0 - kara za ponowne pojawienie się tematu
    frequencyPenalty?: number; // -2.0 do 2.0 - kara za powtarzanie słów
    stopSequences?: string[]; // Max 5 ciągów stopujących
    // === Output ===
    responseMimeType?: 'text/plain' | 'application/json'; // Typ MIME odpowiedzi
    responseSchema?: object; // JSON Schema (wymaga responseMimeType=application/json)
    // === Cache (placeholder dla IND-13) ===
    enableCache?: boolean; // Włącz/wyłącz cache odpowiedzi (domyślnie true; pełna integracja w IND-13)
    cacheTTL?: number; // Czas życia cache w milisekundach (domyślnie 1 godzina = 3600000)
    cachedContent?: string; // Nazwa istniejącego cache (np. cachedContents/abc123)
    // === Thinking ===
    thinkingLevel?: 'low' | 'medium' | 'high' | 'auto'; // Gemini 3.0+: kontrola głębokości rozumowania
    // === Tools / Function Calling (eksperymentalne - aplikacja jeszcze nie konsumuje wyników) ===
    tools?: object[]; // Tablica deklaracji funkcji
    toolConfig?: object; // Tryb wyboru narzędzi (auto/none/required/specific)
    // === Safety ===
    safetySettings: {
      harassment:
        | 'BLOCK_NONE'
        | 'BLOCK_ONLY_HIGH'
        | 'BLOCK_MEDIUM_AND_ABOVE'
        | 'BLOCK_LOW_AND_ABOVE';
      hateSpeech:
        | 'BLOCK_NONE'
        | 'BLOCK_ONLY_HIGH'
        | 'BLOCK_MEDIUM_AND_ABOVE'
        | 'BLOCK_LOW_AND_ABOVE';
      sexuallyExplicit:
        | 'BLOCK_NONE'
        | 'BLOCK_ONLY_HIGH'
        | 'BLOCK_MEDIUM_AND_ABOVE'
        | 'BLOCK_LOW_AND_ABOVE';
      dangerousContent:
        | 'BLOCK_NONE'
        | 'BLOCK_ONLY_HIGH'
        | 'BLOCK_MEDIUM_AND_ABOVE'
        | 'BLOCK_LOW_AND_ABOVE';
    };
    // NB: enableVision usunięte (IND-12) - multimodal w Gemini 1.5+ jest natywny, flag był leftover (0 użyć).
    // NB: audioConfig + responseModalities - wymagają Gemini 2.0+ SDK, czekają na IND-19 (migracja na @google/genai).
  };

  // === GOOGLE CLOUD TEXT-TO-SPEECH ===
  // IND-86: googleTTSEnabled DROPPED - source of truth = voiceSettings.provider === 'google'
  googleTTSApiKey?: string;
  googleTTSProjectId?: string;
  googleTTSSettings: {
    audioEncoding: 'MP3' | 'LINEAR16' | 'OGG_OPUS' | 'MULAW' | 'ALAW';
    sampleRateHertz: 8000 | 16000 | 22050 | 24000 | 32000 | 44100 | 48000;
    effectsProfileId: string[];
    enableTimePointing: boolean;
  };

  // Ustawienia głosu (M3 sesja 146: drop 'elevenlabs' + 'openai' z union per D2)
  voiceSettings: {
    enabled: boolean;
    provider?: 'google' | 'gemini';
    narratorOnly: boolean; // Tylko narracje główne
    volume: number; // 0-100
    speed: number; // 0.5-2.0
    voiceId?: string; // ID głosu z Google TTS
    speakingRate: number; // 0.25-4.0
    pitchControl: number; // -20.0 do +20.0
    style?: string; // Styl mówienia (np. cheerful, sad)
  };

  // === IMAGE GENERATION (Vertex / Replicate / Gemini) ===
  // IND-91: rename legacy `replicateEnabled` → `imageGenerationEnabled`
  // Flag is provider-agnostic - toggles all 3 image providers (vertex/replicate/gemini).
  imageGenerationEnabled: boolean;
  replicateApiKey?: string;
  replicateSettings: {
    model:
      | 'black-forest-labs/flux-schnell'
      | 'stability-ai/stable-diffusion'
      | 'stability-ai/sdxl'
      | 'runwayml/stable-diffusion-v1-5'
      | 'stability-ai/stable-diffusion-xl-base-1.0'
      | 'stability-ai/stable-diffusion-3-medium';
    width: number; // 256-2048
    height: number; // 256-2048
    numInferenceSteps: number; // 1-100
    guidanceScale: number; // 1-20
    seed: number | null;
    scheduler:
      | 'DDIM'
      | 'DPMSolverMultistep'
      | 'HeunDiscrete'
      | 'KarrasDPM'
      | 'K_EULER_ANCESTRAL'
      | 'K_EULER'
      | 'PNDM'
      | 'EulerAncestralDiscrete'
      | 'LMSDiscreteScheduler';
    style: 'realistic' | 'artistic' | 'horror' | 'vintage';
    quality: 'low' | 'medium' | 'high' | 'ultra';
    autoGeneratePortraits: boolean;
    autoGenerateNPCs: boolean;
    autoGenerateLocations: boolean;
    maxImagesPerMessage: number; // 1-5
    /**
     * Częstotliwość ilustracji scen w grze (ręczny suwak, niezależny od trybu).
     * Łączy się z trybem narracji (sessionZero.narrativeMode): tryb ustala bazowy
     * poziom, ten suwak przesuwa go o ±1 (rare=-1, often=+1). Steruje językiem
     * promptu (image-instructions) ORAZ throttle'em (constants/chat). Default 'normal'.
     */
    imageFrequency?: 'rare' | 'normal' | 'often';
    cacheEnabled: boolean;
    imageProvider?: 'auto' | 'vertex' | 'gemini' | 'replicate'; // Provider do generowania obrazów
    /**
     * M9 sesja 146 (D4): globalny toggle dla Flux Kontext Pro image-to-image.
     * Gdy true (default) - regeneracja portretu NPC zachowuje wygląd postaci
     * (~$0.04 Flux Kontext). Gdy false - generuje od zera przez Imagen 4 Ultra
     * (~$0.06). User decyduje raz w Settings vs per-NPC checkbox.
     */
    useExistingPortraitForRegen?: boolean;
  };

  // M3 sesja 146: elevenLabsApiKey + elevenLabsSettings DROPPED per D2.
  // Legacy localStorage handled przez migration w storage.ts loadAISettings.

  // === GOOGLE CLOUD STORAGE ===
  googleCloudStorageEnabled: boolean;
  googleCloudStorageBucket?: string;
  googleCloudStorageKeyFile?: string;
  googleCloudStorageSettings: {
    retentionDays: number;
    enableCaching: boolean;
    enableCompression: boolean;
  };

  // === GAME MASTER NARRATION ===
  gameMasterNarration: {
    enabled: boolean;

    // System promptów
    prompts: {
      mainPrompt?: string;
      contextualPrompt?: string;
      stylePrompt?: string;
      gmInstructionsFileUrl?: string; // URL do pliku .md z instrukcjami MG (GCS)
      gmInstructionsFileName?: string; // Nazwa załadowanego pliku
      gmInstructionsGeminiFileUri?: string; // Gemini File URI (do użycia w API)
      isDefaultPrompt?: boolean; // true = używa domyślnego promptu
    };

    // Personalizacja stylu
    style: {
      responseLength: 'short' | 'medium' | 'long';
      detailLevel: 'minimal' | 'standard' | 'detailed';
    };

    // Zachowanie AI
    behavior: {
      creativity: 'conservative' | 'balanced' | 'creative';
      contextMemory: number; // liczba wiadomości
    };
  };

  // === GM TOOLS ===
  gmTools?: {
    npcManager: {
      autoDetection: boolean; // Automatyczne wykrywanie NPC w narracji
      autoCreation: boolean; // Automatyczne tworzenie NPC
    };
    initiativeTracker: {
      autoStart: boolean; // Automatyczne uruchamianie walki
      autoAdvanceTurn: boolean; // Automatyczne przejście tury
      turnTimeLimit: number; // Czas na turę (0 = ręczne)
    };
    randomEventGenerator: {
      enabled: boolean;
      autoSuggest: boolean; // Automatyczne sugerowanie wydarzeń
    };
    skillCalculator: {
      autoSuggest: boolean; // Automatyczne sugerowanie testów
    };
    locationManager: {
      autoTracking: boolean; // Automatyczne śledzenie lokacji
    };
    sessionTimeline: {
      autoSave: boolean; // Automatyczny zapis wydarzeń
    };
    // === ADVANCED NARRATION TECHNIQUES ===
    advancedNarration?: {
      unreliableNarrator: boolean; // Halucynacje jako fakty
      timeDisorientation: boolean; // Subtelne niespójności czasowe
      falseChoices: boolean; // Iluzja wyboru
      postHorrorSilence: boolean; // Automatyczne pauzy po horrorze
      intensityLevel: 'subtle' | 'moderate' | 'intense'; // Intensywność technik
    };
  };

  // === COST CONTROL ===
  costControl: {
    enabled: boolean;
    monthlyBudget: number; // w USD
    currentMonthUsage: number;
    sessionCost: number; // Koszt aktualnej sesji
    totalCost: number; // Ogólny koszt
    // Licznik tokenów
    sessionTokens: number;
    totalTokens: number;
    todayTokens: number;
  };

  // === PDF MEMORY ===
  pdfMemory?: {
    enabled: boolean;
    rulesUrl?: string;
    adventureUrl?: string;
    lastUpdated?: string;
  };

  // === CUSTOM COMMANDS ===
  customCommands?: Array<{
    command: string; // Nazwa komendy
    description: string; // Opis komendy
    handler?: string; // Identyfikator handlera
  }>;

  // === QUALITY PRESET ===
  qualityPreset: 'low' | 'mid' | 'high' | 'ultra' | 'custom';

  // === SESSION ZERO (Game Calibration) ===
  sessionZero?: {
    era: 'classic' | 'gaslight' | 'modern' | 'custom';
    eraCustom?: string;
    tone: 'purist' | 'pulp' | 'noir' | 'neutral';
    difficulty: 'easy' | 'normal' | 'hard' | 'deadly';
    narrativeMode: 'full_rpg' | 'story_priority' | 'pure_narrative';
    lines: string[]; // Tematy zakazane
    veils: string[]; // Tematy do "fade to black"
    safetyWord: string;
    playerName: string;
    completed: boolean;
  };
}
