/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Pakiet testow jednostkowych i adwersarskich dla ThreeClueRuleValidator (Milestone M2)
 *
 * Scenariusze:
 * 1. Graf w pelni poprawny (Three Clue Rule spelniona) -> 0 poszlak syntetyzowanych, isValid: true.
 * 2. Graf z waskim gardlem posiadajacym 0 poszlak -> synteza 3 poszlak o 3 roznych sourceType, poprawne GraphConnection.
 * 3. Graf z 1 lub 2 poszlakami tego samego typu -> synteza uzupelniajaca brakujace typy poszlak.
 * 4. Punkt kulminacyjny bez oznaczonych poszlak -> poprawna detekcja i naprawa (zarowno type: 'climax' jak i fallback).
 * 5. Rozne epoki ('classic', 'gaslight', 'modern', 'noir', 'prl') -> weryfikacja diegetycznych opisow i umiejetnosci.
 * 6. Idempotencja -> ponowne uruchomienie zwraca totalSynthesizedClues: 0 i isValid: true.
 * 7. Integralnosc topologiczna -> brak wiszacych ID w leadInClueIds / leadOutClueIds / connections.
 * 8. Przypadki adwersarskie -> pusty graf, graf 1-wezlowy, cykle, zdegenerowane dane wejsciowe.
 * 9. Niezmiennik jakosciowy -> zero znakow em-dash i en-dash w generowanych polach tekstowych.
 */

import {
  ThreeClueRuleValidator,
  type ClueValidationResult,
  type ClueValidationIssue,
} from './three-clue-rule-validator';
import type {
  AdventureGraph,
  AdventureNode,
  AdventureClue,
  GraphConnection,
  AdventureNodeType,
  ClueSourceType,
  ClueType,
} from '@/lib/types';

// Pomocnicze fabryki struktur testowych (Fixtures & Factories)

function createMockNode(overrides: Partial<AdventureNode> = {}): AdventureNode {
  return {
    id: 'node-test-1',
    name: 'Dom Corbitta',
    type: 'location',
    description: 'Nawiedzona posiadlosc w centrum Bostonu.',
    leadInClueIds: [],
    leadOutClueIds: [],
    ...overrides,
  };
}

function createMockClue(overrides: Partial<AdventureClue> = {}): AdventureClue {
  return {
    id: 'clue-test-1',
    name: 'Wycinek z Boston Globe',
    description: 'Artykul prasowy opisujacy tragedie rodziny Macario.',
    sourceType: 'document',
    clueType: 'core',
    targetNodeId: 'node-test-1',
    requiredSkill: 'Korzystanie z Bibliotek',
    ...overrides,
  };
}

function createMockGraph(overrides: Partial<AdventureGraph> = {}): AdventureGraph {
  return {
    nodes: [],
    clues: [],
    connections: [],
    npcs: [],
    locations: [],
    ...overrides,
  };
}

