/**
 * capabilities-manager.ts - Menedżer możliwości systemowych i rejestr nakładek DLC w lokalnym RAG
 * Doktryna "Czystego Emulatora BYOB" (Clean Room Engine).
 *
 * Zarządza rejestrem data/rag/capabilities.json oraz plikami data/rag/overlays/<id>.json.
 * Informuje silnik i model AI o dostępności zaawansowanych mechanik (pościgi, magia, pulp),
 * ilości odblokowanych bestii, czarów, postaci NPC i scenariuszy.
 */

import fs from "fs";
import path from "path";
import { getWritableDataDir } from "@/lib/paths";
import {
  RulebookProfile,
  SemanticTag,
} from "./rulebook-fingerprint";
import { OverlayDescriptor } from "./semantic-overlay-engine";

export interface InstalledOverlayInfo {
  id: string;
  title: string;
  fileName: string;
  profile: RulebookProfile;
  installedAt: string;
  tags: SemanticTag[];
  overlayPath: string;
  stats: {
    npcCount: number;
    creatureCount: number;
    spellCount: number;
    ruleCount: number;
    handoutCount: number;
    adventureCount: number;
  };
}

export interface SystemCapabilities {
  installedOverlays: InstalledOverlayInfo[];
  flags: {
    hasChaseRules: boolean;
    hasMagicSystem: boolean;
    hasPulpTalents: boolean;
    hasSanityRules: boolean;
    hasCombatRules: boolean;
  };
  counts: {
    totalNpcs: number;
    totalCreatures: number;
    totalSpells: number;
    totalHandouts: number;
    totalAdventures: number;
  };
  lastUpdated: string;
}

export function getRagDirectory(): string {
  return process.env.RAG_DATA_DIR || path.join(getWritableDataDir(), "rag");
}

export function getCapabilitiesPath(): string {
  return path.join(getRagDirectory(), "capabilities.json");
}

export function getOverlaysDirectory(): string {
  return path.join(getRagDirectory(), "overlays");
}

