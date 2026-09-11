/**
 * Konwerter pakietu Dramatron do struktur aplikacji:
 * - AdventureContext (kompatybilny z AdventureSelector, AdventureGraph i silnikiem czatu)
 * - InvestigatorDossier (z uwzględnieniem bramki anty-spoilerowej: Gracz vs Mistrz Gry)
 * - Dokumenty RAG (do zasilenia pamięci wektorowej przygody)
 */

import type { AdventureContext } from '../adventures-data';
import type {
  ClueEntry,
  InvestigatorDossier,
  LocationDossierEntry,
  NpcDossierEntry,
  SceneDossierEntry,
} from '../journal/dossier-types';
import type { AdventureGraph } from '../types';
import type { DramatronAdventure } from './types';

/**
 * Konwertuje pakiet Dramatron do AdventureContext z pełnym grafem śledztwa.
 */
export function dramatronToAdventureContext(
  dramatron: DramatronAdventure,
  forPlayer = false
): AdventureContext {
  const { premise, cast, clueWeb, locations } = dramatron;

  const graph: AdventureGraph = {
    npcs: cast.map((npc) => ({
      id: npc.id,
      name: npc.name,
      description: `${npc.occupation}. ${npc.firstImpression}`,
      secret: forPlayer ? undefined : npc.secret,
      statsSummary: forPlayer ? undefined : npc.statsSummary,
    })),
    locations: locations.map((loc) => ({
      id: loc.id,
      name: loc.name,
      description: loc.description,
      atmosphere: loc.sensoryAtmosphere,
    })),
    clues: clueWeb.clues.map((clue) => ({
      id: clue.id,
      name: clue.title,
      description: clue.description,
      isRedHerring: false,
    })),
    connections: forPlayer ? [] : clueWeb.connections,
  };

  return {
    id: premise.id,
    title: premise.title,
    description: premise.logline,
    era: premise.era,
    eraLabel: premise.eraLabel,
    yearRange: premise.exactYear,
    location: premise.location,
    country: premise.country,
    tone: premise.tone,
    hook: premise.investigatorHook,
    customDescription: forPlayer ? premise.investigatorHook : premise.keeperTruthOverview,
    themes: premise.themes,
    suggestedOccupations: ['Prywatny detektyw', 'Dziennikarz', 'Lekarz', 'Naukowiec', 'Antykwariusz'],
    suggestedArchetypes: ['Dociekliwy śledczy', 'Uczony', 'Sceptyk'],
    estimatedSessions: '1-3 sesje',
    playerCount: '1-4 badaczy',
    difficulty: 'normal',
    isCustom: true,
    graph,
  };
}

/**
 * Maskuje pełną strukturę Dramatron dla gracza, zapobiegając wyciekowi spoilerów przez API.
 */
export function maskDramatronForPlayer(dramatron: DramatronAdventure): DramatronAdventure {
  return {
    ...dramatron,
    premise: {
      ...dramatron.premise,
      keeperTruthOverview: '',
      centralMystery: '[UKRYTE DLA BADACZA]',
      mythosEntity: '[UKRYTE DLA BADACZA]',
      anomalyType: '[UKRYTE DLA BADACZA]',
    },
    cast: dramatron.cast.map((npc) => ({
      ...npc,
      secret: '[SEKRET MG]',
      psychologicalAgenda: '',
      statsSummary: '',
    })),
    clueWeb: {
      truthAnchor: {
        culprit: '[UKRYTE]',
        motive: '[UKRYTE]',
        murderWeapon: '[UKRYTE]',
        keyAlibi: '[UKRYTE]',
        immutableFacts: [],
      },
      clues: dramatron.clueWeb.clues.map((c) => ({
        ...c,
        insightHint: undefined,
        leadsToNodeId: '',
        alternativeClueIds: [],
      })),
      connections: [], // Pełna blokada struktury grafu śledztwa przed graczem
    },
    locations: dramatron.locations.map((loc) => ({
      ...loc,
      lockedRoomMystery: undefined, // Brak ujawniania anomalii Carra przed odkryciem
    })),
    scenes: [],
  };
}

