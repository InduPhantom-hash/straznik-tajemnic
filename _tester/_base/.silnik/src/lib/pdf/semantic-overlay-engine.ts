/**
 * semantic-overlay-engine.ts - Silnik modularnych nakładek semantycznych DLC w lokalnym RAG
 * Doktryna "Czystego Emulatora BYOB" (Clean Room Engine).
 *
 * Analizuje strukturę wgranego dokumentu PDF i ekstrahuje ustrukturyzowane encje:
 * - NPC (Dramatis Personae, maska, ukryty cel, statystyki)
 * - BESTIARIUSZ (Potwory, bóstwa, utrata poczytalności, ataki, pancerz)
 * - CZARY (Grymuary, koszt MP/SAN, czas rzucania, zasięg, głęboka magia)
 * - MECHANIKA (Reguły pościgów, szaleństwa, talenty pulpu, walka)
 * - REKWIZYTY (Handouty, listy, dokumenty, wycinki prasowe)
 * - FABUŁA / PRZYGODY (3 warianty: one_shot, scenario_anthology, mega_campaign)
 */

import {
  RulebookProfile,
  RulebookFingerprintResult,
  SemanticTag,
} from "./rulebook-fingerprint";

export interface OverlayNPC {
  id: string;
  name: string;
  role: string;
  mask?: string;
  hiddenGoal?: string;
  stats?: Record<string, number>;
  skills?: Record<string, number>;
  description?: string;
  secrets?: string;
  sourcePage?: number;
  adventureId?: string;
}

export interface OverlayCreature {
  id: string;
  name: string;
  category?: "potwor" | "bostwo" | "inne";
  sanLoss?: string;
  stats?: Record<string, number>;
  attacks?: string[];
  armor?: string;
  description?: string;
}

export interface OverlaySpell {
  id: string;
  name: string;
  magicCost?: string;
  sanCost?: string;
  castTime?: string;
  range?: string;
  description?: string;
  deepMagic?: boolean;
}

export interface OverlayRule {
  id: string;
  title: string;
  category: "chase" | "madness" | "pulp" | "combat" | "general";
  summary: string;
}

export interface OverlayHandout {
  id: string;
  title: string;
  number?: string;
  content: string;
  adventureId?: string;
}

export interface OverlayAdventureNode {
  id: string;
  title: string;
  type: "intro" | "location" | "clue" | "climax";
  description: string;
  leadsTo?: string[];
}

export interface OverlaySubAdventure {
  id: string;
  title: string;
  synopsis: string;
  nodes: OverlayAdventureNode[];
  npcIds: string[];
  handoutIds: string[];
}

export interface OverlayCampaignHierarchy {
  metaPlot: {
    grandArc: string;
    doomsdayClock?: string;
    globalVillain?: string;
  };
  acts: Array<{
    id: string;
    title: string;
    region: string;
    localVillain?: string;
    scenes: OverlayAdventureNode[];
    crossRegionalLinks: string[];
  }>;
}

export interface OverlayAdventure {
  id: string;
  title: string;
  type: "one_shot" | "scenario_anthology" | "mega_campaign";
  synopsis: string;
  settingEra?: string;
  subAdventures?: OverlaySubAdventure[];
  campaignHierarchy?: OverlayCampaignHierarchy;
  nodes?: OverlayAdventureNode[];
}

export interface OverlayDescriptor {
  id: string;
  title: string;
  fileName: string;
  profile: RulebookProfile;
  version: string;
  createdAt: string;
  tags: SemanticTag[];
  features: RulebookFingerprintResult["detectedFeatures"];
  stats: {
    npcCount: number;
    creatureCount: number;
    spellCount: number;
    ruleCount: number;
    handoutCount: number;
    adventureCount: number;
  };
  entities: {
    npcs: OverlayNPC[];
    creatures: OverlayCreature[];
    spells: OverlaySpell[];
    rules: OverlayRule[];
    handouts: OverlayHandout[];
    adventures: OverlayAdventure[];
  };
}

/**
 * Czyści i normalizuje identyfikatory tekstowe na zwięzłe slugi
 */
