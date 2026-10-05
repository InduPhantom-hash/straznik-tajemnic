/**
 * Testy jednostkowe dla Issue #648 Faza 1:
 * - R1: Zegar Zagłady (Doom Clock) w TimeManager i buildTimeContext
 * - R2: Reakcja Świata na Rozgłos (Heat Counter) w adapter.ts (deriveHeatFromMessages i buildWorldEngineDirectives)
 * - R4: Dywersyfikacja Umiejętności w skill-test-resolver.ts (Czwórmecz Społeczny i rzadkie umiejętności RAW)
 */

import { timeManager, DOOM_CLOCK_STAGES, type DoomClockPhase } from '@/lib/time-manager';
import { buildTimeContext } from '@/app/api/chat/_helpers/build-time-context';
import { deriveHeatFromMessages, buildWorldEngineDirectives } from '@/lib/world-engine/adapter';
import { resolveTestValue, resolveSkillBaseValue } from '@/lib/skill-test-resolver';
import { resolveGameEraContext } from '@/lib/era';
import type { Character } from '@/lib/types';

describe('Issue #648 Faza 1 - R1: Zegar Zagłady (Doom Clock)', () => {
  beforeEach(() => {
    timeManager.reset();
  });

  describe('Metadane i etapy Zegara Zagłady (DOOM_CLOCK_STAGES)', () => {
    it('zawiera kompletne definicje wszystkich 4 faz (0 do 3)', () => {
      const phases: DoomClockPhase[] = [0, 1, 2, 3];
      for (const p of phases) {
        const stage = DOOM_CLOCK_STAGES[p];
        expect(stage).toBeDefined();
        expect(stage.phase).toBe(p);
        expect(stage.namePl).toBeTruthy();
        expect(stage.nameEn).toBeTruthy();
        expect(stage.descriptionPl).toBeTruthy();
        expect(stage.descriptionEn).toBeTruthy();
        expect(stage.directivePl).toBeTruthy();
        expect(stage.directiveEn).toBeTruthy();
      }
    });

    it('getDoomClockStage zwraca prawidłowy etap dla podanej fazy lub fazy bieżącej', () => {
      expect(timeManager.getDoomClockStage(0).phase).toBe(0);
      expect(timeManager.getDoomClockStage(1).phase).toBe(1);
      expect(timeManager.getDoomClockStage(2).phase).toBe(2);
      expect(timeManager.getDoomClockStage(3).phase).toBe(3);
    });
  });

  describe('Domyślny fallback godzin nocnych (bez ustalonego deadline)', () => {
    it('zwraca Fazę 0 (Cisza) w ciągu dnia (06:00 do 20:59)', () => {
      timeManager.setTime({ hour: 10, minute: 0 });
      expect(timeManager.getDoomClockPhase()).toBe(0);

      timeManager.setTime({ hour: 15, minute: 30 });
      expect(timeManager.getDoomClockPhase()).toBe(0);

      timeManager.setTime({ hour: 20, minute: 59 });
      expect(timeManager.getDoomClockPhase()).toBe(0);
    });

    it('zwraca Fazę 1 (Narastająca presja) między 21:00 a 23:59', () => {
      timeManager.setTime({ hour: 21, minute: 0 });
      expect(timeManager.getDoomClockPhase()).toBe(1);

      timeManager.setTime({ hour: 22, minute: 45 });
      expect(timeManager.getDoomClockPhase()).toBe(1);

      timeManager.setTime({ hour: 23, minute: 59 });
      expect(timeManager.getDoomClockPhase()).toBe(1);
    });

    it('zwraca Fazę 2 (Bezpośrednie zagrożenie) między 00:00 a 02:59', () => {
      timeManager.setTime({ hour: 0, minute: 0 });
      expect(timeManager.getDoomClockPhase()).toBe(2);

      timeManager.setTime({ hour: 1, minute: 30 });
      expect(timeManager.getDoomClockPhase()).toBe(2);

      timeManager.setTime({ hour: 2, minute: 59 });
      expect(timeManager.getDoomClockPhase()).toBe(2);
    });

    it('zwraca Fazę 3 (Punkt kulminacyjny) między 03:00 a 05:59', () => {
      timeManager.setTime({ hour: 3, minute: 0 });
      expect(timeManager.getDoomClockPhase()).toBe(3);

      timeManager.setTime({ hour: 4, minute: 15 });
      expect(timeManager.getDoomClockPhase()).toBe(3);

      timeManager.setTime({ hour: 5, minute: 59 });
      expect(timeManager.getDoomClockPhase()).toBe(3);
    });

    it('wraca do Fazy 0 o świcie (06:00)', () => {
      timeManager.setTime({ hour: 6, minute: 0 });
      expect(timeManager.getDoomClockPhase()).toBe(0);
    });
  });

  describe('Kalkulacja eskalacji na podstawie jawnego deadline', () => {
    it('poprawnie wylicza postęp czasu (0%, 30%, 60%, 80%, expired)', () => {
      // Start: 12 października 1925, 08:00
      // Deadline: 13 października 1925, 08:00 (24h łącznie)
      timeManager.setTime({ year: 1925, month: 9, day: 12, hour: 8, minute: 0 });
      timeManager.setDeadline({ year: 1925, month: 9, day: 13, hour: 8, minute: 0 }, 24);

      // 0% - start
      expect(timeManager.getDoomClockPhase()).toBe(0);

      // +7h (08:00 -> 15:00) => 7/24 = ~29.1% -> Faza 1
      timeManager.advanceTime(7 * 60);
      expect(timeManager.getDoomClockPhase()).toBe(1);

      // +6h (15:00 -> 21:00) => 13/24 = ~54.2% -> Faza 2
      timeManager.advanceTime(6 * 60);
      expect(timeManager.getDoomClockPhase()).toBe(2);

      // +6h (21:00 -> 03:00) => 19/24 = ~79.2% -> Faza 3
      timeManager.advanceTime(6 * 60);
      expect(timeManager.getDoomClockPhase()).toBe(3);

      // Po przekroczeniu terminu => Faza 3
      timeManager.advanceTime(10 * 60);
      expect(timeManager.getDoomClockPhase()).toBe(3);
    });

    it('obsługuje setDeadline(null) i poprawnie czyści deadline', () => {
      timeManager.setDeadline({ year: 1925, month: 9, day: 13, hour: 8, minute: 0 }, 24);
      expect(timeManager.getDeadline()).not.toBeNull();
      timeManager.setDeadline(null);
      expect(timeManager.getDeadline()).toBeNull();
    });

    it('reset() oraz resetForAdventure() czyszczą deadline', () => {
      timeManager.setDeadline({ year: 1925, month: 9, day: 13, hour: 8, minute: 0 }, 24);
      timeManager.reset();
      expect(timeManager.getDeadline()).toBeNull();

      timeManager.setDeadline({ year: 1925, month: 9, day: 13, hour: 8, minute: 0 }, 24);
      timeManager.resetForAdventure(null);
      expect(timeManager.getDeadline()).toBeNull();
    });
  });

  describe('Formatowanie dyrektywy Zegara Zagłady (formatDoomClockDirective)', () => {
    it('formatuje dyrektywę w języku polskim', () => {
      timeManager.setTime({ hour: 22, minute: 0 }); // Faza 1
      const directive = timeManager.formatDoomClockDirective('pl');
      expect(directive).toContain('[ZEGAR ZAGŁADY: Faza 1: Narastająca presja');
      expect(directive).toContain('Wprowadzaj zmysłowe zwiastuny');
    });

    it('formatuje dyrektywę w języku angielskim', () => {
      timeManager.setTime({ hour: 1, minute: 0 }); // Faza 2
      const directive = timeManager.formatDoomClockDirective('en');
      expect(directive).toContain('[DOOM CLOCK: Phase 2: Direct Threat');
      expect(directive).toContain('Actively apply time pressure');
    });
  });

  describe('Integracja z buildTimeContext', () => {
    it('wstrzykuje dyrektywę Zegara Zagłady do timePromptSection', () => {
      timeManager.setTime({ hour: 23, minute: 15 });
      const eraContext = resolveGameEraContext({
        gameTime: timeManager.getTime(),
        adventure: { yearRange: '1920-1929', country: 'USA', era: 'classic' },
      });

      const { timePromptSection } = buildTimeContext({ eraContext, locale: 'pl' });
      expect(timePromptSection).toContain('**Zegar Zagłady (Presja Czasu):**');
      expect(timePromptSection).toContain('[ZEGAR ZAGŁADY: Faza 1: Narastająca presja');
      expect(timePromptSection).toContain('Respektuj aktualną fazę Zegara Zagłady');
    });
  });
});

