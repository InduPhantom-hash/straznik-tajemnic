/**
 * Silnik Rekonwalescencji Zdrowia i Leczenia Ciężkich Ran (Call of Cthulhu 7e RAW)
 *
 * Implementuje oficjalne reguły CoC 7e (Księga Strażnika, Rozdział 6, s. 119-123)
 * oraz zalecenia Mistrzów Gry (Seth Skorkowsky, Lans Macabre):
 *
 * 1. Zwykłe leczenie (bez Ciężkiej Rany):
 *    - +1 PŻ na każdy dzień pełnego odpoczynku w łóżku (do pułapu max HP).
 * 2. Ciężka Rana (Major Wound):
 *    - Brak leczenia dziennego.
 *    - Co 7 dni (tydzień) odpoczynku: rzut na Kondycję (CON).
 *    - Regular/Hard: odzysk 1k3 PŻ.
 *    - Extreme: odzysk 2k3 PŻ oraz natychmiastowe zdjęcie Ciężkiej Rany.
 *    - Failure: brak odzysku (0 PŻ).
 *    - Fumble: infekcja/gorączka (-1k6 PŻ, chyba że w prywatnej klinice z antyseptyką).
 *    - Warunki opieki:
 *      * Miejski Szpital Ogólny: Kość Premii (Bonus Die), koszt $10/tydz.
 *      * Prywatna Klinika dr. Pennhallowa: Kość Premii, ochrona antyseptyczna, koszt $100/tydz. (lub CR >= 40).
 *      * Dom / kryjówka: standardowy rzut (bez kości premii/kary), $0.
 *      * Trudne warunki (dzicz/ruiny): Kość Karna (Penalty Die), $0.
 *    - Odznaczenie Ciężkiej Rany:
 *      * Następuje, gdy aktualne PŻ > max HP / 2 LUB przy Ekstremalnym Sukcesie CON.
 *      * Pozostawia trwałą pamiątkę w postaci blizny (Tabela trafień CoC 7e).
 * 3. Doraźne procedury medyczne:
 *    - Pierwsza Pomoc: +1 PŻ, stabilizuje umierającego.
 *    - Medycyna: 1 godzina, +1k3 PŻ (lub 2k3 na extreme), stabilizuje stan.
 */

import type { Character } from '@/lib/types';
import { evaluateSkillCheck, RollOutcome } from '@/lib/dice-utils';
import { getCreditRating } from '@/lib/economy/credit-rating';

export type RecoveryFacility = 'home' | 'public_hospital' | 'private_clinic' | 'poor_conditions';
export type TimeSkipPeriod = '1_day' | '3_days' | '1_week' | '2_weeks' | '1_month';

export interface HitLocationScar {
  location: string;
  roll: number;
  descriptionPl: string;
  descriptionEn: string;
}

export interface WeeklyRecoveryLog {
  weekNumber: number;
  conRoll: number;
  conTarget: number;
  outcome: RollOutcome;
  bonusTens?: number;
  hpDelta: number;
  infectionOccurred: boolean;
  notes: {
    pl: string;
    en: string;
  };
}

export interface WeeklyRecoveryResult {
  weekNumber: number;
  conRoll: number;
  conTarget: number;
  outcome: RollOutcome;
  hpGained: number;
  hpLost: number;
  infectionOccurred: boolean;
  facility: RecoveryFacility;
  costIncurred: number;
  wasMajorWoundCleared: boolean;
  newScar?: HitLocationScar;
  narrativeSummary: {
    pl: string;
    en: string;
  };
  nextCharacter: Character;
}

export interface TimeSkipRecoveryResult {
  period: TimeSkipPeriod;
  daysAdvanced: number;
  facility: RecoveryFacility;
  initialHp: number;
  finalHp: number;
  hpGained: number;
  hpLost: number;
  totalCost: number;
  wasMajorWoundCleared: boolean;
  newScar?: HitLocationScar;
  weeklyLogs: WeeklyRecoveryLog[];
  narrativeSummary: {
    pl: string;
    en: string;
  };
  nextCharacter: Character;
}

