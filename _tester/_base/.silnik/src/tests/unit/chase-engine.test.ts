/**
 * @file chase-engine.test.ts
 * Testy jednostkowe deterministycznego silnika pościgów CoC 7e RAW (chase-engine.ts).
 */

import {
  calculateChaseActionPoints,
  createChaseState,
  executePlayerManeuver,
  executePursuerTurns,
  formatChaseForChat,
  formatChaseForSystemContext,
  DEFAULT_CHASE_HAZARDS,
  type ChaseParticipant,
} from '@/lib/chase/chase-engine';

describe('chase-engine (CoC 7e RAW)', () => {
  describe('Kalkulacja punktów akcji (MOV)', () => {
    it('Najwolniejszy uczestnik ma 1 akcję, szybsi 1 + diff', () => {
      // Badacz MOV 7, Potwór MOV 9, Pies gończy MOV 10
      const participants = [{ mov: 7 }, { mov: 9 }, { mov: 10 }];
      const points = calculateChaseActionPoints(participants);

      expect(points[0]).toBe(1); // 7 - 7 + 1 = 1
      expect(points[1]).toBe(3); // 9 - 7 + 1 = 3
      expect(points[2]).toBe(4); // 10 - 7 + 1 = 4
    });

    it('Równy MOV oznacza po 1 akcji dla wszystkich', () => {
      const participants = [{ mov: 8 }, { mov: 8 }, { mov: 8 }];
      const points = calculateChaseActionPoints(participants);

      expect(points).toEqual([1, 1, 1]);
    });
  });

  describe('Inicjalizacja pościgu (createChaseState)', () => {
    it('Inicjuje poprawny stan toru, segmentów i dystansu początkowego', () => {
      const fleeing = {
        id: 'player_1',
        name: 'Badacz',
        isPlayer: true,
        mov: 8,
        segmentIndex: 1,
      };
      const pursuers = [
        {
          id: 'cultist_1',
          name: 'Kultysta',
          isPlayer: false,
          mov: 8,
          segmentIndex: 0,
        },
      ];

      const state = createChaseState({
        fleeing,
        pursuers,
        initialDistance: 2,
        trackLength: 8,
      });

      expect(state.status).toBe('ongoing');
      expect(state.round).toBe(1);
      expect(state.segments.length).toBe(8);

      const pFleeing = state.participants.find((p) => p.isFleeing);
      const pPursuer = state.participants.find((p) => !p.isFleeing);

      expect(pFleeing?.segmentIndex).toBe(2);
      expect(pPursuer?.segmentIndex).toBe(0);
      expect(pFleeing?.actionsTotal).toBe(1);
      expect(pPursuer?.actionsTotal).toBe(1);
    });
  });

  describe('Manewry uciekającego gracza', () => {
    const baseFleeing = {
      id: 'player_1',
      name: 'Badacz',
      isPlayer: true,
      mov: 9,
      segmentIndex: 1,
    };
    const basePursuer = {
      id: 'cultist_1',
      name: 'Kultysta',
      isPlayer: false,
      mov: 8,
      segmentIndex: 0,
    };

    it('Sprint przesuwa gracza o 1 segment i zużywa 1 punkt akcji', () => {
      const state = createChaseState({
        fleeing: baseFleeing,
        pursuers: [basePursuer],
        initialDistance: 1,
        hazardPositions: {},
      });

      const { nextState, log } = executePlayerManeuver(state, {
        type: 'sprint',
        actorId: 'player_1',
      });

      const player = nextState.participants.find((p) => p.isPlayer);
      expect(player?.segmentIndex).toBe(2);
      expect(player?.actionsRemaining).toBe(1); // 9 vs 8 -> 2 akcje bazowe - 1 = 1
      expect(log.actionName).toBe('Sprint');
      expect(nextState.logs.length).toBe(1);
    });

    it('Udane forsowanie przeszkody przesuwa gracza o 1 segment', () => {
      const state = createChaseState({
        fleeing: baseFleeing,
        pursuers: [basePursuer],
        initialDistance: 2,
        hazardPositions: { 2: DEFAULT_CHASE_HAZARDS.fence },
      });

      const { nextState, log } = executePlayerManeuver(state, {
        type: 'clear_hazard',
        actorId: 'player_1',
        rollOutcome: 'regular',
      });

      const player = nextState.participants.find((p) => p.isPlayer);
      expect(player?.segmentIndex).toBe(3);
      expect(log.success).toBe(true);
    });

    it('Porażka w forsowaniu przeszkody zatrzymuje gracza na miejscu', () => {
      const state = createChaseState({
        fleeing: baseFleeing,
        pursuers: [basePursuer],
        initialDistance: 2,
        hazardPositions: { 2: DEFAULT_CHASE_HAZARDS.fence },
      });

      const { nextState, log } = executePlayerManeuver(state, {
        type: 'clear_hazard',
        actorId: 'player_1',
        rollOutcome: 'fail',
      });

      const player = nextState.participants.find((p) => p.isPlayer);
      expect(player?.segmentIndex).toBe(2);
      expect(log.success).toBe(false);
    });

    it('Brawurowy skrót przy sukcesie daje +2 segmenty', () => {
      const state = createChaseState({
        fleeing: baseFleeing,
        pursuers: [basePursuer],
        initialDistance: 1,
        hazardPositions: {},
      });

      const { nextState, log } = executePlayerManeuver(state, {
        type: 'shortcut',
        actorId: 'player_1',
        rollOutcome: 'hard',
      });

      const player = nextState.participants.find((p) => p.isPlayer);
      expect(player?.segmentIndex).toBe(3); // 1 + 2 = 3
      expect(log.success).toBe(true);
    });

    it('Zastawienie przeszkody z tyłu tworzy barierę na poprzednim segmencie', () => {
      const state = createChaseState({
        fleeing: baseFleeing,
        pursuers: [basePursuer],
        initialDistance: 3,
        hazardPositions: {},
      });

      const { nextState } = executePlayerManeuver(state, {
        type: 'create_barrier',
        actorId: 'player_1',
        customDescription: 'Przewrócone skrzynie z rybami',
      });

      expect(nextState.segments[2]?.hazard).toBeTruthy();
      expect(nextState.segments[2]?.hazard?.name).toBe('Przewrócone skrzynie z rybami');
    });

    it('Udany test ukrycia natychmiast kończy pościg ucieczką', () => {
      const state = createChaseState({
        fleeing: baseFleeing,
        pursuers: [basePursuer],
        initialDistance: 1,
        hazardPositions: {},
      });

      const { nextState } = executePlayerManeuver(state, {
        type: 'hide',
        actorId: 'player_1',
        rollOutcome: 'extreme',
      });

      expect(nextState.status).toBe('escaped');
      const player = nextState.participants.find((p) => p.isPlayer);
      expect(player?.isEscaped).toBe(true);
    });
  });

  describe('Rozstrzyganie pościgu i tury pościgu', () => {
    it('Ścigający dogania uciekającego -> stan caught', () => {
      const state = createChaseState({
        fleeing: {
          id: 'p1',
          name: 'Badacz',
          isPlayer: true,
          mov: 7,
          segmentIndex: 1,
        },
        pursuers: [
          {
            id: 'c1',
            name: 'Ogar z Tindalos',
            isPlayer: false,
            mov: 10,
            segmentIndex: 0,
          },
        ],
        initialDistance: 1,
        hazardPositions: {},
      });

      // Uciekający wykonuje akcję
      const { nextState: stateAfterPlayer } = executePlayerManeuver(state, {
        type: 'sprint',
        actorId: 'p1',
      });
      // Player na segmencie 2

      // Tura pościgu (Ogar ma 1 + (10 - 7) = 4 punkty akcji!)
      const { nextState: finalState } = executePursuerTurns(stateAfterPlayer);

      expect(finalState.status).toBe('caught');
      const player = finalState.participants.find((p) => p.isPlayer);
      expect(player?.isCaught).toBe(true);
    });

    it('Zwiększenie dystansu do progu ucieczki -> stan escaped', () => {
      const state = createChaseState({
        fleeing: {
          id: 'p1',
          name: 'Badacz',
          isPlayer: true,
          mov: 9,
          segmentIndex: 3,
        },
        pursuers: [
          {
            id: 'c1',
            name: 'Kultysta',
            isPlayer: false,
            mov: 7,
            segmentIndex: 0,
          },
        ],
        initialDistance: 3,
        escapeDistanceThreshold: 4,
        hazardPositions: {},
      });

      // Badacz sprintuje z 3 na 4 segment (dystans = 4 >= threshold)
      const { nextState } = executePlayerManeuver(state, {
        type: 'sprint',
        actorId: 'p1',
      });

      expect(nextState.status).toBe('escaped');
    });
  });

  describe('Formatowanie do czatu i kontekstu AI MG', () => {
    it('formatChaseForChat generuje czytelny status pościgu', () => {
      const state = createChaseState({
        fleeing: { id: 'p1', name: 'Badacz', isPlayer: true, mov: 8, segmentIndex: 2 },
        pursuers: [{ id: 'c1', name: 'Kultysta', isPlayer: false, mov: 8, segmentIndex: 0 }],
        initialDistance: 2,
      });

      const text = formatChaseForChat(state);
      expect(text).toContain('POŚCIG (CoC 7e RAW)');
      expect(text).toContain('**Dystans do pościgu:** 2 lokacje');
    });

    it('formatChaseForSystemContext zwraca poprawny JSON', () => {
      const state = createChaseState({
        fleeing: { id: 'p1', name: 'Badacz', isPlayer: true, mov: 8, segmentIndex: 2 },
        pursuers: [{ id: 'c1', name: 'Kultysta', isPlayer: false, mov: 8, segmentIndex: 0 }],
        initialDistance: 2,
      });

      const json = formatChaseForSystemContext(state);
      const parsed = JSON.parse(json);
      expect(parsed.type).toBe('chase_engine_update');
      expect(parsed.status).toBe('ongoing');
      expect(parsed.distanceToPursuers).toBe(2);
    });
  });
});
