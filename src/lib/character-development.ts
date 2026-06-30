// Purystyczny System Rozwoju Postaci (Call of Cthulhu 7th Edition)
// Zgodny z oficjalnymi zasadami Księgi Strażnika v7
// Brak systemu XP - rozwój wyłącznie przez Fazę Rozwoju, trening i naukę

import { Character, getSkillValue } from './types';
import { createSeededRandom } from './utils/seedable-random';

export interface DevelopmentSession {
  id: string;
  sessionId: string;
  sessionName: string;
  date: Date;
  duration: number; // in minutes
  skillsImproved: { [skill: string]: number };
  attributesImproved: { [attribute: string]: number };
  traumaGained: TraumaEvent[];
  achievements: Achievement[];
  notes: string;
}

export interface TraumaEvent {
  id: string;
  type: 'phobia' | 'mania' | 'delusion' | 'amnesia' | 'other';
  name: string;
  description: string;
  severity: 'mild' | 'moderate' | 'severe' | 'extreme';
  sanityLoss: number;
  gameplayEffect: string;
  acquired: Date;
  resolved?: Date;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  type:
    | 'investigation'
    | 'survival'
    | 'social'
    | 'combat'
    | 'knowledge'
    | 'special';
  unlocked: Date;
  requirements: string[];
}

export interface SkillImprovement {
  id: string;
  date: Date;
  oldValue: number;
  newValue: number;
  method: 'development_phase' | 'practice' | 'training' | 'study' | 'special';
  sessionId?: string;
  description: string;
}

export interface CharacterDevelopmentStats {
  totalSessions: number;
  totalSkillImprovements: number;
  totalPointsGained: number;
  favoriteSkills: string[];
  traumaCount: number;
  achievementCount: number;
  survivalRate: number;
  investigationsSolved: number;
  markedSkillsCount: number;
}

/**
 * Rzut K100 (1-100). Default Math.random; z RNG deterministyczny.
 */
function rollD100(rng: () => number = Math.random): number {
  return Math.floor(rng() * 100) + 1;
}

/**
 * Rzut K10 (1-10). Default Math.random; z RNG deterministyczny.
 */
function rollD10(rng: () => number = Math.random): number {
  return Math.floor(rng() * 10) + 1;
}

/**
 * Rzut 2K6 (2-12) - bonus Poczytalności za mistrzostwo.
 */
function roll2D6(rng: () => number = Math.random): number {
  return Math.floor(rng() * 6) + 1 + Math.floor(rng() * 6) + 1;
}

/**
 * Wynik rzutu na rozwój umiejętności (CoC 7e oficjalne)
 */
export interface DevelopmentRollResult {
  skillName: string;
  oldValue: number;
  roll: number;
  success: boolean;
  improvement?: number;
  newValue?: number;
  sanityBonus?: number; // +2D6 SAN przy osiągnięciu 90%+
}

/**
 * Wynik rzutu na rozwój EDU (CoC 7e oficjalne)
 */
export interface EDURollResult {
  oldValue: number;
  roll: number;
  success: boolean;
  improvement?: number;
  newValue?: number;
}

class CharacterDevelopmentSystem {
  /**
   * Przeprowadza rzut na rozwój pojedynczej umiejętności (CoC 7e, str. 105-106)
   * Sukces: rzut K100 > aktualna wartość LUB > 95 -> +1K10
   * Umiejętności MOGĄ przekroczyć 100% (RAW: brak górnego limitu dla umiejętności).
   * Bonus: jeśli umiejętność osiągnie 90%+, gracz zyskuje +2K6 Poczytalności.
   *
   * @param seed - opcjonalny seed (deterministyczne testy regresji + sesja replay)
   */
  rollSkillDevelopment(
    skillName: string,
    currentValue: number,
    seed?: number
  ): DevelopmentRollResult {
    const rng = createSeededRandom(seed);
    const roll = rollD100(rng);
    // RAW: sukces gdy wynik wyższy niż wartość umiejętności LUB wyższy niż 95
    const success = roll > currentValue || roll > 95;

    const result: DevelopmentRollResult = {
      skillName,
      oldValue: currentValue,
      roll,
      success,
    };

    if (success) {
      const improvement = rollD10(rng);
      // Bez capa - RAW pozwala umiejętnościom przekroczyć 100%
      const newValue = currentValue + improvement;
      result.improvement = improvement;
      result.newValue = newValue;

      // Bonus za mistrzostwo (osiągnięcie 90%+)
      if (currentValue < 90 && newValue >= 90) {
        result.sanityBonus = roll2D6(rng);
      }
    }

    return result;
  }