export interface FirstAidResult {
  success: boolean;
  roll: number;
  targetSkill: number;
  outcome: RollOutcome;
  hpGained: number;
  stabilized: boolean;
  narrativeSummary: {
    pl: string;
    en: string;
  };
  nextCharacter: Character;
}

export interface MedicineResult {
  success: boolean;
  roll: number;
  targetSkill: number;
  outcome: RollOutcome;
  hpGained: number;
  stabilized: boolean;
  narrativeSummary: {
    pl: string;
    en: string;
  };
  nextCharacter: Character;
}

/**
 * Oblicza maksymalne punkty życia badacza (domyślnie z maxHp lub hp).
 */
export function getMaxHp(character: Character): number {
  if (typeof character.maxHp === 'number' && character.maxHp > 0) {
    return character.maxHp;
  }
  // CoC 7e RAW: (CON + SIZ) / 10
  if (typeof character.con === 'number' && typeof character.siz === 'number') {
    return Math.floor((character.con + character.siz) / 10);
  }
  return character.hp || 10;
}

/**
 * Zwraca próg Ciężkiej Rany (Major Wound Threshold: połowa maksymalnych PŻ).
 */
export function getMajorWoundThreshold(character: Character): number {
  return Math.floor(getMaxHp(character) / 2);
}

/**
 * Tabela trafień i blizn (Hit Location Table wg CoC 7e RAW & Seth Skorkowsky).
 */
export function generateHitLocationScar(forceRoll?: number): HitLocationScar {
  const roll = forceRoll !== undefined ? forceRoll : Math.floor(Math.random() * 10) + 1;

  if (roll <= 2) {
    return {
      roll,
      location: 'Udo / Nogi',
      descriptionPl: 'Głęboka szrama na udzie po postrzale lub szponie, powodująca lekkie utykanie w wilgotne dni.',
      descriptionEn: 'Deep scar on the thigh from a gunshot or claw, causing a slight limp on damp days.',
    };
  }
  if (roll <= 4) {
    return {
      roll,
      location: 'Brzuch / Bok',
      descriptionPl: 'Szeroka, nierówna blizna wzdłuż prawego boku po cięciu ostrzem lub szponem bestii.',
      descriptionEn: 'Wide, jagged scar running across the right flank from a blade or beast claw.',
    };
  }
  if (roll === 5) {
    return {
      roll,
      location: 'Klatka piersiowa',
      descriptionPl: 'Zgrubiały ślad po pękniętych żebrach i grubych szwach chirurgicznych na mostku.',
      descriptionEn: 'Thickened ridge from fractured ribs and heavy surgical sutures over the sternum.',
    };
  }
  if (roll <= 7) {
    return {
      roll,
      location: 'Ramię / Przedramię',
      descriptionPl: 'Poszarpana blizna powypadkowa wzdłuż lewego przedramienia, widoczna spod mankietu.',
      descriptionEn: 'Jagged trauma scar along the left forearm, visible beneath the shirt cuff.',
    };
  }
  if (roll === 8) {
    return {
      roll,
      location: 'Dłonie',
      descriptionPl: 'Zgrubiałe stawy i blizna po zmiażdżeniu kości śródręcza, utrudniająca precyzyjne pisanie.',
      descriptionEn: 'Thickened knuckles and scar tissue from crushed metacarpal bones, hindering fine script.',
    };
  }
  return {
    roll,
    location: 'Twarz / Szyja',
    descriptionPl: 'Blada szrama przecinająca policzek aż do linii szczęki, nadająca spojrzeniu ponury wyraz.',
    descriptionEn: 'Pale scar cutting across the cheek to the jawline, lending a grim cast to the face.',
  };
}

/**
 * Rzuca k100 z kością modyfikującą (Bonus Die lub Penalty Die) według CoC 7e RAW.
 */
