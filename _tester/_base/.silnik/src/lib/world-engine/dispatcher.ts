import { performance } from 'node:perf_hooks';
import type { WorldEngineDirectives } from './types';
import {
  determineSceneState,
  selectSceneTechniques,
  type SceneTechniqueSelection,
} from '../narrative-engine/scene-director';
import type { SceneState, TechniqueId } from '../narrative-engine/techniques/types';

export type WorldEngineId =
  | 'npc'
  | 'sensory'
  | 'graph'
  | 'friction'
  | 'clue'
  | 'geography'
  | 'occult';

export const ALL_WORLD_ENGINES: WorldEngineId[] = [
  'npc',
  'sensory',
  'graph',
  'friction',
  'clue',
  'geography',
  'occult',
];

export interface DispatcherDecision {
  activeEngines: Record<WorldEngineId, boolean>;
  activeEngineIds: WorldEngineId[];
  recipientIds: string[];
  sceneEntityIds: string[];
  latencyMs: number;
  reasoning: string;
  source: 'micro_classifier' | 'fallback';
  allowedNamespaces?: string[];
  sceneState?: SceneState;
  sceneTechniqueSelection?: SceneTechniqueSelection;
}

export interface DispatcherNPC {
  id: string;
  name: string;
  aliases?: string[];
}

export interface DispatcherLocation {
  id: string;
  name: string;
}

export interface DispatcherPuzzle {
  id: string;
  title?: string;
}

export interface DispatcherInput {
  playerMessage?: string | null;
  currentLocation?: string | null;
  npcs?: DispatcherNPC[] | null;
  locations?: DispatcherLocation[] | null;
  puzzles?: DispatcherPuzzle[] | null;
  adventureThemes?: string[];
  hasOccultElements?: boolean;
  turnIndex?: number;
  previousSceneState?: SceneState | null;
  recentTechniqueIds?: TechniqueId[];
  isInCombat?: boolean;
  hasChaseContext?: boolean;
  hasSanityLossOrRoll?: boolean;
  locationChanged?: boolean;
  turnsInCurrentLocation?: number;
  macroLocation?: string;
  isNewMacroLocation?: boolean;
}

/**
 * Znormalizowany wektor cech [social, sensory, graph, friction, clue, geography, occult]
 */
export interface FeatureVector {
  social: number;
  sensory: number;
  graph: number;
  friction: number;
  clue: number;
  geography: number;
  occult: number;
}

/**
 * Ekstrakcja cech intencji gracza z tekstu deklaracji i kontekstu sceny
 */
