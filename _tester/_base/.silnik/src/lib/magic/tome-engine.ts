import type {
  InitialReadingRequest,
  InitialReadingResolution,
  FullStudyRequest,
  FullStudyResolution,
  ReferenceCheckRequest,
  ReferenceCheckResolution,
  BeliefConversionResolution,
  TomeDefinition,
} from './types';
import { getTomeDefinition } from './catalog';
import { IMagicDiceRoller, StandardMagicDiceRoller } from './dice-roller';
import { evaluateSkillCheck, meetsDifficulty } from '@/lib/dice-utils';

export class TomeEngine {
  private roller: IMagicDiceRoller;

  constructor(roller?: IMagicDiceRoller) {
    this.roller = roller ?? new StandardMagicDiceRoller();
  }

  /**
   * Wstępny przegląd tomiska (Initial Reading / Skimming - Rozdział 11 CoC 7e & Seth Skorkowsky).
   * - Trwa godziny (zazwyczaj tyle godzin, ile pełne czytanie tygodni).
   * - Wymaga rzutu na język tomu na określonym poziomie trudności.
   * - Sukces daje natychmiastowy przyrost CMI oraz stratę SAN (automatyczną dla wierzącego,
   *   odłożoną dla sceptyka wg Reguły Wiary).
   */
  resolveInitialReading(
    request: InitialReadingRequest,
    tomeDef?: TomeDefinition
  ): InitialReadingResolution {
    const tome = tomeDef ?? getTomeDefinition(request.tomeId);
    if (!tome) {
      throw new Error(`Nieznany tom Mitów: ${request.tomeId}`);
    }

    const roll = this.roller.rollD100();
    const outcome = evaluateSkillCheck(roll, request.investigatorLanguageSkill);
    const success = meetsDifficulty(outcome, request.languageDifficulty);

    if (!success) {
      return {
        success: false,
        languageRoll: {
          roll,
          threshold: request.investigatorLanguageSkill,
          success: false,
        },
        hoursSpent: tome.initialReading.hours,
        cmiGained: 0,
        sanLoss: 0,
        deferredSanLoss: 0,
        spellsDiscovered: [],
        message: {
          pl: `Nie udało się zrozumieć archaicznego języka tomu „${tome.titlePl}” (rzut: ${roll} vs ${request.investigatorLanguageSkill}). Badacz nie odczytał treści Mitów.`,
          en: `Failed to decipher archaic language of "${tome.titleEn}" (roll: ${roll} vs ${request.investigatorLanguageSkill}). Investigator gleaned no Mythos knowledge.`,
        },
      };
    }

    const rolledSanCost = this.roller.rollFormula(tome.initialReading.sanCost);
    const isSkeptic = request.belief === 'skeptic';

    const sanLoss = isSkeptic ? 0 : rolledSanCost;
    const deferredSanLoss = isSkeptic ? rolledSanCost : 0;

    return {
      success: true,
      languageRoll: {
        roll,
        threshold: request.investigatorLanguageSkill,
        success: true,
      },
      hoursSpent: tome.initialReading.hours,
      cmiGained: tome.initialReading.cmi,
      sanLoss,
      deferredSanLoss,
      spellsDiscovered: [...tome.spells],
      message: {
        pl: isSkeptic
          ? `Ukończono wstępny przegląd tomu „${tome.titlePl}” (${tome.initialReading.hours}h). Przyrost Mitów: +${tome.initialReading.cmi} CMI. Jako sceptyk badacz nie traci teraz SAN (odłożono ${deferredSanLoss} SAN długu psychicznego). Odkryto zaklęcia do nauki: ${tome.spells.length}.`
          : `Ukończono wstępny przegląd tomu „${tome.titlePl}” (${tome.initialReading.hours}h). Przyrost Mitów: +${tome.initialReading.cmi} CMI, automatyczna utrata Poczytalności: -${sanLoss} SAN (brak rzutu obronnego RAW). Odkryto zaklęcia: ${tome.spells.length}.`,
        en: isSkeptic
          ? `Completed initial reading of "${tome.titleEn}" (${tome.initialReading.hours}h). Mythos gain: +${tome.initialReading.cmi} CMI. As a skeptic, no current SAN is lost (deferred ${deferredSanLoss} SAN). Spells uncovered: ${tome.spells.length}.`
          : `Completed initial reading of "${tome.titleEn}" (${tome.initialReading.hours}h). Mythos gain: +${tome.initialReading.cmi} CMI, automatic Sanity loss: -${sanLoss} SAN (no RAW save). Spells uncovered: ${tome.spells.length}.`,
      },
    };
  }