export function rollD100WithModifier(
  modifier: 'none' | 'bonus' | 'penalty',
  options?: { forceRoll?: number; forceModifierTens?: number }
) {
  if (options?.forceRoll !== undefined) {
    return {
      finalRoll: options.forceRoll,
      tens: Math.floor(options.forceRoll / 10) * 10,
      modifierTens: options.forceModifierTens,
      units: options.forceRoll % 10,
    };
  }

  const units = Math.floor(Math.random() * 10);
  const tens1 = Math.floor(Math.random() * 10) * 10;

  if (modifier === 'none') {
    const roll = tens1 + units === 0 ? 100 : tens1 + units;
    return { finalRoll: roll, tens: tens1, units };
  }

  const tens2 =
    options?.forceModifierTens !== undefined
      ? options.forceModifierTens
      : Math.floor(Math.random() * 10) * 10;

  const roll1 = tens1 + units === 0 ? 100 : tens1 + units;
  const roll2 = tens2 + units === 0 ? 100 : tens2 + units;

  const finalRoll = modifier === 'bonus' ? Math.min(roll1, roll2) : Math.max(roll1, roll2);

  return {
    finalRoll,
    tens: tens1,
    modifierTens: tens2,
    units,
  };
}

/**
 * Oblicza koszt tygodniowego pobytu w wybranej placówce.
 */
export function getFacilityWeeklyCost(character: Character, facility: RecoveryFacility): number {
  if (facility === 'home' || facility === 'poor_conditions') return 0;
  if (facility === 'public_hospital') return 10;
  if (facility === 'private_clinic') {
    const cr = getCreditRating(character);
    // Jeśli postać ma Majętność >= 40, pobyt jest wliczony w standard życia (CoC 7e RAW)
    return cr >= 40 ? 0 : 100;
  }
  return 0;
}

/**
 * Pojedynczy tygodniowy test rekonwalescencji Ciężkiej Rany (CoC 7e RAW s. 120-121).
 */
