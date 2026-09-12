import {
  extractJournalTags,
  synthesizeClueFact,
  extractNpcTags,
  parseClueProvenance,
  inferClueProvenance,
} from './journal-parser';
import { extractLatestTagLocation } from './event-parser';
import { appendJournalFromText, appendJournalToParty } from '../journal/apply-journal-tags';
import type { Character } from '../types';

describe('English game protocol', () => {
  it('persists English JOURNAL tags without translating player content', () => {
    expect(
      extractJournalTags(
        '[JOURNAL:clue:The sealed cellar]Cold air escapes through the wall.[/JOURNAL]'
      )
    ).toEqual([
      expect.objectContaining({
        type: 'clue',
        title: 'The sealed cellar',
        content: 'Cold air escapes through the wall.',
      }),
    ]);
  });

  it('accepts the English LOCATION tag', () => {
    expect(
      extractLatestTagLocation('[LOCATION: Corbitt House: Rain-darkened brick]')
    ).toEqual({ name: 'Corbitt House', description: 'Rain-darkened brick' });
  });
});

describe('synthesizeClueFact', () => {
  it('usuwa prefiksy i tagi, zwracając czysty 1-zdaniowy fakt', () => {
    const raw =
      'Poszlaka: **W starym kufrze** znaleziono mapę podziemi Arkham z zaznaczonym wejściem. Na biurku leżały też inne papiery.';
    const fact = synthesizeClueFact('Mapa podziemi', raw);

    expect(fact).toBe(
      'W starym kufrze znaleziono mapę podziemi Arkham z zaznaczonym wejściem.'
    );
  });

  it('usuwa tagi markdown i domyka kropką', () => {
    const raw = '*List od Armitage* wskazuje na piwnicę';
    const fact = synthesizeClueFact('List', raw);

    expect(fact).toBe('List od Armitage wskazuje na piwnicę.');
  });

  it('zwraca tytuł jako fallback gdy treść jest pusta', () => {
    expect(synthesizeClueFact('Tajemniczy klucz', '')).toBe('Tajemniczy klucz.');
  });
});

describe('extractNpcTags', () => {
  it('ekstrahuje tagi NPC zarówno z formatu [NPC:] jak i [DZIENNIK:npc:]', () => {
    const raw =
      'Wchodzisz do gabinetu. [NPC: Eleonora Vance: Młoda dziedziczka, blada i przerażona.] ' +
      'Rozmawia z nią stary służący. [DZIENNIK:npc:Barnaba]Stary lokaj rodziny Vance, nieufny wobec obcych.[/DZIENNIK]';

    const npcs = extractNpcTags(raw);
    expect(npcs).toHaveLength(2);
    expect(npcs[0]).toEqual({
      name: 'Eleonora Vance',
      description: 'Młoda dziedziczka, blada i przerażona.',
      who: undefined,
    });
    expect(npcs[1]).toEqual({
      name: 'Barnaba',
      description: 'Stary lokaj rodziny Vance, nieufny wobec obcych.',
      who: undefined,
    });
  });

  it('deduplikuje ten sam NPC występujący wielokrotnie w tej samej turze', () => {
    const raw =
      '[NPC: Eleonora Vance: Opis 1] [DZIENNIK:npc:Eleonora Vance]Opis 2[/DZIENNIK]';
    const npcs = extractNpcTags(raw);
    expect(npcs).toHaveLength(1);
    expect(npcs[0].name).toBe('Eleonora Vance');
  });
});

