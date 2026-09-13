import type {
  InitialReadingRequest,
  InitialReadingResolution,
  FullStudyRequest,
  FullStudyResolution,
  ReferenceCheckRequest,
  ReferenceCheckResolution,
  BeliefConversionResolution,
  LearnSpellFromTomeRequest,
  LearnSpellFromTomeResolution,
  TomeDefinition,
} from './types';
import { getTomeDefinition, getSpellDefinition } from './catalog';
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
          outcome,
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
        outcome,
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
   * Pełne studium tomiska (Full Study - Rozdział 9 i 11 CoC 7e RAW).
   * - Trwa tygodnie (każda kolejna lektura trwa 2x dłużej: 14 -> 28 -> 56 tyg).
   * - W czystym RAW CoC 7e (str. 193): czytanie księgi zawsze wiąże się ze stratą Poczytalności;
   *   brak rzutu obronnego na zmniejszenie straty o połowę. Pełny wylosowany koszt SAN jest pobierany.
   *   (Opcjonalny house-rule Setha Skorkowsky'ego uwzględniany tylko przy allowSanSaveHouseRule = true).
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

    // Rzut na SAN (obiekt sanRoll zachowany dla kompatybilności UI i ewentualnego house rule)
    const sanRoll = this.roller.rollD100();
    const sanSuccess = sanRoll <= request.investigatorSan;
    const sanOutcome = evaluateSkillCheck(sanRoll, request.investigatorSan);

    const fullSanCost = this.roller.rollFormula(tome.fullStudy.sanCost);
    // W czystym CoC 7e RAW brak rzutu na zmniejszenie straty o połowę (Księga Strażnika str. 193)
    const actualSanLoss =
      request.allowSanSaveHouseRule && sanSuccess
        ? Math.max(1, Math.floor(fullSanCost / 2))
        : fullSanCost;

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
        outcome: sanOutcome,
        success: sanSuccess,
      },
      sanLoss,
      deferredSanLoss,
      cmfGained,
      mythosCappedAtMr,
      message: {
        pl: `Ukończono pełne studium tomu „${tome.titlePl}” (${weeksRequired} tygodni). Koszt Poczytalności CoC 7e RAW: -${sanLoss} SAN (odłożona: ${deferredSanLoss}). Zysk Mitów: +${cmfGained} CMF${mythosCappedAtMr ? ` (osiągnięto limit MR ${tome.fullStudy.mr})` : ''}.`,
        en: `Completed full study of "${tome.titleEn}" (${weeksRequired} weeks). CoC 7e RAW Sanity cost: -${sanLoss} SAN (deferred: ${deferredSanLoss}). Mythos gained: +${cmfGained} CMF${mythosCappedAtMr ? ` (capped at MR ${tome.fullStudy.mr})` : ''}.`,
      },
    };
  }

  /**
   * Nauka zaklęcia z tomu (Learn Spell from Tome - CoC 7e RAW str. 196).
   * - Wymaga 2K6 tygodni poświęconego czasu.
   * - Wymaga udanego Trudnego testu Inteligencji (INT / 2).
   * - Jeśli test się nie powiedzie, gracz może forsować rzut.
   * - Porażka forsowania oznacza, że badacz nie może uczyć się tego zaklęcia z tego tomu,
   *   dopóki jego Inteligencja nie wzrośnie (str. 196).
   */
  learnSpellFromTome(
    request: LearnSpellFromTomeRequest,
    tomeDef?: TomeDefinition
  ): LearnSpellFromTomeResolution {
    const tome = tomeDef ?? getTomeDefinition(request.tomeId);
    const spell = getSpellDefinition(request.spellId);

    const tomeTitlePl = tome?.titlePl ?? request.tomeId;
    const tomeTitleEn = tome?.titleEn ?? request.tomeId;
    const spellNamePl = spell?.namePl ?? request.spellId;
    const spellNameEn = spell?.nameEn ?? request.spellId;

    const weeksSpent = this.roller.rollFormula('2k6');
    const hardIntThreshold = Math.floor(request.investigatorInt / 2);
    const roll = this.roller.rollD100();
    const outcome = evaluateSkillCheck(roll, hardIntThreshold);
    const passed = roll <= hardIntThreshold;

    const isPush = Boolean(request.isPush);
    const success = passed;

    let messagePl = '';
    let messageEn = '';

    if (success) {
      messagePl = `${request.investigatorName} pomyślnie opanował(a) zaklęcie „${spellNamePl}” z tomu „${tomeTitlePl}” po ${weeksSpent} tygodniach nauki (Trudny test INT: ${roll} vs ${hardIntThreshold}).`;
      messageEn = `${request.investigatorName} successfully learned spell "${spellNameEn}" from tome "${tomeTitleEn}" after ${weeksSpent} weeks of study (Hard INT check: ${roll} vs ${hardIntThreshold}).`;
    } else if (isPush) {
      messagePl = `Forsowanie nauki zaklęcia „${spellNamePl}” z tomu „${tomeTitlePl}” zakończyło się porażką (rzut: ${roll} vs Trudny INT ${hardIntThreshold}). Zgodnie z RAW CoC 7e badacz nie może ponownie uczyć się tego zaklęcia z tego tomu, dopóki jego INT nie wzrośnie.`;
      messageEn = `Pushing study of spell "${spellNameEn}" from tome "${tomeTitleEn}" failed (roll: ${roll} vs Hard INT ${hardIntThreshold}). Per CoC 7e RAW the investigator cannot attempt to learn this spell from this tome again until their INT increases.`;
    } else {
      messagePl = `Nauka zaklęcia „${spellNamePl}” z tomu „${tomeTitlePl}” nie powiodła się po ${weeksSpent} tygodniach nauki (rzut: ${roll} vs Trudny INT ${hardIntThreshold}). Możesz forsować test lub ponowić naukę.`;
      messageEn = `Learning spell "${spellNameEn}" from tome "${tomeTitleEn}" failed after ${weeksSpent} weeks of study (roll: ${roll} vs Hard INT ${hardIntThreshold}). You may push the roll or study again.`;
    }

    return {
      success,
      weeksSpent,
      intRoll: {
        roll,
        threshold: hardIntThreshold,
        outcome,
        success,
        isPushed: isPush,
      },
      spellLearned: success,
      message: {
        pl: messagePl,
        en: messageEn,
      },
      gmNarrativeContext: `Próba nauki zaklęcia ${spellNamePl} z tomu ${tomeTitlePl} przez ${request.investigatorName}. Czas: ${weeksSpent} tyg. Rzut INT: ${roll}/${hardIntThreshold} (${success ? 'SUKCES' : 'PORAŻKA'}${isPush ? ' - FORSOWANIE' : ''}).`,
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
    const outcome = evaluateSkillCheck(roll, tome.fullStudy.mr);

    return {
      hoursSpent,
      roll,
      mythosRating: tome.fullStudy.mr,
      outcome,
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

export const tomeEngine = new TomeEngine();
