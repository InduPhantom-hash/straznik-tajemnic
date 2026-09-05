/**
 * Silnik Odzyskiwania Poczytalności i Terapii Psychiatrycznej (Call of Cthulhu 7e RAW)
 *
 * Implementuje oficjalne reguły CoC 7e (Księga Strażnika, Rozdział 8, s. 165-186):
 * 1. Kotwice życiowe (Ważne Osoby / Significant People):
 *    - Oparcie w bliskich podczas przerw w śledztwie (downtime).
 *    - Rzut k100 przeciwko aktualnemu SAN. Kluczowa kotwica daje Kość Premii.
 *    - Sukces: odzyskanie 1k6 SAN (do pułapu 99 - Mity Cthulhu).
 *    - Porażka: zrażenie bliskiej osoby, -1 SAN, nadszarpnięcie (damaged) lub zerwanie (lost) więzi.
 * 2. Samopomoc (Self-Help):
 *    - Comiesięczna próba opanowania nabytej fobii lub manii (rzut k100 <= SAN).
 * 3. Hospitalizacja psychiatryczna i Psychoanaliza:
 *    - Placówka państwowa (darmowa, Psychoanaliza 40%) vs prywatne sanatorium (CR >= 50 lub $150, Psychoanaliza 65%).
 *    - Comiesięczny test lekarza: sukces (+1k10 SAN, leczenie Indefinite Insanity), porażka (0 SAN), Fumble (-1k10 SAN, trauma).
 */

import type { Character } from '@/lib/types';
import { getSkillValue } from '@/lib/types';
import { evaluateSkillCheck, RollOutcome } from '@/lib/dice-utils';
import { getCreditRating } from '@/lib/economy/credit-rating';

export type AnchorRecoveryType = 'visit' | 'correspondence' | 'keepsake';
export type AnchorStatus = 'intact' | 'damaged' | 'lost';

export interface CharacterAnchor {
  id: string;
  name: string;
  relationship: string;
  status: AnchorStatus;
  isKeyConnection: boolean;
  description?: string;
  avatarUrl?: string;
}

export interface AnchorRecoveryResult {
  success: boolean;
  sanRoll: number;
  sanTarget: number;
  sanGained: number;
  sanLost: number;
  isBonusDieUsed: boolean;
  tensRoll?: number;
  bonusTensRoll?: number;
  unitsRoll?: number;
  anchorId: string;
  anchorName: string;
  previousStatus: AnchorStatus;
  newStatus: AnchorStatus;
  narrativeSummary: {
    pl: string;
    en: string;
  };
  nextCharacter: Character;
}

export interface SelfHelpResult {
  success: boolean;
  sanRoll: number;
  sanTarget: number;
  targetTrait: {
    type: 'phobia' | 'mania';
    name: string;
  };
  cured: boolean;
  narrativeSummary: {
    pl: string;
    en: string;
  };
  nextCharacter: Character;
}

export type HospitalizationFacility = 'public_asylum' | 'private_sanitarium';

export interface HospitalCareResult {
  facility: HospitalizationFacility;
  doctorSkill: number;
  doctorRoll: number;
  outcome: RollOutcome;
  sanChange: number;
  curedTrait?: { type: 'phobia' | 'mania'; name: string };
  curedIndefiniteInsanity: boolean;
  costMonthly: number;
  narrativeSummary: {
    pl: string;
    en: string;
  };
  nextCharacter: Character;
}

/**
 * Oblicza maksymalny pułap Poczytalności dla postaci: 99 - Mity Cthulhu (CoC 7e RAW s. 165).
 */
export function getMaxSanity(character: Character): number {
  const mythos =
    getSkillValue(character.skills?.['Mity Cthulhu']) ||
    getSkillValue(character.skills?.['Cthulhu Mythos']) ||
    0;
  return Math.max(0, 99 - mythos);
}

/**
 * Wyciąga z postaci listę dostępnych kotwic znormalizowaną do formatu CharacterAnchor.
 */
