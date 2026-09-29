/**
 * @file mock-gm-pipeline.ts
 * Headless deterministyczny symulator Mistrza Gry (GM Pipeline) dla testów podróży gracza (Issue #534).
 *
 * Zapewnia:
 * 1. Generowanie i emulację odpowiedzi MG z oficjalnymi tagami protokołu:
 *    [TEST: ...], [ATAK_WRĘCZ: ...], [WALKA: START], [POŚCIG: ...], [SANITY: ...], [DZIENNIK: ...], [LOKACJA: ...], [ZMIANA_SCENY: ...]
 * 2. Przekazywanie odpowiedzi przez produkcyjne parsery i logikę domenową:
 *    - `applyStatChangesToParty` (utrata/zysk HP i SAN, progi ran, progi szaleństwa)
 *    - `appendJournalToParty` (synchronizacja dziennika, akt śledczych dossier, lokacji, NPC)
 *    - `combat-resolver` (asymetryczne remisy, uniki, kontrataki, obrażenia CoC RAW)
 *    - `chase-engine` (tor pościgu, manewry gracza, tury pościgu NPC)
 *    - `sanity-engine` (testy inteligencji, ataki szaleństwa, bouts of madness)
 *    - `idea-roll-service` (Test Pomysłu, Impasse/Dead End, sukcesy i komplikacje fail-forward)
 *    - `full-game-save-manager` (tworzenie i odtwarzanie pełnych save'ów v2.1.0)
 * 3. Całkowity determinizm bez wywołań do zewnętrznych API (Gemini/Vertex).
 */

import fs from 'fs';
import type { Character, GameTime, MoonPhase } from '@/lib/types';
import { applyStatChangesToParty, type SanityEvent } from '@/lib/character/apply-stat-changes';
import { appendJournalToParty } from '@/lib/journal/apply-journal-tags';
import { extractSkillTests, extractMeleeAttackReferences, detectCombat } from '@/lib/parsers/mechanics-parser';
import { extractAcquiredItemProposals, createAcquiredEquipmentSeed } from '@/lib/acquired-equipment';
import type { SkillTestData, MeleeAttackReference, CombatState } from '@/lib/parsers/types';
import { extractLatestTagLocation } from '@/lib/parsers/event-parser';
import { extractSceneChangeTag } from '@/lib/parsers/journal-parser';
import { extractTimeUpdate } from '@/lib/parsers/time-parser';
import {
  resolveMeleeEngagement,
  type DefenseChoice,
  type MeleeResolutionResult,
} from '@/lib/combat/combat-resolver';
import {
  createChaseState,
  executePlayerManeuver,
  executePursuerTurns,
  type ChaseState,
  type ChaseManeuver,
  type ChaseParticipant,
  type ChaseHazard,
  type ChaseSpeedRollOutcome,
  type ChaseRoundLog,
} from '@/lib/chase/chase-engine';
import {
  resolveIntelligenceTest,
} from '@/lib/sanity/sanity-engine';
import {
  executeIdeaRoll,
  buildIdeaRollPrompt,
  type IdeaRollResult,
} from '@/lib/journal/idea-roll-service';
import type { MiceQuotientType } from '@/lib/journal/dossier-types';
import { defaultAISettings } from '@/lib/ai-settings/defaults';
import { FullGameSaveManager, type FullGameSave } from '@/lib/full-game-save-manager';
import type { RollOutcome } from '@/lib/dice-utils';

