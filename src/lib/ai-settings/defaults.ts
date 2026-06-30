import { AISettings } from './types';

export const defaultAISettings: AISettings = {
  // === PINECONE ===
  pineconeEnabled: false,
  pineconeSettings: {
    indexHost: '', // URL indeksu z dashboardu Pinecone
  },

  // === GEMINI API ===
  geminiEnabled: false,
  geminiApiKey: undefined,
  geminiSettings: {
    model: 'gemini-2.5-flash', // Demo 2026-06-23: domyślnie HIGH. Playtest ULTRA vs HIGH pokazał flash 2-3x szybszy (TTFB 8s vs 20s, lektor 31s vs 60s) przy zachowanej jakości narracji + regułach. Etykieta qualityPreset='high' niżej.
    // === Sampling (HIGH) ===
    temperature: 0.8,
    topP: 0.9,
    topK: 50,
    maxOutputTokens: 4096, // HIGH preset (definitions.ts); flash nie potrzebuje 8192 jak myślący 3.1-pro
    candidateCount: 1, // Jedna odpowiedź na request - wystarcza
    seed: undefined, // Losowy; user może ustawić dla powtarzalności (testy)
    presencePenalty: 0, // Neutralne
    frequencyPenalty: 0, // Neutralne
    stopSequences: [], // Pusta - user może dodać np. "###"
    // === Output ===
    responseMimeType: undefined, // Domyślnie text/plain (nie wymuszamy JSON)
    responseSchema: undefined,
    // === Cache (placeholder dla IND-13) ===
    enableCache: true, // Domyślnie włączone
    cacheTTL: 60 * 60 * 1000, // 1h (HIGH preset, definitions.ts)
    cachedContent: undefined, // Brak cache (placeholder dla IND-13)
    // === Thinking ===
    thinkingLevel: 'high', // Preset HIGH - głębokie rozumowanie (w 3.1 wspiera low/medium/high)
    // === Tools / Function Calling (eksperymentalne) ===
    tools: undefined,
    toolConfig: undefined,
    // === Safety ===
    safetySettings: {
      // HIGH: Horror authentic - mniej restrykcyjne (Lovecraft = groza)
      harassment: 'BLOCK_ONLY_HIGH',
      hateSpeech: 'BLOCK_ONLY_HIGH',
      sexuallyExplicit: 'BLOCK_ONLY_HIGH',
      dangerousContent: 'BLOCK_ONLY_HIGH',
    },
  },

  // === GOOGLE CLOUD TEXT-TO-SPEECH ===
  // IND-86: googleTTSEnabled DROPPED - source of truth = voiceSettings.provider
  googleTTSApiKey: process.env.GOOGLE_CLOUD_API_KEY || undefined,
  googleTTSProjectId: process.env.GOOGLE_CLOUD_PROJECT_ID || undefined,
  googleTTSSettings: {
    audioEncoding: 'MP3',
    sampleRateHertz: 48000,
    effectsProfileId: [],
    enableTimePointing: false,
  },

  voiceSettings: {
    enabled: true,
    provider: 'gemini', // M3 sesja 146: default Gemini (drop OpenAI per D2)
    narratorOnly: true, // HIGH: jeden głos narratora (multi-voice tylko ULTRA, sesja 147 Faza 3)
    volume: 85,
    speed: 0.9, // Preset HIGH
    voiceId: 'Charon', // HIGH: męski głęboki narrator pod Lovecraft (IND-212), auto-route Pro/Flash w useTTS
    speakingRate: 0.9,
    pitchControl: -2.0,
  },

  // === IMAGE GENERATION (IND-91 rename) ===
  imageGenerationEnabled: true,
  replicateApiKey: undefined,
  replicateSettings: {
    imageProvider: 'vertex', // HIGH/ULTRA: Imagen 4 Ultra Tier 1 (applyPreset - drift guard T31)
    model: 'stability-ai/stable-diffusion',
    width: 512,
    height: 512,
    numInferenceSteps: 20,
    guidanceScale: 7.5,
    seed: null,
    scheduler: 'K_EULER',
    style: 'realistic',
    quality: 'high',
    autoGeneratePortraits: true,
    autoGenerateNPCs: true,
    autoGenerateLocations: true, // Preset HIGH - włączone
    maxImagesPerMessage: 1, // 1/odpowiedź - płynność narracji > ilość obrazów
    imageFrequency: 'often', // suwak częstotliwości obrazów scen (rare/normal/often) - default 'often' na demo (obrazy = wyróżnik)
    cacheEnabled: true,
    // M9 sesja 146 (D4): default true - regeneracja zachowuje wygląd NPC.
    useExistingPortraitForRegen: true,
  },

  // M3 sesja 146: elevenLabsApiKey + elevenLabsSettings DROPPED per D2.

  // === GOOGLE CLOUD STORAGE ===
  googleCloudStorageEnabled: true,
  googleCloudStorageBucket:
    process.env.GOOGLE_CLOUD_STORAGE_BUCKET || 'zew-app-storage',
  googleCloudStorageKeyFile:
    process.env.GOOGLE_CLOUD_STORAGE_KEY_FILE || './google-cloud-key.json',
  googleCloudStorageSettings: {
    retentionDays: 30,
    enableCaching: true,
    enableCompression: true,
  },

  // === GAME MASTER NARRATION ===
  gameMasterNarration: {
    enabled: true,
    prompts: {
      mainPrompt: undefined,
      contextualPrompt: undefined,
      stylePrompt: undefined,
    },
    style: {
      responseLength: 'long', // Preset HIGH
      detailLevel: 'detailed', // Preset HIGH
    },
    behavior: {
      creativity: 'balanced',
      contextMemory: 1000, // Domyślnie wszystkie wiadomości
    },
  },

  // === COST CONTROL ===
  costControl: {
    enabled: true,
    monthlyBudget: 10.0,
    currentMonthUsage: 0.0,
    sessionCost: 0.0, // Koszt aktualnej sesji
    totalCost: 0.0, // Ogólny koszt ze wszystkich sesji
    sessionTokens: 0, // Tokeny zużyte w aktualnej sesji
    totalTokens: 0, // Ogólna liczba tokenów
    todayTokens: 0, // Tokeny zużyte dzisiaj
  },

  // === PDF MEMORY ===
  pdfMemory: {
    enabled: false,
    rulesUrl: undefined,
    adventureUrl: undefined,
    lastUpdated: undefined,
  },

  // === GM TOOLS ===
  gmTools: {
    npcManager: {
      autoDetection: true,
      autoCreation: false,
    },
    initiativeTracker: {
      autoStart: true,
      autoAdvanceTurn: false,
      turnTimeLimit: 0,
    },
    randomEventGenerator: {
      enabled: true,
      autoSuggest: false,
    },
    skillCalculator: {
      autoSuggest: true,
    },
    locationManager: {
      autoTracking: true,
    },
    sessionTimeline: {
      autoSave: true,
    },
    advancedNarration: {
      unreliableNarrator: false,
      timeDisorientation: false,
      falseChoices: false,
      postHorrorSilence: false,
      intensityLevel: 'subtle',
    },
  },

  // === CUSTOM COMMANDS ===
  customCommands: [
    {
      command: 'karta',
      description:
        'Wyświetla aktualną kartę postaci (PŻ, PR, PM, główne umiejętności)',
      handler: 'card',
    },
    {
      command: 'ekwipunek',
      description: 'Wyświetla listę przedmiotów w ekwipunku postaci',
      handler: 'equipment',
    },
  ],

  // === QUALITY PRESET ===
  qualityPreset: 'high', // Demo 2026-06-23: domyślnie HIGH (flash 2-3x szybszy, jakość + reguły OK na playteście). Wartości geminiSettings/voiceSettings wyżej zsynchronizowane z applyPreset('high') - drift detector zostaje na 'high'.
};
