import { detectRulebookProfile } from "./rulebook-fingerprint";

describe("rulebook-fingerprint - Rozszerzone szablony schematyczne i plan semantyczny", () => {
  describe("Typy przygód (One-Shot vs Antologia vs Mega-Kampania)", () => {
    it("rozpoznaje One-Shot / broszurę (Trzeba karmić ogień)", () => {
      const text = "Trzeba karmić ogień. Krótki scenariusz do gry d100. Posiadłość na odludziu, tajemniczy rekwizyt: stary list wujka. Badacz trafia do piwnicy.";
      const res = detectRulebookProfile(text);
      expect(res.profile).toBe("one_shot");
      expect(res.semanticPlan.adventureType).toBe("one_shot");
      expect(res.semanticPlan.detectedCategories).toContain("FABULA");
      expect(res.semanticPlan.detectedCategories).toContain("NPC");
      expect(res.semanticPlan.detectedCategories).toContain("REKWIZYTY");
      expect(res.semanticPlan.multiPartDetected).toBe(false);
    });

    it("rozpoznaje Antologię scenariuszy (Cienie Tatr)", () => {
      const text = "Cienie Tatr. Antologia scenariuszy d100 osadzonych w polskich Tatrach. Spis treści: Scenariusz 1: Na Grani, Scenariusz 2: Morskie Oko w Mroku, Scenariusz 3: Jaskinia Mrozna. Badacze i poszlaki.";
      const res = detectRulebookProfile(text);
      expect(res.profile).toBe("scenario_anthology");
      expect(res.semanticPlan.adventureType).toBe("scenario_anthology");
      expect(res.semanticPlan.detectedCategories).toContain("FABULA");
      expect(res.semanticPlan.detectedCategories).toContain("NPC");
      expect(res.semanticPlan.multiPartDetected).toBe(true);
    });

    it("rozpoznaje Mega-Kampanię (Maski Nyarlathotepa)", () => {
      const text = "Maski Nyarlathotepa. Epicka kampania do gry d100. Tom 1. Spis treści: Akt 1: Nowy Jork, Akt 2: Londyn, Akt 3: Kair. Kalendarium kampanii, globalny spisek kultu Carlyle. Dramatis Personae kampanii.";
      const res = detectRulebookProfile(text);
      expect(res.profile).toBe("mega_campaign");
      expect(res.semanticPlan.adventureType).toBe("mega_campaign");
      expect(res.semanticPlan.detectedCategories).toContain("FABULA");
      expect(res.semanticPlan.detectedCategories).toContain("NPC");
      expect(res.semanticPlan.detectedCategories).toContain("REKWIZYTY");
      expect(res.semanticPlan.multiPartDetected).toBe(true);
    });
  });

  describe("Suplementy regułowe i kompendia (Bestiariusz, Grymuar, Badacz, Pulp)", () => {
    it("rozpoznaje Bestiariusz (Malleus Monstrorum)", () => {
      const text = "Malleus Monstrorum. Bestiariusz Mitów. Kompendium potworów i bóstw Mitów. Statystyki: Siła, Kondycja, Pancerz, Ataki na rundę, Utrata Poczytalności 1k10/1k100.";
      const res = detectRulebookProfile(text);
      expect(res.profile).toBe("bestiary");
      expect(res.semanticPlan.detectedCategories).toContain("BESTIARIUSZ");
      expect(res.detectedFeatures.hasCreatures).toBe(true);
    });

    it("rozpoznaje Grymuar Magii (Wielki Grymuar Magii Mitów)", () => {
      const text = "Wielki Grymuar Magii Mitów. Alfabetyczny spis zaklęć i czarów. Koszt magii: 5 Punktów Magii, 1k4 Poczytalności. Czas rzucania: 1 runda. Zasięg czaru: dotyk. Głęboka magia.";
      const res = detectRulebookProfile(text);
      expect(res.profile).toBe("grimoire");
      expect(res.semanticPlan.detectedCategories).toContain("CZARY");
      expect(res.detectedFeatures.hasSpells).toBe(true);
    });

    it("rozpoznaje Podręcznik Badacza", () => {
      const text = "Podręcznik Badacza. Tworzenie Badacza, profesje i zawody badacza, cenniki i ekwipunek badacza z lat 20. Organizacje badaczy.";
      const res = detectRulebookProfile(text);
      expect(res.profile).toBe("investigator_handbook");
      expect(res.semanticPlan.detectedCategories).toContain("MECHANIKA");
      expect(res.detectedFeatures.hasInvestigatorCreation).toBe(true);
    });

    it("rozpoznaje Pulp Cthulhu", () => {
      const text = "Pulp Cthulhu. Księga Zasad do pulpowych przygód d100. Pulpowe archetypy, talenty pulpu, pulpomet, podwójne punkty wytrzymałości i wydawanie Szczęścia.";
      const res = detectRulebookProfile(text);
      expect(res.profile).toBe("pulp-d100");
      expect(res.semanticPlan.detectedCategories).toContain("MECHANIKA");
      expect(res.detectedFeatures.hasPulpTalents).toBe(true);
    });

    it("rozpoznaje Setting / Epokę (Down Darker Trails)", () => {
      const text = "Down Darker Trails. Setting Dzikiego Zachodu w systemie d100. Pojedynki rewolwerowe, jazda konna, kowboje, szeryfowie i mroczne sekrety pogranicza.";
      const res = detectRulebookProfile(text);
      expect(res.profile).toBe("setting_expansion");
      expect(res.confidence).toBeGreaterThanOrEqual(0.85);
    });
  });
});
