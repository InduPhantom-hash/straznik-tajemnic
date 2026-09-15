import { applySanityDelta } from '@/lib/sanity/sanity-engine';
import { applyStatChangesFromText } from '@/lib/character/apply-stat-changes';
import { extractGameOverEvents, stripGameOverTags } from '@/lib/parsers/mechanics-parser';
import type { Character } from '@/lib/types';

function createMockCharacter(overrides?: Partial<Character>): Character {
  return {
    id: 'char-1',
    name: 'Arthur Pendelton',
    str: 50,
    dex: 50,
    con: 50,
    app: 50,
    pow: 60,
    edu: 70,
    siz: 60,
    int: 75,
    luck: 50,
    hp: 12,
    maxHp: 12,
    san: 50,
    maxSan: 99,
    mp: 10,
    maxMp: 10,
    skills: {},
    developmentHistory: [],
    occupation: 'Dziennikarz',
    age: 35,
    background: '',
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
    ...overrides,
  };
}

describe('Mechanika Game Over i Fail-Forward CoC 7e RAW (Issue #372)', () => {

  describe('Tarcza Ocalenia przy 0 SAN (Obłąkańczy Trans / Edge of the Abyss)', () => {
    it('pierwsza utrata do 0 SAN przyznaje bufor 1k10 SAN oraz status edgeOfTheAbyss', () => {
      const charAtRisk = createMockCharacter({ san: 5 });
      const { nextCharacter, events } = applySanityDelta(charAtRisk, -10, 'widok Yog-Sothotha');

      expect(nextCharacter.edgeOfTheAbyss).toBe(true);
      expect(nextCharacter.san).toBeGreaterThan(0);
      expect(nextCharacter.insanityState).toBe('indefinite');
      expect(nextCharacter.underlyingInsanity).toBe(true);
      expect(events.some((e) => e.type === 'edge_of_the_abyss')).toBe(true);
    });

    it('kolejna utrata SAN gdy edgeOfTheAbyss === true prowadzi do permanent_insanity', () => {
      const charOnEdge = createMockCharacter({
        san: 4,
        edgeOfTheAbyss: true,
        insanityState: 'indefinite',
      });
      const { nextCharacter, events } = applySanityDelta(charOnEdge, -6, 'bluźnierczy szept');

      expect(nextCharacter.san).toBe(0);
      expect(nextCharacter.insanityState).toBe('permanent');
      expect(events.some((e) => e.type === 'permanent_insanity')).toBe(true);
    });
  });

  describe('Tarcza Ocalenia przy 0 HP (Seth Skorkowsky Fail-Forward & Blizny)', () => {
    it('pierwsze zejście do 0 HP aktywuje ocalenie narracyjne i nadaje bliznę', () => {
      const charWithDamage = createMockCharacter({ hp: 4 });
      const updated = applyStatChangesFromText(charWithDamage, '[HP: -6: cięcie szponem]');

      expect(updated.hp).toBe(0);
      expect(updated.isUnconscious).toBe(true);
      expect(updated.deathSavesUsed).toBe(1);
      expect(updated.scars && updated.scars.length).toBeGreaterThan(0);
      expect(updated.isDead).toBeFalsy();
    });

    it('kolejna utrata HP przy wyczerpanym deathSavesUsed oznacza definitywny zgon (isDead: true)', () => {
      const unconsciousChar = createMockCharacter({
        hp: 0,
        isUnconscious: true,
        deathSavesUsed: 1,
      });
      const updated = applyStatChangesFromText(unconsciousChar, '[HP: -4: ponowny cios]');

      expect(updated.hp).toBe(0);
      expect(updated.isDead).toBe(true);
    });
  });

  describe('Parser tagów [GAME_OVER:...]', () => {
    it('poprawnie parsuje tag zgonu ze szczegółami nekrologu prasowego', () => {
      const text = 'Wszystko spowija mrok. [GAME_OVER: @Arthur | typ=DEAD | powod=Rany szarpane w krypcie | naglowek=TRAGICZNY ZGON W DOKACH | tresc=Ciało badacza odnaleziono o poranku.]';
      const events = extractGameOverEvents(text);

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('death');
      expect(events[0].characterName).toBe('Arthur');
      expect(events[0].reason).toBe('Rany szarpane w krypcie');
      expect(events[0].newspaperSnippet?.headline).toBe('TRAGICZNY ZGON W DOKACH');
      expect(events[0].newspaperSnippet?.body).toBe('Ciało badacza odnaleziono o poranku.');
    });

    it('poprawnie parsuje tag trwałego obłędu ze szczegółami karty szpitalnej', () => {
      const text = 'Umysł pęka. [GAME_OVER: @Arthur | typ=INSANE | powod=Nieludzka geometria Rlyeh | nr_akt=AS-9988 | lekarz=dr Armitage | ostatnie_slowa=Ia! Ia! Cthulhu fhtagn!]';
      const events = extractGameOverEvents(text);

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('permanent_insanity');
      expect(events[0].characterName).toBe('Arthur');
      expect(events[0].sanitariumRecord?.admissionNo).toBe('AS-9988');
      expect(events[0].sanitariumRecord?.physicianName).toBe('dr Armitage');
      expect(events[0].sanitariumRecord?.lastWords).toBe('Ia! Ia! Cthulhu fhtagn!');
    });

    it('usuwa znacznik GAME_OVER z tekstu widocznego dla gracza i lektora', () => {
      const raw = 'Badacz osuwa się na bruk. [GAME_OVER: @Arthur | typ=DEAD | powod=zgon] Ciemność zamyka powieki.';
      const clean = stripGameOverTags(raw);
      expect(clean).toBe('Badacz osuwa się na bruk.  Ciemność zamyka powieki.');
      expect(clean).not.toContain('GAME_OVER');
    });
  });
});