describe('Issue #648 Faza 1 - R2: Reakcja Świata na Rozgłos (Heat Counter)', () => {
  describe('deriveHeatFromMessages', () => {
    it('zwraca 0 dla pustych lub brakujących wiadomości', () => {
      expect(deriveHeatFromMessages(null)).toBe(0);
      expect(deriveHeatFromMessages(undefined)).toBe(0);
      expect(deriveHeatFromMessages([])).toBe(0);
    });

    it('ignoruje wiadomości o roli assistant i system', () => {
      const messages = [
        { role: 'assistant', content: 'Słyszysz głośny strzał z rewolweru i wyważanie drzwi!' },
        { role: 'system', content: 'Alarm! Nastąpiła potężna eksplozja.' },
      ];
      expect(deriveHeatFromMessages(messages)).toBe(0);
    });

    it('zwiększa heat o 1 za każdą głośną akcję gracza (strzał, wyważenie, bójka)', () => {
      const messages = [
        { role: 'user', content: 'Wyciągam browninga i oddaję strzał w zamek!' },
        { role: 'assistant', content: 'Kula rykoszetuje.' },
        { role: 'user', content: 'Rozpętuję dziką bójkę z barmanem, krzycząc w niebogłosy!' },
      ];
      expect(deriveHeatFromMessages(messages)).toBe(2);
    });

    it('zmniejsza heat o 1 za dyskrecję lub odpoczynek gracza', () => {
      const messages = [
        { role: 'user', content: 'Strzelam do kultysty z rewolweru!' }, // +1 (heat 1)
        { role: 'user', content: 'Wyważam drzwi wejściowe łomem!' }, // +1 (heat 2)
        { role: 'user', content: 'Udajemy się do bezpiecznego hotelu, gdzie śpię do rana.' }, // -1 (heat 1)
        { role: 'user', content: 'Skradam się cicho w cieniu zaułka.' }, // -1 (heat 0)
      ];
      expect(deriveHeatFromMessages(messages)).toBe(0);
    });

    it('clamping: nie schodzi poniżej 0 przy powtarzających się cichych akcjach', () => {
      const messages = [
        { role: 'user', content: 'Skradam się cicho.' },
        { role: 'user', content: 'Odpoczywam w ukryciu.' },
        { role: 'user', content: 'Śpię w hotelu.' },
      ];
      expect(deriveHeatFromMessages(messages)).toBe(0);
    });

    it('clamping: nie przekracza maksymalnego poziomu 5 przy eskalacji hałasu', () => {
      const messages = [
        { role: 'user', content: 'Strzelam!' },
        { role: 'user', content: 'Wystrzał z pistoletu!' },
        { role: 'user', content: 'Wyważam drzwi!' },
        { role: 'user', content: 'Eksplozja dynamitu!' },
        { role: 'user', content: 'Awantura i bijatyka!' },
        { role: 'user', content: 'Kolejny strzał!' },
        { role: 'user', content: 'Jeszcze jeden strzał!' },
      ];
      expect(deriveHeatFromMessages(messages)).toBe(5);
    });
  });

  describe('buildWorldEngineDirectives z Heat Counter', () => {
    it('heat 0: nie generuje dyrektywy rozgłosu', () => {
      const directives = buildWorldEngineDirectives({ heat: 0 });
      expect(directives).not.toContain('[ECHO_AKCJI:');
      expect(directives).not.toContain('[REAKCJA_WROGA:');
    });

    it('heat 1-2: generuje [ECHO_AKCJI: POZIOM ROZGŁOSU]', () => {
      const directives = buildWorldEngineDirectives({ heat: 2, locale: 'pl' });
      expect(directives).toContain('[ECHO_AKCJI: POZIOM ROZGŁOSU 2/5');
      expect(directives).toContain('W okolicy krążą plotki');
      expect(directives).not.toContain('[REAKCJA_WROGA:');
    });

    it('heat 3+: generuje [REAKCJA_WROGA: ALARM ROZGŁOSU]', () => {
      const directives = buildWorldEngineDirectives({ heat: 3, locale: 'pl' });
      expect(directives).toContain('[REAKCJA_WROGA: ALARM ROZGŁOSU 3/5');
      expect(directives).toContain('Antagoniści/kult wykonują proaktywny ruch');
      expect(directives).toContain('OBOWIĄZKOWO uwzględnij człon REAKCJA_WROGA wewnątrz znacznika [MYŚLI_MG]');
      expect(directives).not.toContain('[ECHO_AKCJI:');
    });

    it('poprawnie formatuje wersję angielską przy locale: en', () => {
      const directives = buildWorldEngineDirectives({ heat: 4, locale: 'en' });
      expect(directives).toContain('[REAKCJA_WROGA: HEAT ALERT 4/5');
      expect(directives).toContain('Adversaries/cult make a proactive move');
    });

    it('automatycznie wylicza heat z przekazanej historii messages', () => {
      const messages = [
        { role: 'user', content: 'Oddaję strzał z pistoletu!' },
        { role: 'user', content: 'Wyważam bramę łomem!' },
        { role: 'user', content: 'Wybuch granatu!' },
      ];
      const directives = buildWorldEngineDirectives({ messages, locale: 'pl' });
      expect(directives).toContain('[REAKCJA_WROGA: ALARM ROZGŁOSU 3/5');
    });
  });
});