  /**
   * Przeprowadza rzut na rozwój Wykształcenia (EDU) - CoC 7e oficjalne
   * Rzut K100 > aktualna EDU = sukces -> +1K10 (max 99)
   *
   * @param seed - opcjonalny seed (deterministyczne testy regresji + sesja replay)
   */
  rollEDUDevelopment(currentEDU: number, seed?: number): EDURollResult {
    const rng = createSeededRandom(seed);
    const roll = rollD100(rng);
    const success = roll > currentEDU;

    const result: EDURollResult = {
      oldValue: currentEDU,
      roll,
      success,
    };

    if (success) {
      const improvement = rollD10(rng);
      result.improvement = improvement;
      result.newValue = Math.min(99, currentEDU + improvement);
    }

    return result;
  }

  /**
   * Przeprowadza rzut na odzyskanie Szczęścia po sesji (CoC 7e, str. 110-111)
   * Rzut K100 > aktualne Szczęście = sukces -> +1K10 (Szczęście max 99).
   * Wykonuje się tak samo jak test rozwoju umiejętności. Zwraca EDURollResult
   * (ten sam kształt: oldValue/roll/success/improvement/newValue).
   *
   * @param seed - opcjonalny seed (deterministyczne testy regresji + sesja replay)
   */
  rollLuckRecovery(currentLuck: number, seed?: number): EDURollResult {
    const rng = createSeededRandom(seed);
    const roll = rollD100(rng);
    const success = roll > currentLuck;

    const result: EDURollResult = {
      oldValue: currentLuck,
      roll,
      success,
    };

    if (success) {
      const improvement = rollD10(rng);
      result.improvement = improvement;
      result.newValue = Math.min(99, currentLuck + improvement);
    }

    return result;
  }

  /**
   * Rzut Samopomocy - odzyskanie Poczytalności (CoC 7e, str. 185).
   * Badacz poświęca czas aspektowi swojej historii (np. Kluczowa Więź) i
   * odzyskuje 1K10 punktów Poczytalności.
   *
   * UWAGA: mechanika jest UZNANIOWA (Keeper's discretion). 1K10 to wartość
   * standardowa RAW - Strażnik może ją modyfikować (np. kość premiowa za
   * szczególne zaangażowanie) oraz limituje użycie raz na aspekt historii.
   *
   * @param seed - opcjonalny seed (deterministyczne testy regresji + sesja replay)
   * @returns liczba odzyskanych punktów Poczytalności (1-10)
   */
  rollSanityRecovery(seed?: number): number {
    const rng = createSeededRandom(seed);
    return rollD10(rng);
  }

