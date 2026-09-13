import type {
  CastingRequest,
  CastingResolution,
  CastingCatastrophe,
  SpontaneousMagicRequest,
  SpontaneousMagicResolution,
  SpellDefinition,
  OpposedDefenseRequest,
  OpposedDefenseResolution,
} from './types';
import { getSpellDefinition, getCatastropheEffect } from './catalog';
import { IMagicDiceRoller, StandardMagicDiceRoller } from './dice-roller';
import { evaluateSkillCheck, meetsDifficulty, RollOutcome } from '@/lib/dice-utils';

/**
 * Oblicza poziom sukcesu na potrzeby rzutu spornego (Opposed Roll).
 * 0: Fail/Fumble, 1: Regular, 2: Hard, 3: Extreme, 4: Critical
 */
function getSuccessRank(roll: number, statValue: number): number {
  if (roll === 1) return 4; // Critical
  if (statValue < 50 && roll >= 96) return 0; // Fumble
  if (roll === 100) return 0; // Fumble
  if (roll <= Math.floor(statValue / 5)) return 3; // Extreme
  if (roll <= Math.floor(statValue / 2)) return 2; // Hard
  if (roll <= statValue) return 1; // Regular
  return 0; // Fail
}

export class MagicEngine {
  private roller: IMagicDiceRoller;

  constructor(roller?: IMagicDiceRoller) {
    this.roller = roller ?? new StandardMagicDiceRoller();
  }