describe('Issue #648 Faza 1 - R4: Dywersyfikacja Umiejętności (Skill Diversity)', () => {
  const testCharacter = {
    id: 'char-investigator-1',
    name: 'Franciszek Walczak',
    san: 55,
    skills: {
      'Urok Osobisty': 65,
      'Ślusarstwo': 50,
      'Medycyna': 75,
      'Księgowość': 60,
      'Prawo': 70,
      'Gadanina': 55,
      'Zastraszanie': 45,
    },
  } as unknown as Character;

  describe('resolveTestValue z kartą Badacza', () => {
    it('rozpoznaje synonimy Czwórmeczu Społecznego i rzadkich umiejętności', () => {
      // Urok / Urok Osobisty
      expect(resolveTestValue('Urok', testCharacter)).toBe(65);
      expect(resolveTestValue('Urok Osobisty', testCharacter)).toBe(65);
      expect(resolveTestValue('wdzięk', testCharacter)).toBe(65);

      // Ślusarstwo / Wytrychy
      expect(resolveTestValue('Ślusarstwo', testCharacter)).toBe(50);
      expect(resolveTestValue('Wytrychy', testCharacter)).toBe(50);
      expect(resolveTestValue('otwieranie zamków', testCharacter)).toBe(50);

      // Medycyna / Diagnostyka
      expect(resolveTestValue('Medycyna', testCharacter)).toBe(75);
      expect(resolveTestValue('Diagnostyka', testCharacter)).toBe(75);
      expect(resolveTestValue('sztuka lekarska', testCharacter)).toBe(75);

      // Księgowość / Finanse
      expect(resolveTestValue('Księgowość', testCharacter)).toBe(60);
      expect(resolveTestValue('Finanse', testCharacter)).toBe(60);
      expect(resolveTestValue('rachunkowość', testCharacter)).toBe(60);

      // Prawo / Znajomość Prawa
      expect(resolveTestValue('Prawo', testCharacter)).toBe(70);
      expect(resolveTestValue('Znajomość Prawa', testCharacter)).toBe(70);
      expect(resolveTestValue('przepisy prawne', testCharacter)).toBe(70);

      // Gadanina / Szybka Gadka
      expect(resolveTestValue('Gadanina', testCharacter)).toBe(55);
      expect(resolveTestValue('Szybka Gadka', testCharacter)).toBe(55);
      expect(resolveTestValue('bajerowanie', testCharacter)).toBe(55);

      // Zastraszanie / Intymidacja
      expect(resolveTestValue('Zastraszanie', testCharacter)).toBe(45);
      expect(resolveTestValue('Intymidacja', testCharacter)).toBe(45);
      expect(resolveTestValue('groźby', testCharacter)).toBe(45);
    });
  });

  describe('resolveSkillBaseValue (wartości bazowe z BASE_SKILLS)', () => {
    it('rozwiązuje wartości bazowe dla synonimów gdy umiejętności brak na karcie', () => {
      expect(resolveSkillBaseValue('Urok')).toBe(15);
      expect(resolveSkillBaseValue('Wytrychy')).toBe(1);
      expect(resolveSkillBaseValue('Diagnostyka')).toBe(1);
      expect(resolveSkillBaseValue('Finanse')).toBe(5);
      expect(resolveSkillBaseValue('Znajomość Prawa')).toBe(5);
      expect(resolveSkillBaseValue('Szybka Gadka')).toBe(5);
      expect(resolveSkillBaseValue('Intymidacja')).toBe(15);
    });
  });
});
