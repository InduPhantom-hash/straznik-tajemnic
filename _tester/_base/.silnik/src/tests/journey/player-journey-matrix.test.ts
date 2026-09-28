/**
 * @file player-journey-matrix.test.ts
 * Headless symulator podróży gracza (Player-Journey Deterministic Matrix) - Issue #534.
 *
 * Pokrywa 6 dedykowanych ścieżek scenariuszowych oraz 1 ciągły 100-turowy test obciążeniowy:
 * - Ścieżka 1: Start gry -> Deklaracja akcji -> Test umiejętności -> Sukces/Porażka -> Aktualizacja dziennika ([DZIENNIK:...])
 * - Ścieżka 2: Inicjacja walki ([WALKA: START], [ATAK_WRĘCZ:...]) -> Wybór obrony / kontratak -> Rzut na obrażenia -> Modyfikacja HP
 * - Ścieżka 3: Inicjacja pościgu ([POŚCIG: START]) -> Test szybkości / tura -> Pokonanie przeszkody / skrót -> Zmiana lokacji
 * - Ścieżka 4: Spotkanie z horrorem ([SANITY:...]) -> Test poczytalności -> Utrata punktów -> Atak szału / czasowe szaleństwo
 * - Ścieżka 5: Impas (Dead End) -> Wyzwalacz braku poszlak -> Weryfikacja executeIdeaRoll -> Sukces i Fail-forward
 * - Ścieżka 6: Pełny zapis gry (createFullSave) -> Fizyczny zapis do save.json w os.tmpdir() -> Symulowany restart -> Odczyt i weryfikacja ciągłości
 * - Ciągła matryca 100-turowa (Continuous 100-turn stress test) z kryterium wydajności < 5 sekund w Jest.
 */

import os from 'os';
import path from 'path';
import fs from 'fs';
import {
  MockGMPipeline,
  createMockInvestigator,
} from './mock-gm-pipeline';
import { FullGameSaveManager } from '@/lib/full-game-save-manager';
import { DEFAULT_CHASE_HAZARDS } from '@/lib/chase/chase-engine';

