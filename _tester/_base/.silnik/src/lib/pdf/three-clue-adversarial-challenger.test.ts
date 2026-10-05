import {
  buildLocalCustomAdventures,
  buildAdventureGraph,
  extractCoreRulebookScenarios,
  extractPulpRulebookScenarios,
} from './adventure-local-builder';
import { detectRulebookProfile } from './rulebook-fingerprint';
import {
  validateAndEnforceThreeClueRule,
  ThreeClueRuleValidator,
} from './three-clue-rule-validator';
import type { OverlayDescriptor } from './semantic-overlay-engine';
import type {
  AdventureGraph,
  AdventureNode,
  AdventureClue,
  GraphConnection,
  ClueSourceType,
} from '@/lib/types';

describe('Adversarial Graph Invariant & Referential Integrity Challenger (M3.2)', () => {
  const dummyOverlay: OverlayDescriptor = {
    id: 'overlay-test-challenger',
    title: 'Adversarial Test Overlay',
    fileName: 'test.pdf',
    profile: 'one_shot',
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    tags: ['NPC', 'CZARY'],
    features: {
      hasCombatRules: false,
      hasSanityRules: false,
      hasChaseRules: false,
      hasMagicRules: true,
      hasCreatures: false,
      hasSpells: true,
      hasHandouts: true,
      hasScenarios: true,
    },
    stats: {
      npcCount: 2,
      creatureCount: 0,
      spellCount: 1,
      ruleCount: 0,
      handoutCount: 2,
      adventureCount: 1,
    },
    entities: {
      npcs: [
        { id: 'npc-1', name: 'Jan Kowalski', role: 'Świadek' },
        { id: 'npc-2', name: 'Dr Maria Nowak', role: 'Lekarka' },
      ],
      creatures: [],
      spells: [{ id: 'spell-1', name: 'Znak Starszych Bogów', description: 'Rytuał ochronny', magicCost: '10 PO' }],
      rules: [],
      handouts: [
        { id: 'h-1', title: 'Stary pamiętnik', content: 'Zapiski z 1925 roku' },
        { id: 'h-2', title: 'Telegram z Arkham', content: 'Ostrzeżenie przed sektą' },
      ],
      adventures: [
        {
          id: 'adv-1',
          title: 'Główna przygoda',
          type: 'one_shot',
          synopsis: 'Zarys dochodzenia',
          nodes: [{ id: 'node-1', title: 'Dwór Corbitta', description: 'Stary dom', type: 'location' as const }],
        },
      ],
    },
  };

  // 1. Helper to extract all scenarios
  function getAllTestScenarios() {
    const coreToc = `
      Zew Cthulhu Księga Strażnika. Edycja polska.
      ROZDZIAŁ 15.1 - SCENARIUSZE
      POŚRÓD PRADAWNYCH DRZEW 394
      ROZDZIAŁ 15.2 - SCENARIUSZE
      SZKARŁATNE LITERY 414
    `;
    const fpCore = detectRulebookProfile(coreToc, 'ZewCthulhu_KsiegaStraznika_v.1.3.pdf');
    const coreAdvs = buildLocalCustomAdventures(coreToc, fpCore, dummyOverlay, 'ZewCthulhu_KsiegaStraznika_v.1.3.pdf', 484);

    const pulpToc = `
      PULP CTHULHU - Two-Fisted Action And Adventure Against The Mythos.
      CHAPTER 10: THE DISINTEGRATOR, SCENARIO 135
      CHAPTER 11: WAITING FOR THE HURRICANE, SCENARIO 158
      CHAPTER 12: PANDORA’S BOX, SCENARIO 176
      CHAPTER 13: SLOW BOAT TO CHINA, SCENARIO 205
    `;
    const fpPulp = detectRulebookProfile(pulpToc, 'Call_of_Cthulhu_Pulp_Cthulhu.pdf');
    const pulpAdvs = buildLocalCustomAdventures(pulpToc, fpPulp, dummyOverlay, 'Call_of_Cthulhu_Pulp_Cthulhu.pdf', 274);

    const anthologyToc = `
      SPIS TREŚCI
      ROZDZIAŁ 1 WSTĘP 5
      ROZDZIAŁ 2 KRÓL ZIMY 12
      Scenariusz osadzony w Poznaniu w latach 20.
      ROZDZIAŁ 3 KROPLA KRWI 35
      Mroczna sprawa w Gorcach.
    `;
    const fpAnthology = detectRulebookProfile(anthologyToc, 'Horror_nad_Warta.pdf');
    const anthologyAdvs = buildLocalCustomAdventures(anthologyToc, fpAnthology, dummyOverlay, 'Horror_nad_Warta.pdf', 160);

    return {
      coreAdvs,
      pulpAdvs,
      anthologyAdvs,
      allAdvs: [...coreAdvs, ...pulpAdvs, ...anthologyAdvs],
    };
  }

  describe('Challenge Dimension 1: Referential Integrity of Clues and Nodes', () => {
    it('every leadInClueId in AdventureNode must point to an existing AdventureClue.id', () => {
      const { allAdvs } = getAllTestScenarios();
      expect(allAdvs.length).toBeGreaterThanOrEqual(8);

      for (const adv of allAdvs) {
        const graph = adv.graph!;
        expect(graph).toBeDefined();
        expect(Array.isArray(graph.nodes)).toBe(true);

        const clueIds = new Set(graph.clues.map((c) => c.id));

        for (const node of graph.nodes!) {
          expect(Array.isArray(node.leadInClueIds)).toBe(true);
          for (const leadInId of node.leadInClueIds) {
            expect(clueIds.has(leadInId)).toBe(true);
          }
        }
      }
    });

    it('every leadOutClueId in AdventureNode must point to an existing AdventureClue.id', () => {
      const { allAdvs } = getAllTestScenarios();

      for (const adv of allAdvs) {
        const graph = adv.graph!;
        const clueIds = new Set(graph.clues.map((c) => c.id));

        for (const node of graph.nodes!) {
          expect(Array.isArray(node.leadOutClueIds)).toBe(true);
          for (const leadOutId of node.leadOutClueIds) {
            expect(clueIds.has(leadOutId)).toBe(true);
          }
        }
      }
    });

    it('every targetNodeId in AdventureClue must point to an existing AdventureNode.id', () => {
      const { allAdvs } = getAllTestScenarios();

      for (const adv of allAdvs) {
        const graph = adv.graph!;
        const nodeIds = new Set(graph.nodes!.map((n) => n.id));

        for (const clue of graph.clues) {
          if (clue.targetNodeId) {
            expect(nodeIds.has(clue.targetNodeId)).toBe(true);
          }
        }
      }
    });

    it('every sourceNodeId in AdventureClue (if present) must point to an existing AdventureNode.id', () => {
      const { allAdvs } = getAllTestScenarios();

      for (const adv of allAdvs) {
        const graph = adv.graph!;
        const nodeIds = new Set(graph.nodes!.map((n) => n.id));

        for (const clue of graph.clues) {
          if (clue.sourceNodeId) {
            expect(nodeIds.has(clue.sourceNodeId)).toBe(true);
          }
        }
      }
    });

    it('referential two-way sync: targetNode.leadInClueIds matches clue.targetNodeId', () => {
      const { allAdvs } = getAllTestScenarios();

      for (const adv of allAdvs) {
        const graph = adv.graph!;
        const nodeMap = new Map(graph.nodes!.map((n) => [n.id, n]));

        for (const clue of graph.clues) {
          if (clue.targetNodeId) {
            const targetNode = nodeMap.get(clue.targetNodeId);
            expect(targetNode).toBeDefined();
            expect(targetNode!.leadInClueIds).toContain(clue.id);
          }
        }
      }
    });
  });

  describe('Challenge Dimension 2: GraphConnection Topological Integrity', () => {
    it('empirically inspects all connections and validates endpoints', () => {
      const { allAdvs } = getAllTestScenarios();

      for (const adv of allAdvs) {
        const graph = adv.graph!;
        const nodeIds = new Set(graph.nodes!.map((n) => n.id));
        const npcIds = new Set((graph.npcs || []).map((n) => n.id));
        const locIds = new Set((graph.locations || []).map((l) => l.id));
        const clueIds = new Set(graph.clues.map((c) => c.id));

        for (const conn of graph.connections) {
          expect(typeof conn.fromId).toBe('string');
          expect(conn.fromId.length).toBeGreaterThan(0);
          expect(typeof conn.toId).toBe('string');
          expect(conn.toId.length).toBeGreaterThan(0);

          // Connection must not be a self-loop
          expect(conn.fromId).not.toBe(conn.toId);

          // If connection has clueId, it must exist in graph.clues
          if (conn.clueId) {
            expect(clueIds.has(conn.clueId)).toBe(true);
            // And fromId/toId must be valid node IDs in graph.nodes
            expect(nodeIds.has(conn.fromId)).toBe(true);
            expect(nodeIds.has(conn.toId)).toBe(true);
          } else {
            // Legacy entity connection (NPC to location) or Node-to-Node connection
            const isFromValid = nodeIds.has(conn.fromId) || npcIds.has(conn.fromId) || locIds.has(conn.fromId);
            const isToValid = nodeIds.has(conn.toId) || npcIds.has(conn.toId) || locIds.has(conn.toId);
            expect(isFromValid).toBe(true);
            expect(isToValid).toBe(true);
          }
        }
      }
    });

    it('verifies that clue-carrying connections strictly connect sourceNode to targetNode', () => {
      const { allAdvs } = getAllTestScenarios();

      for (const adv of allAdvs) {
        const graph = adv.graph!;
        const clueMap = new Map(graph.clues.map((c) => [c.id, c]));

        for (const conn of graph.connections) {
          if (conn.clueId) {
            const clue = clueMap.get(conn.clueId);
            expect(clue).toBeDefined();
            expect(conn.toId).toBe(clue!.targetNodeId);
            if (clue!.sourceNodeId) {
              expect(conn.fromId).toBe(clue!.sourceNodeId);
            }
          }
        }
      }
    });
  });

  describe('Challenge Dimension 3: Three Clue Rule RAW on Bottlenecks and Climax Nodes', () => {
    it('verifies >=3 distinct clues and >=2 distinct sourceTypes on ALL bottlenecks and climax nodes across Core Rulebook scenarios', () => {
      const { coreAdvs } = getAllTestScenarios();
      expect(coreAdvs).toHaveLength(2); // "Pośród pradawnych drzew" & "Szkarłatne litery"

      for (const adv of coreAdvs) {
        const graph = adv.graph!;
        const criticalNodes = graph.nodes!.filter(
          (n) => n.isBottleneck || n.isClimax || n.type === 'climax'
        );
        expect(criticalNodes.length).toBeGreaterThanOrEqual(1);

        for (const node of criticalNodes) {
          // Empirical count of incoming non-red-herring clues
          const incomingClues = graph.clues.filter((c) => {
            const isTargetMatch = c.targetNodeId === node.id;
            const isLeadInMatch = node.leadInClueIds.includes(c.id);
            const isConnMatch = graph.connections.some(
              (conn) => conn.toId === node.id && conn.clueId === c.id
            );
            return (isTargetMatch || isLeadInMatch || isConnMatch) && !c.isRedHerring;
          });

          // Invariant 1: minimum 3 distinct incoming clues
          expect(incomingClues.length).toBeGreaterThanOrEqual(3);

          // Unique clue IDs
          const uniqueIncomingIds = new Set(incomingClues.map((c) => c.id));
          expect(uniqueIncomingIds.size).toBeGreaterThanOrEqual(3);

          // Invariant 2: source diversity (>=2 distinct source types)
          const sourceTypes = new Set<ClueSourceType>(
            incomingClues.map((c) => c.sourceType).filter(Boolean) as ClueSourceType[]
          );
          expect(sourceTypes.size).toBeGreaterThanOrEqual(2);
        }
      }
    });

    it('verifies >=3 distinct clues and >=2 distinct sourceTypes on ALL bottlenecks and climax nodes across 4 Pulp Cthulhu scenarios', () => {
      const { pulpAdvs } = getAllTestScenarios();
      expect(pulpAdvs).toHaveLength(4);

      const expectedPulpTitles = [
        'The Disintegrator',
        'Waiting for the Hurricane',
        'Pandora’s Box',
        'Slow Boat to China',
      ];

      for (let i = 0; i < pulpAdvs.length; i++) {
        const adv = pulpAdvs[i];
        const graph = adv.graph!;
        const criticalNodes = graph.nodes!.filter(
          (n) => n.isBottleneck || n.isClimax || n.type === 'climax'
        );
        expect(criticalNodes.length).toBeGreaterThanOrEqual(1);

        for (const node of criticalNodes) {
          const incomingClues = graph.clues.filter((c) => {
            const isTargetMatch = c.targetNodeId === node.id;
            const isLeadInMatch = node.leadInClueIds.includes(c.id);
            const isConnMatch = graph.connections.some(
              (conn) => conn.toId === node.id && conn.clueId === c.id
            );
            return (isTargetMatch || isLeadInMatch || isConnMatch) && !c.isRedHerring;
          });

          expect(incomingClues.length).toBeGreaterThanOrEqual(3);
          const uniqueIncomingIds = new Set(incomingClues.map((c) => c.id));
          expect(uniqueIncomingIds.size).toBeGreaterThanOrEqual(3);

          const sourceTypes = new Set<ClueSourceType>(
            incomingClues.map((c) => c.sourceType).filter(Boolean) as ClueSourceType[]
          );
          expect(sourceTypes.size).toBeGreaterThanOrEqual(2);
        }
      }
    });

    it('adversarially tests red-herrings: false leads are excluded from 3-clue count', () => {
      const sampleGraph: AdventureGraph = {
        nodes: [
          { id: 'node-intro', name: 'Intro', type: 'intro', description: 'Wprowadzenie', leadInClueIds: [], leadOutClueIds: [] },
          { id: 'node-climax', name: 'Climax', type: 'climax', description: 'Kulminacja', isClimax: true, isBottleneck: true, leadInClueIds: ['clue-rh-1', 'clue-rh-2'], leadOutClueIds: [] },
        ],
        clues: [
          { id: 'clue-rh-1', name: 'Fałszywy ślad 1', description: 'Błędny trop', isRedHerring: true, targetNodeId: 'node-climax', sourceType: 'document' },
          { id: 'clue-rh-2', name: 'Fałszywy ślad 2', description: 'Mistyfikacja', isRedHerring: true, targetNodeId: 'node-climax', sourceType: 'testimony' },
        ],
        connections: [],
        npcs: [],
        locations: [],
      };

      const result = validateAndEnforceThreeClueRule(sampleGraph, 'classic', 'Arkham');
      expect(result.isValid).toBe(false);
      expect(result.totalSynthesizedClues).toBe(3); // None of the 2 red herrings count!

      const climax = result.graph.nodes.find((n) => n.id === 'node-climax')!;
      const realClues = result.graph.clues.filter((c) => c.targetNodeId === 'node-climax' && !c.isRedHerring);
      expect(realClues.length).toBe(3);
    });
  });

  describe('Challenge Dimension 4: Validator Idempotency & Repeat Execution', () => {
    it('running validateAndEnforceThreeClueRule twice on Core scenarios produces zero synthesized clues and identical structure', () => {
      const { coreAdvs } = getAllTestScenarios();

      for (const adv of coreAdvs) {
        const graphPass1 = adv.graph!;
        const snap1 = JSON.parse(JSON.stringify(graphPass1));

        // Pass 2 on already validated graph
        const result2 = validateAndEnforceThreeClueRule(graphPass1, adv.era, adv.location);

        expect(result2.isValid).toBe(true);
        expect(result2.totalSynthesizedClues).toBe(0);
        expect(result2.issues).toHaveLength(0);

        // Verification: no clue duplication
        expect(result2.graph.clues.length).toBe(snap1.clues.length);
        expect(result2.graph.nodes.length).toBe(snap1.nodes.length);
        expect(result2.graph.connections.length).toBe(snap1.connections.length);

        // Pass 3 check
        const result3 = validateAndEnforceThreeClueRule(result2.graph, adv.era, adv.location);
        expect(result3.isValid).toBe(true);
        expect(result3.totalSynthesizedClues).toBe(0);
        expect(result3.graph.clues.length).toBe(snap1.clues.length);
      }
    });

    it('running validateAndEnforceThreeClueRule twice on Pulp Cthulhu scenarios produces zero new clues and identical connections', () => {
      const { pulpAdvs } = getAllTestScenarios();

      for (const adv of pulpAdvs) {
        const graphPass1 = adv.graph!;
        const clueCount1 = graphPass1.clues.length;
        const connCount1 = graphPass1.connections.length;
        const nodeCount1 = graphPass1.nodes!.length;

        const result2 = validateAndEnforceThreeClueRule(graphPass1, adv.era, adv.location);

        expect(result2.isValid).toBe(true);
        expect(result2.totalSynthesizedClues).toBe(0);
        expect(result2.graph.clues.length).toBe(clueCount1);
        expect(result2.graph.connections.length).toBe(connCount1);
        expect(result2.graph.nodes.length).toBe(nodeCount1);

        // Verify leadInClueIds did not duplicate
        for (const node of result2.graph.nodes) {
          const uniqueLeadIn = new Set(node.leadInClueIds);
          expect(node.leadInClueIds.length).toBe(uniqueLeadIn.size);
          const uniqueLeadOut = new Set(node.leadOutClueIds);
          expect(node.leadOutClueIds.length).toBe(uniqueLeadOut.size);
        }
      }
    });

    it('test idempotency under inspectGraph (read-only verification)', () => {
      const { allAdvs } = getAllTestScenarios();

      for (const adv of allAdvs) {
        const originalGraph = adv.graph!;
        const originalSerialized = JSON.stringify(originalGraph);

        const inspectResult = ThreeClueRuleValidator.inspectGraph(originalGraph, adv.era, adv.location);
        expect(inspectResult.isValid).toBe(true);
        expect(inspectResult.totalSynthesizedClues).toBe(0);

        // Original graph must be completely unmodified
        expect(JSON.stringify(originalGraph)).toBe(originalSerialized);
      }
    });
  });

  describe('Challenge Dimension 5: Adversarial Stress, Edge Topologies & Mutation Harness', () => {
    it('handles single-node graph without throwing and synthesizes intro node with valid connections', () => {
      const singleNodeGraph: AdventureGraph = {
        nodes: [
          {
            id: 'node-solo',
            name: 'Samotny Ołtarz',
            type: 'climax',
            description: 'Ołtarz kultystów',
            isClimax: true,
            isBottleneck: true,
            leadInClueIds: [],
            leadOutClueIds: [],
          },
        ],
        clues: [],
        connections: [],
        npcs: [],
        locations: [],
      };

      const result = validateAndEnforceThreeClueRule(singleNodeGraph, 'noir', 'Chicago');
      expect(result.isValid).toBe(false);
      expect(result.totalSynthesizedClues).toBe(3);
      expect(result.graph.nodes.length).toBe(2); // Synthesized intro node

      const introNode = result.graph.nodes.find((n) => n.id === 'node-intro-node-solo')!;
      expect(introNode).toBeDefined();
      expect(introNode.leadOutClueIds.length).toBe(3);

      const targetNode = result.graph.nodes.find((n) => n.id === 'node-solo')!;
      expect(targetNode.leadInClueIds.length).toBe(3);

      // Verify connections
      expect(result.graph.connections.length).toBe(3);
      for (const conn of result.graph.connections) {
        expect(conn.fromId).toBe(introNode.id);
        expect(conn.toId).toBe(targetNode.id);
        expect(conn.fromId).not.toBe(conn.toId);
      }

      // 2nd pass idempotency
      const secondPass = validateAndEnforceThreeClueRule(result.graph, 'noir', 'Chicago');
      expect(secondPass.isValid).toBe(true);
      expect(secondPass.totalSynthesizedClues).toBe(0);
      expect(secondPass.graph.nodes.length).toBe(2);
      expect(secondPass.graph.clues.length).toBe(3);
      expect(secondPass.graph.connections.length).toBe(3);
    });

    it('cleans up dangling / ghost clue IDs from leadInClueIds and restores true referential integrity', () => {
      const corruptGraph: AdventureGraph = {
        nodes: [
          {
            id: 'node-intro',
            name: 'Intro',
            type: 'intro',
            description: 'Wprowadzenie',
            leadInClueIds: ['ghost-dead-pointer-1'],
            leadOutClueIds: ['ghost-dead-pointer-2'],
          },
          {
            id: 'node-boss',
            name: 'Boss',
            type: 'climax',
            description: 'Starcie z bossem',
            isClimax: true,
            isBottleneck: true,
            leadInClueIds: ['ghost-nonexistent-1', 'ghost-nonexistent-2'],
            leadOutClueIds: [],
          },
        ],
        clues: [],
        connections: [],
        npcs: [],
        locations: [],
      };

      const result = validateAndEnforceThreeClueRule(corruptGraph, 'gaslight', 'London');
      expect(result.totalSynthesizedClues).toBe(3);

      const clueIds = new Set(result.graph.clues.map((c) => c.id));
      for (const node of result.graph.nodes) {
        for (const cId of node.leadInClueIds) {
          expect(clueIds.has(cId)).toBe(true);
          expect(cId.startsWith('ghost-')).toBe(false);
        }
        for (const cId of node.leadOutClueIds) {
          expect(clueIds.has(cId)).toBe(true);
          expect(cId.startsWith('ghost-')).toBe(false);
        }
      }
    });

    it('handles frozen graph objects (Object.freeze) gracefully without throwing', () => {
      const frozenGraph = Object.freeze({
        nodes: [
          Object.freeze({
            id: 'node-frozen-1',
            name: 'Start',
            type: 'intro',
            description: 'Start',
            leadInClueIds: Object.freeze([]) as unknown as string[],
            leadOutClueIds: Object.freeze([]) as unknown as string[],
          }),
          Object.freeze({
            id: 'node-frozen-2',
            name: 'Finał',
            type: 'climax',
            description: 'Finał',
            isClimax: true,
            isBottleneck: true,
            leadInClueIds: Object.freeze([]) as unknown as string[],
            leadOutClueIds: Object.freeze([]) as unknown as string[],
          }),
        ],
        clues: Object.freeze([]) as unknown as AdventureClue[],
        connections: Object.freeze([]) as unknown as GraphConnection[],
        npcs: Object.freeze([]),
        locations: Object.freeze([]),
      }) as unknown as AdventureGraph;

      expect(() => {
        const result = validateAndEnforceThreeClueRule(frozenGraph, 'modern', 'Berlin');
        expect(result.totalSynthesizedClues).toBe(3);
        expect(result.graph.clues.length).toBe(3);
      }).not.toThrow();
    });

    it('handles cyclic node chains (A -> B -> C -> A) and correctly repairs bottleneck', () => {
      const cyclicGraph: AdventureGraph = {
        nodes: [
          { id: 'node-a', name: 'Node A', type: 'location', description: 'Lokacja A', leadInClueIds: [], leadOutClueIds: [] },
          { id: 'node-b', name: 'Node B', type: 'location', description: 'Lokacja B', leadInClueIds: [], leadOutClueIds: [] },
          { id: 'node-c', name: 'Node C', type: 'climax', description: 'Lokacja C', isClimax: true, isBottleneck: true, leadInClueIds: [], leadOutClueIds: [] },
        ],
        clues: [],
        connections: [
          { fromId: 'node-a', toId: 'node-b', description: 'A to B' },
          { fromId: 'node-b', toId: 'node-c', description: 'B to C' },
          { fromId: 'node-c', toId: 'node-a', description: 'C to A' },
        ],
        npcs: [],
        locations: [],
      };

      const result = validateAndEnforceThreeClueRule(cyclicGraph, 'prl', 'Warszawa');
      expect(result.totalSynthesizedClues).toBe(3);

      const targetC = result.graph.nodes.find((n) => n.id === 'node-c')!;
      expect(targetC.leadInClueIds.length).toBe(3);

      // Verify no self-loops were introduced
      for (const conn of result.graph.connections) {
        expect(conn.fromId).not.toBe(conn.toId);
      }
    });

    it('preserves dual-layer compatibility (npcs & locations) alongside full Alexandrian node graph', () => {
      const { allAdvs } = getAllTestScenarios();

      for (const adv of allAdvs) {
        const graph = adv.graph!;
        expect(Array.isArray(graph.npcs)).toBe(true);
        expect(Array.isArray(graph.locations)).toBe(true);
        expect(Array.isArray(graph.nodes)).toBe(true);
        expect(Array.isArray(graph.clues)).toBe(true);
        expect(Array.isArray(graph.connections)).toBe(true);

        expect(graph.npcs.length).toBeGreaterThanOrEqual(1);
        expect(graph.locations.length).toBeGreaterThanOrEqual(1);
        expect(graph.nodes!.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('empirically tests English Keeper Rulebook scenario extraction and graph invariants', () => {
      const coreEnToc = `
        Call of Cthulhu Keeper Rulebook 7th Edition
        CHAPTER 15.1: AMIDST THE ANCIENT TREES, PAGE 340
        CHAPTER 15.2: CRIMSON LETTERS, PAGE 364
      `;
      const fpEn = detectRulebookProfile(coreEnToc, 'Call_of_Cthulhu_7th_Ed_Keeper_Rulebook.pdf');
      const enAdvs = buildLocalCustomAdventures(coreEnToc, fpEn, dummyOverlay, 'Call_of_Cthulhu_7th_Ed_Keeper_Rulebook.pdf', 448);

      expect(enAdvs).toHaveLength(2);
      expect(enAdvs[0].title).toBe('Amidst the Ancient Trees');
      expect(enAdvs[1].title).toBe('Crimson Letters');

      for (const adv of enAdvs) {
        const graph = adv.graph!;
        expect(graph.nodes).toBeDefined();
        expect(graph.nodes!.length).toBeGreaterThanOrEqual(3);

        const bottlenecks = graph.nodes!.filter((n) => n.isBottleneck || n.isClimax || n.type === 'climax');
        expect(bottlenecks.length).toBeGreaterThanOrEqual(1);

        for (const bn of bottlenecks) {
          const leadInClues = graph.clues.filter((c) => {
            const isTargetMatch = c.targetNodeId === bn.id;
            const isLeadInMatch = bn.leadInClueIds.includes(c.id);
            const isConnMatch = graph.connections.some(
              (conn) => conn.toId === bn.id && conn.clueId === c.id
            );
            return (isTargetMatch || isLeadInMatch || isConnMatch) && !c.isRedHerring;
          });
          expect(leadInClues.length).toBeGreaterThanOrEqual(3);
          const sources = new Set(leadInClues.map((c) => c.sourceType).filter(Boolean));
          expect(sources.size).toBeGreaterThanOrEqual(2);
        }
      }
    });

    it('10-cycle idempotence stress test on a complex multi-node graph', () => {
      const complexGraph: AdventureGraph = {
        nodes: [
          { id: 'node-start', name: 'Start', type: 'intro', description: 'Start', leadInClueIds: [], leadOutClueIds: [] },
          { id: 'node-mid1', name: 'Site 1', type: 'location', description: 'Site 1', isBottleneck: true, leadInClueIds: [], leadOutClueIds: [] },
          { id: 'node-mid2', name: 'Site 2', type: 'location', description: 'Site 2', isBottleneck: true, leadInClueIds: [], leadOutClueIds: [] },
          { id: 'node-end', name: 'Climax', type: 'climax', description: 'Climax', isClimax: true, isBottleneck: true, leadInClueIds: [], leadOutClueIds: [] },
        ],
        clues: [],
        connections: [],
        npcs: [],
        locations: [],
      };

      let currentResult = validateAndEnforceThreeClueRule(complexGraph, 'classic', 'Boston');
      expect(currentResult.isValid).toBe(false);
      expect(currentResult.totalSynthesizedClues).toBe(9); // 3 bottlenecks x 3 clues

      const snapshotAfterPass1 = JSON.parse(JSON.stringify(currentResult.graph));

      for (let cycle = 2; cycle <= 10; cycle++) {
        currentResult = validateAndEnforceThreeClueRule(currentResult.graph, 'classic', 'Boston');
        expect(currentResult.isValid).toBe(true);
        expect(currentResult.totalSynthesizedClues).toBe(0);
        expect(currentResult.graph.clues.length).toBe(snapshotAfterPass1.clues.length);
        expect(currentResult.graph.connections.length).toBe(snapshotAfterPass1.connections.length);
        expect(currentResult.graph.nodes.length).toBe(snapshotAfterPass1.nodes.length);
      }
    });

    it('sequential bottleneck pipeline with 4 consecutive bottleneck nodes', () => {
      const pipelineGraph: AdventureGraph = {
        nodes: [
          { id: 'node-0', name: 'Stage 0 Intro', type: 'intro', description: 'Intro', leadInClueIds: [], leadOutClueIds: [] },
          { id: 'node-1', name: 'Stage 1 Gate', type: 'location', description: 'Gate 1', isBottleneck: true, leadInClueIds: [], leadOutClueIds: [] },
          { id: 'node-2', name: 'Stage 2 Gate', type: 'location', description: 'Gate 2', isBottleneck: true, leadInClueIds: [], leadOutClueIds: [] },
          { id: 'node-3', name: 'Stage 3 Gate', type: 'location', description: 'Gate 3', isBottleneck: true, leadInClueIds: [], leadOutClueIds: [] },
          { id: 'node-4', name: 'Stage 4 Final Gate', type: 'climax', description: 'Final Gate', isClimax: true, isBottleneck: true, leadInClueIds: [], leadOutClueIds: [] },
        ],
        clues: [],
        connections: [],
        npcs: [],
        locations: [],
      };

      const result = validateAndEnforceThreeClueRule(pipelineGraph, 'noir', 'New York');
      expect(result.totalSynthesizedClues).toBe(12); // 4 bottleneck stages x 3 clues

      for (let i = 1; i <= 4; i++) {
        const node = result.graph.nodes.find((n) => n.id === `node-${i}`)!;
        expect(node).toBeDefined();
        expect(node.leadInClueIds.length).toBe(3);

        const cluesLeadingIn = result.graph.clues.filter((c) => c.targetNodeId === node.id);
        expect(cluesLeadingIn.length).toBe(3);
        const types = new Set(cluesLeadingIn.map((c) => c.sourceType));
        expect(types.size).toBeGreaterThanOrEqual(2);
      }

      // Check referential integrity across all clues and connections
      const clueIds = new Set(result.graph.clues.map((c) => c.id));
      for (const node of result.graph.nodes) {
        for (const cid of node.leadInClueIds) expect(clueIds.has(cid)).toBe(true);
        for (const cid of node.leadOutClueIds) expect(clueIds.has(cid)).toBe(true);
      }
      for (const conn of result.graph.connections) {
        expect(conn.fromId).not.toBe(conn.toId);
        if (conn.clueId) expect(clueIds.has(conn.clueId)).toBe(true);
      }
    });

    it('50-iteration random fuzzing harness testing edge cases and structural robustness', () => {
      const eras: Array<'classic' | 'gaslight' | 'noir' | 'modern' | 'prl'> = [
        'classic',
        'gaslight',
        'noir',
        'modern',
        'prl',
      ];
      const sourceTypes: ClueSourceType[] = ['material', 'testimony', 'document', 'anomaly'];

      for (let iter = 0; iter < 50; iter++) {
        const nodeCount = 2 + (iter % 8);
        const nodes: AdventureNode[] = [];
        for (let n = 0; n < nodeCount; n++) {
          nodes.push({
            id: `fuzz-node-${iter}-${n}`,
            name: `Fuzz Node ${iter}-${n}`,
            type: n === 0 ? 'intro' : n === nodeCount - 1 ? 'climax' : 'location',
            description: `Fuzz Node description ${iter}-${n}`,
            leadInClueIds: [],
            leadOutClueIds: [],
            isBottleneck: n % 2 === 1,
            isClimax: n === nodeCount - 1,
          });
        }

        const initialClueCount = iter % 4;
        const clues: AdventureClue[] = [];
        for (let c = 0; c < initialClueCount; c++) {
          const target = nodes[1 + (c % (nodeCount - 1))];
          const st = sourceTypes[c % sourceTypes.length];
          const clueId = `fuzz-clue-${iter}-${c}`;
          clues.push({
            id: clueId,
            name: `Clue ${clueId}`,
            description: `Desc ${clueId}`,
            targetNodeId: target.id,
            sourceType: st,
            clueType: 'core',
          });
          target.leadInClueIds.push(clueId);
        }

        const graph: AdventureGraph = {
          nodes,
          clues,
          connections: [],
          npcs: [],
          locations: [],
        };

        const era = eras[iter % eras.length];
        const res = validateAndEnforceThreeClueRule(graph, era, 'Fuzz Location');

        expect(res.graph.nodes.length).toBeGreaterThanOrEqual(nodeCount);

        // Verify referential integrity
        const clueIds = new Set(res.graph.clues.map((clue) => clue.id));
        for (const node of res.graph.nodes) {
          for (const cid of node.leadInClueIds) {
            expect(clueIds.has(cid)).toBe(true);
          }
          for (const cid of node.leadOutClueIds) {
            expect(clueIds.has(cid)).toBe(true);
          }
        }

        // Verify all connections connect valid nodes and avoid self-loops
        const nodeIds = new Set(res.graph.nodes.map((n) => n.id));
        for (const conn of res.graph.connections) {
          expect(nodeIds.has(conn.fromId)).toBe(true);
          expect(nodeIds.has(conn.toId)).toBe(true);
          expect(conn.fromId).not.toBe(conn.toId);
          if (conn.clueId) {
            expect(clueIds.has(conn.clueId)).toBe(true);
          }
        }

        // Verify idempotency
        const secondPass = validateAndEnforceThreeClueRule(res.graph, era, 'Fuzz Location');
        expect(secondPass.isValid).toBe(true);
        expect(secondPass.totalSynthesizedClues).toBe(0);
        expect(secondPass.graph.clues.length).toBe(res.graph.clues.length);
        expect(secondPass.graph.connections.length).toBe(res.graph.connections.length);
      }
    });
  });
});
