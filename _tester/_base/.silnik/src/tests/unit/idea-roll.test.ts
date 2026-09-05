/**
 * @file idea-roll.test.ts
 *
 * Testy jednostkowe dla mechaniki Testu Pomysłu (Idea Roll CoC 7e RAW)
 * oraz generatora szablonów Quote-to-Input.
 */

import {
  executeIdeaRoll,
  buildIdeaRollPrompt,
  buildQuoteToInputText,
} from "@/lib/journal/idea-roll-service";
import type { Character } from "@/lib/types";

describe("Idea Roll Service (CoC 7e RAW)", () => {
  const mockCharacter: Character = {
    id: "char-1",
    name: "Francis Thurston",
    playerName: "Jakub",
    str: 50,
    dex: 60,
    con: 55,
    app: 65,
    pow: 70,
    edu: 75,
    siz: 60,
    int: 70, // Inteligencja 70%
    luck: 50,
    hp: 11,
    san: 70,
    mp: 14,
    skills: {},
    occupation: "Antropolog",
    age: 32,
    background: "Badacz mitów",
    isActive: true,
    lastUsed: new Date(),
    notes: "",
    experience: { totalXP: 0, availableXP: 0, earnedThisSession: 0, maxEarnedThisSession: 10 },
    developmentHistory: [],
  };

  describe("executeIdeaRoll", () => {
    it("zwraca krytyczny sukces na rzucie 01", () => {
      const res = executeIdeaRoll({
        character: mockCharacter,
        fixedRoll: 1,
      });

      expect(res.roll).toBe(1);
      expect(res.outcome).toBe("critical");
      expect(res.isSuccess).toBe(true);
      expect(res.targetValue).toBe(70);
    });

    it("zwraca sukces ekstremalny dla rzutu <= 1/5 INT (70/5 = 14)", () => {
      const res = executeIdeaRoll({
        character: mockCharacter,
        fixedRoll: 12,
      });

      expect(res.roll).toBe(12);
      expect(res.outcome).toBe("extreme");
      expect(res.isSuccess).toBe(true);
    });

    it("zwraca sukces trudny dla rzutu <= 1/2 INT (70/2 = 35)", () => {
      const res = executeIdeaRoll({
        character: mockCharacter,
        fixedRoll: 30,
      });

      expect(res.roll).toBe(30);
      expect(res.outcome).toBe("hard");
      expect(res.isSuccess).toBe(true);
    });

    it("zwraca sukces zwykły dla rzutu <= INT (36-70)", () => {
      const res = executeIdeaRoll({
        character: mockCharacter,
        fixedRoll: 65,
      });

      expect(res.roll).toBe(65);
      expect(res.outcome).toBe("regular");
      expect(res.isSuccess).toBe(true);
    });

    it("zwraca porażkę dla rzutu > INT (71-95)", () => {
      const res = executeIdeaRoll({
        character: mockCharacter,
        fixedRoll: 85,
      });

      expect(res.roll).toBe(85);
      expect(res.outcome).toBe("fail");
      expect(res.isSuccess).toBe(false);
    });

    it("zwraca fumble dla rzutu 100", () => {
      const res = executeIdeaRoll({
        character: mockCharacter,
        fixedRoll: 100,
      });

      expect(res.roll).toBe(100);
      expect(res.outcome).toBe("fumble");
      expect(res.isSuccess).toBe(false);
    });
  });

  describe("buildIdeaRollPrompt", () => {
    it("generuje prompt sukcesu z wytycznymi czystej dedukcji (PL)", () => {
      const result = executeIdeaRoll({
        character: mockCharacter,
        fixedRoll: 25,
      });
      const prompt = buildIdeaRollPrompt(
        result,
        { title: "Dziwna statuetka z gliny", description: "Obrzydliwa rzeźba z bagnistego terenu" },
        [{ title: "Wycinek z Boston Globe", description: "Raport o tajemniczym kulcie" }],
        "pl"
      );

      expect(prompt).toContain("Jesteś bezstronnym silnikiem regułowym Call of Cthulhu 7e");
      expect(prompt).toContain("Francis Thurston");
      expect(prompt).toContain("Inteligencja INT: 70%");
      expect(prompt).toContain("SUKCES");
      expect(prompt).toContain("Dziwna statuetka z gliny");
      expect(prompt).toContain("Wycinek z Boston Globe");
      expect(prompt).toContain("[SUKCES]: Badacz doznaje olśnienia");
    });

    it("generuje prompt porażki z wytycznymi komplikacji RAW (PL)", () => {
      const result = executeIdeaRoll({
        character: mockCharacter,
        fixedRoll: 88,
      });
      const prompt = buildIdeaRollPrompt(
        result,
        { title: "Zapieczętowany list Wilcoxa" },
        [],
        "pl"
      );

      expect(prompt).toContain("PORAŻKA Z KOMPLIKACJĄ");
      expect(prompt).toContain("ZA CENĘ POWAŻNEJ KOMPLIKACJI");
    });

    it("generuje prompt po angielsku (EN)", () => {
      const result = executeIdeaRoll({
        character: mockCharacter,
        fixedRoll: 20,
      });
      const prompt = buildIdeaRollPrompt(
        result,
        { title: "Bas-relief of Cthulhu" },
        [],
        "en"
      );

      expect(prompt).toContain("You are the objective Call of Cthulhu 7e rules engine");
      expect(prompt).toContain("SUCCESS");
      expect(prompt).toContain("Investigator experiences a breakthrough");
    });
  });

  describe("buildQuoteToInputText", () => {
    it("buduje szablon pytania o postać / NPC (PL i EN)", () => {
      expect(buildQuoteToInputText("npc", "Inspektor Legrasse", undefined, "pl"))
        .toBe("Pytam Inspektor Legrasse o ");
      expect(buildQuoteToInputText("npc", "Inspector Legrasse", undefined, "en"))
        .toBe("I ask Inspector Legrasse about ");
    });

    it("buduje szablon badania lokacji (PL i EN)", () => {
      expect(buildQuoteToInputText("location", "Dzielnica Francuska", undefined, "pl"))
        .toBe("Sprawdzam dokładniej Dzielnica Francuska pod kątem ");
      expect(buildQuoteToInputText("location", "French Quarter", undefined, "en"))
        .toBe("I thoroughly investigate French Quarter for ");
    });

    it("buduje szablon badania przedmiotu / artefaktu (PL i EN)", () => {
      expect(buildQuoteToInputText("item", "Złoty diadem z Innsmouth", undefined, "pl"))
        .toBe("Badam Złoty diadem z Innsmouth, zwracając uwagę na ");
      expect(buildQuoteToInputText("artifact", "Innsmouth Gold Tiara", undefined, "en"))
        .toBe("I examine Innsmouth Gold Tiara, paying attention to ");
    });

    it("buduje szablon poszlaki powiązanej ze świadkiem (PL i EN)", () => {
      expect(
        buildQuoteToInputText(
          "clue",
          "Dziwny rytualny sztylet",
          { sourceNpc: "Profesor Webb" },
          "pl"
        )
      ).toBe("Pytam Profesor Webb o dowód: \"Dziwny rytualny sztylet\"");

      expect(
        buildQuoteToInputText(
          "clue",
          "Strange ritual dagger",
          { sourceNpc: "Professor Webb" },
          "en"
        )
      ).toBe("I ask Professor Webb regarding the clue: \"Strange ritual dagger\"");
    });

    it("buduje szablon dla własnej notatki", () => {
      expect(buildQuoteToInputText("note", "Rozkład przypływów", undefined, "pl"))
        .toBe("Nawiązuję do notatki \"Rozkład przypływów\": ");
      expect(buildQuoteToInputText("note", "Tide schedule", undefined, "en"))
        .toBe("Regarding note \"Tide schedule\": ");
    });
  });
});
