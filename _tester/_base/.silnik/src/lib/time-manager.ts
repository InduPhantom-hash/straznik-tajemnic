/**
 * Time Manager Service
 *
 * Deterministyczny zegar kampanii zarządzający datą i czasem w grze.
 * Oblicza upływ czasu, fazę księżyca, dzień tygodnia.
 * Przechowuje stan w localStorage i synchronizuje z GameContext.
 */

import { GameTime, MoonPhase } from './types';

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEY = 'coc7_game_time';
const MONTHS_PL = [
  'Stycznia',
  'Lutego',
  'Marca',
  'Kwietnia',
  'Maja',
  'Czerwca',
  'Lipca',
  'Sierpnia',
  'Września',
  'Października',
  'Listopada',
  'Grudnia',
];
const DAYS_PL = [
  'Niedziela',
  'Poniedziałek',
  'Wtorek',
  'Środa',
  'Czwartek',
  'Piątek',
  'Sobota',
];
const MOON_PHASES: MoonPhase[] = [
  'new',
  'waxing_crescent',
  'first_quarter',
  'waxing_gibbous',
  'full',
  'waning_gibbous',
  'last_quarter',
  'waning_crescent',
];

const MOON_PHASE_NAMES_PL: Record<MoonPhase, string> = {
  new: 'Nów 🌑',
  waxing_crescent: 'Rosnący Sierp 🌒',
  first_quarter: 'Pierwsza Kwadra 🌓',
  waxing_gibbous: 'Rosnący Garbaty 🌔',
  full: 'Pełnia 🌕',
  waning_gibbous: 'Malejący Garbaty 🌖',
  last_quarter: 'Ostatnia Kwadra 🌗',
  waning_crescent: 'Malejący Sierp 🌘',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Czy rok jest przestępny */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Liczba dni w danym miesiącu */
function daysInMonth(year: number, month: number): number {
  const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month === 1 && isLeapYear(year)) return 29;
  return days[month];
}

/** Oblicz dzień tygodnia (0 = Niedziela) dla daty */
function getDayOfWeekIndex(year: number, month: number, day: number): number {
  // Algorytm Zeller'a zmodyfikowany
  const date = new Date(year, month, day);
  return date.getDay();
}

/**
 * Oblicz fazę księżyca dla danej daty.
 * Używa przybliżonej formuły opartej na znanej nowiu (np. 6 Stycznia 1920).
 */
function calculateMoonPhase(
  year: number,
  month: number,
  day: number
): MoonPhase {
  // Nów księżyca 6 Stycznia 1920 jako punkt odniesienia
  const referenceDate = new Date(1920, 0, 6);
  const targetDate = new Date(year, month, day);

  const diffMs = targetDate.getTime() - referenceDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  // Cykl księżycowy ≈ 29.53 dni
  const lunarCycle = 29.53;
  const dayInCycle = ((diffDays % lunarCycle) + lunarCycle) % lunarCycle;

  // Podziel cykl na 8 faz
  const phaseIndex = Math.floor(dayInCycle / (lunarCycle / 8));
  return MOON_PHASES[phaseIndex % 8];
}

/**
 * Wyznacza rok startowy gry z przygody: priorytet yearRange (pierwszy
 * 4-cyfrowy rok ze stringa, np. '1890-1895' -> 1890, '2024' -> 2024),
 * fallback wg era, ostatecznie 1925 (klasyczny CoC 7e).
 */
export function deriveStartYear(
  adventure: { era?: string; yearRange?: string } | null | undefined
): number {
  const match = adventure?.yearRange?.match(/\d{4}/);
  if (match) return parseInt(match[0], 10);
  switch (adventure?.era) {
    case 'modern':
      return 2024;
    case 'gaslight':
      return 1890;
    case 'classic':
      return 1925;
    default:
      return 1925;
  }
}

// ============================================================================
// TIME MANAGER CLASS
// ============================================================================

class TimeManager {
  private currentTime: GameTime;
  private listeners: Array<(time: GameTime) => void> = [];

  constructor() {
    this.currentTime = this.loadFromStorage() || this.createDefaultTime();
  }

  // --- Inicjalizacja ---

  private createDefaultTime(): GameTime {
    // Domyślna data: 14 Stycznia 1925, 10:00 (typowa dla CoC 7e)
    return {
      year: 1925,
      month: 0, // Styczeń
      day: 14,
      hour: 10,
      minute: 0,
    };
  }

