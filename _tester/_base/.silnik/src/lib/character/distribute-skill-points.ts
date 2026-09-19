/**
 * Deterministyczny przydział punktów na umiejętności rekomendowane.
 *
 * BUG #1 (fix/skill-points): wcześniej auto-przydział oddawał cały rozdział
 * swobodnemu LLM, który nie trafiał w rekomendowane (archetyp ∪ zawód) -
 * zostawały na wartości bazowej (często 1). Highlight ★ i realny przydział
 * były dwiema rozłącznymi ścieżkami.
 *
 * Ten helper zaspokaja rekomendowane DETERMINISTYCZNIE i NAJPIERW (równo,
 * każdą do limitu 75%), zużywając pulę. Resztę puli wywołujący oddaje
 * AI/losowo jak dotąd. Operuje wyłącznie na kanonicznych kluczach z
 * `buildRecommendedSkills` (specjalizacje znormalizowane), więc punkty nie
 * uciekają do "kluczy-widm" spoza `BASE_SKILLS`.
 */

import { BASE_SKILLS } from '../data/character/skills';

export interface DistributeRecommendedInput {
  /** Znormalizowane nazwy umiejętności (archetyp ∪ zawód) - patrz buildRecommendedSkills. */
  recommendedSkills: readonly string[];
  /** Aktualne wartości umiejętności (kopia stanu). */
  currentSkills: Record<string, number>;
  /** Pula punktów do rozdania (zawodowe + zainteresowań - Majętność). */
  totalPoints: number;
  /** Zwraca wartość bazową dla danej umiejętności (BASE_SKILLS + dynamiczne). */
  getBaseValue: (skill: string) => number;
  /** Zwraca maksymalną wartość umiejętności przy tworzeniu (75% lub wyjątek). */
  getMaxValue: (skill: string) => number;
}

export interface DistributeRecommendedResult {
  /** Nowa mapa umiejętności (kopia wejścia z podniesionymi rekomendowanymi). */
  skills: Record<string, number>;
  /** Liczba punktów faktycznie wydanych na rekomendowane. */
  pointsUsed: number;
  /** Pozostała pula punktów do rozdania przez AI/losowo. */
  remainingPoints: number;
}

/**
 * Rozdaje pulę po równo na rekomendowane umiejętności, klampując do limitu 75%.
 *
 * Algorytm: rundy round-robin po rekomendowanych. W każdej rundzie każdej
 * umiejętności dokłada równą porcję (`share`, min. 1), nigdy nie przekraczając
 * `getMaxValue`. Powtarza aż pula się wyczerpie lub wszystkie rekomendowane
 * osiągną limit. Suma podniesień = `pointsUsed`, reszta wraca jako
 * `remainingPoints` (do AI/losowo).
 *
 * Determinizm: zero `Math.random`. Te same wejścia → ten sam wynik.
 */
export function distributeRecommendedSkillPoints(
  input: DistributeRecommendedInput
): DistributeRecommendedResult {
  const { recommendedSkills, totalPoints, getBaseValue, getMaxValue } = input;
  const skills: Record<string, number> = { ...input.currentSkills };

  let remainingPoints = Math.max(0, Math.floor(totalPoints));
  let pointsUsed = 0;

  // Unikalne, znane umiejętności (bez duplikatów). Każda musi mieć "miejsce"
  // do wzrostu (current < max), inaczej nie ma sensu jej rozważać.
  const targets = Array.from(new Set(recommendedSkills));

  if (targets.length === 0 || remainingPoints <= 0) {
    return { skills, pointsUsed, remainingPoints };
  }

  // Pętla bezpieczna - kończy się gdy pula = 0 albo żaden cel nie przyjmie więcej.
  let progressed = true;
  while (remainingPoints > 0 && progressed) {
    progressed = false;

    // Cele, które jeszcze mogą rosnąć w tej rundzie.
    const open = targets.filter((skill) => {
      const base = getBaseValue(skill);
      const current = skills[skill] ?? base;
      return current < getMaxValue(skill);
    });

    if (open.length === 0) break;

    // Równa porcja na cel (min. 1), nie więcej niż dostępna pula.
    const share = Math.max(1, Math.floor(remainingPoints / open.length));

    for (const skill of open) {
      if (remainingPoints <= 0) break;

      const base = getBaseValue(skill);
      const max = getMaxValue(skill);
      const current = skills[skill] ?? base;
      if (current >= max) continue;

      const room = max - current;
      const add = Math.min(share, room, remainingPoints);
      if (add <= 0) continue;

      skills[skill] = current + add;
      remainingPoints -= add;
      pointsUsed += add;
      progressed = true;
    }
  }

  return { skills, pointsUsed, remainingPoints };
}