export function getCharacterAnchors(character: Character): CharacterAnchor[] {
  const anchors: CharacterAnchor[] = [];

  if (character.importantPeople && character.importantPeople.length > 0) {
    const isSinglePerson = character.importantPeople.length === 1;

    character.importantPeople.forEach((p, idx) => {
      let status: AnchorStatus = 'intact';
      if (p.lost) {
        status = 'lost';
      } else if (p.damaged) {
        status = 'damaged';
      }

      const isKey =
        p.isKeyConnection === true ||
        isSinglePerson ||
        (Boolean(character.significantPerson) &&
          (p.name.toLowerCase().includes(character.significantPerson!.toLowerCase()) ||
            character.significantPerson!.toLowerCase().includes(p.name.toLowerCase())));

      anchors.push({
        id: p.id || `person_${idx}`,
        name: p.name,
        relationship: p.relationship || 'Bliski',
        status,
        isKeyConnection: isKey,
        description: p.description,
        avatarUrl: p.avatarUrl,
      });
    });
  } else if (character.significantPerson && character.significantPerson.trim().length > 0) {
    anchors.push({
      id: 'significant_person_fallback',
      name: character.significantPerson,
      relationship: 'Kluczowa osoba',
      status: 'intact',
      isKeyConnection: true,
      description: character.backstory,
    });
  }

  return anchors;
}

/**
 * Rzuca kośćmi k100 z opcjonalną kością premii (Bonus Die) według reguł CoC 7e RAW.
 */
function rollD100WithBonus(hasBonus: boolean, options?: { forceRoll?: number; forceBonusRoll?: number }) {
  if (options?.forceRoll !== undefined) {
    return {
      finalRoll: options.forceRoll,
      tens: Math.floor(options.forceRoll / 10) * 10,
      bonusTens: undefined,
      units: options.forceRoll % 10,
    };
  }

  const units = Math.floor(Math.random() * 10);
  const tens1 = Math.floor(Math.random() * 10) * 10;

  if (!hasBonus) {
    const roll = tens1 + units === 0 ? 100 : tens1 + units;
    return { finalRoll: roll, tens: tens1, units };
  }

  const tens2 =
    options?.forceBonusRoll !== undefined
      ? options.forceBonusRoll
      : Math.floor(Math.random() * 10) * 10;

  const roll1 = tens1 + units === 0 ? 100 : tens1 + units;
  const roll2 = tens2 + units === 0 ? 100 : tens2 + units;

  const finalRoll = Math.min(roll1, roll2);
  return {
    finalRoll,
    tens: tens1,
    bonusTens: tens2,
    units,
  };
}

/**
 * Odzyskiwanie Poczytalności przez szukanie oparcia w kotwicy życiowej (CoC 7e RAW s. 185-186).
 */
