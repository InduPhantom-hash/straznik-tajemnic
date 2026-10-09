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

    it("rozpoznaje oficjalny polski tytuł Księga Badacza (PL)", () => {
      const text = "Księga Badacza. Tworzenie Badacza, profesje i zawody badacza, cenniki i ekwipunek badacza z lat 20. Organizacje badaczy.";
      const res = detectRulebookProfile(text, "Zew Cthulhu - Księga Badacza.pdf");
      expect(res.profile).toBe("investigator_handbook");
      expect(res.semanticPlan.detectedCategories).toContain("MECHANIKA");
      expect(res.detectedFeatures.hasInvestigatorCreation).toBe(true);
    });

    it("rozpoznaje oficjalny angielski tytuł Investigator's Handbook (EN)", () => {
      const text = "Call of Cthulhu Investigator's Handbook. Creating investigators, occupations, 1920s equipment and gear. Organizations.";
      const res = detectRulebookProfile(text, "Call of Cthulhu - Investigator's Handbook.pdf");
      expect(res.profile).toBe("investigator_handbook");
      expect(res.semanticPlan.detectedCategories).toContain("MECHANIKA");
    });

    it("rozpoznaje oficjalny polski Zestaw Startowy i angielski Starter Set", () => {
      const textPl = "Zew Cthulhu: Zestaw Startowy. Zasady wprowadzające do gry fabularnej Zew Cthulhu.";
      const resPl = detectRulebookProfile(textPl, "Zestaw Startowy.pdf");
      expect(resPl.profile).toBe("starter-d100");

      const textEn = "Call of Cthulhu Starter Set. Introductory rules and solo adventure.";
      const resEn = detectRulebookProfile(textEn, "Starter Set.pdf");
      expect(resEn.profile).toBe("starter-d100");
    });

    it("rozpoznaje Pulp Cthulhu", () => {
      const text = "Pulp Cthulhu. Księga Zasad do pulpowych przygód d100. Pulpowe archetypy, talenty pulpu, pulpomet, podwójne punkty wytrzymałości i wydawanie Szczęścia.";
      const res = detectRulebookProfile(text);
      expect(res.profile).toBe("pulp-d100");
      expect(res.semanticPlan.detectedCategories).toContain("MECHANIKA");
      expect(res.detectedFeatures.hasPulpTalents).toBe(true);
    });

    it("rozpoznaje oficjalne tytuły Księgi Strażnika (PL) i Keeper's Rulebook (EN)", () => {
      const textPl = "Zew Cthulhu Księga Strażnika. Podręcznik główny do gry. Tworzenie Badacza, Walka, Pościgi, Poczytalność.";
      const resPl = detectRulebookProfile(textPl, "Księga Strażnika Tajemnic.pdf");
      expect(resPl.profile).toBe("core-d100");

      const textEn = "Call of Cthulhu Keeper's Rulebook. 7th Edition Core Rules. Combat, Chases, Sanity, Magic.";
      const resEn = detectRulebookProfile(textEn, "Keeper's Rulebook 7th Ed.pdf");
      expect(resEn.profile).toBe("core-d100");
    });

    it("rozpoznaje oficjalne tytuły Grymuaru (PL i EN)", () => {
      const textPl = "Wielki Grymuar Magii Mitów Cthulhu. Ponad 550 zaklęć i czarów. Punkty magii, poczytalność, głęboka magia.";
      const resPl = detectRulebookProfile(textPl, "Wielki Grymuar Magii Mitów Cthulhu.pdf");
      expect(resPl.profile).toBe("grimoire");

      const textEn = "The Grand Grimoire of Cthulhu Mythos Magic. Over 550 spells. Magic points, sanity loss, deep magic.";
      const resEn = detectRulebookProfile(textEn, "The Grand Grimoire of Cthulhu Mythos Magic.pdf");
      expect(resEn.profile).toBe("grimoire");
    });

    it("rozpoznaje oficjalne tytuły Bestiariusza (PL i EN)", () => {
      const textPl = "Bestiariusz Mitów Cthulhu. Księga Bestii i Potworów. Siła, Kondycja, Pancerz, Utrata Poczytalności.";
      const resPl = detectRulebookProfile(textPl, "Bestiariusz Mitów Cthulhu.pdf");
      expect(resPl.profile).toBe("bestiary");

      const textEn = "Petersen's Field Guide to Lovecraftian Horrors. Monsters and deities of the Cthulhu Mythos.";
      const resEn = detectRulebookProfile(textEn, "Petersen's Field Guide to Lovecraftian Horrors.pdf");
      expect(resEn.profile).toBe("bestiary");
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

      // Scenariusze pojawiające się dopiero w dalszej części dokumentu (>150 000 znaków) i złamane nową linią
      const lateScenarioCore =
        "Zew Cthulhu Księga Strażnika. Walka, Pościgi, Poczytalność i Magia k100. " +
        "x".repeat(160000) +
        "\nROZDZIAŁ 15.1\nPOŚRÓD\nPRADAWNYCH DRZEW\nROZDZIAŁ 15.2\nSZKARŁATNE\nLITERY";
      const resLateCore = detectRulebookProfile(lateScenarioCore, "ZewCthulhu_KsiegaStraznika_v.1.3.pdf");
      expect(resLateCore.profile).toBe("core-d100");
      expect(resLateCore.detectedFeatures.hasScenarios).toBe(true);
      expect(resLateCore.semanticPlan.detectedCategories).toContain("FABULA");
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

  describe("Zamknięty katalog oficjalnych publikacji Black Monk (PL) i Chaosium (EN)", () => {
    it("rozpoznaje oficjalne kampanie z katalogu wydawców", () => {
      const harvest = detectRulebookProfile(
        "Czas Żniw. Kampania do Zewu Cthulhu w sześciu epizodach. Tajemnice studenckiej ekspedycji w Vermont.",
        "Zew Cthulhu - Czas Zniw.pdf"
      );
      expect(harvest.profile).toBe("mega_campaign");
      expect(harvest.title).toBe("Czas Żniw");

      const fear = detectRulebookProfile(
        "The Children of Fear. An epic 1920s campaign across Northern India and Tibet for Call of Cthulhu.",
        "The Children of Fear.pdf"
      );
      expect(fear.profile).toBe("mega_campaign");
      expect(fear.title).toBe("The Children of Fear");

      const serpent = detectRulebookProfile(
        "The Two-Headed Serpent. An epic action-packed Pulp Cthulhu campaign spanning Bolivia, New York and Iceland.",
        "The Two-Headed Serpent.pdf"
      );
      expect(serpent.profile).toBe("mega_campaign");
      expect(serpent.title).toBe("The Two-Headed Serpent");

      const mountains = detectRulebookProfile(
        "Beyond the Mountains of Madness. The stark-white Antarctic expedition campaign for Call of Cthulhu.",
        "Beyond the Mountains of Madness.pdf"
      );
      expect(mountains.profile).toBe("mega_campaign");
      expect(mountains.title).toBe("Beyond the Mountains of Madness");
    });

    it("rozpoznaje oficjalne antologie z katalogu wydawców", () => {
      const doorsPl = detectRulebookProfile(
        "Wrota Mroku. Zbiór pięciu scenariuszy śledczych dla początkujących Badaczy do 7. edycji Zewu Cthulhu.",
        "Wrota Mroku.pdf"
      );
      expect(doorsPl.profile).toBe("scenario_anthology");
      expect(doorsPl.title).toBe("Wrota Mroku");

      const doorsEn = detectRulebookProfile(
        "Doors to Darkness. Five scenarios for beginning Keepers and investigators of Call of Cthulhu.",
        "Doors to Darkness.pdf"
      );
      expect(doorsEn.profile).toBe("scenario_anthology");
      expect(doorsEn.title).toBe("Doors to Darkness");

      const mansions = detectRulebookProfile(
        "Mansions of Madness. Five tales of sinister domiciles and dark secrets for Call of Cthulhu.",
        "Mansions of Madness Vol 1.pdf"
      );
      expect(mansions.profile).toBe("scenario_anthology");
      expect(mansions.title).toBe("Mansions of Madness");

      const nameless = detectRulebookProfile(
        "Nameless Horrors. Six deadly standalone adventures set across different eras of Call of Cthulhu.",
        "Nameless Horrors.pdf"
      );
      expect(nameless.profile).toBe("scenario_anthology");
      expect(nameless.title).toBe("Nameless Horrors");

      const cults = detectRulebookProfile(
        "Kulty Cthulhu. Przewodnik po mrocznych sektach i trzy gotowe scenariusze do Zewu Cthulhu.",
        "Kulty Cthulhu.pdf"
      );
      expect(cults.profile).toBe("scenario_anthology");
      expect(cults.title).toBe("Kulty Cthulhu");
    });

    it("rozpoznaje oficjalne settingi i epoki z katalogu wydawców", () => {
      const berlinPl = detectRulebookProfile(
        "Berlin: Miasto Grzechu. Złote lata dwudzieste w Republice Weimarskiej i mroczne sekrety Zewu Cthulhu.",
        "Berlin - Miasto Grzechu.pdf"
      );
      expect(berlinPl.profile).toBe("setting_expansion");
      expect(berlinPl.title).toBe("Berlin: Miasto Grzechu");

      const berlinEn = detectRulebookProfile(
        "Berlin: The Wicked City. Unveiling Weimar Berlin during the interwar years for Call of Cthulhu.",
        "Berlin The Wicked City.pdf"
      );
      expect(berlinEn.profile).toBe("setting_expansion");
      expect(berlinEn.title).toBe("Berlin: The Wicked City");

      const darkAges = detectRulebookProfile(
        "Cthulhu Dark Ages. 10th century Anglo-Saxon horrors, castles, and pagan mysteries in Call of Cthulhu.",
        "Cthulhu Dark Ages 3rd Edition.pdf"
      );
      expect(darkAges.profile).toBe("setting_expansion");
      expect(darkAges.title).toBe("Cthulhu Dark Ages");

      const gaslight = detectRulebookProfile(
        "Cthulhu by Gaslight. Victorian London, smog, and fog-shrouded investigations for Call of Cthulhu.",
        "Cthulhu by Gaslight.pdf"
      );
      expect(gaslight.profile).toBe("setting_expansion");
      expect(gaslight.title).toBe("Cthulhu by Gaslight");

      const arkham = detectRulebookProfile(
        "Call of Cthulhu: Arkham. Unveiling the legend-haunted city in Massachusetts and its hidden horrors.",
        "Call of Cthulhu Arkham.pdf"
      );
      expect(arkham.profile).toBe("setting_expansion");
      expect(arkham.title).toBe("Call of Cthulhu: Arkham");
    });

    it("rozpoznaje oficjalne scenariusze jednostrzałowe z katalogu wydawców", () => {
      const haunting = detectRulebookProfile(
        "Nawiedzony Dom. Badanie ponurej posiadłości Waltera Corbitta w Bostonie dla Zewu Cthulhu.",
        "Nawiedzony Dom.pdf"
      );
      expect(haunting.profile).toBe("one_shot");
      expect(haunting.title).toBe("Nawiedzony Dom");

      const edge = detectRulebookProfile(
        "Edge of Darkness. The dying secret of Marion Allen and the locked cottage for Call of Cthulhu.",
        "Edge of Darkness.pdf"
      );
      expect(edge.profile).toBe("one_shot");
      expect(edge.title).toBe("Edge of Darkness");

      const boarder = detectRulebookProfile(
        "Nieboszczyk w hotelu. Zbrodnia w pensjonacie Ma i śledztwo w pokoju denata do Zewu Cthulhu.",
        "Nieboszczyk w hotelu.pdf"
      );
      expect(boarder.profile).toBe("one_shot");
      expect(boarder.title).toBe("Nieboszczyk w hotelu");

      const blackwater = detectRulebookProfile(
        "Blackwater Creek. A corrupt town in Massachusetts and the cursed spring for Call of Cthulhu.",
        "Blackwater Creek.pdf"
      );
      expect(blackwater.profile).toBe("one_shot");
      expect(blackwater.title).toBe("Blackwater Creek");

      const derelict = detectRulebookProfile(
        "The Derelict. An abandoned luxury vessel in the icy North Atlantic for Call of Cthulhu.",
        "The Derelict.pdf"
      );
      expect(derelict.profile).toBe("one_shot");
      expect(derelict.title).toBe("The Derelict");
    });
  });
});
