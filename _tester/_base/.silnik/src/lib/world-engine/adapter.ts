import type { Character, NPC } from '@/lib/types';
import type { ResolvedEraContext } from '@/lib/era';
import { WorldEngineDirector } from './index';
import type {
  NPCEntity,
  SensoryContext,
  GeographyContext,
  OccultContext,
  SettingFriction,
  ClueNode,
} from './types';

interface AdapterAdventureConflictFaction {
  name?: string;
  goal?: string;
}

interface AdapterAdventureConflict {
  tensionType?: 'class' | 'belief' | 'institutional';
  description?: string;
  resource?: string;
  stakes?: string;
  factions?: AdapterAdventureConflictFaction[];
}

interface AdapterAdventurePuzzle {
  id?: string;
  title?: string;
  description?: string;
  solution?: string;
  solutionSummary?: string;
}

interface AdapterGraphNode {
  id?: string;
  label?: string;
  name?: string;
  type?: string;
  isBottleneck?: boolean;
}

interface AdapterAdventureGraph {
  nodes?: AdapterGraphNode[];
  locations?: Array<{ name?: string }>;
}

export interface WorldEngineAdapterParams {
  locale?: 'pl' | 'en';
  adventureContext?: {
    title?: string;
    location?: string;
    themes?: string[];
    conflicts?: AdapterAdventureConflict[];
    setupAsymmetry?: {
      rumors?: string[];
    };
    puzzles?: AdapterAdventurePuzzle[];
    graph?: AdapterAdventureGraph;
    truthAnchor?: {
      culprit?: string;
      immutableFacts?: string[];
    };
  } | null;
  currentLocation?: string | null;
  npcs?: NPC[] | null;
  character?: Character | null;
  eraContext?: Partial<ResolvedEraContext> | { countryCode?: string; effectiveYear?: number } | null;
  playerMessage?: string | null;
}

/**
 * Detekcja słów kluczowych podziemi w nazwie lub opisie lokacji
 */
function detectUndergroundOrigin(location: string): 'cellars' | 'sewers' | 'catacombs' | 'mines' | undefined {
  const loc = location.toLowerCase();
  if (/piwnic|cellar|basement/.test(loc)) return 'cellars';
  if (/kanał|sewer/.test(loc)) return 'sewers';
  if (/katakumb|grobow|krypt|crypt|catacomb/.test(loc)) return 'catacombs';
  if (/jaskini|kopaln|mine|cave/.test(loc)) return 'mines';
  return undefined;
}

/**
 * Detekcja słów kluczowych hydrologii (woda, rzeka, port, morze)
 */
function detectWaterway(location: string, locale: 'pl' | 'en'): string | undefined {
  const loc = location.toLowerCase();
  if (/rzek|port|dok|morz|jezior|wybrzeż|kanał|przystań|river|harbor|dock|sea|lake|coast|pier|bay/.test(loc)) {
    return locale === 'en'
      ? 'Natural downstream flow and logistical dependence on waterways and tides'
      : 'Naturalny spływ wód i logistyczna zależność transportu od żeglugi oraz pływów';
  }
  return undefined;
}

/**
 * Sprawdzenie czy w scenie zachodzi kontekst okultystyczny / nadprzyrodzony
 */
function isOccultContextActive(params: WorldEngineAdapterParams): boolean {
  const { adventureContext, character, playerMessage, currentLocation } = params;

  // 1. Motywy przygody
  const themesStr = (adventureContext?.themes || []).join(' ').toLowerCase();
  if (/occult|mit|cthulhu|magia|rytuał|horror|kosm|alien|bóstw|nadnatural|supernatural/.test(themesStr)) {
    return true;
  }

  // 2. Gracz posiada czary lub tomy wiedzy tajemnej
  const knownSpells = character?.magic?.knownSpells ? Object.keys(character.magic.knownSpells) : [];
  const tomeStudies = character?.magic?.tomeStudies ? Object.keys(character.magic.tomeStudies) : [];
  if (knownSpells.length > 0 || tomeStudies.length > 0) {
    return true;
  }

  // 3. Treść wypowiedzi gracza lub bieżąca lokacja
  const combinedText = `${playerMessage || ''} ${currentLocation || ''}`.toLowerCase();
  if (/czar|zaklęci|rytuał|ofiara|potwór|mit|okultyzm|obłęd|szaleństwo|spell|ritual|sacrifice|monster|mythos|tome|grimoire|insanity/.test(combinedText)) {
    return true;
  }

  return false;
}