export function recoverSanityFromAnchor(
  character: Character,
  anchorId: string,
  form: AnchorRecoveryType,
  options?: {
    forceRoll?: number;
    forceGain?: number;
    forceBonusTens?: number;
    ignoreCooldown?: boolean;
  }
): AnchorRecoveryResult {
  const anchors = getCharacterAnchors(character);
  const anchor = anchors.find((a) => a.id === anchorId) || anchors[0];

  if (!anchor) {
    throw new Error(`Nie znaleziono kotwicy o id: ${anchorId}`);
  }

  if (anchor.status === 'lost') {
    throw new Error(`Kotwica "${anchor.name}" została bezpowrotnie zerwana i nie może dać ukojenia.`);
  }

  if (character.usedDowntimeRecovery && !options?.ignoreCooldown) {
    throw new Error('Wykorzystano już próbę odzyskania Poczytalności w tej przerwie śledczej.');
  }

  const maxSan = getMaxSanity(character);
  const currentSan = character.san || 0;
  const isKey = anchor.isKeyConnection && anchor.status === 'intact';

  const { finalRoll, tens, bonusTens, units } = rollD100WithBonus(isKey, {
    forceRoll: options?.forceRoll,
    forceBonusRoll: options?.forceBonusTens,
  });

  const success = finalRoll <= currentSan;
  let sanGained = 0;
  let sanLost = 0;
  let newStatus: AnchorStatus = anchor.status;

  const next = { ...character };
  next.importantPeople = next.importantPeople ? [...next.importantPeople] : [];

  if (success) {
    sanGained = options?.forceGain ?? (Math.floor(Math.random() * 6) + 1);
    const updatedSan = Math.min(maxSan, currentSan + sanGained);
    next.san = updatedSan;
    newStatus = anchor.status; // status nienaruszony
  } else {
    sanLost = 1;
    next.san = Math.max(0, currentSan - 1);
    if (anchor.status === 'intact') {
      newStatus = 'damaged';
    } else if (anchor.status === 'damaged') {
      newStatus = 'lost';
    }
  }

  // Zaktualizuj stan ważnej osoby w obiekcie Character
  const personIndex = next.importantPeople.findIndex(
    (p, idx) => p.id === anchor.id || `person_${idx}` === anchor.id || p.name === anchor.name
  );

  if (personIndex !== -1) {
    next.importantPeople[personIndex] = {
      ...next.importantPeople[personIndex],
      damaged: newStatus === 'damaged',
      lost: newStatus === 'lost',
    };
  }

  next.usedDowntimeRecovery = true;

  // Generowanie narracji PL / EN
  const narrativeSummary = createAnchorNarrative(anchor.name, form, success, sanGained, newStatus);

  return {
    success,
    sanRoll: finalRoll,
    sanTarget: currentSan,
    sanGained,
    sanLost,
    isBonusDieUsed: isKey,
    tensRoll: tens,
    bonusTensRoll: bonusTens,
    unitsRoll: units,
    anchorId: anchor.id,
    anchorName: anchor.name,
    previousStatus: anchor.status,
    newStatus,
    narrativeSummary,
    nextCharacter: next,
  };
}

function createAnchorNarrative(
  name: string,
  form: AnchorRecoveryType,
  success: boolean,
  gain: number,
  newStatus: AnchorStatus
): { pl: string; en: string } {
  if (success) {
    switch (form) {
      case 'correspondence':
        return {
          pl: `Wymiana serdecznych listów z ${name} koi zszargane nerwy. Ciepłe słowa z daleka przypominają o normalnym życiu (+${gain} SAN).`,
          en: `A heartfelt exchange of letters with ${name} soothes frayed nerves, recalling normal life far from horror (+${gain} SAN).`,
        };
      case 'keepsake':
        return {
          pl: `Chwila samotnej kontemplacji nad pamiątką związaną z ${name} przywraca wewnętrzną równowagę i wolę walki (+${gain} SAN).`,
          en: `Quiet contemplation of a keepsake tied to ${name} restores inner equilibrium and determination (+${gain} SAN).`,
        };
      case 'visit':
      default:
        return {
          pl: `Wspólny czas spędzony w bezpiecznym zaciszu z ${name} pozwala odetchnąć od koszmaru i odzyskać jasność myśli (+${gain} SAN).`,
          en: `Time spent in warmth and safety with ${name} provides respite from the nightmare and restores mental clarity (+${gain} SAN).`,
        };
    }
  }

  // Porażka
  const statusNotePl =
    newStatus === 'lost'
      ? 'Więź została bezpowrotnie zerwana!'
      : 'Relacja została boleśnie nadszarpnięta.';
  const statusNoteEn =
    newStatus === 'lost'
      ? 'The connection has been irrevocably shattered!'
      : 'The relationship has been painfully strained.';

  switch (form) {
    case 'correspondence':
      return {
        pl: `Twój chaotyczny list pełen paranoicznych podejrzeń budzi grozę i dystans u ${name}. Tracisz 1 SAN. ${statusNotePl}`,
        en: `Your erratic, paranoia-laden letter terrifies ${name}, driving a wedge between you. You lose 1 SAN. ${statusNoteEn}`,
      };
    case 'keepsake':
      return {
        pl: `W przypływie bezsilności i obłędu pamiątka po ${name} przynosi jedynie poczucie winy i udręki. Tracisz 1 SAN. ${statusNotePl}`,
        en: `In a surge of helplessness and dread, the keepsake of ${name} brings only agony and guilt. You lose 1 SAN. ${statusNoteEn}`,
      };
    case 'visit':
    default:
      return {
        pl: `Nagły wybuch histerii lub chłód zraża ${name} – twoja trauma staje się dla bliskiej osoby zbyt wielkim ciężarem. Tracisz 1 SAN. ${statusNotePl}`,
        en: `A sudden bout of hysterics or cold withdrawal estranges ${name} – your trauma proves too frightening a burden. You lose 1 SAN. ${statusNoteEn}`,
      };
  }
}

