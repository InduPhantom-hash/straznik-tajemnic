/**
 * @file chase-engine.ts
 * Deterministyczny silnik pościgów (Chase Engine) i toru przeszkód (Hazard Track)
 * według oficjalnych zasad Call of Cthulhu 7e (RAW) — Księga Strażnika, Rozdział 7.
 *
 * Podstawowe reguły CoC 7e RAW:
 * 1. Kolejka akcji i Ruch (MOV):
 *    - Uczestnik o najniższym MOV otrzymuje 1 punkt akcji na rundę.
 *    - Uczestnicy o wyższym MOV otrzymują: 1 + (MOV_własny - MOV_najniższy).
 * 2. Tor pościgu (Hazard Track):
 *    - Podzielony na dyskretne lokacje/segmenty (np. 0, 1, 2, 3...).
 *    - Na segmentach mogą znajdować się Przeszkody / Bariery (Hazards / Barriers).
 * 3. Koszt i Ruch:
 *    - Ruch o 1 segment naprzód kosztuje 1 punkt akcji.
 *    - Wejście na segment z barierą wymaga udanego testu umiejętności (np. Zręczność, Skakanie).
 *    - Porażka w teście bariery: utrata akcji (zatrzymanie przed przeszkodą) lub upadek/obrażenia.
 * 4. Manewry w pościgu:
 *    - sprint: ruch o 1 segment naprzód.
 *    - clear_hazard: sforsowanie bariery na obecnym lub kolejnym polu.
 *    - shortcut: ryzykowny skrót (wymaga testu np. Nawigacja/Wiedza o mieście) - sukces = +2 pola, porażka = zatrzymanie.
 *    - create_barrier: przewrócenie mebli/zamknięcie bramy za sobą - stawia barierę dla goniących.
 *    - hide: próba zerwania kontaktu wzrokowego w bocznej uliczce (wymaga testu Ukrywanie).
 * 5. Warunki zakończenia:
 *    - Schwytanie (Catch): dystans między uciekającym a najbliższym ścigającym spada do 0.
 *    - Ucieczka (Escape): dystans przekracza próg ucieczki (np. ≥ 4 lokacje przewagi) lub udany test Ukrycia.
 */

import { type RollOutcome, isSuccess } from '@/lib/dice-utils';

export type ChaseStatus = 'ongoing' | 'escaped' | 'caught';

export type HazardType = 'barrier' | 'hazard' | 'shortcut';

export interface ChaseHazard {
  id: string;
  name: string;
  description: string;
  requiredSkill: string;
  difficulty: 'zwykly' | 'trudny' | 'ekstremalny';
  hazardType: HazardType;
  penaltyActionsOnFail?: number;
  damageOnFail?: string; // np. "1k3"
}

export interface ChaseSegment {
  index: number;
  name: string;
  description?: string;
  hazard?: ChaseHazard | null;
}

export interface ChaseParticipant {
  id: string;
  name: string;
  isPlayer: boolean;
  isFleeing: boolean;
  mov: number;
  segmentIndex: number;
  actionsTotal: number;
  actionsRemaining: number;
  isCaught?: boolean;
  isEscaped?: boolean;
  speedModifier?: number;
  characterId?: string;
}

export type ChaseManeuverType =
  | 'sprint'
  | 'clear_hazard'
  | 'shortcut'
  | 'create_barrier'
  | 'hide';

export interface ChaseManeuver {
  type: ChaseManeuverType;
  actorId: string;
  targetSkill?: string;
  rollOutcome?: RollOutcome;
  customDescription?: string;
}

export interface ChaseRoundLog {
  round: number;
  actorName: string;
  actionName: string;
  details: string;
  success?: boolean;
  rollOutcome?: RollOutcome;
  segmentBefore: number;
  segmentAfter: number;
}

export interface ChaseState {
  id: string;
  round: number;
  maxRounds: number;
  escapeDistanceThreshold: number;
  status: ChaseStatus;
  segments: ChaseSegment[];
  participants: ChaseParticipant[];
  logs: ChaseRoundLog[];
}

/**
 * Domyślna pula przeszkód miejskich i terenowych do szybkiej generacji toru.
 */
