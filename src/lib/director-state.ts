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

// === INTERFEJSY ===

export interface DirectorState {
  sessionId: string;
  currentPlans: string[];     // FIFO, max 3 (z MYŚLI_MG)
  narrativeGoal: string;      // ostatni CEL_NARRACYJNY
  moodProgression: string[];  // FIFO, max 5 (z NASTRÓJ)
  discoveredClues: string[];  // z DZIENNIK:clue + DZIENNIK:discovery
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
      turnCount: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

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

  // Tropy z dziennika
  if (journalEntries && journalEntries.length > 0) {
    const clueEntries = journalEntries.filter(e => e.type === 'clue' || e.type === 'discovery');
    for (const entry of clueEntries) {
      const clueKey = entry.title.toLowerCase();
      if (!state.discoveredClues.some(c => c.toLowerCase() === clueKey)) {
        state.discoveredClues.push(entry.title);
      }
    }
    if (state.discoveredClues.length > MAX_CLUES) {
      state.discoveredClues = state.discoveredClues.slice(-MAX_CLUES);
    }
  }

  stateCache.set(sessionId, state);
}

/**
 * Generuje sekcję promptu "Pamięć Reżysera" (~100-130 tokenów).
 * Zwraca null jeśli stan jest pusty (pierwsze tury sesji).
 */
export function getDirectorPromptSection(sessionId: string): string | null {
  const state = stateCache.get(sessionId);
  if (!state) return null;

  // Nie generuj sekcji jeśli brak danych
  const hasData = state.currentPlans.length > 0 ||
    state.narrativeGoal ||
    state.moodProgression.length > 0 ||
    state.discoveredClues.length > 0;

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

  if (state.discoveredClues.length > 0) {
    parts.push(`**Odkryte tropy:** ${state.discoveredClues.slice(-5).join(', ')}`);
  }

  return parts.join('\n');
}
