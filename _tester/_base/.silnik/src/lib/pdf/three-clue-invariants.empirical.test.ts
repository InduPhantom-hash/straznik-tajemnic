/**
 * Pakiet testow empirycznych niezmiennikow Three Clue Rule RAW
 * Challenger M2.2 - Empirical Invariant Testing
 *
 * Testowane niezmienniki:
 * - Niezmiennik 1: Po naprawie kazdy wezel bottleneck/climax posiada >= 3 poszlaki wejsciowe.
 * - Niezmiennik 2: Po naprawie wezel bottleneck posiada co najmniej 2 rozne sourceType (dywersyfikacja).
 * - Niezmiennik 3: Zadna krawedz GraphConnection dodana przez walidator nie jest samopetla (fromId !== toId).
 * - Niezmiennik 4: 100% poszlak z leadInClueIds istnieje w graph.clues.
 * - Niezmiennik 5: Pelna idempotencja: ponowna naprawa zwraca totalSynthesizedClues: 0 i isValid: true.
 *
 * Dodatkowo:
 * - Fuzzing / Property-based testing na 100 losowych strukturach grafowych.
 * - Weryfikacja braku znakow em-dash i en-dash we wszystkich szablonach i strukturach.
 * - Test zachowania trybu inspectGraph (read-only invariant).
 */

import {
  ThreeClueRuleValidator,
  CLUE_TEMPLATES,
  normalizeEra,
  type SupportedEra,
} from './three-clue-rule-validator';
import type {
  AdventureGraph,
  AdventureNode,
  AdventureClue,
  GraphConnection,
  ClueSourceType,
} from '../types';

// Pomocnicze fabryki struktur testowych

function makeNode(overrides: Partial<AdventureNode> = {}): AdventureNode {
  return {
    id: 'node-' + Math.random().toString(36).substring(2, 9),
    name: 'Test Node',
    type: 'location',
    description: 'Opis wezla testowego.',
    leadInClueIds: [],
    leadOutClueIds: [],
    ...overrides,
  };
}

function makeClue(overrides: Partial<AdventureClue> = {}): AdventureClue {
  return {
    id: 'clue-' + Math.random().toString(36).substring(2, 9),
    name: 'Poszlaka testowa',
    description: 'Opis poszlaki testowej.',
    sourceType: 'document',
    clueType: 'core',
    targetNodeId: 'node-target',
    ...overrides,
  };
}

function makeGraph(overrides: Partial<AdventureGraph> = {}): AdventureGraph {
  return {
    nodes: [],
    clues: [],
    connections: [],
    npcs: [],
    locations: [],
    ...overrides,
  };
}