export const DEFAULT_CHASE_HAZARDS: Record<string, ChaseHazard> = {
  fence: {
    id: 'hazard_fence',
    name: 'Wysokie ogrodzenie z siatki',
    description: 'Ostry, metalowy płot blokujący przejście między podwórkami.',
    requiredSkill: 'Wspinaczka',
    difficulty: 'zwykly',
    hazardType: 'barrier',
    penaltyActionsOnFail: 1,
  },
  crowd: {
    id: 'hazard_crowd',
    name: 'Gęsty tłum na targu',
    description: 'Zbiegowisko gapiów i kupców tarasujące wąską uliczkę.',
    requiredSkill: 'Zręczność',
    difficulty: 'zwykly',
    hazardType: 'hazard',
    penaltyActionsOnFail: 1,
  },
  stairs: {
    id: 'hazard_stairs',
    name: 'Strome, zniszczone schody',
    description: 'Śliskie kamienne stopnie prowadzące w dół ku kanałom.',
    requiredSkill: 'Skakanie',
    difficulty: 'trudny',
    hazardType: 'hazard',
    penaltyActionsOnFail: 1,
    damageOnFail: '1k3',
  },
  traffic: {
    id: 'hazard_traffic',
    name: 'Ruchliwa ulica z dorożkami i autami',
    description: 'Gwałtowny potok pojazdów, klaksony i konie stające dęba.',
    requiredSkill: 'Unik',
    difficulty: 'trudny',
    hazardType: 'barrier',
    penaltyActionsOnFail: 1,
  },
};

/**
 * Oblicza punkty akcji dla uczestników pościgu według reguł CoC 7e RAW:
 * 1. Znajdź minimalny MOV w grupie.
 * 2. Najwolniejszy uczestnik ma 1 akcję na rundę.
 * 3. Każdy szybszy uczestnik otrzymuje: 1 + (MOV_własny - MOV_najniższy).
 */
export function calculateChaseActionPoints(
  participants: Array<{ mov: number }>
): number[] {
  if (!participants || participants.length === 0) return [];
  const minMov = Math.min(...participants.map((p) => p.mov));

  return participants.map((p) => {
    const diff = Math.max(0, p.mov - minMov);
    return 1 + diff;
  });
}

/**
 * Inicjuje stan pościgu (ChaseState) na podstawie parametrów uciekającego i pościgu.
 */
export function createChaseState(params: {
  id?: string;
  fleeing: Omit<ChaseParticipant, 'isFleeing' | 'actionsTotal' | 'actionsRemaining'>;
  pursuers: Array<Omit<ChaseParticipant, 'isFleeing' | 'actionsTotal' | 'actionsRemaining'>>;
  initialDistance?: number;
  trackLength?: number;
  escapeDistanceThreshold?: number;
  maxRounds?: number;
  hazardPositions?: Record<number, ChaseHazard>;
}): ChaseState {
  const {
    id = `chase_${Date.now()}`,
    fleeing,
    pursuers,
    initialDistance = 1,
    trackLength = 10,
    escapeDistanceThreshold = 4,
    maxRounds = 6,
    hazardPositions = {
      2: DEFAULT_CHASE_HAZARDS.fence,
      4: DEFAULT_CHASE_HAZARDS.crowd,
      6: DEFAULT_CHASE_HAZARDS.stairs,
    },
  } = params;

  const rawParticipants = [fleeing, ...pursuers];
  const actionPoints = calculateChaseActionPoints(rawParticipants);

  const fullParticipants: ChaseParticipant[] = [
    {
      ...fleeing,
      isFleeing: true,
      segmentIndex: initialDistance,
      actionsTotal: actionPoints[0],
      actionsRemaining: actionPoints[0],
      isCaught: false,
      isEscaped: false,
    },
    ...pursuers.map((p, idx) => ({
      ...p,
      isFleeing: false,
      segmentIndex: 0,
      actionsTotal: actionPoints[idx + 1],
      actionsRemaining: actionPoints[idx + 1],
      isCaught: false,
      isEscaped: false,
    })),
  ];

  const segments: ChaseSegment[] = Array.from({ length: trackLength }, (_, i) => ({
    index: i,
    name: `Lokacja ${i + 1}`,
    hazard: hazardPositions[i] || null,
  }));

  return {
    id,
    round: 1,
    maxRounds,
    escapeDistanceThreshold,
    status: 'ongoing',
    segments,
    participants: fullParticipants,
    logs: [],
  };
}