export function advanceWeeklyRecovery(
  character: Character,
  facility: RecoveryFacility,
  options?: {
    weekNumber?: number;
    forceRoll?: number;
    forceHpGain?: number;
    forceHpLoss?: number;
    forceModifierTens?: number;
    forceScarRoll?: number;
  }
): WeeklyRecoveryResult {
  const weekNumber = options?.weekNumber || 1;
  const conTarget = character.con || 50;
  const maxHp = getMaxHp(character);
  const threshold = getMajorWoundThreshold(character);

  const modifier =
    facility === 'public_hospital' || facility === 'private_clinic'
      ? 'bonus'
      : facility === 'poor_conditions'
        ? 'penalty'
        : 'none';

  const { finalRoll } = rollD100WithModifier(modifier, {
    forceRoll: options?.forceRoll,
    forceModifierTens: options?.forceModifierTens,
  });

  const outcome = evaluateSkillCheck(finalRoll, conTarget);

  let hpGained = 0;
  let hpLost = 0;
  let infectionOccurred = false;
  let cleared = false;
  let newScar: HitLocationScar | undefined;

  if (outcome === 'critical' || outcome === 'extreme') {
    // Ekstremalny sukces: 2k3 (lub 1k3) oraz natychmiastowe zdjęcie Ciężkiej Rany!
    hpGained = options?.forceHpGain !== undefined ? options.forceHpGain : Math.floor(Math.random() * 3) + 1 + Math.floor(Math.random() * 3) + 1;
    cleared = true;
  } else if (outcome === 'hard' || outcome === 'regular') {
    // Zwykły sukces: 1k3 PŻ
    hpGained = options?.forceHpGain !== undefined ? options.forceHpGain : Math.floor(Math.random() * 3) + 1;
  } else if (outcome === 'fumble') {
    // Pech: infekcja / gorączka, chyba że pacjent jest w prywatnej klinice
    if (facility === 'private_clinic') {
      hpGained = 0;
      infectionOccurred = false; // Antyseptyka chroni przed powikłaniami
    } else {
      infectionOccurred = true;
      hpLost = options?.forceHpLoss !== undefined ? options.forceHpLoss : Math.floor(Math.random() * 6) + 1;
    }
  } else {
    // Zwykła porażka: brak poprawy
    hpGained = 0;
  }

  // Obliczenie nowego HP
  const nextHp = Math.max(0, Math.min(maxHp, character.hp + hpGained - hpLost));

  // Warunek zdjęcia Ciężkiej Rany: PŻ powyżej połowy maksimum
  if (!cleared && nextHp > threshold) {
    cleared = true;
  }

  const nextScars = [...(character.scars || [])];
  if (cleared) {
    newScar = generateHitLocationScar(options?.forceScarRoll);
    nextScars.push(newScar.descriptionPl);
  }

  const cost = getFacilityWeeklyCost(character, facility);
  const nextCash = typeof character.cash === 'number' ? Math.max(0, character.cash - cost) : character.cash;

  const nextCharacter: Character = {
    ...character,
    hp: nextHp,
    cash: nextCash,
    hasMajorWound: cleared ? false : character.hasMajorWound,
    isDying: nextHp > 0 ? false : character.isDying,
    isUnconscious: nextHp > 0 ? false : character.isUnconscious,
    scars: nextScars,
    healthRecoveryState: {
      daysElapsed: ((character.healthRecoveryState?.daysElapsed || 0) + 7),
      weeksElapsed: ((character.healthRecoveryState?.weeksElapsed || 0) + 1),
      facility,
      hasInfection: infectionOccurred,
      lastCheckDate: new Date().toISOString(),
    },
  };

  // Dwujęzyczne podsumowanie
  const pl = cleared
    ? `Tydzień ${weekNumber}: Udany rzut na Kondycję (${finalRoll} vs ${conTarget}). Odzyskano ${hpGained} PŻ. Ciężka Rana została zaleczona! Pozostał ślad: ${newScar?.descriptionPl}`
    : infectionOccurred
      ? `Tydzień ${weekNumber}: Krytyczna porażka (${finalRoll} vs ${conTarget})! Wdało się zakażenie i gorączka (utrata ${hpLost} PŻ). Stan badacza pogorszył się.`
      : hpGained > 0
        ? `Tydzień ${weekNumber}: Postępy w leczeniu (${finalRoll} vs ${conTarget}). Badacz odzyskuje ${hpGained} PŻ pod opieką (${facility}). Ciężka Rana nadal wymaga ostrożności.`
        : `Tydzień ${weekNumber}: Brak widocznej poprawy (${finalRoll} vs ${conTarget}). Rana nadal nie pozwala na powrót do pełnych sił.`;

  const en = cleared
    ? `Week ${weekNumber}: Successful Constitution check (${finalRoll} vs ${conTarget}). Recovered ${hpGained} HP. Major Wound has healed! A lasting mark remains: ${newScar?.descriptionEn}`
    : infectionOccurred
      ? `Week ${weekNumber}: Critical failure (${finalRoll} vs ${conTarget})! Severe infection and fever set in (lost ${hpLost} HP). Condition worsened.`
      : hpGained > 0
        ? `Week ${weekNumber}: Healing progress (${finalRoll} vs ${conTarget}). Investigator regains ${hpGained} HP under care (${facility}). Major Wound still requires caution.`
        : `Week ${weekNumber}: No discernible improvement (${finalRoll} vs ${conTarget}). The wound still prevents returning to full strength.`;

  return {
    weekNumber,
    conRoll: finalRoll,
    conTarget,
    outcome,
    hpGained,
    hpLost,
    infectionOccurred,
    facility,
    costIncurred: cost,
    wasMajorWoundCleared: cleared,
    newScar,
    narrativeSummary: { pl, en },
    nextCharacter,
  };
}

/**
 * Zwykły odpoczynek dzienny bez Ciężkiej Rany (+1 PŻ na dobę pełnego odpoczynku).
 */
