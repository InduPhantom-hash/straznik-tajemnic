/**
 * credit-rating - ekonomia postaci wg Call of Cthulhu 7e (RAW).
 *
 * Zgodnie z Rozdziałem 5 (s. 96-97) oraz Rozdziałem 9 (s. 206-207) Podręcznika Badacza CoC 7ed:
 * CoC 7e NIE liczy gotówki co do centa ani grosza za każdy drobny wydatek. Zamożność
 * opisuje umiejętność Credit Rating (w aplikacji: "Majętność"), z której wynikają:
 *   - Spending Level (Poziom życia / dzienny limit wydatków bez księgowania i bez testu),
 *   - Cash (Gotówka pod ręką),
 *   - Assets (Dobytek i majątek trwały: nieruchomości, inwestycje, depozyty).
 *
 * Obsługiwane ery i standardy walutowe:
 *   1. 1920s USA ($ USD) - Keeper Rulebook / Podręcznik Badacza s. 96-97
 *   2. II RP / Polska lata 20./30. XX w. (zł / gr, po reformie Grabskiego 1924 r.) - Podręcznik Badacza s. 206-207
 *   3. Współczesna Polska (zł PLN) - Podręcznik Badacza s. 206-207
 *   4. Współczesność USA / Świat ($ USD) - Keeper Rulebook s. 47 / Podręcznik Badacza s. 238
 */

import type { Character } from '@/lib/types';
import { resolveTestValue } from '@/lib/skill-test-resolver';

export type CreditRatingTierId =
  | 'pauper'
  | 'penniless'
  | 'poor'
  | 'average'
  | 'wealthy'
  | 'rich'
  | 'superrich';

export type EconomyEra =
  | '1920s-us'
  | '1920s-pl'
  | 'modern-pl'
  | 'modern-us';

export interface EconomyEraContext {
  era?: string;
  yearRange?: string;
  country?: string;
  countryCode?: string;
  location?: string;
  currency?: string;
}

export interface CreditRatingTier {
  id: 'penniless' | 'poor' | 'average' | 'wealthy' | 'rich' | 'superrich';
  key: CreditRatingTierId;
  label: string; // PL
  labelEn: string; // EN
  min: number;
  max: number;
  spendingLevel: number; // kwota w danej walucie (np. 0.5 dla 50 gr / $0.50)
  // Mnożniki dla gotówki/majątku (× Credit Rating). null = wartość stała (patrz fixedCash/Assets).
  cashMultiplier: number | null;
  assetsMultiplier: number | null;
  fixedCash?: number;
  fixedAssets?: number;
  livingConditionsPl: string;
  livingConditionsEn: string;
}

/** Tabela Majętności CoC 7e RAW: Klasyczne Lata 20. USA (USD $) */
export const CREDIT_RATING_TIERS_1920S_US: CreditRatingTier[] = [
  {
    id: 'penniless',
    key: 'pauper',
    label: 'Bez grosza',
    labelEn: 'Penniless',
    min: 0,
    max: 0,
    spendingLevel: 0.5,
    cashMultiplier: null,
    assetsMultiplier: null,
    fixedCash: 0.5,
    fixedAssets: 0,
    livingConditionsPl: 'Życie na ulicy / w przytułku; pieszo, autostop, na gapę pociągiem',
    livingConditionsEn: 'Living on the street or in shelters; walking, hitchhiking, riding freight trains',
  },
  {
    id: 'poor',
    key: 'poor',
    label: 'Biedny',
    labelEn: 'Poor',
    min: 1,
    max: 9,
    spendingLevel: 2,
    cashMultiplier: 1,
    assetsMultiplier: 10,
    livingConditionsPl: 'Najtańszy wynajmowany pokój lub podły motel; najtańszy transport publiczny',
    livingConditionsEn: 'Cheapest rented room or flophouse; cheapest public transit',
  },
  {
    id: 'average',
    key: 'average',
    label: 'Przeciętny',
    labelEn: 'Average',
    min: 10,
    max: 49,
    spendingLevel: 10,
    cashMultiplier: 2,
    assetsMultiplier: 50,
    livingConditionsPl: 'Przeciętny dom lub mieszkanie; pociągi 2. klasy, tani automobil (Ford T)',
    livingConditionsEn: 'Modest home or apartment; 2nd class rail, inexpensive automobile (Model T)',
  },
  {
    id: 'wealthy',
    key: 'wealthy',
    label: 'Zamożny',
    labelEn: 'Wealthy',
    min: 50,
    max: 89,
    spendingLevel: 50,
    cashMultiplier: 5,
    assetsMultiplier: 500,
    livingConditionsPl: 'Duża rezydencja ze służbą, dom letni; 1. klasa pociąg/statek, drogi automobil',
    livingConditionsEn: 'Spacious residence with domestic help, summer house; 1st class travel, expensive car',
  },
  {
    id: 'rich',
    key: 'rich',
    label: 'Bogaty',
    labelEn: 'Rich',
    min: 90,
    max: 98,
    spendingLevel: 250,
    cashMultiplier: 20,
    assetsMultiplier: 2000,
    livingConditionsPl: 'Luksusowa posiadłość, liczna służba; luksusowe auta, prywatne rejsy, hotele 5-gwiazdkowe',
    livingConditionsEn: 'Luxury estate, private staff; luxury cars, private charters, premier hotels',
  },
  {
    id: 'superrich',
    key: 'superrich',
    label: 'Krezus',
    labelEn: 'Super rich',
    min: 99,
    max: 99,
    spendingLevel: 5000,
    cashMultiplier: null,
    assetsMultiplier: null,
    fixedCash: 50000,
    fixedAssets: 5000000,
    livingConditionsPl: 'Niewyobrażalny majątek dynastii finansowych; finanse bez ograniczeń',
    livingConditionsEn: 'Immense wealth of financial dynasties; virtually unlimited funds',
  },
];