/**
 * Wykonuje manewr uciekającego gracza i aktualizuje stan pościgu.
 */
export function executePlayerManeuver(
  state: ChaseState,
  maneuver: ChaseManeuver
): {
  nextState: ChaseState;
  log: ChaseRoundLog;
} {
  const next = JSON.parse(JSON.stringify(state)) as ChaseState;
  const player = next.participants.find((p) => p.isPlayer && p.isFleeing);

  if (!player) {
    throw new Error('Player participant not found in chase state');
  }

  if (next.status !== 'ongoing') {
    return {
      nextState: next,
      log: {
        round: next.round,
        actorName: player.name,
        actionName: 'Brak akcji',
        details: 'Pościg został już zakończony.',
        segmentBefore: player.segmentIndex,
        segmentAfter: player.segmentIndex,
      },
    };
  }

  const segmentBefore = player.segmentIndex;
  let segmentAfter = segmentBefore;
  let actionName = 'Sprint';
  let details = '';
  let success = true;

  // Odlicz koszt akcji (domyślnie 1)
  player.actionsRemaining = Math.max(0, player.actionsRemaining - 1);

  switch (maneuver.type) {
    case 'sprint': {
      actionName = 'Sprint';
      const targetSegmentIdx = segmentBefore + 1;
      const targetSegment = next.segments[targetSegmentIdx];

      // Jeśli na kolejnym polu jest przeszkoda, gracz dociera do niej, ale jej nie przekracza
      if (targetSegment && targetSegment.hazard) {
        segmentAfter = targetSegmentIdx;
        details = `Dotarto do przeszkody: ${targetSegment.hazard.name}. Wymagany test, aby ją sforsować!`;
      } else {
        segmentAfter = targetSegmentIdx;
        details = 'Szybki bieg naprzód o jeden segment.';
      }
      break;
    }

    case 'clear_hazard': {
      actionName = 'Forsowanie przeszkody';
      const currentHazard = next.segments[segmentBefore]?.hazard;
      const rollOutcome = maneuver.rollOutcome || 'regular';
      const rollSuccess = isSuccess(rollOutcome);

      success = rollSuccess;
      if (rollSuccess) {
        segmentAfter = segmentBefore + 1;
        details = `Przeszkoda (${currentHazard?.name || 'Bariera'}) pomyślnie pokonana! Ruch o 1 segment naprzód.`;
      } else {
        segmentAfter = segmentBefore;
        details = `Porażka w teście pokonania przeszkody (${rollOutcome}). Strata cennego czasu!`;
      }
      break;
    }

    case 'shortcut': {
      actionName = 'Brawurowy skrót';
      const rollOutcome = maneuver.rollOutcome || 'fail';
      const rollSuccess = isSuccess(rollOutcome);

      success = rollSuccess;
      if (rollSuccess) {
        segmentAfter = segmentBefore + 2;
        details = `Znakomita orientacja w terenie! Skrót przez zaułki pozwala zyskać 2 segmenty przewagi.`;
      } else {
        segmentAfter = segmentBefore;
        details = `Ślepy zaułek lub potknięcie! Gracz traci akcję, nie zyskując dystansu.`;
      }
      break;
    }

    case 'create_barrier': {
      actionName = 'Zastawienie przeszkody z tyłu';
      const barrierIndex = Math.max(0, segmentBefore - 1);
      segmentAfter = segmentBefore;
      if (next.segments[barrierIndex]) {
        next.segments[barrierIndex].hazard = {
          id: `custom_barrier_${Date.now()}`,
          name: maneuver.customDescription || 'Przewrócone meble i barykada',
          description: 'Zatarasowane przejście spowalniające pościg.',
          requiredSkill: 'Zręczność',
          difficulty: 'zwykly',
          hazardType: 'barrier',
          penaltyActionsOnFail: 1,
        };
        details = `Utworzono barykadę na segmencie ${barrierIndex + 1}. Ścigający będą musieli ją sforsować!`;
      } else {
        details = 'Próba barykadowania, lecz brak osłony w tym miejscu.';
      }
      break;
    }

    case 'hide': {
      actionName = 'Próba ukrycia się';
      const rollOutcome = maneuver.rollOutcome || 'fail';
      const rollSuccess = isSuccess(rollOutcome);

      success = rollSuccess;
      segmentAfter = segmentBefore;
      if (rollSuccess) {
        player.isEscaped = true;
        next.status = 'escaped';
        details = `Udane zniknięcie w cieniu/tłumie (${rollOutcome})! Ścigający gubią trop. Ucieczka udana!`;
      } else {
        details = `Ścigający nie spuszczają uciekiniera z oczu (${rollOutcome}). Ukrycie nie powiodło się!`;
      }
      break;
    }
  }

  player.segmentIndex = segmentAfter;

  const roundLog: ChaseRoundLog = {
    round: next.round,
    actorName: player.name,
    actionName,
    details,
    success,
    rollOutcome: maneuver.rollOutcome,
    segmentBefore,
    segmentAfter,
  };
  next.logs.push(roundLog);

  // Weryfikacja warunków końca
  evaluateChaseTermination(next);

  return { nextState: next, log: roundLog };
}

