import {
  resolveMeleeEngagement,
  checkManeuverFeasibility,
  resolveOutnumberedBonus,
  calculateMeleeDamage,
  getMaxDiceValue,
  normalizeDiceFormula,
  OUTCOME_RANKS,
} from '@/lib/combat/combat-resolver';
import {
  resolveDiveForCover,
  calculateFirearmNetDice,
  resolveFirearmShot,
  resolveFirearmBurst,
} from '@/lib/combat/firearms-engine';
import {
  extractOpposedMeleeEvents,
  stripMeleeAttackTags,
} from '@/lib/parsers/mechanics-parser';
import { sanitizeMechanicalTags } from '@/lib/parsers/text-cleaner';
import { cleanupContent } from '@/components/chat/narrative/cleanup';

describe('CoC 7e RAW Combat Engine - Purystyczna Mechanika (Faza 4)', () => {
  describe('1. Hierarchia stopni sukcesu i asymetria remisu (s. 102-103)', () => {
    it('stopnie sukcesu zachowują właściwą hierarchię: Critical > Extreme > Hard > Regular > Fail > Fumble', () => {
      expect(OUTCOME_RANKS.critical).toBeGreaterThan(OUTCOME_RANKS.extreme);
      expect(OUTCOME_RANKS.extreme).toBeGreaterThan(OUTCOME_RANKS.hard);
      expect(OUTCOME_RANKS.hard).toBeGreaterThan(OUTCOME_RANKS.regular);
      expect(OUTCOME_RANKS.regular).toBeGreaterThan(OUTCOME_RANKS.fail);
      expect(OUTCOME_RANKS.fail).toBeGreaterThan(OUTCOME_RANKS.fumble);
    });

    it('Unik (Dodge): remis stopni sukcesu (np. obaj Hard) wygrywa obrońca (atak chybia, 0 dmg)', () => {
      const result = resolveMeleeEngagement({
        attackerName: 'Kultysta',
        defenderName: 'Badacz',
        attackerRoll: 25,
        attackerSkill: 50, // hard (<= 25)
        defenderRoll: 20,
        defenderSkill: 40, // hard (<= 20)
        defenseChoice: 'dodge',
        attackerWeaponFormula: '1d6',
      });

      expect(result.winner).toBe('defender');
      expect(result.isTie).toBe(true);
      expect(result.damageDealtTo).toBe('none');
      expect(result.logKey).toBe('dodgeSuccessTie');
    });

    it('Kontratak (Fight Back): remis stopni sukcesu (np. obaj Regular) wygrywa atakujący (zadaje dmg)', () => {
      const result = resolveMeleeEngagement({
        attackerName: 'Kultysta',
        defenderName: 'Badacz',
        attackerRoll: 40,
        attackerSkill: 50, // regular
        defenderRoll: 35,
        defenderSkill: 50, // regular
        defenseChoice: 'fight_back',
        attackerWeaponFormula: '1d6',
        rollFn: () => 5,
      });

      expect(result.winner).toBe('attacker');
      expect(result.isTie).toBe(true);
      expect(result.damageDealtTo).toBe('defender');
      expect(result.damage?.effectiveDamage).toBe(5);
      expect(result.logKey).toBe('fightBackAttackerWinsTie');
    });

    it('Kontratak (Fight Back): obrońca zadaje obrażenia TYLKO przy ściśle wyższym stopniu sukcesu', () => {
      const result = resolveMeleeEngagement({
        attackerName: 'Kultysta',
        defenderName: 'Badacz',
        attackerRoll: 40,
        attackerSkill: 50, // regular
        defenderRoll: 20,
        defenderSkill: 50, // hard
        defenseChoice: 'fight_back',
        defenderWeaponFormula: '1d4',
        rollFn: () => 3,
      });

      expect(result.winner).toBe('defender');
      expect(result.isTie).toBe(false);
      expect(result.damageDealtTo).toBe('attacker');
      expect(result.damage?.effectiveDamage).toBe(3);
      expect(result.logKey).toBe('fightBackDefenderStrikes');
    });

    it('Kontratak (Fight Back): sukces ekstremalny obrońcy NIGDY nie daje Przebicia (Impale) (s. 103)', () => {
      const result = resolveMeleeEngagement({
        attackerName: 'Kultysta',
        defenderName: 'Badacz',
        attackerRoll: 45,
        attackerSkill: 50, // regular
        defenderRoll: 5,
        defenderSkill: 50, // extreme (<= 10)
        defenseChoice: 'fight_back',
        defenderWeaponFormula: '1d4+2',
        defenderDamageType: 'impaling',
        rollFn: () => 4,
      });

      expect(result.winner).toBe('defender');
      expect(result.damageDealtTo).toBe('attacker');
      expect(result.damage?.isImpale).toBe(false);
    });

    it('Gdy obaj uczestnicy poniosą porażkę, nikt nie zadaje obrażeń', () => {
      const dodgeMiss = resolveMeleeEngagement({
        attackerName: 'Kultysta',
        defenderName: 'Badacz',
        attackerRoll: 85,
        attackerSkill: 50,
        defenderRoll: 90,
        defenderSkill: 50,
        defenseChoice: 'dodge',
      });
      expect(dodgeMiss.winner).toBe('none');
      expect(dodgeMiss.damageDealtTo).toBe('none');

      const fightMiss = resolveMeleeEngagement({
        attackerName: 'Kultysta',
        defenderName: 'Badacz',
        attackerRoll: 85,
        attackerSkill: 50,
        defenderRoll: 90,
        defenderSkill: 50,
        defenseChoice: 'fight_back',
      });
      expect(fightMiss.winner).toBe('none');
      expect(fightMiss.damageDealtTo).toBe('none');
    });
  });

  describe('2. Weryfikacja Budowy (Build) w manewrach bojowych (s. 105)', () => {
    it('gdy Budowa celu <= Budowa atakującego: brak kości karnych (0)', () => {
      const res = checkManeuverFeasibility(2, 1);
      expect(res.allowed).toBe(true);
      expect(res.penaltyDice).toBe(0);

      const resEqual = checkManeuverFeasibility(1, 1);
      expect(resEqual.allowed).toBe(true);
      expect(resEqual.penaltyDice).toBe(0);
    });

    it('gdy Budowa celu jest o 1 większa niż atakującego: 1 kość karna (-1K)', () => {
      const res = checkManeuverFeasibility(0, 1);
      expect(res.allowed).toBe(true);
      expect(res.penaltyDice).toBe(1);
    });

    it('gdy Budowa celu jest o 2 większa niż atakującego: 2 kości karne (-2K)', () => {
      const res = checkManeuverFeasibility(0, 2);
      expect(res.allowed).toBe(true);
      expect(res.penaltyDice).toBe(2);
    });

    it('gdy Budowa celu jest o 3 lub więcej większa: manewr jest fizycznie niemożliwy (blokada)', () => {
      const resDiff3 = checkManeuverFeasibility(0, 3);
      expect(resDiff3.allowed).toBe(false);
      expect(resDiff3.penaltyDice).toBe(0);
      expect(resDiff3.reason).toBe('buildDifferenceTooGreat');

      const resDiff4 = checkManeuverFeasibility(-1, 3);
      expect(resDiff4.allowed).toBe(false);
      expect(resDiff4.reason).toBe('buildDifferenceTooGreat');
    });

    it('gdy manewr jest zablokowany przez Budowę (diff >= 3), obrońca NIE MOŻE wykonać manewru nawet gdy napastnik spudłuje', () => {
      const result = resolveMeleeEngagement({
        attackerName: 'Potwór',
        defenderName: 'Badacz',
        attackerRoll: 85,
        attackerSkill: 50, // Fail
        defenderRoll: 20,
        defenderSkill: 50, // Hard
        defenseChoice: 'maneuver',
        attackerBuild: 4,
        defenderBuild: 0,
      });

      expect(result.winner).toBe('none');
      expect(result.maneuverApplied).toBeUndefined();
      expect(result.logKey).toBe('maneuverBlockedByBuild');
    });

    it('obsługuje ujemny Damage Bonus (-1, -2, -1d4) oraz ze znakiem plus (+1d4) bez błędów', () => {
      expect(normalizeDiceFormula('+1d4')).toBe('+1d4');
      expect(normalizeDiceFormula('-1d4')).toBe('-1d4');
      expect(normalizeDiceFormula('-1')).toBe('-1');

      expect(getMaxDiceValue('-1')).toBe(-1);
      expect(getMaxDiceValue('+1d4')).toBe(4);

      // Obrażenia z ujemnym modyfikatorem cechy
      const dmgNeg = calculateMeleeDamage({
        weaponDamageFormula: '1d3',
        damageBonusFormula: '-1',
        outcome: 'regular',
        rollFn: (f) => (f === '1d3' ? 3 : -1),
      });
      expect(dmgNeg.rawDamage).toBe(2); // 3 - 1 = 2

      // Zawsze min. 1 obrażeń przy trafieniu
      const dmgFloor = calculateMeleeDamage({
        weaponDamageFormula: '1d3',
        damageBonusFormula: '-2',
        outcome: 'regular',
        rollFn: (f) => (f === '1d3' ? 1 : -2),
      });
      expect(dmgFloor.rawDamage).toBe(1);
    });
  });

  describe('3. Przewaga liczebna w rundzie (Outnumbered, s. 108)', () => {
    it('pierwsza obrona w rundzie (defenseCount = 0): brak premii dla napastnika', () => {
      const out = resolveOutnumberedBonus(0);
      expect(out.bonusDiceToAttacker).toBe(0);
      expect(out.isOutnumbered).toBe(false);
    });

    it('druga i kolejne obrony w tej samej rundzie: +1 kość premiowa (+1K) dla napastnika', () => {
      const out1 = resolveOutnumberedBonus(1);
      expect(out1.bonusDiceToAttacker).toBe(1);
      expect(out1.isOutnumbered).toBe(true);

      const out3 = resolveOutnumberedBonus(3);
      expect(out3.bonusDiceToAttacker).toBe(1);
      expect(out3.isOutnumbered).toBe(true);
    });
  });

  describe('4. Dive for Cover (Padnij za osłonę przed bronią palną, s. 113)', () => {
    it('udany test Uniku na dystansie point-blank znosi kość premiową strzelca', () => {
      const dive = resolveDiveForCover(25, 60, 'point_blank'); // Hard success
      expect(dive.success).toBe(true);
      expect(dive.cancelledBonusDie).toBe(true);
      expect(dive.imposesPenaltyDie).toBe(false);
      expect(dive.targetIsProne).toBe(true);
      expect(dive.targetLosesNextAction).toBe(true);

      const net = calculateFirearmNetDice({
        distanceCategory: 'point_blank',
        targetDivingForCoverSuccess: dive.cancelledBonusDie,
      });
      expect(net.bonusDice).toBe(0);
      expect(net.penaltyDice).toBe(0);
      expect(net.netDice).toBe(0);
    });

    it('udany test Uniku na dalszym dystansie nakłada 1 kość karną na strzelca', () => {
      const dive = resolveDiveForCover(30, 50, 'base_range'); // Regular success
      expect(dive.success).toBe(true);
      expect(dive.cancelledBonusDie).toBe(false);
      expect(dive.imposesPenaltyDie).toBe(true);
      expect(dive.targetIsProne).toBe(true);
      expect(dive.targetLosesNextAction).toBe(true);

      const net = calculateFirearmNetDice({
        distanceCategory: 'base_range',
        targetDivingForCoverSuccess: true,
      });
      expect(net.bonusDice).toBe(0);
      expect(net.penaltyDice).toBe(1);
      expect(net.netDice).toBe(-1);
    });

    it('nieudany test Uniku: nie znosi premii ani nie nakłada kar, cel i tak ląduje na ziemi i traci akcję', () => {
      const diveFailPB = resolveDiveForCover(85, 50, 'point_blank'); // Fail
      expect(diveFailPB.success).toBe(false);
      expect(diveFailPB.cancelledBonusDie).toBe(false);
      expect(diveFailPB.imposesPenaltyDie).toBe(false);
      expect(diveFailPB.targetIsProne).toBe(true);
      expect(diveFailPB.targetLosesNextAction).toBe(true);

      const netPB = calculateFirearmNetDice({
        distanceCategory: 'point_blank',
        targetDivingForCoverSuccess: diveFailPB.cancelledBonusDie,
      });
      expect(netPB.bonusDice).toBe(1);
      expect(netPB.netDice).toBe(1);

      const diveFailRange = resolveDiveForCover(90, 50, 'long_range'); // Fail
      expect(diveFailRange.success).toBe(false);
      expect(diveFailRange.cancelledBonusDie).toBe(false);
      expect(diveFailRange.imposesPenaltyDie).toBe(false);
      expect(diveFailRange.targetIsProne).toBe(true);
      expect(diveFailRange.targetLosesNextAction).toBe(true);

      const netRange = calculateFirearmNetDice({
        distanceCategory: 'long_range',
        targetDivingForCoverSuccess: false,
      });
      // 1 penalty die for long range, 0 from dive for cover failure
      expect(netRange.penaltyDice).toBe(1);
      expect(netRange.netDice).toBe(-1);
    });

    it('resolveFirearmShot z udanym Dive for Cover na dalszym dystansie nakłada 1 kość karną na strzelca', () => {
      const shot = resolveFirearmShot({
        shooterName: 'Kultysta',
        targetName: 'Harvey',
        weaponName: '.38 Revolver',
        skillValue: 50,
        roll: 45,
        damageFormula: '1d10',
        distanceYards: 10,
        baseRangeYards: 15, // base_range
        isTargetDivingForCover: true,
        targetDodgeRoll: 20,
        targetDodgeSkill: 50, // Hard success on dodge
      });

      expect(shot.diveForCover).toBeDefined();
      expect(shot.diveForCover?.success).toBe(true);
      expect(shot.diveForCover?.imposesPenaltyDie).toBe(true);
      expect(shot.penaltyDice).toBe(1);
      expect(shot.netDice).toBe(-1);
    });

    it('resolveFirearmBurst obsługuje Dive for Cover i zwraca stan padnięcia za osłonę', () => {
      const burst = resolveFirearmBurst({
        shooterName: 'Gangster',
        targetName: 'Harvey',
        weaponName: 'Tommy Gun',
        skillValue: 50,
        roll: 40,
        damageFormula: '1d10',
        isTargetDivingForCover: true,
        targetDodgeRoll: 15,
        targetDodgeSkill: 50,
      });

      expect(burst.diveForCover).toBeDefined();
      expect(burst.diveForCover?.success).toBe(true);
      expect(burst.diveForCover?.targetIsProne).toBe(true);
      expect(burst.diveForCover?.targetLosesNextAction).toBe(true);
    });
  });

  describe('5. Parser i sanitizacja tagów [WALKA_ATAK:...]', () => {
    it('extractOpposedMeleeEvents poprawnie parsuje tag w formacie klucz=wartość', () => {
      const text = 'Kultysta doskakuje z sztyletem! [WALKA_ATAK: napastnik=Kultysta | skill=60 | bron=Sztylet | obrazenia=1d4 | build=1 | db=0 | zamiar=Pchnięcie w serce]';
      const events = extractOpposedMeleeEvents(text);
      expect(events).toHaveLength(1);
      expect(events[0].attackerName).toBe('Kultysta');
      expect(events[0].attackerSkill).toBe(60);
      expect(events[0].weaponName).toBe('Sztylet');
      expect(events[0].damageFormula).toBe('1d4');
      expect(events[0].attackerBuild).toBe(1);
      expect(events[0].damageClass).toBe('impaling');
      expect(events[0].intent).toBe('Pchnięcie w serce');
    });

    it('extractOpposedMeleeEvents rozpoznaje tagi outnumbered oraz drugiego napastnika na ten sam cel w wypowiedzi', () => {
      const textExplicit = '[WALKA_ATAK: napastnik=Bandyta | skill=50 | outnumbered=true]';
      const eventsExplicit = extractOpposedMeleeEvents(textExplicit);
      expect(eventsExplicit[0].isOutnumbered).toBe(true);

      const textMultiple = `
        [WALKA_ATAK: @Harvey: napastnik=Zbir 1 | skill=50]
        [WALKA_ATAK: @Harvey: napastnik=Zbir 2 | skill=55]
      `;
      const eventsMultiple = extractOpposedMeleeEvents(textMultiple);
      expect(eventsMultiple).toHaveLength(2);
      expect(eventsMultiple[0].isOutnumbered).toBeUndefined();
      expect(eventsMultiple[1].isOutnumbered).toBe(true);
    });

    it('extractOpposedMeleeEvents poprawnie parsuje tag pozycyjny [OBRONA_WALKA:...]', () => {
      const text = '[OBRONA_WALKA: Ghul | 55 | Pazury | 1d6 | 2]';
      const events = extractOpposedMeleeEvents(text);
      expect(events).toHaveLength(1);
      expect(events[0].attackerName).toBe('Ghul');
      expect(events[0].attackerSkill).toBe(55);
      expect(events[0].weaponName).toBe('Pazury');
      expect(events[0].damageFormula).toBe('1d6');
      expect(events[0].attackerBuild).toBe(2);
    });

    it('extractOpposedMeleeEvents obsługuje adresata @Postać w trybie wieloosobowym / duet', () => {
      const text = '[WALKA_ATAK:@Harvey Walters: napastnik=Mafiozo | skill=50 | bron=Pałka | obrazenia=1d6 | build=0]';
      const events = extractOpposedMeleeEvents(text);
      expect(events).toHaveLength(1);
      expect(events[0].characterName).toBe('Harvey Walters');
      expect(events[0].attackerName).toBe('Mafiozo');
    });

    it('stripMeleeAttackTags usuwa tagi walki bez pozostawiania śladów (w tym MELEE_DEFENSE)', () => {
      const text = 'Uważaj! [WALKA_ATAK: napastnik=Zbój | skill=50] Cios nadchodzi!';
      const cleaned = stripMeleeAttackTags(text);
      expect(cleaned).toBe('Uważaj!  Cios nadchodzi!');

      const textDefense = 'Uważaj! [MELEE_DEFENSE: Kultysta | 50] Blok.';
      expect(stripMeleeAttackTags(textDefense)).toBe('Uważaj!  Blok.');
    });

    it('sanitizeMechanicalTags oraz cleanupContent usuwają tagi WALKA_ATAK i OBRONA_WALKA z narracji prezentowanej graczowi i TTS', () => {
      const text = 'Przeciwnik zamachuje się maczugą! [WALKA_ATAK: napastnik=Ogr | skill=65 | bron=Maczuga | obrazenia=2d6 | build=3] Przygotuj się!';
      const cleanedMech = sanitizeMechanicalTags(text);
      expect(cleanedMech).not.toContain('WALKA_ATAK');
      expect(cleanedMech).not.toContain('build=3');
      expect(cleanedMech).toContain('Przeciwnik zamachuje się maczugą!');
      expect(cleanedMech).toContain('Przygotuj się!');

      const cleanedContent = cleanupContent(text);
      expect(cleanedContent).not.toContain('WALKA_ATAK');
      expect(cleanedContent).not.toContain('build=3');
      expect(cleanedContent).toContain('Przeciwnik zamachuje się maczugą!');
      expect(cleanedContent).toContain('Przygotuj się!');
    });
  });
});