export function advanceDailyRest(
  character: Character,
  days: number = 1
): { character: Character; hpGained: number; narrativeSummary: { pl: string; en: string } } {
  const maxHp = getMaxHp(character);
  const hpBefore = character.hp;
  const newHp = Math.min(maxHp, hpBefore + days);
  const hpGained = newHp - hpBefore;

  const nextCharacter: Character = {
    ...character,
    hp: newHp,
    isUnconscious: newHp > 0 ? false : character.isUnconscious,
    isDying: false,
    healthRecoveryState: {
      daysElapsed: (character.healthRecoveryState?.daysElapsed || 0) + days,
      weeksElapsed: character.healthRecoveryState?.weeksElapsed || 0,
      facility: character.healthRecoveryState?.facility || 'home',
      hasInfection: false,
      lastCheckDate: new Date().toISOString(),
    },
  };

  return {
    character: nextCharacter,
    hpGained,
    narrativeSummary: {
      pl: `Spokojny odpoczynek (${days} dni): badacz zregenerował ${hpGained} PŻ (obecnie ${newHp}/${maxHp}).`,
      en: `Restful recovery (${days} days): investigator recovered ${hpGained} HP (now ${newHp}/${maxHp}).`,
    },
  };
}

/**
 * Wykonuje pełny przeskok czasowy (Time-Skip) z symulacją leczenia według CoC 7e RAW.
 */
