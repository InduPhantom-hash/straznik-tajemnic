/**
 * credit-rating - ekonomia postaci wg Call of Cthulhu 7e (RAW).
 *
 * CoC 7e NIE liczy gotówki co do dolara za każdy przedmiot ani wagi/udźwigu. Zamożność
 * opisuje umiejętność **Credit Rating** (w aplikacji: "Majętność"), z której wynikają:
 *   - Spending Level - ile postać może wydać dziennie BEZ rozliczania drobnych zakupów,
 *   - Cash - gotówka pod ręką,
 *   - Assets - majątek (nieruchomości, inwestycje).
 *
 * Wartości wg progów z Keeper Rulebook (era klasyczna, lata 1920). Pure functions.
 */

import type { Character } from '@/lib/types';
import { resolveTestValue } from '@/lib/skill-test-resolver';

export interface CreditRatingTier {
  id: 'penniless' | 'poor' | 'average' | 'wealthy' | 'rich' | 'superrich';
  label: string; // PL
  min: number;
  max: number;
  spendingLevel: number; // $ na dzień
  // Mnożniki dla gotówki/majątku (× Credit Rating). null = wartość stała (patrz fixedCash/Assets).
  cashMultiplier: number | null;
  assetsMultiplier: number | null;
  fixedCash?: number;
  fixedAssets?: number;
}

/** Progi Credit Rating CoC 7e 1920s (Keeper Rulebook). */
export const CREDIT_RATING_TIERS: CreditRatingTier[] = [
  {
    id: 'penniless',
    label: 'Bez grosza',
    min: 0,
    max: 0,
    spendingLevel: 0.5,
    cashMultiplier: null,
    assetsMultiplier: null,
    fixedCash: 0.5,
    fixedAssets: 0,
  },
  {
    id: 'poor',
    label: 'Biedny',
    min: 1,
    max: 9,
    spendingLevel: 2,
    cashMultiplier: 1,
    assetsMultiplier: 10,
  },
  {
    id: 'average',
    label: 'Przeciętny',
    min: 10,
    max: 49,
    spendingLevel: 10,
    cashMultiplier: 2,
    assetsMultiplier: 50,
  },
  {
    id: 'wealthy',
    label: 'Zamożny',
    min: 50,
    max: 89,
    spendingLevel: 50,
    cashMultiplier: 5,
    assetsMultiplier: 500,
  },
  {
    id: 'rich',
    label: 'Bogaty',
    min: 90,
    max: 98,
    spendingLevel: 250,
    cashMultiplier: 20,
    assetsMultiplier: 2000,
  },
  {
    id: 'superrich',
    label: 'Krezus',
    min: 99,
    max: 99,
    spendingLevel: 5000,
    cashMultiplier: null,
    assetsMultiplier: null,
    fixedCash: 50000,
    fixedAssets: 5000000,
  },
];

/** Zwraca próg zamożności dla danej wartości Credit Rating (clamp 0-99). */
export function getCreditRatingTier(creditRating: number): CreditRatingTier {
  const cr = Math.max(0, Math.min(99, Math.round(creditRating)));
  // Pierwszy próg którego max >= cr (progi są rosnące i rozłączne).
  return (
    CREDIT_RATING_TIERS.find((t) => cr >= t.min && cr <= t.max) ??
    CREDIT_RATING_TIERS[0]
  );
}

/**
 * Odczytuje wartość Credit Rating z karty postaci. W aplikacji to umiejętność
 * "Majętność"; resolveTestValue obejmuje też synonimy (Credit Rating / Poziom
 * Zamożności). Zwraca 0 gdy brak (Penniless).
 */
export function getCreditRating(character: Character | null): number {
  if (!character) return 0;
  return (
    resolveTestValue('Majętność', character) ??
    resolveTestValue('Credit Rating', character) ??
    0
  );
}

export interface CharacterFinances {
  creditRating: number;
  tier: CreditRatingTier['id'];
  tierLabel: string;
  spendingLevel: number;
  cash: number; // character.cash override LUB wyliczone z CR
  assets: number; // wyliczone z CR (kwota)
  assetsDescription?: string; // character.assets (opisowy override, np. "Dom w Arkham")
}

/**
 * Wyprowadza pełną ekonomię postaci z Credit Rating + opcjonalnych override'ów
 * (`character.cash`, `character.assets`). Cash/Assets liczone wg progu CoC 7e gdy brak
 * jawnych wartości na karcie.
 */
export function deriveFinances(character: Character | null): CharacterFinances {
  const creditRating = getCreditRating(character);
  const tier = getCreditRatingTier(creditRating);

  const computedCash =
    tier.cashMultiplier !== null
      ? creditRating * tier.cashMultiplier
      : (tier.fixedCash ?? 0);
  const computedAssets =
    tier.assetsMultiplier !== null
      ? creditRating * tier.assetsMultiplier
      : (tier.fixedAssets ?? 0);

  return {
    creditRating,
    tier: tier.id,
    tierLabel: tier.label,
    spendingLevel: tier.spendingLevel,
    cash: character?.cash ?? computedCash,
    assets: computedAssets,
    assetsDescription: character?.assets,
  };
}