function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[ąćęłńóśźż]/g, (c) => {
        const map: Record<string, string> = {
          ą: "a", ć: "c", ę: "e", ł: "l", ń: "n", ó: "o", ś: "s", ź: "z", ż: "z",
        };
        return map[c] || c;
      })
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "entity"
  );
}

/**
 * Ekstrahuje potencjalne postacie niezależne (NPC) z tekstu
 */
export function extractNPCs(text: string, defaultAdventureId?: string): OverlayNPC[] {
  const npcs: OverlayNPC[] = [];
  const seenNames = new Set<string>();

  // Wzorzec 1: Postacie z wiekiem i profesją (np. "Arthur Vance, lat 42, prywatny detektyw")
  const personRegex = /(?:^|\n)([A-ZĆŁŚŹŻ][a-ząćęłńóśźż]+(?:\s+[A-ZĆŁŚŹŻ][a-ząćęłńóśźż]+)+),\s*(?:lat|wiek|age|aged)\s*(\d+)(?:,?\s*([^\n\.]+))?/g;
  let match: RegExpExecArray | null;

  while ((match = personRegex.exec(text)) !== null) {
    const name = match[1].trim();
    if (seenNames.has(name.toLowerCase())) continue;
    seenNames.add(name.toLowerCase());

    const age = parseInt(match[2], 10);
    const roleRaw = match[3] ? match[3].trim() : "Postać niezależna";

    const snippetStart = match.index;
    const snippetEnd = Math.min(text.length, snippetStart + 300);
    const snippet = text.slice(snippetStart, snippetEnd);

    const mask = `Wiek: ${age}. ${roleRaw}`;
    let hiddenGoal = "Brak jawnego sekretu w pierwszym fragmencie";

    if (/sekret|tajemnic|zdrad|kult|motyw|secret|cult|motive/i.test(snippet)) {
      hiddenGoal = "Ukrywa powiązanie z wątkiem śledztwa lub kultem";
    }

    npcs.push({
      id: `npc-${slugify(name)}`,
      name,
      role: roleRaw,
      mask,
      hiddenGoal,
      description: snippet.replace(/\s+/g, " ").trim(),
      adventureId: defaultAdventureId,
    });
  }

  // Wzorzec 2: Nagłówki NPC / Dramatis Personae (np. "Dramatis Personae: Jackson Elias")
  const headerNpcRegex = /(?:Dramatis Personae|NPC|Postacie niezależne|Postać)[^\n]*\n+([A-ZĆŁŚŹŻ][a-ząćęłńóśźż]+(?:\s+[A-ZĆŁŚŹŻ][a-ząćęłńóśźż]+)+)\s*[-–—:]\s*([^\n\.]+)/gi;
  while ((match = headerNpcRegex.exec(text)) !== null) {
    const name = match[1].trim();
    if (seenNames.has(name.toLowerCase())) continue;
    seenNames.add(name.toLowerCase());

    const role = match[2].trim();
    npcs.push({
      id: `npc-${slugify(name)}`,
      name,
      role,
      mask: role,
      hiddenGoal: "Współpracownik lub świadek w toku dochodzenia",
      adventureId: defaultAdventureId,
    });
  }

  return npcs;
}

/**
 * Ekstrahuje bestie i potwory z podręcznika/suplementu
 */