  private loadFromStorage(): GameTime | null {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved) as GameTime;
      }
    } catch (error) {
      console.error('❌ Error loading GameTime:', error);
    }
    return null;
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.currentTime));
      this.notifyListeners();
    } catch (error) {
      console.error('❌ Error saving GameTime:', error);
    }
  }

  // --- Core Time Manipulation ---

  /**
   * Przesuwa czas o podaną liczbę minut.
   * Obsługuje przekroczenie godzin, dni, miesięcy i lat.
   */
  advanceTime(minutes: number): GameTime {
    let { year, month, day, hour, minute } = this.currentTime;

    minute += minutes;

    // Przelicz minuty na godziny
    while (minute >= 60) {
      minute -= 60;
      hour++;
    }
    while (minute < 0) {
      minute += 60;
      hour--;
    }

    // Przelicz godziny na dni
    while (hour >= 24) {
      hour -= 24;
      day++;
    }
    while (hour < 0) {
      hour += 24;
      day--;
    }

    // Przelicz dni na miesiące
    while (day > daysInMonth(year, month)) {
      day -= daysInMonth(year, month);
      month++;
      if (month > 11) {
        month = 0;
        year++;
      }
    }
    while (day < 1) {
      month--;
      if (month < 0) {
        month = 11;
        year--;
      }
      day += daysInMonth(year, month);
    }

    this.currentTime = { year, month, day, hour, minute };
    this.saveToStorage();

    console.log(
      `⏰ Time advanced by ${minutes} min -> ${this.formatDateTime()}`
    );
    return this.currentTime;
  }

  /**
   * Ustaw czas na konkretną wartość.
   */
  setTime(time: Partial<GameTime>): GameTime {
    this.currentTime = { ...this.currentTime, ...time };
    this.saveToStorage();
    return this.currentTime;
  }

  /**
   * Zresetuj czas do domyślnej wartości.
   */
  reset(): GameTime {
    this.currentTime = this.createDefaultTime();
    this.saveToStorage();
    return this.currentTime;
  }

  /**
   * Resetuje zegar na datę startową dopasowaną do ery przygody
   * (modern -> 2024, classic -> 1925, gaslight -> 1890). Zachowuje domyślny
   * dzień/godzinę (14 stycznia, 10:00). Wołać TYLKO na świeży start gry -
   * nadpisuje stary czas z localStorage; NIE wołać na reload zapisanej sesji.
   */
  resetForAdventure(
    adventure: { era?: string; yearRange?: string } | null | undefined
  ): GameTime {
    this.currentTime = {
      year: deriveStartYear(adventure),
      month: 0,
      day: 14,
      hour: 10,
      minute: 0,
    };
    this.saveToStorage();
    return this.currentTime;
  }

  // --- Getters ---

  getTime(): GameTime {
    return { ...this.currentTime };
  }

  getMoonPhase(): MoonPhase {
    const { year, month, day } = this.currentTime;
    return calculateMoonPhase(year, month, day);
  }

  getDayOfWeek(): string {
    const { year, month, day } = this.currentTime;
    const idx = getDayOfWeekIndex(year, month, day);
    return DAYS_PL[idx];
  }

  isNight(): boolean {
    const { hour } = this.currentTime;
    return hour < 6 || hour >= 21;
  }

  // --- Formatting ---

  formatDate(): string {
    const { year, month, day } = this.currentTime;
    return `${day} ${MONTHS_PL[month]} ${year}`;
  }

  formatTime(): string {
    const { hour, minute } = this.currentTime;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }

  formatDateTime(): string {
    return `${this.formatDate()}, ${this.formatTime()}`;
  }

  formatForPrompt(): string {
    const moonPhase = this.getMoonPhase();
    const moonPhaseName = MOON_PHASE_NAMES_PL[moonPhase];
    const dayOfWeek = this.getDayOfWeek();
    const timeOfDay = this.isNight() ? 'Noc' : 'Dzień';

    return `[AKTUALNY CZAS: ${this.formatDateTime()}, ${dayOfWeek}, ${timeOfDay}, Faza Księżyca: ${moonPhaseName}]`;
  }

  // --- Listeners ---

  subscribe(callback: (time: GameTime) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((l) => l(this.currentTime));
  }

  // --- Import/Export (dla save/load) ---

  export(): GameTime {
    return { ...this.currentTime };
  }

  import(time: Partial<GameTime>): void {
    // Defensive merge - jeśli klient wyśle niepełny GameTime (np. brak `minute` -
    // realny edge case z sesji 128 smoke /api/chat), zachowaj poprzednie wartości
    // zamiast nadpisywać undefined. Bez tego formatTime() rzuca "Cannot read
    // properties of undefined (reading 'toString')".
    this.currentTime = {
      year: time.year ?? this.currentTime.year,
      month: time.month ?? this.currentTime.month,
      day: time.day ?? this.currentTime.day,
      hour: time.hour ?? this.currentTime.hour,
      minute: time.minute ?? this.currentTime.minute,
    };
    this.saveToStorage();
    console.log('⏰ GameTime imported:', this.formatDateTime());
  }
}

// Singleton export
export const timeManager = new TimeManager();
