/**
 * AI Quality Presets - Definicje presetów jakości
 *
 * Wyodrębnione z ai-settings.ts dla zgodności z zasadą <200 linii/plik.
 * @module ai-presets
 */

// ========================================
// QUALITY PRESETS
// ========================================

/**
 * Presety określające ustawienia dla danego poziomu jakości/kosztów
 */
export const QUALITY_PRESETS = {
  low: {
    name: 'LOW COST',
    description:
      'Gemini 3.6 Flash + obrazy Gemini, bez lektora - najtańszy (~$0.05-0.10/sesja)',
    settings: {
      // Gemini settings - Gemini 3.6 Flash!
      model: 'gemini-3.6-flash' as const, // Ultra-szybki i tani
      temperature: 0.7,
      topP: 0.85,
      topK: 40,
      thinkingLevel: 'low' as const,
      maxOutputTokens: 2048,
      // === GEMINI nested (IND-32a) ===
      safetySettings: {
        harassment: 'BLOCK_MEDIUM_AND_ABOVE' as const,
        hateSpeech: 'BLOCK_MEDIUM_AND_ABOVE' as const,
        sexuallyExplicit: 'BLOCK_MEDIUM_AND_ABOVE' as const,
        dangerousContent: 'BLOCK_MEDIUM_AND_ABOVE' as const,
      },
      enableCache: true,
      cacheTTL: 60 * 60 * 1000, // 1h
      // TTS settings - lektor wyłączony; provider 'gemini' (fork Zew Home ma tylko
      // jeden klucz Gemini, ścieżka /api/tts/gemini). Spójność z resztą presetów.
      ttsEnabled: false,
      ttsProvider: 'gemini' as const,
      ttsVoice: null,
      // Image settings - M2 sesja 146: Imagen 4 Fast Tier 1 (~$0.02/obraz, lepszy text rendering vs Flux)
      imagesEnabled: true,
      imageProvider: 'vertex' as const,
      imageQuality: 'medium' as const,
      // Narration style
      responseLength: 'medium' as const,
      detailLevel: 'standard' as const,
    },
  },

  mid: {
    name: 'MID COST',
    description:
      'Gemini 3.6 Flash + lektor (Gemini TTS) + obrazy Gemini (~$0.20/sesja)',
    settings: {
      // Gemini settings
      model: 'gemini-3.6-flash' as const,
      temperature: 0.7,
      topP: 0.85,
      topK: 40,
      thinkingLevel: 'medium' as const,
      maxOutputTokens: 2048,
      // === GEMINI nested (IND-32a) ===
      safetySettings: {
        harassment: 'BLOCK_MEDIUM_AND_ABOVE' as const,
        hateSpeech: 'BLOCK_MEDIUM_AND_ABOVE' as const,
        sexuallyExplicit: 'BLOCK_MEDIUM_AND_ABOVE' as const,
        dangerousContent: 'BLOCK_MEDIUM_AND_ABOVE' as const,
      },
      enableCache: true,
      cacheTTL: 60 * 60 * 1000, // 1h
      // TTS settings - Charon (Gemini prebuilt) jako lektor. Fork Zew Home tnie cały
      // TTS przez /api/tts/gemini, który odrzuca głosy spoza katalogu Gemini
      // (gemini-voices.ts). Stary 'pl-PL-Chirp3-HD-Enceladus' (Google Cloud TTS) dawał
      // 400 → lektor niemy na MID. Charon = spójny narrator z HIGH.
      ttsEnabled: true,
      ttsProvider: 'gemini' as const,
      ttsVoice: 'Charon',
      // Sesja 147 Faza 3: MID = jeden głos narratora (zgodność z dispatch jednoVoice).
      // Multi-voice "słuchowisko radiowe" dostępne TYLKO w preset ULTRA.
      narratorOnly: true,
      // Image settings - M2 sesja 146: Imagen 4 Fast Tier 1 (~$0.02/obraz, spójność z innymi preset)
      imagesEnabled: true,
      imageProvider: 'vertex' as const,
      imageQuality: 'medium' as const,
      // Narration style
      responseLength: 'medium' as const,
      detailLevel: 'standard' as const,
    },
  },

  high: {
    name: 'HIGH COST',
    description:
      'Gemini 2.5 Flash + lektor (Pro/Flash) + obrazy Gemini - zalecany (~$3/sesja)',
    settings: {
      // === GEMINI SETTINGS ===
      model: 'gemini-2.5-flash' as const, // Stabilny balans (lub gemini-3-flash)
      temperature: 0.8,
      topP: 0.9,
      topK: 50,
      thinkingLevel: 'high' as const,
      maxOutputTokens: 4096,

      // === GEMINI nested (IND-32a) - Horror authentic safety ===
      safetySettings: {
        harassment: 'BLOCK_ONLY_HIGH' as const,
        hateSpeech: 'BLOCK_ONLY_HIGH' as const,
        sexuallyExplicit: 'BLOCK_ONLY_HIGH' as const,
        dangerousContent: 'BLOCK_ONLY_HIGH' as const,
      },
      enableCache: true,
      cacheTTL: 60 * 60 * 1000, // 1h

      // === GEMINI TTS (IND-212: Charon - męski głęboki narrator pod Lovecraft, był 'Kore' żeński; auto-route Pro/Flash w useTTS) ===
      ttsEnabled: true,
      ttsProvider: 'gemini' as const,
      ttsVoice: 'Charon',
      // Sesja 147 Faza 3: HIGH = multi-voice NPC, głosy per marker dialogów.
      // 2026-07-22: rozszerzone z ULTRA-only na HIGH+ULTRA (parsowanie `Imię: „dialog”`).
      narratorOnly: false,
      volume: 85,
      speed: 0.9,
      speakingRate: 0.9,
      pitchControl: -2,

      // === IMAGE SETTINGS (M2 sesja 146 - D3: Imagen 4 Ultra Tier 1) ===
      imagesEnabled: true,
      imageProvider: 'vertex' as const,
      imageQuality: 'high' as const,

      // === REPLICATE SETTINGS (legacy params dla custom flow) ===
      replicateStyle: 'realistic' as const,
      autoGeneratePortraits: true,
      autoGenerateNPCs: true,
      autoGenerateLocations: true,
      maxImagesPerMessage: 1, // IND-259: 1/odpowiedź (sync z defaults.ts - płynność > ilość)

      // === GOOGLE CLOUD STORAGE ===
      googleCloudStorageEnabled: true,
      enableCaching: true,
      enableCompression: true,

      // === NARRATION STYLE ===
      responseLength: 'long' as const,
      detailLevel: 'detailed' as const,
      creativity: 'balanced' as const,
    },
  },

  ultra: {
    name: 'ULTRA',
    description:
      'Gemini 3.1 Pro + lektor Pro + obrazy Gemini - najwyższa jakość (~$7/sesja)',
    settings: {
      // Gemini settings - maksymalna jakość
      model: 'gemini-3.1-pro-preview' as const, // IND-222: poprawna nazwa API ('gemini-3.1-pro' = 404 NOT_FOUND), zweryfikowane ListModels + generateContent 200
      temperature: 0.9,
      topP: 0.95,
      topK: 60,
      thinkingLevel: 'high' as const,
      maxOutputTokens: 8192,
      // === GEMINI nested (IND-32a) - Horror authentic + dłuższy cache (droższy 3.1 Pro = większe oszczędności) ===
      safetySettings: {
        harassment: 'BLOCK_ONLY_HIGH' as const,
        hateSpeech: 'BLOCK_ONLY_HIGH' as const,
        sexuallyExplicit: 'BLOCK_ONLY_HIGH' as const,
        dangerousContent: 'BLOCK_ONLY_HIGH' as const,
      },
      enableCache: true,
      cacheTTL: 2 * 60 * 60 * 1000, // 2h
      // === GEMINI TTS (demo 2026-06-22: Gacrux - "Mature", głębszy męski narrator
      //     dla CoC 7e Lovecraft. M9 sesja 146 było Sadaltager (płytszy); A/B z Algenib możliwy.
      //     Długie monologi → 2.5 Pro w useTTS auto-route)
      //     Sesja 147 Faza 3: narratorOnly=false = multi-voice słuchowisko radiowe.
      //     useTTS parsuje @NPCName: markery i wybiera voiceId per NPC z store. ===
      ttsEnabled: true,
      ttsProvider: 'gemini' as const,
      ttsVoice: 'Gacrux', // Mature, głębszy męski narrator (demo 2026-06-22, A/B z Sadaltager/Algenib)
      narratorOnly: false, // multi-voice ULTRA (jedyny preset ze słuchowiskiem)
      // === IMAGE SETTINGS (M2 sesja 146 - D3: Imagen 4 Ultra Tier 1) ===
      imagesEnabled: true,
      imageProvider: 'vertex' as const,
      imageQuality: 'high' as const,
      // Narration style - długie, opisowe teksty
      responseLength: 'long' as const,
      detailLevel: 'detailed' as const,
    },
  },

  custom: {
    name: 'CUSTOM',
    description: 'Własna konfiguracja wszystkich parametrów',
    settings: null, // brak nadpisywania
  },
} as const;

// ========================================
// TYPES
// ========================================

export type QualityPresetName = keyof typeof QUALITY_PRESETS;
export type QualityPreset = (typeof QUALITY_PRESETS)[QualityPresetName];

/**
 * Pobiera preset według nazwy
 */
export function getPreset(name: QualityPresetName): QualityPreset {
  return QUALITY_PRESETS[name];
}

/**
 * Pobiera opis presetu
 */
export function getPresetDescription(name: QualityPresetName): string {
  return QUALITY_PRESETS[name].description;
}