  /**
   * Główny punkt wejścia dla rzucania zaklęć CoC 7e RAW.
   * Obsługuje:
   * - Bramkę Wiary (sceptyk nie rzuca czarów)
   * - Pierwsze rzucenie (Trudny POW) i forsowanie z katastrofą
   * - Kolejne rzucenia (automatyczny sukces)
   * - Konwersję brakujących PM na HP (1:1)
   * - Trwałą utratę POW (np. Znak Starszych Bogów)
   * - Rzuty sporne POW (np. Zdominowanie)
   * - Głębszą Magię (Deeper Magic przy obłędzie badacza)
   */
  resolveCasting(request: CastingRequest, spellDef?: SpellDefinition): CastingResolution {
    const spell = spellDef ?? getSpellDefinition(request.spellId);
    if (!spell) {
      throw new Error(`Nieznane zaklęcie: ${request.spellId}`);
    }

    // 1. Bramka Wiary (Belief Gate - RAW & Seth Skorkowsky)
    if (request.belief === 'skeptic') {
      return {
        success: false,
        spellId: spell.id,
        isFirstCast: true,
        costPaid: { mp: 0, hpFromMp: 0, san: 0, powPermanent: 0 },
        statChanges: { mpDelta: 0, hpDelta: 0, sanDelta: 0, powDelta: 0 },
        characterUpdates: { isFirstCastDone: false },
        message: {
          pl: `${request.casterName} podchodzi do tekstu czysto akademicko. Brak wiary w realność Mitów uniemożliwia zakrzywienie rzeczywistości i rzucenie magii.`,
          en: `${request.casterName} views the text purely academically. Without true belief in the Mythos, reality cannot be bent and magic cannot be cast.`,
        },
        gmNarrativeContext: `Badacz ${request.casterName} recytuje słowa, lecz dla niego to tylko zabobon. Nic się nie dzieje, powietrze pozostaje martwe.`,
      };
    }

    // 2. Kalkulacja kosztów
    const rawMpCost = this.roller.rollFormula(spell.mpCost);
    const rawSanCost = this.roller.rollFormula(spell.sanCost);
    const rawPowCost = spell.powCost ?? 0;

    let mpPaid = 0;
    let hpFromMp = 0;

    if (request.casterMp >= rawMpCost) {
      mpPaid = rawMpCost;
    } else {
      const missingMp = rawMpCost - request.casterMp;
      if (!request.allowHpConversion) {
        return {
          success: false,
          spellId: spell.id,
          isFirstCast: false,
          costPaid: { mp: 0, hpFromMp: 0, san: 0, powPermanent: 0 },
          statChanges: { mpDelta: 0, hpDelta: 0, sanDelta: 0, powDelta: 0 },
          characterUpdates: { isFirstCastDone: false },
          message: {
            pl: `Niewystarczająca liczba Punktów Magii (${request.casterMp}/${rawMpCost}). Wymagana zgoda na pobranie brakujących ${missingMp} PM bezpośrednio z Punktów Wytrzymałości (HP 1:1).`,
            en: `Insufficient Magic Points (${request.casterMp}/${rawMpCost}). Requires consent to draw missing ${missingMp} MP directly from Hit Points (HP 1:1).`,
          },
          gmNarrativeContext: `Badaczowi brakuje energii mentalnej do dokończenia inkantacji. Zaklęcie wymaga ofiary z własnej krwi i ciała.`,
        };
      }

      // Gracz zgodził się na konwersję MP -> HP
      mpPaid = request.casterMp;
      hpFromMp = missingMp;

      if (request.casterHp <= hpFromMp) {
        return {
          success: false,
          spellId: spell.id,
          isFirstCast: false,
          costPaid: { mp: 0, hpFromMp: 0, san: 0, powPermanent: 0 },
          statChanges: { mpDelta: 0, hpDelta: 0, sanDelta: 0, powDelta: 0 },
          characterUpdates: { isFirstCastDone: false },
          message: {
            pl: `Pobranie ${hpFromMp} HP zabiłoby lub pozbawiło przytomności badacza (aktualne HP: ${request.casterHp}). Przerwano rzucanie.`,
            en: `Drawing ${hpFromMp} HP would kill or incapacitate investigator (current HP: ${request.casterHp}). Casting aborted.`,
          },
          gmNarrativeContext: `Ciało badacza pęka pod naporem sił Mitów, grożąc natychmiastowym zgonem. Inkantacja załamała się.`,
        };
      }
    }

    const isFirstCast = request.isFirstCastOverride ?? false;
    const hardPowThreshold = Math.floor(request.casterPow / 2);

    // 3. Pierwsze rzucenie vs kolejne rzucenia
    let success = false;
    let firstCastRollData: CastingResolution['firstCastRoll'] | undefined;
    let deeperUnlockedNow = false;

    if (isFirstCast) {
      const roll = this.roller.rollD100();
      const passed = roll <= hardPowThreshold;
      const outcome = evaluateSkillCheck(roll, hardPowThreshold);

      if (!request.isPush) {
        // Zwykła pierwsza próba
        if (passed) {
          success = true;
          firstCastRollData = {
            roll,
            threshold: hardPowThreshold,
            outcome,
            success: true,
            isPushed: false,
          };
        } else {
          // Porażka pierwszego rzucenia: Zgodnie z RAW CoC 7e (s. 177) i poradnikiem Setha Skorkowsky'ego,
          // KOSZTY SĄ POBIERANE NAWET PRZY PORAŻCE!
          success = false;
          firstCastRollData = {
            roll,
            threshold: hardPowThreshold,
            outcome,
            success: false,
            isPushed: false,
          };
        }
      } else {
        // Forsowanie pierwszego rzucenia (Pushed Roll)
        if (passed) {
          success = true;
          firstCastRollData = {
            roll,
            threshold: hardPowThreshold,
            outcome,
            success: true,
            isPushed: true,
          };
        } else {
          // Porażka forsowania: ZAKLĘCIE ZADZIAŁAŁO, ALE Z KATASTROFĄ!
          // (RAW s. 177: "The spell works, but brings disaster upon the caster")
          success = true;
          firstCastRollData = {
            roll,
            threshold: hardPowThreshold,
            outcome,
            success: false,
            isPushed: true,
            pushedFailedCatastrophe: true,
          };
        }
      }
    } else {
      // Kolejne rzucenie: Udaje się AUTOMATYCZNIE bez rzutu kością!
      success = true;
    }

    // Jeśli porażka pierwszej próby (bez forsowania) - pobieramy koszty, ale zaklęcie nie zadziałało
    if (!success) {
      return {
        success: false,
        spellId: spell.id,
        isFirstCast: true,
        hardPowThreshold,
        firstCastRoll: firstCastRollData,
        costPaid: {
          mp: mpPaid,
          hpFromMp,
          san: rawSanCost,
          powPermanent: 0,
        },
        statChanges: {
          mpDelta: -mpPaid,
          hpDelta: -hpFromMp,
          sanDelta: -rawSanCost,
          powDelta: 0,
        },
        characterUpdates: { isFirstCastDone: false },
        message: {
          pl: `Pierwsze rzucenie zaklęcia „${spell.namePl}” nie powiodło się (rzut: ${firstCastRollData?.roll} vs Trudny POW ${hardPowThreshold}). Zgodnie z regułami CoC 7e koszty (${rawMpCost} PM, ${rawSanCost} SAN) zostały poniesione. Możesz forsować test lub nauczyć się formuły od nowa.`,
          en: `First casting of "${spell.nameEn}" failed (roll: ${firstCastRollData?.roll} vs Hard POW ${hardPowThreshold}). Under CoC 7e rules costs (${rawMpCost} MP, ${rawSanCost} SAN) were paid. You may push the roll or relearn the spell.`,
        },
        gmNarrativeContext: `Pierwsza próba opanowania zaklęcia ${spell.namePl} przez ${request.casterName} załamała się. Energia Mitów wyrwała się spod kontroli, drenując umysł badacza.`,
      };
    }

    // 4. Zaklęcie udane (lub porażka forsowania z katastrofą)
    let totalSanCost = rawSanCost;
    let totalPowCost = rawPowCost;
    let catastropheData: CastingCatastrophe | undefined;
    let catastropheText = '';

    if (firstCastRollData?.pushedFailedCatastrophe) {
      // Katastrofa forsowania wg CoC 7e RAW (str. 197-198):
      // 1. Pełny koszt zaklęcia mnożony przez kość 1K6
      const costMultiplier = Math.max(1, this.roller.rollFormula('1k6'));
      const multipliedMp = rawMpCost * costMultiplier;
      const multipliedSan = rawSanCost * costMultiplier;
      const multipliedPow = rawPowCost * costMultiplier;

      // 2. Pobranie PM i pokrycie niedoboru z HP (1:1 RAW)
      if (request.casterMp >= multipliedMp) {
        mpPaid = multipliedMp;
        hpFromMp = 0;
      } else {
        mpPaid = request.casterMp;
        hpFromMp = multipliedMp - request.casterMp;
      }

      totalSanCost = multipliedSan;
      totalPowCost = multipliedPow;

      // 3. Losowanie skutku z oficjalnej tabeli 1K8 katastrof (pomniejszych lub większych)
      const tier: 'minor' | 'major' = (rawPowCost > 0) ? 'major' : 'minor';
      const catRoll = Math.max(1, Math.min(8, this.roller.rollFormula('1k8')));
      const effect = getCatastropheEffect(tier, catRoll);

      catastropheData = {
        costMultiplier,
        mpDeficitPaidWithHp: hpFromMp,
        effect,
      };

      catastropheText = ` [KATASTROFA FORSOWANIA: Mnożnik kosztu 1K6 = ×${costMultiplier}! Koszt całkowity: ${multipliedMp} PM (${hpFromMp > 0 ? `niedobór ${hpFromMp} PM pobrano z HP! ` : ''}), ${multipliedSan} SAN${multipliedPow > 0 ? `, ${multipliedPow} POW` : ''}. Skutek: ${effect.name.pl}]`;
    }

    // 5. Test sporny POW (Opposed POW) jeśli zaklęcie tego wymaga
    let opposedRollData: CastingResolution['opposedRoll'] | undefined;
    if (spell.opposedRoll === 'pow' && request.target) {
      const casterRoll = this.roller.rollD100();
      const targetRoll = this.roller.rollD100();

      const casterRank = getSuccessRank(casterRoll, request.casterPow);
      const targetRank = getSuccessRank(targetRoll, request.target.pow);

      const casterOutcome = evaluateSkillCheck(casterRoll, request.casterPow);
      const targetOutcome = evaluateSkillCheck(targetRoll, request.target.pow);

      let winner: 'caster' | 'target' | 'tie' = 'caster';
      // Zasada granic możliwości CoC 7e RAW (str. 99): różnica 100+
      if (request.target.pow >= request.casterPow + 100) {
        winner = 'target';
      } else if (request.casterPow >= request.target.pow + 100) {
        winner = 'caster';
      } else if (casterRank > targetRank) {
        winner = 'caster';
      } else if (casterRank < targetRank) {
        winner = 'target';
      } else {
        // Remis w poziomach sukcesu -> wygrywa wyższa cecha bazowa
        if (request.casterPow > request.target.pow) winner = 'caster';
        else if (request.casterPow < request.target.pow) winner = 'target';
        else winner = 'tie';
      }

      opposedRollData = {
        casterRoll,
        casterSuccessLevel: casterRank,
        casterOutcome,
        casterName: request.casterName,
        casterPow: request.casterPow,
        targetRoll,
        targetSuccessLevel: targetRank,
        targetOutcome,
        targetName: request.target.name,
        targetPow: request.target.pow,
        winner,
        casterPowImprovementEligible: winner === 'caster' && casterRank > targetRank,
      };
    }

    // 6. Głębsza Magia (Deeper Magic - Grand Grimoire s. 11)
    if (request.isInsane && spell.deeperMagic && request.casterMythos) {
      const mythosCheck = this.roller.rollD100();
      if (mythosCheck <= request.casterMythos) {
        deeperUnlockedNow = true;
      }
    }

    const resolution: CastingResolution = {
      success: opposedRollData ? opposedRollData.winner === 'caster' : true,
      spellId: spell.id,
      isFirstCast,
      hardPowThreshold: isFirstCast ? hardPowThreshold : undefined,
      firstCastRoll: firstCastRollData,
      catastrophe: catastropheData,
      opposedRoll: opposedRollData,
      deeperUnlockedNow,
      costPaid: {
        mp: mpPaid,
        hpFromMp,
        san: totalSanCost,
        powPermanent: totalPowCost,
      },
      statChanges: {
        mpDelta: -mpPaid,
        hpDelta: -hpFromMp,
        sanDelta: -totalSanCost,
        powDelta: -totalPowCost,
      },
      characterUpdates: {
        isFirstCastDone: true,
        deeperUnlocked: deeperUnlockedNow || undefined,
      },
      message: {
        pl: isFirstCast
          ? `Ukończono pierwsze rzucenie zaklęcia „${spell.namePl}” (sukces Trudnego POW). Od teraz zaklęcie rzucane jest automatycznie bez rzutu kością.${catastropheText}`
          : `Rzucono zaklęcie „${spell.namePl}”. Sukces automatyczny CoC 7e RAW (koszt: ${mpPaid} PM, ${hpFromMp > 0 ? `${hpFromMp} HP, ` : ''}${totalSanCost} SAN${totalPowCost > 0 ? `, ${totalPowCost} POW trwale` : ''}).`,
        en: isFirstCast
          ? `Completed first casting of "${spell.nameEn}" (Hard POW passed). From now on, casting succeeds automatically without a die roll.${catastropheText}`
          : `Cast "${spell.nameEn}". CoC 7e RAW automatic success (cost: ${mpPaid} MP, ${hpFromMp > 0 ? `${hpFromMp} HP, ` : ''}${totalSanCost} SAN${totalPowCost > 0 ? `, ${totalPowCost} POW permanent` : ''}).`,
      },
      gmNarrativeContext: `Zaklęcie ${spell.namePl} (${spell.diegeticNames.pl[0] ?? spell.namePl}) zadziałało. Rzucający: ${request.casterName}. Wydano ${mpPaid} PM${hpFromMp > 0 ? ` oraz ${hpFromMp} z własnej krwi (HP)` : ''}, utracono ${totalSanCost} SAN${totalPowCost > 0 ? `, trwale oddano ${totalPowCost} POW` : ''}.${opposedRollData ? ` Wynik starcia woli z ${request.target?.name}: ${opposedRollData.winner}.` : ''}${deeperUnlockedNow ? ' W stanie szaleństwa badacz pojął Głębszą Magię tego zaklęcia!' : ''}${catastropheData ? ` Katastrofa: ${catastropheData.effect.name.pl}.` : ''}`,
    };

    return resolution;
  }

