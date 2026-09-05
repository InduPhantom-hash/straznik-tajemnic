/**
 * applyPreset - pure function aplikujący preset jakości na AISettings.
 *
 * Wyciągnięte z `quality-presets.tsx` (IND-14). Po IND-46 (single-provider Gemini)
 * provider-aware logic zniknęła - preset aplikuje wyłącznie geminiSettings + voice/TTS/replicate.
 *
 * Behavior preservation: aplikuje WYŁĄCZNIE pola obecnie aplikowane w starym
 * inline blocku (`quality-presets.tsx:23-86` przed refactorem). Pola DEFINED w preset
 * settings ale NIE aplikowane (np. `enableAudioTags`, `volume`, `creativity`) zostają
 * dla osobnego ticketu "ślepe pokrętła presetów" (IND-34).
 *
 * IND-32a extension (sesja 24): nested gemini sub-bloki - safetySettings, enableCache, cacheTTL.
 *
 * @module ai-presets/apply
 */

import type { AISettings } from '../ai-settings/types';
import { QUALITY_PRESETS, type QualityPresetName } from './definitions';

export function applyPreset(
  presetName: QualityPresetName,
  currentSettings: AISettings
): AISettings {
  // Custom flow - explicit, brak nadpisywania pól
  if (presetName === 'custom') {
    return { ...currentSettings, qualityPreset: 'custom' };
  }

  const preset = QUALITY_PRESETS[presetName];
  const s = preset.settings;

  const newSettings: AISettings = {
    ...currentSettings,
    qualityPreset: presetName,

    // IND-32a: + safetySettings, enableCache, cacheTTL (nested gemini, zawsze)
    geminiSettings: {
      ...currentSettings.geminiSettings,
      model: s.model,
      temperature: s.temperature,
      topP: s.topP,
      topK: s.topK,
      thinkingLevel: s.thinkingLevel,
      maxOutputTokens: s.maxOutputTokens,
      safetySettings: s.safetySettings,
      enableCache: s.enableCache,
      cacheTTL: s.cacheTTL,
    },

    // Voice/TTS - IND-34: + volume/speed/speakingRate/pitchControl (HIGH only, ternary `in s`)
    // IND-165: + provider (HIGH preset migration na 'gemini')
    // 2026-07-25: + elevenLabsModelKey (HIGH/ULTRA = 'elevenlabs' provider)
    voiceSettings: {
      ...currentSettings.voiceSettings,
      enabled: s.ttsEnabled,
      provider: s.ttsProvider ?? currentSettings.voiceSettings.provider,
      voiceId: s.ttsVoice ?? currentSettings.voiceSettings.voiceId,
      narratorOnly:
        'narratorOnly' in s
          ? s.narratorOnly
          : currentSettings.voiceSettings.narratorOnly,
      volume: 'volume' in s ? s.volume : currentSettings.voiceSettings.volume,
      speed: 'speed' in s ? s.speed : currentSettings.voiceSettings.speed,
      // ElevenLabs-specific (opcjonalne, undefined dla presetów bez EL)
      elevenLabsModelKey:
        'elevenLabsModelKey' in s
          ? (s as { elevenLabsModelKey?: 'multilingual_v2' | 'turbo_v2_5' }).elevenLabsModelKey
          : currentSettings.voiceSettings.elevenLabsModelKey,
    },

    imageGenerationEnabled: s.imagesEnabled,
    // Replicate - IND-34: + style/autoGenerate*/maxImagesPerMessage (HIGH only)
    replicateSettings: {
      ...currentSettings.replicateSettings,
      quality: s.imageQuality,
      imageProvider: s.imageProvider,
      style:
        'replicateStyle' in s
          ? s.replicateStyle
          : currentSettings.replicateSettings.style,
      autoGeneratePortraits:
        'autoGeneratePortraits' in s
          ? s.autoGeneratePortraits
          : currentSettings.replicateSettings.autoGeneratePortraits,
      autoGenerateNPCs:
        'autoGenerateNPCs' in s
          ? s.autoGenerateNPCs
          : currentSettings.replicateSettings.autoGenerateNPCs,
      autoGenerateLocations:
        'autoGenerateLocations' in s
          ? s.autoGenerateLocations
          : currentSettings.replicateSettings.autoGenerateLocations,
      maxImagesPerMessage:
        'maxImagesPerMessage' in s
          ? s.maxImagesPerMessage
          : currentSettings.replicateSettings.maxImagesPerMessage,
    },

    gameMasterNarration: {
      ...currentSettings.gameMasterNarration,
      style: {
        ...currentSettings.gameMasterNarration.style,
        responseLength: s.responseLength,
        detailLevel: s.detailLevel,
      },
      // IND-34: + behavior.creativity (HIGH only)
      behavior: {
        ...currentSettings.gameMasterNarration.behavior,
        creativity:
          'creativity' in s
            ? s.creativity
            : currentSettings.gameMasterNarration.behavior.creativity,
      },
    },
  };

  // M2 sesja 146: branch if (ttsProvider === 'elevenlabs') DROPPED (provider odchodzi per D2).
  // Source of truth dla TTS: voiceSettings.provider (ustawione w lin ~55 z s.ttsProvider).

  return newSettings;
}
