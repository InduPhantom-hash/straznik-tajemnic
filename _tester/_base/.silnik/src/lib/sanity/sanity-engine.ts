/**
 * Silnik Mechaniki Poczytalności i Szaleństwa (Call of Cthulhu 7e RAW)
 * Zgodny z "Księgą Strażnika CoC 7e" (Rozdział 8, s. 171-186 i s. 469-470)
 * oraz audytem /aios-vibe-coder (Issue #48).
 */

import type { Character, ActiveBoutOfMadness } from '@/lib/types';
import { getSkillValue } from '@/lib/types';
import { rollDiceFormula } from '@/lib/dice-utils';

export type SanityEventType =
  | 'int_check_required'
  | 'temporary_insanity'
  | 'indefinite_insanity'
  | 'bout_of_madness'
  | 'permanent_insanity'
  | 'sanity_restored';

export interface SanityEvent {
  type: SanityEventType;
  characterId: string;
  characterName: string;
  loss: number;
  reason?: string;
  bout?: ActiveBoutOfMadness;
  message: {
    pl: string;
    en: string;
  };
}

export interface BoutDefinition {
  type: string;
  title: { pl: string; en: string };
  description: { pl: string; en: string };
}

/** Tabela VII: Ataki szaleństwa w czasie rzeczywistym (1K10 rund) - CoC 7e s. 470 */
export const BOUTS_REAL_TIME: BoutDefinition[] = [
  {
    type: 'amnesia',
    title: { pl: 'Amnezja', en: 'Amnesia' },
    description: {
      pl: 'Badacz nie pamięta wydarzeń od ostatniego bezpiecznego miejsca. Wydaje mu się, że przed chwilą jadł śniadanie.',
      en: 'The investigator has no memory of events since last in safety. It seems as though they were just eating breakfast.'
    }
  },
  {
    type: 'psychosomatic',
    title: { pl: 'Choroba psychosomatyczna', en: 'Psychosomatic condition' },
    description: {
      pl: 'Badacz doznaje nagłej ślepoty, głuchoty lub utraty czucia w kończynach na tle nerwowym.',
      en: 'The investigator suffers hysterical blindness, deafness, or numbness of limbs.'
    }
  },
  {
    type: 'violence',
    title: { pl: 'Przemoc i szał', en: 'Violence' },
    description: {
      pl: 'Czerwona mgła szału: badacz rzuca się z furią na otoczenie, sojuszników i wrogów.',
      en: 'A red haze of rage: the investigator erupts into physical aggression against enemies and allies alike.'
    }
  },
  {
    type: 'paranoia',
    title: { pl: 'Ciężka paranoja', en: 'Paranoia' },
    description: {
      pl: 'Wszyscy chcą go zabić! Nikomu nie można ufać, wszystko jest spiskiem i złudzeniem.',
      en: 'Severe paranoia: everyone is out to get them, no one can be trusted, everything is an illusion.'
    }
  },
  {
    type: 'significant_person',
    title: { pl: 'Urojenie: Ważna osoba', en: 'Delusion: Significant Person' },
    description: {
      pl: 'Badacz bierze kogoś obcego za kluczową osobę ze swojej przeszłości i rozpoczyna z nią interakcję.',
      en: 'The investigator mistakes someone nearby for a significant person from their backstory.'
    }
  },
  {
    type: 'fainting',
    title: { pl: 'Omdlenie', en: 'Fainting' },
    description: {
      pl: 'Umysł odmawia posłuszeństwa – badacz osuwa się bez przytomności na ziemię.',
      en: 'The investigator collapses to the floor unconscious.'
    }
  },
  {
    type: 'fleeing',
    title: { pl: 'Paniczna ucieczka', en: 'Panicked flight' },
    description: {
      pl: 'Niepohamowany przymus ucieczki wszelkimi dostępnymi środkami jak najdalej stąd.',
      en: 'An overwhelming urge to flee as far away as possible by any available means.'
    }
  },
  {
    type: 'hysteria',
    title: { pl: 'Atak histerii', en: 'Hysteria' },
    description: {
      pl: 'Niekontrolowany wybuch płaczu, śmiechu lub obłąkańczego krzyku paraliżujący racjonalne działanie.',
      en: 'Uncontrollable crying, laughing, or screaming that overwhelms rational action.'
    }
  },
  {
    type: 'phobia',
    title: { pl: 'Ostry epizod fobii', en: 'Phobic episode' },
    description: {
      pl: 'Badacz doznaje natychmiastowego lęku fobicznego i widzi bodziec fobii nawet tam, gdzie go nie ma.',
      en: 'The investigator gains a phobia or hallucinates its presence, imposing a penalty die.'
    }
  },
  {
    type: 'mania',
    title: { pl: 'Epizod maniakalny', en: 'Manic episode' },
    description: {
      pl: 'Badacz ulega natrętnemu, obłąkańczemu przymusowi wykonania określonej czynności.',
      en: 'The investigator gives in to a compulsive manic ritual.'
    }
  }
];