/**
 * Konwertuje pakiet Dramatron do Akt Śledczych (InvestigatorDossier).
 *
 * Bezpieczeństwo epistemiczne (Anty-Spoiler):
 * - W trybie Badacza (forPlayer = true) sekrety MG, rozwiązania zagadek Carra,
 *   kotwica prawdy oraz pełna sieć poszlak są zablokowane i maskowane.
 * - W trybie MG (forPlayer = false) dostępny jest 100% wgląd w kulisy.
 */
export function dramatronToInvestigatorDossier(
  dramatron: DramatronAdventure,
  forPlayer = false
): InvestigatorDossier {
  const { premise, cast, clueWeb, locations, scenes, clueWeb: { truthAnchor } } = dramatron;

  // POSZLAKI
  const clues: ClueEntry[] = clueWeb.clues.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    category: c.category,
    status: 'unconfirmed',
    discoveryStatus: forPlayer ? 'unrevealed' : 'verified',
    epistemicLayer: forPlayer ? 'player_clue' : 'keeper_truth',
    isKeyClue: forPlayer ? false : c.isKeyClue,
    miceType: c.miceType,
    miceObjective: c.miceObjective,
    sourceNpcId: c.sourceNpcId,
    foundLocationId: c.foundLocationId,
    linkedNodeIds: forPlayer ? [] : [c.leadsToNodeId],
    alternativeClueTrails: forPlayer ? [] : c.alternativeClueIds,
    investigatorInsight: forPlayer ? undefined : c.insightHint,
  }));

  // POSTACIE (LAJOS EGRI 3D)
  const npcs: NpcDossierEntry[] = cast.map((n) => ({
    id: n.id,
    name: n.name,
    occupation: n.occupation,
    firstImpression: n.firstImpression,
    keyInformation: forPlayer ? n.firstImpression : n.secret,
    secret: forPlayer ? '[SEKRET MG]' : n.secret,
    relationshipStatus: n.relationshipStatus,
    disposition: n.disposition,
    physiologicalDetail: n.physiologicalDetail,
    sociologicalStatus: n.sociologicalStatus,
    psychologicalAgenda: forPlayer ? undefined : n.psychologicalAgenda,
    notes: forPlayer
      ? `Oficjalna rola: ${n.mask}`
      : `Maska: ${n.mask}\nSekret MG: ${n.secret}\nStatystyki: ${n.statsSummary}`,
  }));

  // LOKACJE (CARR LOCKED ROOM MYSTERIES)
  const locEntries: LocationDossierEntry[] = locations.map((l) => ({
    id: l.id,
    name: l.name,
    addressOrRegion: l.addressOrRegion,
    searchStatus: 'unvisited',
    description: l.description,
    discoveredClueIds: forPlayer ? [] : l.clueIds,
    lockedRoomMystery: forPlayer || !l.lockedRoomMystery
      ? undefined
      : {
          type: l.lockedRoomMystery.type,
          anomalyDescription: l.lockedRoomMystery.anomalyDescription,
          investigationHint: l.lockedRoomMystery.investigationHint,
        },
  }));

  // SCENY I BEATY
  const sceneEntries: SceneDossierEntry[] = forPlayer
    ? []
    : scenes.map((s) => ({
        id: s.id,
        title: s.title,
        act: s.act,
        locationId: s.locationId,
        npcIds: s.npcIds,
        description: s.description,
        clueIds: s.clueIds,
        isClimax: s.isClimax,
        beats: s.beats.map((b) => ({
          id: b.id,
          title: b.title,
          description: b.description,
          miceType: b.miceType,
          sanLossRisk: b.sanLossRisk,
          skillChecks: b.skillChecks,
          keyClueId: b.keyClueId,
          outcome: b.outcome,
        })),
      }));

  return {
    adventureId: premise.id,
    clues,
    npcs,
    locations: locEntries,
    notes: [],
    scenes: sceneEntries,
    truthAnchor: forPlayer ? undefined : truthAnchor,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Przygotowuje dokumenty do zindeksowania w lokalnym RAG (przestrzeń adventures/{id}).
 */
export function dramatronToRAGDocuments(dramatron: DramatronAdventure): Array<{
  id: string;
  text: string;
  metadata: {
    contentType: string;
    summary: string;
    tags: string[];
    gameTimestamp?: string;
  };
}> {
  const docs: Array<{
    id: string;
    text: string;
    metadata: { contentType: string; summary: string; tags: string[] };
  }> = [];

  const { premise, cast, clueWeb, locations } = dramatron;

  docs.push({
    id: `${premise.id}-premise-doc`,
    text: `# ${premise.title}\n\n${premise.logline}\n\nBóstwo: ${premise.mythosEntity}\nAnomalia: ${premise.anomalyType}\nEpoka: ${premise.eraLabel} (${premise.exactYear})\n\n[SEKRETY_MG]\nPRAWDA MISTRZA GRY:\n${premise.keeperTruthOverview}`,
    metadata: {
      contentType: 'adventure_premise',
      summary: premise.logline,
      tags: ['premise', premise.era, premise.mythosEntity, 'keeper_truth'],
    },
  });

  cast.forEach((npc) => {
    docs.push({
      id: `${npc.id}-dossier-doc`,
      text: `## Postać: ${npc.name} (${npc.occupation})\n- Maska: ${npc.mask}\n- Fizjologia (Egri): ${npc.physiologicalDetail}\n- Socjologia (Egri): ${npc.sociologicalStatus}\n\n[SEKRETY_MG]\n- Sekret: ${npc.secret}\n- Psychologia (Egri): ${npc.psychologicalAgenda}\n- Statystyki CoC 7e RAW: ${npc.statsSummary}`,
      metadata: {
        contentType: 'npc_dossier',
        summary: `Profil NPC: ${npc.name}`,
        tags: ['npc', 'egri_3d', npc.name, 'keeper_truth'],
      },
    });
  });

  locations.forEach((loc) => {
    const carrInfo = loc.lockedRoomMystery
      ? `\nZagadka Zamkniętego Pokoju (${loc.lockedRoomMystery.type}):\n- Anomalia: ${loc.lockedRoomMystery.anomalyDescription}\n\n[SEKRETY_MG]\n- Rozwiązanie MG: ${loc.lockedRoomMystery.investigationHint}`
      : '';

    docs.push({
      id: `${loc.id}-location-doc`,
      text: `## Lokacja: ${loc.name}\nAdres: ${loc.addressOrRegion}\nOpis: ${loc.description}\nAtmosfera i progi zmysłowe: ${loc.sensoryAtmosphere}\nOmamy: ${loc.sensoryIllusions || 'brak'}${carrInfo}`,
      metadata: {
        contentType: 'location_dossier',
        summary: `Lokacja: ${loc.name}`,
        tags: ['location', loc.name, loc.lockedRoomMystery ? 'locked_room' : 'standard', loc.lockedRoomMystery ? 'keeper_truth' : 'player_clue'],
      },
    });
  });

  docs.push({
    id: `${premise.id}-clues-doc`,
    text: `## Sieć Poszlak (Alexandrian Three-Clue Rule)\n\n[SEKRETY_MG]\nSprawca: ${clueWeb.truthAnchor.culprit}\nMotyw: ${clueWeb.truthAnchor.motive}\nNarzędzie zbrodni: ${clueWeb.truthAnchor.murderWeapon}\nFakty niezmienne:\n${clueWeb.truthAnchor.immutableFacts.map((f) => `- ${f}`).join('\n')}\n\nPOSZLAKI:\n${clueWeb.clues.map((c) => `- [${c.category.toUpperCase()}] ${c.title}: ${c.description} (Wektor: ${c.miceType})`).join('\n')}`,
    metadata: {
      contentType: 'clue_network',
      summary: 'Sieć poszlak i prawda śledztwa',
      tags: ['clues', 'three_clue_rule', 'truth_anchor', 'keeper_truth'],
    },
  });

  return docs;
}