/** Tabela Majętności CoC 7e RAW: Polska w latach 20./30. XX wieku (II RP w złotych i groszach, s. 206) */
export const CREDIT_RATING_TIERS_1920S_PL: CreditRatingTier[] = [
  {
    id: 'penniless',
    key: 'pauper',
    label: 'Ubogi',
    labelEn: 'Penniless',
    min: 0,
    max: 0,
    spendingLevel: 0.5,
    cashMultiplier: null,
    assetsMultiplier: null,
    fixedCash: 0.5,
    fixedAssets: 0,
    livingConditionsPl: 'Bezdomność, noclegownie, tułaczka po stacjach kolejowych',
    livingConditionsEn: 'Homelessness, night shelters, wandering railway stations',
  },
  {
    id: 'poor',
    key: 'poor',
    label: 'Biedny',
    labelEn: 'Poor',
    min: 1,
    max: 9,
    spendingLevel: 3,
    cashMultiplier: 1,
    assetsMultiplier: 10,
    livingConditionsPl: 'Izba w kamienicy czynszowej na przedmieściu; tramwaj, pieszo',
    livingConditionsEn: 'Single room in a suburban tenement; tramway, walking',
  },
  {
    id: 'average',
    key: 'average',
    label: 'Przeciętnie majętny',
    labelEn: 'Average',
    min: 10,
    max: 49,
    spendingLevel: 20,
    cashMultiplier: 2,
    assetsMultiplier: 50,
    livingConditionsPl: 'Wynajmowane 2-pokojowe mieszkanie, stała posada; dorożki, kolej 2/3 klasy',
    livingConditionsEn: 'Rented 2-room flat, steady job; horse cab, 2nd/3rd class train',
  },
  {
    id: 'wealthy',
    key: 'wealthy',
    label: 'Zamożny',
    labelEn: 'Wealthy',
    min: 50,
    max: 89,
    spendingLevel: 30,
    cashMultiplier: 5,
    assetsMultiplier: 500,
    livingConditionsPl: 'Kamienica, willa podmiejska (Konstancin/Milanówek), gosposia; auto, dorożka na stałe',
    livingConditionsEn: 'Townhouse, suburban villa (Konstancin/Milanówek), housekeeper; personal automobile',
  },
  {
    id: 'rich',
    key: 'rich',
    label: 'Bogaty',
    labelEn: 'Rich',
    min: 90,
    max: 98,
    spendingLevel: 100,
    cashMultiplier: 20,
    assetsMultiplier: 2000,
    livingConditionsPl: 'Pałacyk miejski, majątek ziemski, szofer, kucharz; luksusowy Mercedes/Fiat',
    livingConditionsEn: 'City mansion, landed estate, chauffeur, private chef; luxury Mercedes/Fiat',
  },
  {
    id: 'superrich',
    key: 'superrich',
    label: 'Krezus',
    labelEn: 'Super rich',
    min: 99,
    max: 99,
    spendingLevel: 2000,
    cashMultiplier: null,
    assetsMultiplier: null,
    fixedCash: 10000,
    fixedAssets: 1000000,
    livingConditionsPl: 'Magnateria przemysłowa (Łódź, Górny Śląsk), arystokracja rodowa (Radziwiłłowie, Potoccy)',
    livingConditionsEn: 'Industrial magnates (Łódź, Upper Silesia), landed nobility (Radziwiłł, Potocki families)',
  },
];