  /**
   * Aplikuje wynik rozwoju umiejętności do postaci
   */
  applySkillDevelopmentResult(
    character: Character,
    result: DevelopmentRollResult
  ): Character {
    if (!result.success || result.newValue === undefined) {
      return character;
    }

    const updatedCharacter = {
      ...character,
      skills: {
        ...character.skills,
        [result.skillName]: result.newValue,
      },
      developmentHistory: [
        ...character.developmentHistory,
        {
          id: `dev_${Date.now()}_${result.skillName}`,
          timestamp: new Date(),
          type: 'skill' as const,
          target: result.skillName,
          oldValue: result.oldValue,
          newValue: result.newValue,
          xpCost: 0,
          description: `Faza Rozwoju: ${result.skillName} ${result.oldValue}% → ${result.newValue}% (rzut ${result.roll} vs ${result.oldValue})`,
        },
      ],
    };

    // Bonus Poczytalności za mistrzostwo (90%+)
    if (result.sanityBonus) {
      updatedCharacter.san = Math.min(
        99,
        (updatedCharacter.san || 0) + result.sanityBonus
      );
      updatedCharacter.developmentHistory.push({
        id: `san_bonus_${Date.now()}`,
        timestamp: new Date(),
        type: 'attribute' as const,
        target: 'Poczytalność (bonus za mistrzostwo)',
        oldValue: character.san || 0,
        newValue: updatedCharacter.san,
        xpCost: 0,
        description: `+${result.sanityBonus} PR za osiągnięcie mistrzostwa w ${result.skillName} (90%+)`,
      });
    }

    return updatedCharacter;
  }

  /**
   * Aplikuje wynik rozwoju EDU do postaci
   */
  applyEDUDevelopmentResult(
    character: Character,
    result: EDURollResult
  ): Character {
    if (!result.success || result.newValue === undefined) {
      return character;
    }

    return {
      ...character,
      edu: result.newValue,
      developmentHistory: [
        ...character.developmentHistory,
        {
          id: `dev_edu_${Date.now()}`,
          timestamp: new Date(),
          type: 'attribute' as const,
          target: 'Wykształcenie (EDU)',
          oldValue: result.oldValue,
          newValue: result.newValue,
          xpCost: 0,
          description: `Faza Rozwoju: EDU ${result.oldValue} → ${result.newValue} (rzut ${result.roll} vs ${result.oldValue})`,
        },
      ],
    };
  }

  // Add trauma to character
  addTrauma(
    character: Character,
    trauma: Omit<TraumaEvent, 'id' | 'acquired'>
  ): Character {
    const traumaEvent: TraumaEvent = {
      ...trauma,
      id: `trauma_${Date.now()}`,
      acquired: new Date(),
    };

    // Apply sanity loss
    const newSanity = Math.max(0, character.san - trauma.sanityLoss);

    return {
      ...character,
      san: newSanity,
      developmentHistory: [
        ...character.developmentHistory,
        {
          id: traumaEvent.id,
          timestamp: traumaEvent.acquired,
          type: 'attribute',
          target: 'Trauma',
          oldValue: character.san,
          newValue: newSanity,
          xpCost: 0,
          description: `Trauma: ${trauma.name} - ${trauma.description}`,
        },
      ],
    };
  }

  // Grant achievement (bez XP reward - purystyczne podejście)
  grantAchievement(
    character: Character,
    achievement: Omit<Achievement, 'id' | 'unlocked'>
  ): Character {
    const newAchievement: Achievement = {
      ...achievement,
      id: `achievement_${Date.now()}`,
      unlocked: new Date(),
    };

    return {
      ...character,
      developmentHistory: [
        ...character.developmentHistory,
        {
          id: newAchievement.id,
          timestamp: newAchievement.unlocked,
          type: 'special' as const,
          target: 'Achievement',
          oldValue: 0,
          newValue: 0,
          xpCost: 0,
          description: `Osiągnięcie: ${achievement.name}`,
        },
      ],
    };
  }

