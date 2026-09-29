/**
 * @file mechanics-integration-audit.test.ts
 * Kompleksowy test audytowy integracji mechanik gry CoC 7e RAW (Issue #537).
 *
 * Weryfikuje 3 kluczowe obszary mechaniczne w headless rurociągu symulatora:
 * - Obszar 1: Ekwipunek, rekwizyty i broń (Katalog, Fallback RAW broni białej, Handout Triple Entity, buildPlayerWeaponContext)
 * - Obszar 2: Czas gry, kalendarz i wydarzenia tła (GameTime, formatowanie [AKTUALNY CZAS:...], cykl dobowy, fazy księżyca, losowe wydarzenia atmosferyczne)
 * - Obszar 3: Poczytalność, obłęd i relacje NPC (Ciągłość po Bout of Madness, nadszarpnięcie kotwicy w importantPeople, aktualizacja disposition w Dossier)
 *
 * Kryterium wydajności: wykonanie całego zestawu w < 3 sekundy.
 */

import { MockGMPipeline, createMockInvestigator } from './mock-gm-pipeline';
import {
  getCombatDefenseWeapons,
  buildPlayerWeaponContext,
  isWeapon,
  isMeleeWeapon,
} from '@/lib/combat/weapon-context';
import { RANDOM_EVENTS } from '@/lib/content-library/random-tables';
import { recoverSanityFromAnchor } from '@/lib/sanity/sanity-recovery';
import type { EquipmentItem } from '@/lib/types';
import type { ResolvedEraContext } from '@/lib/era/types';