describe('Empirical Invariant Testing - Three Clue Rule RAW Validator', () => {
  // =========================================================================
  // Niezmiennik 1: Po naprawie kazdy wezel bottleneck/climax posiada >= 3 poszlaki wejsciowe
  // =========================================================================
  describe('Niezmiennik 1: Kazdy wezel bottleneck/climax posiada >= 3 poszlaki wejsciowe', () => {
    it('zapewnia >= 3 poszlaki wejsciowe dla wezla bottleneck z 0 poszlakami', () => {
      const intro = makeNode({ id: 'intro', type: 'intro' });
      const bottleneck = makeNode({ id: 'target', isBottleneck: true, leadInClueIds: [] });
      const graph = makeGraph({ nodes: [intro, bottleneck], clues: [] });

      const result = ThreeClueRuleValidator.validateAndRepairGraph(graph);

      const targetInGraph = result.graph.nodes.find((n) => n.id === 'target')!;
      expect(targetInGraph.leadInClueIds.length).toBeGreaterThanOrEqual(3);

      const incomingClues = result.graph.clues.filter(
        (c) => c.targetNodeId === 'target' && !c.isRedHerring
      );
      expect(incomingClues.length).toBeGreaterThanOrEqual(3);
    });

    it('zapewnia >= 3 poszlaki wejsciowe dla wezla oznaczonego jako climax (type: climax oraz isClimax: true)', () => {
      const intro = makeNode({ id: 'intro', type: 'intro' });
      const climax1 = makeNode({ id: 'climax-1', type: 'climax', leadInClueIds: [] });
      const climax2 = makeNode({ id: 'climax-2', isClimax: true, leadInClueIds: [] });
      const graph = makeGraph({ nodes: [intro, climax1, climax2], clues: [] });

      const result = ThreeClueRuleValidator.validateAndRepairGraph(graph);

      for (const climaxId of ['climax-1', 'climax-2']) {
        const node = result.graph.nodes.find((n) => n.id === climaxId)!;
        expect(node.leadInClueIds.length).toBeGreaterThanOrEqual(3);
        const incoming = result.graph.clues.filter(
          (c) => c.targetNodeId === climaxId && !c.isRedHerring
        );
        expect(incoming.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('zapewnia >= 3 poszlaki wejsciowe dla ostatniego wezla w grafie bez jawnych flag (fallback kulminacji)', () => {
      const n1 = makeNode({ id: 'step-1', type: 'intro' });
      const n2 = makeNode({ id: 'step-2', type: 'location' });
      const n3 = makeNode({ id: 'step-3', type: 'location' });
      const graph = makeGraph({ nodes: [n1, n2, n3], clues: [] });

      const result = ThreeClueRuleValidator.validateAndRepairGraph(graph);

      const lastNode = result.graph.nodes.find((n) => n.id === 'step-3')!;
      expect(lastNode.isClimax).toBe(true);
      expect(lastNode.leadInClueIds.length).toBeGreaterThanOrEqual(3);
      const incoming = result.graph.clues.filter(
        (c) => c.targetNodeId === 'step-3' && !c.isRedHerring
      );
      expect(incoming.length).toBeGreaterThanOrEqual(3);
    });

    it('ignoruje falszywe tropy (isRedHerring: true) i dobudowuje do pelnych >= 3 poszlak wlasciwych', () => {
      const intro = makeNode({ id: 'intro', type: 'intro' });
      const bottleneck = makeNode({ id: 'bottle', isBottleneck: true });
      const realClue = makeClue({
        id: 'real-1',
        targetNodeId: 'bottle',
        isRedHerring: false,
        sourceType: 'material',
      });
      const herring1 = makeClue({
        id: 'herring-1',
        targetNodeId: 'bottle',
        isRedHerring: true,
        sourceType: 'document',
      });
      const herring2 = makeClue({
        id: 'herring-2',
        targetNodeId: 'bottle',
        isRedHerring: true,
        sourceType: 'testimony',
      });
      const herring3 = makeClue({
        id: 'herring-3',
        targetNodeId: 'bottle',
        isRedHerring: true,
        sourceType: 'anomaly',
      });

      const graph = makeGraph({
        nodes: [intro, bottleneck],
        clues: [realClue, herring1, herring2, herring3],
      });

      const result = ThreeClueRuleValidator.validateAndRepairGraph(graph);

      // Mimo ze fizycznie bylo 4 poszlak, 3 byly falszywkami. Walidator musial dodac 2 poszlaki core.
      const validClues = result.graph.clues.filter(
        (c) => c.targetNodeId === 'bottle' && !c.isRedHerring
      );
      expect(validClues.length).toBeGreaterThanOrEqual(3);
      expect(result.totalSynthesizedClues).toBe(2);
    });

    it('zapewnia >= 3 poszlaki wejsciowe dla kazdego z 5 kolejnych wezlow bottleneck w dlugim lancuchu', () => {
      const nodes: AdventureNode[] = [makeNode({ id: 'n0', type: 'intro' })];
      for (let i = 1; i <= 5; i++) {
        nodes.push(makeNode({ id: `n${i}`, name: `Bottleneck ${i}`, isBottleneck: true }));
      }
      const graph = makeGraph({ nodes, clues: [] });

      const result = ThreeClueRuleValidator.validateAndRepairGraph(graph);

      expect(result.checkedBottlenecks).toBe(5);
      expect(result.totalSynthesizedClues).toBe(15);

      for (let i = 1; i <= 5; i++) {
        const bNode = result.graph.nodes.find((n) => n.id === `n${i}`)!;
        expect(bNode.leadInClueIds.length).toBeGreaterThanOrEqual(3);
        const incoming = result.graph.clues.filter(
          (c) => c.targetNodeId === `n${i}` && !c.isRedHerring
        );
        expect(incoming.length).toBeGreaterThanOrEqual(3);
      }
    });
  });

  // =========================================================================
  // Niezmiennik 2: Po naprawie wezel bottleneck posiada co najmniej 2 rozne sourceType
  // =========================================================================
  describe('Niezmiennik 2: Dywersyfikacja zrodel (co najmniej 2 rozne sourceType)', () => {
    it('zapewnia min. 2 rozne sourceType dla wezla bez zadnych poszlak poczatkowych', () => {
      const intro = makeNode({ id: 'intro', type: 'intro' });
      const bottleneck = makeNode({ id: 'b1', isBottleneck: true });
      const graph = makeGraph({ nodes: [intro, bottleneck], clues: [] });

      const result = ThreeClueRuleValidator.validateAndRepairGraph(graph);

      const clues = result.graph.clues.filter((c) => c.targetNodeId === 'b1' && !c.isRedHerring);
      const sources = new Set(clues.map((c) => c.sourceType));
      expect(sources.size).toBeGreaterThanOrEqual(2);
    });

    it('zapewnia min. 2 rozne sourceType gdy wezel posiada 2 poszlaki OBU tego samego typu', () => {
      const intro = makeNode({ id: 'intro', type: 'intro' });
      const bottleneck = makeNode({ id: 'b1', isBottleneck: true, leadInClueIds: ['c1', 'c2'] });
      const c1 = makeClue({ id: 'c1', targetNodeId: 'b1', sourceType: 'document' });
      const c2 = makeClue({ id: 'c2', targetNodeId: 'b1', sourceType: 'document' });
      const graph = makeGraph({ nodes: [intro, bottleneck], clues: [c1, c2] });

      const result = ThreeClueRuleValidator.validateAndRepairGraph(graph);

      const clues = result.graph.clues.filter((c) => c.targetNodeId === 'b1' && !c.isRedHerring);
      const sources = new Set(clues.map((c) => c.sourceType));
      expect(clues.length).toBeGreaterThanOrEqual(3);
      expect(sources.size).toBeGreaterThanOrEqual(2);
      expect(sources.has('document')).toBe(true);
    });

    it('wymusza dywersyfikacje (syntetyzuje 1 nowa poszlake), gdy wezel posiada 3 poszlaki WSZYSTKIE tego samego typu', () => {
      const intro = makeNode({ id: 'intro', type: 'intro' });
      const bottleneck = makeNode({
        id: 'b1',
        isBottleneck: true,
        leadInClueIds: ['c1', 'c2', 'c3'],
      });
      const c1 = makeClue({ id: 'c1', targetNodeId: 'b1', sourceType: 'testimony' });
      const c2 = makeClue({ id: 'c2', targetNodeId: 'b1', sourceType: 'testimony' });
      const c3 = makeClue({ id: 'c3', targetNodeId: 'b1', sourceType: 'testimony' });
      const graph = makeGraph({ nodes: [intro, bottleneck], clues: [c1, c2, c3] });

      const result = ThreeClueRuleValidator.validateAndRepairGraph(graph);

      // Mimo posiadania 3 poszlak, zrodla byly identyczne -> wymagana 1 poszlaka alternatywna
      expect(result.totalSynthesizedClues).toBe(1);
      const clues = result.graph.clues.filter((c) => c.targetNodeId === 'b1' && !c.isRedHerring);
      expect(clues.length).toBe(4);
      const sources = new Set(clues.map((c) => c.sourceType));
      expect(sources.size).toBeGreaterThanOrEqual(2);
      expect(sources.has('testimony')).toBe(true);
    });

    it('wymusza dywersyfikacje, gdy wezel posiada 5 poszlak WSZYSTKIE typu material', () => {
      const intro = makeNode({ id: 'intro', type: 'intro' });
      const bottleneck = makeNode({ id: 'b1', isBottleneck: true });
      const clues: AdventureClue[] = [];
      for (let i = 1; i <= 5; i++) {
        clues.push(makeClue({ id: `m${i}`, targetNodeId: 'b1', sourceType: 'material' }));
      }
      bottleneck.leadInClueIds = clues.map((c) => c.id);
      const graph = makeGraph({ nodes: [intro, bottleneck], clues });

      const result = ThreeClueRuleValidator.validateAndRepairGraph(graph);

      expect(result.totalSynthesizedClues).toBe(1);
      const finalClues = result.graph.clues.filter((c) => c.targetNodeId === 'b1' && !c.isRedHerring);
      const sources = new Set(finalClues.map((c) => c.sourceType));
      expect(sources.size).toBeGreaterThanOrEqual(2);
      expect(sources.has('material')).toBe(true);
    });

    it('prawidlowo wnioskuje sourceType z nazwy/opisu gdy pole sourceType jest puste lub undefined', () => {
      const intro = makeNode({ id: 'intro', type: 'intro' });
      const bottleneck = makeNode({ id: 'b1', isBottleneck: true, leadInClueIds: ['c-doc', 'c-test'] });
      const cDoc = makeClue({
        id: 'c-doc',
        targetNodeId: 'b1',
        name: 'Stary list hrabiego',
        description: 'Dziennik podrozy odnaleziony w archiwum.',
        sourceType: undefined as unknown as ClueSourceType,
      });
      const cTest = makeClue({
        id: 'c-test',
        targetNodeId: 'b1',
        name: 'Zeznanie rybaka',
        description: 'Swiadek opowiada o dziwnej istocie.',
        sourceType: undefined as unknown as ClueSourceType,
      });

      const graph = makeGraph({ nodes: [intro, bottleneck], clues: [cDoc, cTest] });
      const result = ThreeClueRuleValidator.validateAndRepairGraph(graph);

      expect(cDoc.sourceType).toBe('document');
      expect(cTest.sourceType).toBe('testimony');

      const finalClues = result.graph.clues.filter((c) => c.targetNodeId === 'b1' && !c.isRedHerring);
      const sources = new Set(finalClues.map((c) => c.sourceType));
      expect(sources.size).toBeGreaterThanOrEqual(2);
    });
  });

  // =========================================================================
  // Niezmiennik 3: Zadna krawedz GraphConnection dodana przez walidator nie jest samopetla (fromId !== toId)
  // =========================================================================
  describe('Niezmiennik 3: Brak samopetli w krawedziach polaczen (fromId !== toId)', () => {
    it('dla grafu 1-wezlowego tworzy wezel intro i laczy bez samopetli', () => {
      const singleNode = makeNode({ id: 'lonely', isBottleneck: true });
      const graph = makeGraph({ nodes: [singleNode], clues: [] });

      const result = ThreeClueRuleValidator.validateAndRepairGraph(graph);

      expect(result.graph.connections.length).toBeGreaterThan(0);
      result.graph.connections.forEach((conn) => {
        expect(conn.fromId).not.toBe(conn.toId);
        expect(conn.fromId).toBeTruthy();
        expect(conn.toId).toBe('lonely');
      });

      // Upewniamy sie ze introNode zostal wprowadzony do nodes
      const introNode = result.graph.nodes.find((n) => n.id === `node-intro-lonely`);
      expect(introNode).toBeDefined();
      expect(introNode?.id).not.toBe('lonely');
    });

    it('dla grafu 2-wezlowego gdzie oba wezly sa climax/bottleneck nie tworzy samopetli', () => {
      const b1 = makeNode({ id: 'b1', isBottleneck: true, isClimax: true });
      const b2 = makeNode({ id: 'b2', isBottleneck: true, isClimax: true });
      const graph = makeGraph({ nodes: [b1, b2], clues: [] });

      const result = ThreeClueRuleValidator.validateAndRepairGraph(graph);

      expect(result.graph.connections.length).toBeGreaterThan(0);
      result.graph.connections.forEach((conn) => {
        expect(conn.fromId).not.toBe(conn.toId);
        const fromNode = result.graph.nodes.find((n) => n.id === conn.fromId);
        const toNode = result.graph.nodes.find((n) => n.id === conn.toId);
        expect(fromNode).toBeDefined();
        expect(toNode).toBeDefined();
      });
    });

    it('dla grafu zawierajacego cykle (A -> B -> A) zadne nowo dodane polaczenie nie jest samopetla', () => {
      const nodeA = makeNode({ id: 'A', isBottleneck: true });
      const nodeB = makeNode({ id: 'B' });
      const connections: GraphConnection[] = [
        { fromId: 'A', toId: 'B', description: 'A do B' },
        { fromId: 'B', toId: 'A', description: 'B do A' },
      ];
      const graph = makeGraph({ nodes: [nodeA, nodeB], connections, clues: [] });

      const result = ThreeClueRuleValidator.validateAndRepairGraph(graph);

      result.graph.connections.forEach((conn) => {
        expect(conn.fromId).not.toBe(conn.toId);
      });
    });

    it('w grafie o wielu wezlach kazde polaczenie zsyntetyzowane posiada fromId !== toId i laczy istniejace wezly', () => {
      const nodes: AdventureNode[] = [];
      for (let i = 0; i < 10; i++) {
        nodes.push(makeNode({ id: `node-${i}`, isBottleneck: i % 2 === 0 }));
      }
      const graph = makeGraph({ nodes, clues: [] });

      const result = ThreeClueRuleValidator.validateAndRepairGraph(graph);

      expect(result.graph.connections.length).toBeGreaterThan(0);
      result.graph.connections.forEach((conn) => {
        expect(conn.fromId).not.toBe(conn.toId);
        expect(result.graph.nodes.some((n) => n.id === conn.fromId)).toBe(true);
        expect(result.graph.nodes.some((n) => n.id === conn.toId)).toBe(true);
      });
    });
  });

  // =========================================================================
  // Niezmiennik 4: 100% poszlak z leadInClueIds istnieje w graph.clues
  // =========================================================================
  describe('Niezmiennik 4: Integralnosc referencyjna poszlak w leadInClueIds', () => {
    it('zapewnia, ze 100% poszlak z leadInClueIds we wszystkich wezlach istnieje w graph.clues', () => {
      const intro = makeNode({ id: 'intro', type: 'intro' });
      const target = makeNode({ id: 'target', isBottleneck: true });
      const graph = makeGraph({ nodes: [intro, target], clues: [] });

      const result = ThreeClueRuleValidator.validateAndRepairGraph(graph);
      const clueIdSet = new Set(result.graph.clues.map((c) => c.id));

      result.graph.nodes.forEach((node) => {
        node.leadInClueIds.forEach((id) => {
          expect(clueIdSet.has(id)).toBe(true);
        });
      });
    });

    it('oczyszcza martwe/widmowe ID z leadInClueIds, ktore nie istnialy w graph.clues', () => {
      const intro = makeNode({ id: 'intro', type: 'intro' });
      const target = makeNode({
        id: 'target',
        isBottleneck: true,
        leadInClueIds: ['ghost-clue-1', 'ghost-clue-2', 'ghost-clue-3'],
      });
      // clues jest puste, wiec ghost-clue-X to martwe wskazniki
      const graph = makeGraph({ nodes: [intro, target], clues: [] });

      const result = ThreeClueRuleValidator.validateAndRepairGraph(graph);

      // Wszystkie obecne w leadInClueIds musza istniec w graph.clues
      const clueIdSet = new Set(result.graph.clues.map((c) => c.id));
      target.leadInClueIds.forEach((id) => {
        expect(clueIdSet.has(id)).toBe(true);
      });

      // Martwe poszlaki musialy zostac odfiltrowane
      expect(target.leadInClueIds).not.toContain('ghost-clue-1');
      expect(target.leadInClueIds).not.toContain('ghost-clue-2');
      expect(target.leadInClueIds).not.toContain('ghost-clue-3');

      // Nowe poszlaki musialy zostac dodane
      expect(target.leadInClueIds.length).toBeGreaterThanOrEqual(3);
    });

    it('zapewnia ze kazda poszlaka wskazuje na wlasciwy targetNodeId zgodny z wezlem', () => {
      const intro = makeNode({ id: 'intro', type: 'intro' });
      const b1 = makeNode({ id: 'b1', isBottleneck: true });
      const b2 = makeNode({ id: 'b2', isBottleneck: true });
      const graph = makeGraph({ nodes: [intro, b1, b2], clues: [] });

      const result = ThreeClueRuleValidator.validateAndRepairGraph(graph);
      const clueMap = new Map(result.graph.clues.map((c) => [c.id, c]));

      result.graph.nodes.forEach((node) => {
        node.leadInClueIds.forEach((clueId) => {
          const clue = clueMap.get(clueId);
          expect(clue).toBeDefined();
          expect(clue?.targetNodeId).toBe(node.id);
        });
      });
    });

    it('zapewnia ze 100% poszlak z leadOutClueIds istnieje w graph.clues ze zgodnym sourceNodeId', () => {
      const intro = makeNode({ id: 'intro', type: 'intro' });
      const b = makeNode({ id: 'b', isBottleneck: true });
      const graph = makeGraph({ nodes: [intro, b], clues: [] });

      const result = ThreeClueRuleValidator.validateAndRepairGraph(graph);
      const clueMap = new Map(result.graph.clues.map((c) => [c.id, c]));

      result.graph.nodes.forEach((node) => {
        node.leadOutClueIds.forEach((clueId) => {
          const clue = clueMap.get(clueId);
          expect(clue).toBeDefined();
          expect(clue?.sourceNodeId).toBe(node.id);
        });
      });
    });
  });

  // =========================================================================
  // Niezmiennik 5: Pelna idempotencja wywolan
  // =========================================================================
  describe('Niezmiennik 5: Pelna idempotencja (ponowna naprawa zwraca totalSynthesizedClues: 0 i isValid: true)', () => {
    it('wielokrotna naprawa na standardowym grafie zwraca totalSynthesizedClues: 0 i nie mutuje struktur', () => {
      const intro = makeNode({ id: 'intro', type: 'intro' });
      const bottle = makeNode({ id: 'bottle', isBottleneck: true });
      const graph = makeGraph({ nodes: [intro, bottle], clues: [] });

      // Przebieg 1
      const res1 = ThreeClueRuleValidator.validateAndRepairGraph(graph);
      expect(res1.isValid).toBe(false);
      expect(res1.totalSynthesizedClues).toBe(3);

      const cluesSnapshot1 = JSON.stringify(res1.graph.clues);
      const connsSnapshot1 = JSON.stringify(res1.graph.connections);
      const nodesSnapshot1 = JSON.stringify(res1.graph.nodes);

      // Przebieg 2
      const res2 = ThreeClueRuleValidator.validateAndRepairGraph(res1.graph);
      expect(res2.isValid).toBe(true);
      expect(res2.totalSynthesizedClues).toBe(0);

      // Przebieg 3
      const res3 = ThreeClueRuleValidator.validateAndRepairGraph(res2.graph);
      expect(res3.isValid).toBe(true);
      expect(res3.totalSynthesizedClues).toBe(0);

      // Przebieg 4
      const res4 = ThreeClueRuleValidator.validateAndRepairGraph(res3.graph);
      expect(res4.isValid).toBe(true);
      expect(res4.totalSynthesizedClues).toBe(0);

      // Stan grafu pomiedzy przebiegiem 2 a 4 jest identyczny
      expect(JSON.stringify(res4.graph.clues)).toBe(JSON.stringify(res2.graph.clues));
      expect(JSON.stringify(res4.graph.connections)).toBe(JSON.stringify(res2.graph.connections));
      expect(JSON.stringify(res4.graph.nodes)).toBe(JSON.stringify(res2.graph.nodes));
    });

    it('idempotencja w grafie z dywersyfikacja (gdy poczatkowo bylo 3 poszlaki tego samego typu)', () => {
      const intro = makeNode({ id: 'intro', type: 'intro' });
      const bottle = makeNode({ id: 'b', isBottleneck: true, leadInClueIds: ['d1', 'd2', 'd3'] });
      const d1 = makeClue({ id: 'd1', targetNodeId: 'b', sourceType: 'document' });
      const d2 = makeClue({ id: 'd2', targetNodeId: 'b', sourceType: 'document' });
      const d3 = makeClue({ id: 'd3', targetNodeId: 'b', sourceType: 'document' });
      const graph = makeGraph({ nodes: [intro, bottle], clues: [d1, d2, d3] });

      const pass1 = ThreeClueRuleValidator.validateAndRepairGraph(graph);
      expect(pass1.isValid).toBe(false);
      expect(pass1.totalSynthesizedClues).toBe(1);

      const pass2 = ThreeClueRuleValidator.validateAndRepairGraph(pass1.graph);
      expect(pass2.isValid).toBe(true);
      expect(pass2.totalSynthesizedClues).toBe(0);

      const pass3 = ThreeClueRuleValidator.validateAndRepairGraph(pass2.graph);
      expect(pass3.isValid).toBe(true);
      expect(pass3.totalSynthesizedClues).toBe(0);
    });

    it('idempotencja dla grafu 1-wezlowego (synteza prologu nie powiela wezlow prologu)', () => {
      const single = makeNode({ id: 'alone', isBottleneck: true });
      const graph = makeGraph({ nodes: [single], clues: [] });

      const pass1 = ThreeClueRuleValidator.validateAndRepairGraph(graph);
      expect(pass1.graph.nodes.length).toBe(2); // alone + node-intro-alone

      const pass2 = ThreeClueRuleValidator.validateAndRepairGraph(pass1.graph);
      expect(pass2.isValid).toBe(true);
      expect(pass2.totalSynthesizedClues).toBe(0);
      expect(pass2.graph.nodes.length).toBe(2); // liczba wezlow nie urosla!

      const pass3 = ThreeClueRuleValidator.validateAndRepairGraph(pass2.graph);
      expect(pass3.isValid).toBe(true);
      expect(pass3.totalSynthesizedClues).toBe(0);
      expect(pass3.graph.nodes.length).toBe(2);
    });
  });

  // =========================================================================
  // Fuzzing & Property-Based Random Stress Testing (100 losowych grafow)
  // =========================================================================
  describe('Fuzzing & Property-Based Random Stress Testing (100 losowych grafow)', () => {
    it('utrzymuje wszystkie 5 niezmiennikow w 100 pseudolosowych grafach o zlozonych parametrach', () => {
      const sourcePool: ClueSourceType[] = ['document', 'testimony', 'material', 'anomaly'];
      const eras: SupportedEra[] = ['classic', 'gaslight', 'noir', 'modern', 'prl'];

      for (let run = 0; run < 100; run++) {
        const nodeCount = 1 + Math.floor(Math.random() * 8); // 1 do 8 wezlow
        const nodes: AdventureNode[] = [];

        for (let i = 0; i < nodeCount; i++) {
          const isB = Math.random() < 0.4;
          const isC = Math.random() < 0.2;
          nodes.push(
            makeNode({
              id: `node-${run}-${i}`,
              name: `Node ${run}-${i}`,
              type: isC ? 'climax' : i === 0 ? 'intro' : 'location',
              isBottleneck: isB,
              isClimax: isC,
            })
          );
        }

        // Generowanie losowych poszlak
        const clueCount = Math.floor(Math.random() * 6);
        const clues: AdventureClue[] = [];

        for (let j = 0; j < clueCount; j++) {
          const randomTarget = nodes[Math.floor(Math.random() * nodes.length)];
          const randomSourceType =
            Math.random() < 0.1 ? undefined : sourcePool[Math.floor(Math.random() * sourcePool.length)];
          const isHerring = Math.random() < 0.25;

          const clue = makeClue({
            id: `clue-${run}-${j}`,
            targetNodeId: randomTarget.id,
            sourceType: randomSourceType as ClueSourceType,
            isRedHerring: isHerring,
          });
          clues.push(clue);
          randomTarget.leadInClueIds.push(clue.id);
        }

        const selectedEra = eras[run % eras.length];
        const graph = makeGraph({ nodes, clues });

        // Wykonanie naprawy
        const repaired = ThreeClueRuleValidator.validateAndRepairGraph(graph, { era: selectedEra });

        // Weryfikacja Niezmiennikow na naprawionym grafie:

        // Niezmiennik 1: Kazdy bottleneck/climax ma >= 3 poszlaki wejsciowe
        const criticalNodes = repaired.graph.nodes.filter(
          (n) => n.isBottleneck === true || n.isClimax === true || n.type === 'climax'
        );

        for (const crit of criticalNodes) {
          const incomingValid = repaired.graph.clues.filter(
            (c) => c.targetNodeId === crit.id && !c.isRedHerring
          );
          expect(incomingValid.length).toBeGreaterThanOrEqual(3);
          expect(crit.leadInClueIds.length).toBeGreaterThanOrEqual(3);
        }

        // Niezmiennik 2: Kazdy bottleneck ma >= 2 rozne sourceType
        const bottleneckNodes = repaired.graph.nodes.filter((n) => n.isBottleneck === true);
        for (const b of bottleneckNodes) {
          const incomingValid = repaired.graph.clues.filter(
            (c) => c.targetNodeId === b.id && !c.isRedHerring
          );
          const distinctSources = new Set(incomingValid.map((c) => c.sourceType));
          expect(distinctSources.size).toBeGreaterThanOrEqual(2);
        }

        // Niezmiennik 3: Zadna krawedz dodana nie jest samopetla
        repaired.graph.connections.forEach((conn) => {
          expect(conn.fromId).not.toBe(conn.toId);
        });

        // Niezmiennik 4: 100% leadInClueIds istnieje w graph.clues
        const clueIdSet = new Set(repaired.graph.clues.map((c) => c.id));
        repaired.graph.nodes.forEach((n) => {
          n.leadInClueIds.forEach((id) => {
            expect(clueIdSet.has(id)).toBe(true);
          });
        });

        // Niezmiennik 5: Idempotencja: ponowna naprawa zwraca totalSynthesizedClues: 0 i isValid: true
        const secondPass = ThreeClueRuleValidator.validateAndRepairGraph(repaired.graph, {
          era: selectedEra,
        });
        expect(secondPass.isValid).toBe(true);
        expect(secondPass.totalSynthesizedClues).toBe(0);
      }
    });
  });

  // =========================================================================
  // Niezmiennik jakosciowy: Brak znakow em-dash i en-dash
  // =========================================================================
  describe('Niezmiennik jakosciowy: Calkowity brak znakow em-dash i en-dash', () => {
    it('zapewnia brak em-dash i en-dash w calej matrycy 60 szablonow CLUE_TEMPLATES', () => {
      const eras: SupportedEra[] = ['classic', 'gaslight', 'noir', 'modern', 'prl'];
      const types: ClueSourceType[] = ['document', 'testimony', 'material', 'anomaly'];

      let count = 0;
      for (const era of eras) {
        for (const type of types) {
          const templates = CLUE_TEMPLATES[era][type];
          templates.forEach((tmpl) => {
            count++;
            expect(tmpl.name).not.toMatch(/[\u2013\u2014]/);
            expect(tmpl.descriptionPattern).not.toMatch(/[\u2013\u2014]/);
            expect(tmpl.requiredSkill).not.toMatch(/[\u2013\u2014]/);
          });
        }
      }
      expect(count).toBe(60);
    });

    it('zapewnia brak em-dash i en-dash w generowanych krawedziach polaczen i zsyntetyzowanych poszlakach dla kazdej epoki', () => {
      const eras: SupportedEra[] = ['classic', 'gaslight', 'noir', 'modern', 'prl'];

      for (const era of eras) {
        const intro = makeNode({ id: 'intro', type: 'intro' });
        const target = makeNode({ id: 'target', isBottleneck: true });
        const graph = makeGraph({ nodes: [intro, target], clues: [] });

        const result = ThreeClueRuleValidator.validateAndRepairGraph(graph, { era });

        result.graph.clues.forEach((c) => {
          expect(c.name).not.toMatch(/[\u2013\u2014]/);
          expect(c.description).not.toMatch(/[\u2013\u2014]/);
          if (c.requiredSkill) {
            expect(c.requiredSkill).not.toMatch(/[\u2013\u2014]/);
          }
        });

        result.graph.connections.forEach((conn) => {
          expect(conn.description).not.toMatch(/[\u2013\u2014]/);
        });
      }
    });
  });

  // =========================================================================
  // Test trybu inspectGraph (Read-Only Contract)
  // =========================================================================
  describe('Kontrakt inspectGraph (Tryb Scisle Read-Only)', () => {
    it('nie mutuje wejsciowego obiektu grafu, tablic ani zagniezdzonych wezlow', () => {
      const intro = makeNode({ id: 'intro', type: 'intro' });
      const bottleneck = makeNode({ id: 'bottle', isBottleneck: true, leadInClueIds: [] });
      const graph = makeGraph({ nodes: [intro, bottleneck], clues: [], connections: [] });

      const originalNodesJson = JSON.stringify(graph.nodes);
      const originalCluesJson = JSON.stringify(graph.clues);
      const originalConnsJson = JSON.stringify(graph.connections);

      const inspectResult = ThreeClueRuleValidator.inspectGraph(graph, { era: 'classic' });

      // Raport wskazuje braki
      expect(inspectResult.isValid).toBe(false);
      expect(inspectResult.checkedBottlenecks).toBe(1);
      expect(inspectResult.totalSynthesizedClues).toBe(3);
      expect(inspectResult.issues.length).toBe(1);

      // Wejsciowy graf pozostal w 100% nienaruszony
      expect(JSON.stringify(graph.nodes)).toBe(originalNodesJson);
      expect(JSON.stringify(graph.clues)).toBe(originalCluesJson);
      expect(JSON.stringify(graph.connections)).toBe(originalConnsJson);
      expect(graph.clues.length).toBe(0);
      expect(graph.connections.length).toBe(0);
      expect(bottleneck.leadInClueIds.length).toBe(0);
    });
  });

  // =========================================================================
  // Test wydajnosci i stabilnosci pod obciazeniem (Stress & Performance)
  // =========================================================================
  describe('Wydajnosc i stabilnosc pod obciazeniem', () => {
    it('naprawia duzy graf z 50 wezlami i 25 bottleneckami w czasie ponizej 150ms', () => {
      const nodes: AdventureNode[] = [makeNode({ id: 'intro-start', type: 'intro' })];
      for (let i = 1; i <= 50; i++) {
        nodes.push(
          makeNode({
            id: `large-node-${i}`,
            name: `Lokacja ${i}`,
            isBottleneck: i % 2 === 0,
            isClimax: i === 50,
          })
        );
      }
      const graph = makeGraph({ nodes, clues: [] });

      const startTime = performance.now();
      const result = ThreeClueRuleValidator.validateAndRepairGraph(graph, { era: 'noir' });
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(150);
      expect(result.checkedBottlenecks).toBe(25);
      expect(result.totalSynthesizedClues).toBe(75);
      expect(result.graph.clues.length).toBe(75);
      expect(result.graph.connections.length).toBe(75);
    });
  });
});
