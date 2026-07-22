import { timeManager } from './time-manager';

describe('timeManager weather state', () => {
  beforeEach(() => {
    timeManager.setWeather('Lekka mgła, rześkie powietrze');
  });

  test('should return default weather state', () => {
    expect(timeManager.getWeather()).toBe('Lekka mgła, rześkie powietrze');
  });

  test('should update weather state via setWeather', () => {
    timeManager.setWeather('Gęsta ulewa i pioruny');
    expect(timeManager.getWeather()).toBe('Gęsta ulewa i pioruny');
  });

  test('should trim whitespace when setting weather', () => {
    timeManager.setWeather('   Gęsta mgła nad Arkham   ');
    expect(timeManager.getWeather()).toBe('Gęsta mgła nad Arkham');
  });

  test('should ignore empty weather strings', () => {
    timeManager.setWeather('Początkowa pogoda');
    timeManager.setWeather('   ');
    expect(timeManager.getWeather()).toBe('Początkowa pogoda');
  });
});