export function advanceTimeSkipRecovery(
  character: Character,
  period: TimeSkipPeriod,
  facility: RecoveryFacility = 'public_hospital',
  options?: {
    forceRolls?: number[];
    forceHpGains?: number[];
    forceHpLosses?: number[];
    forceScarRoll?: number;
  }
): TimeSkipRecoveryResult {
  const daysByPeriod: Record<TimeSkipPeriod, number> = {
    '1_day': 1,
    '3_days': 3,
    '1_week': 7,
    '2_weeks': 14,
    '1_month': 30,
  };

  const days = daysByPeriod[period];
  const initialHp = character.hp;

  // Wariant 1: Postać NIE ma Ciężkiej Rany
  if (!character.hasMajorWound) {
    const dailyResult = advanceDailyRest(character, days);
    return {
      period,
      daysAdvanced: days,
      facility,
      initialHp,
      finalHp: dailyResult.character.hp,
      hpGained: dailyResult.hpGained,
      hpLost: 0,
      totalCost: 0,
      wasMajorWoundCleared: false,
      weeklyLogs: [],
      narrativeSummary: dailyResult.narrativeSummary,
      nextCharacter: dailyResult.character,
    };
  }

  // Wariant 2: Postać MA Ciężką Ranę
  // Jeśli okres < 7 dni: brak rzutu tygodniowego, badacz leży w łóżku
  if (days < 7) {
    return {
      period,
      daysAdvanced: days,
      facility,
      initialHp,
      finalHp: initialHp,
      hpGained: 0,
      hpLost: 0,
      totalCost: 0,
      wasMajorWoundCleared: false,
      weeklyLogs: [],
      narrativeSummary: {
        pl: `Odpoczynek trwał ${days} dni. Ciężka Rana wymaga co najmniej pełnego tygodnia opieki (7 dni), aby przeprowadzić rzut na Kondycję.`,
        en: `Rest lasted ${days} days. A Major Wound requires at least one full week of medical care (7 days) for a Constitution recovery check.`,
      },
      nextCharacter: {
        ...character,
        healthRecoveryState: {
          daysElapsed: (character.healthRecoveryState?.daysElapsed || 0) + days,
          weeksElapsed: character.healthRecoveryState?.weeksElapsed || 0,
          facility,
          hasInfection: character.healthRecoveryState?.hasInfection || false,
          lastCheckDate: new Date().toISOString(),
        },
      },
    };
  }

  // Obliczenie liczby pełnych tygodni
  const fullWeeks = Math.floor(days / 7);
  let currentChar = { ...character };
  let totalCost = 0;
  let totalGained = 0;
  let totalLost = 0;
  let cleared = false;
  let acquiredScar: HitLocationScar | undefined;
  const logs: WeeklyRecoveryLog[] = [];

  for (let w = 1; w <= fullWeeks; w++) {
    // Jeśli Ciężka Rana została już zaleczona w poprzednim tygodniu, pozostałe dni tygodnia leczą się naturalnie (+7 PŻ)
    if (!currentChar.hasMajorWound) {
      const restRes = advanceDailyRest(currentChar, 7);
      currentChar = restRes.character;
      totalGained += restRes.hpGained;
      logs.push({
        weekNumber: w,
        conRoll: 0,
        conTarget: currentChar.con,
        outcome: 'regular',
        hpDelta: restRes.hpGained,
        infectionOccurred: false,
        notes: {
          pl: `Tydzień ${w}: Ciężka Rana zaleczona. Naturalna rekonwalescencja (+${restRes.hpGained} PŻ).`,
          en: `Week ${w}: Major Wound resolved. Natural daily healing (+${restRes.hpGained} HP).`,
        },
      });
      continue;
    }

    const forceRoll = options?.forceRolls && options.forceRolls[w - 1] !== undefined ? options.forceRolls[w - 1] : undefined;
    const forceHpGain = options?.forceHpGains && options.forceHpGains[w - 1] !== undefined ? options.forceHpGains[w - 1] : undefined;
    const forceHpLoss = options?.forceHpLosses && options.forceHpLosses[w - 1] !== undefined ? options.forceHpLosses[w - 1] : undefined;

    const weekResult = advanceWeeklyRecovery(currentChar, facility, {
      weekNumber: w,
      forceRoll,
      forceHpGain,
      forceHpLoss,
      forceScarRoll: options?.forceScarRoll,
    });

    currentChar = weekResult.nextCharacter;
    totalCost += weekResult.costIncurred;
    totalGained += weekResult.hpGained;
    totalLost += weekResult.hpLost;

    if (weekResult.wasMajorWoundCleared) {
      cleared = true;
      acquiredScar = weekResult.newScar;
    }

    logs.push({
      weekNumber: w,
      conRoll: weekResult.conRoll,
      conTarget: weekResult.conTarget,
      outcome: weekResult.outcome,
      hpDelta: weekResult.hpGained - weekResult.hpLost,
      infectionOccurred: weekResult.infectionOccurred,
      notes: weekResult.narrativeSummary,
    });
  }

  // Pozostałe dni (dla miesiąca: 30 - 28 = 2 dni)
  const remainingDays = days - fullWeeks * 7;
  if (remainingDays > 0 && !currentChar.hasMajorWound) {
    const remainingRest = advanceDailyRest(currentChar, remainingDays);
    currentChar = remainingRest.character;
    totalGained += remainingRest.hpGained;
  }

  const facilityLabels: Record<RecoveryFacility, { pl: string; en: string }> = {
    home: { pl: 'w domowej kryjówce', en: 'at home' },
    public_hospital: { pl: 'w Miejskim Szpitalu Ogólnym', en: 'at the General Hospital' },
    private_clinic: { pl: 'w prywatnej klinice dr. Pennhallowa', en: 'at Dr. Pennhallow’s private clinic' },
    poor_conditions: { pl: 'w spartańskich warunkach polowych', en: 'under harsh field conditions' },
  };

  const narrativePl = `Okres rekonwalescencji (${days} dni ${facilityLabels[facility].pl}): PŻ zmieniły się z ${initialHp} na ${currentChar.hp} (+${totalGained - totalLost}). Koszt opieki: $${totalCost}.${
    cleared ? ` Ciężka Rana została wyleczona! Pozostała blizna: ${acquiredScar?.descriptionPl}` : ' Ciężka Rana nadal wymaga opieki medycznej.'
  }`;

  const narrativeEn = `Recovery period (${days} days ${facilityLabels[facility].en}): HP changed from ${initialHp} to ${currentChar.hp} (+${totalGained - totalLost}). Medical fees: $${totalCost}.${
    cleared ? ` Major Wound has healed! Lasting scar: ${acquiredScar?.descriptionEn}` : ' Major Wound still requires medical treatment.'
  }`;

  return {
    period,
    daysAdvanced: days,
    facility,
    initialHp,
    finalHp: currentChar.hp,
    hpGained: totalGained,
    hpLost: totalLost,
    totalCost,
    wasMajorWoundCleared: cleared,
    newScar: acquiredScar,
    weeklyLogs: logs,
    narrativeSummary: {
      pl: narrativePl,
      en: narrativeEn,
    },
    nextCharacter: currentChar,
  };
}

/**
 * Pierwsza Pomoc doraźna (First Aid - CoC 7e RAW s. 122).
 * Heals 1 HP once per wound. Stabilizes dying investigator.
 */