/** Tabela X: Ataki szaleństwa – Podsumowanie (1K10 godzin) - CoC 7e s. 470 */
export const BOUTS_SUMMARY: BoutDefinition[] = [
  {
    type: 'amnesia',
    title: { pl: 'Długotrwała amnezja', en: 'Extended Amnesia' },
    description: {
      pl: 'Badacz odzyskuje świadomość w obcym miejscu, nie pamiętając ostatnich godzin ani tego, co robił.',
      en: 'The investigator comes to hours later in an unfamiliar place with no memory of what happened.'
    }
  },
  {
    type: 'robbery',
    title: { pl: 'Okradziony / Splądrowany', en: 'Robbed / Stripped' },
    description: {
      pl: 'Badacz budzi się ograbiony ze swoich cennych rzeczy lub bez odzieży.',
      en: 'The investigator regains awareness having been robbed or stripped of valuables.'
    }
  },
  {
    type: 'violence_aftermath',
    title: { pl: 'Skutki szału', en: 'Aftermath of Violence' },
    description: {
      pl: 'Badacz odzyskuje kontrolę z zakrwawionymi dłońmi lub w areszcie policyjnym.',
      en: 'The investigator comes round with bloodied knuckles or locked in a jail cell.'
    }
  },
  {
    type: 'delirium',
    title: { pl: 'Paranoiczne majaczenie', en: 'Delirium & Paranoia' },
    description: {
      pl: 'Godziny spędzone w kryjówce, w przekonaniu o wszechobecnym pościgu i podsłuchach.',
      en: 'Hours spent barricaded in hiding, convinced spies and cultists lurk everywhere.'
    }
  },
  {
    type: 'wandering',
    title: { pl: 'Błędna wędrówka', en: 'Aimless Wandering' },
    description: {
      pl: 'Badacz w transie przeszedł wiele kilometrów, budząc się w rowie lub na nieznanej stacji kolejowej.',
      en: 'The investigator spent hours wandering aimlessly, waking up miles away.'
    }
  },
  {
    type: 'institutionalized',
    title: { pl: 'Izolacja / Przytułek', en: 'Institutionalized' },
    description: {
      pl: 'Świadkowie uznali badacza za obłąkanego i wezwali sanitariuszy lub policję.',
      en: 'Witnesses found the investigator raving and committed them to observation.'
    }
  },
  {
    type: 'fleeing_transit',
    title: { pl: 'Ucieczka pociągiem / statkiem', en: 'Flight in Transit' },
    description: {
      pl: 'Badacz dochodzi do siebie w pociągu lub samochodzie, jadąc setki kilometrów od miejsca zdarzenia.',
      en: 'The investigator comes round aboard a departing train or passenger vessel.'
    }
  },
  {
    type: 'nervous_breakdown',
    title: { pl: 'Załamanie nerwowe', en: 'Nervous Breakdown' },
    description: {
      pl: 'Długotrwały stupor i apatię przerywają nagłe ataki paniki.',
      en: 'Prolonged emotional collapse and stupor punctuated by panic.'
    }
  },
  {
    type: 'entrenched_phobia',
    title: { pl: 'Utrwalona fobia', en: 'Entrenched Phobia' },
    description: {
      pl: 'Umysł badacza zakotwiczył głęboki lęk przed nowym bodźcem ze sceny grozy.',
      en: 'A deep-seated phobia forms around a key element of the traumatic encounter.'
    }
  },
  {
    type: 'entrenched_mania',
    title: { pl: 'Utrwalona mania', en: 'Entrenched Mania' },
    description: {
      pl: 'Badacz zyskuje obsesyjny rytuał bezpieczeństwa, który musi powtarzać.',
      en: 'The investigator adopts a bizarre obsessive habit or fixation.'
    }
  }
];