  /**
   * Czary Spontaniczne (Spontaneous Mythos Magic - Księga Strażnika s. 179 & Seth Skorkowsky).
   * Improwizowana magia w skrajnym zagrożeniu na bazie czystego testu Mitów Cthulhu.
   * Nie uczy zaklęcia na stałe.
   */
  attemptSpontaneousMagic(
    request: SpontaneousMagicRequest
  ): SpontaneousMagicResolution {
    const roll = this.roller.rollD100();
    const outcome = evaluateSkillCheck(roll, request.casterMythos);
    const success = meetsDifficulty(outcome, request.difficulty);

    let mpPaid = 0;
    let hpFromMp = 0;

    if (request.casterMp >= request.estimatedMpCost) {
      mpPaid = request.estimatedMpCost;
    } else if (request.allowHpConversion) {
      mpPaid = request.casterMp;
      hpFromMp = request.estimatedMpCost - request.casterMp;
    } else {
      mpPaid = request.casterMp;
    }

    let opposedRollData: SpontaneousMagicResolution['opposedRoll'] | undefined;
    if (request.target) {
      const targetRoll = this.roller.rollD100();
      const casterRank = getSuccessRank(roll, request.casterMythos);
      const targetRank = getSuccessRank(targetRoll, request.target.pow);

      let winner: 'caster' | 'target' | 'tie' = 'caster';
      if (casterRank > targetRank) winner = 'caster';
      else if (casterRank < targetRank) winner = 'target';
      else winner = request.casterMythos >= request.target.pow ? 'caster' : 'target';

      opposedRollData = {
        casterRoll: roll,
        targetRoll,
        winner,
      };
    }

    return {
      success: opposedRollData ? success && opposedRollData.winner === 'caster' : success,
      mythosRoll: {
        roll,
        threshold: request.casterMythos,
        success,
      },
      opposedRoll: opposedRollData,
      costPaid: {
        mp: mpPaid,
        hpFromMp,
        san: request.estimatedSanCost,
      },
      statChanges: {
        mpDelta: -mpPaid,
        hpDelta: -hpFromMp,
        sanDelta: -request.estimatedSanCost,
      },
      message: {
        pl: success
          ? `Czary spontaniczne powiodły się (rzut na Mity Cthulhu: ${roll}/${request.casterMythos}). Efekt: ${request.desiredEffect}. Pamiętaj: czar nie został poznany na stałe.`
          : `Czary spontaniczne zawiodły (rzut na Mity Cthulhu: ${roll}/${request.casterMythos}). Energia rozproszyła się bez efektu.`,
        en: success
          ? `Spontaneous magic succeeded (Cthulhu Mythos roll: ${roll}/${request.casterMythos}). Effect: ${request.desiredEffect}. Note: spell is not permanently learned.`
          : `Spontaneous magic failed (Cthulhu Mythos roll: ${roll}/${request.casterMythos}). Energy dissipated without effect.`,
      },
      gmNarrativeContext: `Próba rzucenia magii spontanicznej przez ${request.casterName}. Intencja: "${request.desiredEffect}". Wynik testu Mitów: ${success ? 'SUKCES' : 'PORAŻKA'}.`,
    };
  }

