import {
  resolveMeleeEngagement,
  checkManeuverFeasibility,
  resolveOutnumberedBonus,
  calculateMeleeDamage,
  checkMajorWound,
  getMaxDiceValue,
} from '@/lib/combat/combat-resolver';

describe('combat-resolver (CoC 7e RAW)', () => {
  describe('Unik (Dodge) - Asymetria remisu na korzyść obrońcy', () => {
    it('przy remisie stopni sukcesu (obaj zwykły sukces) wygrywa obrońca (atak chybia)', () => {
      const result = resolveMeleeEngagement({
        attackerName: 'Kultysta',
        defenderName: 'Badacz',
        attackerRoll: 40,
        attackerSkill: 50, // regular
        defenderRoll: 30,
        defenderSkill: 40, // regular
        defenseChoice: 'dodge',
      });

      expect(result.winner).toBe('defender');
      expect(result.isTie).toBe(true);
      expect(result.damageDealtTo).toBe('none');
      expect(result.logKey).toBe('dodgeSuccessTie');
    });

    it('przy remisie stopni sukcesu (obaj trudny sukces) wygrywa obrońca', () => {
      const result = resolveMeleeEngagement({
        attackerName: 'Kultysta',
        defenderName: 'Badacz',
        attackerRoll: 20,
        attackerSkill: 50, // hard (<= 25)
        defenderRoll: 18,
        defenderSkill: 40, // hard (<= 20)
        defenseChoice: 'dodge',
      });

      expect(result.winner).toBe('defender');
      expect(result.isTie).toBe(true);
      expect(result.damageDealtTo).toBe('none');
    });

    it('gdy obaj poniosą porażkę, atak chybia i nikt nie otrzymuje obrażeń', () => {
      const result = resolveMeleeEngagement({
        attackerName: 'Kultysta',
        defenderName: 'Badacz',
        attackerRoll: 80,
        attackerSkill: 50, // fail
        defenderRoll: 75,
        defenderSkill: 40, // fail
        defenseChoice: 'dodge',
      });

      expect(result.winner).toBe('none');
      expect(result.damageDealtTo).toBe('none');
      expect(result.logKey).toBe('bothFailedMiss');
    });

    it('atakujący trafia obrońcę tylko przy ściśle wyższym stopniu sukcesu', () => {
      const result = resolveMeleeEngagement({
        attackerName: 'Kultysta',
        defenderName: 'Badacz',
        attackerRoll: 20,
        attackerSkill: 50, // hard (<= 25)
        defenderRoll: 35,
        defenderSkill: 40, // regular (> 20)
        defenseChoice: 'dodge',
        attackerWeaponFormula: '1d6',
        rollFn: () => 4,
      });

      expect(result.winner).toBe('attacker');
      expect(result.damageDealtTo).toBe('defender');
      expect(result.damage?.effectiveDamage).toBe(4);
      expect(result.logKey).toBe('attackerHitsDodger');
    });

    it('obrońca unika ataku, gdy uzyskał ściśle wyższy stopień sukcesu niż atakujący', () => {
      const result = resolveMeleeEngagement({
        attackerName: 'Kultysta',
        defenderName: 'Badacz',
        attackerRoll: 45,
        attackerSkill: 50, // regular
        defenderRoll: 15,
        defenderSkill: 40, // hard (<= 20)
        defenseChoice: 'dodge',
      });

      expect(result.winner).toBe('defender');
      expect(result.damageDealtTo).toBe('none');
      expect(result.logKey).toBe('dodgeSuccessBeatsAttacker');
    });
  });

  describe('Kontratak (Fight Back) - Asymetria remisu na korzyść atakującego', () => {
    it('przy remisie stopni sukcesu (obaj zwykły sukces) wygrywa atakujący i zadaje obrażenia', () => {
      const result = resolveMeleeEngagement({
        attackerName: 'Kultysta',
        defenderName: 'Badacz',
        attackerRoll: 35,
        attackerSkill: 50, // regular
        defenderRoll: 30,
        defenderSkill: 50, // regular
        defenseChoice: 'fight_back',
        attackerWeaponFormula: '1d4',
        rollFn: () => 3,
      });

      expect(result.winner).toBe('attacker');
      expect(result.isTie).toBe(true);
      expect(result.damageDealtTo).toBe('defender');
      expect(result.damage?.effectiveDamage).toBe(3);
      expect(result.logKey).toBe('fightBackAttackerWinsTie');
    });

    it('obrońca rani atakującego TYLKO wtedy, gdy uzyska ściśle wyższy stopień sukcesu', () => {
      const result = resolveMeleeEngagement({
        attackerName: 'Kultysta',
        defenderName: 'Badacz',
        attackerRoll: 40,
        attackerSkill: 50, // regular
        defenderRoll: 15,
        defenderSkill: 50, // hard (<= 25)
        defenseChoice: 'fight_back',
        defenderWeaponFormula: '1d3',
        defenderDamageBonusFormula: '1d4',
        rollFn: (f) => (f === '1d3' ? 2 : 3),
      });

      expect(result.winner).toBe('defender');
      expect(result.damageDealtTo).toBe('attacker');
      expect(result.damage?.effectiveDamage).toBe(5);
      expect(result.logKey).toBe('fightBackDefenderStrikes');
    });

    it('gdy obaj poniosą porażkę w kontrataku, nikt nie zadaje obrażeń', () => {
      const result = resolveMeleeEngagement({
        attackerName: 'Kultysta',
        defenderName: 'Badacz',
        attackerRoll: 90,
        attackerSkill: 50, // fail
        defenderRoll: 85,
        defenderSkill: 50, // fail
        defenseChoice: 'fight_back',
      });

      expect(result.winner).toBe('none');
      expect(result.damageDealtTo).toBe('none');
      expect(result.logKey).toBe('bothFailedMiss');
    });

    it('kontratak z sukcesem ekstremalnym nie przyznaje Przebicia (Impale)', () => {
      const result = resolveMeleeEngagement({
        attackerName: 'Kultysta',
        defenderName: 'Badacz',
        attackerRoll: 40,
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
  });

  describe('Manewry bojowe (Fighting Maneuvers) i weryfikacja Budowy (Build)', () => {
    it('pozwala na manewr bez kar gdy Build celu <= Build atakującego', () => {
      const check = checkManeuverFeasibility(1, 1);
      expect(check.allowed).toBe(true);
      expect(check.penaltyDice).toBe(0);
    });

    it('nakłada 1 kość karną gdy Build celu jest większy o 1', () => {
      const check = checkManeuverFeasibility(0, 1);
      expect(check.allowed).toBe(true);
      expect(check.penaltyDice).toBe(1);
    });

    it('nakłada 2 kości karne gdy Build celu jest większy o 2', () => {
      const check = checkManeuverFeasibility(0, 2);
      expect(check.allowed).toBe(true);
      expect(check.penaltyDice).toBe(2);
    });

    it('blokuje manewr całkowicie gdy różnica Budowy wynosi 3 lub więcej', () => {
      const check = checkManeuverFeasibility(0, 3);
      expect(check.allowed).toBe(false);
      expect(check.reason).toBe('buildDifferenceTooGreat');
    });

    it('w manewrze przy remisie sukcesów wygrywa obrońca', () => {
      const result = resolveMeleeEngagement({
        attackerName: 'Kultysta',
        defenderName: 'Badacz',
        attackerRoll: 30,
        attackerSkill: 50, // regular
        defenderRoll: 30,
        defenderSkill: 50, // regular
        defenseChoice: 'maneuver',
        maneuverType: 'grapple',
        attackerBuild: 0,
        defenderBuild: 0,
      });

      expect(result.winner).toBe('defender');
      expect(result.isTie).toBe(true);
      expect(result.damageDealtTo).toBe('none');
      expect(result.maneuverApplied).toBe('grapple');
      expect(result.logKey).toBe('maneuverSuccessTie');
    });
  });

  describe('Przebicie (Impale) i kalkulacja obrażeń', () => {
    it('poprawnie parsuje maksymalne wartości kości', () => {
      expect(getMaxDiceValue('1d6')).toBe(6);
      expect(getMaxDiceValue('1d4+2')).toBe(6);
      expect(getMaxDiceValue('2d6+4')).toBe(16);
      expect(getMaxDiceValue('1d10')).toBe(10);
    });

    it('sukces ekstremalny broni kłującej/ciętej daje Przebicie (max + max DB + rzut)', () => {
      const dmg = calculateMeleeDamage({
        weaponDamageFormula: '1d4+2',
        damageBonusFormula: '1d4',
        damageType: 'impaling',
        outcome: 'extreme',
        rollFn: (f) => (f === '1d4+2' ? 3 : 0),
      });

      // max(1d4+2) = 6, max(1d4) = 4, extra roll = 3 => 6 + 4 + 3 = 13
      expect(dmg.isImpale).toBe(true);
      expect(dmg.rawDamage).toBe(13);
    });

    it('sukces ekstremalny broni tępej daje max obrażeń bez dodatkowego rzutu', () => {
      const dmg = calculateMeleeDamage({
        weaponDamageFormula: '1d6',
        damageBonusFormula: '1d4',
        damageType: 'blunt',
        outcome: 'extreme',
      });

      // max(1d6) = 6, max(1d4) = 4 => 10
      expect(dmg.isImpale).toBe(false);
      expect(dmg.rawDamage).toBe(10);
    });
  });

  describe('Przewaga liczebna (Outnumbered)', () => {
    it('pierwsza obrona w rundzie jest darmowa bez kości premiowych dla atakującego', () => {
      const out = resolveOutnumberedBonus(0);
      expect(out.bonusDiceToAttacker).toBe(0);
      expect(out.isOutnumbered).toBe(false);
    });

    it('kolejna obrona w tej samej rundzie daje napastnikowi 1 kość premiową', () => {
      const out1 = resolveOutnumberedBonus(1);
      expect(out1.bonusDiceToAttacker).toBe(1);
      expect(out1.isOutnumbered).toBe(true);

      const out2 = resolveOutnumberedBonus(2);
      expect(out2.bonusDiceToAttacker).toBe(1);
      expect(out2.isOutnumbered).toBe(true);
    });
  });

  describe('Ciężkie Rany (Major Wounds) a konwencje', () => {
    it('w konwencji classic i noir obrażenia >= połowa maxHP powodują Ciężką Ranę', () => {
      const res = checkMajorWound(5, 10, 'classic');
      expect(res.isMajorWound).toBe(true);
      expect(res.conTestRequired).toBe(true);

      const resNoir = checkMajorWound(6, 12, 'noir');
      expect(resNoir.isMajorWound).toBe(true);
    });

    it('w konwencji classic obrażenia < połowa maxHP nie powodują Ciężkiej Rany', () => {
      const res = checkMajorWound(4, 10, 'classic');
      expect(res.isMajorWound).toBe(false);
      expect(res.conTestRequired).toBe(false);
    });

    it('w konwencji pulp brak Ciężkiej Rany przy życiu, chyba że obrażenia >= pełne maxHP', () => {
      const resPulp = checkMajorWound(7, 10, 'pulp');
      expect(resPulp.isMajorWound).toBe(false);

      const resInstantKill = checkMajorWound(10, 10, 'pulp');
      expect(resInstantKill.isMajorWound).toBe(true);
    });
  });
});
