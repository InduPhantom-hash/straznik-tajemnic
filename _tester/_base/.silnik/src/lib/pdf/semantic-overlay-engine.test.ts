import {
  generateSemanticOverlay,
  extractNPCs,
  extractCreatures,
  extractSpells,
  extractHandouts,
  extractRules,
} from "./semantic-overlay-engine";
import { detectRulebookProfile } from "./rulebook-fingerprint";

describe("semantic-overlay-engine - Silnik Nakładek Semantycznych DLC", () => {
  describe("Ekstrakcja encji bazowych", () => {
    it("ekstrahuje NPC z wiekiem, maską i rolą", () => {
      const sampleText = "Arthur Hastings, lat 42, prywatny detektyw z Bostonu. Ma tajemnicze powiązania z lokalnym kultem.\nBeatrice Cole, age 29, reporterka śledcza gazety Arkham Advertiser.";
      const npcs = extractNPCs(sampleText);
      expect(npcs.length).toBeGreaterThanOrEqual(2);
      expect(npcs[0].name).toBe("Arthur Hastings");
      expect(npcs[0].role).toContain("detektyw");
      expect(npcs[0].hiddenGoal).toContain("kult");
      expect(npcs[1].name).toBe("Beatrice Cole");
    });

    it("ekstrahuje Potwory i Bóstwa z utratą poczytalności", () => {
      const sampleText = "Potwór: Mroczny Młody Shub-Niggurath\nUtrata Poczytalności: 1k3/1k10\nPancerz: 4 punkty grubej skóry\nAtaki: 4 macki, tratowanie\n\nBóstwo: Cthulhu\nWielki Przedwieczny spoczywający w Rlyeh.\nUtrata Poczytalności: 1k10/1k100\nPancerz: 21 punktów\nAtaki: Pochwycenie, zmiażdżenie";
      const creatures = extractCreatures(sampleText);
      expect(creatures.length).toBe(2);
      expect(creatures[0].sanLoss).toBe("1k3/1k10");
      expect(creatures[0].armor).toContain("4 punkty");
      expect(creatures[0].category).toBe("potwor");
      expect(creatures[1].category).toBe("bostwo");
      expect(creatures[1].sanLoss).toBe("1k10/1k100");
    });

    it("ekstrahuje Zaklęcia z kosztami i głęboką magią", () => {
      const sampleText = "Zaklęcie: Związanie Potwora\nKoszt magii: 5 Punktów Magii\nKoszt Poczytalności: 1k4 Poczytalności\nCzas rzucania: 1 runda\nZasięg: 10 metrów\nGłęboka magia pozwala na stałe uwięzienie bytu.";
      const spells = extractSpells(sampleText);
      expect(spells.length).toBe(1);
      expect(spells[0].name).toBe("Związanie Potwora");
      expect(spells[0].magicCost).toBe("5 Punktów Magii");
      expect(spells[0].sanCost).toBe("1k4 Poczytalności");
      expect(spells[0].deepMagic).toBe(true);
    });

    it("ekstrahuje Rekwizyty i materiały do odczytania", () => {
      const sampleText = "Rekwizyt 1 - List od mecenasa\nDrogi przyjacielu, piszę ten list w pośpiechu, gdyż czuję, że cienie wokół posiadłości gęstnieją.\n\nRekwizyt 2 - Wycinek z gazety\nTajemniczy pożar w dokach portowych pochłonął trzy magazyny.\n";
      const handouts = extractHandouts(sampleText);
      expect(handouts.length).toBe(2);
      expect(handouts[0].number).toBe("1");
      expect(handouts[0].content).toContain("Drogi przyjacielu");
      expect(handouts[1].number).toBe("2");
      expect(handouts[1].content).toContain("Tajemniczy pożar");
    });
  });

  describe("Generowanie pełnej nakładki semantycznej DLC", () => {
    it("generuje nakładkę dla One-Shot (Trzeba karmić ogień)", () => {
      const text = "Trzeba karmić ogień. Zwięzły scenariusz do gry d100.\nPosiadłość rodziny Vance na odludziu.\nArthur Vance, lat 60, samotny nestor rodu. Ukrywa ponury sekret w piwnicy.\nRekwizyt 1 - Dziennik Arthura\nDziś ogień zażądał nowej ofiary.\n";
      const fingerprint = detectRulebookProfile(text);
      const overlay = generateSemanticOverlay(text, fingerprint, "trzeba-karmic-ogien.pdf");

      expect(overlay.profile).toBe("one_shot");
      expect(overlay.tags).toContain("FABULA");
      expect(overlay.tags).toContain("NPC");
      expect(overlay.tags).toContain("REKWIZYTY");
      expect(overlay.entities.adventures.length).toBe(1);
      expect(overlay.entities.adventures[0].type).toBe("one_shot");
      expect(overlay.entities.adventures[0].nodes?.length).toBeGreaterThanOrEqual(3);
    });

    it("generuje nakładkę dla Antologii scenariuszy z hermetycznymi subAdventures (Cienie Tatr)", () => {
      const text = "Cienie Tatr. Antologia scenariuszy d100.\nScenariusz 1: Na Grani\nPrzewodnik Staszek, lat 50, stary góral tatrzański.\nRekwizyt 1 - Mapa szlaku Czerwonych Wierchów\n\nScenariusz 2: Morskie Oko w Mroku\nDoktor Janina, lat 38, botanik badająca endemiczne mchy.\nRekwizyt 2 - Próbka z dna jeziora\n";
      const fingerprint = detectRulebookProfile(text);
      const overlay = generateSemanticOverlay(text, fingerprint, "cienie-tatr.pdf");

      expect(overlay.profile).toBe("scenario_anthology");
      expect(overlay.entities.adventures[0].type).toBe("scenario_anthology");
      expect(overlay.entities.adventures[0].subAdventures?.length).toBe(2);
      const sub1 = overlay.entities.adventures[0].subAdventures![0];
      const sub2 = overlay.entities.adventures[0].subAdventures![1];
      expect(sub1.title).toContain("Na Grani");
      expect(sub2.title).toContain("Morskie Oko");
      expect(sub1.npcIds.length).toBeGreaterThan(0);
      expect(sub2.npcIds.length).toBeGreaterThan(0);
      expect(sub1.npcIds).not.toEqual(sub2.npcIds);
    });

    it("generuje nakładkę dla Mega-Kampanii z 3-poziomową hierarchią (Maski Nyarlathotepa)", () => {
      const text = "Maski Nyarlathotepa. Epicka kampania do gry d100.\nSpis treści:\nAkt 1: Nowy Jork i morderstwo Jacksona Eliasa.\nAkt 2: Londyn i Bractwo Czarnego Faraona.\nAkt 3: Kair i ekspedycja Clivea.\nDramatis Personae:\nJackson Elias, lat 38, autor książek o kultach. Zostaje zamordowany.\n";
      const fingerprint = detectRulebookProfile(text);
      const overlay = generateSemanticOverlay(text, fingerprint, "maski-nyarlathotepa.pdf");

      expect(overlay.profile).toBe("mega_campaign");
      const adv = overlay.entities.adventures[0];
      expect(adv.type).toBe("mega_campaign");
      expect(adv.campaignHierarchy).toBeDefined();
      expect(adv.campaignHierarchy!.metaPlot.grandArc).toBeDefined();
      expect(adv.campaignHierarchy!.acts.length).toBeGreaterThanOrEqual(3);
      expect(adv.campaignHierarchy!.acts[0].scenes.length).toBeGreaterThanOrEqual(3);
      expect(adv.campaignHierarchy!.acts[0].crossRegionalLinks.length).toBeGreaterThan(0);
    });
  });
});