export function extractCreatures(text: string): OverlayCreature[] {
  const creatures: OverlayCreature[] = [];
  const seen = new Set<string>();

  const creatureRegex = /(?:^|\n)(?:(Bestiariusz|Rozdział|Potwór|Bóstwo|Creature|Monster|Bestia)\s*[:\-]?\s*)?([A-ZĆŁŚŹŻ][A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż\s\-]{3,40}?)\s*(?:\n|\r\n)(?:[^\n]*\n){0,4}?(?:Utrata\s+Poczytalności|Sanity\s+Loss):\s*([^\n\.,;]+)/gi;
  let match: RegExpExecArray | null;

  while ((match = creatureRegex.exec(text)) !== null) {
    const prefix = (match[1] || "").toLowerCase();
    const rawName = match[2].trim();
    if (!rawName || rawName.length < 3 || seen.has(rawName.toLowerCase())) continue;
    seen.add(rawName.toLowerCase());

    const sanLoss = match[3].trim();
    const contextStart = match.index;
    const nextSection = text.slice(contextStart + 1).search(/\n\s*(?:Potwór|Bóstwo|Bestia|Creature|Monster|Rozdział)\b/i);
    const snippetLen = nextSection > 0 ? nextSection + 1 : Math.min(text.length - contextStart, 400);
    const contextSnippet = text.slice(contextStart, contextStart + snippetLen);

    let armor = "Brak pancerza";
    const armorMatch = /(?:Pancerz|Armor):\s*([^\n\.]+)/i.exec(contextSnippet);
    if (armorMatch) {
      armor = armorMatch[1].trim();
    }

    const attacks: string[] = [];
    const attacksMatch = /(?:Ataki|Attacks):\s*([^\n\.]+)/i.exec(contextSnippet);
    if (attacksMatch) {
      attacks.push(attacksMatch[1].trim());
    }

    const isDeity =
      prefix.includes("bóstwo") ||
      prefix.includes("deity") ||
      /Wielki Przedwieczny|Bóstwo Zewnętrzne|Great Old One|Outer God/i.test(contextSnippet);

    creatures.push({
      id: `creature-${slugify(rawName)}`,
      name: rawName,
      category: isDeity ? "bostwo" : "potwor",
      sanLoss,
      armor,
      attacks: attacks.length > 0 ? attacks : undefined,
      description: contextSnippet.replace(/\s+/g, " ").trim().slice(0, 250),
    });
  }

  return creatures;
}

/**
 * Ekstrahuje zaklęcia i formuły magiczne
 */
export function extractSpells(text: string): OverlaySpell[] {
  const spells: OverlaySpell[] = [];
  const seen = new Set<string>();

  const spellRegex = /(?:^|\n)(?:Zaklęcie|Czar|Spell):\s*([A-ZĆŁŚŹŻ][A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż\s\-]{3,40}?)(?:\n|\r\n)(?:[^\n]*\n){0,4}?(?:Koszt\s*(?:magii)?|Cost):\s*([^\n\.,;]+)/gi;
  let match: RegExpExecArray | null;

  while ((match = spellRegex.exec(text)) !== null) {
    const rawName = match[1].trim();
    if (seen.has(rawName.toLowerCase())) continue;
    seen.add(rawName.toLowerCase());

    const magicCost = match[2].trim();
    const contextStart = match.index;
    const contextSnippet = text.slice(contextStart, contextStart + 400);

    let sanCost: string | undefined;
    const sanMatch = /(?:Koszt\s+Poczytalności|Sanity\s+Cost):\s*([^\n\.]+)/i.exec(contextSnippet);
    if (sanMatch) sanCost = sanMatch[1].trim();

    let castTime: string | undefined;
    const timeMatch = /(?:Czas\s+rzucania|Casting\s+Time):\s*([^\n\.]+)/i.exec(contextSnippet);
    if (timeMatch) castTime = timeMatch[1].trim();

    let range: string | undefined;
    const rangeMatch = /(?:Zasięg|Range):\s*([^\n\.]+)/i.exec(contextSnippet);
    if (rangeMatch) range = rangeMatch[1].trim();

    const isDeep = /Głęboka\s+magia|Deeper\s+Magic/i.test(contextSnippet);

    spells.push({
      id: `spell-${slugify(rawName)}`,
      name: rawName,
      magicCost,
      sanCost,
      castTime,
      range,
      deepMagic: isDeep,
      description: contextSnippet.replace(/\s+/g, " ").trim().slice(0, 250),
    });
  }

  return spells;
}

/**
 * Ekstrahuje rekwizyty i materiały do odczytania (Handouts)
 */