/** Tabela Majętności CoC 7e RAW: Czasy współczesne Polska (PLN zł, s. 206) */
export const CREDIT_RATING_TIERS_MODERN_PL: CreditRatingTier[] = [
  {
    id: 'penniless',
    key: 'pauper',
    label: 'Ubogi',
    labelEn: 'Penniless',
    min: 0,
    max: 0,
    spendingLevel: 10,
    cashMultiplier: null,
    assetsMultiplier: null,
    fixedCash: 10,
    fixedAssets: 0,
    livingConditionsPl: 'Życie na ulicy, schroniska dla bezdomnych, brak stałego dochodu',
    livingConditionsEn: 'Living on the street, homeless shelters, no steady income',
  },
  {
    id: 'poor',
    key: 'poor',
    label: 'Biedny',
    labelEn: 'Poor',
    min: 1,
    max: 9,
    spendingLevel: 30,
    cashMultiplier: 20,
    assetsMultiplier: 200,
    livingConditionsPl: 'Wynajmowany pokój na peryferiach; transport publiczny',
    livingConditionsEn: 'Rented room in outer suburbs; public transit',
  },
  {
    id: 'average',
    key: 'average',
    label: 'Przeciętnie majętny',
    labelEn: 'Average',
    min: 10,
    max: 49,
    spendingLevel: 150,
    cashMultiplier: 40,
    assetsMultiplier: 1000,
    livingConditionsPl: 'Własne lub wynajmowane mieszkanie; tani samochód używany',
    livingConditionsEn: 'Owned or rented apartment; budget used car',
  },
  {
    id: 'wealthy',
    key: 'wealthy',
    label: 'Zamożny',
    labelEn: 'Wealthy',
    min: 50,
    max: 89,
    spendingLevel: 500,
    cashMultiplier: 100,
    assetsMultiplier: 10000,
    livingConditionsPl: 'Dom jednorodzinny lub apartament w centrum, nowy samochód klasy premium',
    livingConditionsEn: 'Single-family house or city-center apartment, premium new car',
  },
  {
    id: 'rich',
    key: 'rich',
    label: 'Bogaty',
    labelEn: 'Rich',
    min: 90,
    max: 98,
    spendingLevel: 5000,
    cashMultiplier: 400,
    assetsMultiplier: 40000,
    livingConditionsPl: 'Luksusowa willa, apartamentowiec, kilka nieruchomości i luksusowe auta',
    livingConditionsEn: 'Luxury villa, luxury high-rise, multiple properties and high-end cars',
  },
  {
    id: 'superrich',
    key: 'superrich',
    label: 'Krezus',
    labelEn: 'Super rich',
    min: 99,
    max: 99,
    spendingLevel: 50000,
    cashMultiplier: null,
    assetsMultiplier: null,
    fixedCash: 1000000,
    fixedAssets: 50000000,
    livingConditionsPl: 'Krajowa czołówka listy najbogatszych; prywatne samoloty i jachty',
    livingConditionsEn: 'Top of national wealth lists; private jets and yachts',
  },
];

