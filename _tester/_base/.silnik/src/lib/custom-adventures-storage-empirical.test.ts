/**
 * Empirical Adversarial Test Harness for M1: Storage Roundtrip Stress
 * Tests:
 * 1. Idempotency: normalizeAdventureGraph(normalizeAdventureGraph(g))
 * 2. Giant graphs (>100 nodes, >300 clues, >500 connections) roundtrip & compression
 * 3. Hostile / corrupted inputs resilience
 * 4. Full IndexedDB compression roundtrip with Alexandrian data model
 */

import {
  normalizeAdventureGraph,
  extractHeavyData,
  sanitizeCustomAdventureForStorage,
  hydrateLeanAdventure,
  reconstructAdventure,
  compressPayload,
  decompressPayload,
  saveAdventureRecord,
  loadAdventureRecord,
  deleteAdventureRecord,
  _resetDBCache,
  STORE,
} from './custom-adventures-storage';
import type { CustomAdventure } from './adventures-data';
import type {
  AdventureGraph,
  AdventureNode,
  AdventureClue,
  GraphConnection,
  AdventureNodeType,
  ClueSourceType,
  ClueType,
} from './types';

// Mock IDB infrastructure
interface IDBTarget<T> {
  target: T;
}

class MockIDBRequest<T = unknown> {
  result?: T;
  error?: Error | null = null;
  onsuccess?: ((event: IDBTarget<MockIDBRequest<T>>) => void) | null = null;
  onerror?: ((event: IDBTarget<MockIDBRequest<T>>) => void) | null = null;

  resolve(val: T) {
    this.result = val;
    Promise.resolve().then(() => {
      if (this.onsuccess) this.onsuccess({ target: this });
    });
  }

  reject(err: Error) {
    this.error = err;
    Promise.resolve().then(() => {
      if (this.onerror) this.onerror({ target: this });
    });
  }
}

class MockIDBObjectStore {
  public data = new Map<string, unknown>();

  get(key: string): MockIDBRequest<unknown> {
    const req = new MockIDBRequest<unknown>();
    req.resolve(this.data.get(key));
    return req;
  }

  put(value: { id: string } & Record<string, unknown>): MockIDBRequest<string> {
    const req = new MockIDBRequest<string>();
    const id = value.id;
    this.data.set(id, value);
    req.resolve(id);
    return req;
  }

  delete(key: string): MockIDBRequest<undefined> {
    const req = new MockIDBRequest<undefined>();
    this.data.delete(key);
    req.resolve(undefined);
    return req;
  }

  clear(): MockIDBRequest<undefined> {
    const req = new MockIDBRequest<undefined>();
    this.data.clear();
    req.resolve(undefined);
    return req;
  }

  getAllKeys(): MockIDBRequest<string[]> {
    const req = new MockIDBRequest<string[]>();
    req.resolve(Array.from(this.data.keys()));
    return req;
  }

  getAll(): MockIDBRequest<unknown[]> {
    const req = new MockIDBRequest<unknown[]>();
    req.resolve(Array.from(this.data.values()));
    return req;
  }
}

class MockIDBDatabase {
  public stores = new Map<string, MockIDBObjectStore>();

  get objectStoreNames() {
    const names = Array.from(this.stores.keys());
    return {
      contains: (name: string) => names.includes(name),
    };
  }

  createObjectStore(name: string) {
    const store = new MockIDBObjectStore();
    this.stores.set(name, store);
    return store;
  }

  transaction() {
    const tx = {
      objectStore: (name: string) => {
        let store = this.stores.get(name);
        if (!store) {
          store = new MockIDBObjectStore();
          this.stores.set(name, store);
        }
        return store;
      },
      oncomplete: null as ((ev: IDBTarget<unknown>) => void) | null,
      onerror: null as ((ev: IDBTarget<unknown>) => void) | null,
    };
    setTimeout(() => {
      if (tx.oncomplete) tx.oncomplete({ target: tx });
    }, 10);
    return tx;
  }
}

interface MockOpenRequest {
  result: MockIDBDatabase;
  onsuccess: ((ev: IDBTarget<MockOpenRequest>) => void) | null;
  onerror: ((ev: IDBTarget<MockOpenRequest>) => void) | null;
  onupgradeneeded: ((ev: IDBTarget<{ result: MockIDBDatabase }>) => void) | null;
}