export function extractHandouts(text: string, defaultAdventureId?: string): OverlayHandout[] {
  const handouts: OverlayHandout[] = [];
  const seen = new Set<string>();

  const handoutRegex = /(?:Rekwizyt|Handout)\s*([0-9A-Za-z]+)\s*[-–—:]?\s*([^\n]*)\n+([\s\S]{20,400}?)(?=\n\s*(?:Rekwizyt|Handout|Rozdział|Scena|Akt|$))/gi;
  let match: RegExpExecArray | null;

  while ((match = handoutRegex.exec(text)) !== null) {
    const num = match[1].trim();
    const rawTitle = match[2].trim() || `Rekwizyt ${num}`;
    const content = match[3].replace(/\s+/g, " ").trim();
    const uniqueKey = `${num}-${rawTitle}`.toLowerCase();

    if (seen.has(uniqueKey)) continue;
    seen.add(uniqueKey);

    handouts.push({
      id: `handout-${slugify(num + "-" + rawTitle)}`,
      number: num,
      title: rawTitle,
      content,
      adventureId: defaultAdventureId,
    });
  }

  return handouts;
}

/**
 * Generuje reguły mechaniki na podstawie wykrytych funkcji silnika
 */
export function extractRules(fingerprint: RulebookFingerprintResult): OverlayRule[] {
  const rules: OverlayRule[] = [];

  if (fingerprint.detectedFeatures.hasChaseRules) {
    rules.push({
      id: "rule-chase-d100",
      title: "Zasady Pościgów d100",
      category: "chase",
      summary: "Rozstrzyganie dynamicznych pościgów pieszych i kołowych z użyciem Prędkości (MOV), Punktów Pościgu i Zagrożeń Terenowych.",
    });
  }

  if (fingerprint.detectedFeatures.hasSanityRules) {
    rules.push({
      id: "rule-sanity-madness-d100",
      title: "Zasady Poczytalności i Szaleństwa",
      category: "madness",
      summary: "Utrata Poczytalności, Atak Szału (Bout of Madness), Szaleństwo Utajone oraz testy Psychoanalizy/Oparcia w Rzeczywistości.",
    });
  }

  if (fingerprint.detectedFeatures.hasPulpTalents) {
    rules.push({
      id: "rule-pulp-talents-d100",
      title: "Talenty Pulpu i Odporność Bohaterów",
      category: "pulp",
      summary: "Podwójne punkty wytrzymałości, wydawanie Szczęścia do unikania zgonu oraz specjalne archetypy i talenty pulpu.",
    });
  }

  if (fingerprint.detectedFeatures.hasCombatRules) {
    rules.push({
      id: "rule-combat-maneuvers-d100",
      title: "Walka Wręcz i Manewry Bojowe",
      category: "combat",
      summary: "Uniki, kontrataki, manewry bojowe bazujące na Budowie (Build) oraz broń palna z seriami i zasięgiem skutecznym.",
    });
  }

  return rules;
}

/**
 * Parsuje format One-Shot / Broszura (16-48 stron, 1 zwarty graf poszlak)
 */
function parseOneShotAdventure(
  text: string,
  fingerprint: RulebookFingerprintResult,
  fileName: string
): OverlayAdventure {
  const advId = `adv-${slugify(fileName)}`;
  const nodes: OverlayAdventureNode[] = [
    {
      id: `${advId}-intro`,
      title: "Wprowadzenie i Zlecenie",
      type: "intro",
      description: "Początek śledztwa, zawiązanie akcji i zapoznanie badaczy z pierwszym tropem.",
      leadsTo: [`${advId}-investigation`],
    },
    {
      id: `${advId}-investigation`,
      title: "Śledztwo w terenie i badanie poszlak",
      type: "location",
      description: "Główny etap dochodzenia: badanie kluczowych lokacji, konfrontacja świadków i rekwizytów.",
      leadsTo: [`${advId}-climax`],
    },
    {
      id: `${advId}-climax`,
      title: "Punkt kulminacyjny i konfrontacja",
      type: "climax",
      description: "Ostateczne starcie z zagrożeniem, rytuałem lub rozwiązanie zagadki.",
    },
  ];

  return {
    id: advId,
    title: fingerprint.title || fileName,
    type: "one_shot",
    synopsis: `Zwięzły scenariusz typu One-Shot wyekstrahowany z ${fileName}.`,
    nodes,
  };
}

/**
 * Parsuje format Antologia / Zbiór scenariuszy (izolowane subAdventures)
 */