function createEmptyCapabilities(): SystemCapabilities {
  return {
    installedOverlays: [],
    flags: {
      hasChaseRules: false,
      hasMagicSystem: false,
      hasPulpTalents: false,
      hasSanityRules: false,
      hasCombatRules: false,
    },
    counts: {
      totalNpcs: 0,
      totalCreatures: 0,
      totalSpells: 0,
      totalHandouts: 0,
      totalAdventures: 0,
    },
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Wczytuje stan możliwości systemowych z capabilities.json
 */
export function loadCapabilities(): SystemCapabilities {
  try {
    const filePath = getCapabilitiesPath();
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(content) as SystemCapabilities;
      if (parsed && Array.isArray(parsed.installedOverlays)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("⚠️ Błąd odczytu capabilities.json, inicjalizacja domyślnego:", err);
  }
  return createEmptyCapabilities();
}

/**
 * Zapisuje stan możliwości systemowych do capabilities.json
 */
export function saveCapabilities(caps: SystemCapabilities): void {
  const ragDir = getRagDirectory();
  if (!fs.existsSync(ragDir)) {
    fs.mkdirSync(ragDir, { recursive: true });
  }

  caps.lastUpdated = new Date().toISOString();
  const filePath = getCapabilitiesPath();
  fs.writeFileSync(filePath, JSON.stringify(caps, null, 2), "utf-8");
}

/**
 * Przelicza flagi i sumaryczne liczniki na podstawie zainstalowanych nakładek
 */
function recalculateCapabilities(caps: SystemCapabilities, overlaysDir: string): void {
  let hasChase = false;
  let hasMagic = false;
  let hasPulp = false;
  let hasSanity = false;
  let hasCombat = false;

  let totalNpcs = 0;
  let totalCreatures = 0;
  let totalSpells = 0;
  let totalHandouts = 0;
  let totalAdventures = 0;

  for (const info of caps.installedOverlays) {
    totalNpcs += info.stats.npcCount || 0;
    totalCreatures += info.stats.creatureCount || 0;
    totalSpells += info.stats.spellCount || 0;
    totalHandouts += info.stats.handoutCount || 0;
    totalAdventures += info.stats.adventureCount || 0;

    if (info.stats.spellCount > 0 || info.tags.includes("CZARY")) hasMagic = true;

    // Sprawdzamy zawartość pliku nakładki dla flag szczegółowych
    try {
      const overlayFile = path.isAbsolute(info.overlayPath)
        ? info.overlayPath
        : path.join(overlaysDir, path.basename(info.overlayPath));
      if (fs.existsSync(overlayFile)) {
        const desc = JSON.parse(fs.readFileSync(overlayFile, "utf-8")) as OverlayDescriptor;
        if (desc.features?.hasChaseRules) hasChase = true;
        if (desc.features?.hasMagicRules || desc.features?.hasSpells) hasMagic = true;
        if (desc.features?.hasPulpTalents) hasPulp = true;
        if (desc.features?.hasSanityRules) hasSanity = true;
        if (desc.features?.hasCombatRules) hasCombat = true;
      }
    } catch (e) {
      // Ignorujemy błędy odczytu pojedynczej nakładki
    }
  }

  caps.flags = {
    hasChaseRules: hasChase,
    hasMagicSystem: hasMagic,
    hasPulpTalents: hasPulp,
    hasSanityRules: hasSanity,
    hasCombatRules: hasCombat,
  };

  caps.counts = {
    totalNpcs,
    totalCreatures,
    totalSpells,
    totalHandouts,
    totalAdventures,
  };
}

/**
 * Rejestruje nową nakładkę semantyczną DLC
 */
export function registerOverlay(overlay: OverlayDescriptor): SystemCapabilities {
  const overlaysDir = getOverlaysDirectory();
  if (!fs.existsSync(overlaysDir)) {
    fs.mkdirSync(overlaysDir, { recursive: true });
  }

  const overlayFileName = `${overlay.id}.json`;
  const overlayFilePath = path.join(overlaysDir, overlayFileName);
  fs.writeFileSync(overlayFilePath, JSON.stringify(overlay, null, 2), "utf-8");

  const caps = loadCapabilities();

  const overlayInfo: InstalledOverlayInfo = {
    id: overlay.id,
    title: overlay.title,
    fileName: overlay.fileName,
    profile: overlay.profile,
    installedAt: new Date().toISOString(),
    tags: overlay.tags,
    overlayPath: overlayFilePath,
    stats: overlay.stats,
  };

  const existingIdx = caps.installedOverlays.findIndex((o) => o.id === overlay.id);
  if (existingIdx >= 0) {
    caps.installedOverlays[existingIdx] = overlayInfo;
  } else {
    caps.installedOverlays.push(overlayInfo);
  }

  recalculateCapabilities(caps, overlaysDir);
  saveCapabilities(caps);
  return caps;
}

/**
 * Usuwa zarejestrowaną nakładkę DLC
 */
export function removeOverlay(overlayId: string): SystemCapabilities {
  const caps = loadCapabilities();
  const overlaysDir = getOverlaysDirectory();

  const targetIdx = caps.installedOverlays.findIndex((o) => o.id === overlayId);
  if (targetIdx >= 0) {
    const info = caps.installedOverlays[targetIdx];
    try {
      if (fs.existsSync(info.overlayPath)) {
        fs.unlinkSync(info.overlayPath);
      }
    } catch (e) {
      console.warn("⚠️ Nie udało się usunąć pliku nakładki:", e);
    }
    caps.installedOverlays.splice(targetIdx, 1);
  }

  recalculateCapabilities(caps, overlaysDir);
  saveCapabilities(caps);
  return caps;
}

/**
 * Generuje zwięzłą sekcję promptu wstrzykiwaną do modelu AI
 */
export function getSystemCapabilitiesPromptSection(locale: "pl" | "en" = "pl"): string {
  const caps = loadCapabilities();
  if (caps.installedOverlays.length === 0) {
    return "";
  }

  const isEn = locale === "en";

  let out = isEn
    ? "\n## SYSTEM CAPABILITIES & UNLOCKED CONTENT (DLC OVERLAYS)\n"
    : "\n## ODBLOKOWANA ZAWARTOŚĆ I MODUŁY SYSTEMOWE (DLC OVERLAYS)\n";

  out += isEn
    ? `- **Active Modules:** ${caps.installedOverlays.map((o) => `${o.title} [${o.profile}]`).join(", ")}\n`
    : `- **Aktywne moduły:** ${caps.installedOverlays.map((o) => `${o.title} [${o.profile}]`).join(", ")}\n`;

  const unlockedMechanics: string[] = [];
  if (caps.flags.hasChaseRules) unlockedMechanics.push(isEn ? "Chase Rules" : "Zasady Pościgów");
  if (caps.flags.hasSanityRules) unlockedMechanics.push(isEn ? "Sanity & Madness RAW" : "Poczytalność i Szaleństwo RAW");
  if (caps.flags.hasMagicSystem) unlockedMechanics.push(isEn ? "Magic System & Spells" : "System Magii i Zaklęcia");
  if (caps.flags.hasPulpTalents) unlockedMechanics.push(isEn ? "Pulp Cthulhu Talents" : "Talenty Pulpu");
  if (caps.flags.hasCombatRules) unlockedMechanics.push(isEn ? "Advanced Combat Maneuvers" : "Zaawansowane Manewry Bojowe");

  if (unlockedMechanics.length > 0) {
    out += isEn
      ? `- **Unlocked Mechanics:** ${unlockedMechanics.join(", ")}\n`
      : `- **Odblokowane mechaniki:** ${unlockedMechanics.join(", ")}\n`;
  }

  out += isEn
    ? `- **Entity Totals:** ${caps.counts.totalNpcs} NPCs, ${caps.counts.totalCreatures} Creatures, ${caps.counts.totalSpells} Spells, ${caps.counts.totalHandouts} Handouts, ${caps.counts.totalAdventures} Adventures.\n`
    : `- **Dostępne zasoby:** ${caps.counts.totalNpcs} NPC, ${caps.counts.totalCreatures} Stworzeń, ${caps.counts.totalSpells} Zaklęć, ${caps.counts.totalHandouts} Rekwizytów, ${caps.counts.totalAdventures} Przygód.\n`;

  out += isEn
    ? "Adhere to unlocked mechanics when resolving relevant scenes and narrative tests.\n"
    : "Uwzględniaj odblokowane mechaniki podczas rozstrzygania odpowiednich scen i testów narracyjnych.\n";

  return out;
}