describe('Player-Journey Deterministic Matrix (Issue #534)', () => {
  // =========================================================================
  // ŚCIEŻKA 1: Badanie i testy umiejętności (Skill Tests & Journal Updates)
  // =========================================================================
  describe('Path 1: Game start -> Action declaration -> Skill test -> Success/Failure -> Journal update', () => {
    let pipeline: MockGMPipeline;

    beforeEach(() => {
      pipeline = new MockGMPipeline({
        initialCharacter: createMockInvestigator(),
        initialLocation: 'Arkham Sanitarium',
      });
    });

    it('1.1: Inicjalizuje stan początkowy badacza, lokację i rejestruje pierwsze wejście', () => {
      const activeChar = pipeline.getActiveCharacter();
      expect(activeChar.hp).toBe(12);
      expect(activeChar.san).toBe(60);
      expect(activeChar.dailySanLoss).toBe(0);
      expect(pipeline.getCurrentLocation()).toBe('Arkham Sanitarium');

      const introResponse = `
Wkraczasz do zakurzonego gabinetu doktora Hardinga w Arkham Sanitarium.
[LOKACJA: Gabinet doktora Hardinga: Zakurzone biurko, szafy z kartotekami pacjentów]
[NPC: Dr Eric Harding: Lekarz psychiatra w wymiętym fartuchu, unikający kontaktu wzrokowego]
      `.trim();

      const turn = pipeline.feedGMResponse(introResponse);
      expect(turn.currentLocation).toBe('Gabinet doktora Hardinga');
      expect(pipeline.getCurrentLocation()).toBe('Gabinet doktora Hardinga');

      const charAfter = pipeline.getActiveCharacter();
      const dossierNpcs = charAfter.investigatorDossier?.npcs || [];
      expect(dossierNpcs.some((n) => n.name.includes('Dr Eric Harding'))).toBe(true);
    });

    it('1.2: Przetwarza deklarację akcji gracza i parsuje wezwanie testu umiejętności [TEST:...]', () => {
      const playerAction = 'Przeszukuję szuflady biurka w poszukiwaniu ukrytych rejestrów pacjentów.';
      const gmPrompt = `
[MYŚLI_MG: Gracz przeszukuje biurko. Wymagam testu Spostrzegawczości.]
Podchodzisz do dębowego biurka. Wiele szuflad jest zamkniętych, a zamki noszą ślady manipulacji.
[TEST: Spostrzegawczość | zwykly | | Szukasz ukrytego schowka lub podwójnego dna]
      `.trim();

      const turn = pipeline.processAction(playerAction, gmPrompt);

      expect(turn.skillTests.length).toBe(1);
      const test = turn.skillTests[0];
      expect(test.skillName).toBe('Spostrzegawczość');
      expect(test.difficulty).toBe('zwykly');
      expect(test.justification).toBe('Szukasz ukrytego schowka lub podwójnego dna');
      expect(pipeline.getMessages().length).toBe(2);
      expect(pipeline.getMessages()[0].role).toBe('user');
      expect(pipeline.getMessages()[1].role).toBe('assistant');
    });

    it('1.3: Obsługuje sukces w teście i rejestruje poszlakę w Dzienniku oraz Dossier ([DZIENNIK:trop:...])', () => {
      const successResponse = `
[MYŚLI_MG: Test zdany. Ujawniam notes doktora Hardinga.]
Twoje palce natrafiają na fałszywą ściankę w dolnej szufladzie. W środku ukryto oprawny w czarną skórę notatnik!
[DZIENNIK:trop:Notes doktora Hardinga]Zaszyfrowany rejestr pacjentów z adnotacjami o nocnych transferach do piwnic.[/DZIENNIK]
      `.trim();

      const turn = pipeline.feedGMResponse(successResponse, 'Rzucam na Spostrzegawczość: wynik 32 (sukces zwykły).');

      expect(turn.journalChanges.changed).toBe(true);
      const char = pipeline.getActiveCharacter();

      const clues = char.investigatorDossier?.clues || [];
      expect(clues.some((c) => c.title === 'Notes doktora Hardinga')).toBe(true);
      expect(char.journal && char.journal.length > 0).toBe(true);
    });

    it('1.4: Obsługuje porażkę w teście – brak nowej poszlaki i zachowanie spójności narracji', () => {
      const initialCluesCount = pipeline.getActiveCharacter().investigatorDossier?.clues.length || 0;
      const failureResponse = `
[MYŚLI_MG: Test oblany. Szuflada zacina się, hałas alarmuje otoczenie.]
Szarpiąc za uchwyt, odłamujesz zardzewiały rygiel. Drewno pęka z głośnym trzaskiem, nie odnajdujesz żadnego schowka.
      `.trim();

      const turn = pipeline.feedGMResponse(failureResponse, 'Rzucam na Spostrzegawczość: wynik 85 (porażka).');

      const char = pipeline.getActiveCharacter();
      const currentCluesCount = char.investigatorDossier?.clues.length || 0;
      expect(currentCluesCount).toBe(initialCluesCount);
      expect(turn.journalChanges.changed).toBe(false);
    });

    it('1.5: Obsługuje multi-tagi w pojedynczej turze (LOKACJA + NPC + DZIENNIK odkrycie + DZIENNIK notatka)', () => {
      const complexResponse = `
Wchodzisz do piwnic Archiwum.
[LOKACJA: Podziemia Archiwum: Wilgotne sklepienia z czerwonej cegły]
[NPC: Dozorca Thomas: Starszy człowiek trzymający pęk zardzewiałych kluczy]
[DZIENNIK:odkrycie:Stara Pieczęć]Srebrna pieczęć z symbolem oka.[/DZIENNIK]
[DZIENNIK:notatka:Ostrzeżenie Dozorcy]Dozorca wspomina o dziwnych dźwiękach po zmroku.[/DZIENNIK]
      `.trim();

      const turn = pipeline.feedGMResponse(complexResponse);
      expect(turn.currentLocation).toBe('Podziemia Archiwum');
      expect(pipeline.getCurrentLocation()).toBe('Podziemia Archiwum');

      const char = pipeline.getActiveCharacter();
      expect(char.investigatorDossier?.locations.some((l) => l.name.includes('Podziemia Archiwum'))).toBe(true);
      expect(char.investigatorDossier?.npcs.some((n) => n.name.includes('Thomas'))).toBe(true);
      expect(char.investigatorDossier?.clues.some((c) => c.title.includes('Stara Pieczęć'))).toBe(true);
      expect(char.journal?.some((j) => j.title.includes('Ostrzeżenie Dozorcy'))).toBe(true);
    });
  });

  // =========================================================================
  // ŚCIEŻKA 2: Walka wręcz i obrażenia (Combat Initiation & Resolution CoC RAW)
  // =========================================================================
  describe('Path 2: Combat initiation -> Defense choice / counterattack -> Damage roll -> HP modification', () => {
    let pipeline: MockGMPipeline;

    beforeEach(() => {
      pipeline = new MockGMPipeline({
        initialCharacter: createMockInvestigator({ hp: 12, maxHp: 12 }),
      });
    });

    it('2.1: Inicjuje walkę tagiem [WALKA: START] i rejestruje wrogi atak wręcz [ATAK_WRĘCZ:...]', () => {
      const combatStartResponse = `
[WALKA: START]
Zza regału z aktami wyskakuje zakapturzony kultysta z błyszczącym sztyletem!
Walka rozpoczyna się!
[ATAK_WRĘCZ: napastnik=cultist_01 | cel=@Edward Pierce | atak=brawl | zamiar=Pchnięcie nożem w klatkę piersiową]
      `.trim();

      const turn = pipeline.feedGMResponse(combatStartResponse);

      expect(pipeline.isCombatActive()).toBe(true);
      expect(turn.meleeAttacks.length).toBe(1);
      const attack = turn.meleeAttacks[0];
      expect(attack.attackerNpcId).toBe('cultist_01');
      expect(attack.targetCharacterName).toBe('Edward Pierce');
      expect(attack.attackOptionId).toBe('brawl');
      expect(attack.intent).toBe('Pchnięcie nożem w klatkę piersiową');
    });

    it('2.2: Rozstrzyga obronę: Unik (Dodge) z asymetrycznym remisem na korzyść obrońcy', () => {
      // Obaj uzyskują zwykły sukces (Kultysta 40/50, Gracz 30/40)
      // W CoC 7e RAW przy remisie stopni sukcesu w Uniku wygrywa obrońca (atak chybia)
      const combatRound = pipeline.executeCombatRound({
        attackerRoll: 40,
        attackerSkill: 50,
        defenderRoll: 30,
        defenderSkill: 40,
        defenseChoice: 'dodge',
        attackerDamageFormula: '1d6',
      });

      expect(combatRound.resolution.winner).toBe('defender');
      expect(combatRound.resolution.isTie).toBe(true);
      expect(combatRound.resolution.damageDealtTo).toBe('none');
      expect(combatRound.hpAfter).toBe(12);
      expect(pipeline.getActiveCharacter().hp).toBe(12);
    });

    it('2.3: Rozstrzyga obronę: Kontratak (Fight Back) z wyższym stopniem sukcesu badacza', () => {
      // Kultysta: zwykły sukces (35 vs 50). Gracz: sukces ekstremalny (10 vs 55).
      const combatRound = pipeline.executeCombatRound({
        attackerRoll: 35,
        attackerSkill: 50,
        defenderRoll: 10,
        defenderSkill: 55,
        defenseChoice: 'fight_back',
        attackerDamageFormula: '1d6',
        defenderDamageFormula: '1d3',
      });

      expect(combatRound.resolution.winner).toBe('defender');
      expect(combatRound.resolution.damageDealtTo).toBe('attacker');
      expect(combatRound.hpAfter).toBe(12);
      expect(pipeline.getActiveCharacter().hp).toBe(12);
    });

    it('2.4: Rozstrzyga trafienie napastnika i redukcję HP badacza przez rurociąg [HP:...]', () => {
      // Kultysta: trudny sukces (15 vs 50). Gracz: porażka uniku (70 vs 40).
      const combatRound = pipeline.executeCombatRound({
        attackerRoll: 15,
        attackerSkill: 50,
        defenderRoll: 70,
        defenderSkill: 40,
        defenseChoice: 'dodge',
        attackerDamageFormula: '4', // stałe 4 obrażenia
      });

      expect(combatRound.resolution.winner).toBe('attacker');
      expect(combatRound.resolution.damageDealtTo).toBe('defender');
      expect(combatRound.hpAfter).toBe(8); // 12 - 4 = 8
      expect(pipeline.getActiveCharacter().hp).toBe(8);
      expect(pipeline.getActiveCharacter().hasMajorWound).toBeFalsy();
    });

    it('2.5: Weryfikuje próg Ciężkiej Rany (Major Wound) i Tarczę Ocalenia Fail-Forward przy 0 HP', () => {
      // Cios zadaje 6 obrażeń (>= maxHp/2 = 6) -> Major Wound
      const heavyHit = `[HP: -6: Głęboka rana cięta od szponu]`;
      pipeline.feedGMResponse(heavyHit);
      expect(pipeline.getActiveCharacter().hp).toBe(6);
      expect(pipeline.getActiveCharacter().hasMajorWound).toBe(true);

      // Kolejny cios sprowadza HP do 0 -> Tarcza Ocalenia Setha Skorkowsky'ego
      const lethalHit = `[HP: -6: Cios w skroń]`;
      pipeline.feedGMResponse(lethalHit);
      const charAtZero = pipeline.getActiveCharacter();
      expect(charAtZero.hp).toBe(0);
      expect(charAtZero.isUnconscious).toBe(true);
      expect(charAtZero.deathSavesUsed).toBe(1);
      expect(charAtZero.isDead).toBeFalsy();
      expect(charAtZero.scars && charAtZero.scars.length > 0).toBe(true);

      // Zakończenie walki
      pipeline.feedGMResponse(`[WALKA: KONIEC] Napastnik ucieka spłoszony syrenami.`);
      expect(pipeline.isCombatActive()).toBe(false);
    });

    it('2.6: Rozstrzyga leczenie i Pierwszą Pomoc po walce ([HP: +2:...]) z ustabilizowaniem stanu umierającego', () => {
      // Postać umierająca przy 0 HP po ciężkiej ranie
      pipeline.updateActiveCharacter({ hp: 0, hasMajorWound: true, isDying: true });
      expect(pipeline.getActiveCharacter().isDying).toBe(true);

      const healResponse = `[HP: +2: Opatrzenie rany i sole trzeźwiące]`;
      pipeline.feedGMResponse(healResponse);

      const charAfter = pipeline.getActiveCharacter();
      expect(charAfter.hp).toBe(2);
      expect(charAfter.isDying).toBe(false);
    });

    it('2.7: Tryb Duetu / Hot Seat: celowany atak w drugiego badacza (@Eleanor Trent) nie modyfikuje HP aktywnej postaci', () => {
      const eleanor = createMockInvestigator({
        id: 'char-eleanor-trent',
        name: 'Eleanor Trent',
        hp: 10,
        maxHp: 10,
        playerName: 'Gracz 2',
      });
      pipeline.addCharacter(eleanor);

      // Edward jest aktywny
      expect(pipeline.getActiveCharacter().name).toBe('Edward Pierce');

      // Atak celowany w Eleanor: Eleanor unika (porażka 60 vs 40), kultysta trafia (zwykły 30 vs 50) i zadaje 3 obrażenia
      const round = pipeline.executeCombatRound({
        attackerRoll: 30,
        attackerSkill: 50,
        defenderRoll: 60,
        defenderSkill: 40,
        defenseChoice: 'dodge',
        attackerDamageFormula: '3',
        defenderName: 'Eleanor Trent',
        defenderCharacterId: eleanor.id,
      });

      expect(round.resolution.winner).toBe('attacker');
      expect(round.resolution.damageDealtTo).toBe('defender');

      // Eleanor traci 3 HP (10 -> 7)
      const eleanorAfter = pipeline.getCharacters().find((c) => c.id === eleanor.id);
      expect(eleanorAfter?.hp).toBe(7);

      // Edward pozostaje nienaruszony przy 12 HP!
      expect(pipeline.getActiveCharacter().hp).toBe(12);
    });
  });

  // =========================================================================
  // ŚCIEŻKA 3: Pościgi i tor przeszkód (Chase Engine & Obstacle Clearance)
  // =========================================================================
  describe('Path 3: Chase initiation -> Speed check / round -> Obstacle clearance / shortcut -> Location change', () => {
    let pipeline: MockGMPipeline;

    beforeEach(() => {
      pipeline = new MockGMPipeline({
        initialCharacter: createMockInvestigator(),
        initialLocation: 'Doki Arkham',
      });
    });

    it('3.1: Inicjuje pościg [POŚCIG: START] i wylicza punkty akcji według reguł MOV', () => {
      const chaseStartNarrative = `
[POŚCIG: START]
BIEG 3 (POŚCIG): Za twoimi plecami rozlega się nieludzki ryk!
Potworny ogar z Tindalos wyłania się z kąta budynku i rzuca w pogoń!
      `.trim();
      pipeline.feedGMResponse(chaseStartNarrative);

      // Inicjalizacja stanu: Edward (MOV 8), Ścigający (MOV 9), dystans = 2
      const chaseState = pipeline.initiateChase({
        fleeingParticipant: { mov: 8, segmentIndex: 1 },
        pursuers: [{ mov: 9, segmentIndex: 0 }],
        initialDistance: 2,
        trackLength: 10,
        escapeDistanceThreshold: 4,
        hazardPositions: { 3: DEFAULT_CHASE_HAZARDS.fence },
      });

      expect(chaseState.status).toBe('ongoing');
      expect(chaseState.round).toBe(1);
      const fleeing = chaseState.participants.find((p) => p.isPlayer);
      const pursuer = chaseState.participants.find((p) => !p.isPlayer);

      expect(fleeing?.actionsTotal).toBe(1); // 8 - 8 + 1 = 1
      expect(pursuer?.actionsTotal).toBe(2); // 9 - 8 + 1 = 2
    });

    it('3.2: Wykonuje manewr sprintu gracza oraz turę ścigających w rundzie 1', () => {
      pipeline.initiateChase({
        fleeingParticipant: { mov: 8, segmentIndex: 1 },
        pursuers: [{ mov: 8, segmentIndex: 0 }],
        initialDistance: 2,
      });

      const { nextState, playerLog } = pipeline.executeChaseRound({
        maneuver: { type: 'sprint', actorId: pipeline.getActiveCharacter().id },
      });

      expect(playerLog).not.toBeNull();
      expect(playerLog!.success).toBe(true);
      expect(playerLog!.actionName).toBe('Sprint');
      const player = nextState.participants.find((p) => p.isPlayer);
      expect(player?.segmentIndex).toBe(3);
    });

    it('3.3: Sforsowanie przeszkody (clear_hazard) i ryzykowny skrót (shortcut) ze zmianą lokacji', () => {
      pipeline.initiateChase({
        fleeingParticipant: { mov: 8, segmentIndex: 2 },
        pursuers: [{ mov: 8, segmentIndex: 0 }],
        hazardPositions: { 3: DEFAULT_CHASE_HAZARDS.fence },
        escapeDistanceThreshold: 3,
      });

      // Manewr sforsowania płotu z udanym testem
      const round1 = pipeline.executeChaseRound({
        maneuver: {
          type: 'clear_hazard',
          actorId: pipeline.getActiveCharacter().id,
          targetSkill: 'Zręczność',
          rollOutcome: 'regular',
        },
      });

      expect(round1.playerLog).not.toBeNull();
      expect(round1.playerLog!.success).toBe(true);

      // Nowa lokacja po ucieczce w boczny zaułek
      const sceneChangeResponse = `
[ZMIANA_SCENY: Zaułek Grzeszników | typ=pościg]
[LOKACJA: Zaułek Grzeszników: Labirynt wąskich przejść i starych kamienic]
      `.trim();
      pipeline.feedGMResponse(sceneChangeResponse);

      expect(pipeline.getCurrentLocation()).toBe('Zaułek Grzeszników');
    });

    it('3.4: Inicjatywa DEX: ścigający z wyższym DEX (DEX 75 > badacz DEX 60) wykonuje ruch jako pierwszy bez błędów kolejki', () => {
      pipeline.initiateChase({
        fleeingParticipant: { mov: 8, dex: 60, segmentIndex: 3 },
        pursuers: [{ id: 'fast_cultist', mov: 8, dex: 75, segmentIndex: 0 }],
        initialDistance: 3,
        trackLength: 10,
      });

      // Ścigający ma wyższy DEX, więc executeChaseRound rozlicza turę ścigającego, a potem manewr gracza
      const { nextState, playerLog, pursuerLogs } = pipeline.executeChaseRound({
        maneuver: { type: 'sprint', actorId: pipeline.getActiveCharacter().id },
      });

      expect(playerLog).not.toBeNull();
      expect(playerLog!.success).toBe(true);
      expect(pursuerLogs.length).toBeGreaterThanOrEqual(1);
      // Obie strony wyczerpały akcje w rundzie 1, silnik automatycznie przeszedł do rundy 2
      expect(nextState.round).toBe(2);
    });

    it('3.5: Porażka w teście przeszkody (Hazard) z karą utraty punktów akcji oraz obrażeniami', () => {
      pipeline.initiateChase({
        fleeingParticipant: { mov: 10, segmentIndex: 2 },
        pursuers: [{ mov: 8, segmentIndex: 0 }],
        hazardPositions: {
          3: {
            id: 'wire_fence',
            name: 'Płot z drutu kolczastego',
            description: 'Ostry drut kolczasty',
            requiredSkill: 'Zręczność',
            difficulty: 'zwykly',
            hazardType: 'hazard',
            penaltyActionsOnFail: 1,
            damageOnFail: '1d3',
          },
        },
      });

      const { playerLog } = pipeline.executeChaseRound({
        maneuver: {
          type: 'clear_hazard',
          actorId: pipeline.getActiveCharacter().id,
          rollOutcome: 'fail',
        },
      });

      expect(playerLog).not.toBeNull();
      expect(playerLog!.success).toBe(false);
      expect(playerLog!.actionCost).toBeGreaterThanOrEqual(2); // 1 akcja za próbę + 1 kary
      expect(playerLog!.details).toContain('Porażka');
    });

    it('3.6: Pomyślna ucieczka (Escape): udany manewr ukrycia się (hide) w bocznej uliczce kończy pościg', () => {
      pipeline.initiateChase({
        fleeingParticipant: { mov: 8, segmentIndex: 3 },
        pursuers: [{ mov: 8, segmentIndex: 1 }],
      });

      // Gracz wykonuje manewr ukrycia się z sukcesem w teście Ukrywania
      const { nextState, playerLog } = pipeline.executeChaseRound({
        maneuver: {
          type: 'hide',
          actorId: pipeline.getActiveCharacter().id,
          targetSkill: 'Ukrywanie',
          rollOutcome: 'regular',
        },
      });

      expect(playerLog).not.toBeNull();
      expect(playerLog!.success).toBe(true);
      expect(nextState.status).toBe('escaped');
    });
  });

  // =========================================================================
  // ŚCIEŻKA 4: Groza, utrata Poczytalności i Szaleństwo (Sanity & Bouts of Madness)
  // =========================================================================
  describe('Path 4: Horror encounter -> Sanity check -> Loss of points -> Bout of madness / temporary insanity', () => {
    let pipeline: MockGMPipeline;

    beforeEach(() => {
      pipeline = new MockGMPipeline({
        initialCharacter: createMockInvestigator({ san: 60, dayStartSan: 60, dailySanLoss: 0 }),
      });
    });

    it('4.1: Parsuje żądanie testu Poczytalności w obliczu koszmaru', () => {
      const horrorPrompt = `
[MYŚLI_MG: Gracz widzi bluźnierczą abominację. Wymagany test SAN.]
W blasku latarki dostrzegasz postać pokrytą oślizgłymi łuskami, pożerającą ludzkie szczątki.
[TEST: Poczytalność | zwykly | | Widok potwornego rytuału i hybrydy z Innsmouth]
      `.trim();

      const turn = pipeline.feedGMResponse(horrorPrompt);
      expect(turn.skillTests.length).toBe(1);
      expect(turn.skillTests[0].skillName).toBe('Poczytalność');
    });

    it('4.2: Rozstrzyga umiarkowaną stratę SAN (< 5) bez wymogu testu Inteligencji', () => {
      const { events, charAfter } = pipeline.resolveSanityHorror({
        sanLoss: 3,
        reason: 'Widok zbezczeszczonych zwłok',
      });

      expect(charAfter.san).toBe(57);
      expect(charAfter.dailySanLoss).toBe(3);
      expect(events.some((e) => e.type === 'int_check_required')).toBe(false);
      expect(charAfter.insanityState).toBeFalsy();
    });

    it('4.3: Rozstrzyga ciężką stratę SAN (>= 5), udany test INT i Chwilową Niepoczytalność (Bout of Madness)', () => {
      // Utrata 6 SAN w jednym rzucie wymusza test Inteligencji (RAW CoC 7e)
      const { events, charAfter } = pipeline.resolveSanityHorror({
        sanLoss: 6,
        reason: 'Bezpośrednie spojrzenie w pustkę kosmosu',
        intPassed: true, // Zrozumienie grozy -> atak szaleństwa
        forceBoutIndex: 3, // Paranoja
      });

      expect(charAfter.san).toBe(54);
      expect(charAfter.dailySanLoss).toBe(6);
      expect(events.some((e) => e.type === 'int_check_required')).toBe(true);
      expect(charAfter.insanityState).toBe('temporary');
      expect(charAfter.activeBoutOfMadness).toBeDefined();
      expect(charAfter.activeBoutOfMadness?.title).toBe('Ostry zespół prześladowczy');
    });

    it('4.4: Osiągnięcie progu 1/5 dziennej utraty wyzwala Czasową Niepoczytalność (Indefinite Insanity)', () => {
      // Dzienny próg 1/5 ze startowych 60 SAN = 12 punktów
      // Pierwsza strata: 6
      pipeline.resolveSanityHorror({ sanLoss: 6, reason: 'Szok pierwszy' });
      // Druga strata: 7 (suma = 13 >= 12)
      pipeline.resolveSanityHorror({ sanLoss: 7, reason: 'Szok drugi' });

      const char = pipeline.getActiveCharacter();
      expect(char.san).toBe(47); // 60 - 13 = 47
      expect(char.dailySanLoss).toBe(13);
      expect(char.insanityState).toBe('indefinite');
      expect(char.underlyingInsanity).toBe(true);
    });

    it('4.5: Błogosławiona niepamięć (Fail na teście INT przy stracie >= 5 SAN) chroni przed Atakiem Szaleństwa', () => {
      // Utrata 6 SAN wymusza test Inteligencji (RAW CoC 7e).
      // Porażka w teście INT oznacza, że umysł wypiera traumatyczny widok i chroni przed szaleństwem.
      const { events, charAfter } = pipeline.resolveSanityHorror({
        sanLoss: 6,
        reason: 'Obejrzenie bluźnierczego fresku',
        intPassed: false, // Porażka testu INT
      });

      expect(charAfter.san).toBe(54);
      expect(events.some((e) => e.type === 'int_check_required')).toBe(true);
      expect(charAfter.insanityState).toBeFalsy();
      expect(charAfter.activeBoutOfMadness).toBeUndefined();
    });

    it('4.6: Katastrofalna utrata do 0 SAN aktywuje bufor "Na krawędzi otchłani", a kolejna strata wyzwala Nieodwracalny Obłęd', () => {
      // Pierwszy szok: spadek z 60 SAN do 0 SAN
      const round1 = pipeline.resolveSanityHorror({
        sanLoss: 60,
        reason: 'Bezpośredni kontakt z Przedwiecznym',
      });

      // Tarcza ocalenia: Fail-Forward "Na krawędzi otchłani" (Issue #372)
      expect(round1.charAfter.edgeOfTheAbyss).toBe(true);
      expect(round1.charAfter.san).toBeGreaterThan(0); // otrzymuje 1k10 zastrzyku adrenaliny
      expect(round1.charAfter.insanityState).toBe('indefinite');
      expect(round1.events.some((e) => e.type === 'edge_of_the_abyss')).toBe(true);

      // Drugi szok po zużyciu bufora: kolejna utrata SAN prowadzi do Nieodwracalnego Obłędu (Permanent Insanity)
      const round2 = pipeline.resolveSanityHorror({
        sanLoss: 10,
        reason: 'Ostateczne załamanie jaźni',
      });

      expect(round2.charAfter.san).toBe(0);
      expect(round2.charAfter.insanityState).toBe('permanent');
      expect(round2.events.some((e) => e.type === 'permanent_insanity')).toBe(true);
    });
  });

  // =========================================================================
  // ŚCIEŻKA 5: Impas i Test Pomysłu (Dead End & Idea Roll CoC RAW)
  // =========================================================================
  describe('Path 5: Impasse (Dead End) -> Lack of clues trigger -> executeIdeaRoll verification -> Success and Fail-forward', () => {
    let pipeline: MockGMPipeline;

    beforeEach(() => {
      pipeline = new MockGMPipeline({
        initialCharacter: createMockInvestigator({ int: 75 }),
      });
    });

    it('5.1: Sukces w Teście Pomysłu zwraca czysty trop dedukcyjny bez zagrożenia', () => {
      const { result, turnResult } = pipeline.triggerIdeaRoll({
        targetSubject: { id: 'secret_clock', title: 'Zegar ścienny w gabinecie' },
        fixedRoll: 30, // Sukces trudny (30 <= 75/2 = 37)
      });

      expect(result.isSuccess).toBe(true);
      expect(result.outcome).toBe('hard');
      expect(result.canPushRoll).toBe(false);
      expect(result.isDeadEndOnly).toBe(true);

      expect(turnResult.journalChanges.changed).toBe(true);
      const clues = pipeline.getActiveCharacter().investigatorDossier?.clues || [];
      expect(clues.some((c) => c.title.includes('Zegar ścienny'))).toBe(true);
      expect(pipeline.isCombatActive()).toBe(false);
    });

    it('5.2: Porażka w Teście Pomysłu realizuje regułę RAW Fail-Forward: trop zostaje podany, ale z natychmiastową komplikacją/walką', () => {
      const { result, turnResult } = pipeline.triggerIdeaRoll({
        targetSubject: { id: 'secret_crypt', title: 'Ukryta krypta pod cmentarzem' },
        fixedRoll: 85, // Porażka (85 > 75)
      });

      expect(result.isSuccess).toBe(false);
      expect(result.outcome).toBe('fail');

      // Trop został dodany pomimo porażki (Fail-Forward CoC 7e RAW: śledztwo nie staje w miejscu)
      const clues = pipeline.getActiveCharacter().investigatorDossier?.clues || [];
      expect(clues.some((c) => c.title.includes('Ukryta krypta'))).toBe(true);

      // Lecz jednocześnie wszczęto walkę z zaskoczenia!
      expect(pipeline.isCombatActive()).toBe(true);
      expect(turnResult.meleeAttacks.length).toBe(1);
      expect(turnResult.meleeAttacks[0].attackerNpcId).toBe('guard_thug');
    });

    it('5.3: Weryfikuje twarde reguły RAW (brak forsowania, brak Szczęścia) oraz generuje dyrektywę promptu buildIdeaRollPrompt', () => {
      const { result, promptDirective } = pipeline.triggerIdeaRoll({
        targetSubject: { id: 'clue_symbol', title: 'Symbol Żółtego Znaku', description: 'Dziwny glif wyryty na drzwiach' },
        fixedRoll: 15,
        contextClues: [{ title: 'Dziennik aktora', description: 'Wzmianki o sztuce teatralnej' }],
      });

      expect(result.canPushRoll).toBe(false);
      expect(result.canSpendLuck).toBe(false);
      expect(result.isDeadEndOnly).toBe(true);
      expect(promptDirective).toContain('ZASADY WERDYKTU (CoC 7e RAW s. 199-201):');
      expect(promptDirective).toContain('impasu śledczego (Dead End)');
      expect(promptDirective).toContain('Symbol Żółtego Znaku');
    });
  });

  // =========================================================================
  // ŚCIEŻKA 6: Pełny zapis i odczyt stanu (Save & Load Continuity)
  // =========================================================================
  describe('Path 6: Full game save -> Physical save to save.json in os.tmpdir() -> Simulated restart -> Load and verify state continuity', () => {
    let pipeline: MockGMPipeline;
    let tempSavePath: string;

    beforeEach(() => {
      pipeline = new MockGMPipeline({
        initialCharacter: createMockInvestigator({ hp: 9, san: 52 }),
        initialLocation: 'Ratusz w Arkham',
      });
      tempSavePath = path.join(os.tmpdir(), `journey-test-save-${Date.now()}.json`);
    });

    afterEach(() => {
      if (fs.existsSync(tempSavePath)) {
        try {
          fs.unlinkSync(tempSavePath);
        } catch {
          // ignore cleanup errors
        }
      }
    });

    it('6.1: Tworzy poprawny save v2.1.0 zgodny ze strukturą FullGameSaveManager', () => {
      pipeline.feedGMResponse(
        `Wchodzisz do archiwum miejskiego.\n[DZIENNIK:trop:Akt własności]Stary akt własności posiadłości Corbitta.[/DZIENNIK]`
      );

      const save = pipeline.createFullSave('Sesja Doświadczalna #534', 'tester_01');
      expect(save.version).toBe('2.1.0');
      expect(save.name).toBe('Sesja Doświadczalna #534');
      expect(FullGameSaveManager.validateSave(save)).toBe(true);
    });

    it('6.2: Fizycznie zapisuje do pliku na dysku i odtwarza pełną ciągłość stanu po restarcie', () => {
      // 1. Wykonaj akcje i zbierz stan
      pipeline.feedGMResponse(
        `[LOKACJA: Posiadłość Corbitta: Mroczny, drewniany dom z zabitymi oknami]\n[DZIENNIK:odkrycie:Dziennik Corbitta]Zapiski z 1866 roku.[/DZIENNIK]`
      );
      pipeline.feedGMResponse(`[HP: -2: Skaleczenie o zardzewiały gwóźdź]`);

      const charBefore = pipeline.getActiveCharacter();
      expect(charBefore.hp).toBe(7); // 9 - 2 = 7
      expect(pipeline.getCurrentLocation()).toBe('Posiadłość Corbitta');
      const messagesBeforeCount = pipeline.getMessages().length;

      // 2. Fizyczny zapis na dysk
      pipeline.saveToDisk(tempSavePath, 'Zapis Trwały #534');
      expect(fs.existsSync(tempSavePath)).toBe(true);
      expect(fs.statSync(tempSavePath).size).toBeGreaterThan(100);

      // 3. Symulowany restart aplikacji: tworzymy nowy czysty rurociąg
      const restartedPipeline = new MockGMPipeline({
        initialCharacter: createMockInvestigator({ hp: 12, san: 60 }),
        initialLocation: 'Punkt Startowy',
      });

      // 4. Załaduj stan z dysku
      restartedPipeline.loadFromDisk(tempSavePath);

      // 5. Weryfikacja 100% ciągłości stanu
      const charAfter = restartedPipeline.getActiveCharacter();
      expect(charAfter.id).toBe(charBefore.id);
      expect(charAfter.hp).toBe(7);
      expect(charAfter.san).toBe(52);
      expect(restartedPipeline.getCurrentLocation()).toBe('Posiadłość Corbitta');
      expect(restartedPipeline.getMessages().length).toBe(messagesBeforeCount);

      const cluesAfter = charAfter.investigatorDossier?.clues || [];
      expect(cluesAfter.some((c) => c.title.includes('Dziennik Corbitta'))).toBe(true);
    });

    it('6.3: Zachowuje ciągłość wieloosobowej drużyny (Party/Hot Seat) oraz aktywnego stanu walki w cyklu Save/Load', () => {
      const eleanor = createMockInvestigator({
        id: 'char-eleanor-trent',
        name: 'Eleanor Trent',
        hp: 11,
        san: 55,
      });
      pipeline.addCharacter(eleanor);

      // Inicjuj walkę i zapisz stan
      pipeline.feedGMResponse(`[WALKA: START]\nZ cienia wyłaniają się kultyści!`);
      expect(pipeline.isCombatActive()).toBe(true);

      const partySavePath = path.join(os.tmpdir(), `journey-party-save-${Date.now()}.json`);

      try {
        const savedData = pipeline.saveToDisk(partySavePath, 'Zapis Drużyny');
        expect(savedData.locale).toBe('pl');

        // Restart i odczyt
        const restored = new MockGMPipeline({ initialCharacter: createMockInvestigator() });
        restored.loadFromDisk(partySavePath);

        expect(restored.getCharacters().length).toBe(2);
        expect(restored.getCharacters().some((c) => c.name === 'Eleanor Trent')).toBe(true);
        expect(restored.isCombatActive()).toBe(true);
      } finally {
        if (fs.existsSync(partySavePath)) {
          try {
            fs.unlinkSync(partySavePath);
          } catch {
            // ignore
          }
        }
      }
    });
  });

  // =========================================================================
  // CIĄGŁA MATRYCA 100-TUROWA (Continuous 100-Turn Stress Matrix)
  // =========================================================================
  describe('Continuous 100-Turn Stress Matrix', () => {
    it('wykonuje deterministyczną pętlę 100 tur łączącą wszystkie 6 ścieżek w czasie poniżej 5 sekund', () => {
      const startTime = Date.now();
      const pipeline = new MockGMPipeline({
        initialCharacter: createMockInvestigator({ hp: 12, maxHp: 12, san: 60, dayStartSan: 60 }),
        initialLocation: 'Uniwersytet Miskatonic',
      });

      const tempLoopSavePath = path.join(os.tmpdir(), `matrix-100-stress-${Date.now()}.json`);

      try {
        for (let turn = 1; turn <= 100; turn++) {
          if (turn <= 15) {
            // Faza 1: Eksploracja i testy umiejętności
            if (turn % 3 === 0) {
              pipeline.feedGMResponse(
                `Przeszukujesz regały w sekcji specjalnej Biblioteki Orne'a.
[TEST: Spostrzegawczość | zwykly | | Szukasz wzmianek o kulcie]
[DZIENNIK:trop:Wycinek prasowy #${turn}]Notatka o dziwnych zaginięciach w Arkham.[/DZIENNIK]`,
                `Deklaracja tury ${turn}: Przeglądam stare tomy i gazety.`
              );
            } else {
              pipeline.feedGMResponse(
                `Korytarz uniwersytecki pogrążony jest w ciszy.
[LOKACJA: Sekcja Rękopisów #${turn}: Sala pełna kurzu i pergaminów]`,
                `Deklaracja tury ${turn}: Przechodzę do kolejnego skrzydła.`
              );
            }
          } else if (turn <= 30) {
            // Faza 2: Konfrontacja i walka wręcz
            if (turn === 16) {
              pipeline.feedGMResponse(
                `[WALKA: START]
Z ciemności atakuje intruz w masce!
Walka rozpoczyna się!
[ATAK_WRĘCZ: napastnik=thug_${turn} | cel=@Edward Pierce | atak=brawl | zamiar=Cios pałką]`,
                `Deklaracja tury ${turn}: Dobywam broni i szykuję się do obrony!`
              );
            } else if (turn < 30) {
              // Rozstrzygnięcie rundy walki (naprzemiennie unik i kontratak)
              const defenseChoice = turn % 2 === 0 ? 'dodge' : 'fight_back';
              const combatRes = pipeline.executeCombatRound({
                attackerRoll: 45,
                attackerSkill: 50,
                defenderRoll: 25,
                defenderSkill: 55,
                defenseChoice,
                attackerDamageFormula: '1d4',
              });
              if (combatRes.resolution.damageDealtTo !== 'defender') {
                pipeline.feedGMResponse(
                  `Wymiana ciosów: ${combatRes.resolution.logKey}. Gracz unika obrażeń.`,
                  `Tura ${turn}: Wykonuję ${defenseChoice}.`
                );
              }
            } else {
              pipeline.feedGMResponse(
                `[WALKA: KONIEC] Intruz pada nieprzytomny na kamienną posadzkę.`
              );
            }
          } else if (turn <= 45) {
            // Faza 3: Groza i wstrząsy psychiczne
            if (turn % 5 === 0) {
              pipeline.resolveSanityHorror({
                sanLoss: 2,
                reason: `Makabryczny rytuał tura ${turn}`,
              });
            } else if (turn === 40) {
              pipeline.resolveSanityHorror({
                sanLoss: 5,
                reason: 'Widok nieeuklidesowego portalu',
                intPassed: true,
                forceBoutIndex: 1,
              });
            } else {
              pipeline.feedGMResponse(
                `Badanie mistycznych symboli wywołuje zawroty głowy.
[DZIENNIK:notatka:Refleksja #${turn}]Umysł rejestruje powtarzające się geometryczne anomalie.[/DZIENNIK]`
              );
            }
          } else if (turn <= 60) {
            // Faza 4: Pościg uliczny
            if (turn === 46) {
              pipeline.feedGMResponse(
                `[POŚCIG: START]
Syreny milkną, z zaułka wypadają ogary kultu! Pora uciekać!`
              );
              pipeline.initiateChase({
                fleeingParticipant: { mov: 8, segmentIndex: 1 },
                pursuers: [{ mov: 8, segmentIndex: 0 }],
                initialDistance: 2,
                trackLength: 20,
              });
            } else if (turn < 60) {
              if (pipeline.getChaseState()?.status === 'ongoing') {
                pipeline.executeChaseRound({
                  maneuver: {
                    type: 'sprint',
                    actorId: pipeline.getActiveCharacter().id,
                  },
                });
                pipeline.feedGMResponse(
                  `Biegniesz ile sił w nogach przez zaułki.`,
                  `Tura ${turn}: Kontynuuję sprint!`
                );
              } else {
                pipeline.feedGMResponse(
                  `[LOKACJA: Zaułek #${turn}: Chwila wytchnienia po ucieczce]`
                );
              }
            } else {
              pipeline.feedGMResponse(
                `[ZMIANA_SCENY: Bezpieczna Kryjówka | typ=pościg]
[LOKACJA: Bezpieczna Kryjówka: Mały pokój na poddaszu]`
              );
            }
          } else if (turn <= 75) {
            // Faza 5: Impas i Test Pomysłu
            if (turn === 65) {
              pipeline.triggerIdeaRoll({
                targetSubject: { id: `clue_${turn}`, title: 'Szyfr kultu Dagon' },
                fixedRoll: 25, // sukces
              });
            } else if (turn === 70) {
              pipeline.triggerIdeaRoll({
                targetSubject: { id: `complication_${turn}`, title: 'Plan ceremonii' },
                fixedRoll: 90, // porażka fail-forward
              });
            } else {
              pipeline.feedGMResponse(
                `Dalsze analizowanie poszlak prowadzi do nowych podejrzeń.
[DZIENNIK:trop:Fragment listu #${turn}]Podpisano inicjałami J.C.[/DZIENNIK]`
              );
            }
          } else if (turn <= 90) {
            // Faza 6: Zapis i odczyt ciągłości stanu w trakcie podróży
            if (turn === 80) {
              pipeline.saveToDisk(tempLoopSavePath, `Checkpoint-${turn}`);
              pipeline.loadFromDisk(tempLoopSavePath);
              pipeline.feedGMResponse(
                `Sesja wznowiona pomyślnie z checkpointu tury 80.`
              );
            } else {
              pipeline.feedGMResponse(
                `Kolejny etap śledztwa w toku.
[DZIENNIK:odkrycie:Dowód #${turn}]Odnaleziono pieczęć rodu Corbittów.[/DZIENNIK]`
              );
            }
          } else {
            // Faza 7: Finał i konsolidacja przygody
            if (turn === 100) {
              pipeline.feedGMResponse(
                `Ostateczna tajemnica zostaje rozwikłana. Śledztwo dobiega końca.
[RAPORT_AKTU: Akt 1: Oczyszczenie Arkham | Status: Zakończony]
FAKTY:
- Kult zdemaskowany w podziemiach sanitarium.
- Wszystkie artefakty zabezpieczone.
LUKI:
- Przywódca zbiegł w stronę morza.
HIPOTEZA:
Sprawa łączy się z wydarzeniami w Innsmouth.
[/RAPORT_AKTU]
[SANITY: +5: Triumf rozumu nad grozą]`
              );
            } else {
              pipeline.feedGMResponse(
                `Podsumowanie ostatnich śladów przed konfrontacją.
[DZIENNIK:notatka:Wniosek #${turn}]Wszystkie tropy prowadzą do jednego miejsca.[/DZIENNIK]`
              );
            }
          }
        }

        const duration = Date.now() - startTime;
        expect(pipeline.getTurnCount()).toBe(100);
        expect(pipeline.getMessages().length).toBeGreaterThanOrEqual(100);

        // Kryterium wydajności: < 5 sekund
        expect(duration).toBeLessThan(5000);
      } finally {
        if (fs.existsSync(tempLoopSavePath)) {
          try {
            fs.unlinkSync(tempLoopSavePath);
          } catch {
            // ignore
          }
        }
      }
    });
  });
});