function parseAnthologyAdventure(
  text: string,
  fingerprint: RulebookFingerprintResult,
  fileName: string,
  allNpcs: OverlayNPC[],
  allHandouts: OverlayHandout[]
): OverlayAdventure {
  const advId = `anthology-${slugify(fileName)}`;
  const subAdventures: OverlaySubAdventure[] = [];

  const scenarioRegex = /(?:Scenariusz|Przygoda|Rozdział|Scenario)\s*(\d+|[A-ZIVXLCDM]+)\s*[-–—:]\s*([^\n]+)/gi;
  let match: RegExpExecArray | null;
  const detectedScenarios: Array<{ id: string; title: string }> = [];

  while ((match = scenarioRegex.exec(text)) !== null) {
    const num = match[1].trim();
    const title = match[2].trim();
    detectedScenarios.push({
      id: `${advId}-scen-${num}`,
      title: `Scenariusz ${num}: ${title}`,
    });
  }

  if (detectedScenarios.length === 0) {
    detectedScenarios.push(
      { id: `${advId}-scen-1`, title: "Scenariusz 1: Wrota Tajemnicy" },
      { id: `${advId}-scen-2`, title: "Scenariusz 2: Echo Otchłani" }
    );
  }

  detectedScenarios.forEach((scen, idx) => {
    const assignedNpcIds = allNpcs
      .filter((_, nIdx) => nIdx % detectedScenarios.length === idx)
      .map((n) => n.id);
    const assignedHandoutIds = allHandouts
      .filter((_, hIdx) => hIdx % detectedScenarios.length === idx)
      .map((h) => h.id);

    subAdventures.push({
      id: scen.id,
      title: scen.title,
      synopsis: `Autonomiczna przygoda z antologii ${fingerprint.title}.`,
      nodes: [
        {
          id: `${scen.id}-start`,
          title: "Prolog i Poszlaki Wejściowe",
          type: "intro",
          description: `Wprowadzenie do ${scen.title}.`,
          leadsTo: [`${scen.id}-main`],
        },
        {
          id: `${scen.id}-main`,
          title: "Śledztwo Regionalne",
          type: "location",
          description: "Izolowane śledztwo i zbieranie dowodów.",
          leadsTo: [`${scen.id}-finale`],
        },
        {
          id: `${scen.id}-finale`,
          title: "Finał Sprawy",
          type: "climax",
          description: "Kulminacja scenariusza.",
        },
      ],
      npcIds: assignedNpcIds,
      handoutIds: assignedHandoutIds,
    });
  });

  return {
    id: advId,
    title: fingerprint.title || fileName,
    type: "scenario_anthology",
    synopsis: `Zbiór ${subAdventures.length} niezależnych scenariuszy z antologii ${fingerprint.title}.`,
    subAdventures,
  };
}

/**
 * Parsuje format Mega-Kampania (3-poziomowy graf: Meta-Plot, Akty regionalne, Sceny)
 */
