/**
 * Drift-guard test dla Model Registry & Quality Presets.
 *
 * Pilnuje spójności mapowania modeli i głosów w `PRESET_MODELS`
 * z definicjami w `QUALITY_PRESETS`.
 */

import { QUALITY_PRESETS } from './ai-presets/definitions';
import { PRESET_MODELS } from './model-registry';

describe('Model Registry Drift-Guard', () => {
  it('PRESET_MODELS mirrors QUALITY_PRESETS models accurately', () => {
    expect(PRESET_MODELS.low.chatModel).toBe(QUALITY_PRESETS.low.settings.model);
    expect(PRESET_MODELS.mid.chatModel).toBe(QUALITY_PRESETS.mid.settings.model);
    expect(PRESET_MODELS.high.chatModel).toBe(QUALITY_PRESETS.high.settings.model);
    expect(PRESET_MODELS.ultra.chatModel).toBe(QUALITY_PRESETS.ultra.settings.model);
  });

  it('PRESET_MODELS mirrors QUALITY_PRESETS ttsVoice accurately', () => {
    expect(PRESET_MODELS.low.ttsVoice).toBe(QUALITY_PRESETS.low.settings.ttsVoice);
    expect(PRESET_MODELS.mid.ttsVoice).toBe(QUALITY_PRESETS.mid.settings.ttsVoice);
    expect(PRESET_MODELS.high.ttsVoice).toBe(QUALITY_PRESETS.high.settings.ttsVoice);
    expect(PRESET_MODELS.ultra.ttsVoice).toBe(QUALITY_PRESETS.ultra.settings.ttsVoice);
  });
});