export function extractIntentFeatures(input: DispatcherInput): FeatureVector {
  const rawMsg = (input.playerMessage ?? '').trim().toLowerCase();
  const rawLoc = (input.currentLocation ?? '').trim().toLowerCase();

  if (!rawMsg) {
    // Pusta deklaracja - tylko bazowa sensoryka kadru
    return {
      social: 0,
      sensory: 0.8,
      graph: 0,
      friction: 0,
      clue: 0,
      geography: 0,
      occult: 0,
    };
  }

  // 1. Social / Dialog
  let socialScore = 0;
  const hasExplicitSocialVerb =
    /\b(mówi|mowie|rozmawia|pyta|szept|krzycz|zagad|odpowiada|tłumacz|tlumacz|błaga|blaga|negocj|przekon|grozi|panie|pani|dzień dobry|dzien dobry|cześć|czesc|witam|wypytuj|talk|speak|ask|whisper|shout|tell|interrogate|greet|inquire)[a-ząćęłńóśźż]*/i.test(
      rawMsg
    );
  if (hasExplicitSocialVerb) {
    socialScore += 0.8;
  }

  const hasQuestion = /[?？]/.test(rawMsg);
  const hasDialogueFormatting =
    /^[ \t]*["„»“”‘'-]/.test(rawMsg) ||
    /["„»“”‘][^"”»“”’]+["”»“”’]/.test(rawMsg);
  const isInvestigativeOnly =
    /\b(szukam|badam|przeszukuj|oglądam|ogladam|czytam|otwieram|rozglądam|rozgladam|search|inspect|examine|read|open|look around)\b/i.test(
      rawMsg
    );

  // Sprawdź czy deklaracja wymienia któregoś ze znanych NPC (uwzględniając rdzenie imion dla wołaczy/zdrobnień)
  let mentionsNpc = false;
  if (input.npcs && input.npcs.length > 0) {
    for (const npc of input.npcs) {
      const npcNameParts = npc.name.toLowerCase().split(/\s+/).filter((p) => p.length >= 3);
      const match = npcNameParts.some((part) => {
        if (rawMsg.includes(part)) return true;
        const stem = part.length >= 4 ? part.slice(0, 4) : part;
        return stem.length >= 4 && rawMsg.includes(stem);
      });
      const aliasMatch = npc.aliases?.some((a) => rawMsg.includes(a.toLowerCase()));
      if (match || aliasMatch) {
        mentionsNpc = true;
        socialScore += 0.7;
        break;
      }
    }
    if (!mentionsNpc && /\b(waldek|waldku|piotrek|piotrze|kasiu|kasia|doktorze|profesorze|januszu|janusz)\b/i.test(rawMsg)) {
      mentionsNpc = true;
      socialScore += 0.7;
    }
  }

  // W obecności NPC: pytania lub formatowanie dialogowe podbijają intencję dialogu
  if (input.npcs && input.npcs.length > 0) {
    if (hasDialogueFormatting || (hasQuestion && !isInvestigativeOnly)) {
      socialScore += 0.75;
    }
  }

  // 2. Sensory (Zmysły, atmosfera, cisza, chłód, ziarno)
  // Issue #546 / #563: Gdy badacz spędza kolejną turę w tej samej lokacji (turnsInCurrentLocation > 0),
  // obniżamy bazową wagę sensoryki do 0.1 (anty-habituacja wg kontraktu #563).
  // W turze wejściowej (turnsInCurrentLocation === 0) przy dynamicznym dialogu (socialScore >= 0.7)
  // tłumimy stałą sensorykę tła do 0.25 (z bazowego 0.65).
  const turnsInLoc = input.turnsInCurrentLocation ?? 0;
  let sensoryScore = turnsInLoc > 0 ? 0.1 : socialScore >= 0.7 ? 0.25 : 0.65;
  if (
    /\b(wącha|wacha|słucha|slucha|dotyka|ogląda|oglada|czuje|zapach|smród|smrod|dźwięk|dzwiek|szelest|ciemno|zimno|chłód|chlod|mrok|oczy|wsłuchuj|wsluchuj|zamykam oczy|smell|hear|listen|touch|taste|scent|cold|dark|shadow)[a-ząćęłńóśźż]*/i.test(
      rawMsg
    )
  ) {
    sensoryScore += 0.65;
  }

  // 3. Narrative Graph (Impas poznawczy, bottleneck, kierunek)
  let graphScore = 0;
  if (
    /(co robić|co robic|gdzie iść|gdzie isc|jaki kolejny krok|co dalej|dokąd|dokad|nie wiem co|zgubił|zgubil|podsumuj|jaki cel|utkn|kolejny krok|what to do|where to go|next step|what next|stuck|dead end)/i.test(
      rawMsg
    ) ||
    (rawMsg.includes('nie wiem') && rawMsg.includes('krok'))
  ) {
    graphScore += 0.9;
  }

  // 4. Plot Friction (Tarcia społeczne, plotki, strajk, gazeciarz, nastroje)
  let frictionScore = 0;
  if (
    /\b(plotk|strajk|robotnic|gazeciarz|miasto|mieszkańcy|mieszkancy|nastroje|awantur|tłum|tlum|niepokoj|zamieszk|rumor|gossip|strike|workers|newsboy|crowd|tension|riot|shutter)[a-ząćęłńóśźż]*/i.test(
      rawMsg
    )
  ) {
    frictionScore += 0.85;
  }

  // 5. Mystery Clue (Poszlaki, przeszukiwanie, biurko, szuflada, schowek, śledztwo)
  let clueScore = 0;
  if (
    /\b(szukam|badam|przeszukuj|oglądam|ogladam|otwieram|szuflad|biurk|poszlak|ślad|slad|zagadk|dokument|schowek|trop|odkry|dowód|dowod|search|investigate|inspect|examine|drawer|desk|clue|evidence|puzzle|safe|cabinet|leads)[a-ząćęłńóśźż]*/i.test(
      rawMsg
    ) ||
    /(?:^|[^a-ząćęłńóśźż])(list(?:u|a|y|em|ach|ami|ów)?|letters?|notes?)(?=[^a-ząćęłńóśźż]|$)/i.test(
      rawMsg
    )
  ) {
    clueScore += 0.85;
  }

  // 6. Geography (Podziemia, ukształtowanie, hydrologia, rzeki, porty, podróż)
  let geographyScore = 0;
  if (
    /\b(piwnic|schodz|schodami|schody|kanał|kanal|katakumb|katakumby|lochy|krypt|grobow|jaskini|cellar|basement|sewer|catacomb|dungeon|crypt|cave)[a-ząćęłńóśźż]*/i.test(
      rawMsg
    ) ||
    /\b(łódź|lodz|płyn|plyn|rzek|morz|jezior|przystań|przystan|woda|wiosł|wioslo|boat|row|river|harbor|sea|lake|pier|water)[a-ząćęłńóśźż]*/i.test(
      rawMsg
    ) ||
    /(?:^|[^a-ząćęłńóśźż])(dok[iyów]?|dokach|dokami|docks?)(?=[^a-ząćęłńóśźż]|$)/i.test(
      rawMsg
    )
  ) {
    geographyScore += 0.9;
  }

  // 7. Occult (Rytuały, czary, mitologia Cthulhu, obłęd, starsze znaki)
  let occultScore = 0;
  if (
    /\b(czar|zaklęc|zaklec|rytuał|rytual|ofiara|inkantacj|starsze znaki|symbol|dagon|cthulhu|bóstw|bostw|mitolog|mit|obłęd|obled|szaleństw|szalenstw|anomali|spell|ritual|incantation|elder sign|cult|mythos|horror|insanity|tome|grimoire)[a-ząćęłńóśźż]*/i.test(
      rawMsg
    ) ||
    Boolean(input.hasOccultElements && /\b(magi|czar|rytuał|symbol)[a-ząćęłńóśźż]*/i.test(rawMsg))
  ) {
    occultScore += 0.9;
  }

  return {
    social: Math.min(socialScore, 1),
    sensory: Math.min(sensoryScore, 1),
    graph: Math.min(graphScore, 1),
    friction: Math.min(frictionScore, 1),
    clue: Math.min(clueScore, 1),
    geography: Math.min(geographyScore, 1),
    occult: Math.min(occultScore, 1),
  };
}

/**
 * Wagi mikromodelu (Sigmoid multi-label classifier)
 * Zoptymalizowane dla natychmiastowej inferencji CPU < 0.05 ms
 */
interface ModelWeights {
  weights: Record<WorldEngineId, number[]>; // macierz wag cech
  bias: Record<WorldEngineId, number>; // wektor obciążenia
  threshold: Record<WorldEngineId, number>; // próg aktywacji
}

const DISPATCHER_MODEL: ModelWeights = {
  weights: {
    npc: [4.2, 0.0, 0.0, 0.5, 0.0, 0.0, 0.0],
    sensory: [0.0, 3.5, 0.0, 0.0, 0.0, 0.0, 0.0],
    graph: [0.0, 0.0, 4.5, 0.0, 0.5, 0.0, 0.0],
    friction: [0.2, 0.0, 0.0, 4.5, 0.0, 0.0, 0.0],
    clue: [0.0, 0.0, 0.5, 0.0, 4.5, 0.0, 0.0],
    geography: [0.0, 0.0, 0.0, 0.0, 0.0, 4.8, 0.0],
    occult: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 4.8],
  },
  bias: {
    npc: -1.5,
    sensory: 0.5, // sensory zawsze ma przewagę atmosferyczną
    graph: -2.0,
    friction: -2.0,
    clue: -1.8,
    geography: -2.0,
    occult: -2.0,
  },
  threshold: {
    npc: 0.5,
    sensory: 0.5,
    graph: 0.5,
    friction: 0.5,
    clue: 0.5,
    geography: 0.5,
    occult: 0.5,
  },
};

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

/**
 * Główny dyspozytor orkiestracji 7 silników świata i selektywnego stagingu RAG
 */
export function dispatchWorldEngines(input: DispatcherInput): DispatcherDecision {
  const t0 = performance.now();
  const rawMsg = (input.playerMessage ?? '').trim();

  // Ekstrakcja cech
  const features = extractIntentFeatures(input);
  const featureArr = [
    features.social,
    features.sensory,
    features.graph,
    features.friction,
    features.clue,
    features.geography,
    features.occult,
  ];

  const activeEngines: Record<WorldEngineId, boolean> = {
    npc: false,
    sensory: true, // bazowy silnik zawsze dostępny
    graph: false,
    friction: false,
    clue: false,
    geography: false,
    occult: false,
  };

  // Ewaluacja modelu
  for (const engineId of ALL_WORLD_ENGINES) {
    const w = DISPATCHER_MODEL.weights[engineId];
    const b = DISPATCHER_MODEL.bias[engineId];
    let dot = 0;
    for (let i = 0; i < featureArr.length; i++) {
      dot += featureArr[i] * w[i];
    }
    const prob = sigmoid(dot + b);
    if (prob >= DISPATCHER_MODEL.threshold[engineId]) {
      activeEngines[engineId] = true;
    }
  }

  // Pusta deklaracja -> ściśle tylko sensoryka
  if (!rawMsg) {
    for (const k of ALL_WORLD_ENGINES) {
      activeEngines[k] = k === 'sensory';
    }
  }

  // Selektywny staging RAG: identyfikacja rozmówcy (recipientIds)
  const recipientIds: string[] = [];
  const lowerMsg = rawMsg.toLowerCase();

  if (input.npcs && input.npcs.length > 0) {
    for (const npc of input.npcs) {
      const parts = npc.name.toLowerCase().split(/\s+/).filter((p) => p.length >= 3);
      const isMentioned = parts.some((p) => {
        if (lowerMsg.includes(p)) return true;
        const stem = p.length >= 4 ? p.slice(0, 4) : p;
        return stem.length >= 4 && lowerMsg.includes(stem);
      });
      const isAliasMatch = npc.aliases?.some((a) => lowerMsg.includes(a.toLowerCase()));
      if (isMentioned || isAliasMatch) {
        recipientIds.push(npc.id);
      }
    }
    // Jeśli zidentyfikowano intencję dialogu (social), a nie wymieniono nikogo po imieniu,
    // przypisz pierwszego aktywnego NPC w scenie
    if (activeEngines.npc && recipientIds.length === 0 && input.npcs.length > 0) {
      recipientIds.push(input.npcs[0].id);
    }
  }

  // Selektywny staging RAG: identyfikacja encji lokacji / poszlak (sceneEntityIds)
  const sceneEntityIds: string[] = [];
  if (input.locations && input.locations.length > 0) {
    for (const loc of input.locations) {
      const locLower = loc.name.toLowerCase().trim();
      const locStem = locLower.length > 4 ? locLower.slice(0, -1) : locLower;
      if (
        lowerMsg.includes(locLower) ||
        (locStem.length >= 4 && lowerMsg.includes(locStem)) ||
        locLower === (input.currentLocation ?? '').toLowerCase()
      ) {
        sceneEntityIds.push(loc.id);
      }
    }
  }

  if (input.puzzles && input.puzzles.length > 0 && activeEngines.clue) {
    for (const p of input.puzzles) {
      if (p.id) sceneEntityIds.push(p.id);
    }
  }

  // Filtrowanie dozwolonych namespace'ów RAG w zależności od charakteru tury
  let allowedNamespaces: string[] | undefined = undefined;
  if (!activeEngines.occult && !activeEngines.geography) {
    // W turach spokojnych dialogowo/śledczych ograniczamy RAG do sesji i bieżącej przygody
    allowedNamespaces = ['sessions', 'adventures'];
  }

  // === ISSUE #536 / ISSUE #546: DYNAMICZNY REŻYSER PACINGU I SELEKTOR TECHNIK ===
  const sceneState = determineSceneState({
    playerMessage: input.playerMessage,
    previousSceneState: input.previousSceneState,
    isInCombat: input.isInCombat,
    hasChaseContext: input.hasChaseContext,
    hasSanityLossOrRoll: input.hasSanityLossOrRoll,
    hasOccultElements: input.hasOccultElements,
    npcsPresent: Boolean(input.npcs && input.npcs.length > 0),
    npcs: input.npcs ? input.npcs.map((n) => ({ id: n.id, name: n.name })) : undefined,
    currentLocation: input.currentLocation,
    locationChanged: input.locationChanged,
    turnIndex: input.turnIndex,
  });

  const sceneTechniqueSelection = selectSceneTechniques({
    sceneState,
    recentTechniqueIds: input.recentTechniqueIds,
    playerMessage: input.playerMessage,
    hasNPCInteraction: Boolean(input.npcs && input.npcs.length > 0 && activeEngines.npc),
    hasDirectDanger: Boolean(input.isInCombat || input.hasChaseContext || input.hasSanityLossOrRoll),
    isCosmicHorror: Boolean(input.hasOccultElements && activeEngines.occult),
    isLocationTransition: Boolean(input.locationChanged),
  });

  const activeEngineIds = ALL_WORLD_ENGINES.filter((id) => activeEngines[id]);
  const latencyMs = Math.round((performance.now() - t0) * 1000) / 1000;

  return {
    activeEngines,
    activeEngineIds,
    recipientIds,
    sceneEntityIds,
    latencyMs,
    reasoning: `Active: ${activeEngineIds.join(', ')} (${latencyMs}ms)`,
    source: 'micro_classifier',
    allowedNamespaces,
    sceneState,
    sceneTechniqueSelection,
  };
}
