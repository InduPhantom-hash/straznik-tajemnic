/**
 * Barrel re-export modułu ai-presets — zachowuje publiczne API
 * sprzed splicie (commit `dd97a03`, IND-14): QUALITY_PRESETS, getPreset,
 * getPresetDescription, QualityPresetName, QualityPreset oraz nowe applyPreset.
 *
 * @module ai-presets
 */

export * from './definitions';
export * from './apply';
