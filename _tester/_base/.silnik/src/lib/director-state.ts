/**
 * Director's State Service
 *
 * Persystuje meta-dane narracyjne GM między turami:
 * - [MYŚLI_MG] → plany reżyserskie
 * - [CEL_NARRACYJNY] → aktualny cel fabularny
 * - [NASTRÓJ] → progresja nastroju scen
 * - Odkryte tropy z dziennika gracza
 *
 * Injektuje skondensowany "Pamięć Reżysera" do prompta (~100-130 tokenów).
 */

import type { JournalTagEntry } from './parsers/types';
import { synthesizeClueFact } from './parsers/journal-parser';
import type { GameContext } from './prompt-section-parser';

// === INTERFEJSY ===

export interface DirectorClueFact {
  title: string;
  fact: string;
  /** Status faktu śledczego (Arcanum Benchmark 2026: Fact Supersession) */
  status?: 'active' | 'superseded' | 'refuted';
  /** Identyfikator lub tytuł faktu, który go unieważnił */
  supersededBy?: string;
}

export interface DirectorState {
  sessionId: string;
  currentPlans: string[];     // FIFO, max 3 (z MYŚLI_MG)
  narrativeGoal: string;      // ostatni CEL_NARRACYJNY
  moodProgression: string[];  // FIFO, max 5 (z NASTRÓJ)
  discoveredClues: string[];  // z DZIENNIK:clue + DZIENNIK:discovery (wsteczna kompatybilność)
  clueFacts: DirectorClueFact[]; // Zwięzłe fakty śledcze (max 5)
  investigatorHypotheses: string[]; // Ostatnie wnioski i hipotezy badacza (max 3)
  turnCount: number;
  lastUpdated: string;
}

interface GMMetadata {
  thoughts?: string;
  mood?: string;
  narrativeGoal?: string;
}

// === LIMITY ===

const MAX_PLANS = 3;
const MAX_MOODS = 5;
const MAX_CLUES = 10;

// === IN-MEMORY CACHE ===

const stateCache = new Map<string, DirectorState>();

// === FUNKCJE PUBLICZNE ===

/**
 * Pobierz aktualny stan reżysera z cache.
 */
export function getDirectorState(sessionId: string): DirectorState | null {
  return stateCache.get(sessionId) || null;
}

/**
 * Aktualizuj stan reżysera inkementalnie po każdej odpowiedzi AI.
 */
