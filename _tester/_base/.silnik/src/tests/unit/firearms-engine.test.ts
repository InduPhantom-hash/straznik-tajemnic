import {
  calculateFirearmInitiative,
  calculateDistanceCategory,
  calculateMultipleShotsPenalty,
  calculateBurstSize,
  checkMalfunction,
  resolveDiveForCover,
  calculateFirearmNetDice,
  calculateSingleShotDamage,
  resolveFirearmShot,
  resolveFirearmBurst,
  getJamClearingRequirement,
  getReloadRequirement,
} from '@/lib/combat/firearms-engine';

describe('firearms-engine (CoC 7e RAW)', () => {
  describe('Inicjatywa z bronią palną', () => {
    it('przygotowana i wycelowana broń palna daje inicjatywę DEX + 50', () => {
      expect(calculateFirearmInitiative(65, true)).toBe(115);
      expect(calculateFirearmInitiative(40, true)).toBe(90);
    });

    it('niewyciągnięta / niewycelowana broń palna zachowuje bazową inicjatywę DEX', () => {
      expect(calculateFirearmInitiative(65, false)).toBe(65);
    });
  });

  describe('Kategorie dystansu i modyfikatory', () => {
    it('poprawnie wyznacza strzał z przyłożenia (point-blank) na bazie DEX/15 jardów', () => {
      // DEX 60: 60/15 = 4 jardy
      expect(calculateDistanceCategory(2, 20, 60)).toBe('point_blank');
      expect(calculateDistanceCategory(4, 20, 60)).toBe('point_blank');
      expect(calculateDistanceCategory(5, 20, 60)).toBe('base_range');
    });

    it('stosuje domyślny próg 3 jardów dla point-blank gdy brak DEX strzelca', () => {
      expect(calculateDistanceCategory(2, 15)).toBe('point_blank');
      expect(calculateDistanceCategory(3, 15)).toBe('point_blank');
      expect(calculateDistanceCategory(4, 15)).toBe('base_range');
    });

    it('poprawnie klasyfikuje dystans bazowy, długi, ekstremalny i poza zasięgiem', () => {
      const baseRange = 20; // jardów
      expect(calculateDistanceCategory(15, baseRange, 30)).toBe('base_range');
      expect(calculateDistanceCategory(25, baseRange, 30)).toBe('long_range');
      expect(calculateDistanceCategory(40, baseRange, 30)).toBe('long_range');
      expect(calculateDistanceCategory(45, baseRange, 30)).toBe('extreme_range');
      expect(calculateDistanceCategory(80, baseRange, 30)).toBe('extreme_range');
      expect(calculateDistanceCategory(85, baseRange, 30)).toBe('out_of_range');
    });
  });

  describe('Kary za wielokrotne strzały w rundzie', () => {
    it('pierwszy strzał nie ma kar', () => {
      expect(calculateMultipleShotsPenalty(1)).toBe(0);
    });

    it('drugi strzał w rundzie nakłada 1 kość karną', () => {
      expect(calculateMultipleShotsPenalty(2)).toBe(1);
    });

    it('trzeci strzał w rundzie nakłada 2 kości karne', () => {
      expect(calculateMultipleShotsPenalty(3)).toBe(2);
    });
  });

  describe('Kalkulacja bilansu kości (Net Dice)', () => {
    it('point-blank przyznaje 1 kość premiową (bonus die)', () => {
      const res = calculateFirearmNetDice({
        distanceCategory: 'point_blank',
        shotNumberInRound: 1,
      });
      expect(res.bonusDice).toBe(1);
      expect(res.penaltyDice).toBe(0);
      expect(res.netDice).toBe(1);
    });

    it('długi dystans nakłada 1 kość karną', () => {
      const res = calculateFirearmNetDice({
        distanceCategory: 'long_range',
        shotNumberInRound: 1,
      });
      expect(res.bonusDice).toBe(0);
      expect(res.penaltyDice).toBe(1);
      expect(res.netDice).toBe(-1);
    });

    it('ekstremalny dystans nakłada 2 kości karne', () => {
      const res = calculateFirearmNetDice({
        distanceCategory: 'extreme_range',
        shotNumberInRound: 1,
      });
      expect(res.penaltyDice).toBe(2);
      expect(res.netDice).toBe(-2);
    });

    it('drugi strzał na długim dystansie sumuje kary (1 za zasięg + 1 za kolejny strzał = 2 kości karne)', () => {
      const res = calculateFirearmNetDice({
        distanceCategory: 'long_range',
        shotNumberInRound: 2,
      });
      expect(res.penaltyDice).toBe(2);
      expect(res.netDice).toBe(-2);
    });
  });

  describe('Dive for Cover (Rzut za osłonę)', () => {
    it('udany test Uniku znosi kość premiową point-blank i powala cel na ziemię', () => {
      const dive = resolveDiveForCover(20, 50); // Hard success
      expect(dive.success).toBe(true);
      expect(dive.cancelledBonusDie).toBe(true);
      expect(dive.targetIsProne).toBe(true);
      expect(dive.targetLosesNextAction).toBe(true);

      const net = calculateFirearmNetDice({
        distanceCategory: 'point_blank',
        targetDivingForCoverSuccess: dive.cancelledBonusDie,
      });
      expect(net.bonusDice).toBe(0);
      expect(net.netDice).toBe(0);
    });

    it('nieudany test Uniku nie znosi kości premiowej, a cel i tak pada i traci akcję', () => {
      const dive = resolveDiveForCover(75, 50); // Failure
      expect(dive.success).toBe(false);
      expect(dive.cancelledBonusDie).toBe(false);
      expect(dive.targetIsProne).toBe(true);
      expect(dive.targetLosesNextAction).toBe(true);

      const net = calculateFirearmNetDice({
        distanceCategory: 'point_blank',
        targetDivingForCoverSuccess: dive.cancelledBonusDie,
      });
      expect(net.bonusDice).toBe(1);
      expect(net.netDice).toBe(1);
    });
  });

  describe('Zawodność i zacięcie broni (Malfunction)', () => {
    it('rzut >= progu zacięcia oznacza zacięcie broni', () => {
      expect(checkMalfunction(100, 100)).toBe(true);
      expect(checkMalfunction(96, 96)).toBe(true);
      expect(checkMalfunction(98, 96)).toBe(true);
    });

    it('rzut < progu zacięcia nie powoduje awarii', () => {
      expect(checkMalfunction(99, 100)).toBe(false);
      expect(checkMalfunction(95, 96)).toBe(false);
    });

    it('resolveFirearmShot przy zacięciu blokuje wydawanie Szczęścia (RAW)', () => {
      const res = resolveFirearmShot({
        shooterName: 'Badacz',
        targetName: 'Kultysta',
        weaponName: '.38 Revolver',
        skillValue: 60,
        roll: 100,
        damageFormula: '1d10',
        distanceYards: 10,
        baseRangeYards: 15,
        malfunctionThreshold: 100,
      });

      expect(res.isMalfunction).toBe(true);
      expect(res.isLuckForbidden).toBe(true);
      expect(res.hit).toBe(false);
      expect(res.logKey).toBe('firearmMalfunction');
    });
  });

  describe('Kalkulacja obrażeń pojedynczego strzału i Przebicie (Impale)', () => {
    it('zwykły sukces zadaje normalne obrażenia z kości broni', () => {
      const dmg = calculateSingleShotDamage({
        damageFormula: '1d10',
        outcome: 'regular',
        targetArmor: 0,
        rollFn: () => 7,
      });

      expect(dmg.rawDamage).toBe(7);
      expect(dmg.effectiveDamage).toBe(7);
      expect(dmg.isImpale).toBe(false);
    });

    it('sukces ekstremalny zadaje Przebicie (Impale): max broni + dodatkowy rzut kością', () => {
      const dmg = calculateSingleShotDamage({
        damageFormula: '1d10',
        outcome: 'extreme',
        targetArmor: 0,
        rollFn: () => 6,
      });

      // 1d10 max = 10; extra roll = 6 -> total 16
      expect(dmg.rawDamage).toBe(16);
      expect(dmg.effectiveDamage).toBe(16);
      expect(dmg.isImpale).toBe(true);
    });

    it('pancerz celu redukuje obrażenia strzału', () => {
      const dmg = calculateSingleShotDamage({
        damageFormula: '1d10',
        outcome: 'regular',
        targetArmor: 3,
        rollFn: () => 8,
      });

      expect(dmg.rawDamage).toBe(8);
      expect(dmg.effectiveDamage).toBe(5); // 8 - 3
    });

    it('obrażenia >= połowa maxHP wywołują Ciężką Ranę w konwencji classic', () => {
      const dmg = calculateSingleShotDamage({
        damageFormula: '1d10',
        outcome: 'regular',
        targetArmor: 0,
        targetMaxHp: 12,
        convention: 'classic',
        rollFn: () => 6, // 6 >= 12/2
      });

      expect(dmg.isMajorWound).toBe(true);
    });
  });

  describe('Salwy i ogień ciągły (Burst / Full Auto)', () => {
    it('wylicza wielkość salwy z dziesiątek wartości umiejętności (min. 3 kule)', () => {
      expect(calculateBurstSize(15)).toBe(3);
      expect(calculateBurstSize(25)).toBe(3);
      expect(calculateBurstSize(45)).toBe(4);
      expect(calculateBurstSize(75)).toBe(7);
      expect(calculateBurstSize(90)).toBe(9);
    });

    it('zwykły sukces w salwie trafia połową kul (zaokrąglenie w dół)', () => {
      const burst = resolveFirearmBurst({
        shooterName: 'Detektyw',
        targetName: 'Potwór',
        weaponName: 'Tommy Gun',
        skillValue: 50,
        roll: 35, // Regular success
        damageFormula: '1d10+2',
        burstSize: 5,
        rollFn: () => 7,
      });

      expect(burst.isMalfunction).toBe(false);
      expect(burst.bulletsHit).toBe(2); // floor(5/2) = 2
      expect(burst.hits.length).toBe(2);
      expect(burst.hits.every((h) => !h.isImpale)).toBe(true);
      expect(burst.totalRawDamage).toBe(14); // 2 * 7
    });

    it('ekstremalny sukces w salwie trafia wszystkimi kulami, połowa z Przebiciem (Impale)', () => {
      const burst = resolveFirearmBurst({
        shooterName: 'Detektyw',
        targetName: 'Potwór',
        weaponName: 'Tommy Gun',
        skillValue: 50,
        roll: 8, // Extreme success (8 <= 10)
        damageFormula: '1d10',
        burstSize: 4,
        rollFn: () => 5,
      });

      expect(burst.bulletsHit).toBe(4);
      // ceil(4/2) = 2 Impale, 2 Regular
      const impales = burst.hits.filter((h) => h.isImpale);
      const regulars = burst.hits.filter((h) => !h.isImpale);

      expect(impales.length).toBe(2);
      expect(regulars.length).toBe(2);
      // Impale 1d10 = max(10) + roll(5) = 15
      expect(impales[0].rawDamage).toBe(15);
      // Regular 1d10 = roll(5)
      expect(regulars[0].rawDamage).toBe(5);
      expect(burst.totalRawDamage).toBe(15 + 15 + 5 + 5); // 40
    });

    it('zacięcie broni w trakcie salwy uniemożliwia wydawanie Szczęścia', () => {
      const burst = resolveFirearmBurst({
        shooterName: 'Detektyw',
        targetName: 'Potwór',
        weaponName: 'Tommy Gun',
        skillValue: 50,
        roll: 96,
        malfunctionThreshold: 96,
        damageFormula: '1d10+2',
      });

      expect(burst.isMalfunction).toBe(true);
      expect(burst.isLuckForbidden).toBe(true);
      expect(burst.bulletsHit).toBe(0);
      expect(burst.totalEffectiveDamage).toBe(0);
    });
  });

  describe('Wymagania odblokowania i przeładowania', () => {
    it('zwraca wymagania odblokowania zależne od typu broni', () => {
      const handgunJam = getJamClearingRequirement('handgun');
      expect(handgunJam.roundsNeeded).toBe(1);
      expect(handgunJam.requiresSkillCheck).toBe(false);

      const smgJam = getJamClearingRequirement('smg');
      expect(smgJam.roundsNeeded).toBe('1d6');
      expect(smgJam.requiresSkillCheck).toBe(true);
    });

    it('zwraca poprawny czas przeładowania pojedynczego vs magazynka', () => {
      const single = getReloadRequirement('single_round', 6);
      expect(single.combatRoundsNeeded).toBe(3); // 2 kule / rundę -> 6 kul = 3 rundy

      const mag = getReloadRequirement('box_magazine', 30);
      expect(mag.combatRoundsNeeded).toBe(1); // wymiana całego magazynka = 1 runda
    });
  });
});
