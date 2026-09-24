/**
 * Testy jednostkowe dla Issue #507: Reżyseria zawieszenia sceny w punkcie kulminacji (Mid-Narration Roll)
 * 
 * Weryfikuje:
 * 1. Wykrywanie punktu kulminacji ryzyka (Apex Risk) w deklaracji gracza (evaluateActionApexRisk).
 * 2. Przenoszenie isSuspendedAtApex i apexMomentDescription w potoku adjudicateEventPipeline.
 * 3. Generowanie dyrektywy zawieszenia [ZAWIESZENIE_KULMINACJI] w buildConcordiaEventResolutionDirective.
 * 4. Prawidłową symetrię wielojęzyczną (PL oraz EN [SUSPEND_AT_APEX]).
 * 5. Zapewnienie, że narracja urywa się na zawieszeniu i nie rozstrzyga sukcesu/porażki przed rzutem kością gracza.
 */

import {
  evaluateActionApexRisk,
  adjudicateEventPipeline,
  buildConcordiaEventResolutionDirective,
  resolveToRealEvent,
  extractPutativeEvent,
  adjudicatePutativeEvent,
} from '@/lib/concordia/event-resolution';

describe('Issue #507: Mid-Narration Roll & Suspended Scene Director', () => {
  function verifyNoPrematureResolution(gmNarrative: string): {
    hasPrematureResolution: boolean;
    forbiddenTokensFound: string[];
  } {
    const forbiddenPhrases = [
      'udaje ci się wylądować',
      'spadasz na dół',
      'drzwi ustępują',
      'zamek puszcza',
      'otwierasz drzwi',
      'trafiasz prosto w cel',
      'kula mija cel',
    ];

    const lower = gmNarrative.toLowerCase();
    const found = forbiddenPhrases.filter((phrase) => lower.includes(phrase));

    return {
      hasPrematureResolution: found.length > 0,
      forbiddenTokensFound: found,
    };
  }

  describe('1. Detekcja punktu kulminacji w deklaracji gracza (evaluateActionApexRisk)', () => {
    it('wykrywa kulminację fizyczną przy skoku nad przepaścią', () => {
      const action = 'Biegnę ile sił w nogach i skaczę z dachu magazynu na przeciwległy budynek!';
      const apex = evaluateActionApexRisk(action, 'pl');

      expect(apex.isSuspendedAtApex).toBe(true);
      expect(apex.suggestedSkill).toBe('Skakanie');
      expect(apex.apexMomentDescription).toContain('lotu');
    });

    it('wykrywa kulminację siłową przy wyważaniu drzwi', () => {
      const action = 'Rozpędzam się i wyważam zaryglowane drzwi do krypty.';
      const apex = evaluateActionApexRisk(action, 'pl');

      expect(apex.isSuspendedAtApex).toBe(true);
      expect(apex.suggestedSkill).toBe('Siła');
      expect(apex.apexMomentDescription).toContain('zderzenia');
    });

    it('wykrywa kulminację zręcznościową przy otwieraniu zamka wytrychem', () => {
      const action = 'Wyciągam wytrych i manipuluję przy zardzewiałej kłódce kraty.';
      const apex = evaluateActionApexRisk(action, 'pl');

      expect(apex.isSuspendedAtApex).toBe(true);
      expect(apex.suggestedSkill).toBe('Ślusarstwo');
      expect(apex.apexMomentDescription).toContain('zapadka');
    });

    it('wykrywa kulminację przy dynamicznym skradaniu obok strażnika', () => {
      const action = 'Czekam aż strażnik odwróci głowę i przemykam za jego plecami do bramy.';
      const apex = evaluateActionApexRisk(action, 'pl');

      expect(apex.isSuspendedAtApex).toBe(true);
      expect(apex.suggestedSkill).toBe('Ukrywanie się');
    });

    it('nie zawiesza sceny przy zwykłym dialogu lub spokojnej obserwacji', () => {
      const action = 'Pytam bibliotekarza o rejestr zgonów z 1912 roku.';
      const apex = evaluateActionApexRisk(action, 'pl');

      expect(apex.isSuspendedAtApex).toBe(false);
    });

    it('działa poprawnie w języku angielskim (locale = en)', () => {
      const action = 'I sprint across the rooftop and leap over the alleyway to reach the fire escape.';
      const apex = evaluateActionApexRisk(action, 'en');

      expect(apex.isSuspendedAtApex).toBe(true);
      expect(apex.apexMomentDescription).toContain('mid-air');
    });
  });

  describe('2. Pełny potok adjudicateEventPipeline i propagacja flag zawieszenia', () => {
    it('oznacza RealEvent jako isSuspendedAtApex w potoku zdarzeń', () => {
      const action = 'Biegnę co sił i przeskakuję nad rozpadliną w jaskini!';
      const output = adjudicateEventPipeline(action, { locale: 'pl' });

      expect(output.adjudication.requiresCheck).toBe(true);
      expect(output.adjudication.isSuspendedAtApex).toBe(true);
      expect(output.realEvent.isSuspendedAtApex).toBe(true);
      expect(output.realEvent.apexMomentDescription).toBeDefined();
    });

    it('wstrzykuje dyrektywę [ZAWIESZENIE_KULMINACJI] do tekstu dyrektywy dla modelu', () => {
      const action = 'Napieram ramieniem i wyważam zaryglowane dębowe wrota!';
      const output = adjudicateEventPipeline(action, { locale: 'pl' });

      expect(output.directive).toContain('[ZAWIESZENIE_KULMINACJI]');
      expect(output.directive).toContain('Filmowe zawieszenie narracji (In Media Res Cliffhanger)');
      expect(output.directive).toContain('ŻELAZNY INWARIANT: BEZWZGLĘDNY ZAKAZ opisywania finału akcji');
      expect(output.directive).toContain('NIE opisuj lądowania, upadku, trafienia, otwarcia zamka ani wyłamania drzwi');
    });

    it('generuje angielską dyrektywę [SUSPEND_AT_APEX] dla locale = en', () => {
      const action = 'I smash the heavy door with my shoulder to break it open!';
      const output = adjudicateEventPipeline(action, { locale: 'en' });

      expect(output.directive).toContain('[SUSPEND_AT_APEX]');
      expect(output.directive).toContain('Cinematic In Media Res Cliffhanger');
      expect(output.directive).toContain('DO NOT narrate the outcome');
    });
  });

  describe('3. Weryfikacja czystości narracji zawieszonej (brak auto-sukcesu/auto-porażki)', () => {
    it('akceptuje poprawnie zawieszoną narrację kończącą się w punkcie kulminacji', () => {
      const validSuspendedStory = `
        Odbijasz się z butwiejącego gzymsu. Deski pod twoimi stopami pękają z suchym trzaskiem, 
        a w nozdrza uderza zimny powiew znad rzeki Miskatonic. Przez ułamek sekundy wisisz w próżni 
        między dwoma dachami, widząc zbliżający się ceglany mur.
        [TEST: Skakanie | trudny | rzut w locie | Przeskok nad zaułkiem]
      `;

      const check = verifyNoPrematureResolution(validSuspendedStory);
      expect(check.hasPrematureResolution).toBe(false);
      expect(check.forbiddenTokensFound).toHaveLength(0);
    });

    it('odrzuca narrację, która przedwcześnie rozstrzygnęła sukces przed rzutem gracza', () => {
      const brokenStory = `
        Odbijasz się od krawędzi i udaje ci się wylądować na drugim dachu, choć twardy bruk rani twoje kolana.
        [TEST: Skakanie | zwykły | test | lądowanie]
      `;

      const check = verifyNoPrematureResolution(brokenStory);
      expect(check.hasPrematureResolution).toBe(true);
      expect(check.forbiddenTokensFound).toContain('udaje ci się wylądować');
    });
  });
});