export function updateDirectorState(
  sessionId: string,
  gmMeta: GMMetadata,
  journalEntries?: JournalTagEntry[]
): void {
  let state = stateCache.get(sessionId);

  if (!state) {
    state = {
      sessionId,
      currentPlans: [],
      narrativeGoal: '',
      moodProgression: [],
      discoveredClues: [],
      clueFacts: [],
      investigatorHypotheses: [],
      turnCount: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  if (!state.clueFacts) state.clueFacts = [];
  if (!state.investigatorHypotheses) state.investigatorHypotheses = [];

  state.turnCount++;
  state.lastUpdated = new Date().toISOString();

  // MYŚLI_MG → plany (FIFO)
  if (gmMeta.thoughts) {
    state.currentPlans.push(gmMeta.thoughts);
    if (state.currentPlans.length > MAX_PLANS) {
      state.currentPlans = state.currentPlans.slice(-MAX_PLANS);
    }
  }

  // CEL_NARRACYJNY → zastąp aktualny cel
  if (gmMeta.narrativeGoal) {
    state.narrativeGoal = gmMeta.narrativeGoal;
  }

  // NASTRÓJ → progresja (FIFO)
  if (gmMeta.mood) {
    state.moodProgression.push(gmMeta.mood);
    if (state.moodProgression.length > MAX_MOODS) {
      state.moodProgression = state.moodProgression.slice(-MAX_MOODS);
    }
  }

  // Tropy z dziennika - Issue #68: 1-zdaniowe fakty poszlak i hipotezy
  if (journalEntries && journalEntries.length > 0) {
    const clueEntries = journalEntries.filter(
      (e) => e.type === 'clue' || e.type === 'discovery'
    );
    for (const entry of clueEntries) {
      const clueKey = entry.title.toLowerCase().trim();
      if (!state.discoveredClues.some((c) => c.toLowerCase().trim() === clueKey)) {
        state.discoveredClues.push(entry.title);
      }

      // Aktualizuj lub dodaj zwięzły 1-zdaniowy fakt
      const fact = synthesizeClueFact(entry.title, entry.content);
      const existingFactIndex = state.clueFacts.findIndex(
        (f) => f.title.toLowerCase().trim() === clueKey
      );

      // Wykrywanie unieważnienia (np. [DZIENNIK:trop:Nowy trop]... | zastępuje: Stary trop lub treść wskazuje na obalenie)
      const supersedesMatch = entry.content.match(/(?:zastępuje|unieważnia|obala|supersedes|refutes):\s*([^|\n\]]+)/i);
      const supersededTarget = supersedesMatch ? supersedesMatch[1].trim().toLowerCase() : null;
      if (supersededTarget) {
        state.clueFacts.forEach((cf) => {
          if (cf.title.toLowerCase().trim() === supersededTarget || cf.title.toLowerCase().includes(supersededTarget)) {
            cf.status = 'superseded';
            cf.supersededBy = entry.title;
          }
        });
      }

      if (existingFactIndex >= 0) {
        state.clueFacts[existingFactIndex].fact = fact;
        if (!state.clueFacts[existingFactIndex].status) {
          state.clueFacts[existingFactIndex].status = 'active';
        }
      } else {
        state.clueFacts.push({ title: entry.title, fact, status: 'active' });
      }
    }
    if (state.discoveredClues.length > MAX_CLUES) {
      state.discoveredClues = state.discoveredClues.slice(-MAX_CLUES);
    }
    if (state.clueFacts.length > 10) {
      state.clueFacts = state.clueFacts.slice(-10);
    }

    // Wnioski i notatki badacza
    const noteEntries = journalEntries.filter(
      (e) => e.type === 'note' || e.type === 'bookmark'
    );
    for (const entry of noteEntries) {
      const insight = entry.content?.trim();
      if (insight && !state.investigatorHypotheses.includes(insight)) {
        state.investigatorHypotheses.push(insight);
      }
    }
    if (state.investigatorHypotheses.length > 3) {
      state.investigatorHypotheses = state.investigatorHypotheses.slice(-3);
    }
  }

  stateCache.set(sessionId, state);
}

/**
 * Generuje sekcję promptu "Pamięć Reżysera" (~50-80 tokenów).
 * Zwraca null jeśli stan jest pusty (pierwsze tury sesji).
 *
 * Uwaga (Issue #68): tropy śledztwa zostały przeniesione do dedykowanej sekcji
 * `## AKTYWNE ŚLEDZTWO I WIEDZA BADACZA` (buildActiveInvestigationSection w build-context.ts).
 */
export function getDirectorPromptSection(sessionId: string): string | null {
  const state = stateCache.get(sessionId);
  if (!state) return null;

  // Nie generuj sekcji jeśli brak danych reżyserskich
  const hasData =
    state.currentPlans.length > 0 ||
    state.narrativeGoal ||
    state.moodProgression.length > 0;

  if (!hasData) return null;

  const parts: string[] = ['## PAMIĘĆ REŻYSERA'];

  if (state.currentPlans.length > 0) {
    parts.push(`**Plan:** ${state.currentPlans[state.currentPlans.length - 1]}`);
  }

  if (state.narrativeGoal) {
    parts.push(`**Cel narracyjny:** ${state.narrativeGoal}`);
  }

  if (state.moodProgression.length > 0) {
    const current = state.moodProgression[state.moodProgression.length - 1];
    if (state.moodProgression.length > 1) {
      parts.push(`**Nastrój:** ${current} (progresja: ${state.moodProgression.join(' → ')})`);
    } else {
      parts.push(`**Nastrój:** ${current}`);
    }
  }

  return parts.join('\n');
}

export interface DynamicScenePacingParams {
  sessionId?: string;
  gameContext?: GameContext;
  atmosphere?: string;
  mood?: string;
  narrativeGoal?: string;
  tone?: 'purist' | 'pulp' | 'noir' | 'neutral';
  locale?: 'pl' | 'en';
}

/**
 * Dynamic Scene & Pacing Injection (SillyTavern Adaptation - Issue #349)
 *
 * Generuje dyrektywę dla MG o bieżącej atmosferze i tempie sceny,
 * przeznaczoną do wstrzyknięcia 2-3 wiadomości przed końcem okna kontekstowego.
 */
export function buildDynamicScenePacingInjection(
  params: DynamicScenePacingParams
): string {
  const { sessionId, gameContext, tone = 'purist', locale = 'pl' } = params;
  const isEn = locale === 'en';
  const state = sessionId ? getDirectorState(sessionId) : null;

  // 1. Atmosfera / Nastrój sceny
  let atmosphere = params.atmosphere || params.mood;
  if (!atmosphere && state && state.moodProgression.length > 0) {
    const validMoods = state.moodProgression.filter(Boolean);
    if (validMoods.length > 0) {
      atmosphere = validMoods[validMoods.length - 1];
    }
  }
  if (!atmosphere && gameContext) {
    if (gameContext.recentSANLoss) {
      atmosphere = isEn
        ? 'rising paranoia, somatic shock, and fractured reality'
        : 'narastająca paranoja, szok somatyczny i pękający racjonalizm';
    } else if (gameContext.mode === 'combat') {
      atmosphere = isEn
        ? 'direct mortal danger, brutal physical clash, and desperation'
        : 'bezpośrednie zagrożenie życia, brutalne starcie i walka o przetrwanie';
    } else if (gameContext.mode === 'chase') {
      atmosphere = isEn
        ? 'imminent chase, breathless flight, and relentless pursuers'
        : 'zbliżający się pościg, zadyszka i bezwzględni prześladowcy na karku';
    } else if (gameContext.mode === 'ritual') {
      atmosphere = isEn
        ? 'ceremonial dread, acousmatic chanting, and unnatural creeping cold'
        : 'ceremonialna groza, akuzmatyczne inkantacje i nienaturalny chłód';
    } else if (gameContext.mode === 'social') {
      atmosphere = isEn
        ? 'dual masks, psychological tension, suspicion, and hidden agendas'
        : 'podwójna maska, napięcie psychologiczne, podejrzliwość i skrywana agenda';
    } else if (gameContext.mode === 'investigation') {
      atmosphere = isEn
        ? 'methodical deduction, eerie quiet, and tangible material clues'
        : 'metodyczna dedukcja, niepokojąca cisza i namacalne ślady w przestrzeni';
    } else if (gameContext.mode === 'exploration') {
      atmosphere = isEn
        ? 'oppressive uncertainty, shadow play, and claustrophobic isolation'
        : 'duszna niepewność, gra cieni i klaustrofobiczne osamotnienie';
    } else if (gameContext.mode === 'dream') {
      atmosphere = isEn
        ? 'derealization, contradictory geometry, and hypnotic decay'
        : 'odrealnienie, sprzeczna geometria i hipnotyczny rozpad praw fizyki';
    }
  }
  if (!atmosphere) {
    atmosphere = isEn
      ? 'gathering darkness, heavy suspense, and creeping dread'
      : 'gęstniejący mrok, duszne zawieszenie i narastający niepokój';
  }

  // 2. Cel narracyjny / Reżyserski plan
  let goal = params.narrativeGoal;
  if (!goal && state) {
    const validPlans = state.currentPlans.filter(Boolean);
    goal =
      state.narrativeGoal ||
      (validPlans.length > 0 ? validPlans[validPlans.length - 1] : '');
  }

  // 3. Pacing i kadencja (z Matrycy 4 Biegów)
  let pacingSummary = '';
  if (gameContext) {
    if (gameContext.recentSANLoss) {
      pacingSummary = isEn
        ? 'GEAR 4 (THE VOID): 40-90 words. Silence after shock, cold terse sentences, sensory void.'
        : 'BIEG 4 (PUSTKA): 40-90 słów. Cisza po szoku, chłodne zdania, somatyczna pustka.';
    } else if (gameContext.mode === 'combat') {
      pacingSummary = isEn
        ? 'GEAR 3 (HARD MOVE): 30-70 words. Terse, pure action, immediate threat strikes.'
        : 'BIEG 3 (PRZEŁAMANIE): 30-70 słów. Krótkie zdania, czysta akcja, natychmiastowy cios świata.';
    } else if (gameContext.mode === 'chase') {
      pacingSummary = isEn
        ? 'GEAR 3 (CHASE): 30-70 words. Relentless momentum, obstacles, racing pulse.'
        : 'BIEG 3 (POŚCIG): 30-70 słów. Bezwzględny pęd, nagłe przeszkody, przyspieszony oddech.';
    } else if (gameContext.mode === 'social') {
      pacingSummary = isEn
        ? 'GEAR 1 (STACCATO): 20-60 words. Sharp dialogue exchange, dual masks, no backdrop re-descriptions.'
        : 'BIEG 1 (PING-PONG): 20-60 słów. Cięta replika, podwójna maska, zero re-deskrypcji tła.';
    } else {
      pacingSummary = isEn
        ? 'GEAR 2 (ESTABLISHING SHOT): 60-150 words. Sensory details, tangible clues, eerie anomaly.'
        : 'BIEG 2 (SZEROKI KADR): 60-150 słów. Detale zmysłowe, materialne poszlaki, niepokojący detal.';
    }

    if (gameContext.isStuck) {
      const stuckNote = isEn
        ? ' [STALL / DEAD-END: Players are trapped in planning/inaction. Inject an immediate external catalyst or sudden threat.]'
        : ' [IMPÁS / MARTWY PUNKT: Gracze tkwią w planowaniu bez ruchu. Wprowadź natychmiastowy bodziec zewnętrzny lub bezpośrednie zagrożenie.]';
      pacingSummary += stuckNote;
    }
  } else {
    pacingSummary = isEn
      ? 'Dynamic Cadence: adjust sentence length to scene tension.'
      : 'Zmienna kadencja: dostosuj długość zdań do napięcia w scenie.';
  }

  // 4. Tone modifiers
  let toneInstruction = '';
  if (tone === 'noir') {
    toneInstruction = isEn
      ? 'Noir Convention: slow-burn pacing, mutual distrust, resource scarcity.'
      : 'Konwencja Noir: powolne tempo, wzajemna nieufność, brak gotowych środków obrony.';
  } else if (tone === 'pulp') {
    toneInstruction = isEn
      ? 'Pulp Convention: energetic momentum, cinematic action, larger-than-life danger.'
      : 'Konwencja Pulp: filmowy rozmach, dynamiczny impet, podwyższona odporność badaczy.';
  }

  if (isEn) {
    const lines = [
      '[GM DIRECTIVE: DYNAMIC SCENE & PACING INJECTION]',
      `Atmosphere: ${atmosphere}`,
    ];
    if (goal) lines.push(`Scene Goal: ${goal}`);
    lines.push(`Pacing & Cadence: ${pacingSummary}`);
    if (toneInstruction) lines.push(`Tone: ${toneInstruction}`);
    lines.push('CoC 7e RAW: Enforce horror, fail-forward, and inescapable consequences.');
    lines.push('[/GM DIRECTIVE]');
    return lines.join('\n');
  } else {
    const lines = [
      '[PRZYPOMNIENIE DLA MG: DYNAMICZNA SCENA I PACING]',
      `Atmosfera sceny: ${atmosphere}`,
    ];
    if (goal) lines.push(`Cel narracyjny: ${goal}`);
    lines.push(`Pacing i kadencja: ${pacingSummary}`);
    if (toneInstruction) lines.push(`Ton: ${toneInstruction}`);
    lines.push('Rygor CoC 7e RAW: Wymuś grozę, zasadę fail-forward i nieuchronne konsekwencje.');
    lines.push('[/PRZYPOMNIENIE DLA MG]');
    return lines.join('\n');
  }
}
