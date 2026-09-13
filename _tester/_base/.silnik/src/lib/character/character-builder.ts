/**
 * character-builder.ts
 *
 * Deterministyczna inicjalizacja i uzupełnianie cech badacza:
 * - Finanse CoC 7e RAW (Credit Rating, Spending Level, Cash, Assets, Waluta)
 * - Status Wiary w Mity (Sceptyk vs Wierzący CoC 7e RAW s. 179)
 */

import type { Character } from '@/lib/types';
import {
  deriveFinances,
  getCreditRating,
  type EconomyEraContext,
} from '@/lib/economy/credit-rating';

/** Zawody i archetypy domyślnie powiązane z wiarą w zjawiska nadnaturalne */
const OCCULT_OCCUPATIONS = new Set([
  'okultysta',
  'medium spirytystyczne',
  'parapsycholog',
  'wrozka / jasnowidz',
  'wróżka / jasnowidz',
  'antykwariusz / badacz okultyzmu',
]);

/**
 * Ustala domyślny status wiary w Mity (CoC 7e RAW s. 179).
 * Wszyscy nowo tworzeni badacze startują jako Sceptycy,
 * chyba że ich zawód/archetyp jawnie dotyczy okultyzmu.
 */
export function determineInitialBelief(
  occupation?: string,
  archetype?: string
): 'skeptic' | 'believer' {
  if (archetype === 'mystic') return 'believer';
  if (!occupation) return 'skeptic';

  const normOcc = occupation.toLowerCase().trim();
  if (OCCULT_OCCUPATIONS.has(normOcc)) return 'believer';

  return 'skeptic';
}

/**
 * Deterministycznie inicjalizuje lub uzupełnia finanse postaci
 * na podstawie umiejętności Majętność (Credit Rating) i ery.
 */
export function initializeCharacterFinances<T extends Character>(
  character: T,
  eraContext?: EconomyEraContext | string | null
): T {
  const creditRating = getCreditRating(character);
  const effectiveEra = eraContext ?? character.era ?? (character.currency === 'PLN' ? 'modern-pl' : '1920s-us');
  const finances = deriveFinances(character, effectiveEra);

  const skills = { ...(character.skills ?? {}) };
  if (creditRating > 0 && !skills['Majętność']) {
    skills['Majętność'] = creditRating;
  }

  return {
    ...character,
    creditRating: finances.creditRating,
    spendingLevel: character.spendingLevel ?? finances.spendingLevel,
    cash: character.cash ?? finances.cash,
    assets: character.assets ?? (finances.assetsDescription || finances.formattedAssets),
    currency: character.currency ?? finances.currency,
    era: character.era ?? finances.era,
    skills,
  };
}

/**
 * Kompleksowa inicjalizacja nowo tworzonej lub wybranej z presetu postaci.
 */
export function buildCharacterWithDefaults<T extends Character>(
  character: T,
  eraContext?: EconomyEraContext | string | null
): T {
  const withFinances = initializeCharacterFinances(character, eraContext);

  // Inicjalizacja wiary w Mity (CoC 7e RAW s. 179)
  const initialBelief =
    character.magic?.belief ??
    determineInitialBelief(character.occupation, character.archetype);

  const magic = {
    schemaVersion: 1,
    belief: initialBelief,
    deferredSanLoss: character.magic?.deferredSanLoss ?? 0,
    knownSpells: character.magic?.knownSpells ?? {},
    tomeStudies: character.magic?.tomeStudies ?? {},
    ...character.magic,
  };

  return {
    ...withFinances,
    magic,
  };
}