/**
 * Samopomoc – próba złagodzenia aktywnej fobii lub manii w przerwie między przygodami (CoC 7e RAW).
 */
export function attemptSelfHelp(
  character: Character,
  targetTrait: { type: 'phobia' | 'mania'; name: string },
  options?: { forceRoll?: number }
): SelfHelpResult {
  const currentSan = character.san || 0;
  const roll = options?.forceRoll ?? Math.floor(Math.random() * 100) + 1;
  const success = roll <= currentSan;

  const next = { ...character };
  if (next.characterTraits) {
    next.characterTraits = {
      ...next.characterTraits,
      phobias: [...(next.characterTraits.phobias || [])],
      manias: [...(next.characterTraits.manias || [])],
    };

    if (success) {
      if (targetTrait.type === 'phobia') {
        next.characterTraits.phobias = next.characterTraits.phobias.filter(
          (p) => p.toLowerCase() !== targetTrait.name.toLowerCase()
        );
      } else {
        next.characterTraits.manias = next.characterTraits.manias.filter(
          (m) => m.toLowerCase() !== targetTrait.name.toLowerCase()
        );
      }
    }
  }

  const narrativeSummary = success
    ? {
        pl: `Dzięki żelaznej dyscyplinie i samorefleksji udaje ci się opanować ${targetTrait.type === 'phobia' ? 'fobię' : 'manię'}: "${targetTrait.name}".`,
        en: `Through willpower and self-reflection, you successfully master your ${targetTrait.type}: "${targetTrait.name}".`,
      }
    : {
        pl: `Próba przezwyciężenia ${targetTrait.type === 'phobia' ? 'fobii' : 'manii'} ("${targetTrait.name}") kończy się niepowodzeniem. Traumatyczny nawyk wciąż trwa.`,
        en: `Your effort to overcome your ${targetTrait.type} ("${targetTrait.name}") fails. The compulsion lingers.`,
      };

  return {
    success,
    sanRoll: roll,
    sanTarget: currentSan,
    targetTrait,
    cured: success,
    narrativeSummary,
    nextCharacter: next,
  };
}

/**
 * Hospitalizacja psychiatryczna i opieka lekarza (CoC 7e RAW s. 185-186).
 * Wymaga 1 miesiąca w zakładzie.
 */