/**
 * Wylicza faktyczną utratę SAN uwzględniając:
 * 1. Próg Mity Cthulhu > Poczytalność (RAW: strata SAN jest wtedy dzielona na pół na stałe)
 */
export function calculateEffectiveSanLoss(
  character: Character,
  rawLoss: number
): { effectiveLoss: number; mythosHalved: boolean; mythosActive: boolean } {
  if (rawLoss <= 0) {
    return { effectiveLoss: 0, mythosHalved: false, mythosActive: false };
  }

  // Sprawdź umiejętność Mitów Cthulhu
  const mythosSkill = character.skills?.['Mity Cthulhu'] ?? character.skills?.['Cthulhu Mythos'];
  const mythosVal = getSkillValue(mythosSkill);

  const isMythosHigher = character.mythosExceedsSanity === true || mythosVal > character.san;

  if (isMythosHigher) {
    // RAW: badacz oswaja grozę kosmiczną - wszystkie straty SAN dzielone na pół (zaokrąglane w dół, min. 1)
    const halved = Math.max(1, Math.floor(rawLoss / 2));
    return {
      effectiveLoss: halved,
      mythosHalved: true,
      mythosActive: true
    };
  }

  return {
    effectiveLoss: rawLoss,
    mythosHalved: false,
    mythosActive: false
  };
}

/**
 * Losuje lub wybiera Atak Szaleństwa z oficjalnej tabeli CoC 7e.
 */
export function rollBoutOfMadness(
  mode: 'real_time' | 'summary' = 'real_time',
  forceIndex?: number
): ActiveBoutOfMadness {
  const table = mode === 'real_time' ? BOUTS_REAL_TIME : BOUTS_SUMMARY;
  const unit = mode === 'real_time' ? 'rounds' : 'hours';

  let index: number;
  let duration: number;

  if (forceIndex !== undefined && forceIndex >= 0 && forceIndex < table.length) {
    index = forceIndex;
    duration = 5; // Domyślna średnia
  } else {
    // Rzut 1k10 (indeks 0..9)
    const roll = rollDiceFormula('1d10');
    duration = roll ? roll.total : Math.floor(Math.random() * 10) + 1;
    index = Math.min(table.length - 1, Math.max(0, duration - 1));
  }

  const bout = table[index];

  return {
    id: `bout_${Date.now()}_${bout.type}`,
    type: bout.type,
    title: bout.title.pl,
    description: bout.description.pl,
    unit,
    duration,
    startedAtTimestamp: new Date().toISOString()
  };
}

/**
 * Główna funkcja aplikująca zmianę SAN z pełną egzekucją progów CoC 7e RAW:
 * 1. Utrata >= 5 SAN w pojedynczym rzucie -> wymusza zdarzenie 'int_check_required'
 * 2. Utrata >= 1/5 startowej dziennej SAN -> Czasowa Niepoczytalność ('indefinite_insanity') + 'underlyingInsanity'
 * 3. Jeśli postać ma 'underlyingInsanity' -> każda utrata SAN wyzwala natychmiastowy atak szaleństwa
 * 4. SAN <= 0 -> Nieodwracalny obłęd ('permanent_insanity')
 */
