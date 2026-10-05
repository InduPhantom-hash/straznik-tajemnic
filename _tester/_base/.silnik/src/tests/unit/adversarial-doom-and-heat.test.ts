/**
 * Adversarial Stress Test Suite for Issue #648 Phase 1:
 * - R1: TimeManager Doom Clock transitions, edge cases, leap years, deadlines, nightfall progression
 * - R2: deriveHeatFromMessages and buildWorldEngineDirectives edge cases, rapid fire, Polish accents, clamping
 */

import { timeManager, DOOM_CLOCK_STAGES, type DoomClockPhase } from '@/lib/time-manager';
import { deriveHeatFromMessages, buildWorldEngineDirectives } from '@/lib/world-engine/adapter';

describe('Adversarial Challenger Suite: R2 - Heat Counter (deriveHeatFromMessages)', () => {
  describe('Robustness against malformed, nullish and adversarial inputs', () => {
    it('returns 0 for null, undefined, empty array, non-array inputs', () => {
      expect(deriveHeatFromMessages(null)).toBe(0);
      expect(deriveHeatFromMessages(undefined)).toBe(0);
      expect(deriveHeatFromMessages([])).toBe(0);
      expect(deriveHeatFromMessages('invalid' as any)).toBe(0);
      expect(deriveHeatFromMessages({} as any)).toBe(0);
    });

    it('safely skips null, undefined, or empty objects within the message array without throwing', () => {
      const messages = [
        null as any,
        undefined as any,
        {},
        { role: 'user' }, // no content
        { role: 'user', content: null as any },
        { role: 'user', content: undefined as any },
        { role: 'user', content: 12345 as any },
        { role: 'user', content: '' },
      ];
      expect(() => deriveHeatFromMessages(messages)).not.toThrow();
      expect(deriveHeatFromMessages(messages)).toBe(0);
    });

    it('strictly ignores system and assistant roles, case-insensitively, while processing user/player/unspecified', () => {
      const messages = [
        { role: 'assistant', content: 'Oddaję strzał z rewolweru!' },
        { role: 'ASSISTANT', content: 'Wybuch granatu i potężna eksplozja!' },
        { role: 'system', content: 'Alarm! Wyważenie drzwi!' },
        { role: 'SYSTEM', content: 'Awantura i bójka w barze!' },
        { role: 'System', content: 'Karabin maszynowy strzela!' },
        // Actual user message
        { role: 'user', content: 'Oddaję strzał!' },
        // Player role variation
        { role: 'player', content: 'Wyważam drzwi wejściowe!' },
        // Unspecified role (treated as user action)
        { content: 'Bójka na pięści!' },
      ];
      // Only 3 loud actions should count (user, player, unspecified)
      expect(deriveHeatFromMessages(messages)).toBe(3);
    });
  });

  describe('Polish accented characters and upper/lowercase variations', () => {
    it('recognizes STRZAŁ (uppercase with Ł)', () => {
      const messages = [{ role: 'user', content: 'STRZAŁ w ciemności!' }];
      expect(deriveHeatFromMessages(messages)).toBe(1);
    });

    it('recognizes wyważam (lowercase with ż)', () => {
      const messages = [{ role: 'user', content: 'wyważam te przeklęte drzwi' }];
      expect(deriveHeatFromMessages(messages)).toBe(1);
    });

    it('recognizes BÓJKA (uppercase with Ó)', () => {
      const messages = [{ role: 'user', content: 'Zaczyna się BÓJKA z marynarzami!' }];
      expect(deriveHeatFromMessages(messages)).toBe(1);
    });

    it('recognizes odpoczynek (quiet action)', () => {
      const messages = [
        { role: 'user', content: 'Strzelam!' },
        { role: 'user', content: 'Czas na odpoczynek w pensjonacie.' },
      ];
      expect(deriveHeatFromMessages(messages)).toBe(0);
    });

    it('recognizes cichaczem and inflected stealth actions reducing heat', () => {
      const messages = [
        { role: 'user', content: 'Oddaję strzał w powietrze!' },
        { role: 'user', content: 'Wymykam się cichaczem zaułkiem.' },
      ];
      // SPECIFICATION: "cichaczem" is a quiet/stealth action and should reduce heat from 1 to 0.
      const actualHeat = deriveHeatFromMessages(messages);
      expect(actualHeat).toBe(0);

      expect(deriveHeatFromMessages([
        { role: 'user', content: 'Strzał!' },
        { role: 'user', content: 'Wymykam się po cichu.' },
      ])).toBe(0);

      expect(deriveHeatFromMessages([
        { role: 'user', content: 'Strzał!' },
        { role: 'user', content: 'Przechodzę cichutko obok strażników.' },
      ])).toBe(0);

      expect(deriveHeatFromMessages([
        { role: 'user', content: 'Strzał!' },
        { role: 'user', content: 'Wynajmuję pokój w hotelu na noc.' },
      ])).toBe(0);

      expect(deriveHeatFromMessages([
        { role: 'user', content: 'Strzał!' },
        { role: 'user', content: 'Chcę się skradać pod osłoną nocy.' },
      ])).toBe(0);

      expect(deriveHeatFromMessages([
        { role: 'user', content: 'Strzał!' },
        { role: 'user', content: 'Próbuję się ukryć w szafie.' },
      ])).toBe(0);
    });
  });

  describe('Extreme rapid fire and clamping', () => {
    it('50 consecutive gunshots clamp cleanly at max heat 5', () => {
      const messages = Array.from({ length: 50 }, (_, i) => ({
        role: 'user',
        content: `Strzał numer ${i + 1} z rewolweru!`,
      }));
      expect(deriveHeatFromMessages(messages)).toBe(5);
    });

    it('50 consecutive rests clamp cleanly at min heat 0 without going negative', () => {
      const messages = Array.from({ length: 50 }, (_, i) => ({
        role: 'user',
        content: `Odpoczynek numer ${i + 1}, śpię spokojnie.`,
      }));
      expect(deriveHeatFromMessages(messages)).toBe(0);
    });

    it('clamps to 0 when 50 rests follow 5 gunshots', () => {
      const loud = Array.from({ length: 5 }, () => ({ role: 'user', content: 'Strzał!' }));
      const quiet = Array.from({ length: 50 }, () => ({ role: 'user', content: 'Odpoczynek w hotelu.' }));
      expect(deriveHeatFromMessages([...loud, ...quiet])).toBe(0);
    });
  });

  describe('Boundary checks for level transitions: heat 0 -> 1 -> 2 -> 3 -> 4 -> 5', () => {
    it('transitions step-by-step from 0 to 5 and verifies World Engine directive boundaries', () => {
      const gunshot = { role: 'user', content: 'Strzelam!' };

      // Heat 0
      expect(deriveHeatFromMessages([])).toBe(0);
      let dir = buildWorldEngineDirectives({ heat: 0 });
      expect(dir).not.toContain('[ECHO_AKCJI:');
      expect(dir).not.toContain('[REAKCJA_WROGA:');

      // Heat 1
      expect(deriveHeatFromMessages([gunshot])).toBe(1);
      dir = buildWorldEngineDirectives({ heat: 1 });
      expect(dir).toContain('[ECHO_AKCJI: POZIOM ROZGŁOSU 1/5');
      expect(dir).not.toContain('[REAKCJA_WROGA:');

      // Heat 2
      expect(deriveHeatFromMessages([gunshot, gunshot])).toBe(2);
      dir = buildWorldEngineDirectives({ heat: 2 });
      expect(dir).toContain('[ECHO_AKCJI: POZIOM ROZGŁOSU 2/5');
      expect(dir).not.toContain('[REAKCJA_WROGA:');

      // Heat 3
      expect(deriveHeatFromMessages([gunshot, gunshot, gunshot])).toBe(3);
      dir = buildWorldEngineDirectives({ heat: 3 });
      expect(dir).toContain('[REAKCJA_WROGA: ALARM ROZGŁOSU 3/5');
      expect(dir).toContain('REAKCJA_WROGA');
      expect(dir).not.toContain('[ECHO_AKCJI:');

      // Heat 4
      expect(deriveHeatFromMessages([gunshot, gunshot, gunshot, gunshot])).toBe(4);
      dir = buildWorldEngineDirectives({ heat: 4 });
      expect(dir).toContain('[REAKCJA_WROGA: ALARM ROZGŁOSU 4/5');

      // Heat 5
      expect(deriveHeatFromMessages([gunshot, gunshot, gunshot, gunshot, gunshot])).toBe(5);
      dir = buildWorldEngineDirectives({ heat: 5 });
      expect(dir).toContain('[REAKCJA_WROGA: ALARM ROZGŁOSU 5/5');
    });
  });
});

