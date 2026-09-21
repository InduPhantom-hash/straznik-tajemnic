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
  | 'prl-1970s'
  | '1890s-uk'
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

/** Tabela Majętności CoC 7e RAW: Wiktoriańska Anglia (Gaslight 1890s, GBP £ / s / d) */
export const CREDIT_RATING_TIERS_1890S_UK: CreditRatingTier[] = [
  {
    id: 'penniless',
    key: 'pauper',
    label: 'Żebrak / Nędzarz',
    labelEn: 'Penniless',
    min: 0,
    max: 0,
    spendingLevel: 0.05, // 1 szyling (1s)
    cashMultiplier: null,
    assetsMultiplier: null,
    fixedCash: 0.1, // 2 szylingi
    fixedAssets: 0,
    livingConditionsPl: 'Przybysz w przytułku (workhouse), noclegownie we wschodnim Londynie (East End)',
    livingConditionsEn: 'Workhouse inmate, doss-houses in East End London',
  },
  {
    id: 'poor',
    key: 'poor',
    label: 'Biedny',
    labelEn: 'Poor',
    min: 1,
    max: 9,
    spendingLevel: 0.1, // 2 szylingi
    cashMultiplier: 0.2,
    assetsMultiplier: 2,
    livingConditionsPl: 'Wynajmowana izba w robotniczym zaułku; omnibus konny, pieszo',
    livingConditionsEn: 'Rented room in working-class slums; horse omnibus, walking',
  },
  {
    id: 'average',
    key: 'average',
    label: 'Przeciętny',
    labelEn: 'Average',
    min: 10,
    max: 49,
    spendingLevel: 0.5, // 10 szylingów (10s)
    cashMultiplier: 0.5,
    assetsMultiplier: 10,
    livingConditionsPl: 'Skromny dom szeregowy na przedmieściach; dorożki hansom cab, kolej 2. i 3. klasy',
    livingConditionsEn: 'Modest suburban terrace; hansom cabs, 2nd/3rd class rail',
  },
  {
    id: 'wealthy',
    key: 'wealthy',
    label: 'Zamożny',
    labelEn: 'Wealthy',
    min: 50,
    max: 89,
    spendingLevel: 5,
    cashMultiplier: 2,
    assetsMultiplier: 100,
    livingConditionsPl: 'Kamienica w Kensington lub Mayfair, służąca i lokaj; powóz brougham, 1. klasa',
    livingConditionsEn: 'Townhouse in Kensington or Mayfair, domestic servants; brougham carriage, 1st class',
  },
  {
    id: 'rich',
    key: 'rich',
    label: 'Bogaty',
    labelEn: 'Rich',
    min: 90,
    max: 98,
    spendingLevel: 25,
    cashMultiplier: 10,
    assetsMultiplier: 500,
    livingConditionsPl: 'Wiejska rezydencja rodowa, stangret, członkostwo w klubach dżentelmeńskich w Pall Mall',
    livingConditionsEn: 'Country estate, livery coach, gentleman club membership in Pall Mall',
  },
  {
    id: 'superrich',
    key: 'superrich',
    label: 'Krezus',
    labelEn: 'Super rich',
    min: 99,
    max: 99,
    spendingLevel: 500,
    cashMultiplier: null,
    assetsMultiplier: null,
    fixedCash: 10000,
    fixedAssets: 1000000,
    livingConditionsPl: 'Arystokracja parów królestwa, olbrzymie latyfundia, bankierzy z City',
    livingConditionsEn: 'Peerage of the Realm, vast landed estates, City merchant bankers',
  },
];

