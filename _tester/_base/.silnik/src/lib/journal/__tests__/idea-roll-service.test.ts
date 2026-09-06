import {
  executeIdeaRoll,
  buildIdeaRollPrompt,
  inferMiceType,
} from "@/lib/journal/idea-roll-service";
import { inferClueMiceType } from "@/lib/journal/apply-journal-tags";
import type { Character } from "@/lib/types";

describe("M.I.C.E. Quotient in Idea Roll Service (CoC 7e RAW)", () => {
  const sampleCharacter: Character = {
    id: "char-1",
    name: "Harvey Walters",
    occupation: "Dziennikarz",
    gender: "male",
    age: 42,
    str: 40,
    con: 50,
    siz: 60,
    dex: 55,
    app: 50,
    int: 75,
    pow: 65,
    edu: 70,
    hp: 11,
    maxHp: 11,
    san: 65,
    maxSan: 65,
    mp: 13,
    maxMp: 13,
    luck: 50,
    skills: { "Spostrzegawczość": 60, "Ukrywanie": 45 },
  } as unknown as Character;

  describe("inferMiceType", () => {
    it("returns explicit miceType if provided", () => {
      expect(inferMiceType({ title: "Cokolwiek", miceType: "event" })).toBe("event");
      expect(inferMiceType({ title: "Cokolwiek", miceType: "milieu" })).toBe("milieu");
    });

    it("infers milieu for location and escape keywords", () => {
      expect(inferMiceType({ title: "Zaryglowane drzwi piwnicy", description: "Brak drogi wyjścia" })).toBe("milieu");
      expect(inferMiceType({ title: "Secret Tunnel", description: "Escape route from the mansion" })).toBe("milieu");
    });

    it("infers character for suspects, witnesses, psychological keywords", () => {
      expect(inferMiceType({ title: "Zeznanie lokaja", description: "Podejrzany ukrywa paniczny lęk i sekret" })).toBe("character");
      expect(inferMiceType({ title: "Suspect Interview", description: "Moral dilemma and hidden guilt" })).toBe("character");
    });

    it("infers event for rituals, monsters, ticking clock", () => {
      expect(inferMiceType({ title: "Rytuał pod czarnym księżycem", description: "Zagrożenie przywołaniem bestii" })).toBe("event");
      expect(inferMiceType({ title: "Impending Cataclysm", description: "Countdown to midnight" })).toBe("event");
    });

    it("defaults to inquiry for pure clues and mystery facts", () => {
      expect(inferMiceType({ title: "Dziwny szyfr w księdze", description: "Poszlaka wskazująca na bibliotekę" })).toBe("inquiry");
    });
  });

  describe("inferClueMiceType", () => {
    it("infers correct M.I.C.E. vector from clue text", () => {
      expect(inferClueMiceType("Droga odwrotu", "Zawalone schody w krypcie")).toBe("milieu");
      expect(inferClueMiceType("Lęk kustosza", "Świadek boi się zemsty kultystów")).toBe("character");
      expect(inferClueMiceType("Zegar zagłady", "Rytuał kończy się o północy")).toBe("event");
      expect(inferClueMiceType("Bilet kolejowy", "Podróż do Bostonu")).toBe("inquiry");
    });
  });

  describe("executeIdeaRoll", () => {
    it("produces a success result when fixed roll <= INT", () => {
      const result = executeIdeaRoll({
        character: sampleCharacter,
        fixedRoll: 30,
        selectedMiceLens: "milieu",
      });

      expect(result.roll).toBe(30);
      expect(result.isSuccess).toBe(true);
      expect(result.miceLens).toBe("milieu");
      expect(result.characterName).toBe("Harvey Walters");
    });

    it("produces a failure result when fixed roll > INT", () => {
      const result = executeIdeaRoll({
        character: sampleCharacter,
        fixedRoll: 85,
        selectedMiceLens: "event",
      });

      expect(result.roll).toBe(85);
      expect(result.isSuccess).toBe(false);
      expect(result.miceLens).toBe("event");
    });

    it("auto-resolves M.I.C.E. lens from targetSubject when selectedMiceLens is not provided", () => {
      const result = executeIdeaRoll({
        character: sampleCharacter,
        targetSubject: {
          id: "subj-1",
          title: "Piwnica zaryglowana łańcuchem",
          description: "Droga wyjścia odcięta",
        },
        fixedRoll: 50,
      });

      expect(result.miceLens).toBe("milieu");
    });
  });

  describe("buildIdeaRollPrompt", () => {
    it("contains M.I.C.E. directive and LIFO rule in Polish prompt", () => {
      const result = executeIdeaRoll({
        character: sampleCharacter,
        fixedRoll: 40,
        selectedMiceLens: "character",
      });

      const prompt = buildIdeaRollPrompt(result, { title: "Podejrzany lord" }, [], "pl");

      expect(prompt).toContain("M.I.C.E. QUOTIENT");
      expect(prompt).toContain("LUDZIE I PSYCHOLOGIA [C]");
      expect(prompt).toContain("REGUŁA ZAGNIEŻDŻANIA LIFO (Last In, First Out)");
      expect(prompt).toContain("CoC 7e RAW");
    });

    it("contains M.I.C.E. directive and LIFO rule in English prompt", () => {
      const result = executeIdeaRoll({
        character: sampleCharacter,
        fixedRoll: 90,
        selectedMiceLens: "milieu",
      });

      const prompt = buildIdeaRollPrompt(result, { title: "Flooded Tunnel" }, [], "en");

      expect(prompt).toContain("M.I.C.E. QUOTIENT");
      expect(prompt).toContain("MILIEU & ENVIRONMENT [M]");
      expect(prompt).toContain("LIFO NESTING RULE (Last In, First Out)");
      expect(prompt).toContain("CoC 7e RAW");
      expect(prompt).toContain("FAILURE WITH COMPLICATION");
    });
  });
});