/**
 * Główny adapter budujący zintegrowane dyrektywy 7 silników świata w locie (runtime).
 */
export function buildWorldEngineDirectives(params: WorldEngineAdapterParams): string {
  const director = new WorldEngineDirector();
  const locale = params.locale ?? 'pl';
  const currentLocation = params.currentLocation?.trim() || '';

  // 1. SensoryEngine (02) - zawsze aktywne, mikrosensoryka
  const isDesertedOrSpooky = /cmentarz|ruin|strych|piwnic|opuszcz|mgł|las|noc|krypt|cemetery|ruins|attic|abandoned|fog|crypt/.test(
    currentLocation.toLowerCase()
  );

  const sensory: SensoryContext = {
    primarySense: 'olfactory',
    secondarySense: 'auditory',
    gritDetails: [
      currentLocation
        ? (locale === 'en' ? `Atmosphere and age of the place: ${currentLocation}` : `Ślady zużycia i atmosfera miejsca: ${currentLocation}`)
        : (locale === 'en' ? 'Patina of time and period retro-grain' : 'Patyna czasu i retro-ziarno epoki'),
    ],
    voidVariable: isDesertedOrSpooky
      ? (locale === 'en' ? 'Unsettling silence or absence of natural human bustle' : 'Złowroga cisza lub brak zwyczajnego ludzkiego gwaru')
      : undefined,
  };

  // 2. NPCEngine (01) - pierwszy obecny NPC
  let activeNPC: NPCEntity | undefined;
  const firstNpc = params.npcs && params.npcs.length > 0 ? params.npcs[0] : undefined;
  if (firstNpc) {
    activeNPC = {
      id: firstNpc.id,
      name: firstNpc.name,
      facade: firstNpc.description?.slice(0, 120) || firstNpc.occupation || (locale === 'en' ? 'Mysterious stranger' : 'Tajemniczy nieznajomy'),
      flaw: (firstNpc as unknown as { flaw?: string }).flaw || (locale === 'en' ? 'Habitual distrust of outsiders' : 'Nawykowa podejrzliwość wobec obcych'),
      hiddenAgenda: firstNpc.agenda || (locale === 'en' ? 'Guards personal interests and secrets' : 'Chroni swoje interesy i sekrety'),
      resistanceLevel: firstNpc.disposition === 'hostile' ? 'hostile' : firstNpc.disposition === 'suspicious' ? 'suspicious' : 'guarded',
      fearOrLeverage: (firstNpc as unknown as { fearOrLeverage?: string }).fearOrLeverage || (locale === 'en' ? 'Threat of scandal or exposure' : 'Groźba skandalu lub zdemaskowania'),
    };
  }

  // 3. NarrativeGraphEngine (03) - zbieżność gałęzi i wąskie gardła
  let graphDirectiveParam: { branch: string; bottleneck: string } | undefined;
  const graph = params.adventureContext?.graph;
  if (graph) {
    const currentBranch = currentLocation || (locale === 'en' ? 'Active Investigation' : 'Bieżący trop');
    let bottleneckTarget = params.adventureContext?.title || (locale === 'en' ? 'Climax Scene' : 'Punkt kulminacyjny');

    if (Array.isArray(graph.nodes) && graph.nodes.length > 0) {
      const bottleneckNode = graph.nodes.find(
        (n) => n.isBottleneck || n.type === 'bottleneck' || n.type === 'climax'
      );
      if (bottleneckNode?.label || bottleneckNode?.name) {
        bottleneckTarget = bottleneckNode.label || bottleneckNode.name || bottleneckTarget;
      }
    } else if (Array.isArray(graph.locations) && graph.locations.length > 0) {
      bottleneckTarget = graph.locations[graph.locations.length - 1]?.name || bottleneckTarget;
    }

    graphDirectiveParam = {
      branch: currentBranch,
      bottleneck: bottleneckTarget,
    };
  }

  // 4. PlotFrictionEngine (04) - tarcia społeczne i plotki
  let frictionParam: SettingFriction | undefined;
  const conflicts = params.adventureContext?.conflicts;
  const rumors = params.adventureContext?.setupAsymmetry?.rumors;

  if (conflicts && conflicts.length > 0) {
    const primaryConflict = conflicts[0];
    const factionsStr = Array.isArray(primaryConflict.factions)
      ? primaryConflict.factions.map((f) => f.name || f.goal).filter(Boolean).join(' vs ')
      : '';
    const desc = primaryConflict.description || primaryConflict.resource || factionsStr || 'Napięcie w społeczności';

    frictionParam = {
      tensionType: primaryConflict.tensionType || 'class',
      description: desc,
      activeRumor: rumors && rumors.length > 0 ? rumors[0] : (locale === 'en' ? 'Locals whisper about strange occurrences' : 'Miejscowi szepczą o dziwnych zajściach'),
      ambientDetail: primaryConflict.stakes || primaryConflict.resource || (locale === 'en' ? 'Tense glances and guarded remarks' : 'Napięte spojrzenia i ostrożne półsłówka'),
    };
  } else if (rumors && rumors.length > 0) {
    frictionParam = {
      tensionType: 'belief',
      description: locale === 'en' ? 'Local superstition and gossip' : 'Lokalne zabobony i plotki',
      activeRumor: rumors[0],
      ambientDetail: locale === 'en' ? 'Whispers behind closed shutters' : 'Szepty za zamkniętymi okiennicami',
    };
  }

  // 5. MysteryClueEngine (05) - reguła 3 poszlak i fail-forward
  let clueParam: ClueNode | undefined;
  const puzzles = params.adventureContext?.puzzles;
  const truthAnchor = params.adventureContext?.truthAnchor;

  if (puzzles && puzzles.length > 0) {
    const firstPuzzle = puzzles[0];
    clueParam = {
      id: firstPuzzle.id || 'puzzle-clue',
      summary: firstPuzzle.title || firstPuzzle.description || (locale === 'en' ? 'Investigative enigma' : 'Zagadka śledcza'),
      targetRevelationId: firstPuzzle.solutionSummary || firstPuzzle.solution || (locale === 'en' ? 'Truth discovery' : 'Odkrycie prawdy'),
      sources: ['observation', 'deduction'],
      failForwardCost: 'time',
    };
  } else if (truthAnchor?.immutableFacts && truthAnchor.immutableFacts.length > 0) {
    clueParam = {
      id: 'truth-clue',
      summary: truthAnchor.immutableFacts[0],
      targetRevelationId: truthAnchor.culprit || (locale === 'en' ? 'Culprit Identity' : 'Tożsamość sprawcy'),
      sources: ['observation', 'testimony'],
      failForwardCost: 'danger',
    };
  }

  // 6. GeographyEngine (06) - uwarunkowania terenu, ekonomii, podziemi i wód
  const region = params.adventureContext?.location || (locale === 'en' ? 'Investigative District' : 'Dystrykt śledztwa');
  const chokepoint = currentLocation ? `${currentLocation} (${region})` : region;
  const countryCode = params.eraContext?.countryCode || 'US';
  const economicConstraint = countryCode === 'US'
    ? (locale === 'en' ? 'Railroad access, fuel monopoly and Prohibition supply bottlenecks' : 'Monopol naftowy, kolejowe węzły przeładunkowe i ograniczenia Prohibicji')
    : (locale === 'en' ? 'Strict police permits and transport checkpoints' : 'Kordon policyjny, reglamentacja i koszty przemieszczania się');

  const geographyParam: GeographyContext = {
    terrainOrChokepoint: chokepoint,
    economicConstraint,
    undergroundOrigin: detectUndergroundOrigin(currentLocation),
    waterwayLogic: detectWaterway(currentLocation, locale),
  };

  // 7. OccultEngine (07) - warunkowe dawkownie horroru i somatyki magii
  let occultParam: OccultContext | undefined;
  if (isOccultContextActive(params)) {
    occultParam = {
      magicType: 'soft_weird',
      somaticCost: locale === 'en'
        ? 'Nosebleed, sensory nausea, muscle tremors and bone-deep chill upon touching the unnameable'
        : 'Krwawienie z nosa, mdłości sensoryczne, drżenie mięśni i chłód kości przy kontakcie z nienazwanym',
      cultTier: 'inner_initiated',
      cosmicTaboo: locale === 'en'
        ? 'Non-Euclidean geometry and cosmic entities cannot be perceived without sanity erosion'
        : 'Pojmowanie pozaziemskich zjawisk nieuchronnie niszczy ludzką poczytalność',
    };
  }

  return director.compileDirectives({
    locale,
    sensory,
    activeNPC,
    graph: graphDirectiveParam,
    friction: frictionParam,
    clue: clueParam,
    geography: geographyParam,
    occult: occultParam,
  });
}
