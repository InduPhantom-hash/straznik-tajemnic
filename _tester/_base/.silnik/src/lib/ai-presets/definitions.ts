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
      'Gemini Flash-Lite, bez lektora, bez obrazów - najtańszy (~$0.02-0.05/sesja)',
    settings: {
      // Gemini settings - Gemini Flash-Lite Latest!
      model: 'gemini-flash-lite-latest' as const, // Ultra-szybki i tani
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
      // TTS settings - lektor wyłączony
      ttsEnabled: false,
      ttsProvider: 'gemini' as const,
      ttsVoice: null,
      // Image settings - 2026-07-25: pure text, obrazy wyłączone
      imagesEnabled: false,
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
      'Gemini Flash Latest + lektor (Gemini TTS) + obrazy Gemini (~$0.20/sesja)',
    settings: {
      // Gemini settings - Gemini Flash Latest
      model: 'gemini-flash-latest' as const,
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
      'Gemini 3.8 Flash (High) + lektor ElevenLabs (hybryda) + obrazy Vertex - słuchowisko (~$3-6/sesja)',
    settings: {
      // === GEMINI SETTINGS ===
      model: 'gemini-3.8-flash' as const, // Gemini 3.8 Flash z Thinking Level High
      temperature: 0.8,
      topP: 0.9,
      topK: 50,
      thinkingLevel: 'high' as const,
      maxOutputTokens: 8192,

      // === GEMINI nested (IND-32a) - Horror authentic safety ===
      safetySettings: {
        harassment: 'BLOCK_ONLY_HIGH' as const,
        hateSpeech: 'BLOCK_ONLY_HIGH' as const,
        sexuallyExplicit: 'BLOCK_ONLY_HIGH' as const,
        dangerousContent: 'BLOCK_ONLY_HIGH' as const,
      },
      enableCache: true,
      cacheTTL: 60 * 60 * 1000, // 1h

      // === ELEVENLABS TTS HYBRYDA (2026-07-25) ===
      // Main NPC: eleven_multilingual_v2 (pełne emocje aktorskie PL)
      // Background NPC: eleven_turbo_v2_5 (szybki, 4x tańszy)
      // Fallback: Gemini TTS Charon (gdy brak klucza ElevenLabs)
      ttsEnabled: true,
      ttsProvider: 'elevenlabs' as const,
      ttsVoice: 'Charon', // Gemini fallback voice
      elevenLabsModelKey: 'multilingual_v2' as const,
      narratorOnly: false,
      volume: 85,
      speed: 0.9,

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

      // === NARRATION STYLE ===
      responseLength: 'long' as const,
      detailLevel: 'detailed' as const,
      creativity: 'balanced' as const,
    },
  },

  ultra: {
    name: 'ULTRA',
    description:
      'Gemini 3.1 Pro + lektor ElevenLabs Pro (pełne słuchowisko radiowe) + obrazy Vertex (~$8-12/sesja)',
    settings: {
      // Gemini settings - maksymalna jakość
      model: 'gemini-3.1-pro-preview' as const, // IND-222: poprawna nazwa API
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
      // === ELEVENLABS TTS FULL PRO (2026-07-25) ===
      // Wszyscy NPC na eleven_multilingual_v2 z pełnym podbiciem emocji aktorskich.
      // Fallback: Gemini TTS Gacrux (gdy brak klucza ElevenLabs)
      ttsEnabled: true,
      ttsProvider: 'elevenlabs' as const,
      ttsVoice: 'Gacrux', // Gemini fallback voice (Mature, głęboki narrator)
      elevenLabsModelKey: 'multilingual_v2' as const,
      narratorOnly: false, // pełne słuchowisko radiowe
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