/** Tabela Majętności CoC 7e RAW: Czasy współczesne USA / Global ($ USD) */
export const CREDIT_RATING_TIERS_MODERN_US: CreditRatingTier[] = [
  {
    id: 'penniless',
    key: 'pauper',
    label: 'Bez grosza',
    labelEn: 'Penniless',
    min: 0,
    max: 0,
    spendingLevel: 10,
    cashMultiplier: null,
    assetsMultiplier: null,
    fixedCash: 10,
    fixedAssets: 0,
    livingConditionsPl: 'Życie na ulicy, schroniska dla bezdomnych',
    livingConditionsEn: 'Living on the street, homeless shelters',
  },
  {
    id: 'poor',
    key: 'poor',
    label: 'Biedny',
    labelEn: 'Poor',
    min: 1,
    max: 9,
    spendingLevel: 20,
    cashMultiplier: 10,
    assetsMultiplier: 100,
    livingConditionsPl: 'Tani wynajmowany pokój na peryferiach; transport miejski',
    livingConditionsEn: 'Budget room on city outskirts; public transit',
  },
  {
    id: 'average',
    key: 'average',
    label: 'Przeciętny',
    labelEn: 'Average',
    min: 10,
    max: 49,
    spendingLevel: 50,
    cashMultiplier: 20,
    assetsMultiplier: 500,
    livingConditionsPl: 'Niewielki dom lub mieszkanie, używany samochód',
    livingConditionsEn: 'Small home or apartment, used car',
  },
  {
    id: 'wealthy',
    key: 'wealthy',
    label: 'Zamożny',
    labelEn: 'Wealthy',
    min: 50,
    max: 89,
    spendingLevel: 250,
    cashMultiplier: 50,
    assetsMultiplier: 5000,
    livingConditionsPl: 'Duży dom na przedmieściach, dwa nowe samochody',
    livingConditionsEn: 'Suburban home, two new cars',
  },
  {
    id: 'rich',
    key: 'rich',
    label: 'Bogaty',
    labelEn: 'Rich',
    min: 90,
    max: 98,
    spendingLevel: 1250,
    cashMultiplier: 200,
    assetsMultiplier: 20000,
    livingConditionsPl: 'Willa w prestiżowej dzielnicy, luksusowe samochody',
    livingConditionsEn: 'Estate in prestigious neighborhood, luxury vehicles',
  },
  {
    id: 'superrich',
    key: 'superrich',
    label: 'Krezus',
    labelEn: 'Super rich',
    min: 99,
    max: 99,
    spendingLevel: 25000,
    cashMultiplier: null,
    assetsMultiplier: null,
    fixedCash: 500000,
    fixedAssets: 25000000,
    livingConditionsPl: 'Miliarderzy, prywatne odrzutowce i rezydencje na całym świecie',
    livingConditionsEn: 'Billionaires, private jets and global estates',
  },
];

/** Mapa tabel progów majątkowych per era */
export const ECONOMY_TIERS_BY_ERA: Record<EconomyEra, CreditRatingTier[]> = {
  '1920s-us': CREDIT_RATING_TIERS_1920S_US,
  '1920s-pl': CREDIT_RATING_TIERS_1920S_PL,
  'modern-pl': CREDIT_RATING_TIERS_MODERN_PL,
  'modern-us': CREDIT_RATING_TIERS_MODERN_US,
};

/** Domyślne progi (wsteczna kompatybilność z klasyczną erą 1920s) */
export const CREDIT_RATING_TIERS = CREDIT_RATING_TIERS_1920S_US;

/**
 * Sprawdza, czy ciąg lub kontekst wskazuje na polskie realia (PLN / zł / II RP).
 */
function isPolishContext(
  text: string,
  contextObj?: EconomyEraContext | null
): boolean {
  if (contextObj) {
    const cc = (contextObj.countryCode || contextObj.country || '').trim().toUpperCase();
    if (cc === 'PL' || cc === 'POL' || cc === 'POLSKA' || cc === 'POLAND') {
      return true;
    }
  }

  const s = text.toLowerCase();
  if (/\b(pl|pol|polska|poland|polski|polskie|ii rp|iirp)\b/i.test(s)) {
    return true;
  }

  return (
    s.includes('warszaw') ||
    s.includes('kraków') ||
    s.includes('krakow') ||
    s.includes('lwów') ||
    s.includes('lwow') ||
    s.includes('wilno') ||
    s.includes('prabut') ||
    s.includes('głogów') ||
    s.includes('glogow') ||
    s.includes('łagiew') ||
    s.includes('lagiew') ||
    s.includes('traszyn') ||
    s.includes('zł') ||
    s.includes('pln')
  );
}

/**
 * Sprawdza, czy ciąg wskazuje na erę współczesną (po 1950 r., np. lata 80., 90., XXI wiek).
 */