/**
 * Automatyczne rozliczenie tury ścigających (NPC) dla bieżącej rundy.
 */
export function executePursuerTurns(state: ChaseState): {
  nextState: ChaseState;
  logs: ChaseRoundLog[];
} {
  const next = JSON.parse(JSON.stringify(state)) as ChaseState;
  const pursuers = next.participants.filter((p) => !p.isFleeing && !p.isCaught);
  const fleeing = next.participants.find((p) => p.isFleeing);
  const newLogs: ChaseRoundLog[] = [];

  if (next.status !== 'ongoing' || !fleeing) {
    return { nextState: next, logs: newLogs };
  }

  for (const pursuer of pursuers) {
    while (pursuer.actionsRemaining > 0 && next.status === 'ongoing') {
      pursuer.actionsRemaining -= 1;
      const segBefore = pursuer.segmentIndex;
      const targetSegIdx = segBefore + 1;
      const targetSeg = next.segments[targetSegIdx];

      // Jeśli na drodze jest przeszkoda, pościg wykonuje test deterministyczny
      if (targetSeg && targetSeg.hazard) {
        const passHazard = Math.random() >= 0.35; // 65% szans powodzenia NPC
        if (passHazard) {
          pursuer.segmentIndex = targetSegIdx;
          const log: ChaseRoundLog = {
            round: next.round,
            actorName: pursuer.name,
            actionName: 'Pokonanie przeszkody',
            details: `${pursuer.name} z łatwością pokonuje barierę: ${targetSeg.hazard.name}.`,
            success: true,
            segmentBefore: segBefore,
            segmentAfter: targetSegIdx,
          };
          next.logs.push(log);
          newLogs.push(log);
        } else {
          const log: ChaseRoundLog = {
            round: next.round,
            actorName: pursuer.name,
            actionName: 'Zatrzymanie na przeszkodzie',
            details: `${pursuer.name} zostaje zatrzymany przez ${targetSeg.hazard.name}!`,
            success: false,
            segmentBefore: segBefore,
            segmentAfter: segBefore,
          };
          next.logs.push(log);
          newLogs.push(log);
        }
      } else {
        // Zwykły ruch naprzód
        pursuer.segmentIndex = Math.min(fleeing.segmentIndex, targetSegIdx);
        const log: ChaseRoundLog = {
          round: next.round,
          actorName: pursuer.name,
          actionName: 'Bieg w pościgu',
          details: `${pursuer.name} zbliża się do uciekiniera!`,
          success: true,
          segmentBefore: segBefore,
          segmentAfter: pursuer.segmentIndex,
        };
        next.logs.push(log);
        newLogs.push(log);
      }

      // Sprawdź natychmiastowe schwytanie
      if (pursuer.segmentIndex >= fleeing.segmentIndex) {
        fleeing.isCaught = true;
        next.status = 'caught';
        break;
      }
    }
  }

  // Jeśli wszyscy wykonali akcje, przygotuj następną rundę
  const allActionsSpent = next.participants.every((p) => p.actionsRemaining <= 0);
  if (allActionsSpent && next.status === 'ongoing') {
    next.round += 1;
    if (next.round > next.maxRounds) {
      next.status = 'escaped';
      fleeing.isEscaped = true;
    } else {
      // Odnów punkty akcji dla nowej rundy
      for (const p of next.participants) {
        p.actionsRemaining = p.actionsTotal;
      }
    }
  }

  evaluateChaseTermination(next);

  return { nextState: next, logs: newLogs };
}

