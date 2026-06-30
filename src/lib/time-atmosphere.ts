/**
 * Time Atmosphere Service
 *
 * Generuje konkretne dyrektywy sensoryczne dla AI Game Mastera
 * w zależności od pory dnia i fazy księżyca.
 */

import { MoonPhase } from './types';

// === DYREKTYWY SENSORYCZNE PER SLOT CZASOWY ===

interface TimeSlot {
  name: string;
  directive: string;
}

const TIME_SLOTS: Record<string, TimeSlot> = {
  dawn:       { name: 'Świt',         directive: 'Szare światło sączy się przez mgłę przy ziemi. Ptaki budzą się nieśmiało, pojedyncze głosy w ciszy.' },
  morning:    { name: 'Poranek',      directive: 'Ostre poranne światło, zapach świeżego chleba i dymu z kominów. Ulice ożywają ruchem.' },
  noon:       { name: 'Południe',     directive: 'Bezlitosne światło, krótkie ostre cienie. Pozorna normalność, gwar i ruch uliczny.' },
  afternoon:  { name: 'Popołudnie',   directive: 'Cienie się wydłużają, złote światło pada ukośnie. Zmęczenie dnia wkrada się w gesty ludzi.' },
  dusk:       { name: 'Zmierzch',     directive: 'Zmierzch łączy cienie w jedno. Światła w oknach, chodniki pustoszeją, długie cienie na murach.' },
  night:      { name: 'Noc',          directive: 'Latarnie rzucają wyspy światła w ciemności. Samotne kroki na bruku, miasto usypia za zamkniętymi okiennicami.' },
  deep_night: { name: 'Głęboka noc',  directive: 'Martwa cisza, jedynie wiatr szarpie szyldy. Koszmarne godziny — świat zamarł między jawą a snem.' },
  pre_dawn:   { name: 'Przedświt',    directive: 'Najciemniejsza godzina, liminalność. Świat wstrzymuje oddech przed brzaskiem, kontury się rozmywają.' },
};

// === MODYFIKATORY KSIĘŻYCOWE ===

const MOON_MODIFIERS: Record<MoonPhase, string> = {
  full:            'Pełnia rozlewa srebrne światło — cienie ostre i długie jak za dnia.',
  new:             'Nów — kompletna ciemność poza blask latarni i świec.',
  waxing_gibbous:  'Księżyc rzuca blade, wystarczające światło by widzieć kontury budynków.',
  waning_gibbous:  'Księżyc rzuca blade światło, wystarczające by widzieć kontury budynków.',
  first_quarter:   'Półksiężyc — połowa świata w świetle, połowa w nieprzeniknioym mroku.',
  last_quarter:    'Półksiężyc — połowa świata w mroku, połowa w bladym świetle.',
  waxing_crescent: 'Wąski sierp księżyca — niemal ciemność, ledwo widoczne kontury.',
  waning_crescent: 'Gasnący sierp księżyca — niemal ciemność, sylwetki ledwo widoczne.',
};

/**
 * Zwraca slot czasowy na podstawie godziny
 */
function getTimeSlot(hour: number): TimeSlot {
  if (hour >= 5 && hour < 7)  return TIME_SLOTS.dawn;
  if (hour >= 7 && hour < 11) return TIME_SLOTS.morning;
  if (hour >= 11 && hour < 14) return TIME_SLOTS.noon;
  if (hour >= 14 && hour < 17) return TIME_SLOTS.afternoon;
  if (hour >= 17 && hour < 20) return TIME_SLOTS.dusk;
  if (hour >= 20)              return TIME_SLOTS.night;
  if (hour < 3)                return TIME_SLOTS.deep_night;
  return TIME_SLOTS.pre_dawn; // 3-5
}

/**
 * Czy księżyc jest widoczny o danej godzinie (noc/zmierzch/świt)
 */
function isMoonVisible(hour: number): boolean {
  return hour >= 18 || hour <= 6;
}

/**
 * Generuje dyrektywę atmosferyczną dla AI Game Mastera.
 *
 * @param hour - Godzina w grze (0-23)
 * @param moonPhase - Aktualna faza księżyca
 * @returns Tekst dyrektywy sensorycznej (po polsku, ~20-40 tokenów)
 */
export function getAtmosphereDirective(hour: number, moonPhase: MoonPhase): string {
  const slot = getTimeSlot(hour);
  let directive = slot.directive;

  if (isMoonVisible(hour)) {
    directive += ' ' + MOON_MODIFIERS[moonPhase];
  }

  return directive;
}
