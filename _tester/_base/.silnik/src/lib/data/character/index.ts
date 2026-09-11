/**
 * Barrel re-export dla data files character.
 *
 * IND-123 (sesja 90) - wyodrębnione z character-wizard.tsx.
 */

export type { CharacterStats, DerivedStats } from './stats';
export { STAT_DESCRIPTIONS, DERIVED_DESCRIPTIONS } from './stats';
export type { Occupation } from './occupations';
export { OCCUPATIONS, OCCUPATION_DESCRIPTIONS } from './occupations';
export {
  SKILL_DESCRIPTIONS,
  BASE_SKILLS,
  SKILL_CREATION_LIMIT,
  SKILL_LIMIT_EXCEPTIONS,
} from './skills';
export { DAMAGE_BUILD_TABLE, AGE_MODIFIERS, WEALTH_TABLE } from './tables';
export { FIELD_PROMPTS } from './field-prompts';
export {
  IIRP_MALE_NAMES,
  IIRP_FEMALE_NAMES,
  IIRP_SURNAMES,
  IIRP_JEWISH_MINORITY,
  IIRP_GERMAN_MINORITY,
  IIRP_EASTERN_MINORITY,
  IIRP_ALL_MINORITIES,
  getRandomIIRPMaleName,
  getRandomIIRPFemaleName,
  getRandomIIRPSurname,
  getRandomIIRPCharacterName,
} from './names-iirp';

