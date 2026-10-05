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
import type { AdventureClue, AdventureNodeType } from "@/lib/types";

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
  name?: string;
  type: AdventureNodeType;
  description: string;
  leadsTo?: string[];
  leadInClueIds?: string[];
  leadOutClueIds?: string[];
  isBottleneck?: boolean;
  isClimax?: boolean;
  locationId?: string;
  npcIds?: string[];
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

  const ignoredNpcTerms =
    /^(?:pierwsza pomoc|nazwy opcjonalne|bazowa wartość|normalne obrażenia|średni modyfikator|średnia krzepa|punkt kulminacyjny|poziom trudności|test umiejętności|rzut kością|kość premiowa|kość karna|utrata poczytalności|punkty magii|punkty wytrzymałości|walka wręcz|broń palna)$/i;
  const isCapitalizedName = (candidate: string): boolean => {
    const words = candidate.trim().split(/\s+/);
    if (words.length < 2 || words.length > 4) return false;
    if (ignoredNpcTerms.test(candidate.trim())) return false;
    return words.every((w) => /^[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż'’-]{1,25}$/.test(w));
  };

  // Wzorzec 2: Nagłówki NPC / Dramatis Personae (np. "Dramatis Personae: Jackson Elias" lub sekcja DRAMATIS PERSONAE)
  const headerNpcRegex = /(?:Dramatis Personae|NPC|Postacie niezależne|Bohaterowie niezależni)[^\n]*\n+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż'’-]+(?:\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż'’-]+)+)\s*[:\-\u2013\u2014]\s*([^\n\.]+)/g;
  while ((match = headerNpcRegex.exec(text)) !== null) {
    const name = match[1].trim();
    if (!isCapitalizedName(name)) continue;
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

  // Wzorzec 3: Lista postaci pod nagłówkiem DRAMATIS PERSONAE (np. w Księdze Strażnika)
  const dramatisBlockRegex = /(?:DRAMATIS\s+PERSONAE|Dramatis\s+Personae)\s*\n([\s\S]{1,3500})/g;
  let blockMatch: RegExpExecArray | null;
  while ((blockMatch = dramatisBlockRegex.exec(text)) !== null) {
    const block = blockMatch[1];
    const entryRegex = /(?:^|\n)\s*([A-ZĄĆĘŁŃÓŚŹŻ][A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż'’-]+(?:\s+[A-ZĄĆĘŁŃÓŚŹŻ][A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż'’-]+){1,2})\s*(?:[:\-\u2013\u2014]|,\s*(?=[a-ząćęłńóśźż]))\s*([^\n\.]{4,90})/g;
    let entryMatch: RegExpExecArray | null;
    while ((entryMatch = entryRegex.exec(block)) !== null) {
      const rawName = entryMatch[1]
        .trim()
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
      if (!isCapitalizedName(rawName)) continue;
      if (seenNames.has(rawName.toLowerCase())) continue;
      seenNames.add(rawName.toLowerCase());

      const role = entryMatch[2].trim();
      npcs.push({
        id: `npc-${slugify(rawName)}`,
        name: rawName,
        role,
        mask: role,
        hiddenGoal: "Postać dramatu wymieniona w sekcji Dramatis Personae",
        adventureId: defaultAdventureId,
      });
    }
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

  const handoutRegex = /\b(?:Rekwizyt|Handout|Pomoc(?:e)?\s+dla\s+graczy)\s+(?:#|nr\s*)?(\d+[A-Za-z]?|[A-Z])\b\s*[:\-\u2013\u2014]?\s*([^\n]*)\n+([\s\S]{20,400}?)(?=\n\s*(?:Rekwizyt|Handout|Pomoc(?:e)?\s+dla\s+graczy|Rozdział|Scena|Akt|$))/gi;
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
 * Ekstrahuje autentyczne węzły scenariusza (AdventureNode) bez generycznych atrap i sztywnego szablonu.
 */
export function extractDynamicAdventureNodes(
  text: string,
  scenarioTitle: string,
  advId: string,
  associatedNpcs: OverlayNPC[] = [],
  associatedHandouts: OverlayHandout[] = []
): { nodes: OverlayAdventureNode[]; clues: AdventureClue[] } {
  const nodes: OverlayAdventureNode[] = [];
  const clues: AdventureClue[] = [];
  const cleanTitle = scenarioTitle.trim() || 'Śledztwo';

  // 1. Węzeł wprowadzenia (intro)
  const introNodeId = `${advId}-intro`;
  const introNode: OverlayAdventureNode = {
    id: introNodeId,
    title: `Wprowadzenie: ${cleanTitle}`,
    name: `Wprowadzenie: ${cleanTitle}`,
    type: 'intro',
    description: `Początek śledztwa, zawiązanie akcji i zapoznanie badaczy z pierwszym tropem w sprawie: ${cleanTitle}.`,
    leadsTo: [],
    leadInClueIds: [],
    leadOutClueIds: [],
  };
  nodes.push(introNode);

  // 2. Ekstrakcja sekcji, scen i lokacji z tekstu
  const intermediateNodes: OverlayAdventureNode[] = [];
  const seenTitles = new Set<string>();
  seenTitles.add(introNode.title.toLowerCase());

  // Heurystyka 2a: Nagłówki scen i rozdziałów
  const sceneRegex = /(?:^|\n)\s*(?:###?\s+|(?:\d+[\.\)]\s+)?)(?:Scena|Scene|Akt|Act|Część|Part|Rozdział|Chapter)\s*(?:\d+|[A-ZIVXLCDM]+)?\s*[:\-\u2013\u2014]?\s*([^\n]{3,70})/gi;
  let match: RegExpExecArray | null;
  while ((match = sceneRegex.exec(text)) !== null) {
    const rawScene = match[1].trim().replace(/^[:\-\s]+/, '');
    if (rawScene && rawScene.length >= 3 && !seenTitles.has(rawScene.toLowerCase())) {
      seenTitles.add(rawScene.toLowerCase());
      const sId = `${advId}-scena-${slugify(rawScene)}`;
      intermediateNodes.push({
        id: sId,
        title: rawScene,
        name: rawScene,
        type: 'location',
        description: `Węzeł dochodzeniowy sceny: ${rawScene}.`,
        leadsTo: [],
        leadInClueIds: [],
        leadOutClueIds: [],
      });
    }
  }

  // Heurystyka 2b: Lokacje fizyczne i topografia CoC
  const locRegex = /(?:^|\n)\s*(?:###?\s+)?(?:Lokacja|Miejsce|Location|Site)\s*[:\-\u2013\u2014]\s*([^\n]{3,70})/gi;
  while ((match = locRegex.exec(text)) !== null) {
    const rawLoc = match[1].trim();
    if (rawLoc && rawLoc.length >= 3 && !seenTitles.has(rawLoc.toLowerCase())) {
      seenTitles.add(rawLoc.toLowerCase());
      const lId = `${advId}-loc-${slugify(rawLoc)}`;
      intermediateNodes.push({
        id: lId,
        title: rawLoc,
        name: rawLoc,
        type: 'location',
        description: `Eksploracja i badanie poszlak w lokacji: ${rawLoc}.`,
        leadsTo: [],
        leadInClueIds: [],
        leadOutClueIds: [],
      });
    }
  }

  // Heurystyka 2c: Rzeczowniki lokacyjne CoC w nagłówkach lub liniach
  const topoRegex = /(?:^|\n)\s*(?:###?\s+)?([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ\s'’-]{2,40}?\b(?:Posiadłość|Dom|Willa|Dwór|Biblioteka|Kostnica|Cmentarz|Szpital|Archiwum|Magazyn|Doki|Kościół|Piwnica|Jaskinia|Las|Góry|Dolina|Klub|Ratusz|Posterunek|Komisariat|Katedra|Hotel|Piec|Schron|Laboratorium|Majątek|Pracownia|Rafineria)\b[^\n]{0,40})/gi;
  while ((match = topoRegex.exec(text)) !== null) {
    const rawTopo = match[1].trim();
    if (rawTopo && rawTopo.length >= 4 && !seenTitles.has(rawTopo.toLowerCase())) {
      seenTitles.add(rawTopo.toLowerCase());
      const tId = `${advId}-loc-${slugify(rawTopo)}`;
      intermediateNodes.push({
        id: tId,
        title: rawTopo,
        name: rawTopo,
        type: 'location',
        description: `Obszar dochodzenia śledczego: ${rawTopo}.`,
        leadsTo: [],
        leadInClueIds: [],
        leadOutClueIds: [],
      });
    }
  }

  // Heurystyka 2d: Węzły przesłuchań NPC (dla pierwszych powiązanych postaci)
  for (let i = 0; i < Math.min(associatedNpcs.length, 2); i++) {
    const npc = associatedNpcs[i];
    const npcTitle = `Przesłuchanie: ${npc.name}`;
    if (!seenTitles.has(npcTitle.toLowerCase())) {
      seenTitles.add(npcTitle.toLowerCase());
      intermediateNodes.push({
        id: `${advId}-npc-${slugify(npc.name)}`,
        title: npcTitle,
        name: npcTitle,
        type: 'npc',
        description: `Konfrontacja ze świadkiem: ${npc.name} (${npc.role || 'świadek'}).`,
        leadsTo: [],
        leadInClueIds: [],
        leadOutClueIds: [],
        npcIds: [npc.id],
      });
    }
  }

  // Fallback anty-trap: gdy brak wykrytych węzłów pośrednich, stwórz węzeł dynamiczny dla scenariusza
  if (intermediateNodes.length === 0) {
    const fallbackTitle = `Badanie poszlak: ${cleanTitle}`;
    intermediateNodes.push({
      id: `${advId}-investigation`,
      title: fallbackTitle,
      name: fallbackTitle,
      type: 'location',
      description: `Główny etap śledztwa: poszukiwanie powiązań i analiza tropów w sprawie: ${cleanTitle}.`,
      leadsTo: [],
      leadInClueIds: [],
      leadOutClueIds: [],
      isBottleneck: true,
    });
  }

  // 3. Węzeł punktu kulminacyjnego (climax)
  const climaxRegex = /(?:^|\n)\s*(?:###?\s+|(?:\d+[\.\)]\s+)?)(?:Punkt\s+kulminacyjny|Konfrontacja|Finał|Zakończenie|Starcie|Rytuał|Rozwiązanie|Epilog|Climax|Showdown|Confrontation|Finale)\b\s*[:\-\u2013\u2014]?\s*([^\n]{0,70})/gi;
  const climaxMatch = climaxRegex.exec(text);
  const rawClimaxSuffix = climaxMatch ? climaxMatch[1]?.trim() : '';
  const climaxTitle = rawClimaxSuffix && rawClimaxSuffix.length > 2
    ? `Konfrontacja: ${rawClimaxSuffix}`
    : `Konfrontacja: ${cleanTitle}`;

  const climaxNodeId = `${advId}-climax`;
  const climaxNode: OverlayAdventureNode = {
    id: climaxNodeId,
    title: climaxTitle,
    name: climaxTitle,
    type: 'climax',
    description: `Ostateczna konfrontacja z zagrożeniem i rozwiązanie zagadki: ${cleanTitle}.`,
    leadsTo: [],
    leadInClueIds: [],
    leadOutClueIds: [],
    isClimax: true,
    isBottleneck: true,
  };

  // 4. Dołączenie węzłów pośrednich i kulminacji
  nodes.push(...intermediateNodes);
  nodes.push(climaxNode);

  // 5. Powiązania nieliniowe (Alexandrian Canon leadsTo)
  introNode.leadsTo = intermediateNodes.map((n) => n.id);
  intermediateNodes.forEach((node, idx) => {
    node.leadsTo = [climaxNodeId];
    if (idx === 0) {
      node.isBottleneck = true;
    }
  });

  // 6. Powiązanie poszlak z handoutów
  associatedHandouts.forEach((h, idx) => {
    const clueId = `clue-${advId}-${idx + 1}`;
    const targetNode = intermediateNodes[idx % intermediateNodes.length] || climaxNode;
    clues.push({
      id: clueId,
      name: h.title || `Dokument ${idx + 1}`,
      description: h.content || 'Rekwizyt lub dokument w toku dochodzenia.',
      sourceType: 'document',
      clueType: 'core',
      targetNodeId: targetNode.id,
      sourceNodeId: introNodeId,
      isRedHerring: false,
    });

    targetNode.leadInClueIds = targetNode.leadInClueIds || [];
    targetNode.leadInClueIds.push(clueId);
    introNode.leadOutClueIds = introNode.leadOutClueIds || [];
    introNode.leadOutClueIds.push(clueId);
  });

  return { nodes, clues };
}

/**
 * Parsuje format One-Shot / Broszura (16-48 stron, 1 zwarty graf poszlak)
 */
function parseOneShotAdventure(
  text: string,
  fingerprint: RulebookFingerprintResult,
  fileName: string,
  allNpcs: OverlayNPC[] = [],
  allHandouts: OverlayHandout[] = []
): OverlayAdventure {
  const advId = `adv-${slugify(fileName)}`;
  const title = fingerprint.title || fileName.replace(/\.pdf$/i, "").replace(/[-_]/g, " ");
  const { nodes } = extractDynamicAdventureNodes(text, title, advId, allNpcs, allHandouts);

  return {
    id: advId,
    title,
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

  const scenarioRegex = /(?:Scenariusz|Przygoda|Rozdział|Scenario)\s*(\d+|[A-ZIVXLCDM]+)\s*[:\-\u2013\u2014]\s*([^\n]+)/gi;
  let match: RegExpExecArray | null;
  const detectedScenarios: Array<{ id: string; title: string; textSlice: string }> = [];

  const matches: Array<{ num: string; title: string; index: number }> = [];
  while ((match = scenarioRegex.exec(text)) !== null) {
    matches.push({
      num: match[1].trim(),
      title: match[2].trim(),
      index: match.index,
    });
  }

  if (matches.length > 0) {
    for (let i = 0; i < matches.length; i++) {
      const cur = matches[i];
      const nextIndex = i + 1 < matches.length ? matches[i + 1].index : text.length;
      const slice = text.slice(cur.index, nextIndex);
      detectedScenarios.push({
        id: `${advId}-scen-${cur.num}`,
        title: `Scenariusz ${cur.num}: ${cur.title}`,
        textSlice: slice,
      });
    }
  } else {
    // Dynamiczny podział sekcyjny gdy brak jawnych numerów scenariuszy
    const sectionRegex = /(?:###?\s+|(?:\n|^)\s*(?:Część|Part|Akt|Act)\s*(\d+|[A-ZIVXLCDM]+)\s*[:\-\u2013\u2014]\s*)([^\n]+)/gi;
    const secMatches: Array<{ title: string; index: number }> = [];
    while ((match = sectionRegex.exec(text)) !== null) {
      secMatches.push({ title: (match[2] || match[1] || '').trim(), index: match.index });
    }
    if (secMatches.length >= 2) {
      for (let i = 0; i < secMatches.length; i++) {
        const cur = secMatches[i];
        const nextIndex = i + 1 < secMatches.length ? secMatches[i + 1].index : text.length;
        detectedScenarios.push({
          id: `${advId}-scen-${i + 1}`,
          title: cur.title.startsWith('Scenariusz') ? cur.title : `Scenariusz: ${cur.title}`,
          textSlice: text.slice(cur.index, nextIndex),
        });
      }
    } else {
      const baseTitle = fingerprint.title || fileName.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
      const half = Math.floor(text.length / 2);
      detectedScenarios.push(
        { id: `${advId}-scen-1`, title: `${baseTitle}: Część 1`, textSlice: text.slice(0, half) },
        { id: `${advId}-scen-2`, title: `${baseTitle}: Część 2`, textSlice: text.slice(half) }
      );
    }
  }

  detectedScenarios.forEach((scen, idx) => {
    // Przypisanie NPC semantycznie z tekstu
    const matchedNpcs = allNpcs.filter((n) => {
      if (scen.textSlice && n.name) {
        return scen.textSlice.toLowerCase().includes(n.name.toLowerCase());
      }
      return false;
    });
    const finalNpcs = matchedNpcs.length > 0
      ? matchedNpcs
      : allNpcs.filter((_, nIdx) => nIdx % detectedScenarios.length === idx);

    // Przypisanie Handoutów semantycznie z tekstu
    const matchedHandouts = allHandouts.filter((h) => {
      if (scen.textSlice && h.title) {
        return scen.textSlice.toLowerCase().includes(h.title.toLowerCase());
      }
      return false;
    });
    const finalHandouts = matchedHandouts.length > 0
      ? matchedHandouts
      : allHandouts.filter((_, hIdx) => hIdx % detectedScenarios.length === idx);

    const { nodes } = extractDynamicAdventureNodes(
      scen.textSlice,
      scen.title,
      scen.id,
      finalNpcs,
      finalHandouts
    );

    subAdventures.push({
      id: scen.id,
      title: scen.title,
      synopsis: `Autonomiczna przygoda "${scen.title}" wyodrębniona z antologii ${fingerprint.title || fileName}.`,
      nodes,
      npcIds: finalNpcs.map((n) => n.id),
      handoutIds: finalHandouts.map((h) => h.id),
    });
  });

  return {
    id: advId,
    title: fingerprint.title || fileName,
    type: "scenario_anthology",
    synopsis: `Zbiór ${subAdventures.length} niezależnych scenariuszy z antologii ${fingerprint.title || fileName}.`,
    subAdventures,
  };
}

/**
 * Parsuje format Mega-Kampania (3-poziomowy graf: Meta-Plot, Akty regionalne, Sceny)
 */
function parseMegaCampaignAdventure(
  text: string,
  fingerprint: RulebookFingerprintResult,
  fileName: string,
  allNpcs: OverlayNPC[] = [],
  allHandouts: OverlayHandout[] = []
): OverlayAdventure {
  const advId = `campaign-${slugify(fileName)}`;

  // Dynamiczne wykrywanie aktów z nagłówków w tekście
  const actRegex = /(?:Akt|Act|Rozdział|Chapter)\s*(\d+|[A-ZIVXLCDM]+)\s*[:\-\u2013\u2014]\s*([^\n]+)/gi;
  let match: RegExpExecArray | null;
  const detectedActs: Array<{ num: string; title: string; index: number }> = [];

  while ((match = actRegex.exec(text)) !== null) {
    detectedActs.push({
      num: match[1].trim(),
      title: match[2].trim(),
      index: match.index,
    });
  }

  const matchedActs: Array<{
    id: string;
    title: string;
    region: string;
    localVillain?: string;
    scenes: OverlayAdventureNode[];
    crossRegionalLinks: string[];
  }> = [];

  if (detectedActs.length >= 2) {
    for (let idx = 0; idx < detectedActs.length; idx++) {
      const act = detectedActs[idx];
      const actId = `${advId}-act-${act.num || idx + 1}`;
      const nextIndex = idx + 1 < detectedActs.length ? detectedActs[idx + 1].index : text.length;
      const actSlice = text.slice(act.index, nextIndex);

      const regionMatch = act.title.match(/(Nowy\s+Jork|New\s+York|Boston|Arkham|Londyn|London|Anglia|England|Kair|Cairo|Egipt|Egypt|Kenia|Kenya|Nairobi|Afryka|Szanghaj|Shanghai|Chiny|China)/i);
      const region = regionMatch ? regionMatch[1].trim() : act.title.split(/[\-:]/)[0].trim() || `Region ${idx + 1}`;

      const { nodes: actScenes } = extractDynamicAdventureNodes(
        actSlice,
        act.title,
        actId,
        allNpcs,
        allHandouts
      );

      matchedActs.push({
        id: actId,
        title: `Akt ${act.num || idx + 1}: ${act.title}`,
        region,
        localVillain: `Zagrożenie w rejonie ${region}`,
        scenes: actScenes,
        crossRegionalLinks: [],
      });
    }
  } else {
    // Dynamiczny podział sekcyjny dla kampanii bez jawnych nagłówków Akt
    const regionalPatterns = [
      { name: "Nowy Jork", pattern: /Nowy\s+Jork|New\s+York|Boston|Arkham/i },
      { name: "Londyn", pattern: /Londyn|London|Anglia|England/i },
      { name: "Kair", pattern: /Kair|Cairo|Egipt|Egypt/i },
      { name: "Kenia", pattern: /Kenia|Kenya|Nairobi|Afryka/i },
      { name: "Szanghaj", pattern: /Szanghaj|Shanghai|Chiny|China/i },
    ];

    regionalPatterns.forEach((reg, idx) => {
      if (reg.pattern.test(text) || matchedActs.length < 3) {
        const actId = `${advId}-act-${idx + 1}`;
        const actTitle = `Teatr działań: ${reg.name}`;
        const { nodes: actScenes } = extractDynamicAdventureNodes(
          text,
          actTitle,
          actId,
          allNpcs,
          allHandouts
        );

        matchedActs.push({
          id: actId,
          title: `Akt ${idx + 1}: ${reg.name}`,
          region: reg.name,
          localVillain: `Zagrożenie w rejonie ${reg.name}`,
          scenes: actScenes,
          crossRegionalLinks: [],
        });
      }
    });
  }

  for (let i = 0; i < matchedActs.length - 1; i++) {
    matchedActs[i].crossRegionalLinks = [matchedActs[i + 1].id];
  }

  return {
    id: advId,
    title: fingerprint.title || fileName,
    type: "mega_campaign",
    synopsis: "Epicka kampania d100 o nieliniowej strukturze regionalnej.",
    campaignHierarchy: {
      metaPlot: {
        grandArc: "Globalna oś fabularna łącząca wieloaktowe śledztwo i konfrontację z kosmicznym zagrożeniem.",
        doomsdayClock: "Fazy narastającego zagrożenia i koniunkcji",
        globalVillain: "Główny antagonista lub kult stojący za spiskiem",
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
    adventures.push(parseOneShotAdventure(pdfText, fingerprint, fileName, npcs, handouts));
  } else if (advType === "scenario_anthology" || fingerprint.profile === "scenario_anthology") {
    adventures.push(parseAnthologyAdventure(pdfText, fingerprint, fileName, npcs, handouts));
  } else if (advType === "mega_campaign" || fingerprint.profile === "mega_campaign") {
    adventures.push(parseMegaCampaignAdventure(pdfText, fingerprint, fileName, npcs, handouts));
  } else if (fingerprint.detectedFeatures.hasScenarios) {
    adventures.push(parseOneShotAdventure(pdfText, fingerprint, fileName, npcs, handouts));
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