describe('Adversarial Challenger Suite: R1 - TimeManager Doom Clock transitions', () => {
  beforeEach(() => {
    timeManager.reset();
  });

  describe('Advance time across day/month/year boundaries and leap years', () => {
    it('handles midnight transition (23:59 -> 00:01)', () => {
      timeManager.setTime({ year: 1925, month: 9, day: 15, hour: 23, minute: 59 });
      const nextTime = timeManager.advanceTime(2);
      expect(nextTime.day).toBe(16);
      expect(nextTime.hour).toBe(0);
      expect(nextTime.minute).toBe(1);
    });

    it('advances across 31-day month boundary (January 31 -> February 1)', () => {
      timeManager.setTime({ year: 1925, month: 0, day: 31, hour: 23, minute: 30 });
      const next = timeManager.advanceTime(45); // +45 min -> Feb 1, 00:15
      expect(next.month).toBe(1);
      expect(next.day).toBe(1);
      expect(next.hour).toBe(0);
      expect(next.minute).toBe(15);
    });

    it('advances across 30-day month boundary (April 30 -> May 1)', () => {
      timeManager.setTime({ year: 1925, month: 3, day: 30, hour: 23, minute: 30 });
      const next = timeManager.advanceTime(45);
      expect(next.month).toBe(4);
      expect(next.day).toBe(1);
      expect(next.hour).toBe(0);
      expect(next.minute).toBe(15);
    });

    it('advances across year boundary (December 31 -> January 1 next year)', () => {
      timeManager.setTime({ year: 1925, month: 11, day: 31, hour: 23, minute: 50 });
      const next = timeManager.advanceTime(20);
      expect(next.year).toBe(1926);
      expect(next.month).toBe(0);
      expect(next.day).toBe(1);
      expect(next.hour).toBe(0);
      expect(next.minute).toBe(10);
    });

    it('handles leap year 1924: Feb 28 -> Feb 29 -> March 1', () => {
      // 1924 is a leap year
      timeManager.setTime({ year: 1924, month: 1, day: 28, hour: 23, minute: 59 });
      let next = timeManager.advanceTime(2);
      expect(next.month).toBe(1); // Still February
      expect(next.day).toBe(29); // Leap day!
      expect(next.hour).toBe(0);
      expect(next.minute).toBe(1);

      // Now advance from Feb 29 to March 1
      timeManager.setTime({ year: 1924, month: 1, day: 29, hour: 23, minute: 59 });
      next = timeManager.advanceTime(2);
      expect(next.month).toBe(2); // March
      expect(next.day).toBe(1);
    });

    it('handles non-leap year 1925: Feb 28 -> March 1', () => {
      timeManager.setTime({ year: 1925, month: 1, day: 28, hour: 23, minute: 59 });
      const next = timeManager.advanceTime(2);
      expect(next.month).toBe(2); // March directly
      expect(next.day).toBe(1);
    });

    it('handles century years: 1900 (not leap) vs 2000 (leap)', () => {
      // 1900: divisible by 4 and 100, not by 400 -> not leap
      timeManager.setTime({ year: 1900, month: 1, day: 28, hour: 23, minute: 59 });
      let next = timeManager.advanceTime(2);
      expect(next.month).toBe(2);
      expect(next.day).toBe(1);

      // 2000: divisible by 400 -> leap
      timeManager.setTime({ year: 2000, month: 1, day: 28, hour: 23, minute: 59 });
      next = timeManager.advanceTime(2);
      expect(next.month).toBe(1);
      expect(next.day).toBe(29);
    });
  });

  describe('Deadline calculations: past, future, and 0 remaining hours', () => {
    it('returns Phase 3 (Climax) when deadline is in the past', () => {
      timeManager.setTime({ year: 1925, month: 9, day: 15, hour: 14, minute: 0 });
      timeManager.setDeadline({ year: 1925, month: 9, day: 15, hour: 12, minute: 0 }, 24);
      expect(timeManager.getDoomClockPhase()).toBe(3);
    });

    it('returns Phase 3 (Climax) when remaining hours are exactly 0 (currentTime == deadline)', () => {
      timeManager.setTime({ year: 1925, month: 9, day: 15, hour: 12, minute: 0 });
      timeManager.setDeadline({ year: 1925, month: 9, day: 15, hour: 12, minute: 0 }, 24);
      expect(timeManager.getDoomClockPhase()).toBe(3);
    });

    it('returns Phase 0 (Silence) when deadline is far in the future', () => {
      timeManager.setTime({ year: 1925, month: 9, day: 15, hour: 12, minute: 0 });
      // Deadline 5 years in the future, total hours 24
      timeManager.setDeadline({ year: 1930, month: 9, day: 15, hour: 12, minute: 0 }, 24);
      expect(timeManager.getDoomClockPhase()).toBe(0);
    });

    it('returns Phase 3 (Climax) when totalHours is 0 (immediate deadline / division by zero guard)', () => {
      timeManager.setTime({ year: 1925, month: 9, day: 15, hour: 11, minute: 58 }); // 2 minutes before deadline
      timeManager.setDeadline({ year: 1925, month: 9, day: 15, hour: 12, minute: 0 });
      const phase = timeManager.getDoomClockPhase({ totalHours: 0 });
      expect(phase).toBe(3);
    });

    it('returns Phase 3 (Climax) when totalHours is 0 even if currentTime is hours before deadline', () => {
      timeManager.setTime({ year: 1925, month: 9, day: 15, hour: 2, minute: 0 }); // 10 hours before deadline
      timeManager.setDeadline({ year: 1925, month: 9, day: 15, hour: 12, minute: 0 });
      expect(timeManager.getDoomClockPhase({ totalHours: 0 })).toBe(3);
    });
  });

  describe('Nightfall progression verification', () => {
    const sequence = [
      { hour: 20, minute: 59, expectedPhase: 0, desc: '20:59 (phase 0)' },
      { hour: 21, minute: 0, expectedPhase: 1, desc: '21:00 (phase 1)' },
      { hour: 23, minute: 59, expectedPhase: 1, desc: '23:59 (phase 1)' },
      { hour: 0, minute: 0, expectedPhase: 2, desc: '00:00 (phase 2)' },
      { hour: 2, minute: 59, expectedPhase: 2, desc: '02:59 (phase 2)' },
      { hour: 3, minute: 0, expectedPhase: 3, desc: '03:00 (phase 3)' },
      { hour: 5, minute: 59, expectedPhase: 3, desc: '05:59 (phase 3)' },
      { hour: 6, minute: 0, expectedPhase: 0, desc: '06:00 (phase 0)' },
    ];

    it.each(sequence)('correctly evaluates $desc without explicit deadline', ({ hour, minute, expectedPhase }) => {
      timeManager.setDeadline(null);
      timeManager.setTime({ hour, minute });
      expect(timeManager.getDoomClockPhase()).toBe(expectedPhase);
    });
  });
});
