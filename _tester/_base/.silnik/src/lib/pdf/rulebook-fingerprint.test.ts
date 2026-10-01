import {
  detectRulebookProfile,
  isAdventureBearingProfile,
} from "./rulebook-fingerprint";

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

  describe("Odporność na fałszywe dopasowania z przedmów, stopki licencyjnej i statystyk NPC", () => {
    it("rozpoznaje Księgę Strażnika (core-d100) nawet gdy w przedmowie wspomniano Maski Nyarlathotepa i Horror w Orient Expressie", () => {
      const text = `
        Zew Cthulhu Księga Strażnika. Edycja polska.
        W przedmowie wspominamy legendarne kampanie takie jak Maski Nyarlathotepa oraz Horror w Orient Expressie.
        SPIS TREŚCI
        Rozdział 1: Wprowadzenie ... 7
        Rozdział 3: Tworzenie Badacza ... 28
        Rozdział 6: Walka ... 101
        Rozdział 7: Pościgi ... 132
        Rozdział 8: Poczytalność ... 152
        Rozdział 9: Magia ... 173
        Rozdział 10: Prowadzenie gry ... 196
        Rozdział 11: Księgi Mitów ... 224
        Rozdział 12: Wielki Grymuar ... 243
        Rozdział 14: Potwory, Bestie i Obcy Bogowie ... 277
      `;
      const res = detectRulebookProfile(text, "ZewCthulhu_KsiegaStraznika_v.1.3.pdf");
      expect(res.profile).toBe("core-d100");
    });

    it("oznacza core-d100 i pulp-d100 jako profile zawierające przygody (isAdventureBearingProfile) i wykrywa wbudowane scenariusze", () => {
      expect(isAdventureBearingProfile("starter-d100")).toBe(true);
      expect(isAdventureBearingProfile("core-d100")).toBe(true);
      expect(isAdventureBearingProfile("pulp-d100")).toBe(true);
      expect(isAdventureBearingProfile("investigator_handbook")).toBe(false);

      const coreWithScenarios = `
        Zew Cthulhu Księga Strażnika. Edycja polska.
        Rozdział 15.1 - Scenariusze: Pośród pradawnych drzew 394
        Rozdział 15.2 - Scenariusze: Szkarłatne litery 414
        Walka, Pościgi, Poczytalność i Magia k100.
      `;
      const resCore = detectRulebookProfile(coreWithScenarios, "ZewCthulhu_KsiegaStraznika_v.1.3.pdf");
      expect(resCore.profile).toBe("core-d100");
      expect(resCore.detectedFeatures.hasScenarios).toBe(true);
      expect(resCore.semanticPlan.detectedCategories).toContain("FABULA");

      const pulpWithScenarios = `
        Pulp Cthulhu. Two-Fisted Action And Adventure Against The Mythos.
        You must have a copy of the Call of Cthulhu Keeper Rulebook to use this supplement.
        Look out for more Pulp Cthulhu campaigns and scenarios from Chaosium including The Two-Headed Serpent.
        PULP-O-METER, CREATING PULP HEROES, Pulp Archetypes, Pulp Talents, Sanity and Luck.
        CHAPTER 10: THE DISINTEGRATOR, SCENARIO 135
        CHAPTER 11: WAITING FOR THE HURRICANE, SCENARIO 158
        CHAPTER 12: PANDORA'S BOX, SCENARIO 176
        CHAPTER 13: SLOW BOAT TO CHINA, SCENARIO 205
      `;
      const resPulp = detectRulebookProfile(pulpWithScenarios, "Call_of_Cthulhu_Pulp_Cthulhu.pdf");
      expect(resPulp.profile).toBe("pulp-d100");
      expect(resPulp.detectedFeatures.hasScenarios).toBe(true);
      expect(resPulp.semanticPlan.detectedCategories).toContain("FABULA");
    });

    it("nie myli jednostrzałowego scenariusza zawierającego walkę, zaklęcie i stopkę Pulp Cthulhu z podręcznikiem bazowym ani grymuarem", () => {
      const text = `
        SCENARIUSZ DO 7. EDYCJI ZEWU CTHULHU
        CALL OF CTHULHU, ZEW CTHULHU, Trzeba karmić ogień © 2020 Chaosium Inc.
        „Pulp Cthulhu” oraz „Call of Cthulhu” są zarejestrowanymi znakami towarowymi Chaosium Inc.
        Wprowadzenie dla Strażnika. Zawiązanie akcji i Dramatis Personae.
        Kultysta: Walka Wręcz (Bijatyka) 45%, Unik 30%, Modyfikator Obrażeń +1k4.
        Zaklęcie: Przyzwanie Żaru. Koszt: 5 Punktów Magii i 1k6 Poczytalności. Czas rzucania: 2 rundy.
      `;
      const res = detectRulebookProfile(text, "Zew_Cthulhu_7ed._Trzeba_karmic_ogien.pdf");
      expect(res.profile).toBe("one_shot");
      expect(res.title).toBe("Trzeba karmić ogień");
    });

    it("klasyfikuje krótkie miniporadniki i dodatki z postaciami historycznymi jako setting_expansion, a nie starter-d100", () => {
      const npcSupplement = `
        POSTACI HISTORYCZNE DO ZEWU CTHULHU
        Dodatek zawierający sylwetki postaci historycznych z lat 20. wraz ze statystykami k100, Poczytalnością i umiejętnościami.
      `;
      const resNpc = detectRulebookProfile(npcSupplement, "ZC-Postaci-Historyczne-12-07.pdf");
      expect(resNpc.profile).toBe("setting_expansion");

      const miniGuide = `
        MINIPORADNIK DLA STRAŻNIKA: ONI
        Poradnik budowania grozy, tworzenia kultów i antagonistów w sesjach Zewu Cthulhu d100.
      `;
      const resGuide = detectRulebookProfile(miniGuide, "Miniporadnik_ONI.pdf");
      expect(resGuide.profile).toBe("setting_expansion");
    });
  });
});