describe('Mechanics Integration Audit - CoC 7e RAW (Issue #537)', () => {
  // =========================================================================
  // OBSZAR 1: Ekwipunek, rekwizyty i broń
  // =========================================================================
  describe('Area 1: Equipment, Props & Combat Weapon Context', () => {
    let pipeline: MockGMPipeline;

    beforeEach(() => {
      pipeline = new MockGMPipeline({
        initialCharacter: createMockInvestigator({
          skills: {
            'Spostrzegawczość': 65,
            'Walka Wręcz (Bijatyka)': 60,
            'Walka Wręcz': 60,
            'Broń Palna': 50,
            'Unik': 40,
          },
        }),
      });
    });

    it('1.1: Zdobycie broni palnej i synchronizacja z buildPlayerWeaponContext', () => {
      const activeChar = pipeline.getActiveCharacter();
      expect(activeChar.equipment?.length ?? 0).toBe(0);

      // MG przyznaje broń palną w narracji
      const firearmGmResponse = `
W szufladzie biurka znajdujesz ciężki rewolwer z nabojami.
[PRZEDMIOT: Rewolwer .38: Niezawodny rewolwer Smith & Wesson z bębenkiem na 6 naboi | broń]
[ZDOBYTY_PRZEDMIOT: Rewolwer .38 | Niezawodny rewolwer Smith & Wesson z bębenkiem na 6 naboi | zwykly]
      `.trim();

      const turn = pipeline.feedGMResponse(firearmGmResponse);
      const updatedChar = pipeline.getActiveCharacter();

      expect(turn.journalChanges.changed).toBe(true);
      const acquiredFirearm = updatedChar.equipment?.find((e) => e.name === 'Rewolwer .38');
      expect(acquiredFirearm).toBeDefined();
      expect(isWeapon(acquiredFirearm!)).toBe(true);
      expect(isMeleeWeapon(acquiredFirearm!)).toBe(false);

      // Kontekst broni dla promptu MG zawiera broń palną i instrukcje RAW
      const eraContext: ResolvedEraContext = {
        schemaVersion: 1,
        sceneDate: null,
        effectiveYear: 1925,
        regionProfile: 'US',
        countryCode: 'US',
        measurementSystem: 'imperial',
        source: 'scenario-range',
        rulesVersion: '1.0',
      };

      const weaponPrompt = buildPlayerWeaponContext(updatedChar, eraContext, 'pl');
      expect(weaponPrompt).toContain('## UZBROJENIE POSTACI');
      expect(weaponPrompt).toContain('Rewolwer .38');
      expect(weaponPrompt).toContain('Broń Palna');
      expect(weaponPrompt).toContain('obrażenia 1d10');
      // Broń palna generuje wskazówki taktyczne RAW (zasada zacięcia, zasięg, strzały w rundzie)
      expect(weaponPrompt).toContain('ZASADY BRONI PALNEJ');
    });

    it('1.2: Zdobycie broni białej bez szablonu w katalogu – bezpieczny fallback RAW dla noża w getCombatDefenseWeapons', () => {
      const knifeGmResponse = `
Na blacie kuchennym leży ostry, stalowy nóż kuchenny.
[PRZEDMIOT: Nóż kuchenny: Zwykły, ostry nóż ze stali węglowej z drewnianą rękojeścią | broń]
[ZDOBYTY_PRZEDMIOT: Nóż kuchenny | Zwykły, ostry nóż ze stali węglowej z drewnianą rękojeścią | zwykly]
      `.trim();

      pipeline.feedGMResponse(knifeGmResponse);
      const charWithKnife = pipeline.getActiveCharacter();

      const knifeItem = charWithKnife.equipment?.find((e) => e.name === 'Nóż kuchenny');
      expect(knifeItem).toBeDefined();
      expect(isWeapon(knifeItem!)).toBe(true);
      expect(isMeleeWeapon(knifeItem!)).toBe(true);

      // getCombatDefenseWeapons musi uwzględniać zdobyty nóż z bezpiecznym fallbackiem '1d4' i 'impaling'
      const defenseOptions = getCombatDefenseWeapons(charWithKnife);
      expect(defenseOptions.length).toBeGreaterThanOrEqual(2);

      const unarmedOpt = defenseOptions.find((o) => o.id === 'unarmed');
      expect(unarmedOpt).toBeDefined();
      expect(unarmedOpt?.damageFormula).toBe('1d3');

      const knifeOpt = defenseOptions.find((o) => o.name === 'Nóż kuchenny');
      expect(knifeOpt).toBeDefined();
      expect(knifeOpt?.damageFormula).toBe('1d4');
      expect(knifeOpt?.damageType).toBe('impaling');
      expect(knifeOpt?.skillValue).toBe(60);
    });

    it('1.3: Zdobycie improwizowanej broni obuchowej bez szablonu – fallback RAW dla pałki (1d6, blunt)', () => {
      const clubGmResponse = `
Za drzwiami stoi masywna pałka dębowa.
[PRZEDMIOT: Ciężka pałka: Dębowy kij ze śladami uderzeń | broń]
[ZDOBYTY_PRZEDMIOT: Ciężka pałka | Dębowy kij ze śladami uderzeń | zwykly]
      `.trim();

      pipeline.feedGMResponse(clubGmResponse);
      const charWithClub = pipeline.getActiveCharacter();

      const defenseOptions = getCombatDefenseWeapons(charWithClub);
      const clubOpt = defenseOptions.find((o) => o.name === 'Ciężka pałka');

      expect(clubOpt).toBeDefined();
      expect(clubOpt?.damageFormula).toBe('1d6');
      expect(clubOpt?.damageType).toBe('blunt');
    });

    it('1.4: Broń zniszczona (condition: broken) nie jest dostępna do obrony', () => {
      const char = pipeline.getActiveCharacter();
      const brokenWeapon: EquipmentItem = {
        id: 'broken_baton',
        name: 'Połamana pałka policyjna',
        category: 'weapon',
        condition: 'broken',
      };

      pipeline.updateActiveCharacter({
        equipment: [...(char.equipment ?? []), brokenWeapon],
      });

      const defenseOptions = getCombatDefenseWeapons(pipeline.getActiveCharacter());
      expect(defenseOptions.some((o) => o.name === 'Połamana pałka policyjna')).toBe(false);
    });

    it('1.5: Potrójny byt handoutu – rekwizyt w ekwipunku (isReadable) + wpis w dzienniku + poszlaka w Dossier', () => {
      const handoutGmResponse = `
W skrytce za obrazem ukryto stary, pożółkły dokument.
[PRZEDMIOT: List z Arkham Sanitarium: Tajna korespondencja dyrektora potwierdzająca nielegalne eksperymenty]
[ZDOBYTY_PRZEDMIOT: List z Arkham Sanitarium | Tajna korespondencja dyrektora potwierdzająca nielegalne eksperymenty | zwykly]
      `.trim();

      const turn = pipeline.feedGMResponse(handoutGmResponse);
      expect(turn.journalChanges.changed).toBe(true);
      const char = pipeline.getActiveCharacter();

      // 1. Rekwizyt fizyczny w ekwipunku z flagą czytnika
      const eqHandout = char.equipment?.find((e) => e.name === 'List z Arkham Sanitarium');
      expect(eqHandout).toBeDefined();
      expect(eqHandout?.category).toBe('document');
      expect(eqHandout?.isReadable).toBe(true);
      expect(eqHandout?.readableContent).toContain('Tajna korespondencja dyrektora');

      // 2. Wpis w dzienniku (chronologia sesji)
      const journalItem = char.journal?.find((j) => j.title === 'List z Arkham Sanitarium');
      expect(journalItem).toBeDefined();
      expect(journalItem?.type).toBe('item');

      // 3. Syntetyczny fakt śledczy w Dossier
      const dossierClue = char.investigatorDossier?.clues?.find((c) =>
        c.title.includes('List z Arkham Sanitarium')
      );
      expect(dossierClue).toBeDefined();
      expect(dossierClue?.category).toBe('document');
      expect(dossierClue?.provenance).toBe('handout');
      expect(dossierClue?.status).toBe('confirmed');
    });

    it('1.6: Zachowanie jawnej formuły obrażeń (modifiers.damage) dla niestandardowej broni białej', () => {
      const char = pipeline.getActiveCharacter();
      const customSaber: EquipmentItem = {
        id: 'ceremonial_saber',
        name: 'Szabla ceremonialna',
        category: 'weapon',
        modifiers: { damage: '1d8' },
      };
      const customDagger: EquipmentItem = {
        id: 'cult_dagger',
        name: 'Sztylet rytualny kultu',
        category: 'weapon',
        modifiers: { damage: '1d4+1' },
      };

      pipeline.updateActiveCharacter({
        equipment: [...(char.equipment ?? []), customSaber, customDagger],
      });

      const defenseOptions = getCombatDefenseWeapons(pipeline.getActiveCharacter());
      const saberOpt = defenseOptions.find((o) => o.name === 'Szabla ceremonialna');
      const daggerOpt = defenseOptions.find((o) => o.name === 'Sztylet rytualny kultu');

      expect(saberOpt).toBeDefined();
      expect(saberOpt?.damageFormula).toBe('1d8');
      expect(saberOpt?.damageType).toBe('slashing');

      expect(daggerOpt).toBeDefined();
      expect(daggerOpt?.damageFormula).toBe('1d4+1');
      expect(daggerOpt?.damageType).toBe('impaling');

      // Broń z rozmytego dopasowania katalogowego (np. Nóż kuchenny ze skopiowanym templateId i modifiers: 1d4+2)
      // NIE może nadpisywać bezpiecznego fallbacku RAW (1d4, impaling)
      const fuzzyKitchenKnife: EquipmentItem = {
        id: 'fuzzy_kitchen_knife',
        name: 'Nóż kuchenny',
        category: 'weapon',
        templateId: 'weapon.knife',
        modifiers: { damage: '1d4+2' },
      };
      pipeline.updateActiveCharacter({
        equipment: [...pipeline.getActiveCharacter().equipment!, fuzzyKitchenKnife],
      });
      const optionsWithKitchenKnife = getCombatDefenseWeapons(pipeline.getActiveCharacter());
      const kitchenKnifeOpt = optionsWithKitchenKnife.find((o) => o.id === 'fuzzy_kitchen_knife');
      expect(kitchenKnifeOpt).toBeDefined();
      expect(kitchenKnifeOpt?.damageFormula).toBe('1d4');
      expect(kitchenKnifeOpt?.damageType).toBe('impaling');
    });
  });

  // =========================================================================
  // OBSZAR 2: Czas gry, kalendarz i wydarzenia tła
  // =========================================================================
  describe('Area 2: Game Time, Calendar & Background Atmospheric Events', () => {
    let pipeline: MockGMPipeline;

    beforeEach(() => {
      pipeline = new MockGMPipeline({
        initialGameTime: {
          year: 1925,
          month: 9, // Październik (0-indexed: 9)
          day: 24,
          hour: 14,
          minute: 15,
        },
      });
    });

    it('2.1: Inicjalizacja czasu gry i deterministyczny getter getGameTime()', () => {
      const time = pipeline.getGameTime();
      expect(time.year).toBe(1925);
      expect(time.month).toBe(9);
      expect(time.day).toBe(24);
      expect(time.hour).toBe(14);
      expect(time.minute).toBe(15);
      expect(pipeline.isNight()).toBe(false);
    });

    it('2.2: Aktualizacja czasu gry przez tag [AKTUALNY CZAS: ...] w feedGMResponse', () => {
      const timeTagResponse = `
Mijają kolejne godziny śledztwa w bibliotece Miskatonic.
[AKTUALNY CZAS: 24 Października 1925, 21:45]
Zegar w czytelni wybija kwadrans przed dziesiątą.
      `.trim();

      const turn = pipeline.feedGMResponse(timeTagResponse);

      expect(turn.gameTime.hour).toBe(21);
      expect(turn.gameTime.minute).toBe(45);
      expect(pipeline.getGameTime().hour).toBe(21);
      expect(pipeline.getGameTime().minute).toBe(45);
      expect(pipeline.isNight()).toBe(true);
    });

    it('2.3: Cykl dobowy i detekcja pory dnia isNight()', () => {
      // 10:00 -> dzień
      pipeline.setGameTime({ hour: 10, minute: 0 });
      expect(pipeline.isNight()).toBe(false);

      // 20:59 -> dzień
      pipeline.setGameTime({ hour: 20, minute: 59 });
      expect(pipeline.isNight()).toBe(false);

      // 21:00 -> noc (godz >= 21)
      pipeline.setGameTime({ hour: 21, minute: 0 });
      expect(pipeline.isNight()).toBe(true);

      // 03:30 -> noc (godz < 6)
      pipeline.setGameTime({ hour: 3, minute: 30 });
      expect(pipeline.isNight()).toBe(true);

      // 06:00 -> dzień (godz 6)
      pipeline.setGameTime({ hour: 6, minute: 0 });
      expect(pipeline.isNight()).toBe(false);
    });

    it('2.4: Synchronizacja kalendarza: dzień tygodnia i fazy księżyca', () => {
      // 24 Października 1925 to była Sobota
      pipeline.setGameTime({ year: 1925, month: 9, day: 24 });
      expect(pipeline.getDayOfWeek()).toBe('Sobota');

      // Sprawdzenie fazy księżyca
      const moonPhase = pipeline.getMoonPhase();
      expect(typeof moonPhase).toBe('string');
      expect([
        'new',
        'waxing_crescent',
        'first_quarter',
        'waxing_gibbous',
        'full',
        'waning_gibbous',
        'last_quarter',
        'waning_crescent',
      ]).toContain(moonPhase);
    });

    it('2.5: Metoda advanceGameTime() poprawnie obsługuje przekroczenie minut, godzin i dni', () => {
      pipeline.setGameTime({
        year: 1925,
        month: 0, // Styczeń
        day: 31,
        hour: 23,
        minute: 45,
      });

      // Przesunięcie o 30 minut -> przekracza północ i przechodzi w 1 Lutego 1925
      pipeline.advanceGameTime(30);

      const time = pipeline.getGameTime();
      expect(time.year).toBe(1925);
      expect(time.month).toBe(1); // Luty
      expect(time.day).toBe(1);
      expect(time.hour).toBe(0);
      expect(time.minute).toBe(15);
      expect(pipeline.isNight()).toBe(true);
    });

    it('2.6: Filtrowanie losowych wydarzeń atmosferycznych z random-tables.ts po porze dnia', () => {
      const atmosphericEvents = RANDOM_EVENTS.filter((e) => e.category === 'atmospheric');
      expect(atmosphericEvents.length).toBeGreaterThan(0);

      // 1. W dzień (14:00)
      pipeline.setGameTime({ hour: 14, minute: 0 });
      const isNightNow = pipeline.isNight();
      expect(isNightNow).toBe(false);

      const availableDayEvents = atmosphericEvents.filter((e) =>
        isNightNow
          ? e.timeOfDay === 'night' || e.timeOfDay === 'either'
          : e.timeOfDay === 'day' || e.timeOfDay === 'either'
      );

      // Zdarzenie 'Dziwna cisza' (id: a3) jest tylko dzienne
      expect(availableDayEvents.some((e) => e.id === 'a3')).toBe(true);
      // Zdarzenie 'Dziwne światło' (id: a5) jest tylko nocne
      expect(availableDayEvents.some((e) => e.id === 'a5')).toBe(false);

      // 2. W nocy (23:00)
      pipeline.setGameTime({ hour: 23, minute: 0 });
      const isNightLater = pipeline.isNight();
      expect(isNightLater).toBe(true);

      const availableNightEvents = atmosphericEvents.filter((e) =>
        isNightLater
          ? e.timeOfDay === 'night' || e.timeOfDay === 'either'
          : e.timeOfDay === 'day' || e.timeOfDay === 'either'
      );

      expect(availableNightEvents.some((e) => e.id === 'a5')).toBe(true);
      expect(availableNightEvents.some((e) => e.id === 'a3')).toBe(false);
    });
  });

  // =========================================================================
  // OBSZAR 3: Poczytalność, obłęd i relacje NPC
  // =========================================================================
  describe('Area 3: Sanity, Bouts of Madness & NPC Relations/Disposition', () => {
    let pipeline: MockGMPipeline;

    beforeEach(() => {
      pipeline = new MockGMPipeline({
        initialCharacter: createMockInvestigator({
          san: 60,
          int: 75,
          skills: {
            'Inteligencja': 75,
            'Poczytalność': 60,
            'Spostrzegawczość': 65,
          },
          importantPeople: [
            {
              id: 'person_eleanor',
              name: 'Eleanor Vance',
              relationship: 'Ukochana narzeczona',
              description: 'Jedyna ostoja spokoju',
              status: 'alive',
              isKeyConnection: true,
              damaged: false,
              lost: false,
            },
          ],
        }),
      });
    });

    it('3.1: Ciągłość czatu po załamaniu nerwowym (SAN loss >= 5 -> Bout of Madness -> kolejna tura)', () => {
      // 1. Krok: Utrata 6 SAN i zdany test INT wyzwalają Atak Szaleństwa (Bout of Madness)
      const horrorRes = pipeline.resolveSanityHorror({
        sanLoss: 6,
        reason: 'Makabryczne szczątki w piwnicy',
        intPassed: true,
        forceBoutIndex: 2, // Fobia / paranoja
      });

      expect(horrorRes.charAfter.san).toBe(54);
      expect(horrorRes.events.some((e) => e.type === 'temporary_insanity')).toBe(true);
      expect(horrorRes.charAfter.insanityState).toBe('temporary');
      expect(horrorRes.charAfter.activeBoutOfMadness).toBeDefined();

      // 2. Krok: Bezpośrednia kolejna tura gracza wykonuje się płynnie bez zawieszenia stanu
      const recoveryAction = 'Próbuję opanować drżenie rąk i uciekam ku wyjściu.';
      const nextGmResponse = `
[MYŚLI_MG: Gracz pod wpływem szoku ucieka ku schodom. Podtrzymuję paranoiczny klimat.]
Rzucasz się w stronę stromych drewnianych schodów. Echa własnych kroków brzmią w twoich uszach jak pościg potworów!
[TEST: Spostrzegawczość | zwykly | | Czy dostrzegasz stopnie w ciemności?]
      `.trim();

      const nextTurn = pipeline.processAction(recoveryAction, nextGmResponse);

      expect(nextTurn.turn).toBe(2);
      expect(nextTurn.skillTests.length).toBe(1);
      expect(nextTurn.skillTests[0].skillName).toBe('Spostrzegawczość');
      expect(pipeline.getMessages().length).toBe(3); // 1 horror response + 1 user recovery + 1 next GM response
    });

    it('3.2: Nadszarpnięcie kotwicy w importantPeople (damaged: true) przy nieudanej projekcji tożsamości', () => {
      const char = pipeline.getActiveCharacter();
      expect(char.importantPeople?.[0].damaged).toBeFalsy();

      // Porażka w rzucie na oparcie w kotwicy (rzut 95 > SAN 60)
      const recoveryResult = recoverSanityFromAnchor(char, 'person_eleanor', 'visit', {
        forceRoll: 95,
        ignoreCooldown: true,
      });

      expect(recoveryResult.success).toBe(false);
      expect(recoveryResult.newStatus).toBe('damaged');
      expect(recoveryResult.nextCharacter.importantPeople?.[0].damaged).toBe(true);
      expect(recoveryResult.nextCharacter.san).toBe(char.san - 1);

      // Aktualizacja postaci w pipeline
      pipeline.updateActiveCharacter(recoveryResult.nextCharacter);
      expect(pipeline.getActiveCharacter().importantPeople?.[0].damaged).toBe(true);
    });

    it('3.3: Aktualizacja relacji i nastawienia NPC (disposition) w dossier', () => {
      // 1. Wprowadzenie nowego NPC z początkowym nastawieniem nieufnym
      const npcIntroResponse = `
Wchodzisz do antykwariatu. Za ladą stoi właściciel.
[NPC: Janusz Nowak | podejrzliwy]
      `.trim();

      pipeline.feedGMResponse(npcIntroResponse);
      const charAfterIntro = pipeline.getActiveCharacter();
      const npcInDossier = charAfterIntro.investigatorDossier?.npcs?.find(
        (n) => n.name === 'Janusz Nowak'
      );

      expect(npcInDossier).toBeDefined();
      expect(npcInDossier?.disposition).toBe('suspicious');
      expect(npcInDossier?.relationshipStatus).toBe('suspicious');

      // 2. Udany test perswazji i zmiana nastawienia NPC na przyjazne
      const npcFriendlyResponse = `
Janusz Nowak opuszcza gardę po pokazaniu legitymacji i uśmiecha się życzliwie.
[NPC: Janusz Nowak | przyjazny]
      `.trim();

      pipeline.feedGMResponse(npcFriendlyResponse);
      const charAfterChange = pipeline.getActiveCharacter();
      const updatedNpc = charAfterChange.investigatorDossier?.npcs?.find(
        (n) => n.name === 'Janusz Nowak'
      );

      expect(updatedNpc?.disposition).toBe('friendly');
      expect(updatedNpc?.relationshipStatus).toBe('friendly');

      // 3. Zaognienie sytuacji – tag relacji wrogiej [DISPOSITION: Janusz Nowak | hostile]
      const npcHostileResponse = `
Gdy pytasz o symbol na monecie, Janusz blednie i sięga pod ladę po strzelbę!
[DISPOSITION: Janusz Nowak | hostile]
      `.trim();

      pipeline.feedGMResponse(npcHostileResponse);
      const charAfterHostile = pipeline.getActiveCharacter();
      const hostileNpc = charAfterHostile.investigatorDossier?.npcs?.find(
        (n) => n.name === 'Janusz Nowak'
      );

      expect(hostileNpc?.disposition).toBe('hostile');
      expect(hostileNpc?.relationshipStatus).toBe('hostile');
    });

    it('3.4: Narracyjny opis NPC zawierający przymiotnik nastawienia aktualizuje disposition ORAZ trafia do keyInformation', () => {
      // 1. Istniejący NPC
      pipeline.feedGMResponse(`
W archiwum miejskim spotykasz kustosza.
[NPC: Edward Pickman: Starszy kustosz z siwą brodą]
      `.trim());

      let npc = pipeline.getActiveCharacter().investigatorDossier?.npcs?.find((n) => n.name === 'Edward Pickman');
      expect(npc).toBeDefined();
      expect(npc?.firstImpression).toBe('Starszy kustosz z siwą brodą');

      // 2. Narracyjny update z przymiotnikiem "podejrzliwy" w całym zdaniu - NIE MOŻE zostać odrzucony jako pure disposition
      pipeline.feedGMResponse(`
Edward Pickman przygląda się twojej odznace.
[NPC: Edward Pickman: Podejrzliwy wobec symbolu, pokazuje ukryty tatuaż na przedramieniu.]
      `.trim());

      npc = pipeline.getActiveCharacter().investigatorDossier?.npcs?.find((n) => n.name === 'Edward Pickman');
      expect(npc?.disposition).toBe('suspicious');
      expect(npc?.keyInformation).toContain('Podejrzliwy wobec symbolu, pokazuje ukryty tatuaż na przedramieniu.');

      // 3. Tagi z separatorem myślnikowym / en-dash / em-dash np. [RELACJA: Edward Pickman - wrogi]
      pipeline.feedGMResponse(`
Kustosz zamyka gwałtownie kronikę i żąda opuszczenia archiwum.
[RELACJA: Edward Pickman - wrogi]
      `.trim());

      npc = pipeline.getActiveCharacter().investigatorDossier?.npcs?.find((n) => n.name === 'Edward Pickman');
      expect(npc?.disposition).toBe('hostile');
      expect(npc?.relationshipStatus).toBe('hostile');
      // Czysty token "wrogi" nie powinien zanieczyszczać keyInformation
      expect(npc?.keyInformation).not.toContain('; wrogi');

      // 4. Imiona i nazwiska z łącznikiem (np. Jean-Paul, Maria Skłodowska-Curie) w tagach relacji
      pipeline.feedGMResponse(`
Spotykasz francuskiego marynarza oraz polską badaczkę.
[RELACJA: Jean-Paul | wrogi]
[RELACJA: Maria Skłodowska-Curie – przyjazna]
      `.trim());

      const npcs = pipeline.getActiveCharacter().investigatorDossier?.npcs ?? [];
      const jeanPaul = npcs.find((n) => n.name === 'Jean-Paul');
      expect(jeanPaul).toBeDefined();
      expect(jeanPaul?.disposition).toBe('hostile');
      expect(jeanPaul?.relationshipStatus).toBe('hostile');
      // Upewnij się, że Jean-Paul nie został pocięty na "Jean"
      expect(npcs.find((n) => n.name === 'Jean')).toBeUndefined();

      const maria = npcs.find((n) => n.name === 'Maria Skłodowska-Curie');
      expect(maria).toBeDefined();
      expect(maria?.disposition).toBe('friendly');
      expect(maria?.relationshipStatus).toBe('friendly');
      expect(npcs.find((n) => n.name === 'Maria Skłodowska')).toBeUndefined();

      // Aktualizacja NPC z łącznikiem w imieniu przez separator myślnikowy
      pipeline.feedGMResponse(`
Jean-Paul uspokaja się po okazaniu dokumentów portowych.
[RELACJA: Jean-Paul - neutralny]
      `.trim());

      const updatedJean = pipeline.getActiveCharacter().investigatorDossier?.npcs?.find((n) => n.name === 'Jean-Paul');
      expect(updatedJean?.disposition).toBe('neutral');
      expect(updatedJean?.relationshipStatus).toBe('neutral');
    });
  });

  // =========================================================================
  // OBSZAR 4: Pełna wieloobszarowa pętla integracyjna (End-to-End)
  // =========================================================================
  describe('Area 4: Integrated End-to-End Mechanics Journey', () => {
    it('wykonuje spójną 5-turową podróż integrującą ekwipunek, czas, obłęd i relacje NPC', () => {
      const pipeline = new MockGMPipeline({
        initialCharacter: createMockInvestigator({
          san: 60,
          hp: 12,
        }),
        initialGameTime: {
          year: 1925,
          month: 10,
          day: 12,
          hour: 15,
          minute: 0,
        },
      });

      // TURA 1: Dzień, wejście do nowej lokacji, znalezienie noża kuchennego i dokumentu
      const t1 = pipeline.feedGMResponse(`
Wkraczasz do opuszczonej willi Blackwoodów.
[LOKACJA: Kuchnia willi Blackwoodów: Zapomniane pomieszczenie z resztkami mebli]
[PRZEDMIOT: Nóż kuchenny: Długi nóż rzeźnicki z ostrym ostrzem | broń]
[ZDOBYTY_PRZEDMIOT: Nóż kuchenny | Długi nóż rzeźnicki z ostrym ostrzem | zwykly]
[PRZEDMIOT: Dziennik lorda Blackwooda: Rękopis opisujący rytuał pełni księżyca]
[AKTUALNY CZAS: 12 Listopada 1925, 15:30]
      `);
      expect(t1.currentLocation).toBe('Kuchnia willi Blackwoodów');
      expect(pipeline.isNight()).toBe(false);

      const char1 = pipeline.getActiveCharacter();
      const defense1 = getCombatDefenseWeapons(char1);
      expect(defense1.some((w) => w.name === 'Nóż kuchenny')).toBe(true);

      const clue1 = char1.investigatorDossier?.clues?.find((c) =>
        c.title.includes('Dziennik lorda Blackwooda')
      );
      expect(clue1?.provenance).toBe('handout');

      // TURA 2: Spotkanie z ogrodnikiem, początkowa nieufność
      const t2 = pipeline.feedGMResponse(`
Z korytarza wyłania się stary ogrodnik trzymający widły.
[NPC: Thomas Ward | podejrzliwy]
      `);
      expect(t2.turn).toBe(2);
      const npc2 = pipeline.getActiveCharacter().investigatorDossier?.npcs?.find(
        (n) => n.name === 'Thomas Ward'
      );
      expect(npc2?.disposition).toBe('suspicious');

      // TURA 3: Zapadnięcie nocy, nocne wydarzenie i zmiana nastawienia ogrodnika
      const t3 = pipeline.feedGMResponse(`
Zapada zmrok. Z oddali dobiega nieludzki skowyt.
[AKTUALNY CZAS: 12 Listopada 1925, 21:15]
Thomas Ward widząc twoje opanowanie przestaje podejrzewać cię o złe zamiary.
[NPC: Thomas Ward | przyjazny]
      `);
      expect(t3.turn).toBe(3);
      expect(pipeline.isNight()).toBe(true);
      const npc3 = pipeline.getActiveCharacter().investigatorDossier?.npcs?.find(
        (n) => n.name === 'Thomas Ward'
      );
      expect(npc3?.disposition).toBe('friendly');

      // TURA 4: Atak potwora, strata SAN i Atak Szaleństwa (Bout of Madness)
      const horrorRes = pipeline.resolveSanityHorror({
        sanLoss: 6,
        reason: 'Widok bezkształtnej mazi wyłaniającej się ze studni',
        intPassed: true,
        forceBoutIndex: 1, // Amnesia / ucieczka
      });
      expect(horrorRes.charAfter.san).toBe(54);
      expect(pipeline.getActiveCharacter().activeBoutOfMadness).toBeDefined();

      // TURA 5: Kontynuacja rozgrywki bez zawieszenia i pomyślny pełny zapis gry
      const t5 = pipeline.processAction(
        'Biegnę w stronę wyjścia wymachując nożem kuchennym!',
        `
Uciekasz przez ogród. Zimne nocne powietrze powoli przywraca ci zmysły.
[LOKACJA: Brama posiadłości: Żelazne wrota stojące otworem ku drodze do Arkham]
[AKTUALNY CZAS: 12 Listopada 1925, 22:00]
        `
      );
      expect(t5.currentLocation).toBe('Brama posiadłości');
      expect(pipeline.getTurnCount()).toBe(5);

      const save = pipeline.createFullSave('Willa Blackwoodów - ucieczka');
      expect(save.characters[0].hp).toBe(12);
      expect(save.characters[0].san).toBe(54);
      expect(save.messages.length).toBe(6); // 5 assistant + 1 user
    });
  });
});