export function applySanityDelta(
  character: Character,
  rawDelta: number,
  reason?: string,
  options?: {
    mode?: 'real_time' | 'summary';
    forceBoutIndex?: number;
  }
): { nextCharacter: Character; events: SanityEvent[] } {
  if (rawDelta === 0) {
    return { nextCharacter: character, events: [] };
  }

  const events: SanityEvent[] = [];
  const next: Character = { ...character };

  // Inicjalizacja startowej SAN doby gry, jeśli brak
  if (next.dayStartSan === undefined || next.dayStartSan <= 0) {
    next.dayStartSan = next.san;
  }

  // Wzrost SAN (leczenie / nagroda)
  if (rawDelta > 0) {
    const maxAllowedSan = next.maxSan ?? 99;
    const newSan = Math.min(maxAllowedSan, next.san + rawDelta);
    const gain = newSan - next.san;
    next.san = newSan;

    if (gain > 0) {
      events.push({
        type: 'sanity_restored',
        characterId: next.id,
        characterName: next.name,
        loss: -gain,
        reason,
        message: {
          pl: `${next.name} odzyskuje ${gain} PP (${reason || 'nagroda / terapia'}).`,
          en: `${next.name} regains ${gain} SAN (${reason || 'reward / therapy'}).`
        }
      });
    }

    return { nextCharacter: next, events };
  }

  // UTRATA SAN (rawDelta < 0)
  const rawLoss = Math.abs(rawDelta);
  const { effectiveLoss, mythosActive } = calculateEffectiveSanLoss(next, rawLoss);

  if (mythosActive) {
    next.mythosExceedsSanity = true;
  }

  // Odejmij punkty
  const prevSan = next.san;
  next.san = Math.max(0, prevSan - effectiveLoss);
  const actualLoss = prevSan - next.san;

  // Akumuluj stratę dzienną
  next.dailySanLoss = (next.dailySanLoss ?? 0) + actualLoss;

  // 1. Sprawdzenie progu 0 SAN -> Trwały Obłęd (Permanent Insanity)
  if (next.san <= 0) {
    next.insanityState = 'permanent';
    events.push({
      type: 'permanent_insanity',
      characterId: next.id,
      characterName: next.name,
      loss: actualLoss,
      reason,
      message: {
        pl: `${next.name} traci ostatnie punkty Poczytalności i popada w nieodwracalny obłęd (Permanent Insanity).`,
        en: `${next.name} loses their final Sanity points and collapses into permanent insanity.`
      }
    });
    return { nextCharacter: next, events };
  }

  // 2. Sprawdzenie progu 1/5 dziennej utraty -> Czasowa Niepoczytalność (Indefinite Insanity)
  const dayThreshold = Math.floor((next.dayStartSan ?? prevSan) / 5);
  const reachedDailyThreshold = dayThreshold > 0 && next.dailySanLoss >= dayThreshold;

  if (reachedDailyThreshold && next.insanityState !== 'indefinite' && next.insanityState !== 'permanent') {
    next.insanityState = 'indefinite';
    next.underlyingInsanity = true;

    // Przekroczenie 1/5 natychmiast odpala Atak Szaleństwa
    const bout = rollBoutOfMadness(options?.mode ?? 'real_time', options?.forceBoutIndex);
    next.activeBoutOfMadness = bout;

    events.push({
      type: 'indefinite_insanity',
      characterId: next.id,
      characterName: next.name,
      loss: actualLoss,
      reason,
      bout,
      message: {
        pl: `${next.name} traci 1/5 Poczytalności w ciągu doby (${next.dailySanLoss}/${dayThreshold} PP) – popada w Czasową Niepoczytalność! Atak: ${bout.title} (${bout.duration} ${bout.unit === 'rounds' ? 'rund' : 'godzin'}).`,
        en: `${next.name} has lost 1/5 of their Sanity today (${next.dailySanLoss}/${dayThreshold} SAN) – succumbing to Indefinite Insanity! Bout: ${bout.title} (${bout.duration} ${bout.unit}).`
      }
    });
  }
  // 3. Jeśli badacz ma stan Ukrytej Niepoczytalności i nie wyzwolił przed chwilą indefinite_insanity
  else if (next.underlyingInsanity === true && actualLoss > 0) {
    const bout = rollBoutOfMadness(options?.mode ?? 'real_time', options?.forceBoutIndex);
    next.activeBoutOfMadness = bout;

    events.push({
      type: 'bout_of_madness',
      characterId: next.id,
      characterName: next.name,
      loss: actualLoss,
      reason,
      bout,
      message: {
        pl: `Ukryta niepoczytalność: utrata ${actualLoss} PP wyzwala kolejny Atak Szaleństwa: ${bout.title} (${bout.duration} ${bout.unit === 'rounds' ? 'rund' : 'godzin'}).`,
        en: `Underlying Insanity: losing ${actualLoss} SAN triggers a new Bout of Madness: ${bout.title} (${bout.duration} ${bout.unit}).`
      }
    });
  }
  // 4. Sprawdzenie jednorazowej utraty >= 5 SAN -> Wymóg Testu Inteligencji (INT check)
  else if (effectiveLoss >= 5) {
    events.push({
      type: 'int_check_required',
      characterId: next.id,
      characterName: next.name,
      loss: actualLoss,
      reason,
      message: {
        pl: `${next.name} traci ${actualLoss} PP w jednym rzucie (≥ 5)! Wymagany Test Inteligencji: porażka chroni umysł, sukces wywoła Chwilową Niepoczytalność.`,
        en: `${next.name} lost ${actualLoss} SAN in a single event (≥ 5)! Intelligence test required: failure protects the mind, success triggers Temporary Insanity.`
      }
    });
  }

  return { nextCharacter: next, events };
}