describe('ThreeClueRuleValidator (Alexandrian Canon & Three Clue Rule RAW)', () => {
  // Scenariusz 1: Graf w pelni poprawny
  describe('Scenariusz 1: Graf w pelni poprawny (brak brakow poszlak)', () => {
    it('zwraca isValid: true i 0 syntetyzowanych poszlak, gdy wezel bottleneck ma >= 3 poszlaki z roznych zrodel', () => {
      const startNode = createMockNode({
        id: 'node-intro',
        name: 'Biuro Detektywistyczne',
        type: 'intro',
        leadOutClueIds: ['clue-doc', 'clue-testimony', 'clue-material'],
      });

      const bottleneckNode = createMockNode({
        id: 'node-vault',
        name: 'Krypta Kultu',
        type: 'location',
        isBottleneck: true,
        leadInClueIds: ['clue-doc', 'clue-testimony', 'clue-material'],
      });

      const clue1 = createMockClue({
        id: 'clue-doc',
        name: 'List biskupa',
        sourceType: 'document',
        targetNodeId: 'node-vault',
        sourceNodeId: 'node-intro',
      });

      const clue2 = createMockClue({
        id: 'clue-testimony',
        name: 'Zeznanie grabarza',
        sourceType: 'testimony',
        targetNodeId: 'node-vault',
        sourceNodeId: 'node-intro',
        requiredSkill: 'Psychologia',
      });

      const clue3 = createMockClue({
        id: 'clue-material',
        name: 'Zgubiony klucz cmentarny',
        sourceType: 'material',
        targetNodeId: 'node-vault',
        sourceNodeId: 'node-intro',
        requiredSkill: 'Spostrzegawczosc',
      });

      const connections: GraphConnection[] = [
        { fromId: 'node-intro', toId: 'node-vault', description: 'Trop z listu', clueId: 'clue-doc' },
        { fromId: 'node-intro', toId: 'node-vault', description: 'Wskazowka grabarza', clueId: 'clue-testimony' },
        { fromId: 'node-intro', toId: 'node-vault', description: 'Dopasowanie klucza', clueId: 'clue-material' },
      ];

      const graph = createMockGraph({
        nodes: [startNode, bottleneckNode],
        clues: [clue1, clue2, clue3],
        connections,
      });

      const result = ThreeClueRuleValidator.validateAndRepairGraph(graph, {
        era: 'classic',
        yearRange: '1920s',
      });

      expect(result.isValid).toBe(true);
      expect(result.totalSynthesizedClues).toBe(0);
      expect(result.checkedBottlenecks).toBe(1);
      expect(result.issues).toBeDefined();
      expect(result.issues?.length).toBe(0);
      expect(result.graph.clues.length).toBe(3);
      expect(result.graph.connections.length).toBe(3);
    });

    it('nie modyfikuje grafu ani poszlak, gdy wezel posiada 4 poszlaki ze zroznicowanymi zrodlami', () => {
      const intro = createMockNode({ id: 'node-1', type: 'intro' });
      const climax = createMockNode({ id: 'node-climax', type: 'climax', isClimax: true });

      const clues: AdventureClue[] = [
        createMockClue({ id: 'c1', sourceType: 'document', targetNodeId: 'node-climax' }),
        createMockClue({ id: 'c2', sourceType: 'testimony', targetNodeId: 'node-climax' }),
        createMockClue({ id: 'c3', sourceType: 'material', targetNodeId: 'node-climax' }),
        createMockClue({ id: 'c4', sourceType: 'anomaly', targetNodeId: 'node-climax' }),
      ];

      climax.leadInClueIds = clues.map((c) => c.id);
      intro.leadOutClueIds = clues.map((c) => c.id);

      const graph = createMockGraph({
        nodes: [intro, climax],
        clues,
      });

      const result = ThreeClueRuleValidator.validateAndRepairGraph(graph);
      expect(result.isValid).toBe(true);
      expect(result.totalSynthesizedClues).toBe(0);
      expect(result.graph.clues.length).toBe(4);
    });
  });

  // Scenariusz 2: Graf z waskim gardlem posiadajacym 0 poszlak
  describe('Scenariusz 2: Graf z waskim gardlem posiadajacym 0 poszlak', () => {
    it('syntetyzuje dokladnie 3 poszlaki o 3 roznych typach sourceType i tworzy prawidlowe krawedzie GraphConnection', () => {
      const startNode = createMockNode({
        id: 'node-start',
        name: 'Archiwum Miejskie',
        type: 'intro',
        leadOutClueIds: [],
      });

      const bottleneckNode = createMockNode({
        id: 'node-sanctum',
        name: 'Ukryte Sanktuarium',
        type: 'location',
        isBottleneck: true,
        leadInClueIds: [],
      });

      const graph = createMockGraph({
        nodes: [startNode, bottleneckNode],
        clues: [],
        connections: [],
      });

      const result = ThreeClueRuleValidator.validateAndRepairGraph(graph, {
        era: 'classic',
        yearRange: '1925',
      });

      expect(result.checkedBottlenecks).toBe(1);
      expect(result.totalSynthesizedClues).toBe(3);
      expect(result.isValid).toBe(false); // Pierwotny graf posiadal braki

      // Weryfikacja dodanych poszlak
      expect(result.graph.clues.length).toBe(3);
      const synthClues = result.graph.clues.filter((c) => c.targetNodeId === 'node-sanctum');
      expect(synthClues.length).toBe(3);

      synthClues.forEach((c) => {
        expect(c.isSynthesized).toBe(true);
        expect(c.clueType).toBe('core');
        expect(c.targetNodeId).toBe('node-sanctum');
        expect(c.sourceNodeId).toBe('node-start');
        expect(c.name).toBeTruthy();
        expect(c.description).toBeTruthy();
        expect(c.requiredSkill).toBeTruthy();
      });

      // Weryfikacja dywersyfikacji zrodel (3 rozne typy ze zbioru: material, testimony, document, anomaly)
      const sourceTypes = new Set(synthClues.map((c) => c.sourceType));
      expect(sourceTypes.size).toBe(3);

      // Weryfikacja aktualizacji list leadInClueIds i leadOutClueIds
      const updatedBottleneck = result.graph.nodes.find((n) => n.id === 'node-sanctum');
      expect(updatedBottleneck?.leadInClueIds.length).toBe(3);
      synthClues.forEach((c) => {
        expect(updatedBottleneck?.leadInClueIds).toContain(c.id);
      });

      const updatedStart = result.graph.nodes.find((n) => n.id === 'node-start');
      expect(updatedStart?.leadOutClueIds.length).toBe(3);
      synthClues.forEach((c) => {
        expect(updatedStart?.leadOutClueIds).toContain(c.id);
      });

      // Weryfikacja dodania krawedzi w connections
      expect(result.graph.connections.length).toBe(3);
      result.graph.connections.forEach((conn) => {
        expect(conn.fromId).toBe('node-start');
        expect(conn.toId).toBe('node-sanctum');
        expect(conn.clueId).toBeDefined();
        expect(synthClues.map((c) => c.id)).toContain(conn.clueId);
      });
    });
  });

  // Scenariusz 3: Graf z 1 lub 2 poszlakami tego samego typu
  describe('Scenariusz 3: Graf z niepelna liczba poszlak i brakiem dywersyfikacji zrodel', () => {
    it('uzupelnia 2 brakujace poszlaki o odmienne typy, gdy wezel posiada 1 poszlake typu document', () => {
      const sourceNode = createMockNode({ id: 'node-start', type: 'intro' });
      const bottleneck = createMockNode({
        id: 'node-target',
        name: 'Opuszczona Fabryka',
        type: 'location',
        isBottleneck: true,
        leadInClueIds: ['clue-doc-existing'],
      });

      const existingClue = createMockClue({
        id: 'clue-doc-existing',
        name: 'Stara faktura za chemikalia',
        sourceType: 'document',
        targetNodeId: 'node-target',
        sourceNodeId: 'node-start',
      });

      const graph = createMockGraph({
        nodes: [sourceNode, bottleneck],
        clues: [existingClue],
        connections: [
          { fromId: 'node-start', toId: 'node-target', description: 'Faktura', clueId: 'clue-doc-existing' },
        ],
      });

      const result = ThreeClueRuleValidator.validateAndRepairGraph(graph, { era: 'classic' });

      expect(result.totalSynthesizedClues).toBe(2);
      expect(result.graph.clues.length).toBe(3);

      const allLeadIn = result.graph.clues.filter((c) => c.targetNodeId === 'node-target');
      expect(allLeadIn.length).toBe(3);

      const newlyAdded = allLeadIn.filter((c) => c.id !== 'clue-doc-existing');
      expect(newlyAdded.length).toBe(2);

      // Nowo zsyntetyzowane poszlaki nie powinny duplikowac istniejacego typu 'document'
      newlyAdded.forEach((c) => {
        expect(c.sourceType).not.toBe('document');
      });

      // Wszystkie 3 poszlaki musza miec unikalne typy zrodel
      const types = new Set(allLeadIn.map((c) => c.sourceType));
      expect(types.size).toBe(3);
    });

    it('syntetyzuje 1 brakujaca poszlake o innym typie, gdy wezel posiada 2 poszlaki OBYDWIE typu testimony', () => {
      const sourceNode = createMockNode({ id: 'node-start', type: 'intro' });
      const bottleneck = createMockNode({
        id: 'node-ritual',
        name: 'Polana w Lesie',
        isBottleneck: true,
        leadInClueIds: ['t1', 't2'],
      });

      const t1 = createMockClue({
        id: 't1',
        name: 'Relacja drwala',
        sourceType: 'testimony',
        targetNodeId: 'node-ritual',
      });
      const t2 = createMockClue({
        id: 't2',
        name: 'Plotka w karczmie',
        sourceType: 'testimony',
        targetNodeId: 'node-ritual',
      });

      const graph = createMockGraph({
        nodes: [sourceNode, bottleneck],
        clues: [t1, t2],
      });

      const result = ThreeClueRuleValidator.validateAndRepairGraph(graph, { era: 'classic' });

      expect(result.totalSynthesizedClues).toBe(1);
      expect(result.graph.clues.length).toBe(3);

      const synthesized = result.graph.clues.find((c) => c.isSynthesized);
      expect(synthesized).toBeDefined();
      expect(synthesized?.sourceType).not.toBe('testimony');

      const allLeadIn = result.graph.clues.filter((c) => c.targetNodeId === 'node-ritual');
      const uniqueTypes = new Set(allLeadIn.map((c) => c.sourceType));
      expect(uniqueTypes.size).toBe(2); // testimony + nowy typ
    });

    it('syntetyzuje 1 poszlake o 3. unikalnym typie, gdy wezel posiada 2 poszlaki o roznych typach (document, material)', () => {
      const sourceNode = createMockNode({ id: 'node-start', type: 'intro' });
      const bottleneck = createMockNode({
        id: 'node-cave',
        name: 'Jaskinia Przemytnikow',
        isBottleneck: true,
        leadInClueIds: ['c-doc', 'c-mat'],
      });

      const cDoc = createMockClue({
        id: 'c-doc',
        sourceType: 'document',
        targetNodeId: 'node-cave',
      });
      const cMat = createMockClue({
        id: 'c-mat',
        sourceType: 'material',
        targetNodeId: 'node-cave',
      });

      const graph = createMockGraph({
        nodes: [sourceNode, bottleneck],
        clues: [cDoc, cMat],
      });

      const result = ThreeClueRuleValidator.validateAndRepairGraph(graph, { era: 'classic' });

      expect(result.totalSynthesizedClues).toBe(1);
      const synth = result.graph.clues.find((c) => c.isSynthesized);
      expect(synth).toBeDefined();
      expect(['testimony', 'anomaly']).toContain(synth?.sourceType);

      const allClues = result.graph.clues.filter((c) => c.targetNodeId === 'node-cave');
      const uniqueTypes = new Set(allClues.map((c) => c.sourceType));
      expect(uniqueTypes.size).toBe(3);
    });
  });

  // Scenariusz 4: Punkt kulminacyjny bez oznaczonych poszlak i heurystyka fallback
  describe('Scenariusz 4: Punkt kulminacyjny bez oznaczonych poszlak', () => {
    it('poprawnie wykrywa i naprawia wezel oznaczony wylacznie przez type: climax lub isClimax: true', () => {
      const intro = createMockNode({ id: 'node-intro', type: 'intro' });
      const climaxNode = createMockNode({
        id: 'node-final-ritual',
        name: 'Okrutny Rytual na Szczycie',
        type: 'climax',
        isClimax: true,
        isBottleneck: false, // Brak jawnej flagi isBottleneck
        leadInClueIds: [],
      });

      const graph = createMockGraph({
        nodes: [intro, climaxNode],
        clues: [],
      });

      const result = ThreeClueRuleValidator.validateAndRepairGraph(graph, { era: 'classic' });

      expect(result.checkedBottlenecks).toBe(1);
      expect(result.totalSynthesizedClues).toBe(3);
      expect(result.graph.clues.filter((c) => c.targetNodeId === 'node-final-ritual').length).toBe(3);
    });

    it('stosuje heurystyke awaryjna (fallback): jesli zaden wezel nie jest oznaczony jako bottleneck ani climax, oznacza ostatni wezel', () => {
      const nodeA = createMockNode({ id: 'n1', name: 'Prolog', type: 'intro' });
      const nodeB = createMockNode({ id: 'n2', name: 'Sledztwo', type: 'location' });
      const nodeC = createMockNode({ id: 'n3', name: 'Konfrontacja w Latarni', type: 'location' });
      // Zaden wezel nie ma isBottleneck ani isClimax ani type === 'climax'

      const graph = createMockGraph({
        nodes: [nodeA, nodeB, nodeC],
        clues: [],
      });

      const result = ThreeClueRuleValidator.validateAndRepairGraph(graph, { era: 'classic' });

      expect(result.checkedBottlenecks).toBe(1);
      expect(result.totalSynthesizedClues).toBe(3);

      const lastNode = result.graph.nodes.find((n) => n.id === 'n3');
      expect(lastNode?.isClimax).toBe(true);
      expect(lastNode?.leadInClueIds.length).toBe(3);
      expect(result.graph.clues.filter((c) => c.targetNodeId === 'n3').length).toBe(3);
    });
  });

  // Scenariusz 5: Rozne epoki CoC (Classic, Gaslight, Modern, Noir, PRL)
  describe('Scenariusz 5: Rozne epoki CoC - diegetycznosc opisow i umiejetnosci', () => {
    it('generuje poszlaki z terminologia lat 20. i umiejetnoscia Korzystanie z Bibliotek dla epoki classic', () => {
      const intro = createMockNode({ id: 'n-start', type: 'intro' });
      const target = createMockNode({ id: 'n-target', name: 'Posiadlosc Arkham', isBottleneck: true });

      const graph = createMockGraph({ nodes: [intro, target] });

      const result = ThreeClueRuleValidator.validateAndRepairGraph(
        graph,
        { era: 'classic', yearRange: '1920-1929' },
        { location: 'Arkham', country: 'USA' }
      );

      const docClue = result.graph.clues.find((c) => c.sourceType === 'document');
      expect(docClue).toBeDefined();
      expect(docClue?.requiredSkill).toMatch(/Bibliotek|Historia/i);
      expect(docClue?.description.toLowerCase()).toMatch(/bilet|rachunek|archiwum|wycinek|rejestr/i);
    });

    it('generuje poszlaki wiktoriaskie i unika wspolczesnej terminologii dla epoki gaslight (1890s)', () => {
      const intro = createMockNode({ id: 'n-start', type: 'intro' });
      const target = createMockNode({ id: 'n-target', name: 'Zaulek Whitechapel', isBottleneck: true });

      const graph = createMockGraph({ nodes: [intro, target] });

      const result = ThreeClueRuleValidator.validateAndRepairGraph(
        graph,
        { era: 'gaslight', yearRange: '1890s' },
        { location: 'Londyn', country: 'Anglia' }
      );

      const synthClues = result.graph.clues;
      synthClues.forEach((c) => {
        // Zakaz slow wspolczesnych w epoce gaslight
        expect(c.name.toLowerCase()).not.toMatch(/komputer|smartfon|gps|cyfrow|telefon komorkowy/i);
        expect(c.description.toLowerCase()).not.toMatch(/komputer|smartfon|gps|cyfrow|telefon komorkowy/i);
        expect(c.requiredSkill?.toLowerCase()).not.toMatch(/komputery/i);
      });

      const docClue = synthClues.find((c) => c.sourceType === 'document');
      expect(docClue?.description.toLowerCase()).toMatch(/parafi|rejestr|zapis|karta|ksieg/i);
    });

    it('generuje poszlaki technologiczne z umiejetnoscia Komputery dla epoki modern', () => {
      const intro = createMockNode({ id: 'n-start', type: 'intro' });
      const target = createMockNode({ id: 'n-target', name: 'Serwerownia Korporacji', isBottleneck: true });

      const graph = createMockGraph({ nodes: [intro, target] });

      const result = ThreeClueRuleValidator.validateAndRepairGraph(
        graph,
        { era: 'modern', yearRange: '1990-2026' },
        { location: 'Nowy Jork', country: 'USA' }
      );

      const docClue = result.graph.clues.find((c) => c.sourceType === 'document');
      expect(docClue).toBeDefined();
      expect(docClue?.requiredSkill).toMatch(/Komputery|Elektronika|Szukanie/i);
      expect(docClue?.description.toLowerCase()).toMatch(/cyfrow|rejestr|polaczen|baza|plik/i);
    });

    it('generuje wlasciwe umiejetnosci badawcze CoC dla wszystkich 4 typow zrodel', () => {
      const intro = createMockNode({ id: 'n1', type: 'intro' });
      const target = createMockNode({ id: 'n2', isBottleneck: true });

      const graph = createMockGraph({ nodes: [intro, target] });
      const result = ThreeClueRuleValidator.validateAndRepairGraph(graph, { era: 'classic' });

      result.graph.clues.forEach((clue) => {
        switch (clue.sourceType) {
          case 'document':
            expect(clue.requiredSkill).toMatch(/Bibliotek|Historia|Prawo/i);
            break;
          case 'testimony':
            expect(clue.requiredSkill).toMatch(/Perswazja|Psychologia|Urok|Zastraszanie/i);
            break;
          case 'material':
            expect(clue.requiredSkill).toMatch(/Spostrzegawczosc|Szukanie|Medycyna|Przyrodnicze/i);
            break;
          case 'anomaly':
            expect(clue.requiredSkill).toMatch(/Okultyzm|Mity Cthulhu|Nauki/i);
            break;
        }
      });
    });
  });

  // Scenariusz 6: Idempotencja i stabilnosc grafu
  describe('Scenariusz 6: Idempotencja (ponowne uruchomienie na naprawionym grafie)', () => {
    it('zwraca totalSynthesizedClues: 0 i isValid: true po ponownym uruchomieniu na uprzednio naprawionym grafie', () => {
      const intro = createMockNode({ id: 'node-start', type: 'intro' });
      const bottleneck = createMockNode({ id: 'node-bottleneck', isBottleneck: true });

      const graph = createMockGraph({
        nodes: [intro, bottleneck],
        clues: [],
        connections: [],
      });

      // Przebieg 1: wykrycie i naprawa
      const pass1 = ThreeClueRuleValidator.validateAndRepairGraph(graph, { era: 'classic' });
      expect(pass1.isValid).toBe(false);
      expect(pass1.totalSynthesizedClues).toBe(3);
      expect(pass1.graph.clues.length).toBe(3);
      expect(pass1.graph.connections.length).toBe(3);

      const clueIdsPass1 = pass1.graph.clues.map((c) => c.id);
      const connCountPass1 = pass1.graph.connections.length;

      // Przebieg 2: weryfikacja idempotencji
      const pass2 = ThreeClueRuleValidator.validateAndRepairGraph(pass1.graph, { era: 'classic' });
      expect(pass2.isValid).toBe(true);
      expect(pass2.totalSynthesizedClues).toBe(0);
      expect(pass2.checkedBottlenecks).toBe(1);
      expect(pass2.issues?.length).toBe(0);
      expect(pass2.graph.clues.length).toBe(3);
      expect(pass2.graph.connections.length).toBe(connCountPass1);

      // Wszystkie ID poszlak pozostaja bez zmian
      const clueIdsPass2 = pass2.graph.clues.map((c) => c.id);
      expect(clueIdsPass2).toEqual(clueIdsPass1);

      // Przebieg 3: potrojna weryfikacja
      const pass3 = ThreeClueRuleValidator.validateAndRepairGraph(pass2.graph, { era: 'classic' });
      expect(pass3.isValid).toBe(true);
      expect(pass3.totalSynthesizedClues).toBe(0);
      expect(pass3.graph.clues.length).toBe(3);
    });
  });

  // Scenariusz 7: Spojnosc topologiczna i brak wiszacych referencji
  describe('Scenariusz 7: Spojnosc topologiczna grafu (brak dead pointers)', () => {
    it('zapewnia scisla spojnosc referencyjna: kazde ID w leadInClueIds i leadOutClueIds odpowiada istniejacej poszlace', () => {
      const nodeA = createMockNode({ id: 'node-a', type: 'intro' });
      const nodeB = createMockNode({ id: 'node-b', isBottleneck: true });

      const graph = createMockGraph({ nodes: [nodeA, nodeB] });

      const result = ThreeClueRuleValidator.validateAndRepairGraph(graph, { era: 'classic' });
      const repairedGraph = result.graph;

      // 1. Kazde ID w leadInClueIds wezlow musi istniec w graph.clues z wlasciwym targetNodeId
      repairedGraph.nodes.forEach((node) => {
        node.leadInClueIds.forEach((clueId) => {
          const matchingClue = repairedGraph.clues.find((c) => c.id === clueId);
          expect(matchingClue).toBeDefined();
          expect(matchingClue?.targetNodeId).toBe(node.id);
        });
      });

      // 2. Kazde ID w leadOutClueIds musi istniec w graph.clues z wlasciwym sourceNodeId
      repairedGraph.nodes.forEach((node) => {
        node.leadOutClueIds.forEach((clueId) => {
          const matchingClue = repairedGraph.clues.find((c) => c.id === clueId);
          expect(matchingClue).toBeDefined();
          expect(matchingClue?.sourceNodeId).toBe(node.id);
        });
      });

      // 3. Kazde targetNodeId w graph.clues musi wskazywac na istniejacy wezel w graph.nodes
      repairedGraph.clues.forEach((clue) => {
        const targetNode = repairedGraph.nodes.find((n) => n.id === clue.targetNodeId);
        expect(targetNode).toBeDefined();
      });

      // 4. Kazde sourceNodeId w graph.clues (jesli zdefiniowane) musi wskazywac na istniejacy wezel
      repairedGraph.clues.forEach((clue) => {
        if (clue.sourceNodeId) {
          const sourceNode = repairedGraph.nodes.find((n) => n.id === clue.sourceNodeId);
          expect(sourceNode).toBeDefined();
        }
      });

      // 5. Kazde polaczenie w connections musi laczyc istniejace wezly
      repairedGraph.connections.forEach((conn) => {
        const fromNode = repairedGraph.nodes.find((n) => n.id === conn.fromId);
        const toNode = repairedGraph.nodes.find((n) => n.id === conn.toId);
        expect(fromNode).toBeDefined();
        expect(toNode).toBeDefined();

        if (conn.clueId) {
          const connClue = repairedGraph.clues.find((c) => c.id === conn.clueId);
          expect(connClue).toBeDefined();
        }
      });

      // 6. Brak zduplikowanych ID poszlak
      const allClueIds = repairedGraph.clues.map((c) => c.id);
      const uniqueClueIds = new Set(allClueIds);
      expect(uniqueClueIds.size).toBe(allClueIds.length);

      // 7. Brak wycieku wartosci undefined do leadInClueIds i leadOutClueIds
      repairedGraph.nodes.forEach((node) => {
        expect(node.leadInClueIds.every((id) => typeof id === 'string' && id.trim().length > 0)).toBe(true);
        expect(node.leadOutClueIds.every((id) => typeof id === 'string' && id.trim().length > 0)).toBe(true);
        expect(node.leadInClueIds).not.toContain(undefined);
        expect(node.leadOutClueIds).not.toContain(undefined);
      });
    });

    it('zapewnia brak wycieku wartosci undefined, null ani pustych stringow do leadInClueIds i leadOutClueIds', () => {
      const g = createMockGraph({
        nodes: [
          createMockNode({ id: 'n1', type: 'intro', leadInClueIds: [undefined, '', null] as any }),
          createMockNode({ id: 'n2', isBottleneck: true, leadOutClueIds: [undefined] as any }),
        ],
        clues: [
          createMockClue({ id: 'valid-c', targetNodeId: 'n2', sourceNodeId: 'n1' }),
          { name: 'Broken clue without id', sourceNodeId: 'n1' } as any,
        ],
      });

      const res = ThreeClueRuleValidator.validateAndRepairGraph(g);

      res.graph.nodes.forEach((node) => {
        expect(node.leadInClueIds.every((id) => typeof id === 'string' && id.trim().length > 0)).toBe(true);
        expect(node.leadOutClueIds.every((id) => typeof id === 'string' && id.trim().length > 0)).toBe(true);
        expect(node.leadInClueIds).not.toContain(undefined);
        expect(node.leadOutClueIds).not.toContain(undefined);
        expect(node.leadInClueIds).not.toContain(null);
        expect(node.leadOutClueIds).not.toContain(null);
      });
    });
  });

  // Scenariusz 8+: Testy adwersarskie, zdegenerowane wejscia i stress
  describe('Scenariusze Adwersarskie i Przypadki Brzegowe (Hostile Inputs & Edge Cases)', () => {
    it('bezpiecznie obsluguje pusty graf (brak wezlow i poszlak) bez rzucania wyjatku', () => {
      const emptyGraph = createMockGraph({ nodes: [], clues: [], connections: [] });

      expect(() => {
        const result = ThreeClueRuleValidator.validateAndRepairGraph(emptyGraph);
        expect(result.isValid).toBe(true);
        expect(result.checkedBottlenecks).toBe(0);
        expect(result.totalSynthesizedClues).toBe(0);
      }).not.toThrow();
    });

    it('bezpiecznie obsluguje graf z 1 wezlem (brak wezla zrodlowego/poprzedzajacego)', () => {
      const singleNode = createMockNode({
        id: 'node-lonely',
        name: 'Samotna Wieza',
        type: 'climax',
        isClimax: true,
      });

      const singleGraph = createMockGraph({ nodes: [singleNode] });

      expect(() => {
        const result = ThreeClueRuleValidator.validateAndRepairGraph(singleGraph, { era: 'classic' });
        expect(result.checkedBottlenecks).toBe(1);
        expect(result.totalSynthesizedClues).toBe(3);
        expect(result.graph.clues.length).toBe(3);

        // Nie powinien wygenerowac blednych connections z nieistniejacym fromId
        result.graph.connections.forEach((conn) => {
          expect(conn.fromId).toBeTruthy();
          expect(conn.toId).toBe('node-lonely');
        });
      }).not.toThrow();
    });

    it('bezpiecznie obsluguje graf gdy pole nodes jest undefined lub null (odpornosc na dane z API)', () => {
      const corruptGraph = {
        clues: [],
        connections: [],
        npcs: [],
        locations: [],
      } as unknown as AdventureGraph;

      expect(() => {
        const result = ThreeClueRuleValidator.validateAndRepairGraph(corruptGraph);
        expect(result.checkedBottlenecks).toBe(0);
        expect(result.totalSynthesizedClues).toBe(0);
      }).not.toThrow();
    });

    it('poprawnie naprawia graf z wieloma waskimi gardlami bez kolizji identyfikatorow poszlak', () => {
      const start = createMockNode({ id: 'start', type: 'intro' });
      const bottle1 = createMockNode({ id: 'bottle-1', name: 'Etap 1', isBottleneck: true });
      const bottle2 = createMockNode({ id: 'bottle-2', name: 'Etap 2', isBottleneck: true });
      const climax = createMockNode({ id: 'climax', name: 'Final', isClimax: true });

      const multiGraph = createMockGraph({
        nodes: [start, bottle1, bottle2, climax],
        clues: [],
        connections: [],
      });

      const result = ThreeClueRuleValidator.validateAndRepairGraph(multiGraph, { era: 'classic' });

      // Wszystkie 3 waskie gardla musza byc sprawdzone
      expect(result.checkedBottlenecks).toBe(3);
      // Kazde otrzymuje 3 poszlaki -> lacznie 9 poszlak
      expect(result.totalSynthesizedClues).toBe(9);
      expect(result.graph.clues.length).toBe(9);

      // Wszystkie 9 poszlak maja unikalne ID
      const clueIds = result.graph.clues.map((c) => c.id);
      expect(new Set(clueIds).size).toBe(9);

      // Kazdy wezel ma dokladnie 3 poszlaki wlotowe
      expect(result.graph.clues.filter((c) => c.targetNodeId === 'bottle-1').length).toBe(3);
      expect(result.graph.clues.filter((c) => c.targetNodeId === 'bottle-2').length).toBe(3);
      expect(result.graph.clues.filter((c) => c.targetNodeId === 'climax').length).toBe(3);
    });

    it('nie zawiesza sie w nieskonczonej petli przy grafie zawierajacym cykle (A -> B -> C -> A)', () => {
      const nodeA = createMockNode({ id: 'A', isBottleneck: true });
      const nodeB = createMockNode({ id: 'B' });
      const nodeC = createMockNode({ id: 'C' });

      const cyclicGraph = createMockGraph({
        nodes: [nodeA, nodeB, nodeC],
        connections: [
          { fromId: 'A', toId: 'B', description: 'A do B' },
          { fromId: 'B', toId: 'C', description: 'B do C' },
          { fromId: 'C', toId: 'A', description: 'C do A' },
        ],
      });

      const startTime = Date.now();
      const result = ThreeClueRuleValidator.validateAndRepairGraph(cyclicGraph);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000); // Wykonanie ponizej sekundy
      expect(result.checkedBottlenecks).toBe(1);
      expect(result.totalSynthesizedClues).toBe(3);
    });

    it('ignoruje zdegenerowane poszlaki z targetNodeId wskazujacym na nieistniejacy wezel', () => {
      const nodeA = createMockNode({ id: 'node-real', isBottleneck: true });
      const zombieClue = createMockClue({
        id: 'zombie-clue',
        targetNodeId: 'non-existent-ghost-node',
      });

      const graph = createMockGraph({
        nodes: [nodeA],
        clues: [zombieClue],
      });

      const result = ThreeClueRuleValidator.validateAndRepairGraph(graph);

      // Wezel node-real nadal nie ma poszlak prowadzacych do niego, wiec musi dostac 3
      expect(result.totalSynthesizedClues).toBe(3);
      expect(result.graph.clues.filter((c) => c.targetNodeId === 'node-real').length).toBe(3);
    });

    it('nie zlicza falszywych tropow (isRedHerring: true) jako poszlak spelniajacych Zasade 3 Poszlak', () => {
      const start = createMockNode({ id: 'start', type: 'intro' });
      const bottleneck = createMockNode({ id: 'bottleneck', isBottleneck: true });

      const realClue = createMockClue({
        id: 'real-1',
        sourceType: 'document',
        targetNodeId: 'bottleneck',
      });
      const herring1 = createMockClue({
        id: 'herring-1',
        sourceType: 'testimony',
        targetNodeId: 'bottleneck',
        isRedHerring: true,
      });
      const herring2 = createMockClue({
        id: 'herring-2',
        sourceType: 'material',
        targetNodeId: 'bottleneck',
        isRedHerring: true,
      });

      const graph = createMockGraph({
        nodes: [start, bottleneck],
        clues: [realClue, herring1, herring2],
      });

      const result = ThreeClueRuleValidator.validateAndRepairGraph(graph, { era: 'classic' });

      // Mimo obecnosci 3 poszlak, 2 to falszywe tropy -> musi zsyntetyzowac 2 nowe poszlaki kluczowe (core)
      expect(result.totalSynthesizedClues).toBe(2);
      const validClues = result.graph.clues.filter(
        (c) => c.targetNodeId === 'bottleneck' && !c.isRedHerring
      );
      expect(validClues.length).toBe(3);
    });

    it('metoda inspectGraph (jesli obecna) zwraca raport brakow bez modyfikacji oryginalnego grafu', () => {
      const start = createMockNode({ id: 'start', type: 'intro' });
      const bottleneck = createMockNode({ id: 'bottleneck', isBottleneck: true });
      const graph = createMockGraph({ nodes: [start, bottleneck], clues: [] });

      if (typeof (ThreeClueRuleValidator as any).inspectGraph === 'function') {
        const inspectRes = (ThreeClueRuleValidator as any).inspectGraph(graph);
        expect(inspectRes.isValid).toBe(false);
        expect(inspectRes.checkedBottlenecks).toBe(1);
        expect(graph.clues.length).toBe(0); // Graf oryginalny niezmodyfikowany
      }
    });
  });

  // Scenariusz 9: Niezmiennik jakosciowy - Zero em/en-dashes
  describe('Niezmiennik jakosciowy: Calkowity brak znakow em-dash i en-dash', () => {
    it('gwarantuje, ze zsyntetyzowane nazwy, opisy i relacje connections nie zawieraja znakow em-dash ani en-dash', () => {
      const intro = createMockNode({ id: 'start', type: 'intro' });
      const bottleneck = createMockNode({ id: 'bottle', isBottleneck: true });

      const eras = ['classic', 'gaslight', 'modern', 'noir', 'prl'];

      for (const era of eras) {
        const graph = createMockGraph({ nodes: [intro, bottleneck] });
        const result = ThreeClueRuleValidator.validateAndRepairGraph(graph, { era });

        result.graph.clues.forEach((clue) => {
          expect(clue.name).not.toMatch(/[\u2013\u2014]/);
          expect(clue.description).not.toMatch(/[\u2013\u2014]/);
          if (clue.requiredSkill) {
            expect(clue.requiredSkill).not.toMatch(/[\u2013\u2014]/);
          }
        });

        result.graph.connections.forEach((conn) => {
          expect(conn.description).not.toMatch(/[\u2013\u2014]/);
        });
      }
    });
  });
});
