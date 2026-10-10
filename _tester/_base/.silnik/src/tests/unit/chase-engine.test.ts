/**
 * @file chase-engine.test.ts
 * Testy jednostkowe deterministycznego silnika pościgów CoC 7e RAW (chase-engine.ts).
 */

import {
  calculateChaseActionPoints,
  createChaseState,
  createInitialChaseFromTag,
  advanceChaseOnSkillRoll,
  executePlayerManeuver,
  executePursuerTurns,
  formatChaseForChat,
  formatChaseForSystemContext,
  DEFAULT_CHASE_HAZARDS,
  adjustedChaseMov,
  speedRollOutcomeFromCheck,
} from '@/lib/chase/chase-engine';
import {
  extractChaseTag,
  extractChaseEndTag,
} from '@/lib/parsers/event-parser';

describe('chase-engine (CoC 7e RAW)', () => {
  describe('Kalkulacja punktów akcji (MOV)', () => {
    it('Speed roll koryguje MOV o -1/0/+1 na czas pościgu', () => {
      expect(adjustedChaseMov(8, 'fail')).toBe(7);
      expect(adjustedChaseMov(8, 'regular')).toBe(8);
      expect(adjustedChaseMov(8, 'extreme')).toBe(9);
    });
    it('Mapuje pełny wynik testu szybkości na modyfikator MOV RAW', () => {
      expect(speedRollOutcomeFromCheck('critical')).toBe('extreme');
      expect(speedRollOutcomeFromCheck('hard')).toBe('regular');
      expect(speedRollOutcomeFromCheck('fumble')).toBe('fail');
    });
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

    it('Ustala stabilną kolejność tur według DEX', () => {
      const state = createChaseState({
        fleeing: {
          id: 'player_1',
          name: 'Badacz',
          isPlayer: true,
          mov: 8,
          dex: 55,
          segmentIndex: 2,
        },
        pursuers: [
          {
            id: 'cultist_1',
            name: 'Kultysta',
            isPlayer: false,
            mov: 8,
            dex: 40,
            segmentIndex: 0,
          },
        ],
      });

      expect(state.turnOrder).toEqual(['player_1', 'cultist_1']);
      expect(state.activeActorId).toBe('player_1');
    });

    it('Uwzględnia wynik speed roll przed obliczeniem punktów akcji', () => {
      const state = createChaseState({
        fleeing: {
          id: 'player_1',
          name: 'Badacz',
          isPlayer: true,
          mov: 8,
          segmentIndex: 2,
        },
        pursuers: [
          {
            id: 'cultist_1',
            name: 'Kultysta',
            isPlayer: false,
            mov: 8,
            segmentIndex: 0,
          },
        ],
        fleeingSpeedRoll: 'extreme',
        pursuerSpeedRolls: { cultist_1: 'fail' },
      });

      expect(state.participants.map((participant) => participant.mov)).toEqual([
        9, 7,
      ]);
      expect(
        state.participants.map((participant) => participant.actionsTotal)
      ).toEqual([3, 1]);
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
        hazardPositions: { 3: DEFAULT_CHASE_HAZARDS.fence },
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
        hazardPositions: { 3: DEFAULT_CHASE_HAZARDS.fence },
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

    it('Zwykły sukces nie wystarcza na trudną przeszkodę', () => {
      const state = createChaseState({
        fleeing: baseFleeing,
        pursuers: [basePursuer],
        initialDistance: 2,
        hazardPositions: { 3: DEFAULT_CHASE_HAZARDS.traffic },
      });

      const { nextState, log } = executePlayerManeuver(state, {
        type: 'clear_hazard',
        actorId: 'player_1',
        rollOutcome: 'regular',
      });

      expect(log.success).toBe(false);
      expect(nextState.participants.find((p) => p.isPlayer)?.segmentIndex).toBe(
        2
      );
    });

    it('Porażka na hazardzie przepuszcza dalej z konsekwencją', () => {
      const state = createChaseState({
        fleeing: baseFleeing,
        pursuers: [basePursuer],
        initialDistance: 2,
        hazardPositions: { 3: DEFAULT_CHASE_HAZARDS.stairs },
      });

      const { nextState, log } = executePlayerManeuver(state, {
        type: 'clear_hazard',
        actorId: 'player_1',
        rollOutcome: 'fail',
      });

      expect(log.success).toBe(false);
      expect(log.details).toContain('1k3');
      expect(nextState.participants.find((p) => p.isPlayer)?.segmentIndex).toBe(
        3
      );
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
      expect(nextState.segments[2]?.hazard?.name).toBe(
        'Przewrócone skrzynie z rybami'
      );
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
    it('Rozlicza wcześniejszą turę ścigającego, gdy gracz ma niższy DEX', () => {
      const state = createChaseState({
        fleeing: {
          id: 'p1',
          name: 'Badacz',
          isPlayer: true,
          mov: 8,
          dex: 30,
          segmentIndex: 3,
        },
        pursuers: [
          {
            id: 'c1',
            name: 'Kultysta',
            isPlayer: false,
            mov: 8,
            dex: 60,
            segmentIndex: 0,
          },
        ],
        initialDistance: 3,
        hazardPositions: {},
      });

      expect(state.activeActorId).toBe('c1');
      const afterNpc = executePursuerTurns(state).nextState;
      expect(afterNpc.activeActorId).toBe('p1');
      expect(() =>
        executePlayerManeuver(afterNpc, { type: 'sprint', actorId: 'p1' })
      ).not.toThrow();
    });

    it('Porażka NPC na hazardzie przesuwa go dalej, a bariera go zatrzymuje', () => {
      const makeState = (hazard: typeof DEFAULT_CHASE_HAZARDS.crowd) =>
        createChaseState({
          fleeing: {
            id: 'p1',
            name: 'Badacz',
            isPlayer: true,
            mov: 8,
            dex: 30,
            segmentIndex: 3,
          },
          pursuers: [
            {
              id: 'c1',
              name: 'Kultysta',
              isPlayer: false,
              mov: 8,
              dex: 60,
              segmentIndex: 0,
            },
          ],
          initialDistance: 3,
          hazardPositions: { 1: hazard },
        });

      const afterHazard = executePursuerTurns(
        makeState(DEFAULT_CHASE_HAZARDS.crowd),
        {
          c1: ['fail'],
        }
      ).nextState;
      const afterBarrier = executePursuerTurns(
        makeState(DEFAULT_CHASE_HAZARDS.traffic),
        {
          c1: ['fail'],
        }
      ).nextState;

      expect(
        afterHazard.participants.find((p) => p.id === 'c1')?.segmentIndex
      ).toBe(1);
      expect(
        afterBarrier.participants.find((p) => p.id === 'c1')?.segmentIndex
      ).toBe(0);
    });

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

      expect(finalState.status).toBe('engaged');
      const player = finalState.participants.find((p) => p.isPlayer);
      expect(player?.isCaught).toBe(true);
    });

    it('Dystans sam w sobie nie kończy pościgu', () => {
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

      expect(nextState.status).toBe('ongoing');
    });
  });

  describe('Formatowanie do czatu i kontekstu AI MG', () => {
    it('formatChaseForChat generuje czytelny status pościgu', () => {
      const state = createChaseState({
        fleeing: {
          id: 'p1',
          name: 'Badacz',
          isPlayer: true,
          mov: 8,
          segmentIndex: 2,
        },
        pursuers: [
          {
            id: 'c1',
            name: 'Kultysta',
            isPlayer: false,
            mov: 8,
            segmentIndex: 0,
          },
        ],
        initialDistance: 2,
      });

      const text = formatChaseForChat(state);
      expect(text).toContain('**POŚCIG**');
      expect(text).toContain('**Pościg:** Słyszysz ich coraz bliżej.');
      expect(text).not.toContain('2 lokacje');
      expect(text).not.toContain('Runda 1');
    });

    it('formatChaseForSystemContext zwraca poprawny JSON', () => {
      const state = createChaseState({
        fleeing: {
          id: 'p1',
          name: 'Badacz',
          isPlayer: true,
          mov: 8,
          segmentIndex: 2,
        },
        pursuers: [
          {
            id: 'c1',
            name: 'Kultysta',
            isPlayer: false,
            mov: 8,
            segmentIndex: 0,
          },
        ],
        initialDistance: 2,
      });

      const json = formatChaseForSystemContext(state);
      const parsed = JSON.parse(json);
      expect(parsed.type).toBe('chase_engine_update');
      expect(parsed.status).toBe('ongoing');
      expect(parsed.distanceToPursuers).toBe(2);
      expect(json).not.toContain('Kultysta');
      expect(json).not.toContain('Badacz');
    });

    it('kontekst MG zawiera mechaniczną semantykę najbliższej przeszkody', () => {
      const state = createChaseState({
        fleeing: {
          id: 'p1',
          name: 'Badacz',
          isPlayer: true,
          mov: 8,
          segmentIndex: 2,
        },
        pursuers: [
          {
            id: 'c1',
            name: 'Kultysta',
            isPlayer: false,
            mov: 8,
            segmentIndex: 0,
          },
        ],
        initialDistance: 2,
        hazardPositions: { 3: DEFAULT_CHASE_HAZARDS.stairs },
      });

      expect(
        JSON.parse(formatChaseForSystemContext(state)).upcomingHazard
      ).toMatchObject({
        type: 'hazard',
        difficulty: 'trudny',
        damageOnFail: '1k3',
      });
    });
  });

  describe('Tryb Duet / Wielu uciekających badaczy', () => {
    it('Inicjuje stan z dwoma badaczami i sortuje kolejkę po DEX', () => {
      const state = createChaseState({
        fleeing: [
          {
            id: 'investigator_fast',
            name: 'Francis',
            isPlayer: true,
            mov: 9,
            dex: 70,
          },
          {
            id: 'investigator_slow',
            name: 'Margaret',
            isPlayer: true,
            mov: 7,
            dex: 40,
          },
        ],
        pursuers: [
          {
            id: 'beast',
            name: 'Ogar z Tindalos',
            isPlayer: false,
            mov: 10,
            dex: 60,
          },
        ],
        initialDistance: 2,
      });

      expect(state.participants.length).toBe(3);
      // Min MOV = 7 (Margaret). Margaret = 1 akcja, Francis = 1 + (9-7) = 3 akcje, Bestia = 1 + (10-7) = 4 akcje
      const margaret = state.participants.find((p) => p.id === 'investigator_slow');
      const francis = state.participants.find((p) => p.id === 'investigator_fast');
      const beast = state.participants.find((p) => p.id === 'beast');

      expect(margaret?.actionsTotal).toBe(1);
      expect(francis?.actionsTotal).toBe(3);
      expect(beast?.actionsTotal).toBe(4);

      // Turn order po DEX: Francis (70) -> Bestia (60) -> Margaret (40)
      expect(state.turnOrder).toEqual([
        'investigator_fast',
        'beast',
        'investigator_slow',
      ]);
      expect(state.activeActorId).toBe('investigator_fast');
    });

    it('Pozwala na manewr aktywnego badacza w jego turze i przekazuje turę dalej', () => {
      const state = createChaseState({
        fleeing: [
          {
            id: 'inv_1',
            name: 'Francis',
            isPlayer: true,
            mov: 8,
            dex: 80,
          },
          {
            id: 'inv_2',
            name: 'Margaret',
            isPlayer: true,
            mov: 8,
            dex: 30,
          },
        ],
        pursuers: [
          {
            id: 'cultist',
            name: 'Kultysta',
            isPlayer: false,
            mov: 8,
            dex: 50,
          },
        ],
        initialDistance: 2,
      });

      // Runda 1: Tura Francisa (DEX 80)
      const { nextState: afterFrancis } = executePlayerManeuver(state, {
        type: 'sprint',
        actorId: 'inv_1',
      });

      expect(afterFrancis.participants.find((p) => p.id === 'inv_1')?.segmentIndex).toBe(3);
      // Francis miał 1 akcję (MOV równy), po jej zużyciu aktywny staje się Kultysta (DEX 50)
      expect(afterFrancis.activeActorId).toBe('cultist');

      // Tura Kultysty
      const { nextState: afterCultist } = executePursuerTurns(afterFrancis);
      // Po turze Kultysty aktywna staje się Margaret (DEX 30)
      expect(afterCultist.activeActorId).toBe('inv_2');

      // Tura Margaret
      const { nextState: afterMargaret } = executePlayerManeuver(afterCultist, {
        type: 'sprint',
        actorId: 'inv_2',
      });
      expect(afterMargaret.participants.find((p) => p.id === 'inv_2')?.segmentIndex).toBe(3);
    });

    it('formatChaseForChat formatuje status dla każdego badacza w Duecie', () => {
      const state = createChaseState({
        fleeing: [
          {
            id: 'inv_1',
            name: 'Francis',
            isPlayer: true,
            mov: 8,
            dex: 80,
          },
          {
            id: 'inv_2',
            name: 'Margaret',
            isPlayer: true,
            mov: 8,
            dex: 30,
          },
        ],
        pursuers: [
          {
            id: 'cultist',
            name: 'Kultysta',
            isPlayer: false,
            mov: 8,
            dex: 50,
          },
        ],
        initialDistance: 2,
      });

      const reportPl = formatChaseForChat(state, undefined, 'pl');
      expect(reportPl).toContain('@Francis');
      expect(reportPl).toContain('@Margaret');

      const reportEn = formatChaseForChat(state, undefined, 'en');
      expect(reportEn).toContain('@Francis');
      expect(reportEn).toContain('@Margaret');
    });
  });

  describe('Mechanika Pościgów CoC 7e RAW (Issue #739)', () => {
    describe('Parser tagów pościgu (extractChaseTag & extractChaseEndTag)', () => {
      it('ekstrahuje tag rozpoczęcia pościgu pieszego z domyślnym dystansem', () => {
        const text = 'Słyszysz kroki za plecami! [POŚCIG: typ=pieszy | dystans=2 | wrog=Kultysta z nożem] Uciekaj!';
        const parsed = extractChaseTag(text);

        expect(parsed).not.toBeNull();
        expect(parsed?.type).toBe('pieszy');
        expect(parsed?.distance).toBe(2);
        expect(parsed?.opponent).toBe('Kultysta z nożem');
      });

      it('ekstrahuje tag pościgu kołowego', () => {
        const text = '[POŚCIG: kolowy | dystans=3 | wrog=Czarne auto gangsterów] Rzuć na gaz!';
        const parsed = extractChaseTag(text);

        expect(parsed).not.toBeNull();
        expect(parsed?.type).toBe('kolowy');
        expect(parsed?.distance).toBe(3);
        expect(parsed?.opponent).toBe('Czarne auto gangsterów');
      });

      it('ekstrahuje tag zakończenia pościgu', () => {
        const textUcieczka = 'Wpadasz w tłum na targu. [KONIEC_POŚCIGU: wynik=ucieczka] Jesteś bezpieczny.';
        const parsed1 = extractChaseEndTag(textUcieczka);
        expect(parsed1?.outcome).toBe('ucieczka');

        const textSchwytanie = '[KONIEC_POŚCIGU: wynik=schwytanie] Zimna dłoń chwyta cię za ramię.';
        const parsed2 = extractChaseEndTag(textSchwytanie);
        expect(parsed2?.outcome).toBe('schwytanie');

        const textWalka = '[KONIEC_POŚCIGU: wynik=walka] Nie masz dokąd uciec, stajesz do walki.';
        const parsed3 = extractChaseEndTag(textWalka);
        expect(parsed3?.outcome).toBe('walka');
      });
    });

    describe('createInitialChaseFromTag', () => {
      it('tworzy poprawny stan pościgu pieszego z MOV Badacza', () => {
        const chase = createInitialChaseFromTag({
          activeCharacter: {
            id: 'char_1',
            name: 'Edward',
            move: 9,
            dex: 60,
          },
          type: 'pieszy',
          initialDistance: 2,
          opponentName: 'Ghul',
        });

        expect(chase.status).toBe('ongoing');
        const player = chase.participants.find((p) => p.isPlayer);
        const pursuer = chase.participants.find((p) => !p.isPlayer);

        expect(player?.name).toBe('Edward');
        expect(player?.mov).toBe(9);
        expect(player?.segmentIndex).toBe(2);
        expect(pursuer?.name).toBe('Ghul');
        expect(pursuer?.segmentIndex).toBe(0);
        expect(chase.segments.length).toBe(5);
      });

      it('tworzy pościg kołowy z parametrami pojazdu', () => {
        const chase = createInitialChaseFromTag({
          type: 'kolowy',
          initialDistance: 3,
          opponentName: 'Czarna limuzyna',
        });

        expect(chase.status).toBe('ongoing');
        const player = chase.participants.find((p) => p.isPlayer);
        expect(player?.mov).toBe(12);
        expect(player?.segmentIndex).toBe(3);
        expect(chase.segments[1]?.hazard?.requiredSkill).toBe('Prowadzenie samochodu');
      });

      it('tworzy pościg w którym gracz jest ścigającym (cel=schwytanie / rola=scigajacy)', () => {
        const text = '[POŚCIG: typ=pieszy | cel=schwytanie | dystans=2 | wrog=Adam Dąbrowski | krotki=true] Złap go!';
        const parsed = extractChaseTag(text);
        expect(parsed?.role).toBe('pursuer');
        expect(parsed?.isShort).toBe(true);

        const chase = createInitialChaseFromTag({
          activeCharacter: {
            id: 'char_andrzej',
            name: 'Andrzej',
            move: 8,
            dex: 55,
          },
          role: parsed?.role,
          isShort: parsed?.isShort,
          initialDistance: parsed?.distance,
          opponentName: parsed?.opponent,
        });

        const player = chase.participants.find((p) => p.isPlayer);
        const target = chase.participants.find((p) => !p.isPlayer);

        expect(player?.isFleeing).toBe(false);
        expect(target?.isFleeing).toBe(true);
        expect(player?.segmentIndex).toBe(0);
        expect(target?.segmentIndex).toBe(2);
        expect(chase.maxRounds).toBe(2);
        expect(chase.segments.length).toBe(4);
      });
    });

    describe('advanceChaseOnSkillRoll (Deterministyczny reducer)', () => {
      let state: ReturnType<typeof createInitialChaseFromTag>;

      beforeEach(() => {
        state = createInitialChaseFromTag({
          activeCharacter: { id: 'p1', name: 'Badacz', move: 8, dex: 50 },
          initialDistance: 2,
        });
      });

      it('sukces ekstremalny zwiększa przewagę Badacza (+1 pole)', () => {
        const next = advanceChaseOnSkillRoll(state, 'extreme');
        const player = next.participants.find((p) => p.isPlayer);
        const pursuer = next.participants.find((p) => !p.isPlayer);

        expect(player?.segmentIndex).toBe(3); // 2 + 1
        expect(pursuer?.segmentIndex).toBe(0); // bez zmian
        expect(player!.segmentIndex - pursuer!.segmentIndex).toBe(3);
      });

      it('sukces zwykły utrzymuje tempo i dystans (obaj przesuwają się o 1)', () => {
        const next = advanceChaseOnSkillRoll(state, 'regular');
        const player = next.participants.find((p) => p.isPlayer);
        const pursuer = next.participants.find((p) => !p.isPlayer);

        expect(player?.segmentIndex).toBe(3); // 2 + 1
        expect(pursuer?.segmentIndex).toBe(1); // 0 + 1
        expect(player!.segmentIndex - pursuer!.segmentIndex).toBe(2); // dystans zachowany
      });

      it('porażka pozwala ścigającemu zbliżyć się o 1 pole (Fail-Forward)', () => {
        const next = advanceChaseOnSkillRoll(state, 'fail');
        const player = next.participants.find((p) => p.isPlayer);
        const pursuer = next.participants.find((p) => !p.isPlayer);

        expect(player?.segmentIndex).toBe(2); // Badacz traci tempo
        expect(pursuer?.segmentIndex).toBe(1); // Wróg nadrabia o 1
        expect(player!.segmentIndex - pursuer!.segmentIndex).toBe(1); // dystans zmalał do 1
      });

      it('pech/farsa zbliża ścigającego o 2 pola i powoduje zwarcie (engaged)', () => {
        const next = advanceChaseOnSkillRoll(state, 'fumble');
        const player = next.participants.find((p) => p.isPlayer);
        const pursuer = next.participants.find((p) => !p.isPlayer);

        expect(player?.segmentIndex).toBe(2);
        expect(pursuer?.segmentIndex).toBe(2); // dogonił
        expect(next.status).toBe('engaged');
        expect(player?.isCaught).toBe(true);
      });

      it('dotarcie do mety (segment 4) kończy pościg ucieczką (escaped)', () => {
        // Ustaw badacza na przedostatnim polu (3)
        state.participants[0].segmentIndex = 3;
        state.participants[1].segmentIndex = 0;

        const next = advanceChaseOnSkillRoll(state, 'regular');
        const player = next.participants.find((p) => p.isPlayer);

        expect(player?.segmentIndex).toBe(4); // ostatni segment
        expect(next.status).toBe('escaped');
        expect(player?.isEscaped).toBe(true);
      });
    });
  });
});

