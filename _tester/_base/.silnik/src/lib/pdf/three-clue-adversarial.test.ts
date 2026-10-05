/**
 * Adwersarski pakiet testowy dla ThreeClueRuleValidator (Milestone M2 Stress & Boundary Testing)
 *
 * Testowane obszary:
 * 1. Pusty graf: null, undefined, {}, zdegenerowane typy pierwotne.
 * 2. Grafy jednoelementowe: brak poprzednika, samopetle, petle dwukierunkowe.
 * 3. Grafy gigantyczne: >100 wezlow, >50 waskich gardel, test wydajnosci i unikalnosci ID.
 * 4. Grafy z cyklami: A -> B -> C -> A, duze pierscienie, odpornosc na nieskonczone petle.
 * 5. Mieszane falszywe tropy (isRedHerring: true) i poszlaki z pustymi polami.
 * 6. Obiekty zamrozone Object.freeze oraz uszkodzone typy wewnetrzne (audyt odpornosci i luki).
 * 7. Niezmiennik jakosciowy: calkowity brak znakow em-dash i en-dash (wylacznie zwykly myslnik -).
 */

import {
  ThreeClueRuleValidator,
  type ClueValidationResult,
} from './three-clue-rule-validator';
import type {
  AdventureGraph,
  AdventureNode,
  AdventureClue,
  GraphConnection,
  ClueSourceType,
} from '../types';

function createNode(overrides: Partial<AdventureNode> = {}): AdventureNode {
  return {
    id: 'node-adv-1',
    name: 'Mroczna Posiadlosc',
    type: 'location',
    description: 'Opuszczona rezydencja na wzgorzu.',
    leadInClueIds: [],
    leadOutClueIds: [],
    ...overrides,
  };
}

function createClue(overrides: Partial<AdventureClue> = {}): AdventureClue {
  return {
    id: 'clue-adv-1',
    name: 'Dziennik okultysty',
    description: 'Zapiski z rytualow.',
    sourceType: 'document',
    clueType: 'core',
    targetNodeId: 'node-adv-1',
    requiredSkill: 'Biblioteka',
    ...overrides,
  };
}

function createGraph(overrides: Partial<AdventureGraph> = {}): AdventureGraph {
  return {
    nodes: [],
    clues: [],
    connections: [],
    npcs: [],
    locations: [],
    ...overrides,
  };
}

