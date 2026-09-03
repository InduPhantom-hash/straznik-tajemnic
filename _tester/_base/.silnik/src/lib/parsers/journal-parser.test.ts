import {
  extractJournalTags,
  synthesizeClueFact,
  extractNpcTags,
} from './journal-parser';
import { extractLatestTagLocation } from './event-parser';
import { appendJournalFromText } from '../journal/apply-journal-tags';
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
});
