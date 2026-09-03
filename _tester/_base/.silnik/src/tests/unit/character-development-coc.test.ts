import { characterDevelopment } from "@/lib/character-development";
import { Character } from "@/lib/types";

describe("characterDevelopment - Call of Cthulhu 7e rules (Issue #28)", () => {
  const baseCharacter = {
    id: "char_test_1",
    name: "Harvey Walters",
    occupation: "Dziennikarz",
    age: 42,
    str: 50,
    con: 60,
    siz: 65,
    dex: 55,
    app: 70,
    int: 75,
    pow: 60,
    edu: 80,
    hp: 12,
    maxHp: 12,
    san: 60,
    maxSan: 99,
    mp: 12,
    maxMp: 12,
    luck: 45,
    skills: {
      "Spostrzegawczość": 25,
      "Korzystanie z Bibliotek": 85,
      "Mity Cthulhu": 15,
    },
    developmentHistory: [],
  } as unknown as Character;

  describe("rollSkillDevelopment (Księga Strażnika str. 106-107)", () => {
    it("daje sukces gdy wynik rzutu jest wyższy niż aktualna wartość", () => {
      const result = characterDevelopment.rollSkillDevelopment("Spostrzegawczość", 25);
      if (result.roll > 25 || result.roll > 95) {
        expect(result.success).toBe(true);
        expect(result.improvement).toBeGreaterThanOrEqual(1);
        expect(result.improvement).toBeLessThanOrEqual(10);
        expect(result.newValue).toBe(25 + (result.improvement || 0));
      } else {
        expect(result.success).toBe(false);
        expect(result.improvement).toBeUndefined();
      }
    });

    it("wynik powyżej 95 zawsze daje sukces, nawet dla umiejętności 96%+", () => {
      let testedOver95 = false;
      for (let seed = 1; seed <= 500; seed++) {
        const res = characterDevelopment.rollSkillDevelopment("Ekspert", 98, seed);
        if (res.roll > 95) {
          expect(res.success).toBe(true);
          expect(res.improvement).toBeGreaterThanOrEqual(1);
          testedOver95 = true;
          break;
        }
      }
      expect(testedOver95).toBe(true);
    });

    it("przyznaje bonus Poczytalności +2K6 gdy umiejętność po raz pierwszy osiągnie 90%+", () => {
      let gotSanityBonus = false;
      for (let seed = 1; seed <= 200; seed++) {
        const res = characterDevelopment.rollSkillDevelopment("Korzystanie z Bibliotek", 85, seed);
        if (res.success && res.newValue && res.newValue >= 90) {
          expect(res.sanityBonus).toBeGreaterThanOrEqual(2);
          expect(res.sanityBonus).toBeLessThanOrEqual(12);
          gotSanityBonus = true;
          break;
        }
      }
      expect(gotSanityBonus).toBe(true);
    });

    it("nie przyznaje bonusu Poczytalności jeśli umiejętność już wcześniej miała 90%+", () => {
      for (let seed = 1; seed <= 100; seed++) {
        const res = characterDevelopment.rollSkillDevelopment("Mistrz", 92, seed);
        if (res.success) {
          expect(res.sanityBonus).toBeUndefined();
        }
      }
    });
  });

  describe("applySkillDevelopmentResult i pułap Poczytalności (99 - Mity Cthulhu)", () => {
    it("nakłada limit maksymalnego SAN równy 99 - Mity Cthulhu", () => {
      const charWithMythos: Character = {
        ...baseCharacter,
        san: 82,
        skills: {
          ...baseCharacter.skills,
          "Mity Cthulhu": 15,
        },
      };

      const result = {
        skillName: "Korzystanie z Bibliotek",
        oldValue: 88,
        roll: 99,
        success: true,
        improvement: 4,
        newValue: 92,
        sanityBonus: 10,
      };

      const updated = characterDevelopment.applySkillDevelopmentResult(charWithMythos, result);
      expect(updated.san).toBe(84);
    });

    it("pozwala wartości umiejętności przekroczyć 100%", () => {
      const charHighSkill: Character = {
        ...baseCharacter,
        skills: {
          ...baseCharacter.skills,
          "Walka Wręcz": 98,
        },
      };

      const result = {
        skillName: "Walka Wręcz",
        oldValue: 98,
        roll: 99,
        success: true,
        improvement: 5,
        newValue: 103,
      };

      const updated = characterDevelopment.applySkillDevelopmentResult(charHighSkill, result);
      expect(updated.skills["Walka Wręcz"]).toBe(103);
    });
  });

  describe("rollLuckRecovery (Księga Strażnika str. 111-112)", () => {
    it("daje sukces gdy wynik rzutu jest wyższy niż aktualna wartość Szczęścia", () => {
      const res = characterDevelopment.rollLuckRecovery(40, 42);
      if (res.roll > 40) {
        expect(res.success).toBe(true);
        expect(res.improvement).toBeGreaterThanOrEqual(1);
        expect(res.improvement).toBeLessThanOrEqual(10);
        expect(res.newValue).toBe(40 + (res.improvement || 0));
      } else {
        expect(res.success).toBe(false);
      }
    });

    it("nie przekracza limitu 99 Szczęścia", () => {
      for (let seed = 1; seed <= 50; seed++) {
        const res = characterDevelopment.rollLuckRecovery(95, seed);
        if (res.success && res.newValue !== undefined) {
          expect(res.newValue).toBeLessThanOrEqual(99);
        }
      }
    });
  });

  describe("rollSelfHelp (Księga Strażnika str. 186-187)", () => {
    it("zwraca +1K6 SAN przy zdanym teście Poczytalności i -1 SAN przy porażce", () => {
      let sawSuccess = false;
      let sawFailure = false;

      for (let seed = 1; seed <= 50; seed++) {
        const res = characterDevelopment.rollSelfHelp(50, false, seed);
        if (res.success) {
          expect(res.sanChange).toBeGreaterThanOrEqual(1);
          expect(res.sanChange).toBeLessThanOrEqual(6);
          expect(res.recoveredSanity).toBe(res.sanChange);
          sawSuccess = true;
        } else {
          expect(res.sanChange).toBe(-1);
          expect(res.recoveredSanity).toBe(0);
          sawFailure = true;
        }
      }

      expect(sawSuccess).toBe(true);
      expect(sawFailure).toBe(true);
    });

    it("obsługuje kość premiową dla Kluczowej Więzi", () => {
      const res = characterDevelopment.rollSelfHelp(60, true, 123);
      expect(res.bonusDieUsed).toBe(true);
      expect(res.diceRolls).toBeDefined();
      expect(res.diceRolls?.length).toBe(2);
    });

    it("rollSanityRecovery zwraca wartość 1-6 (1K6 CoC 7e)", () => {
      for (let i = 0; i < 20; i++) {
        const val = characterDevelopment.rollSanityRecovery();
        expect(val).toBeGreaterThanOrEqual(1);
        expect(val).toBeLessThanOrEqual(6);
      }
    });
  });
});
