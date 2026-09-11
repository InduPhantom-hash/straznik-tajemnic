/**
 * Tabele referencyjne CoC 7e: damage/build, modyfikatory wieku, majętność.
 *
 * IND-123 (sesja 90) — wyodrębnione z character-wizard.tsx Faza 1.
 */

// Tabela Modyfikator Obrażeń i Krzepa (S + BC)
export const DAMAGE_BUILD_TABLE = [
  { min: 2, max: 64, damageBonus: '-2', build: -2 },
  { min: 65, max: 84, damageBonus: '-1', build: -1 },
  { min: 85, max: 124, damageBonus: '0', build: 0 },
  { min: 125, max: 164, damageBonus: '+1K4', build: 1 },
  { min: 165, max: 204, damageBonus: '+1K6', build: 2 },
  { min: 205, max: 284, damageBonus: '+2K6', build: 3 },
  { min: 285, max: 364, damageBonus: '+3K6', build: 4 },
  { min: 365, max: 444, damageBonus: '+4K6', build: 5 },
  { min: 445, max: 524, damageBonus: '+5K6', build: 6 },
];

// Modyfikatory wieku
export const AGE_MODIFIERS = [
  {
    key: 'age_15_19',
    min: 15,
    max: 19,
    label: '15-19 lat',
    strSizPenalty: 5,
    eduPenalty: 5,
    appPenalty: 0,
    eduChecks: 0,
    luckReroll: true,
    physPenalty: 0,
  },
  {
    key: 'age_20_39',
    min: 20,
    max: 39,
    label: '20-39 lat',
    strSizPenalty: 0,
    eduPenalty: 0,
    appPenalty: 0,
    eduChecks: 1,
    luckReroll: false,
    physPenalty: 0,
  },
  {
    key: 'age_40_49',
    min: 40,
    max: 49,
    label: '40-49 lat',
    strSizPenalty: 0,
    eduPenalty: 0,
    appPenalty: 5,
    eduChecks: 2,
    luckReroll: false,
    physPenalty: 5,
  },
  {
    key: 'age_50_59',
    min: 50,
    max: 59,
    label: '50-59 lat',
    strSizPenalty: 0,
    eduPenalty: 0,
    appPenalty: 10,
    eduChecks: 3,
    luckReroll: false,
    physPenalty: 10,
  },
  {
    key: 'age_60_69',
    min: 60,
    max: 69,
    label: '60-69 lat',
    strSizPenalty: 0,
    eduPenalty: 0,
    appPenalty: 15,
    eduChecks: 4,
    luckReroll: false,
    physPenalty: 20,
  },
  {
    key: 'age_70_79',
    min: 70,
    max: 79,
    label: '70-79 lat',
    strSizPenalty: 0,
    eduPenalty: 0,
    appPenalty: 20,
    eduChecks: 4,
    luckReroll: false,
    physPenalty: 40,
  },
  {
    key: 'age_80_plus',
    min: 80,
    max: 90,
    label: '80+ lat',
    strSizPenalty: 0,
    eduPenalty: 0,
    appPenalty: 25,
    eduChecks: 4,
    luckReroll: false,
    physPenalty: 80,
  },
];

import {
  CREDIT_RATING_TIERS,
  getWealthInfo,
} from '@/lib/economy/credit-rating';

export { CREDIT_RATING_TIERS };

/**
 * Tabela gotówka/majątek wg Majętności (CoC 7e RAW).
 * Zastępuje dawną sztywną tabelę na rzecz dynamicznych formuł mnożnikowych z credit-rating.ts.
 */
export const WEALTH_TABLE = CREDIT_RATING_TIERS.map((tier) => {
  const info = getWealthInfo(tier.min);
  return {
    min: tier.min,
    max: tier.max,
    key: tier.key,
    id: tier.id,
    level: tier.label,
    cash: info.cash,
    assets: info.assets,
    spending: info.spending,
    cashMultiplier: tier.cashMultiplier,
    assetsMultiplier: tier.assetsMultiplier,
    fixedCash: tier.fixedCash,
    fixedAssets: tier.fixedAssets,
  };
});

