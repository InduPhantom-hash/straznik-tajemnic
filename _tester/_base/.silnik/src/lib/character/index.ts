/**
 * Barrel re-export dla helpers character.
 *
 * IND-123 (sesja 90) — wyodrębnione z character-wizard.tsx.
 */

export {
  roll,
  roll3d6x5,
  roll2d6plus6x5,
  half,
  fifth,
  generateRandomStats,
} from './dice';
export {
  getDamageAndBuild,
  getMovement,
  calculateDerived,
  getWealthInfo,
} from './derived-stats';
export { calculateOccupationPoints } from './occupation-points';
export type { ItemCategory } from './item-helpers';
export {
  generateVisualDescription,
  generateItemLore,
  categorizeItem,
  estimateWeight,
} from './item-helpers';