  // Calculate character development statistics (purystyczne - bez XP)
  calculateDevelopmentStats(character: Character): CharacterDevelopmentStats {
    const history = character.developmentHistory;
    const skillImprovements = history.filter((h) => h.type === 'skill');
    const achievements = history.filter(
      (h) => h.type === 'special' && h.target === 'Achievement'
    );
    const trauma = history.filter((h) => h.target === 'Trauma');

    // Get unique sessions (approximate)
    const sessions = new Set(history.map((h) => h.timestamp.toDateString()))
      .size;

    // Calculate favorite skills (most improved)
    const skillCounts: { [skill: string]: number } = {};
    skillImprovements.forEach((improvement) => {
      skillCounts[improvement.target] =
        (skillCounts[improvement.target] || 0) + 1;
    });

    const favoriteSkills = Object.entries(skillCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([skill]) => skill);

    // Oblicz ile umiejętności jest oznaczonych do rozwoju
    const markedSkillsCount = Object.entries(character.skills).filter(
      ([, skillValue]) => {
        if (typeof skillValue === 'object' && skillValue !== null) {
          return skillValue.markedForImprovement === true;
        }
        return false;
      }
    ).length;

    // Total points gained from development
    const totalPointsGained = skillImprovements.reduce(
      (sum, h) => sum + (h.newValue - h.oldValue),
      0
    );

    return {
      totalSessions: sessions,
      totalSkillImprovements: skillImprovements.length,
      totalPointsGained,
      favoriteSkills,
      traumaCount: trauma.length,
      achievementCount: achievements.length,
      survivalRate:
        trauma.length > 0 ? Math.max(0, 100 - trauma.length * 10) : 100,
      investigationsSolved: achievements.filter((a) =>
        a.description.includes('investigation')
      ).length,
      markedSkillsCount,
    };
  }

  // Get occupation-specific skills
  getOccupationSkills(occupation: string): string[] {
    const occupationSkills: { [key: string]: string[] } = {
      Antykwariusz: [
        'Historia',
        'Spostrzegawczość',
        'Wycena',
        'Sztuka/Rzemiosło',
        'Korzystanie z Bibliotek',
      ],
      Detektyw: [
        'Spostrzegawczość',
        'Psychologia',
        'Broń Palna',
        'Prawo',
        'Nasłuchiwanie',
      ],
      Lekarz: [
        'Medycyna',
        'Pierwsza Pomoc',
        'Nauka',
        'Psychologia',
        'Spostrzegawczość',
      ],
      Dziennikarz: [
        'Perswazja',
        'Spostrzegawczość',
        'Korzystanie z Bibliotek',
        'Psychologia',
        'Urok Osobisty',
      ],
      Akademik: [
        'Korzystanie z Bibliotek',
        'Nauka',
        'Historia',
        'Język Obcy',
        'Spostrzegawczość',
      ],
      Policjant: [
        'Broń Palna',
        'Walka Wręcz',
        'Zastraszanie',
        'Spostrzegawczość',
        'Prawo',
      ],
    };

    return occupationSkills[occupation] || [];
  }

  // Create a development session record
  createDevelopmentSession(
    character: Character,
    sessionData: Omit<DevelopmentSession, 'id' | 'date'>
  ): DevelopmentSession {
    return {
      ...sessionData,
      id: `session_${Date.now()}`,
      date: new Date(),
    };
  }

  // Apply session results to character (purystyczne - bez XP)
  applySessionResults(
    character: Character,
    session: DevelopmentSession
  ): Character {
    const updatedCharacter = { ...character };

    // Apply skill improvements
    Object.entries(session.skillsImproved).forEach(([skill, improvement]) => {
      const currentValue = getSkillValue(updatedCharacter.skills[skill]);
      updatedCharacter.skills[skill] = Math.min(99, currentValue + improvement);
    });

    // Add development history entry
    const developmentEntry = {
      id: session.id,
      timestamp: session.date,
      type: 'special' as const,
      target: 'Session',
      oldValue: 0,
      newValue: 0,
      xpCost: 0,
      description: `Sesja: ${session.sessionName}`,
    };

    updatedCharacter.developmentHistory = [
      ...updatedCharacter.developmentHistory,
      developmentEntry,
    ];

    return updatedCharacter;
  }
}

export const characterDevelopment = new CharacterDevelopmentSystem();