  /**
   * Pełne studium tomiska (Full Study).
   * - Trwa tygodnie (każda kolejna lektura trwa 2x dłużej: 14 -> 28 -> 56 tyg).
   * - Rzut obronny na SAN: sukces zapobiega lub minimalizuje stratę SAN.
   * - CMF przyznawane aż do limitu Mythos Rating (MR).
   */
  resolveFullStudy(
    request: FullStudyRequest,
    tomeDef?: TomeDefinition
  ): FullStudyResolution {
    const tome = tomeDef ?? getTomeDefinition(request.tomeId);
    if (!tome) {
      throw new Error(`Nieznany tom Mitów: ${request.tomeId}`);
    }

    const weeksRequired = tome.fullStudy.weeks * Math.pow(2, request.studyCount);

    // Rzut obronny na SAN przy pełnym studium (Księga Strażnika s. 227 & Seth Skorkowsky)
    const sanRoll = this.roller.rollD100();
    const sanSuccess = sanRoll <= request.investigatorSan;

    const fullSanCost = this.roller.rollFormula(tome.fullStudy.sanCost);
    // Sukces rzutu na SAN zmniejsza stratę o połowę (min. 1) lub do minimum
    const actualSanLoss = sanSuccess ? Math.max(1, Math.floor(fullSanCost / 2)) : fullSanCost;

    const isSkeptic = request.belief === 'skeptic';
    const sanLoss = isSkeptic ? 0 : actualSanLoss;
    const deferredSanLoss = isSkeptic ? actualSanLoss : 0;

    // Kalkulacja CMF z limitem MR
    let cmfGained = 0;
    let mythosCappedAtMr = false;

    if (request.investigatorMythos < tome.fullStudy.mr) {
      const potential = tome.fullStudy.cmf;
      if (request.investigatorMythos + potential > tome.fullStudy.mr) {
        cmfGained = tome.fullStudy.mr - request.investigatorMythos;
        mythosCappedAtMr = true;
      } else {
        cmfGained = potential;
      }
    } else {
      mythosCappedAtMr = true;
    }

    return {
      weeksRequired,
      sanRoll: {
        roll: sanRoll,
        sanTarget: request.investigatorSan,
        success: sanSuccess,
      },
      sanLoss,
      deferredSanLoss,
      cmfGained,
      mythosCappedAtMr,
      message: {
        pl: `Ukończono pełne studium tomu „${tome.titlePl}” (${weeksRequired} tygodni). Rzut obronny SAN: ${sanRoll} vs ${request.investigatorSan} (${sanSuccess ? 'sukces' : 'porażka'}). Strata SAN: ${sanLoss} (odłożona: ${deferredSanLoss}). Zysk Mitów: +${cmfGained} CMF${mythosCappedAtMr ? ` (osiągnięto limit MR ${tome.fullStudy.mr})` : ''}.`,
        en: `Completed full study of "${tome.titleEn}" (${weeksRequired} weeks). SAN save: ${sanRoll} vs ${request.investigatorSan} (${sanSuccess ? 'passed' : 'failed'}). SAN loss: ${sanLoss} (deferred: ${deferredSanLoss}). Mythos gained: +${cmfGained} CMF${mythosCappedAtMr ? ` (capped at MR ${tome.fullStudy.mr})` : ''}.`,
      },
    };
  }

  /**
   * Sprawdzenie tomu jako źródła referencyjnego w trakcie śledztwa (Reference Check).
   * - Trwa 1k4 godzin.
   * - Test d100 przeciwko Mythos Rating (MR) tomu.
   */
  resolveReferenceCheck(
    request: ReferenceCheckRequest,
    tomeDef?: TomeDefinition
  ): ReferenceCheckResolution {
    const tome = tomeDef ?? getTomeDefinition(request.tomeId);
    if (!tome) {
      throw new Error(`Nieznany tom Mitów: ${request.tomeId}`);
    }

    const hoursSpent = this.roller.rollFormula('1k4');
    const roll = this.roller.rollD100();
    const success = roll <= tome.fullStudy.mr;

    return {
      hoursSpent,
      roll,
      mythosRating: tome.fullStudy.mr,
      success,
      message: {
        pl: success
          ? `Po ${hoursSpent} godzinach poszukiwań w „${tome.titlePl}” znaleziono kluczową wskazówkę (rzut: ${roll} vs MR ${tome.fullStudy.mr}).`
          : `Po ${hoursSpent} godzinach poszukiwań w „${tome.titlePl}” nie znaleziono żadnych użytecznych odniesień (rzut: ${roll} vs MR ${tome.fullStudy.mr}).`,
        en: success
          ? `After ${hoursSpent} hours researching "${tome.titleEn}", relevant clues were found (roll: ${roll} vs MR ${tome.fullStudy.mr}).`
          : `After ${hoursSpent} hours researching "${tome.titleEn}", no pertinent information was located (roll: ${roll} vs MR ${tome.fullStudy.mr}).`,
      },
    };
  }

  /**
   * Konwersja Sceptyka w Wierzącego (Reguła Wiary - Seth Skorkowsky & RAW).
   * Gdy badacz zderza się z namacalnym bytem Mitów i traci choć 1 SAN, albo świadomie
   * uznaje prawdę, cała odłożona strata SAN spada na niego natychmiast.
   */
  convertBeliefToBeliever(
    investigatorName: string,
    deferredSanLoss: number,
    currentMythos: number
  ): BeliefConversionResolution {
    // Strata wynosi skumulowany dług lub aktualny poziom Mitów Cthulhu
    const sanLoss = Math.max(deferredSanLoss, currentMythos);
    const intCheckRequired = sanLoss >= 5;

    return {
      oldBelief: 'skeptic',
      newBelief: 'believer',
      sanLossApplied: sanLoss,
      intCheckRequired,
      message: {
        pl: `${investigatorName} przestał być sceptykiem! Zasłona racjonalizacji opadła: to, co uważał za bajki, okazało się namacalną grozą. Skumulowana strata SAN: -${sanLoss} uderza natychmiast!${intCheckRequired ? ' Wymagany natychmiastowy test Inteligencji (INT) z powodu utraty ≥5 SAN!' : ''}`,
        en: `${investigatorName} is no longer a skeptic! The veil of rationalization has shattered. Cumulative Sanity loss: -${sanLoss} hits instantly!${intCheckRequired ? ' Immediate Intelligence (INT) check required due to loss ≥5 SAN!' : ''}`,
      },
      gmNarrativeContext: `Przełom psychiczny u ${investigatorName}. Wszystkie potworności przeczytane w tomach Mitów okazały się prawdą. Następuje uderzenie skumulowanego szoku (-${sanLoss} SAN).`,
    };
  }
}