  /**
   * Obrona przed wrogą magią (Opposed Magic Defense - CoC 7e RAW s. 99, 101, 267).
   * Rzut sporny MOC (POW) napastnika przeciwko MOC (POW) obrońcy.
   * Uwzględnia Zasadę granic możliwości (KS s. 99): cel o POW wyższej o 100+ uniemożliwia sukces.
   * Przy równym poziomie sukcesu wygrywa wyższa cecha bazowa.
   * Przy równym poziomie sukcesu i równej cesze, obrona powstrzymuje narzucenie woli (obrońca wygrywa remis).
   */
  resolveOpposedDefense(request: OpposedDefenseRequest): OpposedDefenseResolution {
    const attackerRoll = this.roller.rollD100();
    const defenderRoll = this.roller.rollD100();

    const attackerSuccessLevel = getSuccessRank(attackerRoll, request.attackerPow);
    const defenderSuccessLevel = getSuccessRank(defenderRoll, request.defenderPow);

    const attackerOutcome = evaluateSkillCheck(attackerRoll, request.attackerPow);
    const defenderOutcome = evaluateSkillCheck(defenderRoll, request.defenderPow);

    let winner: 'attacker' | 'defender' | 'tie' = 'defender';
    let ruleOfLimitsApplied = false;

    // Zasada granic możliwości CoC 7e RAW (str. 99): różnica 100+
    if (request.attackerPow >= request.defenderPow + 100) {
      winner = 'attacker';
      ruleOfLimitsApplied = true;
    } else if (request.defenderPow >= request.attackerPow + 100) {
      winner = 'defender';
      ruleOfLimitsApplied = true;
    } else if (defenderSuccessLevel > attackerSuccessLevel) {
      winner = 'defender';
    } else if (attackerSuccessLevel > defenderSuccessLevel) {
      winner = 'attacker';
    } else {
      // Remis w poziomach sukcesu -> wygrywa wyższa cecha bazowa
      if (request.defenderPow > request.attackerPow) {
        winner = 'defender';
      } else if (request.attackerPow > request.defenderPow) {
        winner = 'attacker';
      } else {
        // Remis poziomu sukcesu i cech bazowych -> w obronie przed narzuceniem woli wygrywa obrońca (odparcie czaru)
        winner = 'defender';
      }
    }

    const success = winner === 'defender';
    const defenderPowImprovementEligible = success && defenderSuccessLevel > attackerSuccessLevel;

    const spellTitle =
      request.spellName ??
      (request.spellId ? getSpellDefinition(request.spellId)?.namePl : undefined) ??
      'Wroga Magia';

    let messagePl = '';
    let messageEn = '';

    if (ruleOfLimitsApplied) {
      if (winner === 'attacker') {
        messagePl = `Zasada granic możliwości (CoC 7e RAW s. 99): Siła woli napastnika (${request.attackerPow}) przewyższa obrońcę (${request.defenderPow}) o ponad 100 punktów. Obrona przed czarem „${spellTitle}” jest niemożliwa!`;
        messageEn = `Rule of limits (CoC 7e RAW p. 99): Attacker's willpower (${request.attackerPow}) exceeds defender's (${request.defenderPow}) by 100+ points. Defense against "${spellTitle}" is impossible!`;
      } else {
        messagePl = `Zasada granic możliwości (CoC 7e RAW s. 99): Siła woli obrońcy (${request.defenderPow}) przewyższa napastnika (${request.attackerPow}) o ponad 100 punktów. Zaklęcie „${spellTitle}” nie wywiera wpływu!`;
        messageEn = `Rule of limits (CoC 7e RAW p. 99): Defender's willpower (${request.defenderPow}) exceeds attacker's (${request.attackerPow}) by 100+ points. Spell "${spellTitle}" has no effect!`;
      }
    } else if (success) {
      messagePl = `Obrona przed magią powiodła się! ${request.defenderName} odparł(a) zaklęcie „${spellTitle}” rzucone przez ${request.attackerName} (rzut obrońcy: ${defenderRoll}/${request.defenderPow} vs rzut napastnika: ${attackerRoll}/${request.attackerPow}).${defenderPowImprovementEligible ? ' Sukces w starciu z silniejszą wolą kwalifikuje MOC do rozwoju pod koniec sesji.' : ''}`;
      messageEn = `Magic defense succeeded! ${request.defenderName} repelled spell "${spellTitle}" cast by ${request.attackerName} (defender roll: ${defenderRoll}/${request.defenderPow} vs attacker roll: ${attackerRoll}/${request.attackerPow}).${defenderPowImprovementEligible ? ' Overcoming stronger will qualifies POW for improvement check at session end.' : ''}`;
    } else {
      messagePl = `Obrona przed magią nie powiodła się! ${request.attackerName} przełamał(a) wolę obrońcy zaklęciem „${spellTitle}” (rzut napastnika: ${attackerRoll}/${request.attackerPow} vs rzut obrońcy: ${defenderRoll}/${request.defenderPow}).`;
      messageEn = `Magic defense failed! ${request.attackerName} overcame defender's will with spell "${spellTitle}" (attacker roll: ${attackerRoll}/${request.attackerPow} vs defender roll: ${defenderRoll}/${request.defenderPow}).`;
    }

    return {
      success,
      attackerName: request.attackerName,
      attackerPow: request.attackerPow,
      defenderName: request.defenderName,
      defenderPow: request.defenderPow,
      spellId: request.spellId,
      spellName: spellTitle,
      attackerRoll,
      attackerSuccessLevel,
      attackerOutcome,
      defenderRoll,
      defenderSuccessLevel,
      defenderOutcome,
      winner,
      defenderPowImprovementEligible,
      ruleOfLimitsApplied,
      statChanges: {
        hpDelta: 0,
        sanDelta: 0,
        mpDelta: 0,
      },
      message: {
        pl: messagePl,
        en: messageEn,
      },
      gmNarrativeContext: `Starcie woli (Opposed POW): ${request.defenderName} broni się przed zaklęciem ${spellTitle} rzuconym przez ${request.attackerName}. Rzut obrońcy: ${defenderRoll} (sukces ${defenderSuccessLevel}), rzut napastnika: ${attackerRoll} (sukces ${attackerSuccessLevel}). Zwycięzca: ${winner === 'defender' ? request.defenderName : request.attackerName}.${defenderPowImprovementEligible ? ' Badacz uzyskał prawo do testu rozwoju Mocy.' : ''}`,
    };
  }
}

export const magicEngine = new MagicEngine();