/** Tabela Majętności CoC 7e: Polska w okresie PRL (lata 70./80., złote PLZ) */
export const CREDIT_RATING_TIERS_PRL_1970S: CreditRatingTier[] = [
  {
    id: 'penniless',
    key: 'pauper',
    label: 'Margines / Bez grosza',
    labelEn: 'Penniless',
    min: 0,
    max: 0,
    spendingLevel: 20,
    cashMultiplier: null,
    assetsMultiplier: null,
    fixedCash: 50,
    fixedAssets: 0,
    livingConditionsPl: 'Meliny, noclegownie, tułaczka po dworcach PKP, zbieranie butelek',
    livingConditionsEn: 'Squats, night shelters, homeless around train stations',
  },
  {
    id: 'poor',
    key: 'poor',
    label: 'Niezamożny robotnik',
    labelEn: 'Poor',
    min: 1,
    max: 9,
    spendingLevel: 50,
    cashMultiplier: 50,
    assetsMultiplier: 500,
    livingConditionsPl: 'Sublokatorski pokój, hotel robotniczy; tramwaje, autobusy PKS',
    livingConditionsEn: 'Rented corner in workers hostel; local trams, PKS buses',
  },
  {
    id: 'average',
    key: 'average',
    label: 'Przeciętny obywatel',
    labelEn: 'Average',
    min: 10,
    max: 49,
    spendingLevel: 200,
    cashMultiplier: 100,
    assetsMultiplier: 2500,
    livingConditionsPl: 'Mieszkanie spółdzielcze w bloku z wielkiej płyty (M-3); Polski Fiat 126p (Maluch) lub Syrena',
    livingConditionsEn: 'Prefab panel cooperative flat (M-3); Polski Fiat 126p or Syrena',
  },
  {
    id: 'wealthy',
    key: 'wealthy',
    label: 'Uprzywilejowany / Prywatna inicjatywa',
    labelEn: 'Wealthy',
    min: 50,
    max: 89,
    spendingLevel: 1000,
    cashMultiplier: 500,
    assetsMultiplier: 25000,
    livingConditionsPl: 'Willa w dobrej dzielnicy, dygnitarz / badylarz; Polski Fiat 125p lub Łada, zakupy w Pewexie',
    livingConditionsEn: 'Private villa, nomenklatura / private grower; Polski Fiat 125p, Pewex shop purchases',
  },
  {
    id: 'rich',
    key: 'rich',
    label: 'Bogaty / Dewizowiec',
    labelEn: 'Rich',
    min: 90,
    max: 98,
    spendingLevel: 5000,
    cashMultiplier: 2000,
    assetsMultiplier: 100000,
    livingConditionsPl: 'Luksusowa posiadłość, prywatny import; zachodnie auto (Mercedes, Volvo), bony PeKaO i dewizy',
    livingConditionsEn: 'Luxury mansion, western vehicle (Mercedes, Volvo), PeKaO foreign currency coupons',
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
    fixedCash: 500000,
    fixedAssets: 50000000,
    livingConditionsPl: 'Najwyższy krąg nomenklatury i handlu zagranicznego; zagraniczne konta i rezydencje rządowe',
    livingConditionsEn: 'Top party elite and foreign trade bosses; foreign currency accounts and government villas',
  },
];

/** Mapa tabel progów majątkowych per era */
export const ECONOMY_TIERS_BY_ERA: Record<EconomyEra, CreditRatingTier[]> = {
  '1920s-us': CREDIT_RATING_TIERS_1920S_US,
  '1920s-pl': CREDIT_RATING_TIERS_1920S_PL,
  'prl-1970s': CREDIT_RATING_TIERS_PRL_1970S,
  '1890s-uk': CREDIT_RATING_TIERS_1890S_UK,
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
  if (/\b(pl|pol|polska|poland|polski|polskie|ii rp|iirp|prl)\b/i.test(s)) {
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
    s.includes('lublin') ||
    s.includes('lubelszczyzn') ||
    s.includes('prl') ||
    s.includes('zł') ||
    s.includes('pln')
  );
}

/**
 * Sprawdza, czy kontekst wskazuje na wiktoriańską Anglię (Cthulhu by Gaslight 1890s).
 */
function isGaslightUkContext(text: string): boolean {
  const s = text.toLowerCase();
  if (
    s.includes('gaslight') ||
    s.includes('1890s-uk') ||
    s.includes('1890s-gb') ||
    s.includes('wiktoria') ||
    s.includes('victorian')
  ) {
    return true;
  }

  const isUk =
    /\b(uk|gb|england|anglia|britain|brytania|london|londyn)\b/i.test(s) ||
    s.includes('wielka brytania') ||
    s.includes('great britain');

  if (isUk) {
    if (s.includes('188') || s.includes('189') || s.includes('190') || s.includes('1890')) {
      return true;
    }
  }

  return false;
}

/**
 * Sprawdza, czy kontekst wskazuje na Polskę w okresie PRL (1944-1989, stare złote PLZ).
 */
function isPrlContext(text: string): boolean {
  const s = text.toLowerCase();
  if (
    s.includes('prl') ||
    s.includes('prl-1970s') ||
    s.includes('plz') ||
    s.includes('pekao') ||
    s.includes('pewex')
  ) {
    return true;
  }

  const matches = s.match(/\b19\d{2}\b/g);
  if (matches) {
    for (const m of matches) {
      const year = parseInt(m, 10);
      if (year >= 1944 && year < 1990) return true;
    }
  }

  return (
    s.includes('197') ||
    s.includes('198') ||
    s.includes('196') ||
    s.includes('195')
  );
}

