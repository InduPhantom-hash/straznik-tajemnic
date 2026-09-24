import {
  dispatchWorldEngines,
  extractIntentFeatures,
  ALL_WORLD_ENGINES,
  type DispatcherInput,
} from '@/lib/world-engine/dispatcher';
import { buildWorldEngineDirectives } from '@/lib/world-engine/adapter';

describe('World Engine Dispatcher & Selective RAG Staging (Issue #506)', () => {
  const mockNPCs = [
    { id: 'npc-armitage', name: 'Dr Henry Armitage', aliases: ['Armitage', 'Bibliotekarz'] },
    { id: 'npc-zadok', name: 'Zadok Allen', aliases: ['Zadok', 'Starzec'] },
  ];

  const mockLocations = [
    { id: 'loc-cellar', name: 'Piwnica' },
    { id: 'loc-docks', name: 'Doki' },
  ];

  const mockPuzzles = [
    { id: 'puz-journal', title: 'Ukryty dziennik kultysty' },
  ];

  describe('10 Scenariuszy deklaracji gracza (Macierz akceptacyjna)', () => {
    // 1. Dialog z NPC
    it('1. Dialog z NPC: aktywuje npc i sensory, deaktywuje geography i occult', () => {
      const decision = dispatchWorldEngines({
        playerMessage: 'Dzień dobry panie Armitage, co pan wie o księdze w zamkniętym dziale?',
        npcs: mockNPCs,
      });

      expect(decision.activeEngines.npc).toBe(true);
      expect(decision.activeEngines.sensory).toBe(true);
      expect(decision.activeEngines.geography).toBe(false);
      expect(decision.activeEngines.occult).toBe(false);
      expect(decision.recipientIds).toContain('npc-armitage');
    });

    // 2. Obserwacja zmysłowa
    it('2. Obserwacja zmysłowa: aktywuje sensory, deaktywuje geography, occult i npc', () => {
      const decision = dispatchWorldEngines({
        playerMessage: 'Zamykam oczy i wsłuchuję się w dźwięki dochodzące zza ściany.',
        npcs: mockNPCs,
      });

      expect(decision.activeEngines.sensory).toBe(true);
      expect(decision.activeEngines.npc).toBe(false);
      expect(decision.activeEngines.geography).toBe(false);
      expect(decision.activeEngines.occult).toBe(false);
    });

    // 3. Zejście do podziemi
    it('3. Zejście do podziemi: aktywuje geography i sensory, deaktywuje npc, occult i friction', () => {
      const decision = dispatchWorldEngines({
        playerMessage: 'Schodzę ostrożnie po spróchniałych schodach do ciemnej piwnicy pod dokami.',
        locations: mockLocations,
      });

      expect(decision.activeEngines.geography).toBe(true);
      expect(decision.activeEngines.sensory).toBe(true);
      expect(decision.activeEngines.npc).toBe(false);
      expect(decision.activeEngines.occult).toBe(false);
      expect(decision.activeEngines.friction).toBe(false);
      expect(decision.sceneEntityIds).toContain('loc-cellar');
    });

    // 4. Rytuał okultystyczny
    it('4. Rytuał okultystyczny: aktywuje occult i sensory, deaktywuje geography i friction', () => {
      const decision = dispatchWorldEngines({
        playerMessage: 'Rysuję kredą symbol Starszych Znaków i zaczynam recytować inkantację.',
      });

      expect(decision.activeEngines.occult).toBe(true);
      expect(decision.activeEngines.sensory).toBe(true);
      expect(decision.activeEngines.geography).toBe(false);
      expect(decision.activeEngines.friction).toBe(false);
    });

    // 5. Wypytywanie o nastroje/plotki
    it('5. Wypytywanie o nastroje/plotki: aktywuje friction, npc i sensory, deaktywuje geography i occult', () => {
      const decision = dispatchWorldEngines({
        playerMessage: 'Pytam gazeciarza na rogu, o czym szepczą robotnicy po wczorajszym strajku.',
        npcs: [{ id: 'npc-newsboy', name: 'Gazeciarz' }],
      });

      expect(decision.activeEngines.friction).toBe(true);
      expect(decision.activeEngines.npc).toBe(true);
      expect(decision.activeEngines.sensory).toBe(true);
      expect(decision.activeEngines.geography).toBe(false);
      expect(decision.activeEngines.occult).toBe(false);
      expect(decision.recipientIds).toContain('npc-newsboy');
    });

    // 6. Przeszukanie biurka
    it('6. Przeszukanie biurka: aktywuje clue i sensory, deaktywuje geography, occult i npc', () => {
      const decision = dispatchWorldEngines({
        playerMessage: 'Przeszukuję dokładnie szuflady biurka w poszukiwaniu ukrytego schowka lub listu.',
        puzzles: mockPuzzles,
      });

      expect(decision.activeEngines.clue).toBe(true);
      expect(decision.activeEngines.sensory).toBe(true);
      expect(decision.activeEngines.geography).toBe(false);
      expect(decision.activeEngines.occult).toBe(false);
      expect(decision.activeEngines.npc).toBe(false);
      expect(decision.sceneEntityIds).toContain('puz-journal');
    });

    // 7. Impas poznawczy
    it('7. Impas poznawczy: aktywuje graph, clue i sensory, deaktywuje geography i occult', () => {
      const decision = dispatchWorldEngines({
        playerMessage: 'Nie wiem co dalej robić, przejrzyjmy dostępne poszlaki i ustalmy kolejny krok.',
      });

      expect(decision.activeEngines.graph).toBe(true);
      expect(decision.activeEngines.clue).toBe(true);
      expect(decision.activeEngines.sensory).toBe(true);
      expect(decision.activeEngines.geography).toBe(false);
      expect(decision.activeEngines.occult).toBe(false);
    });

    // 8. Przeprawa wodna
    it('8. Przeprawa wodna: aktywuje geography i sensory, deaktywuje occult i friction', () => {
      const decision = dispatchWorldEngines({
        playerMessage: 'Wsiadam do łodzi i płynę w dół rzeki Manuxet w stronę mglistego portu.',
      });

      expect(decision.activeEngines.geography).toBe(true);
      expect(decision.activeEngines.sensory).toBe(true);
      expect(decision.activeEngines.occult).toBe(false);
      expect(decision.activeEngines.friction).toBe(false);
    });

    // 9. Pusta deklaracja / spacje
    it('9. Pusta deklaracja: bezpieczny fallback [sensory], zerowe wyjątki', () => {
      const decisionEmpty = dispatchWorldEngines({ playerMessage: '' });
      expect(decisionEmpty.activeEngineIds).toEqual(['sensory']);
      expect(decisionEmpty.activeEngines.sensory).toBe(true);
      expect(decisionEmpty.activeEngines.npc).toBe(false);
      expect(decisionEmpty.activeEngines.geography).toBe(false);

      const decisionSpaces = dispatchWorldEngines({ playerMessage: '    ' });
      expect(decisionSpaces.activeEngineIds).toEqual(['sensory']);

      const decisionNull = dispatchWorldEngines({ playerMessage: null });
      expect(decisionNull.activeEngineIds).toEqual(['sensory']);
    });

    // 10. Złożona akcja wieloaspektowa
    it('10. Akcja wieloaspektowa: poprawnie aktywuje npc, geography, occult i sensory', () => {
      const decision = dispatchWorldEngines({
        playerMessage: 'Rozmawiam z Zadokiem w piwnicy o mrocznym rytuale kultu Dagona.',
        npcs: mockNPCs,
        locations: mockLocations,
      });

      expect(decision.activeEngines.npc).toBe(true);
      expect(decision.activeEngines.geography).toBe(true);
      expect(decision.activeEngines.occult).toBe(true);
      expect(decision.activeEngines.sensory).toBe(true);
      expect(decision.recipientIds).toContain('npc-zadok');
      expect(decision.sceneEntityIds).toContain('loc-cellar');
    });
  });

  describe('Kryteria Akceptacji SLA i Redukcji Promptu (Issue #506)', () => {
    it('SLA Latencji CPU: czas decyzji wynosi < 30 ms (test 100 iteracji)', () => {
      const input: DispatcherInput = {
        playerMessage: 'Rozmawiam z doktorem Armitage o tajemniczym tomie w gabinecie.',
        npcs: mockNPCs,
      };

      const latencies: number[] = [];
      // Warmup
      dispatchWorldEngines(input);

      for (let i = 0; i < 100; i++) {
        const res = dispatchWorldEngines(input);
        latencies.push(res.latencyMs);
      }

      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);

      // Średnia musi być zdecydowanie < 30 ms (w praktyce < 1 ms)
      expect(avgLatency).toBeLessThan(30);
      expect(maxLatency).toBeLessThan(30);
    });

    it('Redukcja System Promptu: min. 35% oszczędności w turach spokojnych/dialogowych', () => {
      const baseParams = {
        locale: 'pl' as const,
        adventureContext: {
          title: 'Cień nad Innsmouth',
          location: 'Innsmouth',
          themes: ['tajemnica', 'okultyzm'],
          conflicts: [
            {
              tensionType: 'class' as const,
              description: 'Napięcie między mieszkańcami a przybyszami',
              resource: 'Praca w przetwórni',
            },
          ],
          puzzles: [
            {
              id: 'puz-1',
              title: 'Złota tiara',
              solutionSummary: 'Pochodzenie z głębin',
            },
          ],
          graph: {
            nodes: [{ id: 'climax', label: 'Ucieczka z hotelu Gilman', isBottleneck: true }],
          },
        },
        currentLocation: 'Gabinet dyrektora',
        npcs: [
          {
            id: 'armitage',
            name: 'Dr Henry Armitage',
            occupation: 'Bibliotekarz',
            description: 'Starszy mężczyzna w okularach',
          },
        ] as unknown as import('@/lib/types').NPC[],
        playerMessage: 'Dzień dobry panie doktorze, czy ma pan chwilę na rozmowę?',
      };

      // 1. Bez dyspozytora: wszystkie silniki są aktywowane
      const fullDirectives = buildWorldEngineDirectives(baseParams);

      // 2. Z dyspozytorem: tylko niezbędne silniki (dialog -> npc + sensory)
      const decision = dispatchWorldEngines({
        playerMessage: baseParams.playerMessage,
        npcs: [{ id: 'armitage', name: 'Dr Henry Armitage' }],
      });
      const optimizedDirectives = buildWorldEngineDirectives({
        ...baseParams,
        activeEngines: decision.activeEngines,
      });

      expect(fullDirectives.length).toBeGreaterThan(0);
      expect(optimizedDirectives.length).toBeGreaterThan(0);

      const lengthReductionPercent =
        ((fullDirectives.length - optimizedDirectives.length) / fullDirectives.length) * 100;

      // Kryterium akceptacji: min. 35% skrócenia
      expect(lengthReductionPercent).toBeGreaterThanOrEqual(35);
    });

    it('Selektywny Staging RAG: zawęża allowedNamespaces do sessions i adventures w turach bez okultyzmu', () => {
      const decision = dispatchWorldEngines({
        playerMessage: 'Dzień dobry, poproszę herbatę i gazetę poranną.',
      });

      expect(decision.allowedNamespaces).toEqual(['sessions', 'adventures']);
    });
  });
});