export function institutionalizeCare(
  character: Character,
  facility: HospitalizationFacility,
  options?: { forceDoctorRoll?: number; forceSanRoll?: number }
): HospitalCareResult {
  const cr = getCreditRating(character);
  const isPrivate = facility === 'private_sanitarium';

  const costMonthly = isPrivate ? 150 : 0;
  const doctorSkill = isPrivate ? 65 : 40; // Sanatorium: 65% Psychoanalizy, Azyl miejski: 40%

  // Weryfikacja portfela
  const cash = character.cash ?? 0;
  if (isPrivate && cr < 50 && cash < costMonthly) {
    throw new Error('Niewystarczający poziom Majętności lub gotówki na prywatne sanatorium.');
  }

  const doctorRoll = options?.forceDoctorRoll ?? Math.floor(Math.random() * 100) + 1;
  const outcome = evaluateSkillCheck(doctorRoll, doctorSkill);

  const maxSan = getMaxSanity(character);
  const currentSan = character.san || 0;
  let sanChange = 0;
  let curedTrait: { type: 'phobia' | 'mania'; name: string } | undefined;
  let curedIndefiniteInsanity = false;

  const next = { ...character };
  if (isPrivate && cash >= costMonthly) {
    next.cash = Math.max(0, cash - costMonthly);
  }

  if (outcome === 'critical' || outcome === 'extreme' || outcome === 'hard') {
    sanChange = options?.forceSanRoll ?? (Math.floor(Math.random() * 10) + 1);
    curedIndefiniteInsanity = true;
    next.insanityState = 'none';
    next.underlyingInsanity = false;

    // Sukces twardy/krytyczny usuwa fobię lub manię
    if (next.characterTraits?.phobias && next.characterTraits.phobias.length > 0) {
      const removed = next.characterTraits.phobias[0];
      next.characterTraits.phobias = next.characterTraits.phobias.slice(1);
      curedTrait = { type: 'phobia', name: removed };
    } else if (next.characterTraits?.manias && next.characterTraits.manias.length > 0) {
      const removed = next.characterTraits.manias[0];
      next.characterTraits.manias = next.characterTraits.manias.slice(1);
      curedTrait = { type: 'mania', name: removed };
    }
  } else if (outcome === 'regular') {
    sanChange = options?.forceSanRoll ?? (Math.floor(Math.random() * 10) + 1);
    curedIndefiniteInsanity = true;
    next.insanityState = 'none';
    next.underlyingInsanity = false;
  } else if (outcome === 'fumble') {
    // Fumble: błąd w sztuce lekarskiej, trauma (-1k10 SAN)
    sanChange = -(options?.forceSanRoll ?? (Math.floor(Math.random() * 10) + 1));
  } else {
    // Porażka zwykła: brak zmian w SAN
    sanChange = 0;
  }

  next.san = Math.max(0, Math.min(maxSan, currentSan + sanChange));

  const narrativeSummary = createHospitalNarrative(facility, outcome, sanChange, curedTrait);

  return {
    facility,
    doctorSkill,
    doctorRoll,
    outcome,
    sanChange,
    curedTrait,
    curedIndefiniteInsanity,
    costMonthly,
    narrativeSummary,
    nextCharacter: next,
  };
}

function createHospitalNarrative(
  facility: HospitalizationFacility,
  outcome: RollOutcome,
  sanChange: number,
  curedTrait?: { type: 'phobia' | 'mania'; name: string }
): { pl: string; en: string } {
  const facilityNamePl =
    facility === 'private_sanitarium' ? 'Prywatne Sanatorium dr. Hardena' : 'Państwowy Azyl Miejski';
  const facilityNameEn =
    facility === 'private_sanitarium' ? "Dr. Harden's Private Sanitarium" : 'County State Asylum';

  if (outcome === 'fumble') {
    return {
      pl: `${facilityNamePl}: Drastyczne metody leczenia (zimne natryski, izolatka) pogłębiają obłęd badacza! Utrata ${Math.abs(sanChange)} SAN.`,
      en: `${facilityNameEn}: Harsh medical practices and isolation deepen the investigator's madness! Loss of ${Math.abs(sanChange)} SAN.`,
    };
  }

  if (outcome === 'fail') {
    return {
      pl: `${facilityNamePl}: Miesiąc intensywnej terapii mija bez widocznych postępów. Stan umysłu pozostaje bez zmian (0 SAN).`,
      en: `${facilityNameEn}: A month of therapy passes without measurable progress. Mental state remains unchanged (0 SAN).`,
    };
  }

  const traitMsgPl = curedTrait
    ? ` Terapia uleczyła uciążliwy objaw: ${curedTrait.name}.`
    : '';
  const traitMsgEn = curedTrait
    ? ` The treatment successfully resolved a debilitating condition: ${curedTrait.name}.`
    : '';

  return {
    pl: `${facilityNamePl}: Miesiąc profesjonalnej psychoanalizy przynosi przełom! Odzyskano ${sanChange} SAN. Czasowa niepoczytalność została zaleczona.${traitMsgPl}`,
    en: `${facilityNameEn}: A month of professional psychoanalysis yields a breakthrough! Regained ${sanChange} SAN. Indefinite insanity is in remission.${traitMsgEn}`,
  };
}

/**
 * Resetuje flagę użycia odzyskiwania SAN w przerwie śledczej (np. na początku nowej sesji lub przygody).
 */
export function resetDowntimeRecovery(character: Character): Character {
  return {
    ...character,
    usedDowntimeRecovery: false,
  };
}