export function applyFirstAid(
  character: Character,
  firstAidSkill: number,
  options?: { forceRoll?: number }
): FirstAidResult {
  const roll = options?.forceRoll !== undefined ? options.forceRoll : Math.floor(Math.random() * 100) + 1;
  const outcome = evaluateSkillCheck(roll, firstAidSkill);
  const maxHp = getMaxHp(character);

  let hpGained = 0;
  let stabilized = false;

  if (outcome !== 'fail' && outcome !== 'fumble') {
    hpGained = 1;
    stabilized = character.isDying === true;
  }

  const nextHp = Math.min(maxHp, character.hp + hpGained);
  const nextCharacter: Character = {
    ...character,
    hp: nextHp,
    isDying: stabilized ? false : character.isDying,
    isUnconscious: nextHp > 0 ? false : character.isUnconscious,
  };

  const pl = hpGained > 0
    ? `Pierwsza Pomoc powiodła się (${roll} vs ${firstAidSkill})! Opatrzono ranę (+1 PŻ).${stabilized ? ' Umierający badacz został ustabilizowany!' : ''}`
    : `Pierwsza Pomoc nie przyniosła skutku (${roll} vs ${firstAidSkill}). Opatrunek nie powstrzymał krwawienia.`;

  const en = hpGained > 0
    ? `First Aid succeeded (${roll} vs ${firstAidSkill})! Wound dressed (+1 HP).${stabilized ? ' The dying investigator has been stabilized!' : ''}`
    : `First Aid failed (${roll} vs ${firstAidSkill}). The dressing failed to stop the bleeding.`;

  return {
    success: hpGained > 0,
    roll,
    targetSkill: firstAidSkill,
    outcome,
    hpGained,
    stabilized,
    narrativeSummary: { pl, en },
    nextCharacter,
  };
}

/**
 * Zabieg Medycyny (Medicine - CoC 7e RAW s. 122).
 * Takes 1 hour. Heals 1d3 HP (or 2d3 on extreme).
 */
export function applyMedicine(
  character: Character,
  medicineSkill: number,
  options?: { forceRoll?: number; forceHpGain?: number }
): MedicineResult {
  const roll = options?.forceRoll !== undefined ? options.forceRoll : Math.floor(Math.random() * 100) + 1;
  const outcome = evaluateSkillCheck(roll, medicineSkill);
  const maxHp = getMaxHp(character);

  let hpGained = 0;
  let stabilized = false;

  if (outcome === 'critical' || outcome === 'extreme') {
    hpGained = options?.forceHpGain !== undefined ? options.forceHpGain : Math.floor(Math.random() * 3) + 1 + Math.floor(Math.random() * 3) + 1;
    stabilized = true;
  } else if (outcome === 'hard' || outcome === 'regular') {
    hpGained = options?.forceHpGain !== undefined ? options.forceHpGain : Math.floor(Math.random() * 3) + 1;
    stabilized = true;
  }

  const nextHp = Math.min(maxHp, character.hp + hpGained);
  const nextCharacter: Character = {
    ...character,
    hp: nextHp,
    isDying: stabilized && nextHp > 0 ? false : character.isDying,
    isUnconscious: nextHp > 0 ? false : character.isUnconscious,
  };

  const pl = hpGained > 0
    ? `Zabieg lekarski powiódł się (${roll} vs ${medicineSkill})! Podano leki i zszyto tkanki (+${hpGained} PŻ).`
    : `Zabieg lekarski nie przyniósł poprawy (${roll} vs ${medicineSkill}). Obrażenia wymagają dłuższego leczenia.`;

  const en = hpGained > 0
    ? `Medical treatment succeeded (${roll} vs ${medicineSkill})! Medication administered and tissues sutured (+${hpGained} HP).`
    : `Medical treatment was unsuccessful (${roll} vs ${medicineSkill}). Injuries require extended healing.`;

  return {
    success: hpGained > 0,
    roll,
    targetSkill: medicineSkill,
    outcome,
    hpGained,
    stabilized,
    narrativeSummary: { pl, en },
    nextCharacter,
  };
}