/**
 * Rozstrzyga wynik Testu Inteligencji po stracie >= 5 SAN:
 * - Porażka w teście INT: Zbawienne wyparcie. Postać nie popada w obłęd.
 * - Sukces w teście INT: Zrozumienie potworności -> Chwilowa Niepoczytalność (Bout of Madness).
 */
export function resolveIntelligenceTest(
  character: Character,
  intPassed: boolean,
  options?: {
    mode?: 'real_time' | 'summary';
    forceBoutIndex?: number;
  }
): { nextCharacter: Character; bout?: ActiveBoutOfMadness; event?: SanityEvent } {
  const next: Character = { ...character };

  if (!intPassed) {
    // Porażka testu INT: postać racjonalizuje i wypiera
    return {
      nextCharacter: next,
      event: {
        type: 'temporary_insanity',
        characterId: next.id,
        characterName: next.name,
        loss: 0,
        message: {
          pl: `${next.name} nie zdaje testu Inteligencji – umysł wypiera grozę (racjonalizacja). Brak ataku szaleństwa!`,
          en: `${next.name} failed the Intelligence test – the mind rationalizes the horror. No bout of madness!`
        }
      }
    };
  }

  // Sukces testu INT: badacz rozumie grozę i popada w Chwilową Niepoczytalność
  next.insanityState = 'temporary';
  const bout = rollBoutOfMadness(options?.mode ?? 'real_time', options?.forceBoutIndex);
  next.activeBoutOfMadness = bout;

  const event: SanityEvent = {
    type: 'temporary_insanity',
    characterId: next.id,
    characterName: next.name,
    loss: 0,
    bout,
    message: {
      pl: `${next.name} zdaje test Inteligencji i w pełni pojmuje koszmar! Chwilowa Niepoczytalność: ${bout.title} (${bout.duration} ${bout.unit === 'rounds' ? 'rund' : 'godzin'}).`,
      en: `${next.name} passed the Intelligence test and fully grasps the horror! Temporary Insanity: ${bout.title} (${bout.duration} ${bout.unit}).`
    }
  };

  return { nextCharacter: next, bout, event };
}

/**
 * Resetuje dzienną kalkulację utraty SAN (np. po odpoczynku / na początku nowego dnia śledztwa).
 */
export function resetDailySanTracking(character: Character): Character {
  return {
    ...character,
    dayStartSan: character.san,
    dailySanLoss: 0,
    // Jeśli niepoczytalność była tylko chwilowa, odpoczynek ją usuwa
    insanityState: character.insanityState === 'temporary' ? 'none' : character.insanityState,
    activeBoutOfMadness: null
  };
}