function isModernContext(text: string): boolean {
  const s = text.toLowerCase();
  if (
    s.includes('modern') ||
    s.includes('współcz') ||
    s.includes('today') ||
    s.includes('present')
  ) {
    return true;
  }

  // Sprawdź 4-cyfrowy rok
  const matches = s.match(/\b(18|19|20)\d{2}\b/g);
  if (matches) {
    for (const m of matches) {
      const year = parseInt(m, 10);
      if (year >= 1950) return true;
    }
  }

  return (
    s.includes('2000') ||
    s.includes('201') ||
    s.includes('202') ||
    s.includes('199') ||
    s.includes('198') ||
    s.includes('197') ||
    s.includes('196') ||
    s.includes('195')
  );
}

/**
 * Rozpoznaje erę ekonomiczną na podstawie kontekstu sceny, przygody lub lokalizacji.
 */
export function resolveEconomyEra(
  context?: EconomyEraContext | string | null
): EconomyEra {
  if (!context) return '1920s-us';

  if (typeof context === 'string') {
    const s = context.toLowerCase().trim();
    if (s === '1920s-pl' || s === 'iirp' || s === 'pl-1920s' || s === 'poland-1920s') {
      return '1920s-pl';
    }
    if (s === 'modern-pl' || s === 'pl-modern') {
      return 'modern-pl';
    }
    if (s === 'modern-us' || s === 'modern') {
      return 'modern-us';
    }
    if (s === '1920s-us' || s === 'classic' || s === '1920s') {
      return '1920s-us';
    }

    const isPoland = isPolishContext(s);
    const isModern = isModernContext(s);

    if (isPoland) {
      return isModern ? 'modern-pl' : '1920s-pl';
    }
    if (isModern) {
      return 'modern-us';
    }
    return '1920s-us';
  }

  const { era, yearRange, country, countryCode, location, currency } = context;
  const combined = [era, yearRange, country, countryCode, location, currency]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const isPoland = isPolishContext(combined, context);
  const isModern = isModernContext(combined);

  if (isPoland) {
    return isModern ? 'modern-pl' : '1920s-pl';
  }

  if (isModern) {
    return 'modern-us';
  }

  return '1920s-us';
}

/**
 * Formatuje kwotę zgodnie z wybraną walutą, erą i językiem.
 */
export function formatEconomyAmount(
  amount: number,
  currency: 'USD' | 'PLN',
  era: EconomyEra,
  locale: 'pl' | 'en' = 'pl'
): string {
  if (currency === 'PLN') {
    if (era === '1920s-pl' && amount < 1 && amount > 0) {
      const grosze = Math.round(amount * 100);
      return `${grosze} gr`;
    }
    const formatted = amount.toLocaleString(locale === 'pl' ? 'pl-PL' : 'en-US');
    return `${formatted} zł`;
  }

  // USD
  if (amount < 0) {
    const absFormatted = Math.abs(amount).toLocaleString('en-US');
    return `-$${absFormatted}`;
  }
  if (amount < 1 && amount > 0) {
    return `$${amount.toFixed(2)}`;
  }
  const formatted = amount.toLocaleString('en-US');
  return `$${formatted}`;
}

/**
 * Zwraca próg zamożności dla danej wartości Credit Rating (clamp 0-99).
 */
export function getCreditRatingTier(
  creditRating: number,
  eraContext?: EconomyEraContext | string | null
): CreditRatingTier {
  const cr = Math.max(0, Math.min(99, Math.round(creditRating || 0)));
  const era = resolveEconomyEra(eraContext);
  const tiers = ECONOMY_TIERS_BY_ERA[era];
  return (
    tiers.find((t) => cr >= t.min && cr <= t.max) ??
    tiers[0]
  );
}

/**
 * Odczytuje wartość Credit Rating z karty postaci (Majętność / Credit Rating).
 */
export function getCreditRating(character: Character | null): number {
  if (!character) return 0;
  return (
    resolveTestValue('Majętność', character) ??
    resolveTestValue('Credit Rating', character) ??
    0
  );
}

export interface DynamicWealthInfo {
  min: number;
  max: number;
  key: CreditRatingTierId;
  id: CreditRatingTier['id'];
  level: string;
  cash: string;
  assets: string;
  spending: string;
  cashAmount: number;
  assetsAmount: number;
  spendingAmount: number;
  livingConditions: string;
  currency: 'USD' | 'PLN';
  currencySymbol: string;
  era: EconomyEra;
}

/**
 * Wylicza dynamiczne dane majątku (zgodnie z CoC 7e RAW) dla danej wartości Majętności i ery.
 */