/**
 * Sprawdza, czy ciąg wskazuje na erę współczesną (po 1990 r. lub słowa kluczowe).
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
      if (year >= 1990) return true;
    }
  }

  return (
    s.includes('2000') ||
    s.includes('201') ||
    s.includes('202') ||
    s.includes('199')
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
    if (s === '1920s-pl' || s === '1920s-poland' || s === 'iirp' || s === 'pl-1920s' || s === 'poland-1920s') {
      return '1920s-pl';
    }
    if (s === 'prl-1970s' || s === 'prl' || s === '1970s-pl' || s === 'pl-prl') {
      return 'prl-1970s';
    }
    if (s === '1890s-uk' || s === 'gaslight' || s === 'gaslight-1890s' || s === '1890s-gb') {
      return '1890s-uk';
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

    if (isGaslightUkContext(s)) {
      return '1890s-uk';
    }

    const isPoland = isPolishContext(s);
    if (isPoland) {
      if (isPrlContext(s)) return 'prl-1970s';
      if (isModernContext(s)) return 'modern-pl';
      return '1920s-pl';
    }

    if (isModernContext(s)) {
      return 'modern-us';
    }
    return '1920s-us';
  }

  const effectiveYear =
    typeof context === 'object' && 'effectiveYear' in context && context.effectiveYear
      ? String(context.effectiveYear)
      : '';
  const { era, yearRange, country, countryCode, location, currency } = context as EconomyEraContext;
  const combined = [era, yearRange, country, countryCode, location, currency, effectiveYear]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (isGaslightUkContext(combined)) {
    return '1890s-uk';
  }

  const isPoland = isPolishContext(combined, context);
  if (isPoland) {
    if (isPrlContext(combined)) return 'prl-1970s';
    if (isModernContext(combined)) return 'modern-pl';
    return '1920s-pl';
  }

  if (isModernContext(combined)) {
    return 'modern-us';
  }

  return '1920s-us';
}

/**
 * Formatuje kwotę zgodnie z wybraną walutą, erą i językiem.
 */
export function formatEconomyAmount(
  amount: number,
  currency: 'USD' | 'PLN' | 'GBP' | 'PLZ',
  era: EconomyEra,
  locale: 'pl' | 'en' = 'pl'
): string {
  if (currency === 'PLZ' || era === 'prl-1970s') {
    const formatted = Math.round(amount).toLocaleString('pl-PL');
    return `${formatted} zł`;
  }

  if (currency === 'GBP' || era === '1890s-uk') {
    if (amount < 1 && amount > 0) {
      const shillings = Math.round(amount * 20);
      return `${shillings}s`;
    }
    const formatted = amount.toLocaleString('en-GB', {
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    });
    return `£${formatted}`;
  }

  if (currency === 'PLN' || era === '1920s-pl' || era === 'modern-pl') {
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
  currency: 'USD' | 'PLN' | 'GBP' | 'PLZ';
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
  let currency: 'USD' | 'PLN' | 'GBP' | 'PLZ' = 'USD';
  let currencySymbol = '$';
  if (era === '1890s-uk') {
    currency = 'GBP';
    currencySymbol = '£';
  } else if (era === 'prl-1970s') {
    currency = 'PLZ';
    currencySymbol = 'zł';
  } else if (era === '1920s-pl' || era === 'modern-pl') {
    currency = 'PLN';
    currencySymbol = 'zł';
  }

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
  currency: 'USD' | 'PLN' | 'GBP' | 'PLZ';
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
    (character
      ? {
          currency: character.currency,
          era: character.era,
          country:
            character.residence?.includes('Polska') ||
            character.birthplace?.includes('Polska') ||
            character.residence?.includes('Poland') ||
            character.birthplace?.includes('Poland')
              ? 'Polska'
              : character.residence?.includes('London') ||
                character.birthplace?.includes('London') ||
                character.residence?.includes('Londyn') ||
                character.birthplace?.includes('Londyn') ||
                character.residence?.includes('England') ||
                character.birthplace?.includes('Anglia') ||
                character.residence?.includes('UK') ||
                character.birthplace?.includes('UK')
                ? 'UK'
                : undefined,
          location: character.residence || character.birthplace,
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
