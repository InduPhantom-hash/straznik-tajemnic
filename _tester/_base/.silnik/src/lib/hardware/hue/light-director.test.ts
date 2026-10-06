/**
 * @file light-director.test.ts
 * Testy jednostkowe dla Reżysera Światła (LightDirector).
 */

import { LightDirector } from './light-director';
import { HueClient } from './hue-client';

describe('LightDirector (Reżyser Światła CoC 7e)', () => {
  let client: HueClient;
  let director: LightDirector;

  beforeEach(() => {
    client = new HueClient({
      enabled: true,
      bridgeIp: '192.168.1.120',
      appKey: 'test-key',
      selectedLightIds: ['light-1'],
    });
    director = new LightDirector(client);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('wczytuje definicje presetów z pliku konfiguracyjnego', () => {
    const presets = director.getPresets();
    expect(presets.kerosene_lamp).toBeDefined();
    expect(presets.new_england_fog).toBeDefined();
    expect(presets.subterranean_dark).toBeDefined();
    expect(presets.cosmic_horror).toBeDefined();
    expect(presets.kerosene_lamp.brightness).toBe(35);
  });

  it('deterministycznie dopasowuje nastrój do pory dnia i cech lokacji', () => {
    expect(
      director.evaluateEnvironmentMood({ isOccultScene: true })
    ).toBe('cosmic_horror');

    expect(
      director.evaluateEnvironmentMood({ isUnderground: true })
    ).toBe('subterranean_dark');

    expect(
      director.evaluateEnvironmentMood({ isSanatoriumOrClinic: true })
    ).toBe('institutional_cold');

    expect(
      director.evaluateEnvironmentMood({ hour: 12, isOutdoor: true })
    ).toBe('new_england_fog');

    expect(
      director.evaluateEnvironmentMood({ hour: 23, isOutdoor: false })
    ).toBe('candlelight');

    expect(
      director.evaluateEnvironmentMood({ hour: 19, isOutdoor: false })
    ).toBe('kerosene_lamp');
  });

  it('obsługuje awaryjne włączenie światła (Emergency Light)', async () => {
    const applySpy = jest
      .spyOn(client, 'applyToSelectedLights')
      .mockResolvedValue();

    await director.triggerEmergencyLight();

    expect(applySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        on: { on: true },
        dimming: { brightness: 80 },
        color_temperature: { mirek: 370 },
      })
    );
  });

  it('wykonuje sekwencję szoku Poczytalności (SAN shock): ciemność i adaptacja wzroku', async () => {
    const applySpy = jest
      .spyOn(client, 'applyToSelectedLights')
      .mockResolvedValue();

    await director.triggerSanityShock();

    // Krok 1: natychmiastowe zgaśnięcie
    expect(applySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        dimming: { brightness: 3 },
        dynamics: { duration: 200 },
      })
    );

    // Krok 2: powrót po upływie czasu
    jest.advanceTimersByTime(1300);

    expect(applySpy).toHaveBeenCalledTimes(2);
  });
});
