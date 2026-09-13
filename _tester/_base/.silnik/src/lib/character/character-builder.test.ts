import {
  determineInitialBelief,
  initializeCharacterFinances,
  buildCharacterWithDefaults,
} from './character-builder';
import type { Character } from '@/lib/types';

describe('character-builder (CoC 7e RAW)', () => {
  describe('determineInitialBelief (CoC 7e RAW s. 179)', () => {
    it('returns skeptic for ordinary occupations', () => {
      expect(determineInitialBelief('detektyw')).toBe('skeptic');
      expect(determineInitialBelief('lekarz')).toBe('skeptic');
      expect(determineInitialBelief('dziennikarz')).toBe('skeptic');
      expect(determineInitialBelief(undefined)).toBe('skeptic');
    });

    it('returns believer for occult occupations and mystic archetype', () => {
      expect(determineInitialBelief('okultysta')).toBe('believer');
      expect(determineInitialBelief('medium spirytystyczne')).toBe('believer');
      expect(determineInitialBelief('parapsycholog')).toBe('believer');
      expect(determineInitialBelief('antykwariusz / badacz okultyzmu')).toBe('believer');
      expect(determineInitialBelief('detektyw', 'mystic')).toBe('believer');
    });
  });

  describe('initializeCharacterFinances & buildCharacterWithDefaults', () => {
    const baseChar: Character = {
      id: 'char-1',
      name: 'Edward Carnby',
      occupation: 'prywatny detektyw',
      str: 60,
      con: 50,
      siz: 65,
      dex: 70,
      app: 45,
      int: 75,
      pow: 60,
      edu: 70,
      luck: 50,
      hp: 11,
      san: 60,
      mp: 12,
      skills: {
        Majętność: 35,
        Spostrzegawczość: 50,
      },
      age: 32,
      background: 'Detektyw z Bostonu',
      playerName: 'Gracz',
      isActive: true,
      lastUsed: new Date(),
      notes: '',
      experience: {
        totalXP: 0,
        availableXP: 0,
        earnedThisSession: 0,
        maxEarnedThisSession: 10,
      },
      developmentHistory: [],
    };

    it('initializes finances based on credit rating and era', () => {
      const initialized = initializeCharacterFinances(baseChar, '1920s-us');
      expect(initialized.creditRating).toBe(35);
      expect(initialized.currency).toBe('USD');
      expect(initialized.spendingLevel).toBeDefined();
      expect(initialized.cash).toBeDefined();
      expect(initialized.assets).toBeDefined();
    });

    it('builds full character with magic and default belief', () => {
      const full = buildCharacterWithDefaults(baseChar, '1920s-us');
      expect(full.magic).toBeDefined();
      expect(full.magic?.belief).toBe('skeptic');
      expect(full.magic?.deferredSanLoss).toBe(0);
      expect(full.creditRating).toBe(35);
    });

    it('preserves existing believer status if already set', () => {
      const believerChar: Character = {
        ...baseChar,
        magic: {
          schemaVersion: 1,
          belief: 'believer',
          deferredSanLoss: 2,
          knownSpells: {},
          tomeStudies: {},
        },
      };
      const full = buildCharacterWithDefaults(believerChar, '1920s-us');
      expect(full.magic?.belief).toBe('believer');
      expect(full.magic?.deferredSanLoss).toBe(2);
    });
  });
});