export interface MessageRecord {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface TurnResult {
  turn: number;
  messageId: string;
  userMessage?: string;
  gmResponse: string;
  skillTests: SkillTestData[];
  meleeAttacks: MeleeAttackReference[];
  combatState: CombatState | null;
  statChanges: {
    characters: Character[];
    activeCharacter: Character;
    changed: boolean;
    sanityEvents: SanityEvent[];
  };
  journalChanges: {
    characters: Character[];
    activeCharacter: Character;
    changed: boolean;
  };
  currentLocation: string;
  chaseState: ChaseState | null;
  gameTime: GameTime;
}

export function createMockInvestigator(overrides: Partial<Character> = {}): Character {
  return {
    id: 'char-edward-pierce',
    name: 'Edward Pierce',
    occupation: 'Prywatny detektyw',
    age: 38,
    background: 'Doświadczony śledczy z Bostonu badający tajemnice Nowej Anglii.',
    playerName: 'Gracz 1',
    isActive: true,
    lastUsed: new Date(),
    notes: '',
    experience: {
      totalXP: 0,
      availableXP: 0,
      earnedThisSession: 0,
      maxEarnedThisSession: 10,
    },
    developmentHistory: [],
    str: 60,
    con: 60,
    siz: 65,
    dex: 60,
    app: 45,
    int: 75,
    pow: 60,
    edu: 70,
    luck: 55,
    hp: 12,
    maxHp: 12,
    san: 60,
    maxSan: 89,
    mp: 12,
    maxMp: 12,
    dayStartSan: 60,
    dailySanLoss: 0,
    skills: {
      'Spostrzegawczość': 65,
      'Walka Wręcz (Bijatyka)': 55,
      'Unik': 40,
      'Ukrywanie': 45,
      'Pierwsza Pomoc': 50,
      'Zastraszanie': 50,
      'Perswazja': 45,
      'Prowadzenie Samochodu': 40,
      'Mity Cthulhu': 10,
      'Inteligencja': 75,
      'Poczytalność': 60,
    },
    journal: [],
    investigatorDossier: {
      adventureId: 'arkham-investigation',
      clues: [],
      npcs: [],
      locations: [],
      notes: [],
    },
    ...overrides,
  };
}

export interface MockGMPipelineOptions {
  initialCharacter?: Character;
  initialCharacters?: Character[];
  initialLocation?: string;
  initialGameTime?: GameTime;
}

export class MockGMPipeline {
  private characters: Character[];
  private activeCharacterId: string;
  private messages: MessageRecord[] = [];
  private currentLocation: string;
  private chaseState: ChaseState | null = null;
  private turnCount = 0;
  private combatActive = false;
  private gameTime: GameTime;

  private lastSkillTests: SkillTestData[] = [];
  private lastMeleeAttacks: MeleeAttackReference[] = [];
  private lastSanityEvents: SanityEvent[] = [];

  constructor(options: MockGMPipelineOptions = {}) {
    if (options.initialCharacters && options.initialCharacters.length > 0) {
      this.characters = options.initialCharacters.map((c) => ({ ...c }));
      this.activeCharacterId = options.initialCharacter?.id || options.initialCharacters[0].id;
    } else {
      const defaultChar = options.initialCharacter || createMockInvestigator();
      this.characters = [{ ...defaultChar }];
      this.activeCharacterId = defaultChar.id;
    }
    this.currentLocation = options.initialLocation || 'Arkham Sanitarium';
    this.gameTime = options.initialGameTime
      ? { ...options.initialGameTime }
      : {
          year: 1925,
          month: 0, // Styczeń
          day: 14,
          hour: 10,
          minute: 0,
        };
  }

  public getActiveCharacter(): Character {
    const found = this.characters.find((c) => c.id === this.activeCharacterId);
    if (!found) {
      if (this.characters.length > 0) {
        return this.characters[0];
      }
      throw new Error('No characters in pipeline');
    }
    return found;
  }

  public setActiveCharacter(characterId: string): void {
    const exists = this.characters.some((c) => c.id === characterId);
    if (exists) {
      this.activeCharacterId = characterId;
    }
  }

  public updateActiveCharacter(patch: Partial<Character>): void {
    this.characters = this.characters.map((c) => {
      if (c.id === this.activeCharacterId) {
        return { ...c, ...patch };
      }
      return c;
    });
  }

  public updateCharacter(characterId: string, patch: Partial<Character>): void {
    this.characters = this.characters.map((c) => {
      if (c.id === characterId) {
        return { ...c, ...patch };
      }
      return c;
    });
  }

  public addCharacter(character: Character): void {
    const exists = this.characters.some((c) => c.id === character.id);
    if (!exists) {
      this.characters.push({ ...character });
    }
  }

  public getCharacters(): Character[] {
    return this.characters;
  }

  public getMessages(): MessageRecord[] {
    return this.messages;
  }

  public getCurrentLocation(): string {
    return this.currentLocation;
  }

  public setCurrentLocation(loc: string): void {
    this.currentLocation = loc;
  }

  public getChaseState(): ChaseState | null {
    return this.chaseState;
  }

  public setChaseState(state: ChaseState | null): void {
    this.chaseState = state;
  }

  public isCombatActive(): boolean {
    return this.combatActive;
  }

  public setCombatActive(active: boolean): void {
    this.combatActive = active;
  }

  public getTurnCount(): number {
    return this.turnCount;
  }

