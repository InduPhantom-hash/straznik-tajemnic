/**
 * Silnik Mechaniki Poczytalności i Szaleństwa (d100 Weird Fiction RPG / Clean Room)
 * Oparty na psychologii traumy klinicznej, objawach dysocjacyjnych i motywach grozy.
 */

import type { Character, ActiveBoutOfMadness } from '@/lib/types';
import { getSkillValue } from '@/lib/types';
import { rollDiceFormula } from '@/lib/dice-utils';

export type SanityEventType =
  | 'int_check_required'
  | 'temporary_insanity'
  | 'indefinite_insanity'
  | 'bout_of_madness'
  | 'edge_of_the_abyss'
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

/** Tabela objawów szaleństwa w czasie rzeczywistym (1K10 rund) - proceduralny silnik traumy d100 */
export const BOUTS_REAL_TIME: BoutDefinition[] = [
  {
    type: 'amnesia',
    title: { pl: 'Amnezja dysocjacyjna', en: 'Dissociative Amnesia' },
    description: {
      pl: 'Nagła luka pamięciowa. Świadomość cofa się do ostatniej bezpiecznej chwili, wymazując szokujące zdarzenia.',
      en: 'Acute dissociative amnesia. Consciousness retreats to the last safe memory, repressing the traumatic shock.'
    }
  },
  {
    type: 'psychosomatic',
    title: { pl: 'Zapaść psychosomatyczna', en: 'Psychosomatic Reaction' },
    description: {
      pl: 'Reakcja konwersyjna. Paraliżujący szok odcina zmysły – nagła ślepota histeryczna, głuchota lub utrata czucia w dłoniach.',
      en: 'Severe conversion reaction. Neurological shutdown triggers hysterical blindness, sensory deafness, or limb numbness.'
    }
  },
  {
    type: 'violence',
    title: { pl: 'Furia obronna i szał', en: 'Violent Fury' },
    description: {
      pl: 'Mózg przechodzi w prymitywny tryb walki o przetrwanie, atakując bezładnie wszystko w zasięgu rąk.',
      en: 'Berserk panic response. Instinctive fight mode triggers uncontrolled violent aggression against anything in reach.'
    }
  },
  {
    type: 'paranoia',
    title: { pl: 'Ostry zespół prześladowczy', en: 'Severe Paranoia' },
    description: {
      pl: 'Każde spojrzenie, szept i cień wydają się śmiertelnym spiskiem wrogich sił.',
      en: 'Acute persecutory delusion. Every shadow, whisper, and bystander feels part of an inescapable hostile conspiracy.'
    }
  },
  {
    type: 'significant_person',
    title: { pl: 'Projekcja tożsamości', en: 'Identity Projection' },
    description: {
      pl: 'W obcej twarzy badacz widzi postać ze swojej przeszłości i kurczowo szuka u niej ratunku lub prawdy.',
      en: 'Identity projection. The investigator projects a key figure from their past onto a bystander, desperately pleading for clarity.'
    }
  },
  {
    type: 'fainting',
    title: { pl: 'Omdlenie wazowagalne', en: 'Vasovagal Syncope' },
    description: {
      pl: 'Przeciążenie układu nerwowego odcina przytomność – bezwładny upadek na ziemię.',
      en: 'Vasovagal syncope. Sensory overload causes blood pressure to plummet, collapsing the investigator into unconsciousness.'
    }
  },
  {
    type: 'fleeing',
    title: { pl: 'Paniczna ucieczka', en: 'Blind Panic Flight' },
    description: {
      pl: 'Zwierzęcy odruch bezwarunkowy każe biec na oślep, byle dalej od źródła koszmaru.',
      en: 'Blind panic flight. Overwhelming survival reflex drives the investigator to run blindly away from the terror.'
    }
  },
  {
    type: 'hysteria',
    title: { pl: 'Dławiący afekt histeryczny', en: 'Hysterical Fit' },
    description: {
      pl: 'Płacz, spazmatyczny śmiech i krzyki paraliżują mowę oraz logiczne myślenie.',
      en: 'Severe emotional catharsis. Spasmodic laughter, weeping, and shouting completely shatter rational coherence.'
    }
  },
  {
    type: 'phobia',
    title: { pl: 'Wstrząs fobiczny', en: 'Phobic Episode' },
    description: {
      pl: 'Umysł kojarzy grozę z przypadkowym elementem otoczenia, wywołując paniczny lęk przed nim.',
      en: 'Acute phobic fixation. The trauma instantly binds terror to an environmental stimulus, provoking uncontrollable dread.'
    }
  },
  {
    type: 'mania',
    title: { pl: 'Kompulsywny rytuał', en: 'Compulsive Ritual' },
    description: {
      pl: 'Natrętna potrzeba powtarzania określonej czynności fizycznej jako jedynej ochrony przed rozpadem umysłu.',
      en: 'Compulsive displacement ritual. An irresistible urge to perform repetitive physical actions to fend off mental breakdown.'
    }
  }
];