export function getWealthInfo(
  creditRating: number,
  eraContext?: EconomyEraContext | string | null,
  locale: 'pl' | 'en' = 'pl'
): DynamicWealthInfo {
  const cr = Math.max(0, Math.min(99, Math.round(creditRating || 0)));
  const era = resolveEconomyEra(eraContext);
  const tiers = ECONOMY_TIERS_BY_ERA[era];
  const tier = tiers.find((t) => cr >= t.min && cr <= t.max) ?? tiers[0];
  const currency: 'USD' | 'PLN' =
    era === '1920s-pl' || era === 'modern-pl' ? 'PLN' : 'USD';
  const currencySymbol = currency === 'PLN' ? 'zł' : '$';

  const cashAmount =
    tier.cashMultiplier !== null
      ? cr * tier.cashMultiplier
      : (tier.fixedCash ?? 0);

  const assetsAmount =
    tier.assetsMultiplier !== null
      ? cr * tier.assetsMultiplier
      : (tier.fixedAssets ?? 0);

  const spendingAmount = tier.spendingLevel;

  const cashFormatted = formatEconomyAmount(cashAmount, currency, era, locale);
  const spendingFormatted = formatEconomyAmount(spendingAmount, currency, era, locale);

  let assetsFormatted = '';
  if (assetsAmount === 0) {
    assetsFormatted = locale === 'en' ? 'None' : 'Brak';
  } else if (cr >= 99) {
    const formatted = formatEconomyAmount(assetsAmount, currency, era, locale);
    assetsFormatted = `${formatted}+`;
  } else {
    assetsFormatted = formatEconomyAmount(assetsAmount, currency, era, locale);
  }

  const key: CreditRatingTierId = tier.id === 'penniless' ? 'pauper' : tier.id;

  return {
    min: tier.min,
    max: tier.max,
    key,
    id: tier.id,
    level: locale === 'en' ? tier.labelEn : tier.label,
    cash: cashFormatted,
    assets: assetsFormatted,
    spending: spendingFormatted,
    cashAmount,
    assetsAmount,
    spendingAmount,
    livingConditions: locale === 'en' ? tier.livingConditionsEn : tier.livingConditionsPl,
    currency,
    currencySymbol,
    era,
  };
}

export interface CharacterFinances {
  creditRating: number;
  tier: CreditRatingTier['id'];
  tierLabel: string;
  spendingLevel: number;
  cash: number; // character.cash override LUB wyliczone z CR
  assets: number; // wyliczone z CR (kwota)
  assetsDescription?: string; // character.assets (opisowy override, np. "Dom w Arkham")
  currency: 'USD' | 'PLN';
  currencySymbol: string;
  formattedSpendingLevel: string;
  formattedCash: string;
  formattedAssets: string;
  livingConditions: string;
  era: EconomyEra;
}

/**
 * Wyprowadza pełną ekonomię postaci z Credit Rating + opcjonalnych override'ów.
 * Zwraca wartości liczbowe oraz sformatowane ciągi znaków dostosowane do ery.
 */
export function deriveFinances(
  character: Character | null,
  eraContext?: EconomyEraContext | string | null,
  locale: 'pl' | 'en' = 'pl'
): CharacterFinances {
  const creditRating = getCreditRating(character);
  const effectiveContext =
    eraContext ??
    (character?.currency || character?.era
      ? {
          currency: character.currency,
          era: character.era,
        }
      : null);
  const info = getWealthInfo(creditRating, effectiveContext, locale);

  const cash = character?.cash ?? info.cashAmount;
  const assets = info.assetsAmount;

  const formattedCash =
    character?.cash !== undefined
      ? formatEconomyAmount(character.cash, info.currency, info.era, locale)
      : info.cash;

  const formattedAssets =
    character?.assets && character.assets.trim().length > 0
      ? character.assets
      : info.assets;

  return {
    creditRating,
    tier: info.id,
    tierLabel: info.level,
    spendingLevel: character?.spendingLevel ?? info.spendingAmount,
    cash,
    assets,
    assetsDescription: character?.assets,
    currency: info.currency,
    currencySymbol: info.currencySymbol,
    formattedSpendingLevel: info.spending,
    formattedCash,
    formattedAssets,
    livingConditions: info.livingConditions,
    era: info.era,
  };
}