function createMockIndexedDB() {
  const db = new MockIDBDatabase();
  db.createObjectStore(STORE);

  return {
    _db: db,
    open: jest.fn().mockImplementation(() => {
      const openReq: MockOpenRequest = {
        result: db,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      };
      setTimeout(() => {
        if (openReq.onupgradeneeded) {
          openReq.onupgradeneeded({ target: { result: db } });
        }
        if (openReq.onsuccess) {
          openReq.onsuccess({ target: openReq });
        }
      }, 0);
      return openReq;
    }),
  };
}

describe('Empirical Adversarial Test Suite - Storage Roundtrip Stress (M1)', () => {
  let mockIDB: ReturnType<typeof createMockIndexedDB>;
  let originalIndexedDB: unknown;

  beforeAll(() => {
    const nodeGlobal = global as unknown as Record<string, unknown>;
    const gt = globalThis as unknown as Record<string, unknown>;
    const win = window as unknown as Record<string, unknown>;

    if (typeof gt.CompressionStream === 'undefined' && nodeGlobal.CompressionStream) {
      gt.CompressionStream = nodeGlobal.CompressionStream;
    }
    if (typeof gt.DecompressionStream === 'undefined' && nodeGlobal.DecompressionStream) {
      gt.DecompressionStream = nodeGlobal.DecompressionStream;
    }
    if (typeof win.CompressionStream === 'undefined' && nodeGlobal.CompressionStream) {
      win.CompressionStream = nodeGlobal.CompressionStream;
    }
    if (typeof win.DecompressionStream === 'undefined' && nodeGlobal.DecompressionStream) {
      win.DecompressionStream = nodeGlobal.DecompressionStream;
    }
  });

  beforeEach(() => {
    mockIDB = createMockIndexedDB();
    originalIndexedDB = (globalThis as Record<string, unknown>).indexedDB;
    (globalThis as Record<string, unknown>).indexedDB = mockIDB;
    (window as unknown as Record<string, unknown>).indexedDB = mockIDB;
    localStorage.clear();
    _resetDBCache();
  });

  afterEach(() => {
    (globalThis as Record<string, unknown>).indexedDB = originalIndexedDB;
    (window as unknown as Record<string, unknown>).indexedDB = originalIndexedDB;
    _resetDBCache();
  });

  describe('1. Idempotencja normalizeAdventureGraph', () => {
    it('Czysty graf Alexandrian: normalize(normalize(g)) jest identyczny z normalize(g)', () => {
      const pureGraph: AdventureGraph = {
        nodes: [
          {
            id: 'node-intro-1',
            name: 'Początek w Miskatonic',
            type: 'intro',
            description: 'Gabinet dziekana.',
            leadInClueIds: [],
            leadOutClueIds: ['clue-1', 'clue-2'],
            atmosphere: 'Zapach starego papieru i tytoniu fajkowego',
          },
          {
            id: 'node-loc-sanitarium',
            name: 'Szpital Arkham Sanitarium',
            type: 'location',
            description: 'Oddział dla obłąkanych.',
            leadInClueIds: ['clue-1'],
            leadOutClueIds: ['clue-3'],
            isBottleneck: true,
            locationId: 'loc-sanitarium',
            atmosphere: 'Krzyki za grubymi drzwiami',
          },
          {
            id: 'node-npc-patient',
            name: 'Pacjent 42 - Douglas',
            type: 'npc',
            description: 'Były marynarz bełkoczący o czułkach.',
            leadInClueIds: ['clue-2'],
            leadOutClueIds: ['clue-4'],
            secret: 'Wie o podmorskich ruinach przy Nan Madol',
            statsSummary: 'Poczytalność 12%, Mitologia Cthulhu 25%',
            npcIds: ['npc-douglas'],
          },
          {
            id: 'node-climax-reef',
            name: 'Rafa Diabelska - Kulminacja',
            type: 'climax',
            description: 'Rytuał pod czarnym księżycem.',
            leadInClueIds: ['clue-3', 'clue-4'],
            leadOutClueIds: [],
            isClimax: true,
            isBottleneck: true,
            atmosphere: 'Cuchnąca piana i łuski rybie',
          },
        ],
        clues: [
          {
            id: 'clue-1',
            name: 'Karta pacjenta',
            description: 'Wskazuje szpital.',
            sourceType: 'document',
            clueType: 'core',
            targetNodeId: 'node-loc-sanitarium',
            sourceNodeId: 'node-intro-1',
          },
          {
            id: 'clue-2',
            name: 'Pamiętnik z podróży',
            description: 'Notatki o marynarzu.',
            sourceType: 'material',
            clueType: 'flavor',
            targetNodeId: 'node-npc-patient',
            sourceNodeId: 'node-intro-1',
          },
          {
            id: 'clue-3',
            name: 'Dziwny medalion z głębin',
            description: 'Stop złota nieznany geologom.',
            sourceType: 'anomaly',
            clueType: 'core',
            targetNodeId: 'node-climax-reef',
            sourceNodeId: 'node-loc-sanitarium',
          },
          {
            id: 'clue-4',
            name: 'Zeznanie Douglasa',
            description: 'Współrzędne rafy.',
            sourceType: 'testimony',
            clueType: 'core',
            targetNodeId: 'node-climax-reef',
            sourceNodeId: 'node-npc-patient',
          },
        ],
        connections: [
          { fromId: 'node-intro-1', toId: 'node-loc-sanitarium', clueId: 'clue-1', description: 'Ślad do szpitala' },
          { fromId: 'node-intro-1', toId: 'node-npc-patient', clueId: 'clue-2', description: 'Ślad do pacjenta' },
          { fromId: 'node-loc-sanitarium', toId: 'node-climax-reef', clueId: 'clue-3', description: 'Artefakt kieruje na rafę' },
          { fromId: 'node-npc-patient', toId: 'node-climax-reef', clueId: 'clue-4', description: 'Wskazówki Douglasa' },
        ],
        npcs: [],
        locations: [],
      };

      const pass1 = normalizeAdventureGraph(pureGraph);
      const pass2 = normalizeAdventureGraph(pass1);
      const pass3 = normalizeAdventureGraph(pass2);

      // Sprawdzenie tożsamości JSON (strukturalnej i wartości)
      expect(JSON.stringify(pass2)).toBe(JSON.stringify(pass1));
      expect(JSON.stringify(pass3)).toBe(JSON.stringify(pass2));

      // Sprawdzenie głębokiej równości obiektowej
      expect(pass2.nodes).toEqual(pass1.nodes);
      expect(pass2.clues).toEqual(pass1.clues);
      expect(pass2.connections).toEqual(pass1.connections);
      expect(pass2.npcs).toEqual(pass1.npcs);
      expect(pass2.locations).toEqual(pass1.locations);
    });

    it('Graf legacy (bez nodes): stabilność po 1. i 2. przejściu', () => {
      const legacyGraph = {
        locations: [
          { id: 'loc-manor', name: 'Posiadłość Blackwood', description: 'Opuszczona rezydencja.', atmosphere: 'Zimno' },
          { id: 'loc-cellar', name: 'Piwnica rytualna - Finał', description: 'Miejsce ofiarne.' },
        ],
        npcs: [
          { id: 'npc-butler', name: 'Jan Krawczyk', description: 'Kamerdyner.', secret: 'Otruty przez kult', statsSummary: 'STR 40' },
        ],
        clues: [
          { id: 'clue-letter', name: 'List z pogróżkami', description: 'Podpisany inicjałem B.' },
        ],
        connections: [
          { fromId: 'loc-manor', toId: 'loc-cellar', clueId: 'clue-letter', description: 'Wskazuje zejście' },
        ],
      };

      const pass1 = normalizeAdventureGraph(legacyGraph);
      const pass2 = normalizeAdventureGraph(pass1);
      const pass3 = normalizeAdventureGraph(pass2);

      // Sprawdzenie tożsamości strukturalnej:
      // Zauważmy: w pass1 (ze struktur legacy) pola nieobecne miały wartość undefined (np. atmosphere: undefined),
      // podczas gdy od pass2 są one oczyszczone (brak klucza).
      // Sprawdzamy równość semantyczną pass1 i pass2 (po usunięciu undefined) oraz ścisłą idempotencję pass2 === pass3:
      expect(pass2.nodes).toEqual(
        pass1.nodes.map((n) => JSON.parse(JSON.stringify(n)))
      );
      expect(pass3).toEqual(pass2);
      expect(JSON.stringify(pass3)).toBe(JSON.stringify(pass2));
    });

    it('Graf pusty i uszkodzony: pełna idempotencja domyślnych struktur', () => {
      const inputs = [null, undefined, {}, { nodes: [] }, 'broken' as unknown];

      for (const input of inputs) {
        const pass1 = normalizeAdventureGraph(input);
        const pass2 = normalizeAdventureGraph(pass1);
        const pass3 = normalizeAdventureGraph(pass2);

        expect(pass2).toEqual(pass1);
        expect(pass3).toEqual(pass2);
      }
    });
  });

  describe('2. Gigantyczne grafy (>100 węzłów, >300 poszlak, >500 połączeń)', () => {
    function generateGiantAdventure(): CustomAdventure {
      const totalNodes = 120;
      const totalClues = 350;
      const totalConnections = 450;

      const nodes: AdventureNode[] = [];
      const nodeTypes: AdventureNodeType[] = ['intro', 'location', 'npc', 'event', 'climax'];
      const clueSourceTypes: ClueSourceType[] = ['material', 'testimony', 'document', 'anomaly'];
      const clueTypes: ClueType[] = ['core', 'flavor'];

      // 1. Węzły
      for (let i = 0; i < totalNodes; i++) {
        const type = i === 0 ? 'intro' : i >= 115 ? 'climax' : nodeTypes[i % 5];
        const isLoc = type === 'location' || type === 'climax' || type === 'intro';
        const isNpc = type === 'npc';

        nodes.push({
          id: `node-${i}`,
          name: `Węzeł śledczy #${i} - ${type.toUpperCase()}`,
          type,
          description: `Szczegółowy opis węzła śledczego numer ${i} w Arkham z roku 1928. Zawiera ukryte tropy, ślady potworów i dialogi świadków.`,
          leadInClueIds: [],
          leadOutClueIds: [],
          isBottleneck: i % 10 === 0,
          isClimax: type === 'climax',
          atmosphere: isLoc ? `Mroczna atmosfera lokacji ${i} - deszcz i mgła nad rzeką Miskatonic` : undefined,
          secret: isNpc ? `Sekret NPC ${i}: brał udział w rytuale sabatu w Górach Czarnych` : undefined,
          statsSummary: isNpc ? `Siła 50, Zręczność 60, Poczytalność ${30 + (i % 50)}%` : undefined,
          locationId: isLoc ? `loc-${i}` : undefined,
          npcIds: isNpc ? [`npc-${i}`] : undefined,
        });
      }

      // 2. Poszlaki
      const clues: AdventureClue[] = [];
      for (let i = 0; i < totalClues; i++) {
        const targetIdx = 1 + (i % (totalNodes - 1));
        const sourceIdx = (targetIdx + totalNodes - 2) % totalNodes;
        const sourceType = clueSourceTypes[i % clueSourceTypes.length];
        const clueType = clueTypes[i % clueTypes.length];

        const clueId = `clue-giant-${i}`;
        clues.push({
          id: clueId,
          name: `Poszlaka dowodowa #${i} (${sourceType})`,
          description: `Dokładny opis śladu numer ${i}: analiza laboratoryjna, zeznanie pod przysięgą lub starożytna gliniana tabliczka.`,
          sourceType,
          clueType,
          targetNodeId: `node-${targetIdx}`,
          sourceNodeId: `node-${sourceIdx}`,
          requiredSkill: i % 3 === 0 ? 'Spostrzegawczość' : i % 3 === 1 ? 'Archeologia' : 'Medycyna',
          isRedHerring: i % 7 === 0,
          isSynthesized: i % 11 === 0,
        });

        // Powiązanie w węzłach
        nodes[sourceIdx].leadOutClueIds.push(clueId);
        nodes[targetIdx].leadInClueIds.push(clueId);
      }

      // 3. Połączenia
      const connections: GraphConnection[] = [];
      for (let i = 0; i < totalConnections; i++) {
        const clue = clues[i % totalClues];
        connections.push({
          fromId: clue.sourceNodeId || 'node-0',
          toId: clue.targetNodeId || 'node-1',
          clueId: clue.id,
          description: `Połączenie śledcze ${i}: trop prowadzi z ${clue.sourceNodeId} do ${clue.targetNodeId}`,
        });
      }

      const graph: AdventureGraph = {
        nodes,
        clues,
        connections,
        npcs: [],
        locations: [],
      };

      return {
        id: 'giant-adv-stress-100',
        title: 'Gigantyczna Kampania w Arkham (120 węzłów, 350 poszlak)',
        era: 'classic',
        eraLabel: 'Klasyczne lata 20.',
        yearRange: '1928',
        location: 'Arkham i Dolina Miskatonic',
        country: 'USA',
        tone: 'purist',
        themes: ['mitologia cthulhu', 'obłęd', 'śledztwo wielowątkowe', 'starożytne sekrety'],
        suggestedOccupations: ['detektyw', 'profesor', 'dziennikarz', 'lekarz'],
        suggestedArchetypes: ['investigator', 'scholar'],
        hook: 'Seria tajemniczych zaginięć w bibliotece Miskatonic prowadzi do wielowątkowego śledztwa obejmującego całe hrabstwo Essex.',
        description: 'Monumentalna kampania testowa dla silnika grafu The Alexandrian Canon.',
        estimatedSessions: '10-12',
        playerCount: '3-5',
        difficulty: 'hard',
        isCustom: true,
        pdfUrl: '',
        geminiFileUri: '',
        fileName: 'arkham_giant_campaign.pdf',
        uploadedAt: new Date().toISOString(),
        isAnalyzed: true,
        graph,
        documentType: 'campaign',
      };
    }

    it('normalizuje gigantyczny graf w czasie poniżej 150ms bez utraty danych', () => {
      const giantAdv = generateGiantAdventure();
      expect(giantAdv.graph?.nodes).toHaveLength(120);
      expect(giantAdv.graph?.clues).toHaveLength(350);
      expect(giantAdv.graph?.connections).toHaveLength(450);

      const startTime = performance.now();
      const normalized = normalizeAdventureGraph(giantAdv.graph);
      const durationMs = performance.now() - startTime;

      expect(durationMs).toBeLessThan(150);
      expect(normalized.nodes).toHaveLength(120);
      expect(normalized.clues).toHaveLength(350);
      expect(normalized.connections).toHaveLength(450);

      // Sprawdzenie rzutowania wstecznego dla ochrony UI
      expect(normalized.locations.length).toBeGreaterThan(50);
      expect(normalized.npcs.length).toBeGreaterThan(20);

      // Sprawdzenie zachowania wszystkich atrybutów węzłów
      const climaxNode = normalized.nodes.find((n) => n.id === 'node-118');
      expect(climaxNode).toBeDefined();
      expect(climaxNode?.type).toBe('climax');
      expect(climaxNode?.isClimax).toBe(true);
      expect(climaxNode?.leadInClueIds.length).toBeGreaterThan(0);
    });

    it('kompresuje i dekompresuje gigantyczny graf z wysokim współczynnikiem kompresji', async () => {
      const giantAdv = generateGiantAdventure();
      const { leanAdv, heavyData, hasHeavy } = sanitizeCustomAdventureForStorage(giantAdv);

      expect(hasHeavy).toBe(true);
      expect(heavyData.graph?.nodes).toHaveLength(120);
      expect(leanAdv.graph?.nodes).toEqual([]); // leanAdv bezpieczny dla localStorage

      const rawJson = JSON.stringify(heavyData);
      const rawBytesLength = Buffer.byteLength(rawJson, 'utf8');

      // Kompresja gzip
      const compressed = await compressPayload(heavyData);
      expect(compressed).not.toBeNull();
      expect(compressed instanceof Uint8Array).toBe(true);

      const compressedLength = (compressed as Uint8Array).length;
      const compressionRatio = rawBytesLength / compressedLength;

      // Sprawdzamy kompresję: gzip powinien zmniejszyć payload min. 3x
      expect(compressionRatio).toBeGreaterThan(3);

      // Dekompresja
      const decompressed = await decompressPayload<typeof heavyData>(compressed as Uint8Array);
      expect(decompressed).not.toBeNull();
      expect(decompressed?.graph?.nodes).toHaveLength(120);
      expect(decompressed?.graph?.clues).toHaveLength(350);
      expect(decompressed?.graph?.connections).toHaveLength(450);

      // Rekonstrukcja
      const reconstructed = await reconstructAdventure({
        id: giantAdv.id,
        adventure: leanAdv,
        compressedPayload: compressed as Uint8Array,
        isCompressed: true,
        updatedAt: Date.now(),
      });

      expect(reconstructed.graph?.nodes).toHaveLength(120);
      expect(reconstructed.graph?.clues).toHaveLength(350);
      expect(reconstructed.graph?.connections).toHaveLength(450);
      expect(reconstructed.graph?.locations.length).toBeGreaterThan(50);
      expect(reconstructed.graph?.npcs.length).toBeGreaterThan(20);
    });

    it('pełny roundtrip zapisu i odczytu gigantycznej przygody w IndexedDB', async () => {
      const giantAdv = generateGiantAdventure();
      await saveAdventureRecord(giantAdv);

      const loaded = await loadAdventureRecord(giantAdv.id);
      expect(loaded).not.toBeNull();
      expect(loaded?.title).toBe(giantAdv.title);
      expect(loaded?.graph?.nodes).toHaveLength(120);
      expect(loaded?.graph?.clues).toHaveLength(350);
      expect(loaded?.graph?.connections).toHaveLength(450);

      // Weryfikacja integralności konkretnych danych
      const sampleNode = loaded?.graph?.nodes?.find((n) => n.id === 'node-50');
      expect(sampleNode).toBeDefined();
      expect(sampleNode?.name).toContain('Węzeł śledczy #50');
      expect(sampleNode?.leadInClueIds.length).toBeGreaterThan(0);

      await deleteAdventureRecord(giantAdv.id);
    });
  });

  describe('3. Odporność na uszkodzone i wrogie dane (Adversarial Data Resilience)', () => {
    it('decompressPayload zwraca null dla uciętych i uszkodzonych bajtów gzip bez rzucania wyjkiem unhandled', async () => {
      // 1. Pusty bufor
      expect(await decompressPayload(new Uint8Array([]))).toBeNull();

      // 2. Losowe śmieciowe bajty
      const randomGarbage = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0]);
      expect(await decompressPayload(randomGarbage)).toBeNull();

      // 3. Prawidłowy nagłówek gzip, ale ucięty korpus
      const validGzipHeaderTruncated = new Uint8Array([0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00]);
      expect(await decompressPayload(validGzipHeaderTruncated)).toBeNull();

      // 4. Uszkodzony Base64
      expect(await decompressPayload('not-valid-base64-!@#$%^&*()')).toBeNull();

      // 5. Niepoprawny JSON w stringu
      expect(await decompressPayload('{ "brokenJson": ')).toBeNull();
    });

    it('węzeł typu location z npcIds nie rzutuje do npcs atrap postaci', () => {
      const g = normalizeAdventureGraph({
        nodes: [
          {
            id: 'node-loc-library',
            name: 'Biblioteka Orne',
            type: 'location',
            description: 'Zabytkowy budynek uczelniany',
            leadInClueIds: [],
            leadOutClueIds: [],
            npcIds: ['npc-armitage'],
          },
        ],
      });

      expect(g.npcs).toHaveLength(0);
    });

    it('normalizeAdventureGraph bezpiecznie obsługuje gdy raw.nodes zawiera null lub element niebędący obiektem', () => {
      let res!: AdventureGraph;
      expect(() => {
        res = normalizeAdventureGraph({
          nodes: [null],
        });
      }).not.toThrow();
      expect(res.nodes).toEqual([]);
    });

    it('normalizeAdventureGraph bezpiecznie obsługuje gdy raw.clues zawiera null', () => {
      let res!: AdventureGraph;
      expect(() => {
        res = normalizeAdventureGraph({
          nodes: [],
          clues: [null],
        });
      }).not.toThrow();
      expect(res.clues).toEqual([]);
    });

    it('normalizeAdventureGraph bezpiecznie obsługuje gdy raw.connections zawiera null', () => {
      let res!: AdventureGraph;
      expect(() => {
        res = normalizeAdventureGraph({
          nodes: [],
          connections: [null],
        });
      }).not.toThrow();
      expect(res.connections).toEqual([]);
    });

    it('normalizeAdventureGraph bezpiecznie obsługuje gdy raw.npcs zawiera null', () => {
      let res!: AdventureGraph;
      expect(() => {
        res = normalizeAdventureGraph({
          nodes: [],
          npcs: [null],
        });
      }).not.toThrow();
      expect(res.npcs).toEqual([]);
    });

    it('normalizeAdventureGraph bezpiecznie obsługuje gdy raw.locations zawiera null', () => {
      let res!: AdventureGraph;
      expect(() => {
        res = normalizeAdventureGraph({
          nodes: [],
          locations: [null],
        });
      }).not.toThrow();
      expect(res.locations).toEqual([]);
    });

    it('normalizeAdventureGraph radzi sobie z obiektami węzłów posiadającymi niepoprawne typy pól (po odfiltrowaniu null)', () => {
      const hostileGraph = {
        nodes: [
          {},
          { id: null as unknown as string, name: undefined, type: 'NIEZNANY_TYP' as unknown as AdventureNodeType },
          { id: 'node-weird', leadInClueIds: 'nie-jestem-tablica' as unknown as string[], leadOutClueIds: 12345 as unknown as string[] },
          { id: 'node-numbers', isBottleneck: 'tak' as unknown as boolean, isClimax: 1 as unknown as boolean },
          { id: 'node-deep', npcIds: 'nie-tablica' as unknown as string[] },
        ],
        clues: [
          {},
          { id: 'clue-orphan', targetNodeId: null as unknown as string, sourceNodeId: undefined },
        ],
        connections: [
          {},
          { fromId: null as unknown as string, toId: undefined, clueId: null as unknown as string },
        ],
      };

      const normalized = normalizeAdventureGraph(hostileGraph);

      expect(normalized).toBeDefined();
      expect(Array.isArray(normalized.nodes)).toBe(true);
      expect(Array.isArray(normalized.clues)).toBe(true);
      expect(Array.isArray(normalized.connections)).toBe(true);

      for (const node of normalized.nodes) {
        expect(Array.isArray(node.leadInClueIds)).toBe(true);
        expect(Array.isArray(node.leadOutClueIds)).toBe(true);
        expect(typeof node.id).toBe('string');
        expect(typeof node.name).toBe('string');
      }

      for (const clue of normalized.clues) {
        expect(typeof clue.id).toBe('string');
        expect(typeof clue.name).toBe('string');
      }
    });

    it('reconstructAdventure radzi sobie z uszkodzonym rekordem z isCompressed: true i pustym payloadem', async () => {
      const brokenRecord = {
        id: 'broken-rec-1',
        adventure: {
          id: 'broken-rec-1',
          title: 'Uszkodzona przygoda',
          graph: { nodes: [], clues: [], connections: [], npcs: [], locations: [] },
        } as unknown as CustomAdventure,
        compressedPayload: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
        isCompressed: true,
        updatedAt: Date.now(),
      };

      // Powinno bezpiecznie powrócić do hydrated adventure bez rzucania wyjątku
      const reconstructed = await reconstructAdventure(brokenRecord);
      expect(reconstructed).toBeDefined();
      expect(reconstructed.id).toBe('broken-rec-1');
      expect(reconstructed.graph?.nodes).toEqual([]);
    });

    it('hydrateLeanAdventure zabezpiecza brakujące pola grafu przy pustym obiekcie', () => {
      const hydrated = hydrateLeanAdventure({ id: 'lean-empty' });
      expect(hydrated.graph).toEqual({
        nodes: [],
        clues: [],
        connections: [],
        npcs: [],
        locations: [],
      });
    });
  });
});
