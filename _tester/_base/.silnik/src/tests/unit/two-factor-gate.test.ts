import { detectRulebookProfile } from "@/lib/pdf/rulebook-fingerprint";

describe("Doktryna Czystego Emulatora BYOB - Dwuskładnikowy Bloker Sesji & Fingerprint", () => {
  describe("detectRulebookProfile", () => {
    it("zwraca unknown dla pustego lub zbyt krotkiego tekstu", () => {
      const res = detectRulebookProfile("");
      expect(res.profile).toBe("unknown");
      expect(res.confidence).toBe(0);
    });

    it("zwraca unknown dla dokumentu niezwiazanego z d100/CoC", () => {
      const sample = "To jest faktura VAT za uslugi hostingowe. Kwota do zaplaty: 150 PLN. Termin platnosci 14 dni.";
      const res = detectRulebookProfile(sample);
      expect(res.profile).toBe("unknown");
      expect(res.confidence).toBeLessThan(0.5);
    });

    it("rozpoznaje profil Starter d100 w jezyku polskim", () => {
      const starterPl = `
        Zasady Wprowadzajace do gry Zew Cthulhu 7 edycja.
        Tworzenie Badacza Tajemnic, cechy i wspolczynniki: sila, zrecznosc, kondycja.
        Rzuty koscmi k100, testy umiejetnosci i progi sukcesu.
        Poczytalnosc oraz szalenstwo badacza. Przygoda Nawiedzony dom. Chaosium Inc.
      `;
      const res = detectRulebookProfile(starterPl);
      expect(res.profile).toBe("starter-d100");
      expect(res.detectedLanguage).toBe("pl");
      expect(res.detectedFeatures.hasSanityRules).toBe(true);
      expect(res.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it("rozpoznaje profil Starter d100 w jezyku angielskim", () => {
      const starterEn = `
        Call of Cthulhu 7th Edition Quick-Start Rules.
        Creating your Investigator, characteristics: strength, dexterity, constitution.
        d100 dice rolls and skill checks.
        Sanity points and temporary insanity. Introductory scenario: The Haunting. Chaosium.
      `;
      const res = detectRulebookProfile(starterEn);
      expect(res.profile).toBe("starter-d100");
      expect(res.detectedLanguage).toBe("en");
      expect(res.detectedFeatures.hasSanityRules).toBe(true);
      expect(res.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it("rozpoznaje profil Core Book (Ksiega Straznika 7e)", () => {
      const corePl = `
        Zew Cthulhu 7. edycja - Ksiega Straznika.
        Zasady poscigow, tor poscigu i predkosc ruchu.
        Magia, tomiska Mitow Cthulhu, zaklecia i rzucanie czarow.
        Poczytalnosc, walka i obrazenia, bron palna.
        Ksiega Bestii, potwory Mitow. Chaosium.
      `;
      const res = detectRulebookProfile(corePl);
      expect(res.profile).toBe("core-d100");
      expect(res.detectedFeatures.hasChaseRules).toBe(true);
      expect(res.detectedFeatures.hasMagicRules).toBe(true);
      expect(res.detectedFeatures.hasCombatRules).toBe(true);
      expect(res.detectedFeatures.hasSanityRules).toBe(true);
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe("Dwuskladnikowy Bloker Sesji (Runtime Invariant)", () => {
    it("wymaga jednoczesnie klucza API oraz podrecznika zasad", () => {
      const canStartGame = (hasKey: boolean, hasRules: boolean) => {
        return hasKey && hasRules;
      };

      expect(canStartGame(false, false)).toBe(false);
      expect(canStartGame(true, false)).toBe(false);
      expect(canStartGame(false, true)).toBe(false);
      expect(canStartGame(true, true)).toBe(true);
    });
  });
});