describe('appendJournalFromText (Zero-Effort Ledger & Dossier Loop)', () => {
  const baseCharacter: Character = {
    id: 'char_test',
    name: 'Edward Carnby',
    str: 50,
    dex: 50,
    con: 50,
    app: 50,
    pow: 50,
    edu: 50,
    siz: 50,
    int: 70,
    luck: 50,
    hp: 10,
    san: 50,
    mp: 10,
    skills: {},
    occupation: 'Detektyw',
    age: 35,
    background: '',
    playerName: 'Jakub',
    isActive: true,
    lastUsed: new Date(),
    notes: '',
    experience: { totalXP: 0, availableXP: 0, earnedThisSession: 0, maxEarnedThisSession: 10 },
    developmentHistory: [],
    journal: [],
  };

  it('przy pierwszym napotkaniu NPC dodaje kartę do dossier i jeden wpis do kroniki', () => {
    const raw = '[NPC: Eleonora Vance: Córka zaginionego profesora.]';
    const updated = appendJournalFromText(baseCharacter, raw, 'msg_1');

    expect(updated.investigatorDossier?.npcs).toHaveLength(1);
    expect(updated.investigatorDossier?.npcs[0].name).toBe('Eleonora Vance');
    expect(updated.investigatorDossier?.npcs[0].firstImpression).toBe(
      'Córka zaginionego profesora.'
    );

    expect(updated.journal).toHaveLength(1);
    expect(updated.journal?.[0].title).toBe('Eleonora Vance');
  });

  it('gdy ten sam NPC pojawia się ponownie, aktualizuje dossier i NIE duplikuje kroniki', () => {
    const raw1 = '[NPC: Eleonora Vance: Córka zaginionego profesora.]';
    const charAfterTurn1 = appendJournalFromText(baseCharacter, raw1, 'msg_1');

    const raw2 = '[DZIENNIK:npc:Eleonora Vance]Przyznała się, że ojciec zostawił szyfr w piwnicy.[/DZIENNIK]';
    const charAfterTurn2 = appendJournalFromText(charAfterTurn1, raw2, 'msg_2');

    // Dossier ma wciąż dokładnie 1 kartę NPC, ale zaktualizowaną o nowe fakty
    expect(charAfterTurn2.investigatorDossier?.npcs).toHaveLength(1);
    expect(charAfterTurn2.investigatorDossier?.npcs[0].keyInformation).toContain(
      'Przyznała się, że ojciec zostawił szyfr'
    );

    // Kronika wciąż ma dokładnie 1 wpis dla tego NPC (brak zaśmiecania kroniki)
    const npcEntriesInJournal = (charAfterTurn2.journal || []).filter(
      (j) => j.type === 'npc' && j.title.toLowerCase().includes('eleonora')
    );
    expect(npcEntriesInJournal).toHaveLength(1);
  });

  it('automatycznie syntetyzuje 1-zdaniowy fakt dla poszlak w dossier i dzienniku', () => {
    const raw =
      '[DZIENNIK:trop:Zakrwawiony sztylet]W szufladzie biurka znaleziono stary sztylet ze śladami zaschniętej krwi. Na ostrzu wyryto symbol gwiazdy.[/DZIENNIK]';
    const updated = appendJournalFromText(baseCharacter, raw, 'msg_3');

    expect(updated.investigatorDossier?.clues).toHaveLength(1);
    const clue = updated.investigatorDossier?.clues[0];
    expect(clue?.title).toBe('Zakrwawiony sztylet');
    expect(clue?.description).toBe(
      'W szufladzie biurka znaleziono stary sztylet ze śladami zaschniętej krwi.'
    );
    expect(clue?.status).toBe('confirmed');

    // W dzienniku również zapisany jest zwięzły fakt
    expect(updated.journal?.[0].content).toBe(
      'W szufladzie biurka znaleziono stary sztylet ze śladami zaschniętej krwi.'
    );
  });

  it('appendJournalToParty kieruje wpisy z prefiksem @Imię do właściwego badacza w duecie', () => {
    const char1 = { ...baseCharacter, id: 'char_1', name: 'Margaret Sullivan', journal: [] };
    const char2 = { ...baseCharacter, id: 'char_2', name: 'Tomasz Czarnecki', journal: [] };

    const raw =
      '[DZIENNIK:@Tomasz:notatka:Zapiski w notesie]Zanotowano podejrzane godziny odjazdów pociągu.[/DZIENNIK]\n' +
      '[DZIENNIK:trop:Ślad buta]Odcisk podeszwy w błocie.[/DZIENNIK]';

    const result = appendJournalToParty([char1, char2], char1, raw, 'msg_party_1');

    expect(result.changed).toBe(true);

    const updatedChar1 = result.characters.find((c) => c.id === 'char_1');
    const updatedChar2 = result.characters.find((c) => c.id === 'char_2');

    // char1 (aktywny badacz) otrzymuje wpis bez prefiksu ("Ślad buta")
    expect(updatedChar1?.journal?.some((j) => j.title === 'Ślad buta')).toBe(true);
    expect(updatedChar1?.journal?.some((j) => j.title === 'Zapiski w notesie')).toBe(false);

    // char2 (Tomasz) otrzymuje wpis z prefiksem @Tomasz
    expect(updatedChar2?.journal?.some((j) => j.title === 'Zapiski w notesie')).toBe(true);
    expect(updatedChar2?.journal?.some((j) => j.title === 'Ślad buta')).toBe(false);
  });

  it('unieważnia starszą poszlakę, gdy nowy wpis dziennika jawnie deklaruje zastąpienie (Fact Supersession)', () => {
    const raw1 = '[DZIENNIK:trop:Alibi dozorcy]Dozorca twierdzi, że całą noc spał w stróżówce.[/DZIENNIK]';
    const charWithClue1 = appendJournalFromText(baseCharacter, raw1, 'msg_super_1');

    expect(charWithClue1.investigatorDossier?.clues[0].status).toBe('confirmed');

    const raw2 = '[DZIENNIK:trop:Zdemaskowanie dozorcy]Dozorca przyznał się do kłamstwa. | zastępuje: Alibi dozorcy[/DZIENNIK]';
    const charWithClue2 = appendJournalFromText(charWithClue1, raw2, 'msg_super_2');

    const oldClue = charWithClue2.investigatorDossier?.clues.find((c) => c.title === 'Alibi dozorcy');
    const newClue = charWithClue2.investigatorDossier?.clues.find((c) => c.title === 'Zdemaskowanie dozorcy');

    expect(oldClue?.status).toBe('superseded');
    expect(oldClue?.supersededBy).toBe('Zdemaskowanie dozorcy');
    expect(newClue?.status).toBe('confirmed');
  });

  describe('Epistemic Clue Provenance', () => {
    it('parseClueProvenance rozpoznaje słowa kluczowe PL i EN oraz prefiksy źródła', () => {
      expect(parseClueProvenance('observed')).toBe('observed');
      expect(parseClueProvenance('zaobserwowane')).toBe('observed');
      expect(parseClueProvenance('oględziny')).toBe('observed');
      expect(parseClueProvenance('źródło: naoczne')).toBe('observed');
      expect(parseClueProvenance('source: observation')).toBe('observed');

      expect(parseClueProvenance('testimony')).toBe('testimony');
      expect(parseClueProvenance('zeznanie')).toBe('testimony');
      expect(parseClueProvenance('usłyszane')).toBe('testimony');
      expect(parseClueProvenance('źródło: świadek')).toBe('testimony');
      expect(parseClueProvenance('proweniencja: rozmowa')).toBe('testimony');

      expect(parseClueProvenance('deduction')).toBe('deduction');
      expect(parseClueProvenance('dedukcja')).toBe('deduction');
      expect(parseClueProvenance('wniosek')).toBe('deduction');
      expect(parseClueProvenance('źródło: analiza')).toBe('deduction');

      expect(parseClueProvenance('handout')).toBe('handout');
      expect(parseClueProvenance('dokument')).toBe('handout');
      expect(parseClueProvenance('wycinek')).toBe('handout');
      expect(parseClueProvenance('source: letter')).toBe('handout');

      expect(parseClueProvenance('nieznane_zrodlo')).toBeUndefined();
      expect(parseClueProvenance('')).toBeUndefined();
    });

    it('inferClueProvenance automatycznie wnioskuje proweniencję z treści i kategorii', () => {
      // Kategoria dokument -> handout
      expect(inferClueProvenance('Notatki', 'Tajemnicze formuły', 'document')).toBe('handout');
      // Kategoria testimony -> testimony
      expect(inferClueProvenance('Relacja', 'Twierdzi, że uciekł', 'testimony')).toBe('testimony');

      // Słowa kluczowe dokumentów
      expect(
        inferClueProvenance('Dziennik Corbitta', 'Zapiski z 1890 roku')
      ).toBe('handout');
      expect(
        inferClueProvenance('Wycinek z Boston Globe', 'Artykuł o zniknięciu')
      ).toBe('handout');

      // Słowa kluczowe zeznań
      expect(
        inferClueProvenance('Dozorca', 'Twierdzi, że słyszał kroki na piętrze')
      ).toBe('testimony');
      expect(
        inferClueProvenance('Rozmowa z barmanem', 'Świadek powiedział o dziwnym kliencie')
      ).toBe('testimony');

      // Słowa kluczowe dedukcji
      expect(
        inferClueProvenance('Hipoteza', 'Analiza wskazuje na truciznę')
      ).toBe('deduction');
      expect(
        inferClueProvenance('Wniosek śledczego', 'Badacz połączył fakty i wywnioskował motyw')
      ).toBe('deduction');

      // Domyślna obserwacja fizyczna
      expect(
        inferClueProvenance('Ślady pazurów', 'Głębokie rysy na dębowych drzwiach piwnicy')
      ).toBe('observed');
    });

    it('appendJournalFromText zapisuje jawną proweniencję z tagu DZIENNIK', () => {
      const raw =
        '[DZIENNIK:trop:Ślady pazurów]Głębokie bruzdy na futrynie | zaobserwowane | M[/DZIENNIK]';
      const updated = appendJournalFromText(baseCharacter, raw, 'msg_prov_1');

      const clue = updated.investigatorDossier?.clues.find((c) => c.title === 'Ślady pazurów');
      expect(clue).toBeDefined();
      expect(clue?.provenance).toBe('observed');
      expect(clue?.miceType).toBe('milieu');
      expect(clue?.description).toBe('Głębokie bruzdy na futrynie.');
    });

    it('appendJournalFromText zapisuje proweniencję z prefiksem źródło:', () => {
      const raw =
        '[DZIENNIK:trop:Zeznanie Dozorcy]Widział postać w czarnym płaszczu | źródło: zeznanie | I[/DZIENNIK]';
      const updated = appendJournalFromText(baseCharacter, raw, 'msg_prov_2');

      const clue = updated.investigatorDossier?.clues.find((c) => c.title === 'Zeznanie Dozorcy');
      expect(clue).toBeDefined();
      expect(clue?.provenance).toBe('testimony');
      expect(clue?.miceType).toBe('inquiry');
    });

    it('appendJournalFromText stosuje heurystykę inferClueProvenance gdy brak jawnej proweniencji', () => {
      const raw =
        '[DZIENNIK:trop:Wycinek z Boston Globe]Artykuł o niewyjaśnionym zgonie w Bostonie.[/DZIENNIK]';
      const updated = appendJournalFromText(baseCharacter, raw, 'msg_prov_3');

      const clue = updated.investigatorDossier?.clues.find((c) => c.title === 'Wycinek z Boston Globe');
      expect(clue).toBeDefined();
      expect(clue?.provenance).toBe('handout');
    });

    it('appendJournalFromText obsługuje angielskie tagi JOURNAL z proweniencją', () => {
      const raw =
        '[JOURNAL:clue:Corbitt Journal]Written in archaic Latin cipher | handout | inquiry[/JOURNAL]';
      const updated = appendJournalFromText(baseCharacter, raw, 'msg_prov_en');

      const clue = updated.investigatorDossier?.clues.find((c) => c.title === 'Corbitt Journal');
      expect(clue).toBeDefined();
      expect(clue?.provenance).toBe('handout');
      expect(clue?.miceType).toBe('inquiry');
    });

    it('inferClueProvenance nie myli balistyki i zeznań specjalistów z handoutami (zabezpieczenie rdzenia "list")', () => {
      // "balistyka" zawiera "list", ale jest badaniem fizycznym/oględzinami (observed)
      expect(
        inferClueProvenance('Ekspertyza balistyczna', 'Ślad prochu na naboju wskazuje kaliber .38')
      ).toBe('observed');

      // "specjalista" zawiera "list", ale kontekst to zeznanie świadka (testimony)
      expect(
        inferClueProvenance(
          'Zeznanie specjalisty',
          'Świadek, wybitny specjalista kryminalistyki, zeznaje że widział uciekającego podejrzanego.'
        )
      ).toBe('testimony');

      // "zamówienie" zawiera "mówi", ale bez zeznań/rozmowy nie powinno być testimony
      expect(
        inferClueProvenance('Stare zamówienie', 'W piwnicy leżą zakurzone skrzynie z węglem z 1920 roku.')
      ).toBe('observed');
    });

    it('parseClueProvenance rozpoznaje frazy wielowyrazowe z prefiksem źródło:', () => {
      expect(parseClueProvenance('źródło: zeznania świadka')).toBe('testimony');
      expect(parseClueProvenance('źródło: obserwacja miejsca zbrodni')).toBe('observed');
      expect(parseClueProvenance('źródło: dedukcja po teście INT')).toBe('deduction');
      expect(parseClueProvenance('source: document from archive')).toBe('handout');
    });

    it('appendJournalFromText rozpoznaje proweniencję z 4. segmentu tagu z dwukropkiem i nie zaśmieca inGameDate', () => {
      const raw =
        '[DZIENNIK:trop:Ślad prochu:obserwacja]Ślad prochu wokół rany postrzałowej.[/DZIENNIK]';
      const updated = appendJournalFromText(baseCharacter, raw, 'msg_prov_colon');

      const clue = updated.investigatorDossier?.clues.find((c) => c.title === 'Ślad prochu');
      expect(clue).toBeDefined();
      expect(clue?.provenance).toBe('observed');
      expect(clue?.inGameDate).toBeUndefined();

      const journalEntry = updated.journal?.find((j) => j.title === 'Ślad prochu');
      expect(journalEntry?.inGameDate).toBeUndefined();
    });

    it('appendJournalFromText oczyszcza tytuł poszlaki z metadanych pipe zarówno w dossier, jak i w kronice', () => {
      const raw =
        '[DZIENNIK:trop:Dziwny zapach | zeznanie]Świadek poczuł zapach siarki przy kominku.[/DZIENNIK]';
      const updated = appendJournalFromText(baseCharacter, raw, 'msg_prov_clean_title');

      const clue = updated.investigatorDossier?.clues.find((c) => c.title === 'Dziwny zapach');
      expect(clue).toBeDefined();
      expect(clue?.title).toBe('Dziwny zapach');
      expect(clue?.provenance).toBe('testimony');

      // Tytuł w kronice nie może zawierać śmieci "| zeznanie"
      const journalEntry = updated.journal?.find((j) => j.title.includes('Dziwny zapach'));
      expect(journalEntry?.title).toBe('Dziwny zapach');
    });
  });
});