describe('ThreeClueRuleValidator - Adwersarskie Testy Brzegowe i Obciazeniowe (Challenger M2)', () => {
  // Obszar 1: Pusty i zdegenerowany graf
  describe('Obszar 1: Pusty graf i zdegenerowane typy wejsciowe', () => {
    it('bezpiecznie obsluguje null bez rzucania wyjatku', () => {
      const res = ThreeClueRuleValidator.validateAndRepairGraph(null as any);
      expect(res.isValid).toBe(true);
      expect(res.checkedBottlenecks).toBe(0);
      expect(res.totalSynthesizedClues).toBe(0);
      expect(res.graph.nodes).toEqual([]);
    });

    it('bezpiecznie obsluguje undefined bez rzucania wyjatku', () => {
      const res = ThreeClueRuleValidator.validateAndRepairGraph(undefined as any);
      expect(res.isValid).toBe(true);
      expect(res.checkedBottlenecks).toBe(0);
      expect(res.totalSynthesizedClues).toBe(0);
    });

    it('bezpiecznie obsluguje pusty obiekt {} bez rzucania wyjatku', () => {
      const res = ThreeClueRuleValidator.validateAndRepairGraph({} as any);
      expect(res.isValid).toBe(true);
      expect(res.checkedBottlenecks).toBe(0);
      expect(res.totalSynthesizedClues).toBe(0);
      expect(res.graph.nodes).toEqual([]);
    });

    it('bezpiecznie obsluguje zdegenerowane typy pierwotne (string, number, array)', () => {
      expect(ThreeClueRuleValidator.validateAndRepairGraph('zlosliwy string' as any).isValid).toBe(true);
      expect(ThreeClueRuleValidator.validateAndRepairGraph(12345 as any).isValid).toBe(true);
      expect(ThreeClueRuleValidator.validateAndRepairGraph([] as any).isValid).toBe(true);
    });

    it('bezpiecznie ignoruje elementy null i undefined wewnatrz tablic nodes, clues, connections', () => {
      const dirtyGraph = {
        nodes: [null, undefined, createNode({ id: 'valid-node', type: 'location' })] as any,
        clues: [null, undefined] as any,
        connections: [null, undefined] as any,
      };

      const res = ThreeClueRuleValidator.validateAndRepairGraph(dirtyGraph as AdventureGraph);
      expect(res.graph.nodes.length).toBe(1);
      expect(res.graph.clues.length).toBe(0);
      expect(res.graph.connections.length).toBe(0);
    });
  });

  // Obszar 2: Grafy jednoelementowe i topologie brzegowe
  describe('Obszar 2: Grafy jednoelementowe, brak poprzednikow i samopetle', () => {
    it('poprawnie naprawia graf 1-wezlowy z waskim gardlem, syntetyzujac wezel prologu i 3 poszlaki', () => {
      const singleNode = createNode({
        id: 'climax-solo',
        name: 'Oltarz Przedwiecznych',
        type: 'climax',
        isClimax: true,
      });
      const g = createGraph({ nodes: [singleNode] });

      const res = ThreeClueRuleValidator.validateAndRepairGraph(g, { era: 'classic' });

      expect(res.checkedBottlenecks).toBe(1);
      expect(res.totalSynthesizedClues).toBe(3);
      expect(res.graph.nodes.length).toBe(2);
      expect(res.graph.nodes[0].id).toBe('node-intro-climax-solo');
      expect(res.graph.clues.length).toBe(3);

      res.graph.connections.forEach((conn) => {
        expect(conn.fromId).toBe('node-intro-climax-solo');
        expect(conn.toId).toBe('climax-solo');
      });
    });

    it('graf 1-wezlowy bez flag bottleneck/climax nie jest nadgorliwie modyfikowany', () => {
      const plainNode = createNode({
        id: 'solo-safe',
        name: 'Bezpieczna Przystan',
        type: 'location',
      });
      const g = createGraph({ nodes: [plainNode] });

      const res = ThreeClueRuleValidator.validateAndRepairGraph(g);
      expect(res.checkedBottlenecks).toBe(0);
      expect(res.totalSynthesizedClues).toBe(0);
      expect(res.graph.nodes.length).toBe(1);
    });

    it('bezpiecznie radzi sobie z samopetla (A -> A) bez zapetlenia algorytmu', () => {
      const nodeA = createNode({
        id: 'loop-node',
        name: 'Zapetlona Przestrzen',
        type: 'location',
        isBottleneck: true,
      });
      const loopConn: GraphConnection = {
        fromId: 'loop-node',
        toId: 'loop-node',
        description: 'Petla czasowa',
      };
      const g = createGraph({ nodes: [nodeA], connections: [loopConn] });

      const startTime = Date.now();
      const res = ThreeClueRuleValidator.validateAndRepairGraph(g);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(100);
      expect(res.checkedBottlenecks).toBe(1);
      expect(res.totalSynthesizedClues).toBe(3);
      expect(res.graph.clues.filter((c) => c.targetNodeId === 'loop-node').length).toBe(3);
    });

    it('bezpiecznie obsluguje 2 wezly o identycznym ID bez kolizji referencji', () => {
      const dup1 = createNode({ id: 'dup-id', name: 'Pierwszy', isBottleneck: true });
      const dup2 = createNode({ id: 'dup-id', name: 'Drugi', isBottleneck: true });
      const g = createGraph({ nodes: [dup1, dup2] });

      const res = ThreeClueRuleValidator.validateAndRepairGraph(g);
      expect(res.checkedBottlenecks).toBe(1);
      expect(res.totalSynthesizedClues).toBe(3);
    });
  });

  // Obszar 3: Grafy gigantyczne i test obciazeniowy
  describe('Obszar 3: Grafy gigantyczne (>100 wezlow, >50 waskich gardel)', () => {
    it('przetwarza graf z 150 wezlami i 60 waskimi gardlami w czasie ponizej 300 ms', () => {
      const nodeCount = 150;
      const bottleneckCount = 60;
      const nodes: AdventureNode[] = [];

      for (let i = 0; i < nodeCount; i++) {
        nodes.push(
          createNode({
            id: `scale-node-${i}`,
            name: `Punkt Badawczy ${i}`,
            type: i === nodeCount - 1 ? 'climax' : 'location',
            isBottleneck: i < bottleneckCount,
            leadInClueIds: [],
            leadOutClueIds: [],
          })
        );
      }

      const connections: GraphConnection[] = [];
      for (let i = 0; i < nodeCount - 1; i++) {
        connections.push({
          fromId: `scale-node-${i}`,
          toId: `scale-node-${i + 1}`,
          description: `Szlak dochodzenia ${i}`,
        });
      }

      const hugeGraph = createGraph({ nodes, connections });

      const startTime = Date.now();
      const res = ThreeClueRuleValidator.validateAndRepairGraph(hugeGraph, { era: 'classic' });
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(300);
      expect(res.checkedBottlenecks).toBe(61);
      expect(res.totalSynthesizedClues).toBe(183);
      expect(res.graph.clues.length).toBe(183);

      const clueIds = res.graph.clues.map((c) => c.id);
      const uniqueClueIds = new Set(clueIds);
      expect(uniqueClueIds.size).toBe(clueIds.length);

      for (let i = 0; i < bottleneckCount; i++) {
        const targetId = `scale-node-${i}`;
        const inClues = res.graph.clues.filter((c) => c.targetNodeId === targetId);
        expect(inClues.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('gwarantuje pelna spojnosc referencyjna w gigantycznym grafie bez wiszacych wskaznikow', () => {
      const nodes: AdventureNode[] = [];
      for (let i = 0; i < 50; i++) {
        nodes.push(
          createNode({
            id: `ref-node-${i}`,
            name: `Komora ${i}`,
            isBottleneck: i % 2 === 0,
            type: i === 49 ? 'climax' : 'location',
          })
        );
      }
      const g = createGraph({ nodes });

      const res = ThreeClueRuleValidator.validateAndRepairGraph(g);
      const validClueIds = new Set(res.graph.clues.map((c) => c.id));
      const validNodeIds = new Set(res.graph.nodes.map((n) => n.id));

      res.graph.nodes.forEach((node) => {
        node.leadInClueIds.forEach((id) => {
          expect(validClueIds.has(id)).toBe(true);
        });
        node.leadOutClueIds.forEach((id) => {
          expect(validClueIds.has(id)).toBe(true);
        });
      });

      res.graph.connections.forEach((conn) => {
        expect(validNodeIds.has(conn.fromId)).toBe(true);
        expect(validNodeIds.has(conn.toId)).toBe(true);
        if (conn.clueId) {
          expect(validClueIds.has(conn.clueId)).toBe(true);
        }
      });
    });
  });

  // Obszar 4: Grafy z cyklami
  describe('Obszar 4: Grafy z cyklami i odpornosc na nieskonczone petle', () => {
    it('nie zawiesza sie przy cyklu wielowezlowym A -> B -> C -> D -> A', () => {
      const nodeA = createNode({ id: 'cyc-A', name: 'Wezel A', isBottleneck: true });
      const nodeB = createNode({ id: 'cyc-B', name: 'Wezel B', isBottleneck: true });
      const nodeC = createNode({ id: 'cyc-C', name: 'Wezel C', isBottleneck: true });
      const nodeD = createNode({ id: 'cyc-D', name: 'Wezel D', isBottleneck: true });

      const connections: GraphConnection[] = [
        { fromId: 'cyc-A', toId: 'cyc-B', description: 'A do B' },
        { fromId: 'cyc-B', toId: 'cyc-C', description: 'B do C' },
        { fromId: 'cyc-C', toId: 'cyc-D', description: 'C do D' },
        { fromId: 'cyc-D', toId: 'cyc-A', description: 'D do A' },
      ];

      const cyclicGraph = createGraph({
        nodes: [nodeA, nodeB, nodeC, nodeD],
        connections,
      });

      const startTime = Date.now();
      const res = ThreeClueRuleValidator.validateAndRepairGraph(cyclicGraph);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(50);
      expect(res.checkedBottlenecks).toBe(4);
      expect(res.totalSynthesizedClues).toBe(12);
    });

    it('jest w pelni idempotentny na grafie cyklicznym (drugie wywolanie zwraca 0 nowych poszlak)', () => {
      const nodeA = createNode({ id: 'cyc-1', isBottleneck: true });
      const nodeB = createNode({ id: 'cyc-2', isBottleneck: true });
      const connections: GraphConnection[] = [
        { fromId: 'cyc-1', toId: 'cyc-2', description: '1 do 2' },
        { fromId: 'cyc-2', toId: 'cyc-1', description: '2 do 1' },
      ];
      const g = createGraph({ nodes: [nodeA, nodeB], connections });

      const pass1 = ThreeClueRuleValidator.validateAndRepairGraph(g);
      expect(pass1.isValid).toBe(false);
      expect(pass1.totalSynthesizedClues).toBe(6);

      const pass2 = ThreeClueRuleValidator.validateAndRepairGraph(pass1.graph);
      expect(pass2.isValid).toBe(true);
      expect(pass2.totalSynthesizedClues).toBe(0);
      expect(pass2.graph.clues.length).toBe(6);
    });
  });

  // Obszar 5: Mieszane falszywe tropy i poszlaki z pustymi polami
  describe('Obszar 5: Falszywe tropy (isRedHerring: true) i poszlaki z pustymi polami', () => {
    it('wymusza 3 nowe poszlaki core, gdy waskie gardlo posiada 3 poszlaki, ale wszystkie sa falszywymi tropami', () => {
      const start = createNode({ id: 'start', type: 'intro' });
      const bottleneck = createNode({ id: 'bottle', isBottleneck: true });

      const redHerrings: AdventureClue[] = [
        createClue({ id: 'rh-1', targetNodeId: 'bottle', isRedHerring: true, sourceType: 'document' }),
        createClue({ id: 'rh-2', targetNodeId: 'bottle', isRedHerring: true, sourceType: 'material' }),
        createClue({ id: 'rh-3', targetNodeId: 'bottle', isRedHerring: true, sourceType: 'testimony' }),
      ];

      const g = createGraph({
        nodes: [start, bottleneck],
        clues: redHerrings,
      });

      const res = ThreeClueRuleValidator.validateAndRepairGraph(g, { era: 'classic' });

      expect(res.totalSynthesizedClues).toBe(3);
      expect(res.graph.clues.length).toBe(6);
      const validClues = res.graph.clues.filter((c) => c.targetNodeId === 'bottle' && !c.isRedHerring);
      expect(validClues.length).toBe(3);
    });

    it('poprawnie uzupelnia poszlaki gdy czesc to falszywe tropy a czesc to wazne poszlaki', () => {
      const start = createNode({ id: 'start', type: 'intro' });
      const target = createNode({ id: 'target', isBottleneck: true });

      const clues: AdventureClue[] = [
        createClue({ id: 'c-real', targetNodeId: 'target', sourceType: 'document' }),
        createClue({ id: 'c-fake', targetNodeId: 'target', isRedHerring: true }),
      ];

      const g = createGraph({ nodes: [start, target], clues });
      const res = ThreeClueRuleValidator.validateAndRepairGraph(g);

      expect(res.totalSynthesizedClues).toBe(2);
      const validClues = res.graph.clues.filter((c) => c.targetNodeId === 'target' && !c.isRedHerring);
      expect(validClues.length).toBe(3);
    });

    it('bezpiecznie wnioskuje sourceType przy poszlakach z pustymi stringami w name i description', () => {
      const start = createNode({ id: 'start', type: 'intro' });
      const target = createNode({ id: 'target', isBottleneck: true });

      const emptyClue = createClue({
        id: 'empty-text-clue',
        name: '',
        description: '',
        sourceType: undefined as any,
        targetNodeId: 'target',
      });

      const g = createGraph({ nodes: [start, target], clues: [emptyClue] });
      const res = ThreeClueRuleValidator.validateAndRepairGraph(g);

      expect(emptyClue.sourceType).toBe('material');
      expect(res.totalSynthesizedClues).toBe(2);
    });

    it('bezpiecznie obsluguje nieznany string jako sourceType bez wywrocenia algorytmu', () => {
      const start = createNode({ id: 'start', type: 'intro' });
      const target = createNode({ id: 'target', isBottleneck: true });

      const weirdClue = createClue({
        id: 'weird-clue',
        sourceType: 'kosmiczny-przekaz' as any,
        targetNodeId: 'target',
      });

      const g = createGraph({ nodes: [start, target], clues: [weirdClue] });
      const res = ThreeClueRuleValidator.validateAndRepairGraph(g);

      expect(res.totalSynthesizedClues).toBe(2);
    });
  });

  // Obszar 6: Obiekty zamrozone Object.freeze i uszkodzone typy wewnetrzne (Audyt i wykrywanie podatnosci)
  describe('Obszar 6: Obiekty zamrozone Object.freeze i uszkodzone typy wewnetrzne', () => {
    it('metoda inspectGraph bezpiecznie obsluguje calkowicie zamrozony graf Object.freeze', () => {
      const frozenNode = Object.freeze(
        createNode({
          id: 'frozen-climax',
          type: 'climax',
          isClimax: true,
          leadInClueIds: Object.freeze([]) as any,
          leadOutClueIds: Object.freeze([]) as any,
        })
      );
      const frozenClue = Object.freeze(
        createClue({
          id: 'frozen-clue',
          targetNodeId: 'frozen-climax',
        })
      );
      const frozenGraph = Object.freeze({
        nodes: Object.freeze([frozenNode]) as any,
        clues: Object.freeze([frozenClue]) as any,
        connections: Object.freeze([]) as any,
        npcs: Object.freeze([]) as any,
        locations: Object.freeze([]) as any,
      });

      expect(() => {
        const res = ThreeClueRuleValidator.inspectGraph(frozenGraph);
        expect(res.isValid).toBe(false);
        expect(res.checkedBottlenecks).toBe(1);
        expect(res.totalSynthesizedClues).toBe(2);
      }).not.toThrow();
    });

    it('odpornosc na Object.freeze: validateAndRepairGraph bezpiecznie obsluguje zamrozony pusty obiekt Object.freeze', () => {
      const frozenEmpty = Object.freeze({ nodes: [], clues: [], connections: [] });

      expect(() => {
        const res = ThreeClueRuleValidator.validateAndRepairGraph(frozenEmpty as any);
        expect(res.isValid).toBe(true);
        expect(res.checkedBottlenecks).toBe(0);
        expect(res.totalSynthesizedClues).toBe(0);
        expect(res.graph).toBeDefined();
        expect(Array.isArray(res.graph.nodes)).toBe(true);
      }).not.toThrow();
    });

    it('odpornosc na Object.freeze: validateAndRepairGraph bezpiecznie obsluguje zamrozony wezel Object.freeze', () => {
      const frozenNode = Object.freeze(createNode({ id: 'frozen-node', isBottleneck: true }));
      const g = createGraph({ nodes: [frozenNode] });

      expect(() => {
        const res = ThreeClueRuleValidator.validateAndRepairGraph(g);
        expect(res.checkedBottlenecks).toBe(1);
        expect(res.totalSynthesizedClues).toBe(3);
        expect(res.graph).toBeDefined();
        expect(res.graph.nodes.length).toBeGreaterThanOrEqual(1);
      }).not.toThrow();
    });

    it('bezpieczenstwo identyfikatora: validateAndRepairGraph bezpiecznie obsluguje wezel nieposiadajacy pola id', () => {
      const corruptNode = {
        name: 'Wazna lokacja bez identyfikatora',
        type: 'climax',
        isBottleneck: true,
      } as any;
      const g = createGraph({ nodes: [corruptNode] });

      expect(() => {
        const res = ThreeClueRuleValidator.validateAndRepairGraph(g as any);
        expect(res.checkedBottlenecks).toBe(1);
        expect(res.totalSynthesizedClues).toBe(3);
        expect(res.graph.nodes.every((n) => typeof n.id === 'string' && n.id.length > 0)).toBe(true);
      }).not.toThrow();
    });

    it('bezpieczenstwo identyfikatora: validateAndRepairGraph bezpiecznie obsluguje id wezla bedace liczba zamiast stringa', () => {
      const numericNode = {
        id: 999 as any,
        name: 'Lokacja z numerycznym ID',
        type: 'climax',
        isBottleneck: true,
      };
      const g = createGraph({ nodes: [numericNode as any] });

      expect(() => {
        const res = ThreeClueRuleValidator.validateAndRepairGraph(g as any);
        expect(res.checkedBottlenecks).toBe(1);
        expect(res.totalSynthesizedClues).toBe(3);
        expect(res.graph.nodes.every((n) => typeof n.id === 'string' && n.id.length > 0)).toBe(true);
      }).not.toThrow();
    });

    it('ochrona przed wstrzykiwaniem undefined: poszlaka posiadajaca sourceNodeId ale bez id nie zanieczyszcza leadOutClueIds ani leadInClueIds', () => {
      const start = createNode({ id: 'start', type: 'intro', leadInClueIds: [], leadOutClueIds: [] });
      const target = createNode({ id: 'target', type: 'climax', isBottleneck: true, leadInClueIds: [], leadOutClueIds: [] });
      const brokenClue = {
        name: 'Uszkodzona poszlaka bez id',
        sourceNodeId: 'start',
      } as any;

      const g = createGraph({ nodes: [start, target], clues: [brokenClue] });
      const res = ThreeClueRuleValidator.validateAndRepairGraph(g as any);

      expect(res.graph.nodes[0].leadOutClueIds).not.toContain(undefined);
      expect(res.graph.nodes[0].leadOutClueIds).not.toContain(null);
      expect(res.graph.nodes[0].leadOutClueIds).not.toContain('');
      expect(res.graph.nodes[0].leadOutClueIds.every((id: any) => typeof id === 'string' && id.length > 0)).toBe(true);
      expect(res.graph.nodes[1].leadInClueIds.every((id: any) => typeof id === 'string' && id.length > 0)).toBe(true);
    });
  });

  // Obszar 7: Niezmiennik jakosciowy - Calkowity brak znakow em-dash i en-dash
  describe('Obszar 7: Niezmiennik jakosciowy - Calkowity brak znakow em-dash i en-dash', () => {
    it('wszystkie zsyntetyzowane poszlaki i polaczenia w 5 epokach uzywaja wylacznie znaku myslnika -', () => {
      const eras: Array<'classic' | 'gaslight' | 'noir' | 'modern' | 'prl'> = [
        'classic',
        'gaslight',
        'noir',
        'modern',
        'prl',
      ];

      for (const era of eras) {
        const intro = createNode({ id: 'intro', type: 'intro' });
        const climax = createNode({ id: 'climax', type: 'climax', isClimax: true });
        const g = createGraph({ nodes: [intro, climax] });

        const res = ThreeClueRuleValidator.validateAndRepairGraph(g, { era });

        res.graph.clues.forEach((clue) => {
          expect(clue.name).not.toMatch(/[\u2013\u2014]/);
          expect(clue.description).not.toMatch(/[\u2013\u2014]/);
          if (clue.requiredSkill) {
            expect(clue.requiredSkill).not.toMatch(/[\u2013\u2014]/);
          }
        });

        res.graph.connections.forEach((conn) => {
          expect(conn.description).not.toMatch(/[\u2013\u2014]/);
        });
      }
    });
  });
});
