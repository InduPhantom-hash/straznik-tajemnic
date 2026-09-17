import {
  sanitizeMechanicalTags,
  sanitizeDiegeticProse,
  cleanResponseText,
  stripAITags,
  stripMultilineArtifacts,
} from '../text-cleaner';

describe('Diegetic Prose Cleaner & Tag Sanitizer (SillyTavern Adaptation)', () => {
  describe('sanitizeMechanicalTags', () => {
    it('wycina wszelkie tagi testów, kości i wyników mechanicznych', () => {
      const input =
        'Rozglądasz się po pokoju. [TEST: Spostrzegawczość | trudny] [WYNIK: Sukces] [🎲 k100=23] Widzisz ślady krwi na dywanie.';
      const output = sanitizeMechanicalTags(input);
      expect(output).not.toContain('[TEST:');
      expect(output).not.toContain('[WYNIK:');
      expect(output).not.toContain('[🎲');
      expect(output).toContain('Rozglądasz się po pokoju.');
      expect(output).toContain('Widzisz ślady krwi na dywanie.');
    });

    it('wycina bloki dziennika oraz pojedyncze tagi protokołu śledczego', () => {
      const input =
        'Otwierasz szufladę. [DZIENNIK:trop:Stary list]List wskazuje na Arkham Sanatorium.[/DZIENNIK] [DZIENNIK:poszlaka:Złoty klucz] Znajdujesz także klucz.';
      const output = sanitizeMechanicalTags(input);
      expect(output).not.toContain('[DZIENNIK');
      expect(output).not.toContain('Arkham Sanatorium');
      expect(output).toContain('Otwierasz szufladę.');
      expect(output).toContain('Znajdujesz także klucz.');
    });

    it('wycina tagi NPC, lokacji, przedmiotów i stanów postaci', () => {
      const input =
        '[NPC: Arthur Vance, bibliotekarz, neutralny] [LOKACJA: Miskatonic Library] [PRZEDMIOT: Stary manuskrypt] [STAN: HP: -2 | zacięcie] Arthur podaje ci tom.';
      const output = sanitizeMechanicalTags(input);
      expect(output).not.toContain('[NPC:');
      expect(output).not.toContain('[LOKACJA:');
      expect(output).not.toContain('[PRZEDMIOT:');
      expect(output).not.toContain('[STAN:');
      expect(output.trim()).toBe('Arthur podaje ci tom.');
    });

    it('wycina tagi walki, pościgu, czarów i tomów', () => {
      const input =
        'Kultysta rzuca się na ciebie! [WALKA: ATAK_WRĘCZ: Sztylet] [OBRONA: Unik] [CZAR: Przekleństwo Azathotha] [TOM: Necronomicon] Unikasz ciosu w ostatniej chwili.';
      const output = sanitizeMechanicalTags(input);
      expect(output).not.toContain('[WALKA:');
      expect(output).not.toContain('[OBRONA:');
      expect(output).not.toContain('[CZAR:');
      expect(output).not.toContain('[TOM:');
      expect(output).toContain('Unikasz ciosu w ostatniej chwili.');
    });

    it('wycina tagi Depth Injection, Author Note i Pacing Directive', () => {
      const input =
        '[DYNAMIC SCENE & PACING INJECTION: BIEG 3 - WALKA: 30-70 słów] [AUTHOR\'S NOTE: Narastająca paranoja] [PRZYPOMNIENIE DLA MG: Trzymaj mrok] Cień porusza się w kącie pokoju.';
      const output = sanitizeMechanicalTags(input);
      expect(output).not.toContain('DYNAMIC SCENE');
      expect(output).not.toContain('AUTHOR\'S NOTE');
      expect(output).not.toContain('PRZYPOMNIENIE DLA MG');
      expect(output.trim()).toBe('Cień porusza się w kącie pokoju.');
    });

    it('wycina wieloliniowe bloki Depth Injection / Pacing Directive z ich treścią wewnętrzną', () => {
      const input =
        'Zatrzymujesz się przed wejściem.\n[PRZYPOMNIENIE DLA MG: DYNAMICZNA SCENA I PACING]\nAtmosfera sceny: Mrok\nTon nastroju: Paranoja\nRygor CoC 7e RAW: Trzymaj grozę.\n[/PRZYPOMNIENIE DLA MG]\nWidzisz uchylone drzwi.';
      const output = sanitizeMechanicalTags(input);
      expect(output).not.toContain('PRZYPOMNIENIE DLA MG');
      expect(output).not.toContain('Atmosfera sceny:');
      expect(output).not.toContain('Rygor CoC 7e RAW');
      expect(output).toContain('Zatrzymujesz się przed wejściem.');
      expect(output).toContain('Widzisz uchylone drzwi.');
    });

    it('usuwa niedomknięty tag techniczny z końca uciętego streamu', () => {
      const input = 'Wchodzisz do piwnicy. [DZIENNIK:trop:Ucięty';
      const output = sanitizeMechanicalTags(input);
      expect(output.trim()).toBe('Wchodzisz do piwnicy.');
    });
  });

  describe('sanitizeDiegeticProse', () => {
    it('czyści wycieki nagłówków formularza i baz danych (Anti-Form Leakage)', () => {
      const input =
        'Cechy fizyczne i manieryzm: Mężczyzna ma głęboką bliznę na prawym policzku.\nPozycja społeczna: Znany mecenas sztuki w Bostonie.\nUkryty cel: Zdobycie rzeźby Cthulhu za wszelką cenę.\n- Czy mogę panu w czymś pomóc? - pyta chłodno.';
      const output = sanitizeDiegeticProse(input);
      expect(output).not.toContain('Cechy fizyczne i manieryzm:');
      expect(output).not.toContain('Pozycja społeczna:');
      expect(output).not.toContain('Ukryty cel:');
      expect(output).toContain('Mężczyzna ma głęboką bliznę na prawym policzku.');
      expect(output).toContain('Znany mecenas sztuki w Bostonie.');
      expect(output).toContain('Zdobycie rzeźby Cthulhu za wszelką cenę.');
      expect(output).toContain('- Czy mogę panu w czymś pomóc? - pyta chłodno.');
    });

    it('czyści nagłówki formularzy w wariantach markdownowych (pogrubienie, punktor, dwukropek)', () => {
      const input =
        '- **Cechy fizyczne:** Wysoki mężczyzna o siwych włosach.\n- **Social status**: Arystokrata.\n*Wymiar psychologiczny:* Skrywa traumę z frontu.\n• Hidden agenda - Zdobycie amuletu.\nOpis postaci: Zmęczony lekarz.';
      const output = sanitizeDiegeticProse(input);
      expect(output).not.toContain('Cechy fizyczne');
      expect(output).not.toContain('Social status');
      expect(output).not.toContain('Wymiar psychologiczny');
      expect(output).not.toContain('Hidden agenda');
      expect(output).not.toContain('Opis postaci');
      expect(output).not.toContain('**');
      expect(output).toContain('Wysoki mężczyzna o siwych włosach.');
      expect(output).toContain('Arystokrata.');
      expect(output).toContain('Skrywa traumę z frontu.');
      expect(output).toContain('Zdobycie amuletu.');
      expect(output).toContain('Zmęczony lekarz.');
    });

    it('czyści nagłówki formularzy w języku angielskim', () => {
      const input =
        'Physical traits: Tall, pale man in a trenchcoat.\nSocial status: High society physician.\nHidden agenda: Fears being exposed.\n"The patient is waiting," he whispers.';
      const output = sanitizeDiegeticProse(input);
      expect(output).not.toContain('Physical traits:');
      expect(output).not.toContain('Social status:');
      expect(output).not.toContain('Hidden agenda:');
      expect(output).toContain('Tall, pale man in a trenchcoat.');
    });

    it('formatuje dialogi na styl maszynopisu lat 20. z pojedynczym myślnikiem (- )', () => {
      const input =
        '— Proszę wejść — rzekł gospodarz.\n– Za późno na ucieczkę – dodał cicho.\n„Gdzie są klucze?”';
      const output = sanitizeDiegeticProse(input, { normalizeDialogues: true });
      expect(output).not.toContain('—');
      expect(output).not.toContain('–');
      expect(output).toContain('- Proszę wejść - rzekł gospodarz.');
      expect(output).toContain('- Za późno na ucieczkę - dodał cicho.');
      expect(output).toContain('- Gdzie są klucze?');
    });

    it('normalizuje kwestie dialogowe z atrybucją narracyjną do stylu lat 20.', () => {
      const input =
        '„Kim pan jest?” - zapytał cicho.\n"Proszę natychmiast wyjść" - zawołała gospodyni.';
      const output = sanitizeDiegeticProse(input, { normalizeDialogues: true });
      expect(output).toContain('- Kim pan jest? - zapytał cicho.');
      expect(output).toContain('- Proszę natychmiast wyjść - zawołała gospodyni.');
    });

    it('wyciąga treść didaskaliów z nawiasów klamrowych', () => {
      const input = '{Budzisz się w zimnym gabinecie doktora.} Za oknem słychać deszcz.';
      const output = sanitizeDiegeticProse(input);
      expect(output).not.toContain('{');
      expect(output).not.toContain('}');
      expect(output).toBe('Budzisz się w zimnym gabinecie doktora. Za oknem słychać deszcz.');
    });

    it('usuwa prefiksy Mistrza Gry i asystenta', () => {
      const input = 'Mistrz Gry: Wchodzisz do ciemnego korytarza.\nMG: Słyszysz kroki.';
      const output = sanitizeDiegeticProse(input);
      expect(output).not.toMatch(/^Mistrz Gry:/);
      expect(output).not.toContain('MG:');
      expect(output).toContain('Wchodzisz do ciemnego korytarza.');
      expect(output).toContain('Słyszysz kroki.');
    });
  });

  describe('cleanResponseText & stripAITags integration', () => {
    it('cleanResponseText nie przepuszcza żadnych tagów mechanicznych ani form leaków do TTS', () => {
      const input =
        'MG: Cechy fizyczne: Blady człowiek. [TEST: Spostrzegawczość] [LOKACJA: Zaułek] [DZIENNIK:trop:Cień] "Uważaj!" - krzyczy.';
      const output = cleanResponseText(input);
      expect(output).not.toContain('MG:');
      expect(output).not.toContain('Cechy fizyczne:');
      expect(output).not.toContain('[TEST:');
      expect(output).not.toContain('[LOKACJA:');
      expect(output).not.toContain('[DZIENNIK:');
      expect(output).toContain('Blady człowiek.');
      expect(output).toContain('Uważaj! - krzyczy.');
    });

    it('stripAITags skutecznie usuwa tagi nawiasowe zachowując formatowanie markdown', () => {
      const input =
        '**Miskatonic Club** [LOKACJA: Klub] [NPC: Lord Henry] *Lord Henry* pali fajkę.';
      const output = stripAITags(input);
      expect(output).not.toContain('[LOKACJA:');
      expect(output).not.toContain('[NPC:');
      expect(output).toBe('**Miskatonic Club** *Lord Henry* pali fajkę.');
    });

    it('stripMultilineArtifacts usuwa bloki Pacing Directive przed lektorem TTS', () => {
      const input =
        'Cisza zalega w korytarzu.\n[GM DIRECTIVE: DYNAMIC SCENE & PACING INJECTION]\nAtmosphere: Dread\nCoC 7e RAW: Enforce tension.\n[/GM DIRECTIVE]\nSłychać powolne kroki.';
      const output = stripMultilineArtifacts(input);
      expect(output).not.toContain('GM DIRECTIVE');
      expect(output).not.toContain('Atmosphere: Dread');
      expect(output).toContain('Cisza zalega w korytarzu.');
      expect(output).toContain('Słychać powolne kroki.');
    });

    it('stripMultilineArtifacts usuwa niezamknięty blok Depth Injection podczas streamingu', () => {
      const input =
        'Korytarz spowity jest mgłą.\n[PRZYPOMNIENIE DLA MG: DYNAMICZNA SCENA I PACING]\nAtmosfera sceny: Mrok i chłód, które dopiero się strumieniują...';
      const output = stripMultilineArtifacts(input);
      expect(output).toContain('Korytarz spowity jest mgłą.');
      expect(output).not.toContain('PRZYPOMNIENIE DLA MG');
      expect(output).not.toContain('Atmosfera sceny:');
      expect(output).not.toContain('strumieniują');
    });

    it('cleanResponseText oczyszcza tagi GUARDRAIL_LEVEL, WETO_SEDZIEGO oraz GAME_OVER przed syntezą TTS', () => {
      const input =
        'MG: [GUARDRAIL_LEVEL: 2] [WETO_SEDZIEGO: typ=anachronizm | powod=smartfon] Nie posiadasz takiego urządzenia. [GAME_OVER: @Badacz | typ=DEAD | powod=szok] Słyszysz kroki.';
      const output = cleanResponseText(input);
      expect(output).not.toContain('GUARDRAIL');
      expect(output).not.toContain('WETO');
      expect(output).not.toContain('GAME_OVER');
      expect(output).not.toContain('MG:');
      expect(output).toContain('Nie posiadasz takiego urządzenia.');
      expect(output).toContain('Słyszysz kroki.');
    });

    it('sanitizeMechanicalTags wycina tagi z tolerancją spacji wokół dwukropka oraz paddingu nawiasów', () => {
      const input =
        'Zaglądasz pod szafę. [ TEST : Spostrzegawczość ] [ DZIENNIK : trop : stary list ] [ / DZIENNIK ] [ NPC : Lord Vance ] [ GUARDRAIL_LEVEL : 1 ] Nic tam nie ma.';
      const output = sanitizeMechanicalTags(input);
      expect(output).not.toContain('TEST');
      expect(output).not.toContain('DZIENNIK');
      expect(output).not.toContain('Lord Vance');
      expect(output).not.toContain('GUARDRAIL');
      expect(output).toContain('Zaglądasz pod szafę.');
      expect(output).toContain('Nic tam nie ma.');
    });

    it('sanitizeMechanicalTags usuwa halucynowane tagi z dwukropkiem przez regułę catch-all', () => {
      const input =
        'Stoisz w bramie. [UNKNOWN_RPG_TAG: dane] [HALUCYNACJA_MG: losowe] [Co robisz?]';
      const output = sanitizeMechanicalTags(input);
      expect(output).not.toContain('UNKNOWN_RPG_TAG');
      expect(output).not.toContain('HALUCYNACJA_MG');
      expect(output).toContain('Stoisz w bramie.');
      expect(output).toContain('[Co robisz?]');
    });

    it('sanitizeDiegeticProse czyści rozszerzone nagłówki formularzy karty postaci', () => {
      const input =
        'Osobowość i cechy: Zawsze ostrożny i podejrzliwy.\nKluczowa osoba: Wujek z Bostonu.\nWażne miejsce: Biblioteka Miskatonic.\nCenne posiadanie: Złoty zegarek po ojcu.\nIdeologia i przekonania: Tylko nauka wyjaśni świat.\nFobie i manie: Paniczny lęk przed szczurami.\n- Czas ruszać w drogę - mówi spokojnie.';
      const output = sanitizeDiegeticProse(input);
      expect(output).not.toContain('Osobowość i cechy:');
      expect(output).not.toContain('Kluczowa osoba:');
      expect(output).not.toContain('Ważne miejsce:');
      expect(output).not.toContain('Cenne posiadanie:');
      expect(output).not.toContain('Ideologia i przekonania:');
      expect(output).not.toContain('Fobie i manie:');
      expect(output).toContain('Zawsze ostrożny i podejrzliwy.');
      expect(output).toContain('Wujek z Bostonu.');
      expect(output).toContain('Biblioteka Miskatonic.');
      expect(output).toContain('Złoty zegarek po ojcu.');
      expect(output).toContain('Tylko nauka wyjaśni świat.');
      expect(output).toContain('Paniczny lęk przed szczurami.');
      expect(output).toContain('- Czas ruszać w drogę - mówi spokojnie.');
    });

    it('sanitizeDiegeticProse normalizuje dialogi z cudzysłowami typograficznymi (“ ”)', () => {
      const input =
        '“Gdzie są klucze?” - zapytał badacz.\n“Uważajcie na cienie!”';
      const output = sanitizeDiegeticProse(input, { normalizeDialogues: true });
      expect(output).toContain('- Gdzie są klucze? - zapytał badacz.');
      expect(output).toContain('- Uważajcie na cienie!');
    });

    it('sanitizeDiegeticProse normalizuje dialogi z pojedynczymi cudzysłowami typograficznymi (‘ ’)', () => {
      const input =
        '‘Gdzie podziały się akta?’ - zapytał detektyw.\n‘Uciekajmy stąd!’';
      const output = sanitizeDiegeticProse(input, { normalizeDialogues: true });
      expect(output).toContain('- Gdzie podziały się akta? - zapytał detektyw.');
      expect(output).toContain('- Uciekajmy stąd!');
    });

    it('stripMultilineArtifacts nie usuwa prozy fabularnej gdy niezamknięty blok dyrektywy jest na początku tekstu', () => {
      const input =
        '[PRZYPOMNIENIE DLA MG: DYNAMICZNA SCENA I PACING]\nAtmosfera sceny: Mrok i chłód.\nPacing i kadencja: BIEG 3 (PRZEŁAMANIE): 30-70 słów.\n\nKorytarz spowity jest gęstą mgłą. Słyszysz kroki.';
      const output = stripMultilineArtifacts(input);
      expect(output).not.toContain('PRZYPOMNIENIE DLA MG');
      expect(output).not.toContain('Atmosfera sceny:');
      expect(output).toContain('Korytarz spowity jest gęstą mgłą. Słyszysz kroki.');
    });

    it('sanitizeDiegeticProse usuwa niezamknięte bloki dyrektyw z nagłówkami bez wycieku do prozy gracza', () => {
      const input =
        '[PRZYPOMNIENIE DLA MG: DYNAMICZNA SCENA I PACING]\nAtmosfera sceny: Narastająca groza\nPacing i kadencja: Bieg 3\n\nDeszcz bębni o parapet. Co robisz?';
      const output = sanitizeDiegeticProse(input);
      expect(output).not.toContain('PRZYPOMNIENIE DLA MG');
      expect(output).not.toContain('Atmosfera sceny:');
      expect(output).not.toContain('Pacing i kadencja:');
      expect(output).toBe('Deszcz bębni o parapet. Co robisz?');
    });

    it('sanitizeMechanicalTags usuwa bloki dyrektyw gdy tag zamykający zawiera powtórzony tytuł lub parametry', () => {
      const input =
        'Zegar bije północ. [PRZYPOMNIENIE DLA MG: DYNAMICZNA SCENA I PACING]Atmosfera: Dread[/PRZYPOMNIENIE DLA MG: DYNAMICZNA SCENA I PACING] Ktoś puka do drzwi.';
      const output = sanitizeMechanicalTags(input);
      expect(output).not.toContain('PRZYPOMNIENIE DLA MG');
      expect(output).not.toContain('Atmosfera: Dread');
      expect(output).toContain('Zegar bije północ.');
      expect(output).toContain('Ktoś puka do drzwi.');
    });

    it('sanitizeDiegeticProse czyści etykiety Dossier (Pierwsze wrażenie, Poszlaka, Pochodzenie)', () => {
      const input =
        'Pierwsze wrażenie: Nerwowy i małomówny.\nPoszlaka: Zardzewiały klucz do krypty.\nPochodzenie: Odnaleziony w gabinecie.\n- Weź ten klucz - rzekł starzec.';
      const output = sanitizeDiegeticProse(input);
      expect(output).not.toContain('Pierwsze wrażenie:');
      expect(output).not.toContain('Poszlaka:');
      expect(output).not.toContain('Pochodzenie:');
      expect(output).toContain('Nerwowy i małomówny.');
      expect(output).toContain('Zardzewiały klucz do krypty.');
      expect(output).toContain('- Weź ten klucz - rzekł starzec.');
    });
  });
});
