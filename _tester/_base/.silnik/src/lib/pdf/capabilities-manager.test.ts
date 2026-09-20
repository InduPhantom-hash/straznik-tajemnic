import fs from "fs";
import path from "path";
import os from "os";
import {
  loadCapabilities,
  registerOverlay,
  removeOverlay,
  getSystemCapabilitiesPromptSection,
  getCapabilitiesPath,
  getOverlaysDirectory,
} from "./capabilities-manager";
import { OverlayDescriptor } from "./semantic-overlay-engine";

describe("capabilities-manager - Rejestr Możliwości i Nakładek DLC", () => {
  const tmpDir = path.join(os.tmpdir(), "straznik-caps-test-" + Date.now());

  beforeAll(() => {
    process.env.RAG_DATA_DIR = path.join(tmpDir, "rag");
  });

  afterAll(() => {
    try {
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    } catch (e) {
      // Ignorujemy błędy sprzątania katalogu tmp
    }
  });

  const mockOverlay: OverlayDescriptor = {
    id: "overlay-test-grimoire",
    title: "Wielki Grymuar Magii",
    fileName: "grimoire.pdf",
    profile: "grimoire",
    version: "1.0.0",
    createdAt: new Date().toISOString(),
    tags: ["CZARY", "MECHANIKA"],
    features: {
      hasCombatRules: false,
      hasSanityRules: true,
      hasChaseRules: true,
      hasMagicRules: true,
      hasSpells: true,
    },
    stats: {
      npcCount: 2,
      creatureCount: 1,
      spellCount: 15,
      ruleCount: 2,
      handoutCount: 3,
      adventureCount: 0,
    },
    entities: {
      npcs: [],
      creatures: [],
      spells: [],
      rules: [],
      handouts: [],
      adventures: [],
    },
  };

  it("zwraca pusty stan na czystym środowisku", () => {
    const caps = loadCapabilities();
    expect(caps.installedOverlays).toEqual([]);
    expect(caps.flags.hasMagicSystem).toBe(false);
    expect(caps.counts.totalSpells).toBe(0);
  });

  it("rejestruje nową nakładkę semantyczną DLC i aktualizuje capabilities.json", () => {
    const caps = registerOverlay(mockOverlay);
    expect(caps.installedOverlays.length).toBe(1);
    expect(caps.installedOverlays[0].id).toBe("overlay-test-grimoire");
    expect(caps.flags.hasMagicSystem).toBe(true);
    expect(caps.flags.hasChaseRules).toBe(true);
    expect(caps.flags.hasSanityRules).toBe(true);
    expect(caps.counts.totalSpells).toBe(15);
    expect(caps.counts.totalNpcs).toBe(2);

    // Sprawdzamy fizyczne pliki
    expect(fs.existsSync(getCapabilitiesPath())).toBe(true);
    const overlayFilePath = path.join(getOverlaysDirectory(), "overlay-test-grimoire.json");
    expect(fs.existsSync(overlayFilePath)).toBe(true);
  });

  it("generuje sekcję promptu z odblokowaną zawartością", () => {
    const plSection = getSystemCapabilitiesPromptSection("pl");
    expect(plSection).toContain("ODBLOKOWANA ZAWARTOŚĆ I MODUŁY SYSTEMOWE");
    expect(plSection).toContain("Wielki Grymuar Magii");
    expect(plSection).toContain("System Magii i Zaklęcia");
    expect(plSection).toContain("15 Zaklęć");

    const enSection = getSystemCapabilitiesPromptSection("en");
    expect(enSection).toContain("SYSTEM CAPABILITIES & UNLOCKED CONTENT");
    expect(enSection).toContain("Magic System & Spells");
    expect(enSection).toContain("15 Spells");
  });

  it("usuwa nakładkę DLC i przelicza możliwości", () => {
    const caps = removeOverlay("overlay-test-grimoire");
    expect(caps.installedOverlays.length).toBe(0);
    expect(caps.flags.hasMagicSystem).toBe(false);
    expect(caps.flags.hasChaseRules).toBe(false);
    expect(caps.counts.totalSpells).toBe(0);

    const emptySection = getSystemCapabilitiesPromptSection("pl");
    expect(emptySection).toBe("");
  });
});