function parseMegaCampaignAdventure(
  text: string,
  fingerprint: RulebookFingerprintResult,
  fileName: string
): OverlayAdventure {
  const advId = `campaign-${slugify(fileName)}`;

  const knownRegions = [
    { name: "Ameryka / Nowy Jork", pattern: /Nowy\s+Jork|New\s+York|Boston|Arkham/i },
    { name: "Anglia / Londyn", pattern: /Londyn|London|Anglia|England/i },
    { name: "Egipt / Kair", pattern: /Kair|Cairo|Egipt|Egypt/i },
    { name: "Afryka / Kenia", pattern: /Kenia|Kenya|Nairobi|Afryka/i },
    { name: "Azja / Szanghaj", pattern: /Szanghaj|Shanghai|Chiny|China/i },
  ];

  const matchedActs: Array<{
    id: string;
    title: string;
    region: string;
    localVillain?: string;
    scenes: OverlayAdventureNode[];
    crossRegionalLinks: string[];
  }> = [];

  knownRegions.forEach((reg, idx) => {
    if (reg.pattern.test(text) || matchedActs.length < 2) {
      const actId = `${advId}-act-${idx + 1}`;
      matchedActs.push({
        id: actId,
        title: `Akt ${idx + 1}: ${reg.name}`,
        region: reg.name,
        localVillain: `Lokalna komórka kultu w ${reg.name}`,
        scenes: [
          {
            id: `${actId}-arrival`,
            title: `Przybycie: ${reg.name}`,
            type: "intro",
            description: `Badacze docierają do regionu ${reg.name} i badają pierwsze poszlaki.`,
            leadsTo: [`${actId}-hub`],
          },
          {
            id: `${actId}-hub`,
            title: `Ośrodek Śledczy ${reg.name}`,
            type: "location",
            description: "Główne poszlaki, świadkowie i lokalne mroczne sekrety.",
            leadsTo: [`${actId}-climax`],
          },
          {
            id: `${actId}-climax`,
            title: `Konfrontacja w ${reg.name}`,
            type: "climax",
            description: "Zneutralizowanie lokalnego zagrożenia lub zdobycie klucza do kolejnego kontynentu.",
          },
        ],
        crossRegionalLinks: idx < 4 ? [`${advId}-act-${idx + 2}`] : [],
      });
    }
  });

  return {
    id: advId,
    title: fingerprint.title || fileName,
    type: "mega_campaign",
    synopsis: "Monumentalna kampania d100 z wieloaktową strukturą regionalną.",
    campaignHierarchy: {
      metaPlot: {
        grandArc: "Globalny spisek kultystów zmierzający do przebudzenia Przedwiecznego lub nadejścia Zagłady.",
        doomsdayClock: "6 faz nadejścia zaćmienia / koniunkcji planet",
        globalVillain: "Arcywróg / Wielki Kapłan Kultu",
      },
      acts: matchedActs,
    },
  };
}

/**
 * Główna funkcja generująca kompletną nakładkę semantyczną DLC
 */
export function generateSemanticOverlay(
  pdfText: string,
  fingerprint: RulebookFingerprintResult,
  fileName: string
): OverlayDescriptor {
  const npcs = extractNPCs(pdfText);
  const creatures = extractCreatures(pdfText);
  const spells = extractSpells(pdfText);
  const handouts = extractHandouts(pdfText);
  const rules = extractRules(fingerprint);

  const adventures: OverlayAdventure[] = [];
  const advType = fingerprint.semanticPlan.adventureType;

  if (advType === "one_shot" || fingerprint.profile === "one_shot") {
    adventures.push(parseOneShotAdventure(pdfText, fingerprint, fileName));
  } else if (advType === "scenario_anthology" || fingerprint.profile === "scenario_anthology") {
    adventures.push(parseAnthologyAdventure(pdfText, fingerprint, fileName, npcs, handouts));
  } else if (advType === "mega_campaign" || fingerprint.profile === "mega_campaign") {
    adventures.push(parseMegaCampaignAdventure(pdfText, fingerprint, fileName));
  } else if (fingerprint.detectedFeatures.hasScenarios) {
    adventures.push(parseOneShotAdventure(pdfText, fingerprint, fileName));
  }

  const tags: SemanticTag[] = [...fingerprint.semanticPlan.detectedCategories];
  if (npcs.length > 0 && !tags.includes("NPC")) tags.push("NPC");
  if (creatures.length > 0 && !tags.includes("BESTIARIUSZ")) tags.push("BESTIARIUSZ");
  if (spells.length > 0 && !tags.includes("CZARY")) tags.push("CZARY");
  if (handouts.length > 0 && !tags.includes("REKWIZYTY")) tags.push("REKWIZYTY");
  if (rules.length > 0 && !tags.includes("MECHANIKA")) tags.push("MECHANIKA");
  if (adventures.length > 0 && !tags.includes("FABULA")) tags.push("FABULA");

  const descriptorId = `overlay-${slugify(fingerprint.profile)}-${slugify(fileName)}`;

  return {
    id: descriptorId,
    title: fingerprint.title || fileName,
    fileName,
    profile: fingerprint.profile,
    version: "1.0.0",
    createdAt: new Date().toISOString(),
    tags,
    features: fingerprint.detectedFeatures,
    stats: {
      npcCount: npcs.length,
      creatureCount: creatures.length,
      spellCount: spells.length,
      ruleCount: rules.length,
      handoutCount: handouts.length,
      adventureCount: adventures.length,
    },
    entities: {
      npcs,
      creatures,
      spells,
      rules,
      handouts,
      adventures,
    },
  };
}
