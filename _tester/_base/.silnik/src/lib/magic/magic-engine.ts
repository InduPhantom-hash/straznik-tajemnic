import type {
  CastingRequest,
  CastingResolution,
  SpontaneousMagicRequest,
  SpontaneousMagicResolution,
  SpellDefinition,
} from './types';
import { getSpellDefinition } from './catalog';
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

      if (!request.isPush) {
        // Zwykła pierwsza próba
        if (passed) {
          success = true;
          firstCastRollData = {
            roll,
            threshold: hardPowThreshold,
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
    let catastropheText = '';

    if (firstCastRollData?.pushedFailedCatastrophe) {
      // Katastrofa forsowania: dodatkowy mnożnik lub koszt
      const catastropheMult = this.roller.rollFormula('1k4');
      totalSanCost = rawSanCost + catastropheMult;
      catastropheText = ` [KATASTROFA FORSOWANIA: Zaklęcie wyrwało się z rąk badacza! Dodatkowa utrata ${catastropheMult} SAN i zwrócenie uwagi bytu Mitów!]`;
    }

    // 5. Test sporny POW (Opposed POW) jeśli zaklęcie tego wymaga
    let opposedRollData: CastingResolution['opposedRoll'] | undefined;
    if (spell.opposedRoll === 'pow' && request.target) {
      const casterRoll = this.roller.rollD100();
      const targetRoll = this.roller.rollD100();

      const casterRank = getSuccessRank(casterRoll, request.casterPow);
      const targetRank = getSuccessRank(targetRoll, request.target.pow);

      let winner: 'caster' | 'target' | 'tie' = 'caster';
      if (casterRank > targetRank) {
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
        targetRoll,
        targetSuccessLevel: targetRank,
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
      opposedRoll: opposedRollData,
      deeperUnlockedNow,
      costPaid: {
        mp: mpPaid,
        hpFromMp,
        san: totalSanCost,
        powPermanent: rawPowCost,
      },
      statChanges: {
        mpDelta: -mpPaid,
        hpDelta: -hpFromMp,
        sanDelta: -totalSanCost,
        powDelta: -rawPowCost,
      },
      characterUpdates: {
        isFirstCastDone: true,
        deeperUnlocked: deeperUnlockedNow || undefined,
      },
      message: {
        pl: isFirstCast
          ? `Ukończono pierwsze rzucenie zaklęcia „${spell.namePl}” (sukces Trudnego POW). Od teraz zaklęcie rzucane jest automatycznie bez rzutu kością.${catastropheText}`
          : `Rzucono zaklęcie „${spell.namePl}”. Sukces automatyczny CoC 7e RAW (koszt: ${mpPaid} PM, ${hpFromMp > 0 ? `${hpFromMp} HP, ` : ''}${totalSanCost} SAN${rawPowCost > 0 ? `, ${rawPowCost} POW trwale` : ''}).`,
        en: isFirstCast
          ? `Completed first casting of "${spell.nameEn}" (Hard POW passed). From now on, casting succeeds automatically without a die roll.${catastropheText}`
          : `Cast "${spell.nameEn}". CoC 7e RAW automatic success (cost: ${mpPaid} MP, ${hpFromMp > 0 ? `${hpFromMp} HP, ` : ''}${totalSanCost} SAN${rawPowCost > 0 ? `, ${rawPowCost} POW permanent` : ''}).`,
      },
      gmNarrativeContext: `Zaklęcie ${spell.namePl} (${spell.diegeticNames.pl[0] ?? spell.namePl}) zadziałało. Rzucający: ${request.casterName}. Wydano ${mpPaid} PM${hpFromMp > 0 ? ` oraz ${hpFromMp} z własnej krwi (HP)` : ''}, utracono ${totalSanCost} SAN${rawPowCost > 0 ? `, trwale oddano ${rawPowCost} POW` : ''}.${opposedRollData ? ` Wynik starcia woli z ${request.target?.name}: ${opposedRollData.winner}.` : ''}${deeperUnlockedNow ? ' W stanie szaleństwa badacz pojął Głębszą Magię tego zaklęcia!' : ''}`,
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
}
