import type { Character } from '@/lib/types';
import {
  resolveEconomyEra,
  formatEconomyAmount,
  getCreditRatingTier,
  getCreditRating,
  getWealthInfo,
  deriveFinances,
  CREDIT_RATING_TIERS_1920S_US,
  CREDIT_RATING_TIERS_1920S_PL,
  CREDIT_RATING_TIERS_MODERN_PL,
  CREDIT_RATING_TIERS_MODERN_US,
} from './credit-rating';

describe('Credit Rating & Economy Engine (CoC 7e RAW)', () => {
  describe('resolveEconomyEra', () => {
    it('defaults to 1920s-us when context is empty or null', () => {
      expect(resolveEconomyEra()).toBe('1920s-us');
      expect(resolveEconomyEra(null)).toBe('1920s-us');
      expect(resolveEconomyEra(undefined)).toBe('1920s-us');
    });

    it('resolves explicit era strings', () => {
      expect(resolveEconomyEra('1920s-pl')).toBe('1920s-pl');
      expect(resolveEconomyEra('iirp')).toBe('1920s-pl');
      expect(resolveEconomyEra('poland-1920s')).toBe('1920s-pl');
      expect(resolveEconomyEra('modern-pl')).toBe('modern-pl');
      expect(resolveEconomyEra('modern-us')).toBe('modern-us');
      expect(resolveEconomyEra('classic')).toBe('1920s-us');
    });

    it('detects Polish locations and eras from strings', () => {
      expect(resolveEconomyEra('Warszawa, 1925')).toBe('1920s-pl');
      expect(resolveEconomyEra('Cień nad Prabutami')).toBe('1920s-pl');
      expect(resolveEconomyEra('Kraków współcześnie 2024')).toBe('modern-pl');
      expect(resolveEconomyEra('Nowy Jork 2024')).toBe('modern-us');
    });

    it('resolves economy era from EconomyEraContext objects', () => {
      expect(
        resolveEconomyEra({
          era: '1920s',
          country: 'Poland',
          location: 'Warszawa',
        })
      ).toBe('1920s-pl');

      expect(
        resolveEconomyEra({
          era: 'modern',
          country: 'Poland',
          currency: 'PLN',
        })
      ).toBe('modern-pl');

      expect(
        resolveEconomyEra({
          era: 'modern',
          country: 'USA',
        })
      ).toBe('modern-us');

      // ISO country code 'PL' and countryCode field
      expect(
        resolveEconomyEra({
          yearRange: '1925',
          country: 'PL',
        })
      ).toBe('1920s-pl');

      expect(
        resolveEconomyEra({
          yearRange: '1925',
          countryCode: 'PL',
        })
      ).toBe('1920s-pl');

      // Years in 2010s (e.g. 2015) in Poland and USA
      expect(
        resolveEconomyEra({
          yearRange: '2015',
          country: 'Poland',
        })
      ).toBe('modern-pl');

      expect(
        resolveEconomyEra({
          yearRange: '2015',
          country: 'USA',
        })
      ).toBe('modern-us');

      // Polish scenario locations from Strefa 11
      expect(resolveEconomyEra({ location: 'Głogów' })).toBe('1920s-pl');
      expect(resolveEconomyEra({ location: 'Łagiewki' })).toBe('1920s-pl');
      expect(resolveEconomyEra({ location: 'Traszyn', yearRange: '1983' })).toBe('modern-pl');
      expect(resolveEconomyEra({ location: 'Prabuty', yearRange: '1983' })).toBe('modern-pl');
    });
  });

  describe('formatEconomyAmount', () => {
    it('formats USD amounts correctly', () => {
      expect(formatEconomyAmount(0.5, 'USD', '1920s-us')).toBe('$0.50');
      expect(formatEconomyAmount(10, 'USD', '1920s-us')).toBe('$10');
      expect(formatEconomyAmount(50000, 'USD', '1920s-us')).toBe('$50,000');
    });

    it('formats 1920s Polish amounts correctly (zł and grosze)', () => {
      expect(formatEconomyAmount(0.5, 'PLN', '1920s-pl')).toBe('50 gr');
      expect(formatEconomyAmount(3, 'PLN', '1920s-pl')).toBe('3 zł');
      expect(formatEconomyAmount(2000, 'PLN', '1920s-pl')).toMatch(/2[,\s]?000 zł/);
    });

    it('formats Modern Polish amounts correctly (zł)', () => {
      expect(formatEconomyAmount(10, 'PLN', 'modern-pl')).toBe('10 zł');
      expect(formatEconomyAmount(1000000, 'PLN', 'modern-pl')).toMatch(/1[,\s]000[,\s]000 zł/);
    });

    it('formats negative amounts correctly', () => {
      expect(formatEconomyAmount(-5, 'USD', '1920s-us')).toBe('-$5');
      expect(formatEconomyAmount(-20, 'PLN', '1920s-pl')).toBe('-20 zł');
    });
  });

  describe('getCreditRatingTier & getWealthInfo for 1920s US', () => {
    it('handles Penniless (CR 0)', () => {
      const info = getWealthInfo(0, '1920s-us');
      expect(info.id).toBe('penniless');
      expect(info.spending).toBe('$0.50');
      expect(info.cash).toBe('$0.50');
      expect(info.assets).toBe('Brak');
      expect(info.cashAmount).toBe(0.5);
      expect(info.assetsAmount).toBe(0);
      expect(info.spendingAmount).toBe(0.5);
    });

    it('handles Poor (CR 1-9)', () => {
      const info1 = getWealthInfo(1, '1920s-us');
      expect(info1.id).toBe('poor');
      expect(info1.spending).toBe('$2');
      expect(info1.cashAmount).toBe(1);
      expect(info1.assetsAmount).toBe(10);

      const info9 = getWealthInfo(9, '1920s-us');
      expect(info9.spending).toBe('$2');
      expect(info9.cashAmount).toBe(9);
      expect(info9.assetsAmount).toBe(90);
    });

    it('handles Average (CR 10-49)', () => {
      const info10 = getWealthInfo(10, '1920s-us');
      expect(info10.id).toBe('average');
      expect(info10.spending).toBe('$10');
      expect(info10.cashAmount).toBe(20);
      expect(info10.assetsAmount).toBe(500);

      const info49 = getWealthInfo(49, '1920s-us');
      expect(info49.spending).toBe('$10');
      expect(info49.cashAmount).toBe(98);
      expect(info49.assetsAmount).toBe(2450);
    });

    it('handles Wealthy (CR 50-89)', () => {
      const info50 = getWealthInfo(50, '1920s-us');
      expect(info50.id).toBe('wealthy');
      expect(info50.spending).toBe('$50');
      expect(info50.cashAmount).toBe(250);
      expect(info50.assetsAmount).toBe(25000);

      const info89 = getWealthInfo(89, '1920s-us');
      expect(info89.spending).toBe('$50');
      expect(info89.cashAmount).toBe(445);
      expect(info89.assetsAmount).toBe(44500);
    });

    it('handles Rich (CR 90-98)', () => {
      const info90 = getWealthInfo(90, '1920s-us');
      expect(info90.id).toBe('rich');
      expect(info90.spending).toBe('$250');
      expect(info90.cashAmount).toBe(1800);
      expect(info90.assetsAmount).toBe(180000);

      const info98 = getWealthInfo(98, '1920s-us');
      expect(info98.spending).toBe('$250');
      expect(info98.cashAmount).toBe(1960);
      expect(info98.assetsAmount).toBe(196000);
    });

    it('handles Superrich (CR 99+)', () => {
      const info99 = getWealthInfo(99, '1920s-us');
      expect(info99.id).toBe('superrich');
      expect(info99.spending).toBe('$5,000');
      expect(info99.cashAmount).toBe(50000);
      expect(info99.assetsAmount).toBe(5000000);
      expect(info99.assets).toContain('+');
    });

    it('clamps negative and excessive Credit Rating', () => {
      const neg = getWealthInfo(-15, '1920s-us');
      expect(neg.id).toBe('penniless');
      expect(neg.cashAmount).toBe(0.5);

      const over = getWealthInfo(120, '1920s-us');
      expect(over.id).toBe('superrich');
      expect(over.cashAmount).toBe(50000);
    });
  });

  describe('getWealthInfo for 1920s II RP (Poland)', () => {
    it('handles Ubogi (CR 0) in grosze', () => {
      const info = getWealthInfo(0, '1920s-pl');
      expect(info.id).toBe('penniless');
      expect(info.spending).toBe('50 gr');
      expect(info.cash).toBe('50 gr');
      expect(info.assets).toBe('Brak');
      expect(info.currency).toBe('PLN');
    });

    it('handles Biedny (CR 1-9) in złote', () => {
      const info = getWealthInfo(5, '1920s-pl');
      expect(info.id).toBe('poor');
      expect(info.spending).toBe('3 zł');
      expect(info.cash).toBe('5 zł');
      expect(info.assets).toBe('50 zł');
    });

    it('handles Przeciętny (CR 10-49) with 20 zł daily spending', () => {
      const info = getWealthInfo(25, '1920s-pl');
      expect(info.id).toBe('average');
      expect(info.spending).toBe('20 zł');
      expect(info.cash).toBe('50 zł');
      expect(info.assets).toMatch(/1[,\s]?250 zł/);
    });

    it('handles Zamożny (CR 50-89) with 30 zł daily spending', () => {
      const info = getWealthInfo(50, '1920s-pl');
      expect(info.id).toBe('wealthy');
      expect(info.spending).toBe('30 zł');
      expect(info.cash).toBe('250 zł');
      expect(info.assets).toMatch(/25[,\s]?000 zł/);
    });

    it('handles Bogaty (CR 90-98) with 100 zł daily spending', () => {
      const info = getWealthInfo(90, '1920s-pl');
      expect(info.id).toBe('rich');
      expect(info.spending).toBe('100 zł');
      expect(info.cash).toMatch(/1[,\s]?800 zł/);
      expect(info.assets).toMatch(/180[,\s]?000 zł/);
    });

    it('handles Krezus (CR 99) with 2000 zł daily spending and 10000 zł cash', () => {
      const info = getWealthInfo(99, '1920s-pl');
      expect(info.id).toBe('superrich');
      expect(info.spending).toMatch(/2[,\s]?000 zł/);
      expect(info.cash).toMatch(/10[,\s]?000 zł/);
      expect(info.assetsAmount).toBe(1000000);
    });
  });

  describe('getWealthInfo for Modern Poland (PLN)', () => {
    it('handles Ubogi, Przeciętny and Krezus in modern PLN', () => {
      const poor = getWealthInfo(0, 'modern-pl');
      expect(poor.id).toBe('penniless');
      expect(poor.spending).toBe('10 zł');
      expect(poor.cash).toBe('10 zł');

      const avg = getWealthInfo(25, 'modern-pl');
      expect(avg.id).toBe('average');
      expect(avg.spending).toBe('150 zł');
      expect(avg.cash).toMatch(/1[,\s]?000 zł/);
      expect(avg.assets).toMatch(/25[,\s]?000 zł/);

      const krezus = getWealthInfo(99, 'modern-pl');
      expect(krezus.id).toBe('superrich');
      expect(krezus.spending).toMatch(/50[,\s]?000 zł/);
      expect(krezus.cash).toMatch(/1[,\s]?000[,\s]?000 zł/);
      expect(krezus.assetsAmount).toBe(50000000);
    });
  });

  describe('deriveFinances helper', () => {
    const baseCharacter: Character = {
      id: 'test-char',
      name: 'Francis Wayland Thurston',
      str: 50,
      con: 50,
      siz: 50,
      dex: 50,
      app: 50,
      int: 50,
      pow: 50,
      edu: 50,
      age: 35,
      hp: 10,
      san: 50,
      mp: 10,
      luck: 50,
      occupation: 'Antropolog',
      skills: {
        'Majętność': 40,
      },
      playerName: 'Gracz',
      isActive: true,
      lastUsed: new Date(),
      notes: '',
      background: '',
      experience: { totalXP: 0, availableXP: 0, earnedThisSession: 0, maxEarnedThisSession: 100 },
      developmentHistory: [],
    };

    it('derives finances automatically from Credit Rating', () => {
      const finances = deriveFinances(baseCharacter, '1920s-us');
      expect(finances.creditRating).toBe(40);
      expect(finances.tier).toBe('average');
      expect(finances.spendingLevel).toBe(10);
      expect(finances.formattedSpendingLevel).toBe('$10');
      expect(finances.cash).toBe(80); // 40 * 2
      expect(finances.formattedCash).toBe('$80');
      expect(finances.assets).toBe(2000); // 40 * 50
      expect(finances.formattedAssets).toBe('$2,000');
    });

    it('falls back to character.currency and character.era when eraContext is omitted', () => {
      const polishChar: Character = {
        ...baseCharacter,
        currency: 'PLN',
        era: '1920s-pl',
      };
      const finances = deriveFinances(polishChar);
      expect(finances.currency).toBe('PLN');
      expect(finances.currencySymbol).toBe('zł');
      expect(finances.era).toBe('1920s-pl');
      expect(finances.formattedCash).toBe('80 zł'); // 40 * 2
      expect(finances.formattedSpendingLevel).toBe('20 zł');
    });

    it('respects manual cash and assets overrides on character sheet', () => {
      const overrideChar: Character = {
        ...baseCharacter,
        cash: 125,
        assets: 'Dom letniskowy w Innsmouth, udziały w fabryce marnotrawstwa',
      };

      const finances = deriveFinances(overrideChar, '1920s-us');
      expect(finances.cash).toBe(125);
      expect(finances.formattedCash).toBe('$125');
      expect(finances.formattedAssets).toBe('Dom letniskowy w Innsmouth, udziały w fabryce marnotrawstwa');
    });

    it('supports English locale for tier labels and living conditions', () => {
      const finances = deriveFinances(baseCharacter, '1920s-us', 'en');
      expect(finances.tierLabel).toBe('Average');
      expect(finances.livingConditions).toContain('Modest home or apartment');
    });

    it('handles null or missing character safely', () => {
      const finances = deriveFinances(null);
      expect(finances.creditRating).toBe(0);
      expect(finances.tier).toBe('penniless');
      expect(finances.spendingLevel).toBe(0.5);
    });

    it('getCreditRating extracts value properly from character', () => {
      expect(getCreditRating(baseCharacter)).toBe(40);
      expect(getCreditRating(null)).toBe(0);
    });

    it('getCreditRatingTier returns tier matching value and era', () => {
      expect(getCreditRatingTier(40, '1920s-us').id).toBe('average');
      expect(getCreditRatingTier(0, '1920s-pl').id).toBe('penniless');
      expect(getCreditRatingTier(99, 'modern-pl').id).toBe('superrich');
    });

    it('exposes complete sets of credit rating tiers for all eras', () => {
      expect(CREDIT_RATING_TIERS_1920S_US).toHaveLength(6);
      expect(CREDIT_RATING_TIERS_1920S_PL).toHaveLength(6);
      expect(CREDIT_RATING_TIERS_MODERN_PL).toHaveLength(6);
      expect(CREDIT_RATING_TIERS_MODERN_US).toHaveLength(6);
    });
  });
});
