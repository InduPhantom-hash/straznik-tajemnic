import { normalizeAdventureGraph } from './custom-adventures-storage';
import { AdventureGraph, AdventureNode, AdventureClue, GraphConnection } from './types';

describe('Adwersarskie testy skrajne normalizeAdventureGraph (Milestone M1 Empirical Stress)', () => {

  describe('1. Skrajne typy wejsciowe (null, undefined, falsy, prymitywy, puste obiekty)', () => {
    it('zwraca bezpieczny domyslny szkielet dla null', () => {
      const result = normalizeAdventureGraph(null);
      expect(result).toEqual({
        nodes: [],
        clues: [],
        connections: [],
        npcs: [],
        locations: [],
      });
    });

    it('zwraca bezpieczny domyslny szkielet dla undefined', () => {
      const result = normalizeAdventureGraph(undefined);
      expect(result).toEqual({
        nodes: [],
        clues: [],
        connections: [],
        npcs: [],
        locations: [],
      });
    });

    it('zwraca bezpieczny domyslny szkielet dla pustego obiektu {}', () => {
      const result = normalizeAdventureGraph({});
      expect(result).toEqual({
        nodes: [],
        clues: [],
        connections: [],
        npcs: [],
        locations: [],
      });
    });

    it('zwraca bezpieczny domyslny szkielet dla pustej tablicy []', () => {
      const result = normalizeAdventureGraph([]);
      expect(result).toEqual({
        nodes: [],
        clues: [],
        connections: [],
        npcs: [],
        locations: [],
      });
    });

    it('zwraca bezpieczny domyslny szkielet dla stringa', () => {
      const result = normalizeAdventureGraph('invalid-payload');
      expect(result).toEqual({
        nodes: [],
        clues: [],
        connections: [],
        npcs: [],
        locations: [],
      });
    });

    it('zwraca bezpieczny domyslny szkielet dla liczby', () => {
      const result = normalizeAdventureGraph(42);
      expect(result).toEqual({
        nodes: [],
        clues: [],
        connections: [],
        npcs: [],
        locations: [],
      });
    });

    it('zwraca bezpieczny domyslny szkielet dla wartosci boolean', () => {
      const result = normalizeAdventureGraph(true);
      expect(result).toEqual({
        nodes: [],
        clues: [],
        connections: [],
        npcs: [],
        locations: [],
      });
    });

    it('bezpiecznie obsluguje obiekt ze wszystkimi wlasnosciami ustawionymi na null', () => {
      const result = normalizeAdventureGraph({
        nodes: null,
        locations: null,
        npcs: null,
        clues: null,
        connections: null,
      });
      expect(result).toEqual({
        nodes: [],
        clues: [],
        connections: [],
        npcs: [],
        locations: [],
      });
    });

    it('bezpiecznie obsluguje obiekt bez prototypu Object.create(null)', () => {
      const bareObject = Object.create(null);
      const result = normalizeAdventureGraph(bareObject);
      expect(result).toEqual({
        nodes: [],
        clues: [],
        connections: [],
        npcs: [],
        locations: [],
      });
    });
  });

  describe('2. Odpornosc na corrupted / falsy elementy w tablicach (null, undefined wewnatrz tablic)', () => {
    it('BUG-REPRO-1: bezpiecznie ignoruje null w nodes bez rzucania TypeError', () => {
      const corruptNodes = {
        nodes: [null, { id: 'valid-node', name: 'Poprawny wezel', type: 'location' as const }],
      };
      let result: AdventureGraph | null = null;
      expect(() => {
        result = normalizeAdventureGraph(corruptNodes);
      }).not.toThrow();
      expect(result).not.toBeNull();
      expect(result!.nodes).toHaveLength(1);
      expect(result!.nodes?.[0]?.id).toBe('valid-node');
    });

    it('BUG-REPRO-2: bezpiecznie ignoruje null w clues bez rzucania TypeError', () => {
      const corruptClues = {
        clues: [null, { id: 'clue-1', name: 'Tajemniczy list' }],
      };
      let result: AdventureGraph | null = null;
      expect(() => {
        result = normalizeAdventureGraph(corruptClues);
      }).not.toThrow();
      expect(result).not.toBeNull();
      expect(result!.clues).toHaveLength(1);
      expect(result!.clues?.[0]?.id).toBe('clue-1');
    });

    it('BUG-REPRO-3: bezpiecznie ignoruje null w connections bez rzucania TypeError', () => {
      const corruptConnections = {
        connections: [null, { fromId: 'a', toId: 'b', description: 'sciezka' }],
      };
      let result: AdventureGraph | null = null;
      expect(() => {
        result = normalizeAdventureGraph(corruptConnections);
      }).not.toThrow();
      expect(result).not.toBeNull();
      expect(result!.connections).toHaveLength(1);
      expect(result!.connections?.[0]?.fromId).toBe('a');
    });

    it('BUG-REPRO-4: bezpiecznie ignoruje null w npcs bez rzucania TypeError', () => {
      const corruptNpcs = {
        npcs: [null, { id: 'npc-1', name: 'Inspector Legrasse' }],
      };
      let result: AdventureGraph | null = null;
      expect(() => {
        result = normalizeAdventureGraph(corruptNpcs);
      }).not.toThrow();
      expect(result).not.toBeNull();
      expect(result!.npcs).toHaveLength(1);
      expect(result!.npcs?.[0]?.id).toBe('npc-1');
    });

    it('BUG-REPRO-5: bezpiecznie ignoruje null w locations bez rzucania TypeError', () => {
      const corruptLocations = {
        locations: [null, { id: 'loc-1', name: 'Bagno' }],
      };
      let result: AdventureGraph | null = null;
      expect(() => {
        result = normalizeAdventureGraph(corruptLocations);
      }).not.toThrow();
      expect(result).not.toBeNull();
      expect(result!.locations).toHaveLength(1);
      expect(result!.locations?.[0]?.id).toBe('loc-1');
    });
  });

  describe('3. Graf tylko ze starymi npcs i locations (Legacy format)', () => {
    it('generuje pelne wezly nodes ze starych struktur gdy pole nodes jest undefined', () => {
      const legacy = {
        locations: [
          { id: 'loc-manor', name: 'Posiadlosc Blackwood', description: 'Mroczny dwor na wzgorzu.', atmosphere: 'Stechle powietrze' },
          { id: 'loc-attic', name: 'Strych - Finał rytuału', description: 'Miejsce ostatecznego starcia.' },
        ],
        npcs: [
          { id: 'npc-butler', name: 'Kamerdyner Thomas', description: 'Milczacy sluga.', secret: 'Nalezy do kultu', statsSummary: 'Zrecznosc 40%' },
        ],
        clues: [
          { id: 'clue-diary', name: 'Dziennik lorda', description: 'Wskazuje na strych' },
        ],
        connections: [
          { fromId: 'loc-manor', toId: 'loc-attic', clueId: 'clue-diary', description: 'Ukryte schody' },
          { fromId: 'npc-butler', toId: 'loc-attic', clueId: 'clue-diary', description: 'Przesluchanie kamerdynera' },
        ],
      };

      const result = normalizeAdventureGraph(legacy);

      expect(result.nodes).toHaveLength(3);

      const manorNode = result.nodes.find((n) => n.id === 'loc-manor');
      expect(manorNode).toBeDefined();
      expect(manorNode?.type).toBe('location');
      expect(manorNode?.leadOutClueIds).toEqual(['clue-diary']);
      expect(manorNode?.atmosphere).toBe('Stechle powietrze');

      const atticNode = result.nodes.find((n) => n.id === 'loc-attic');
      expect(atticNode).toBeDefined();
      expect(atticNode?.type).toBe('climax');
      expect(atticNode?.isClimax).toBe(true);
      expect(atticNode?.leadInClueIds).toContain('clue-diary');

      const butlerNode = result.nodes.find((n) => n.id === 'npc-butler');
      expect(butlerNode).toBeDefined();
      expect(butlerNode?.type).toBe('npc');
      expect(butlerNode?.secret).toBe('Nalezy do kultu');
      expect(butlerNode?.statsSummary).toBe('Zrecznosc 40%');
      expect(butlerNode?.leadOutClueIds).toContain('clue-diary');

      // Wsteczne kolekcje
      expect(result.locations).toHaveLength(2);
      expect(result.npcs).toHaveLength(1);
    });

    it('BUG-REPRO-6: nie gubi konwersji starych npcs/locations do nodes gdy wejsciowy obiekt ma nodes: []', () => {
      const legacyWithEmptyNodes = {
        nodes: [] as AdventureNode[],
        locations: [
          { id: 'loc-1', name: 'Biblioteka Orne', description: 'Ksiegi.' },
        ],
        npcs: [
          { id: 'npc-1', name: 'Armitage', description: 'Bibliotekarz.' },
        ],
      };

      const result = normalizeAdventureGraph(legacyWithEmptyNodes);
      expect(result.nodes).toHaveLength(2);
    });
  });

  describe('4. Graf tylko z nowymi nodes (The Alexandrian Canon)', () => {
    it('rzutuje wezly wszystkich typow na tablice npcs i locations z zachowaniem dedykowanych ID', () => {
      const modernGraph = {
        nodes: [
          {
            id: 'node-intro-1',
            name: 'Prolog w Redakcji',
            type: 'intro' as const,
            description: 'Zlecenie od redaktora.',
            leadInClueIds: [],
            leadOutClueIds: ['c1'],
            locationId: 'loc-newspaper',
          },
          {
            id: 'node-loc-1',
            name: 'Cmentarz w Arkham',
            type: 'location' as const,
            description: 'Rozkopany grobowiec.',
            leadInClueIds: ['c1'],
            leadOutClueIds: ['c2'],
            atmosphere: 'Gestna mgla',
          },
          {
            id: 'node-npc-1',
            name: 'Grabarz O\'Brian',
            type: 'npc' as const,
            description: 'Starzec z lopata.',
            leadInClueIds: ['c2'],
            leadOutClueIds: ['c3'],
            secret: 'Handluje szczatkami',
            statsSummary: 'Sila 65%',
            npcIds: ['npc-obrian'],
          },
          {
            id: 'node-event-1',
            name: 'Atak Ghuli o Polnocy',
            type: 'event' as const,
            description: 'Zasadzka wsrod nagrobkow.',
            leadInClueIds: ['c3'],
            leadOutClueIds: ['c4'],
          },
          {
            id: 'node-climax-1',
            name: 'Katakumby pod Miastem',
            type: 'climax' as const,
            description: 'Gniazdo bestii.',
            leadInClueIds: ['c4'],
            leadOutClueIds: [],
            isClimax: true,
            isBottleneck: true,
          },
        ],
        clues: [
          { id: 'c1', name: 'Wycinek z gazety', sourceType: 'document' as const, clueType: 'core' as const, targetNodeId: 'node-loc-1' },
          { id: 'c2', name: 'Slady stop', sourceType: 'material' as const, clueType: 'core' as const, targetNodeId: 'node-npc-1' },
          { id: 'c3', name: 'Zeznanie grabarza', sourceType: 'testimony' as const, clueType: 'core' as const, targetNodeId: 'node-event-1' },
          { id: 'c4', name: 'Dziwny totem', sourceType: 'anomaly' as const, clueType: 'core' as const, targetNodeId: 'node-climax-1' },
        ],
        connections: [
          { fromId: 'node-intro-1', toId: 'node-loc-1', clueId: 'c1', description: 'Artykul kieruje na cmentarz' },
          { fromId: 'node-loc-1', toId: 'node-npc-1', clueId: 'c2', description: 'Slady prowadza do chaty grabarza' },
          { fromId: 'node-npc-1', toId: 'node-event-1', clueId: 'c3', description: 'Ostrzezenie o zmroku' },
          { fromId: 'node-event-1', toId: 'node-climax-1', clueId: 'c4', description: 'Slad ciagniecia w dol' },
        ],
      };

      const result = normalizeAdventureGraph(modernGraph);

      expect(result.nodes).toHaveLength(5);
      expect(result.clues).toHaveLength(4);
      expect(result.connections).toHaveLength(4);

      // Locations: intro (z locationId), location, climax
      expect(result.locations.length).toBeGreaterThanOrEqual(3);
      const newspaperLoc = result.locations.find((l) => l.id === 'loc-newspaper');
      expect(newspaperLoc).toBeDefined();
      expect(newspaperLoc?.name).toBe('Prolog w Redakcji');

      const graveyardLoc = result.locations.find((l) => l.id === 'node-loc-1');
      expect(graveyardLoc).toBeDefined();
      expect(graveyardLoc?.atmosphere).toBe('Gestna mgla');

      const climaxLoc = result.locations.find((l) => l.id === 'node-climax-1');
      expect(climaxLoc).toBeDefined();

      // NPCs: grabarz (uzywa npcIds[0] jesli podano)
      expect(result.npcs).toHaveLength(1);
      const obrianNpc = result.npcs.find((n) => n.id === 'npc-obrian');
      expect(obrianNpc).toBeDefined();
      expect(obrianNpc?.name).toBe('Grabarz O\'Brian');
      expect(obrianNpc?.secret).toBe('Handluje szczatkami');
      expect(obrianNpc?.statsSummary).toBe('Sila 65%');
    });
  });

  describe('5. Zagniezdzone, brakujace i nietypowe identyfikatory', () => {
    it('bezpiecznie nadaje identyfikator brakujacym lub pustym id wezlow', () => {
      const graphWithMissingIds = {
        nodes: [
          { name: 'Wezel bez ID', type: 'location' as const, description: 'Opis' },
          { id: '', name: 'Wezel z pustym ID', type: 'npc' as const, description: 'Opis' },
        ] as AdventureNode[],
      };

      const result = normalizeAdventureGraph(graphWithMissingIds);
      expect(result.nodes).toHaveLength(2);
      expect(typeof result.nodes[0].id).toBe('string');
      expect(result.nodes[0].id.length).toBeGreaterThan(0);
      expect(typeof result.nodes[1].id).toBe('string');
      expect(result.nodes[1].id.length).toBeGreaterThan(0);
      expect(result.nodes[0].id).not.toBe(result.nodes[1].id);
    });

    it('konwertuje numeryczne identyfikatory wezlow do string', () => {
      const graphWithNumberIds = {
        nodes: [
          { id: 101 as unknown as string, name: 'Wezel 101', type: 'location' as const, description: 'Opis' },
        ],
      };

      const result = normalizeAdventureGraph(graphWithNumberIds);
      expect(result.nodes[0].id).toBe('101');
    });

    it('uzupelnia brakujace targetNodeId i sourceNodeId w clues z connections', () => {
      const graphWithCluesNeedingInference = {
        nodes: [
          { id: 'node-A', name: 'Punkt A', type: 'location' as const, description: '' },
          { id: 'node-B', name: 'Punkt B', type: 'location' as const, description: '' },
        ],
        clues: [
          { id: 'clue-x', name: 'Tajemniczy klucz', description: 'Pasuje do zamka' },
        ],
        connections: [
          { fromId: 'node-A', toId: 'node-B', clueId: 'clue-x', description: 'Przejscie' },
        ],
      };

      const result = normalizeAdventureGraph(graphWithCluesNeedingInference);
      expect(result.clues[0].targetNodeId).toBe('node-B');
      expect(result.clues[0].sourceNodeId).toBe('node-A');
    });

    it('bezpiecznie obsluguje zagniezdzone obiekty jako id bez rzucenia wyjatku', () => {
      const graphWithNestedObjIds = {
        nodes: [
          { id: { rawId: 'nested-123' } as unknown as string, name: 'Wezel obiekt', type: 'location' as const, description: '' },
        ],
      };

      let result: AdventureGraph | null = null;
      expect(() => {
        result = normalizeAdventureGraph(graphWithNestedObjIds);
      }).not.toThrow();
      expect(result).not.toBeNull();
      expect(typeof result!.nodes![0].id).toBe('string');
    });
  });

  describe('6. Cykle w polaczeniach (Graph Cycles & Self-Loops)', () => {
    it('bezpiecznie przetwarza cykl dwustronny A <-> B bez zapedlenia', () => {
      const cycleGraph = {
        nodes: [
          { id: 'node-A', name: 'Biblioteka', type: 'location' as const, description: '' },
          { id: 'node-B', name: 'Muzeum', type: 'location' as const, description: '' },
        ],
        clues: [
          { id: 'clue-1', name: 'List', targetNodeId: 'node-B' },
          { id: 'clue-2', name: 'Katalog', targetNodeId: 'node-A' },
        ],
        connections: [
          { fromId: 'node-A', toId: 'node-B', clueId: 'clue-1', description: 'Z A do B' },
          { fromId: 'node-B', toId: 'node-A', clueId: 'clue-2', description: 'Z B do A' },
        ],
      };

      const result = normalizeAdventureGraph(cycleGraph);
      expect(result.nodes).toHaveLength(2);
      expect(result.connections).toHaveLength(2);
      expect(result.clues).toHaveLength(2);
    });

    it('bezpiecznie przetwarza cykl 3-wezlowy A -> B -> C -> A', () => {
      const cycle3Graph = {
        nodes: [
          { id: 'n1', name: 'N1', type: 'location' as const, description: '' },
          { id: 'n2', name: 'N2', type: 'location' as const, description: '' },
          { id: 'n3', name: 'N3', type: 'location' as const, description: '' },
        ],
        clues: [
          { id: 'c1', name: 'C1' },
          { id: 'c2', name: 'C2' },
          { id: 'c3', name: 'C3' },
        ],
        connections: [
          { fromId: 'n1', toId: 'n2', clueId: 'c1', description: '1 do 2' },
          { fromId: 'n2', toId: 'n3', clueId: 'c2', description: '2 do 3' },
          { fromId: 'n3', toId: 'n1', clueId: 'c3', description: '3 do 1' },
        ],
      };

      const result = normalizeAdventureGraph(cycle3Graph);
      expect(result.nodes).toHaveLength(3);
      expect(result.connections).toHaveLength(3);
      // Sprawdzamy wnioskowanie targetNodeId w cyklu
      const c1 = result.clues.find((c) => c.id === 'c1');
      const c2 = result.clues.find((c) => c.id === 'c2');
      const c3 = result.clues.find((c) => c.id === 'c3');
      expect(c1?.targetNodeId).toBe('n2');
      expect(c2?.targetNodeId).toBe('n3');
      expect(c3?.targetNodeId).toBe('n1');
    });

    it('bezpiecznie przetwarza petle wlasna (self-loop: Node A -> Node A)', () => {
      const selfLoopGraph = {
        nodes: [
          { id: 'node-self', name: 'Pętla czasowa w Arkham', type: 'location' as const, description: '' },
        ],
        clues: [
          { id: 'clue-loop', name: 'Dziennik z przyszlosci' },
        ],
        connections: [
          { fromId: 'node-self', toId: 'node-self', clueId: 'clue-loop', description: 'Wskazuje na samo siebie' },
        ],
      };

      const result = normalizeAdventureGraph(selfLoopGraph);
      expect(result.nodes).toHaveLength(1);
      expect(result.connections).toHaveLength(1);
      expect(result.clues[0].targetNodeId).toBe('node-self');
      expect(result.clues[0].sourceNodeId).toBe('node-self');
    });
  });

  describe('7. Niezmiennosc i ochrona danych wejsciowych (Immutability / Deep Freeze)', () => {
    it('nie mutuje wejsciowego obiektu grafu ani zagniezdzonych tablic', () => {
      const frozenInput = Object.freeze({
        nodes: Object.freeze([
          Object.freeze({ id: 'f-node-1', name: 'Freeze 1', type: 'location' as const, description: 'Desc' }),
        ]),
        clues: Object.freeze([
          Object.freeze({ id: 'f-clue-1', name: 'Freeze Clue', description: 'Desc' }),
        ]),
        connections: Object.freeze([
          Object.freeze({ fromId: 'f-node-1', toId: 'f-node-1', clueId: 'f-clue-1', description: 'Conn' }),
        ]),
        npcs: Object.freeze([]),
        locations: Object.freeze([]),
      });

      expect(() => {
        normalizeAdventureGraph(frozenInput);
      }).not.toThrow();
    });
  });

  describe('8. Integralnosc danych i zapobieganie utracie metadanych', () => {
    it('zachowuje wszystkie opcjonalne atrybuty węzłów i poszlak', () => {
      const richGraph = {
        nodes: [
          {
            id: 'rich-node',
            name: 'Bogaty wezel',
            type: 'climax' as const,
            description: 'Szczegolowy opis',
            leadInClueIds: ['c-1'],
            leadOutClueIds: ['c-2'],
            isBottleneck: true,
            isClimax: true,
            atmosphere: 'Zimno i ciemno',
            secret: 'Ukryte przejscie pod oltarzem',
            statsSummary: 'POW 80, SAN 0',
            locationId: 'loc-rich',
            npcIds: ['npc-rich-1'],
          },
        ],
        clues: [
          {
            id: 'c-1',
            name: 'Poszlaka A',
            description: 'Opis A',
            sourceType: 'material' as const,
            clueType: 'core' as const,
            targetNodeId: 'rich-node',
            sourceNodeId: 'source-node',
            requiredSkill: 'Spostrzegawczosc',
            isRedHerring: false,
            isSynthesized: true,
          },
        ],
        connections: [
          { fromId: 'source-node', toId: 'rich-node', clueId: 'c-1', description: 'Tropy' },
        ],
      };

      const result = normalizeAdventureGraph(richGraph);
      const node = result.nodes[0];
      expect(node.isBottleneck).toBe(true);
      expect(node.isClimax).toBe(true);
      expect(node.atmosphere).toBe('Zimno i ciemno');
      expect(node.secret).toBe('Ukryte przejscie pod oltarzem');
      expect(node.statsSummary).toBe('POW 80, SAN 0');
      expect(node.locationId).toBe('loc-rich');
      expect(node.npcIds).toEqual(['npc-rich-1']);

      const clue = result.clues[0];
      expect(clue.sourceType).toBe('material');
      expect(clue.clueType).toBe('core');
      expect(clue.targetNodeId).toBe('rich-node');
      expect(clue.sourceNodeId).toBe('source-node');
      expect(clue.requiredSkill).toBe('Spostrzegawczosc');
      expect(clue.isRedHerring).toBe(false);
      expect(clue.isSynthesized).toBe(true);
    });
  });

  describe('9. Zaawansowane wejscia skrajne (symbole, funkcje, tablice rzadkie, typy mieszane, Date/RegExp/Map)', () => {
    it('bezpiecznie filtruje funkcje, symbole, liczby i stringi wewnatrz tablic nodes, clues, connections, npcs, locations', () => {
      const mixedPayload = {
        nodes: [
          undefined,
          123,
          'niepoprawny string',
          true,
          Symbol('sym-node'),
          () => 'funkcja',
          null,
          { id: 'node-valid-1', name: 'Prawidlowy wezel', type: 'location' as const },
        ],
        clues: [
          undefined,
          456,
          false,
          Symbol('sym-clue'),
          () => {},
          null,
          { id: 'clue-valid-1', name: 'Prawidlowa poszlaka' },
        ],
        connections: [
          undefined,
          789,
          'conn-string',
          Symbol('sym-conn'),
          null,
          { fromId: 'node-valid-1', toId: 'node-valid-1', description: 'Self connection' },
        ],
        npcs: [
          undefined,
          101,
          Symbol('sym-npc'),
          null,
          { id: 'npc-valid-1', name: 'Inspector' },
        ],
        locations: [
          undefined,
          202,
          Symbol('sym-loc'),
          null,
          { id: 'loc-valid-1', name: 'Manor' },
        ],
      };

      let result: AdventureGraph | null = null;
      expect(() => {
        result = normalizeAdventureGraph(mixedPayload);
      }).not.toThrow();

      expect(result).not.toBeNull();
      expect(result!.nodes).toHaveLength(1);
      expect(result!.nodes![0]!.id).toBe('node-valid-1');
      expect(result!.clues).toHaveLength(1);
      expect(result!.clues![0]!.id).toBe('clue-valid-1');
      expect(result!.connections).toHaveLength(1);
      expect(result!.connections![0]!.fromId).toBe('node-valid-1');
      expect(result!.npcs).toHaveLength(1);
      expect(result!.npcs![0]!.id).toBe('npc-valid-1');
      expect(result!.locations).toHaveLength(2); // loc-valid-1 + node-valid-1 projection
    });

    it('bezpiecznie obsluguje tablice rzadkie (sparse arrays z pustymi slotami)', () => {
      const sparseNodes = new Array(5);
      sparseNodes[3] = { id: 'node-sparse', name: 'Wezel z rzadkiej tablicy', type: 'location' as const };

      const sparseClues = new Array(4);
      sparseClues[1] = { id: 'clue-sparse', name: 'Poszlaka z rzadkiej tablicy' };

      const sparsePayload = {
        nodes: sparseNodes,
        clues: sparseClues,
      };

      let result: AdventureGraph | null = null;
      expect(() => {
        result = normalizeAdventureGraph(sparsePayload);
      }).not.toThrow();

      expect(result).not.toBeNull();
      expect(result!.nodes).toHaveLength(1);
      expect(result!.nodes![0]!.id).toBe('node-sparse');
      expect(result!.clues).toHaveLength(1);
      expect(result!.clues![0]!.id).toBe('clue-sparse');
    });

    it('bezpiecznie obsluguje obiekty zamrozone Object.freeze z kluczami typu Symbol', () => {
      const symKey = Symbol('secret-field');
      const frozenObj = Object.freeze({
        [symKey]: 'hidden-meta',
        nodes: Object.freeze([
          Object.freeze({
            id: 'frozen-sym-node',
            name: 'Zamrozony wezel z symbolem',
            type: 'location' as const,
            description: 'Opis zamrozonego wezla',
            [symKey]: 999,
          }),
        ]),
        clues: Object.freeze([]),
        connections: Object.freeze([]),
        npcs: Object.freeze([]),
        locations: Object.freeze([]),
      });

      let result: AdventureGraph | null = null;
      expect(() => {
        result = normalizeAdventureGraph(frozenObj);
      }).not.toThrow();

      expect(result).not.toBeNull();
      expect(result!.nodes).toHaveLength(1);
      expect(result!.nodes![0]!.id).toBe('frozen-sym-node');
      expect(Object.isFrozen(result!.nodes![0])).toBe(false);
      expect(Object.isFrozen(result)).toBe(false);
    });

    it('bezpiecznie obsluguje wejscia nietypowych obiektow wbudowanych (Date, RegExp, Map, Set, Error)', () => {
      expect(() => normalizeAdventureGraph(new Date())).not.toThrow();
      expect(() => normalizeAdventureGraph(/pattern/g)).not.toThrow();
      expect(() => normalizeAdventureGraph(new Map())).not.toThrow();
      expect(() => normalizeAdventureGraph(new Set())).not.toThrow();
      expect(() => normalizeAdventureGraph(new Error('test'))).not.toThrow();

      const resDate = normalizeAdventureGraph(new Date());
      expect(resDate).toEqual({
        nodes: [],
        clues: [],
        connections: [],
        npcs: [],
        locations: [],
      });
    });

    it('bezpiecznie normalizuje wezel ze skrajnie uszkodzonymi typami wewnetrznymi pol', () => {
      const corruptTypesGraph = {
        nodes: [
          {
            id: 9999 as unknown as string,
            name: { text: 'obiekt zamiast string' } as unknown as string,
            type: 12345 as unknown as 'location',
            description: null as unknown as string,
            leadInClueIds: 'nie-tablica' as unknown as string[],
            leadOutClueIds: 42 as unknown as string[],
            isBottleneck: 'prawda' as unknown as boolean,
            isClimax: 1 as unknown as boolean,
            npcIds: { nie: 'tablica' } as unknown as string[],
          },
        ],
      };

      let result: AdventureGraph | null = null;
      expect(() => {
        result = normalizeAdventureGraph(corruptTypesGraph);
      }).not.toThrow();

      expect(result).not.toBeNull();
      expect(result!.nodes).toHaveLength(1);
      const n = result!.nodes![0]!;
      expect(n.id).toBe('9999');
      expect(n.name).toBe('[object Object]');
      expect(n.type).toBe(12345);
      expect(n.description).toBe('');
      expect(n.leadInClueIds).toEqual([]);
      expect(n.leadOutClueIds).toEqual([]);
      expect(n.isBottleneck).toBeUndefined();
      expect(n.isClimax).toBeUndefined();
      expect(n.npcIds).toBeUndefined();
    });
  });
});