/**
 * Sprawdza czy pościg osiągnął warunki krańcowe (Schwytanie lub Ucieczka).
 */
export function evaluateChaseTermination(state: ChaseState): void {
  const fleeing = state.participants.find((p) => p.isFleeing);
  if (!fleeing) return;

  const pursuers = state.participants.filter((p) => !p.isFleeing);
  if (pursuers.length === 0) {
    state.status = 'escaped';
    fleeing.isEscaped = true;
    return;
  }

  // Najmniejszy dystans do goniących
  const distances = pursuers.map((p) => fleeing.segmentIndex - p.segmentIndex);
  const minDistance = Math.min(...distances);

  if (minDistance <= 0) {
    state.status = 'caught';
    fleeing.isCaught = true;
    return;
  }

  if (minDistance >= state.escapeDistanceThreshold) {
    state.status = 'escaped';
    fleeing.isEscaped = true;
    return;
  }
}

/**
 * Formatuje raport z pościgu na czat narracji.
 */
export function formatChaseForChat(
  state: ChaseState,
  lastLog?: ChaseRoundLog
): string {
  const fleeing = state.participants.find((p) => p.isFleeing);
  const pursuers = state.participants.filter((p) => !p.isFleeing);
  const minDistance = fleeing
    ? Math.min(...pursuers.map((p) => fleeing.segmentIndex - p.segmentIndex))
    : 0;

  const lines: string[] = [];
  lines.push(`**🏃 POŚCIG (CoC 7e RAW) — Runda ${state.round}/${state.maxRounds}**`);

  if (state.status === 'caught') {
    lines.push(`🚨 **SCHWYTANIE!** Pościg dopadł uciekiniera na lokacji ${(fleeing?.segmentIndex ?? 0) + 1}. Następuje starcie wręcz!`);
  } else if (state.status === 'escaped') {
    lines.push(`🏁 **UDANA UCIECZKA!** Uciekający zgubił pościg w labiryncie ulic.`);
  } else {
    lines.push(`- **Dystans do pościgu:** ${minDistance} ${minDistance === 1 ? 'lokacja' : 'lokacje'}`);
    lines.push(`- **Punkty akcji gracza:** ${fleeing?.actionsRemaining ?? 0} / ${fleeing?.actionsTotal ?? 0}`);
  }

  if (lastLog) {
    lines.push(`> *${lastLog.actorName}: ${lastLog.details}*`);
  }

  return lines.join('\n');
}

/**
 * Formatuje kontekst systemowy pościgu dla AI Mistrza Gry.
 */
export function formatChaseForSystemContext(state: ChaseState): string {
  const fleeing = state.participants.find((p) => p.isFleeing);
  const pursuers = state.participants.filter((p) => !p.isFleeing);
  const minDistance = fleeing
    ? Math.min(...pursuers.map((p) => fleeing.segmentIndex - p.segmentIndex))
    : 0;

  return JSON.stringify({
    type: 'chase_engine_update',
    chaseId: state.id,
    round: state.round,
    maxRounds: state.maxRounds,
    status: state.status,
    distanceToPursuers: minDistance,
    playerLocationIndex: fleeing?.segmentIndex ?? 0,
    playerActionsRemaining: fleeing?.actionsRemaining ?? 0,
    pursuers: pursuers.map((p) => ({
      name: p.name,
      locationIndex: p.segmentIndex,
      actionsRemaining: p.actionsRemaining,
    })),
    lastLog: state.logs[state.logs.length - 1] ?? null,
  });
}
