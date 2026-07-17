export interface DaylightResult {
  sunrise: string; // HH:MM:SS format
  sunset: string;
  dayLength: string;
  moonPhase: string;
  lightLevel: 'daylight' | 'twilight' | 'moonlit' | 'pitch_black';
  isFallback: boolean;
}

/**
 * Calculates moon phase based on a date.
 * Conway's algorithm/approximation. Returns phase description.
 */
export function calculateMoonPhase(year: number, month: number, day: number): { phase: string; illumination: number } {
  let r = year % 19;
  if (r < 0) r += 19;
  let epact = (11 * r + 11) % 30; // Simple epact approximation

  // Correction for month
  const monthCorrections = [0, 2, 0, 2, 2, 4, 5, 6, 7, 8, 9, 10];
  const correction = monthCorrections[month - 1] || 0;
  
  let age = (epact + correction + day) % 30;
  if (age < 0) age += 30;

  // Determine phase based on age (0 to 29.53 days lunar cycle)
  let phase = 'Nów (New Moon)';
  let illumination = 0;

  if (age < 2) {
    phase = 'Nów (New Moon)';
    illumination = 0;
  } else if (age < 7) {
    phase = 'Przyrastający Sierp (Waxing Crescent)';
    illumination = 25;
  } else if (age < 9) {
    phase = 'Pierwsza Kwadra (First Quarter)';
    illumination = 50;
  } else if (age < 14) {
    phase = 'Przyrastający Garbaty (Waxing Gibbous)';
    illumination = 75;
  } else if (age < 16) {
    phase = 'Pełnia (Full Moon)';
    illumination = 100;
  } else if (age < 21) {
    phase = 'Ubywający Garbaty (Waning Gibbous)';
    illumination = 75;
  } else if (age < 23) {
    phase = 'Ostatnia Kwadra (Third Quarter)';
    illumination = 50;
  } else if (age < 28) {
    phase = 'Ubywający Sierp (Waning Crescent)';
    illumination = 25;
  } else {
    phase = 'Nów (New Moon)';
    illumination = 0;
  }

  return { phase, illumination };
}

/**
 * Fetches sunrise and sunset times from the open Sunrise-Sunset API and estimates moon illumination.
 * Autodetects coordinate location (defaults to Boston, MA / Arkham region: 42.3601, -71.0589).
 */
export async function getDaylightAndMoon(
  dateStr: string, // YYYY-MM-DD
  lat = 42.3601,
  lng = -71.0589
): Promise<DaylightResult> {
  let isFallback = true;
  let sunrise = '06:00:00';
  let sunset = '18:00:00';
  let dayLength = '12:00:00';

  try {
    const response = await fetch(
      `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&date=${dateStr}&formatted=0`
    );

    if (response.ok) {
      const json = await response.json();
      if (json.results && json.status === 'OK') {
        const res = json.results;
        // Parse UTC ISO times to local-like format
        const formatTime = (isoStr: string) => {
          try {
            const d = new Date(isoStr);
            return d.toTimeString().split(' ')[0];
          } catch {
            return isoStr;
          }
        };

        sunrise = formatTime(res.sunrise);
        sunset = formatTime(res.sunset);
        dayLength = res.day_length.toString();
        isFallback = false;
      }
    }
  } catch (e) {
    console.warn('Sunrise-Sunset API request failed, using standard daylight approximation:', e);
  }

  const parts = dateStr.split('-');
  const year = parseInt(parts[0]) || 1925;
  const month = parseInt(parts[1]) || 5;
  const day = parseInt(parts[2]) || 12;

  const { phase, illumination } = calculateMoonPhase(year, month, day);

  // Simple light estimation
  let lightLevel: 'daylight' | 'twilight' | 'moonlit' | 'pitch_black' = 'daylight';
  // Assume generic local time for immersion check is night
  if (illumination > 40) {
    lightLevel = 'moonlit';
  } else {
    lightLevel = 'pitch_black';
  }

  return {
    sunrise,
    sunset,
    dayLength,
    moonPhase: `${phase} (Widoczność tarczy: ${illumination}%)`,
    lightLevel,
    isFallback,
  };
}