  public getLastSkillTests(): SkillTestData[] {
    return this.lastSkillTests;
  }

  public getLastMeleeAttacks(): MeleeAttackReference[] {
    return this.lastMeleeAttacks;
  }

  public getLastSanityEvents(): SanityEvent[] {
    return this.lastSanityEvents;
  }

  /**
   * Główna funkcja procesująca turę gry:
   * 1. Rejestruje opcjonalną wiadomość gracza
   * 2. Rejestruje odpowiedź MG
   * 3. Przepuszcza tekst MG przez parsery mechaniki, walki, pościgu, lokacji, statystyk i dziennika
   */
  public feedGMResponse(rawGmResponse: string, userMessage?: string): TurnResult {
    this.turnCount++;
    const messageId = `turn_msg_${this.turnCount}`;
    const now = new Date();

    if (userMessage) {
      this.messages.push({
        id: `user_${this.turnCount}`,
        role: 'user',
        content: userMessage,
        timestamp: now,
      });
    }

    this.messages.push({
      id: messageId,
      role: 'assistant',
      content: rawGmResponse,
      timestamp: now,
    });

    // 1. Wykrywanie walki
    const combatState = detectCombat(rawGmResponse);
    if (/\[WALKA:\s*START\]/i.test(rawGmResponse) || combatState?.trigger === 'start') {
      this.combatActive = true;
    } else if (/\[WALKA:\s*KONIEC\]/i.test(rawGmResponse) || combatState?.trigger === 'end') {
      this.combatActive = false;
    }

    // 2. Parsowanie testów umiejętności
    this.lastSkillTests = extractSkillTests(rawGmResponse);

    // 3. Parsowanie ataków wręcz
    this.lastMeleeAttacks = extractMeleeAttackReferences(rawGmResponse);

    // 4. Aktualizacja lokacji z tagów [LOKACJA: ...] i [ZMIANA_SCENY: ...]
    const locTag = extractLatestTagLocation(rawGmResponse);
    if (locTag && locTag.name) {
      this.currentLocation = locTag.name;
    }
    const sceneChange = extractSceneChangeTag(rawGmResponse);
    if (sceneChange && sceneChange.newLocation) {
      this.currentLocation = sceneChange.newLocation;
    }

    // 5. Aplikacja zmian statystyk (HP / SAN)
    const activeChar = this.getActiveCharacter();
    const statChanges = applyStatChangesToParty(this.characters, activeChar, rawGmResponse);
    this.characters = statChanges.characters;
    this.lastSanityEvents = statChanges.sanityEvents;

    // 6. Aplikacja zmian w dzienniku i dossier
    const journalChanges = appendJournalToParty(
      this.characters,
      this.getActiveCharacter(),
      rawGmResponse,
      messageId
    );
    this.characters = journalChanges.characters;

    // 6-BIS. Obsługa zdobytych przedmiotów [ZDOBYTY_PRZEDMIOT:] (Issue #565)
    const acquiredProposals = extractAcquiredItemProposals(rawGmResponse, messageId);
    if (acquiredProposals.length > 0) {
      for (const proposal of acquiredProposals) {
        const targetChar = proposal.recipientName
          ? this.characters.find(
              (c) => c.name.toLowerCase().trim() === proposal.recipientName?.toLowerCase().trim()
            ) || this.getActiveCharacter()
          : this.getActiveCharacter();

        const seed = createAcquiredEquipmentSeed(proposal);
        const newEq: EquipmentItem = {
          id: `eq_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          name: proposal.name,
          description: proposal.description,
          category: seed.category || 'personal',
          condition: 'used',
          source: 'found',
          ...seed,
        };
        targetChar.equipment = [...(targetChar.equipment || []), newEq];
      }
    }

    // 7. Aktualizacja czasu gry z tagu [AKTUALNY CZAS: ...]
    const timeUpdate = extractTimeUpdate(rawGmResponse);
    if (timeUpdate) {
      this.gameTime = {
        ...this.gameTime,
        ...timeUpdate,
      };
    }

    return {
      turn: this.turnCount,
      messageId,
      userMessage,
      gmResponse: rawGmResponse,
      skillTests: this.lastSkillTests,
      meleeAttacks: this.lastMeleeAttacks,
      combatState,
      statChanges,
      journalChanges,
      currentLocation: this.currentLocation,
      chaseState: this.chaseState,
      gameTime: this.getGameTime(),
    };
  }

  public processAction(userAction: string, simulatedGMResponseText: string): TurnResult {
    return this.feedGMResponse(simulatedGMResponseText, userAction);
  }

  // =========================================================================
  // ZARZĄDZANIE CZASEM GRY (GameTime, kalendarz, dzień/noc, fazy księżyca)
  // =========================================================================

  public getGameTime(): GameTime {
    return { ...this.gameTime };
  }

  public setGameTime(time: Partial<GameTime>): void {
    this.gameTime = { ...this.gameTime, ...time };
  }

  public advanceGameTime(minutes: number): void {
    let { year, month, day, hour, minute } = this.gameTime;

    minute += minutes;

    while (minute >= 60) {
      minute -= 60;
      hour++;
    }
    while (minute < 0) {
      minute += 60;
      hour--;
    }

    while (hour >= 24) {
      hour -= 24;
      day++;
    }
    while (hour < 0) {
      hour += 24;
      day--;
    }

    const daysInMonth = (y: number, m: number) => {
      const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      const isLeapYear = (yearVal: number) =>
        (yearVal % 4 === 0 && yearVal % 100 !== 0) || yearVal % 400 === 0;
      if (m === 1 && isLeapYear(y)) return 29;
      return days[m];
    };

    while (day > daysInMonth(year, month)) {
      day -= daysInMonth(year, month);
      month++;
      if (month > 11) {
        month = 0;
        year++;
      }
    }
    while (day < 1) {
      month--;
      if (month < 0) {
        month = 11;
        year--;
      }
      day += daysInMonth(year, month);
    }

    this.gameTime = { year, month, day, hour, minute };
  }

  public isNight(): boolean {
    const { hour } = this.gameTime;
    return hour < 6 || hour >= 21;
  }

  public getMoonPhase(): MoonPhase {
    const { year, month, day } = this.gameTime;
    const referenceDate = new Date(1920, 0, 6);
    const targetDate = new Date(year, month, day);
    const diffMs = targetDate.getTime() - referenceDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    const lunarCycle = 29.53;
    const dayInCycle = ((diffDays % lunarCycle) + lunarCycle) % lunarCycle;
    const MOON_PHASES: MoonPhase[] = [
      'new',
      'waxing_crescent',
      'first_quarter',
      'waxing_gibbous',
      'full',
      'waning_gibbous',
      'last_quarter',
      'waning_crescent',
    ];
    const phaseIndex = Math.floor(dayInCycle / (lunarCycle / 8));
    return MOON_PHASES[phaseIndex % 8];
  }

  public getDayOfWeek(): string {
    const { year, month, day } = this.gameTime;
    const DAYS_PL = [
      'Niedziela',
      'Poniedziałek',
      'Wtorek',
      'Środa',
      'Czwartek',
      'Piątek',
      'Sobota',
    ];
    const date = new Date(year, month, day);
    return DAYS_PL[date.getDay()];
  }

  public generateTimeTag(time?: Partial<GameTime>): string {
    const target = time ? { ...this.gameTime, ...time } : this.gameTime;
    const MONTHS_PL = [
      'Stycznia',
      'Lutego',
      'Marca',
      'Kwietnia',
      'Maja',
      'Czerwca',
      'Lipca',
      'Sierpnia',
      'Września',
      'Października',
      'Listopada',
      'Grudnia',
    ];
    const hourStr = target.hour.toString().padStart(2, '0');
    const minStr = target.minute.toString().padStart(2, '0');
    return `[AKTUALNY CZAS: ${target.day} ${MONTHS_PL[target.month]} ${target.year}, ${hourStr}:${minStr}]`;
  }

  // =========================================================================
  // POMOCNIKI PROTOKOŁU MG (Generatory deterministycznych tagów)
  // =========================================================================

  public generateSkillTestTag(params: {
    skill: string;
    difficulty?: 'zwykly' | 'trudny' | 'ekstremalny';
    justification?: string;
    targetCharacter?: string;
    modifiers?: string;
  }): string {
    const diff = params.difficulty ?? 'zwykly';
    const just = params.justification ?? 'Sprawdzenie umiejętności';
    const mods = params.modifiers ?? '';
    const who = params.targetCharacter ? `@${params.targetCharacter}: ` : '';
    return `[TEST: ${who}${params.skill} | ${diff} | ${mods} | ${just}]`;
  }

  public generateMeleeAttackTag(params: {
    attackerId: string;
    targetName: string;
    attackOptionId?: string;
    intent?: string;
  }): string {
    const attackId = params.attackOptionId ?? 'brawl';
    const intent = params.intent ?? 'Cios';
    return `[ATAK_WRĘCZ: napastnik=${params.attackerId} | cel=@${params.targetName} | atak=${attackId} | zamiar=${intent}]`;
  }

  public generateSanityTag(
    delta: number | string,
    reason: string,
    targetCharacter?: string
  ): string {
    const deltaStr = typeof delta === 'number' && delta > 0 ? `+${delta}` : `${delta}`;
    const who = targetCharacter ? `@${targetCharacter}: ` : '';
    return `[SANITY: ${who}${deltaStr}: ${reason}]`;
  }

  public generateHpTag(
    delta: number | string,
    reason?: string,
    targetCharacter?: string
  ): string {
    const deltaStr = typeof delta === 'number' && delta > 0 ? `+${delta}` : `${delta}`;
    const who = targetCharacter ? `@${targetCharacter}: ` : '';
    const reasonStr = reason ? `: ${reason}` : '';
    return `[HP: ${who}${deltaStr}${reasonStr}]`;
  }

  public generateJournalTag(params: {
    type: 'trop' | 'odkrycie' | 'npc' | 'lokacja' | 'walka' | 'poczytalnosc' | 'notatka';
    title: string;
    content: string;
    targetCharacter?: string;
  }): string {
    const who = params.targetCharacter ? `@${params.targetCharacter}:` : '';
    return `[DZIENNIK:${who}${params.type}:${params.title}]${params.content}[/DZIENNIK]`;
  }

  public generateLocationTag(name: string, description?: string): string {
    return `[LOKACJA: ${name}${description ? `: ${description}` : ''}]`;
  }

  public generateSceneChangeTag(newLocation: string, transitionType?: string): string {
    return `[ZMIANA_SCENY: ${newLocation}${transitionType ? ` | typ=${transitionType}` : ''}]`;
  }

  // =========================================================================
  // LOGIKA MECHANICZNA (Wywołania produkcyjnych silników)
  // =========================================================================

  /**
   * Rozstrzyga pojedynczą rundę starcia wręcz z uwzględnieniem obrony gracza (Unik / Kontratak)
   * oraz aplikuje ewentualne obrażenia HP przez oficjalny rurociąg tagów.
   */
  public executeCombatRound(params: {
    attackerRoll: number;
    attackerSkill: number;
    defenderRoll: number;
    defenderSkill: number;
    defenseChoice: DefenseChoice;
    attackerDamageFormula?: string;
    defenderDamageFormula?: string;
    defenderArmor?: number;
    attackerArmor?: number;
    attackerName?: string;
    defenderName?: string;
    defenderCharacterId?: string;
    attackerMaxHp?: number;
    recordNarrative?: boolean;
  }): { resolution: MeleeResolutionResult; hpAfter: number } {
    const defender =
      (params.defenderCharacterId && this.characters.find((c) => c.id === params.defenderCharacterId)) ||
      (params.defenderName && this.characters.find((c) => c.name === params.defenderName)) ||
      this.getActiveCharacter();

    const resolution = resolveMeleeEngagement({
      attackerName: params.attackerName ?? 'Kultysta',
      defenderName: params.defenderName ?? defender.name,
      attackerRoll: params.attackerRoll,
      attackerSkill: params.attackerSkill,
      defenderRoll: params.defenderRoll,
      defenderSkill: params.defenderSkill,
      defenseChoice: params.defenseChoice,
      attackerWeaponFormula: params.attackerDamageFormula ?? '1d6',
      defenderWeaponFormula: params.defenderDamageFormula ?? '1d3',
      defenderArmor: params.defenderArmor ?? defender.armor ?? 0,
      attackerArmor: params.attackerArmor ?? 0,
      defenderMaxHp: defender.maxHp,
      attackerMaxHp: params.attackerMaxHp ?? 10,
    });

    if (resolution.winner === 'attacker' && resolution.damageDealtTo === 'defender' && resolution.damage) {
      const damage = resolution.damage.effectiveDamage;
      if (damage > 0) {
        const hpTag = this.generateHpTag(-damage, 'Obrażenia w walce wręcz', defender.name);
        this.feedGMResponse(`Napastnik (${params.attackerName ?? 'Kultysta'}) trafia ${defender.name}! ${hpTag}`);
      }
    } else if (params.recordNarrative) {
      if (resolution.winner === 'defender' && resolution.damageDealtTo === 'attacker') {
        this.feedGMResponse(
          `${defender.name} skutecznie kontratakuje, zadając ${resolution.damage?.effectiveDamage ?? 0} obrażeń napastnikowi (${params.attackerName ?? 'Kultysta'})!`
        );
      } else if (resolution.winner === 'defender') {
        this.feedGMResponse(
          `${defender.name} zwinnie unika ataku napastnika (${params.attackerName ?? 'Kultysta'})!`
        );
      } else {
        this.feedGMResponse(`Wymiana ciosów bez trafienia - atak i obrona chybione.`);
      }
    }

    const currentDefender = this.characters.find((c) => c.id === defender.id) || defender;

    return {
      resolution,
      hpAfter: currentDefender.hp,
    };
  }

  /**
   * Inicjalizuje stan pościgu za pomocą silnika CoC 7e RAW.
   */
  public initiateChase(params: {
    fleeingParticipant?: Partial<ChaseParticipant>;
    pursuers: Partial<ChaseParticipant>[];
    initialDistance?: number;
    trackLength?: number;
    escapeDistanceThreshold?: number;
    hazardPositions?: Record<number, ChaseHazard>;
    fleeingSpeedRoll?: ChaseSpeedRollOutcome | Record<string, ChaseSpeedRollOutcome>;
    pursuerSpeedRolls?: Record<string, ChaseSpeedRollOutcome>;
  }): ChaseState {
    const active = this.getActiveCharacter();
    const fleeingInput = {
      id: params.fleeingParticipant?.id || active.id,
      name: params.fleeingParticipant?.name || active.name,
      isPlayer: true,
      mov: params.fleeingParticipant?.mov || active.move || 8,
      dex: params.fleeingParticipant?.dex ?? active.dex ?? 50,
      segmentIndex: params.fleeingParticipant?.segmentIndex ?? params.initialDistance ?? 2,
      characterId: active.id,
    };

    const pursuersInput = params.pursuers.map((p, idx) => ({
      id: p.id || `pursuer_${idx + 1}`,
      name: p.name || `Ścigający ${idx + 1}`,
      isPlayer: false,
      mov: p.mov || 8,
      dex: p.dex ?? 50,
      segmentIndex: p.segmentIndex || 0,
      skillValues: p.skillValues,
    }));

    const state = createChaseState({
      fleeing: fleeingInput,
      pursuers: pursuersInput,
      initialDistance: params.initialDistance ?? 2,
      trackLength: params.trackLength ?? 10,
      escapeDistanceThreshold: params.escapeDistanceThreshold ?? 4,
      hazardPositions: params.hazardPositions,
      fleeingSpeedRoll: params.fleeingSpeedRoll,
      pursuerSpeedRolls: params.pursuerSpeedRolls,
    });

    this.chaseState = state;
    return state;
  }

  /**
   * Wykonuje manewr uciekającego gracza oraz tury ścigających NPC w bieżącej rundzie,
   * respektując oficjalną inicjatywę według DEX CoC 7e RAW.
   */
  public executeChaseRound(params: {
    maneuver: ChaseManeuver;
    pursuerHazardOutcomes?: Record<string, RollOutcome[]>;
  }): { nextState: ChaseState; playerLog: ChaseRoundLog | null; pursuerLogs: ChaseRoundLog[] } {
    if (!this.chaseState) {
      throw new Error('No active chase state to execute maneuver');
    }

    let currentState = this.chaseState;
    const allPursuerLogs: ChaseRoundLog[] = [];

    // 1. Jeśli bieżącym aktywnym uczestnikiem jest ścigający (wyższy DEX niż badacz),
    // pozwól ścigającym z wyższym DEX wykonać ich akcje dopóki nie nadejdzie tura gracza
    while (
      currentState.status === 'ongoing' &&
      currentState.activeActorId &&
      currentState.activeActorId !== params.maneuver.actorId
    ) {
      const activeParticipant = currentState.participants.find(
        (p) => p.id === currentState.activeActorId
      );
      if (!activeParticipant || activeParticipant.isPlayer || activeParticipant.isFleeing) {
        break;
      }
      const prePursuerResult = executePursuerTurns(currentState, params.pursuerHazardOutcomes);
      currentState = prePursuerResult.nextState;
      allPursuerLogs.push(...prePursuerResult.logs);
      if (currentState.status !== 'ongoing') {
        break;
      }
    }

    // 2. Jeśli pościg trwa, wykonaj manewr gracza
    let playerLog: ChaseRoundLog | null = null;
    if (currentState.status === 'ongoing') {
      const playerRes = executePlayerManeuver(currentState, params.maneuver);
      currentState = playerRes.nextState;
      playerLog = playerRes.log;
    }

    // 3. Rozlicz tury pozostałych ścigających w tej rundzie
    if (currentState.status === 'ongoing') {
      const postPursuerResult = executePursuerTurns(currentState, params.pursuerHazardOutcomes);
      currentState = postPursuerResult.nextState;
      allPursuerLogs.push(...postPursuerResult.logs);
    }

    this.chaseState = currentState;
    return { nextState: currentState, playerLog, pursuerLogs: allPursuerLogs };
  }

  /**
   * Rozstrzyga spotkanie z koszmarem (utratę SAN) i opcjonalny test Inteligencji (przy stracie >= 5 SAN).
   */
  public resolveSanityHorror(params: {
    sanLoss: number;
    reason: string;
    intPassed?: boolean;
    forceBoutIndex?: number;
    targetCharacterId?: string;
    targetCharacterName?: string;
  }): { events: SanityEvent[]; charAfter: Character } {
    const target =
      (params.targetCharacterId && this.characters.find((c) => c.id === params.targetCharacterId)) ||
      (params.targetCharacterName && this.characters.find((c) => c.name === params.targetCharacterName)) ||
      this.getActiveCharacter();

    const sanTag = this.generateSanityTag(-params.sanLoss, params.reason, target.name);
    this.feedGMResponse(`Przerażający widok wstrząsa umysłem (${target.name})! ${sanTag}`);

    if (
      this.lastSanityEvents.some((ev) => ev.type === 'int_check_required') &&
      params.intPassed !== undefined
    ) {
      const currentTarget = this.characters.find((c) => c.id === target.id) || target;
      const intRes = resolveIntelligenceTest(currentTarget, params.intPassed, {
        forceBoutIndex: params.forceBoutIndex,
      });
      this.updateCharacter(currentTarget.id, intRes.nextCharacter);
      if (intRes.event) {
        this.lastSanityEvents.push(intRes.event);
      }
    }

    const updatedChar = this.characters.find((c) => c.id === target.id) || target;
    return {
      events: this.lastSanityEvents,
      charAfter: updatedChar,
    };
  }

  /**
   * Wykonuje Test Pomysłu (Idea Roll) przy impasie śledczym (Dead End).
   */
  public triggerIdeaRoll(params: {
    characterId?: string;
    targetSubject?: { id: string; title: string; description?: string };
    fixedRoll?: number;
    contextClues?: Array<{
      title: string;
      description?: string;
      type?: string;
      miceType?: MiceQuotientType;
    }>;
  }): {
    result: IdeaRollResult;
    generatedResponse: string;
    turnResult: TurnResult;
    promptDirective: string;
  } {
    const active =
      (params.characterId && this.characters.find((c) => c.id === params.characterId)) ||
      this.getActiveCharacter();

    const result = executeIdeaRoll({
      character: active,
      targetSubject: params.targetSubject
        ? { id: params.targetSubject.id, title: params.targetSubject.title, description: params.targetSubject.description }
        : undefined,
      fixedRoll: params.fixedRoll,
      contextClues: params.contextClues,
    });

    const promptDirective = buildIdeaRollPrompt(
      result,
      params.targetSubject
        ? { title: params.targetSubject.title, description: params.targetSubject.description }
        : undefined,
      params.contextClues
    );

    let generatedResponse = '';
    const clueTitle = params.targetSubject?.title || 'Wskazówka Dedukcji';

    if (result.isSuccess) {
      generatedResponse = `
[MYŚLI_MG: Gracz zdał Test Pomysłu. Ujawniam czysty trop dedukcyjny bez komplikacji.]
Analizujesz zgromadzone fakty. W mgnieniu oka wszystkie elementy układanki wskakują na swoje miejsce.
${this.generateJournalTag({
  type: 'odkrycie',
  title: clueTitle,
  content: 'Po chłodnej analizie faktów uświadamiasz sobie, że tajne przejście ukryto za zegarem w gabinecie.',
  targetCharacter: active.name,
})}
      `.trim();
    } else {
      // CoC 7e RAW: Porażka w teście pomysłu również daje wskazówkę, lecz z komplikacją / niebezpieczeństwem (Fail-Forward)
      generatedResponse = `
[MYŚLI_MG: Gracz oblał Test Pomysłu. Reguła RAW Fail-Forward: trop zostaje podany, ale natychmiast pojawia się komplikacja.]
Tak bardzo zatapiasz się w myślach, że tracisz czujność. Doznajesz olśnienia co do celu kultystów, lecz w tym samym momencie słyszysz chrzęst butów za plecami!
${this.generateJournalTag({
  type: 'trop',
  title: clueTitle,
  content: 'Zrozumiałeś zamiary kultystów, lecz twoje zawahanie zaalarmowało strażnika doków.',
  targetCharacter: active.name,
})}
[WALKA: START]
${this.generateMeleeAttackTag({
  attackerId: 'guard_thug',
  targetName: active.name,
  attackOptionId: 'brawl',
  intent: 'Cios pałką z zaskoczenia',
})}
      `.trim();
    }

    const turnResult = this.feedGMResponse(generatedResponse, 'Wzywam Test Pomysłu (Idea Roll)...');

    return { result, generatedResponse, turnResult, promptDirective };
  }

  // =========================================================================
  // SERIALIZACJA I TRWAŁOŚĆ STANU (Full Game Save)
  // =========================================================================

  public createFullSave(name?: string, userId?: string): FullGameSave {
    return FullGameSaveManager.createFullSave({
      name: name || `Save Podróży ${new Date().toISOString()}`,
      userId: userId || 'test-user',
      locale: 'pl',
      messages: this.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      })),
      gameSettings: {
        aiSettings: defaultAISettings,
      },
      characters: this.characters,
      activeCharacterId: this.activeCharacterId,
      activeChaseState: this.chaseState,
      campaigns: [],
      npcs: [],
      locations: this.currentLocation
        ? [
            {
              id: 'loc_current',
              name: this.currentLocation,
              type: 'building' as const,
              era: '1920s' as const,
              description: 'Aktualna lokacja podróży',
              appearance: 'Opis wizualny',
              atmosphere: 'Mroczna atmosfera',
              connectedLocations: [],
              npcs: [],
              items: [],
              secrets: [],
              gmNotes: '',
              createdAt: new Date(),
              updatedAt: new Date(),
              visitedByPlayer: true,
            },
          ]
        : [],
      currentLocationId: this.currentLocation ? 'loc_current' : undefined,
    });
  }

  public saveToDisk(filePath: string, name?: string, userId?: string): FullGameSave {
    const save = this.createFullSave(name, userId);
    const compressed = FullGameSaveManager.compressSave(save);
    fs.writeFileSync(filePath, compressed, 'utf8');
    return save;
  }

  public loadFromDisk(filePath: string): void {
    const raw = fs.readFileSync(filePath, 'utf8');
    const restored = FullGameSaveManager.decompressSave(raw);
    if (!restored) {
      throw new Error(`Failed to decompress save from ${filePath}`);
    }
    this.loadFullSave(restored);
  }

  public loadFullSave(save: FullGameSave): void {
    if (!FullGameSaveManager.validateSave(save)) {
      throw new Error('Invalid save structure for FullGameSave');
    }

    this.characters = save.characters.map((c) => ({ ...c }));
    this.activeCharacterId = save.activeCharacterId || (this.characters[0]?.id ?? '');
    this.messages = save.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: new Date(m.timestamp),
    }));
    this.chaseState = save.activeChaseState ?? null;
    this.turnCount = this.messages.filter((m) => m.role === 'assistant').length;

    // Rekonstrukcja stanu walki z historii wiadomości
    this.combatActive = false;
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const msg = this.messages[i];
      if (msg.role === 'assistant') {
        const combat = detectCombat(msg.content);
        if (/\[WALKA:\s*START\]/i.test(msg.content) || combat?.trigger === 'start') {
          this.combatActive = true;
          break;
        } else if (/\[WALKA:\s*KONIEC\]/i.test(msg.content) || combat?.trigger === 'end') {
          this.combatActive = false;
          break;
        }
      }
    }

    if (save.locations && save.locations.length > 0) {
      const activeLoc = save.locations.find((l) => l.id === save.currentLocationId) || save.locations[0];
      this.currentLocation = activeLoc.name;
    }
  }
}
