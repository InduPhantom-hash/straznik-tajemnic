import {
  extractPutativeEvent,
  adjudicatePutativeEvent,
  resolveToRealEvent,
  buildConcordiaEventResolutionDirective,
  adjudicateEventPipeline,
} from './event-resolution';
import type { Character, NPC } from '../types';

describe('Concordia EventResolution & Intent Adjudication', () => {
  const dummyCharacter: Character = {
    id: 'char-1',
    name: 'Edward Carnby',
    occupation: 'Prywatny Detektyw',
    age: 38,
    gender: 'male',
    residence: 'Boston',
    birthplace: 'Arkham',
    era: '1920s',
    san: 55,
    maxSan: 99,
    hp: 12,
    maxHp: 12,
    mp: 10,
    maxMp: 10,
    str: 60,
    dex: 65,
    int: 75,
    con: 50,
    app: 45,
    pow: 55,
    siz: 65,
    edu: 70,
    luck: 50,
    skills: {
      'Broń Palna (Krótka)': 60,
      'Walka Wręcz (Bijatyka)': 50,
      Spostrzegawczość: 65,
      Ślusarstwo: 40,
      Skradanie: 50,
      Perswazja: 45,
    },
    equipment: [
      { id: 'eq-1', name: 'Zestaw wytrychów', category: 'tool', quantity: 1 },
      { id: 'eq-2', name: 'Notes i ołówek', category: 'personal', quantity: 1 },
      { id: 'eq-3', name: 'Zapałki', category: 'personal', quantity: 20 },
      { id: 'w-1', name: 'Rewolwer .38 Special', category: 'weapon', quantity: 1 },
    ],
  } as unknown as Character;

  describe('extractPutativeEvent', () => {
    it('ekstrahuje wypowiedź dosłowną (direct quote) z cudzysłowów', () => {
      const msg = 'Mówię do barmana: "Czy widziałeś wczoraj profesora Armitage\'a?" i czekam na reakcję.';
      const pe = extractPutativeEvent(msg, 'Edward');

      expect(pe.actorName).toBe('Edward');
      expect(pe.directQuote).toBe("Czy widziałeś wczoraj profesora Armitage'a?");
      expect(pe.rawText).toBe(msg);
    });

    it('oczyszcza deklarację z samowolnego autosukcesu gracza', () => {
      const msg = 'Wbiegam do pokoju, uderzam kultystę i zabijam go jednym ciosem!';
      const pe = extractPutativeEvent(msg, 'Edward');

      expect(pe.actionAttempt).not.toContain('i zabijam go');
      expect(pe.actionAttempt).toContain('[próbuje przeprowadzić akcję]');
    });

    it('obsługuje pusty lub biały ciąg znaków bez błędu', () => {
      const pe = extractPutativeEvent('   ', 'Edward');
      expect(pe.actionAttempt).toBe('brak deklaracji akcji (milczenie/oczekiwanie)');
    });
  });

  describe('adjudicatePutativeEvent', () => {
    it('blokuje jakąkolwiek akcję fizyczną gdy postać jest nieprzytomna (0 HP)', () => {
      const deadChar: Character = { ...dummyCharacter, hp: 0 };
      const pe = extractPutativeEvent('Próbuję wstać i uciec z piwnicy', 'Edward');
      const result = adjudicatePutativeEvent(pe, { character: deadChar });

      expect(result.plausibility).toBe('impossible');
      expect(result.suggestedOutcome).toBe('blocked_impossible');
      expect(result.plausibilityReason).toContain('0 HP');
    });

    it('zastosowuje Twarde Weto Sędziego dla nadludzkiej/niemożliwej akcji', () => {
      const pe = extractPutativeEvent('Unoszę się w powietrzu i strzelam laserem z oczu w potwora', 'Edward');
      const result = adjudicatePutativeEvent(pe, { character: dummyCharacter });

      expect(result.plausibility).toBe('impossible');
      expect(result.suggestedOutcome).toBe('blocked_impossible');
      expect(result.plausibilityReason).toContain('Twarde Weto Sędziego');
    });

    it('blokuje strzał z broni palnej gdy badacz nie posiada broni w ekwipunku', () => {
      const unarmedChar: Character = {
        ...dummyCharacter,
        equipment: [{ id: 'eq-1', name: 'Zapałki', category: 'personal', quantity: 5 }],
      };
      const pe = extractPutativeEvent('Wyciągam rewolwer i strzelam do uciekającego szpiega', 'Edward');
      const result = adjudicatePutativeEvent(pe, { character: unarmedChar });

      expect(result.plausibility).toBe('impossible');
      expect(result.missingRequirements).toContain('broń palna');
      expect(result.suggestedOutcome).toBe('blocked_impossible');
    });

    it('identyfikuje konieczność testu Broń Palna gdy postać posiada broń', () => {
      const pe = extractPutativeEvent('Celuję i strzelam do napastnika z rewolweru', 'Edward');
      const result = adjudicatePutativeEvent(pe, { character: dummyCharacter });

      expect(result.plausibility).toBe('plausible');
      expect(result.requiresCheck).toBe(true);
      expect(result.checkRequirement?.skillOrAttribute).toBe('Broń Palna (Krótka)');
      expect(result.suggestedOutcome).toBe('pending_check');
      expect(result.isAutosuccessAllowed).toBe(false);
    });

    it('wymusza test przeciwstawny przy walce wręcz', () => {
      const pe = extractPutativeEvent('Rzucam się na napastnika i zadaję cios pięścią w szczękę', 'Edward');
      const result = adjudicatePutativeEvent(pe, { character: dummyCharacter });

      expect(result.category).toBe('combat');
      expect(result.requiresCheck).toBe(true);
      expect(result.checkRequirement?.opposed).toBe(true);
      expect(result.checkRequirement?.skillOrAttribute).toBe('Walka Wręcz (Bijatyka)');
      expect(result.suggestedOutcome).toBe('pending_check');
    });

    it('identyfikuje test Ślusarstwa i uwzględnia obecność wytrychów w ekwipunku', () => {
      const pe = extractPutativeEvent('Używam wytrycha i otwieram zamek w biurku', 'Edward');
      const result = adjudicatePutativeEvent(pe, { character: dummyCharacter });

      expect(result.category).toBe('investigative');
      expect(result.requiresCheck).toBe(true);
      expect(result.checkRequirement?.skillOrAttribute).toBe('Ślusarstwo');
      expect(result.checkRequirement?.difficulty).toBe('regular');
      expect(result.missingRequirements).toBeUndefined();
    });

    it('podnosi trudność ślusarstwa do hard przy braku narzędzi', () => {
      const noToolsChar: Character = { ...dummyCharacter, equipment: [] };
      const pe = extractPutativeEvent('Otwieram zamek wytrychem majstrując spinką', 'Edward');
      const result = adjudicatePutativeEvent(pe, { character: noToolsChar });

      expect(result.requiresCheck).toBe(true);
      expect(result.checkRequirement?.difficulty).toBe('hard');
      expect(result.missingRequirements).toContain('wytrychy');
    });

    it('wymusza test Skradania (przeciwstawny gdy w scenie obecni są NPC)', () => {
      const npcs: NPC[] = [{ id: 'npc-1', name: 'Strażnik doków', status: 'alive' } as unknown as NPC];
      const pe = extractPutativeEvent('Skradam się po cichu za skrzyniami obok wartownika', 'Edward');
      const result = adjudicatePutativeEvent(pe, { character: dummyCharacter, npcs });

      expect(result.category).toBe('stealth');
      expect(result.requiresCheck).toBe(true);
      expect(result.checkRequirement?.skillOrAttribute).toBe('Skradanie');
      expect(result.checkRequirement?.opposed).toBe(true);
    });

    it('wymusza test Spostrzegawczości przy przeszukiwaniu pokoju', () => {
      const pe = extractPutativeEvent('Dokładnie przeszukuję gabinet w poszukiwaniu skrytki', 'Edward');
      const result = adjudicatePutativeEvent(pe, { character: dummyCharacter });

      expect(result.requiresCheck).toBe(true);
      expect(result.checkRequirement?.skillOrAttribute).toBe('Spostrzegawczość');
      expect(result.suggestedOutcome).toBe('pending_check');
    });

    it('egzekwuje regułę Pushback dla prób perswazji i zastraszania NPC', () => {
      const pe = extractPutativeEvent('Zastraszam podejrzanego i grożę mu pobiciem jeśli nie wyjawi prawdy', 'Edward');
      const result = adjudicatePutativeEvent(pe, { character: dummyCharacter });

      expect(result.category).toBe('social');
      expect(result.requiresCheck).toBe(true);
      expect(result.checkRequirement?.skillOrAttribute).toBe('Zastraszanie');
      expect(result.checkRequirement?.opposed).toBe(true);
      expect(result.isAutosuccessAllowed).toBe(false);
    });

    it('zezwala na autosukces dla czynności całkowicie rutynowych i bezpiecznych', () => {
      const pe = extractPutativeEvent('Siadam w fotelu, wyciągam zapałki i zapalam papierosa', 'Edward');
      const result = adjudicatePutativeEvent(pe, { character: dummyCharacter });

      expect(result.category).toBe('mundane');
      expect(result.requiresCheck).toBe(false);
      expect(result.isAutosuccessAllowed).toBe(true);
      expect(result.suggestedOutcome).toBe('auto_success');
    });
  });

  describe('resolveToRealEvent & buildConcordiaEventResolutionDirective', () => {
    it('tworzy RealEvent ze statusem blocked dla niemożliwej akcji', () => {
      const pe = extractPutativeEvent('Podnoszę 10-tonowy głaz gołymi rękami', 'Edward');
      const adj = adjudicatePutativeEvent(pe, { character: dummyCharacter });
      const re = resolveToRealEvent(pe, adj, 'pl');

      expect(re.status).toBe('blocked');
      expect(re.groundedFact).toContain('fizycznie lub sytuacyjnie niemożliwe');
      expect(re.mechanicalDirective).toContain('TWARDE WETO SĘDZIEGO');
    });

    it('tworzy RealEvent ze statusem check_required i tagiem [TEST:] dla niepewnej akcji', () => {
      const pe = extractPutativeEvent('Przeszukuję biurko profesora', 'Edward');
      const adj = adjudicatePutativeEvent(pe, { character: dummyCharacter });
      const re = resolveToRealEvent(pe, adj, 'pl');

      expect(re.status).toBe('check_required');
      expect(re.groundedFact).toContain('[TEST: Spostrzegawczość | zwykły]');
      expect(re.mechanicalDirective).toContain('[TEST: Spostrzegawczość | zwykły |');
    });

    it('tworzy spójną dyrektywę dla modelu w języku angielskim (locale = en)', () => {
      const pe = extractPutativeEvent('I pick the door lock quietly', 'Edward');
      const adj = adjudicatePutativeEvent(pe, { character: dummyCharacter, locale: 'en' });
      const re = resolveToRealEvent(pe, adj, 'en');
      const directive = buildConcordiaEventResolutionDirective(re, 'en');

      expect(directive).toContain('## EVENT RESOLUTION & INTENT ADJUDICATION (CONCORDIA GM PATTERN)');
      expect(directive).toContain('GROUNDED FACT (REAL EVENT):');
      expect(directive).toContain('ANTI-AUTOSUCCESS INVARIANT:');
    });

    it('tworzy spójną dyrektywę dla modelu w języku polskim (locale = pl)', () => {
      const pe = extractPutativeEvent('Wyłamuję zamek wytrychem', 'Edward');
      const adj = adjudicatePutativeEvent(pe, { character: dummyCharacter, locale: 'pl' });
      const re = resolveToRealEvent(pe, adj, 'pl');
      const directive = buildConcordiaEventResolutionDirective(re, 'pl');

      expect(directive).toContain('## ADJUDYKACJA ZDARZEŃ I INTENCJI GRACZA (CONCORDIA EVENT RESOLUTION)');
      expect(directive).toContain('UGRUNTOWANY FAKT (REAL EVENT):');
      expect(directive).toContain('ŻELAZNY ZAKAZ AUTOSUKCESU (INWARIANT CONCORDIA):');
    });
  });

  describe('adjudicateEventPipeline benchmark & latency (<400 ms)', () => {
    it('wykonuje cały potok adjudykacji w czasie znacznie poniżej 400 ms', () => {
      const start = performance.now();
      const output = adjudicateEventPipeline('Mówię do policjanta i próbuję go przekonać do wpuszczenia na miejsce zbrodni', {
        character: dummyCharacter,
        locale: 'pl',
      });
      const durationMs = performance.now() - start;

      expect(durationMs).toBeLessThan(400);
      expect(output.putativeEvent).toBeDefined();
      expect(output.adjudication.requiresCheck).toBe(true);
      expect(output.realEvent.status).toBe('check_required');
      expect(output.directive).toContain('ADJUDYKACJA ZDARZEŃ');
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('poprawnie obsługuje wielkie litery (case-insensitivity)', () => {
      const pe = extractPutativeEvent('STRZELAM DO KULTYSTY Z REWOLWERU', 'Edward');
      const adj = adjudicatePutativeEvent(pe, { character: dummyCharacter });

      expect(adj.requiresCheck).toBe(true);
      expect(adj.checkRequirement?.skillOrAttribute).toBe('Broń Palna (Krótka)');
    });

    it('obsługuje złożoną deklarację z mową, obserwacją i akcją', () => {
      const msg = 'Podchodzę do biurka, mówię: "Sprawdźmy ten blat" i dokładnie przeszukuję szuflady w poszukiwaniu skrytki.';
      const output = adjudicateEventPipeline(msg, { character: dummyCharacter, locale: 'pl' });

      expect(output.putativeEvent.directQuote).toBe('Sprawdźmy ten blat');
      expect(output.adjudication.requiresCheck).toBe(true);
      expect(output.adjudication.checkRequirement?.skillOrAttribute).toBe('Spostrzegawczość');
      expect(output.realEvent.status).toBe('check_required');
    });

    it('obsługuje francuskie cudzysłowy «...» przy wypowiedziach', () => {
      const msg = 'Mówię do komisarza: «Nie ma pan pojęcia, co kryje się w tych kanałach» i czekam na reakcję.';
      const pe = extractPutativeEvent(msg, 'Edward');

      expect(pe.directQuote).toBe('Nie ma pan pojęcia, co kryje się w tych kanałach');
    });

    it('obsługuje brak postaci w kontekście (fallback dla badacza ogólnego)', () => {
      const output = adjudicateEventPipeline('Szukam śladów stóp na śniegu', { character: null, locale: 'pl' });

      expect(output.putativeEvent.actorName).toBe('Badacz');
      expect(output.adjudication.requiresCheck).toBe(true);
      expect(output.adjudication.checkRequirement?.skillOrAttribute).toBe('Spostrzegawczość');
    });

    it('obsługuje postać bez ekwipunku i uzbrojenia (puste tablice)', () => {
      const nakedChar: Character = {
        ...dummyCharacter,
        equipment: [],
      };
      const output = adjudicateEventPipeline('Strzelam z pistoletu maszynowego Thompson', {
        character: nakedChar,
        locale: 'pl',
      });

      expect(output.adjudication.plausibility).toBe('impossible');
      expect(output.adjudication.suggestedOutcome).toBe('blocked_impossible');
      expect(output.realEvent.status).toBe('blocked');
    });

    it('obsługuje bezstanowość cytatów przy wielokrotnych kolejnych wywołaniach (brak błędu lastIndex)', () => {
      const msg1 = 'Mówię: "Pierwsza kwestia" i czekam.';
      const msg2 = 'Mówię: "Druga kwestia" i patrzę.';
      const msg3 = 'Mówię: "Trzecia kwestia" i kiwam głową.';

      const pe1 = extractPutativeEvent(msg1, 'Edward');
      const pe2 = extractPutativeEvent(msg2, 'Edward');
      const pe3 = extractPutativeEvent(msg3, 'Edward');

      expect(pe1.directQuote).toBe('Pierwsza kwestia');
      expect(pe2.directQuote).toBe('Druga kwestia');
      expect(pe3.directQuote).toBe('Trzecia kwestia');
    });

    it('rozpoznaje historyczną i polską broń II RP z katalogu (Luger, Vis, Nagant, Dubeltówka, Winchester)', () => {
      const armedChar: Character = {
        ...dummyCharacter,
        equipment: [
          { id: 'w-1', name: 'Vis wz. 35', category: 'weapon', quantity: 1 },
          { id: 'w-2', name: 'Dubeltówka horyzontalna', category: 'weapon', quantity: 1 },
        ],
      } as unknown as Character;

      // Strzał z pistoletu Vis wz. 35
      const peHandgun = extractPutativeEvent('Oddaję strzał z Visa do uciekającego szpiega', 'Edward');
      const adjHandgun = adjudicatePutativeEvent(peHandgun, { character: armedChar });
      expect(adjHandgun.plausibility).toBe('plausible');
      expect(adjHandgun.requiresCheck).toBe(true);
      expect(adjHandgun.checkRequirement?.skillOrAttribute).toBe('Broń Palna (Krótka)');

      // Strzał z dubeltówki (broń długa)
      const peLong = extractPutativeEvent('Wypalam z dubeltówki do bestii', 'Edward');
      const adjLong = adjudicatePutativeEvent(peLong, { character: armedChar });
      expect(adjLong.plausibility).toBe('plausible');
      expect(adjLong.requiresCheck).toBe(true);
      expect(adjLong.checkRequirement?.skillOrAttribute).toBe('Broń Palna (Długa)');
    });

    it('poprawnie wykrywa polskie deklaracje strzału (Oddaję strzał, Otwieram ogień)', () => {
      const pe1 = extractPutativeEvent('Oddaję strzał w kierunku cienia', 'Edward');
      const adj1 = adjudicatePutativeEvent(pe1, { character: dummyCharacter });
      expect(adj1.requiresCheck).toBe(true);
      expect(adj1.category).toBe('combat');

      const pe2 = extractPutativeEvent('Otwieram ogień do nacierających kultystów', 'Edward');
      const adj2 = adjudicatePutativeEvent(pe2, { character: dummyCharacter });
      expect(adj2.requiresCheck).toBe(true);
      expect(adj2.category).toBe('combat');
    });

    it('poprawnie wykrywa polskie deklaracje walki wręcz (Walczę, Wyprowadzam cios)', () => {
      const pe1 = extractPutativeEvent('Walczę ze strażnikiem i próbuję go powalić', 'Edward');
      const adj1 = adjudicatePutativeEvent(pe1, { character: dummyCharacter });
      expect(adj1.requiresCheck).toBe(true);
      expect(adj1.checkRequirement?.skillOrAttribute).toBe('Walka Wręcz (Bijatyka)');
      expect(adj1.checkRequirement?.opposed).toBe(true);

      const pe2 = extractPutativeEvent('Wyprowadzam cios pięścią w nos', 'Edward');
      const adj2 = adjudicatePutativeEvent(pe2, { character: dummyCharacter });
      expect(adj2.requiresCheck).toBe(true);
      expect(adj2.checkRequirement?.skillOrAttribute).toBe('Walka Wręcz (Bijatyka)');
    });

    it('identyfikuje akcje okultystyczne i Mity Cthulhu (zaklęcia, rytuały, Necronomicon)', () => {
      const peOccult = extractPutativeEvent('Odprawiam ochronny rytuał ze starego grymuaru', 'Edward');
      const adjOccult = adjudicatePutativeEvent(peOccult, { character: dummyCharacter });
      expect(adjOccult.category).toBe('occult');
      expect(adjOccult.requiresCheck).toBe(true);
      expect(adjOccult.checkRequirement?.skillOrAttribute).toBe('Okultyzm');
      expect(adjOccult.checkRequirement?.difficulty).toBe('hard');

      const peMythos = extractPutativeEvent('Recytuję formułę z Necronomiconu przyzywającą istotę', 'Edward');
      const adjMythos = adjudicatePutativeEvent(peMythos, { character: dummyCharacter });
      expect(adjMythos.category).toBe('occult');
      expect(adjMythos.requiresCheck).toBe(true);
      expect(adjMythos.checkRequirement?.skillOrAttribute).toBe('Mity Cthulhu');
      expect(adjMythos.checkRequirement?.difficulty).toBe('hard');
    });

    it('identyfikuje akcje sprawnościowe: Wspinaczka, Skakanie, Pływanie', () => {
      const peClimb = extractPutativeEvent('Wspinam się po rynnie na dach kamienicy', 'Edward');
      const adjClimb = adjudicatePutativeEvent(peClimb, { character: dummyCharacter });
      expect(adjClimb.requiresCheck).toBe(true);
      expect(adjClimb.checkRequirement?.skillOrAttribute).toBe('Wspinaczka');

      const peJump = extractPutativeEvent('Skaczę przez rozpadlinę na sąsiedni balkon', 'Edward');
      const adjJump = adjudicatePutativeEvent(peJump, { character: dummyCharacter });
      expect(adjJump.requiresCheck).toBe(true);
      expect(adjJump.checkRequirement?.skillOrAttribute).toBe('Skakanie');

      const peSwim = extractPutativeEvent('Płynę wpław przez rwącą rzekę Miskatonic', 'Edward');
      const adjSwim = adjudicatePutativeEvent(peSwim, { character: dummyCharacter });
      expect(adjSwim.requiresCheck).toBe(true);
      expect(adjSwim.checkRequirement?.skillOrAttribute).toBe('Pływanie');
    });

    it('zwykłe rozglądanie się (Rozglądam się) nie wymusza testu Spostrzegawczości', () => {
      const pe = extractPutativeEvent('Rozglądam się po salonie', 'Edward');
      const adj = adjudicatePutativeEvent(pe, { character: dummyCharacter });
      expect(adj.category).toBe('mundane');
      expect(adj.requiresCheck).toBe(false);
      expect(adj.suggestedOutcome).toBe('auto_success');
    });

    it('chowanie rewolweru do kieszeni to czynność zwykła, a nie test Skradania', () => {
      const pe = extractPutativeEvent('Chowam rewolwer do wewnętrznej kieszeni płaszcza', 'Edward');
      const adj = adjudicatePutativeEvent(pe, { character: dummyCharacter });
      expect(adj.category).toBe('mundane');
      expect(adj.requiresCheck).toBe(false);
      expect(adj.suggestedOutcome).toBe('auto_success');
    });

    it('pytania poza postacią (OOC) nie wymagają rzutu i są dozwolone', () => {
      const pe = extractPutativeEvent('((MG: czy w tym pokoju jest telefon?))', 'Edward');
      const adj = adjudicatePutativeEvent(pe, { character: dummyCharacter });
      expect(adj.category).toBe('dialogue');
      expect(adj.requiresCheck).toBe(false);
      expect(adj.suggestedOutcome).toBe('auto_success');
    });

    it('rozpoznaje prefiks aktora @Name: w Hot Seat i przypisuje test do właściwej postaci', () => {
      const characters: Character[] = [
        dummyCharacter,
        { ...dummyCharacter, id: 'char-2', name: 'Margaret Sullivan' },
      ];
      const output = adjudicateEventPipeline('@Margaret Sullivan: Przeszukuję dokładnie szuflady biurka', {
        character: dummyCharacter,
        characters,
        locale: 'pl',
      });

      expect(output.putativeEvent.actorName).toBe('Margaret Sullivan');
      expect(output.putativeEvent.actionAttempt).toBe('Przeszukuję dokładnie szuflady biurka');
      expect(output.realEvent.mechanicalDirective).toContain('[TEST: @Margaret Sullivan: Spostrzegawczość');
    });
  });

  describe('Dice roll message resolution (Anti-Loop Invariant)', () => {
    it('rozpoznaje wynik rzutu kością z Tacki i generuje dyrektywę domknięcia bez ponownego testu', () => {
      const rollMsg = `[🎲 Test: Skradanie (50%)]
Wynik: 23 → ✅ Zwykły sukces
Progi: Zwykły ≤50 | Trudny ≤25 | Ekstremalny ≤10
(Rzut wirtualny)`;

      const output = adjudicateEventPipeline(rollMsg, { character: dummyCharacter, locale: 'pl' });

      expect(output.putativeEvent.isDiceRoll).toBe(true);
      expect(output.adjudication.requiresCheck).toBe(false);
      expect(output.realEvent.status).toBe('established');
      expect(output.realEvent.groundedFact).toContain('wykonał rzut kością (Skradanie)');
      expect(output.realEvent.groundedFact).toContain('Zwykły sukces');
      expect(output.directive).toContain('INWARIANT DOMKNIĘCIA RZUTU (ZAKAZ ZAPĘTLANIA TESTÓW)');
      expect(output.directive).toContain('BEZWZGLĘDNY ZAKAZ ponownego emitowania tagu [TEST:]');
    });

    it('obsługuje wynik rzutu w formacie systemowym [DICE_ROLL]', () => {
      const rollMsg = '[DICE_ROLL] Edward Carnby wykonał test umiejętności "Walka Wręcz (Bijatyka)" (50%): wynik 15, HARD - SUKCES';
      const output = adjudicateEventPipeline(rollMsg, { character: dummyCharacter, locale: 'en' });

      expect(output.putativeEvent.isDiceRoll).toBe(true);
      expect(output.adjudication.requiresCheck).toBe(false);
      expect(output.realEvent.status).toBe('established');
      expect(output.directive).toContain('ANTI-LOOP & RESOLUTION INVARIANT');
      expect(output.directive).toContain('Do NOT call for a new test or emit [TEST:]');
    });
  });
});
