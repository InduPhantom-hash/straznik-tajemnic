import { defaultAISettings } from '../ai-settings/defaults';
import { formatSettingsSection } from './settings';

describe('formatSettingsSection', () => {
  it('eksportuje status Transkrypcja mowy (Push-to-Talk): Nie gdy funkcja jest wyłączona', () => {
    const md = formatSettingsSection(defaultAISettings);
    expect(md).toContain('- **Transkrypcja mowy (Push-to-Talk):** Nie');
  });

  it('eksportuje status Transkrypcja mowy (Push-to-Talk): Tak gdy funkcja jest włączona', () => {
    const enabledSettings = {
      ...defaultAISettings,
      pushToTalkEnabled: true,
      voiceSettings: {
        ...defaultAISettings.voiceSettings,
        pushToTalkEnabled: true,
      },
    };
    const md = formatSettingsSection(enabledSettings);
    expect(md).toContain('- **Transkrypcja mowy (Push-to-Talk):** Tak');
  });
});