export interface FillRemainingInput {
  /** Aktualna mapa umiejętności */
  skills: Record<string, number>;
  /** Pula punktów do dopełnienia */
  remainingPoints: number;
  /** Umiejętności priorytetowe (np. wybrane przez AI lub zawód) */
  prioritySkills?: readonly string[];
  /** Wartość bazowa umiejętności */
  getBaseValue: (skill: string) => number;
  /** Maksymalna wartość umiejętności */
  getMaxValue: (skill: string) => number;
}

export interface FillRemainingResult {
  skills: Record<string, number>;
  pointsUsed: number;
  remainingPoints: number;
}

/**
 * Deterministycznie dopełnia brakujące punkty umiejętności (np. po niedoszacowaniu przez AI).
 * Zero Math.random - czysty round-robin najpierw po prioritySkills, a potem po alfabetycznej liście BASE_SKILLS.
 */
export function fillRemainingSkillPoints(
  input: FillRemainingInput
): FillRemainingResult {
  const { prioritySkills, getBaseValue, getMaxValue } = input;
  const skills: Record<string, number> = { ...input.skills };
  let remaining = Math.max(0, Math.floor(input.remainingPoints));
  let pointsUsed = 0;

  if (remaining <= 0) {
    return { skills, pointsUsed, remainingPoints: 0 };
  }

  const EXCLUDED_SKILLS = new Set(['Majętność', 'Mity Cthulhu']);

  const runRounds = (targetSkills: string[]) => {
    let progressed = true;
    while (remaining > 0 && progressed) {
      progressed = false;
      const open = targetSkills.filter((s) => {
        if (EXCLUDED_SKILLS.has(s)) return false;
        const base = getBaseValue(s);
        const current = skills[s] ?? base;
        return current < getMaxValue(s);
      });

      if (open.length === 0) break;

      const share = Math.max(1, Math.floor(remaining / open.length));
      for (const s of open) {
        if (remaining <= 0) break;
        const base = getBaseValue(s);
        const max = getMaxValue(s);
        const current = skills[s] ?? base;
        if (current >= max) continue;

        const room = max - current;
        const add = Math.min(share, room, remaining);
        if (add <= 0) continue;

        skills[s] = current + add;
        remaining -= add;
        pointsUsed += add;
        progressed = true;
      }
    }
  };

  // 1. Priorytetowe umiejętności (posortowane alfabetycznie dla pełnego determinizmu)
  if (prioritySkills && prioritySkills.length > 0) {
    const sortedPriority = Array.from(new Set(prioritySkills))
      .filter((s) => !EXCLUDED_SKILLS.has(s))
      .sort((a, b) => a.localeCompare(b, 'pl'));
    runRounds(sortedPriority);
  }

  // 2. Jeśli punkty wciąż zostały: wszystkie pozostałe umiejętności bazowe (alfabetycznie)
  if (remaining > 0) {
    const allBase = Object.keys(BASE_SKILLS)
      .filter((s) => !EXCLUDED_SKILLS.has(s))
      .sort((a, b) => a.localeCompare(b, 'pl'));
    runRounds(allBase);
  }

  return { skills, pointsUsed, remainingPoints: remaining };
}