/** Tabela objawów szaleństwa w podsumowaniu (1K10 godzin) - proceduralny silnik traumy d100 */
export const BOUTS_SUMMARY: BoutDefinition[] = [
  {
    type: 'amnesia',
    title: { pl: 'Przedłużona fuga dysocjacyjna', en: 'Extended Dissociative Fugue' },
    description: {
      pl: 'Badacz odzyskuje kontrolę po wielu godzinach w nieznanym miejscu, z białą plamą w pamięci.',
      en: 'Prolonged dissociative fugue. The investigator snaps back to reality hours later in an unfamiliar location with zero recollection.'
    }
  },
  {
    type: 'robbery',
    title: { pl: 'Ograbienie w letargu', en: 'Exploited in Stupor' },
    description: {
      pl: 'Podczas stanu bezradności badacz padł ofiarą rabunku, tracąc kosztowności lub ubranie.',
      en: 'Exploited in stupor. While wandering in a daze, the investigator was robbed or stripped of valuables and equipment.'
    }
  },
  {
    type: 'violence_aftermath',
    title: { pl: 'Ślady niepamiętanego starcia', en: 'Aftermath of Violence' },
    description: {
      pl: 'Przebudzenie z potłuczonymi dłońmi, w zniszczonym ubraniu lub pod kluczem strażników.',
      en: 'Aftermath of unremembered conflict. Awakening with bruised knuckles, torn clothes, or behind lock and key in a cell.'
    }
  },
  {
    type: 'delirium',
    title: { pl: 'Barykada paranoiczna', en: 'Paranoid Barricade' },
    description: {
      pl: 'Długie godziny spędzone w ciemnej kryjówce na nasłuchiwaniu urojonych kroków za drzwiami.',
      en: 'Paranoid barricade. Hours spent concealed in total darkness, obsessively listening for imaginary footsteps outside.'
    }
  },
  {
    type: 'wandering',
    title: { pl: 'Błędny trans', en: 'Aimless Wandering' },
    description: {
      pl: 'Przemierzenie bez celu wielu mil wzdłuż torów, ulic lub bagien aż do fizycznego wyczerpania.',
      en: 'Aimless fugue state. Miles traversed through streets, tracks, or fields in an exhaustion-inducing hypnotic trance.'
    }
  },
  {
    type: 'institutionalized',
    title: { pl: 'Izolacja sanitarna', en: 'Protective Custody' },
    description: {
      pl: 'Przerażeni świadkowie wezwali lekarzy lub straż – badacz budzi się skrępowany pod obserwacją.',
      en: 'Protective custody. Alarmed bystanders called authorities, leaving the investigator confined under medical observation.'
    }
  },
  {
    type: 'fleeing_transit',
    title: { pl: 'Ucieczka za horyzont', en: 'Distant Transit' },
    description: {
      pl: 'Powrót świadomości w wagonie dalekobieżnym lub ładowni statku płynącego w nieznane.',
      en: 'Distant transit. Consciousness re-emerges inside a long-distance rail carriage or a cargo vessel far from the origin.'
    }
  },
  {
    type: 'nervous_breakdown',
    title: { pl: 'Głęboki stupor katatoniczny', en: 'Catatonic Stupor' },
    description: {
      pl: 'Odrętwienie emocjonalne przerywane drżeniem mięśni i falami cichego szlochu.',
      en: 'Catatonic stupor. Prolonged emotional shutdown interrupted only by tremors and bouts of silent weeping.'
    }
  },
  {
    type: 'entrenched_phobia',
    title: { pl: 'Utrwalona trauma fobiczna', en: 'Entrenched Phobia' },
    description: {
      pl: 'Trwałe skrzywienie percepcji – dany widok lub dźwięk natychmiast wywołuje poty i drżenie.',
      en: 'Entrenched phobic trauma. Permanent cognitive association where a specific trigger instantly induces panic and cold sweats.'
    }
  },
  {
    type: 'entrenched_mania',
    title: { pl: 'Natrętny nawyk ochronny', en: 'Obsessive Ritual' },
    description: {
      pl: 'Wykształcenie dziwacznego nawyku lub przesądu, bez którego badacz nie jest w stanie zasnąć.',
      en: 'Obsessive protective ritual. Development of a compulsive ritual or talismanic fixation indispensable for peace of mind.'
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
 * Redukuje stratę Poczytalności kosztem punktów Szczęścia (Pulp Cthulhu RAW, s. 65).
 * - Standardowo w Pulpie: 2 punkty Szczęścia za 1 punkt redukcji straty SAN (do 50% redukcji).
 * - Z talentem 'Nerwy ze Stali' (iron_nerves): 1 punkt Szczęścia za 1 punkt redukcji straty SAN (1:1).
 */
export function reduceSanityLossWithLuck(
  character: Character,
  rawSanLoss: number,
  luckPointsToSpend?: number
): {
  reducedLoss: number;
  luckSpent: number;
  hasIronNerves: boolean;
  nextCharacter: Character;
} {
  if (rawSanLoss <= 0) {
    return { reducedLoss: 0, luckSpent: 0, hasIronNerves: false, nextCharacter: character };
  }

  const currentLuck = character.luck ?? 0;
  const hasIronNerves = Boolean(
    character.pulpTalents?.some(
      (t) => t === 'iron_nerves' || t.toLowerCase().includes('nerwy ze stali')
    )
  );

  const luckRatio = hasIronNerves ? 1 : 2;
  const maxSanReduction = hasIronNerves ? rawSanLoss : Math.floor(rawSanLoss / 2);

  if (maxSanReduction <= 0) {
    return { reducedLoss: rawSanLoss, luckSpent: 0, hasIronNerves, nextCharacter: character };
  }

  const maxLuckNeeded = maxSanReduction * luckRatio;
  const availableLuck =
    luckPointsToSpend !== undefined
      ? Math.min(currentLuck, luckPointsToSpend)
      : currentLuck;

  const actualLuckSpent = Math.min(maxLuckNeeded, availableLuck);
  const actualSanReduction = Math.floor(actualLuckSpent / luckRatio);
  const finalLuckSpent = actualSanReduction * luckRatio;

  const reducedLoss = Math.max(0, rawSanLoss - actualSanReduction);
  const nextCharacter: Character = {
    ...character,
    luck: Math.max(0, currentLuck - finalLuckSpent),
  };

  return {
    reducedLoss,
    luckSpent: finalLuckSpent,
    hasIronNerves,
    nextCharacter,
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

  // Jeśli postać była już na krawędzi otchłani (Fail-Forward już wykorzystane), każda kolejna utrata SAN oznacza Permanent Insanity
  if (next.edgeOfTheAbyss && effectiveLoss > 0) {
    const actualLoss = next.san;
    next.san = 0;
    next.dailySanLoss = (next.dailySanLoss ?? 0) + actualLoss;
    next.insanityState = 'permanent';
    events.push({
      type: 'permanent_insanity',
      characterId: next.id,
      characterName: next.name,
      loss: actualLoss,
      reason,
      message: {
        pl: `${next.name} przekracza ostateczną granicę i popada w nieodwracalny obłęd (Permanent Insanity).`,
        en: `${next.name} crosses the final threshold and collapses into permanent insanity.`
      }
    });
    return { nextCharacter: next, events };
  }

  // Odejmij punkty
  const prevSan = next.san;
  next.san = Math.max(0, prevSan - effectiveLoss);
  const actualLoss = prevSan - next.san;

  // Akumuluj stratę dzienną
  next.dailySanLoss = (next.dailySanLoss ?? 0) + actualLoss;

  // 1. Sprawdzenie progu 0 SAN -> Fail-Forward "Na krawędzi otchłani" (Issue #372)
  if (next.san <= 0) {
    if (!next.edgeOfTheAbyss) {
      // Pierwsza tarcza ocalenia: Obłąkańczy Trans / Zastrzyk Adrenaliny
      next.edgeOfTheAbyss = true;
      const boostRoll = rollDiceFormula('1d10');
      const sanBoost = boostRoll ? boostRoll.total : Math.floor(Math.random() * 10) + 1;
      next.san = sanBoost;
      next.lastFrenzySanBoost = sanBoost;
      next.insanityState = 'indefinite';
      next.underlyingInsanity = true;

      const bout = rollBoutOfMadness('real_time', options?.forceBoutIndex);
      next.activeBoutOfMadness = bout;

      events.push({
        type: 'edge_of_the_abyss',
        characterId: next.id,
        characterName: next.name,
        loss: actualLoss,
        reason,
        bout,
        message: {
          pl: `${next.name} staje na krawędzi otchłani obłędu! Umysł pęka, lecz pierwotny instynkt i szał walki dają ostatni zastrzyk ${sanBoost} PP w stanie amoku. Każda kolejna utrata Poczytalności będzie nieodwracalna.`,
          en: `${next.name} stands on the edge of the abyss! The mind shatters, but raw adrenaline and frenzy grant a final surge of ${sanBoost} SAN in a state of delirium. Any further Sanity loss will be irreversible.`
        }
      });
      return { nextCharacter: next, events };
    }

    // Jeśli postać była już na krawędzi otchłani -> Trwały Obłęd (Permanent Insanity)
    next.insanityState = 'permanent';
    events.push({
      type: 'permanent_insanity',
      characterId: next.id,
      characterName: next.name,
      loss: actualLoss,
      reason,
      message: {
        pl: `${next.name} przekracza ostateczną granicę i popada w nieodwracalny obłęd (Permanent Insanity).`,
        en: `${next.name} crosses the final threshold and collapses into permanent insanity.`
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

export * from './sanity-recovery';
