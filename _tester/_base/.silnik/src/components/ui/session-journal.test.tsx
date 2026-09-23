import { fireEvent, render, screen } from '@testing-library/react';
import type { Character, JournalEntry, SceneCaseCard, ActReport } from '@/lib/types';
import { PREDEFINED_CHARACTERS } from '@/lib/immersion/predefined-characters';
import { isPlotRelevantItem, filterPlotItems } from '@/lib/journal/item-filter';
import { appendJournalFromText } from '@/lib/journal/apply-journal-tags';
import { SessionJournal } from './session-journal';

describe('item-filter', () => {
  it('odfiltrowuje pospolite przedmioty codziennego użytku', () => {
    expect(isPlotRelevantItem('Baterie')).toBe(false);
    expect(isPlotRelevantItem('baterie AA')).toBe(false);
    expect(isPlotRelevantItem('telefon komórkowy')).toBe(false);
    expect(isPlotRelevantItem('smartfon')).toBe(false);
    expect(isPlotRelevantItem('Pudełko zapałek')).toBe(false);
    expect(isPlotRelevantItem('zapalniczka')).toBe(false);
    expect(isPlotRelevantItem('Portfel')).toBe(false);
    expect(isPlotRelevantItem('Drobne monety')).toBe(false);
    expect(isPlotRelevantItem('Chusteczki higieniczne')).toBe(false);
    expect(isPlotRelevantItem('grzebień')).toBe(false);
  });

  it('odfiltrowuje odmienione gramatycznie formy pospolitych przedmiotów (przypadki i liczba mnoga)', () => {
    expect(isPlotRelevantItem('Paczka zapałek')).toBe(false);
    expect(isPlotRelevantItem('Garść zapałek')).toBe(false);
    expect(isPlotRelevantItem('Komplet baterii')).toBe(false);
    expect(isPlotRelevantItem('Zapas baterii')).toBe(false);
    expect(isPlotRelevantItem('Paczka chusteczek')).toBe(false);
    expect(isPlotRelevantItem('Niedopałek papierosa')).toBe(false);
    expect(isPlotRelevantItem('Zawartość portfela')).toBe(false);
    expect(isPlotRelevantItem('Garść bilonu')).toBe(false);
    expect(isPlotRelevantItem('Dwa ołówki')).toBe(false);
    expect(isPlotRelevantItem('Klucze do mieszkania')).toBe(false);
    expect(isPlotRelevantItem('Klucz od domu')).toBe(false);
  });

  it('zachowuje przedmioty istotne dla fabuły i poszlaki', () => {
    expect(isPlotRelevantItem('Mosiężny klucz')).toBe(true);
    expect(isPlotRelevantItem('List od Wilcoxa')).toBe(true);
    expect(isPlotRelevantItem('Zakrwawiony nóż')).toBe(true);
    expect(isPlotRelevantItem('Amulet Cthulhu')).toBe(true);
    expect(isPlotRelevantItem('Stara fotografia')).toBe(true);
    expect(isPlotRelevantItem('Zeznanie dozorcy')).toBe(true);
    expect(isPlotRelevantItem('Dziennik Corbitta')).toBe(true);
    expect(isPlotRelevantItem('Magiczny zegarek kieszonkowy')).toBe(true);
    expect(isPlotRelevantItem('Klucz do krypty')).toBe(true);
  });

  it('przedmiot pospolity z silnym znacznikiem fabularnym jest uznawany za istotny', () => {
    expect(isPlotRelevantItem('Zakrwawiona chusteczka')).toBe(true);
    expect(isPlotRelevantItem('Zaszyfrowany telefon')).toBe(true);
    expect(isPlotRelevantItem('Tajemnicze zapałki z symbolem')).toBe(true);
  });

  it('filterPlotItems poprawnie oczyszcza listę przedmiotów', () => {
    const rawItems = [
      'Baterie',
      'Mosiężny klucz',
      'telefon komórkowy',
      'List od Wilcoxa',
      'Zapałki',
      'Zakrwawiony medalion',
    ];
    const filtered = filterPlotItems(rawItems);
    expect(filtered).toEqual([
      'Mosiężny klucz',
      'List od Wilcoxa',
      'Zakrwawiony medalion',
    ]);
  });
});

describe('SessionJournal', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const sampleScene1: SceneCaseCard = {
    id: 'scene-card-1',
    sceneNumber: 1,
    location: 'Woronicza, Warszawa',
    title: 'Wizyta w archiwum TVP',
    inGameDate: '14 stycznia 1973',
    timestamp: '2026-09-21T10:00:00Z',
    people: ['Tadeusz Wrona', 'Marian Konieczny'],
    findings: ['Baterie', 'Teczka ze skradzioną taśmą', 'Zapałki'],
    keyTakeaways: [
      'Wrona przekazał zapieczętowaną teczkę z nagraniem.',
      'Służba Bezpieczeństwa interesuje się blokiem na Ursynowie.',
    ],
    nextStep: 'Skontaktować się z profesorem w Bibliotece Uniwersyteckiej.',
    isSealed: true,
  };

  const sampleScene2: SceneCaseCard = {
    id: 'scene-card-2',
    sceneNumber: 2,
    location: 'Biblioteka Uniwersytecka',
    title: 'Spotkanie z profesorem',
    inGameDate: '14 stycznia 1973, 16:30',
    timestamp: '2026-09-21T14:00:00Z',
    people: ['Prof. Janusz Kaczmarek'],
    findings: ['Starożytny manuskrypt', 'Telefon komórkowy'],
    keyTakeaways: [
      'Profesor przetłumaczył inskrypcję z taśmy.',
      'Rytuał ma nastąpić podczas zaćmienia.',
    ],
    nextStep: 'Przeszukać piwnicę kamienicy przy Mokotowskiej.',
    isSealed: true,
  };

  it('renderuje 100% modal na pełnym ekranie z Dark Art Déco oraz nagłówkiem', () => {
    const character: Character = {
      ...PREDEFINED_CHARACTERS[0],
      name: 'Edward Carnby',
      sceneCards: [sampleScene1],
    };

    render(
      <SessionJournal
        character={character}
        currentInGameDate="14 stycznia 1973"
        onClose={jest.fn()}
      />
    );

    const journal = screen.getByTestId('session-journal');
    expect(journal).toBeInTheDocument();
    expect(journal.className).toContain('fixed inset-0 w-full h-full');

    expect(
      screen.getByText('DZIENNIK SESJI / KRONIKA ŚLEDZTWA')
    ).toBeInTheDocument();
    expect(screen.getByText(/Badacz: Edward Carnby/i)).toBeInTheDocument();
  });

  it('nie renderuje usuniętych elementów (Dodaj notatkę, Eksport MD, zakładek Dossier/Kronika/Notatki)', () => {
    const character: Character = {
      ...PREDEFINED_CHARACTERS[0],
      sceneCards: [sampleScene1],
    };

    render(<SessionJournal character={character} onClose={jest.fn()} />);

    expect(screen.queryByRole('button', { name: /Dodaj notatkę/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Eksport MD/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Akta Śledcze/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Kronika/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Notatki/i })).toBeNull();
    expect(screen.queryByPlaceholderText(/Wyszukaj frazę/i)).toBeNull();
  });

  it('zamyka okno przyciskiem X oraz klawiszem Escape', () => {
    const handleClose = jest.fn();
    const character: Character = {
      ...PREDEFINED_CHARACTERS[0],
    };

    render(<SessionJournal character={character} onClose={handleClose} />);

    const closeBtn = screen.getByRole('button', { name: 'Zamknij dziennik' });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('wyświetla dyskretny pasek statusu z bieżącą lokacją aktywnej sceny', () => {
    const character: Character = {
      ...PREDEFINED_CHARACTERS[0],
      activeScene: {
        sceneNumber: 3,
        location: 'Podziemia Kamienicy',
        startedAt: '2026-09-21T18:00:00Z',
        people: [],
        findings: [],
        notes: [],
      },
    };

    render(<SessionJournal character={character} onClose={jest.fn()} />);

    expect(
      screen.getByText(/Bieżąca lokacja: Podziemia Kamienicy \| W toku śledztwa/i)
    ).toBeInTheDocument();
  });

  it('wyświetla klimatyczny komunikat empty state, gdy nie ma jeszcze żadnych zapieczętowanych scen', () => {
    const character: Character = {
      ...PREDEFINED_CHARACTERS[0],
      sceneCards: [],
      journal: [],
    };

    render(<SessionJournal character={character} onClose={jest.fn()} />);

    expect(screen.getByText('Dziennik śledztwa milczy')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Żadna scena nie została jeszcze zapieczętowana\. Postępuj w dochodzeniu/i
      )
    ).toBeInTheDocument();
  });

  it('układa sceny chronologicznie w lewej kolumnie z najnowszą na samej górze', () => {
    const character: Character = {
      ...PREDEFINED_CHARACTERS[0],
      sceneCards: [sampleScene1, sampleScene2], // Scena 1 i Scena 2
    };

    render(<SessionJournal character={character} onClose={jest.fn()} />);

    const sceneBadges = screen.getAllByText(/Scena #\d/);
    // Pierwsza na liście w sidebarze powinna być Scena #2
    expect(sceneBadges[0].textContent).toContain('Scena #2');

    // Scena 2 i Scena 1 są widoczne
    expect(screen.getAllByText('Spotkanie z profesorem').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Wizyta w archiwum TVP').length).toBeGreaterThanOrEqual(1);
  });

  it('wyświetla najnowszą kartę w 4 czystych blokach i filtruje pospolite przedmioty z bloku 3', () => {
    const character: Character = {
      ...PREDEFINED_CHARACTERS[0],
      sceneCards: [sampleScene1, sampleScene2],
    };

    render(<SessionJournal character={character} onClose={jest.fn()} />);

    // Domyślnie wybrana jest najnowsza scena (Scena #2)
    // Blok 1: Przebieg i kluczowe ustalenia
    expect(screen.getByText('Przebieg i kluczowe ustalenia')).toBeInTheDocument();
    expect(
      screen.getByText('Profesor przetłumaczył inskrypcję z taśmy.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Rytuał ma nastąpić podczas zaćmienia.')
    ).toBeInTheDocument();

    // Blok 2: Spotkane osoby
    expect(screen.getByText('Spotkane osoby')).toBeInTheDocument();
    expect(screen.getByText('Prof. Janusz Kaczmarek')).toBeInTheDocument();

    // Blok 3: Zdobyte kluczowe przedmioty i poszlaki
    expect(
      screen.getByText('Zdobyte kluczowe przedmioty i poszlaki')
    ).toBeInTheDocument();
    // Pospolity "Telefon komórkowy" został odfiltrowany:
    expect(screen.queryByText(/Telefon komórkowy/i)).toBeNull();
    // Istotny manuskrypt jest widoczny:
    expect(screen.getByText(/Starożytny manuskrypt/i)).toBeInTheDocument();

    // Blok 4: Cel / Następny krok śledztwa
    expect(screen.getByText('Cel / Następny krok śledztwa')).toBeInTheDocument();
    expect(
      screen.getByText('Przeszukać piwnicę kamienicy przy Mokotowskiej.')
    ).toBeInTheDocument();
  });

  it('umożliwia przełączenie na inną scenę po kliknięciu na liście', () => {
    const character: Character = {
      ...PREDEFINED_CHARACTERS[0],
      sceneCards: [sampleScene1, sampleScene2],
    };

    render(<SessionJournal character={character} onClose={jest.fn()} />);

    // Kliknij Scenę 1
    const scene1Item = screen.getByText('Wizyta w archiwum TVP');
    fireEvent.click(scene1Item);

    // Karta Sceny 1 jest teraz widoczna
    expect(
      screen.getByText('Wrona przekazał zapieczętowaną teczkę z nagraniem.')
    ).toBeInTheDocument();
    expect(screen.getByText('Tadeusz Wrona')).toBeInTheDocument();
    expect(
      screen.getByText(/Teczka ze skradzioną taśmą/i)
    ).toBeInTheDocument();

    // Baterie i zapałki zostały odfiltrowane:
    expect(screen.queryByText(/Baterie/i)).toBeNull();
    expect(screen.queryByText(/Zapałki/i)).toBeNull();
  });

  it('obsługuje Quote-to-Input dla celu/następnego kroku śledztwa', () => {
    const onQuote = jest.fn();
    const onClose = jest.fn();
    const character: Character = {
      ...PREDEFINED_CHARACTERS[0],
      sceneCards: [sampleScene2],
    };

    render(
      <SessionJournal
        character={character}
        onQuoteToInput={onQuote}
        onClose={onClose}
      />
    );

    const quoteBtn = screen.getByRole('button', {
      name: /Zacytuj i pytaj na czacie/i,
    });
    fireEvent.click(quoteBtn);

    expect(onQuote).toHaveBeenCalledWith(
      'Przeszukać piwnicę kamienicy przy Mokotowskiej.'
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('poprawnie integruje scalony dziennik duetowy z nazwami uczestników', () => {
    const character: Character = {
      ...PREDEFINED_CHARACTERS[0],
    };

    const sharedEntries: JournalEntry[] = [
      {
        id: 'shared-scene-1',
        timestamp: new Date(),
        type: 'scene',
        title: 'Wspólne odkrycie w krypcie',
        content: 'Odnaleziono grobowiec.',
        tags: ['scena'],
        isBookmarked: false,
        sceneData: {
          id: 'shared-card-1',
          sceneNumber: 1,
          location: 'Krypta pod kościołem',
          title: 'Wspólne odkrycie w krypcie',
          timestamp: '2026-09-21T10:00:00Z',
          people: ['Ojciec Thomas'],
          findings: ['Srebrny krzyż z runami'],
          keyTakeaways: ['Krypta została otwarta od zewnątrz.'],
          nextStep: 'Zapytać kościelnego o nocne hałasy.',
          isSealed: true,
        },
      },
    ];

    render(
      <SessionJournal
        character={character}
        sharedJournal={sharedEntries}
        participantNames={['Aga', 'Jakub']}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText('Wspólny dla: Aga i Jakub')).toBeInTheDocument();
    expect(screen.getAllByText('Wspólne odkrycie w krypcie')[0]).toBeInTheDocument();
    expect(screen.getByText('Ojciec Thomas')).toBeInTheDocument();
    expect(screen.getByText(/Srebrny krzyż z runami/i)).toBeInTheDocument();
  });

  it('obsługuje scenę z pustymi blokami (brak osób, brak poszlak, brak kolejnego kroku)', () => {
    const minimalScene: SceneCaseCard = {
      id: 'scene-minimal',
      sceneNumber: 1,
      location: 'Opuszczona chatka',
      title: 'Pusta chatka w lesie',
      timestamp: '2026-09-21T12:00:00Z',
      people: [],
      findings: [],
      keyTakeaways: [],
      isSealed: true,
    };

    const character: Character = {
      ...PREDEFINED_CHARACTERS[0],
      sceneCards: [minimalScene],
    };

    render(<SessionJournal character={character} onClose={jest.fn()} />);

    expect(screen.getByText('Brak nowych osób')).toBeInTheDocument();
    expect(screen.getByText('Brak nowych poszlak ani rekwizytów')).toBeInTheDocument();
    expect(screen.getByText('Brak szczegółowych ustaleń dla tej sceny.')).toBeInTheDocument();
    expect(screen.getByText('Brak zdefiniowanego kolejnego kroku.')).toBeInTheDocument();
  });

  it('umożliwia przełączenie na inną scenę po najechaniu myszą (mouseEnter) na liście', () => {
    const character: Character = {
      ...PREDEFINED_CHARACTERS[0],
      sceneCards: [sampleScene1, sampleScene2],
    };

    render(<SessionJournal character={character} onClose={jest.fn()} />);

    // Domyślnie widać Scenę #2
    expect(
      screen.getByText('Profesor przetłumaczył inskrypcję z taśmy.')
    ).toBeInTheDocument();

    // Najedź kursorem myszy na Scenę 1
    const scene1Item = screen.getByText('Wizyta w archiwum TVP');
    fireEvent.mouseEnter(scene1Item);

    // Karta Sceny 1 jest teraz natychmiast wyświetlona w prawym panelu
    expect(
      screen.getByText('Wrona przekazał zapieczętowaną teczkę z nagraniem.')
    ).toBeInTheDocument();
  });

  it('ignoruje niezapieczętowane sceny (isSealed: false)', () => {
    const unsealedScene: SceneCaseCard = {
      id: 'unsealed-scene',
      sceneNumber: 99,
      location: 'Tymczasowe miejsce',
      title: 'Scena w toku',
      timestamp: '2026-09-21T15:00:00Z',
      people: [],
      findings: [],
      keyTakeaways: [],
      isSealed: false,
    };

    const character: Character = {
      ...PREDEFINED_CHARACTERS[0],
      sceneCards: [sampleScene1, unsealedScene],
    };

    render(<SessionJournal character={character} onClose={jest.fn()} />);

    // Scena niezapieczętowana nie pojawia się w liście Kroniki Scen
    expect(screen.queryByText('Scena w toku')).toBeNull();
    expect(screen.getAllByText('Wizyta w archiwum TVP').length).toBeGreaterThanOrEqual(1);
  });

  it('renderuje aktywną scenę w toku, gdy brak zapieczętowanych scen (brak pustego stanu "Dziennik milczy")', () => {
    const character: Character = {
      ...PREDEFINED_CHARACTERS[0],
      sceneCards: [],
      journal: [],
      activeScene: {
        sceneNumber: 1,
        location: 'Sanatorium w Arkham',
        startedAt: '2026-09-21T18:00:00Z',
        people: ['Dr Hardstrom'],
        findings: ['Klucz do izolatki', 'Telefon komórkowy'],
        notes: ['Dziwne odgłosy na piętrze'],
      },
    };

    render(<SessionJournal character={character} onClose={jest.fn()} />);

    // Brak pustego stanu "Dziennik śledztwa milczy"
    expect(screen.queryByText('Dziennik śledztwa milczy')).toBeNull();

    // Na liście pojawia się aktywna scena z plakietką "W toku"
    expect(screen.getAllByText('W toku').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Sanatorium w Arkham').length).toBeGreaterThanOrEqual(2);

    // Prawy panel renderuje 4 bloki aktywnej sceny
    // Blok 1: Ustalenia
    expect(screen.getByText('Dziwne odgłosy na piętrze')).toBeInTheDocument();
    // Blok 2: Spotkane osoby
    expect(screen.getByText('Dr Hardstrom')).toBeInTheDocument();
    // Blok 3: Poszlaki z filtracją przedmiotów pospolitych
    expect(screen.getAllByText(/Klucz do izolatki/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/Telefon komórkowy/i)).toBeNull();
    // Blok 4: Cel / Następny krok
    expect(
      screen.getByText(/Kontynuuj badanie lokacji: Sanatorium w Arkham/i)
    ).toBeInTheDocument();
  });

  it('umożliwia przełączanie między sceną w toku a scenami zapieczętowanymi', () => {
    const character: Character = {
      ...PREDEFINED_CHARACTERS[0],
      sceneCards: [sampleScene1],
      activeScene: {
        sceneNumber: 2,
        location: 'Podziemia Kamienicy',
        startedAt: '2026-09-21T19:00:00Z',
        people: ['Tajemniczy kultysta'],
        findings: ['Mosiężny klucz'],
        notes: ['Ślady stóp prowadzą do ołtarza'],
      },
    };

    render(<SessionJournal character={character} onClose={jest.fn()} />);

    // Domyślnie wybrana jest bieżąca scena w toku (Scena #2)
    expect(screen.getByText('Ślady stóp prowadzą do ołtarza')).toBeInTheDocument();
    expect(screen.getByText('Tajemniczy kultysta')).toBeInTheDocument();

    // Kliknij na zapieczętowaną Scenę 1
    const scene1Item = screen.getByText('Wizyta w archiwum TVP');
    fireEvent.click(scene1Item);

    // Karta Sceny 1 jest teraz widoczna
    expect(
      screen.getByText('Wrona przekazał zapieczętowaną teczkę z nagraniem.')
    ).toBeInTheDocument();
    expect(screen.getByText('Marian Konieczny')).toBeInTheDocument();

    // Kliknij z powrotem na scenę w toku
    const ongoingItem = screen.getByText('Podziemia Kamienicy');
    fireEvent.click(ongoingItem);

    // Znów widać scenę w toku
    expect(screen.getByText('Ślady stóp prowadzą do ołtarza')).toBeInTheDocument();
    expect(screen.getByText('Tajemniczy kultysta')).toBeInTheDocument();
  });

  it('wyświetla pusty stan tylko gdy brak jakichkolwiek danych (brak zapieczętowanych scen i brak aktywnej sceny)', () => {
    const character: Character = {
      ...PREDEFINED_CHARACTERS[0],
      sceneCards: [],
      journal: [],
      activeScene: undefined,
    };

    render(<SessionJournal character={character} onClose={jest.fn()} />);

    expect(screen.getByText('Dziennik śledztwa milczy')).toBeInTheDocument();
  });
});

describe('apply-journal-tags automatic sealing on location change (Issue #471)', () => {
  it('automatycznie pieczętuje dotychczasową scenę i rozpoczyna nową przy zmianie [LOKACJA: ...]', () => {
    const initialChar: Character = {
      ...PREDEFINED_CHARACTERS[0],
      sceneCards: [],
      journal: [],
      activeScene: {
        sceneNumber: 1,
        location: 'Kawiarnia Rozdroże',
        startedAt: '2026-09-21T12:00:00Z',
        people: ['Kelner Jan'],
        findings: ['Notatnik z adresem'],
        notes: ['Świadek wspomniał o nocnym kursie'],
      },
    };

    const narration = `
Dotarłeś pod wskazany adres w starych dokach. Wiatr wieje od zatoki.
[LOKACJA: Opuszczony Magazyn nr 7: Mroczna hala pełna skrzyń i zapachu stęchłego rybnego truchła.]
[NPC: Stróż nocny: Starszy człowiek z latarnią naftową]
[PRZEDMIOT: Zakrwawiony hak: Ciężki hak rzeźnicki]
[DZIENNIK:trop:Ślady wleczenia]Wyraźne ślady wleczenia ciężkiego ciała w stronę rampy wyładunkowej.[/DZIENNIK]
`;

    const updated = appendJournalFromText(initialChar, narration, 'msg-123');

    // Dotychczasowa scena (Kawiarnia) została zapieczętowana
    expect(updated.sceneCards).toBeDefined();
    expect(updated.sceneCards?.length).toBe(1);
    const sealed = updated.sceneCards![0];
    expect(sealed.location).toBe('Kawiarnia Rozdroże');
    expect(sealed.isSealed).toBe(true);
    expect(sealed.people).toContain('Kelner Jan');
    expect(sealed.findings).toContain('Notatnik z adresem');
    expect(sealed.keyTakeaways).toContain('Świadek wspomniał o nocnym kursie');
    expect(sealed.nextStep).toContain('Opuszczony Magazyn nr 7');

    // Rozpoczęto nową scenę dla nowej lokacji
    expect(updated.activeScene).toBeDefined();
    expect(updated.activeScene?.sceneNumber).toBe(2);
    expect(updated.activeScene?.location).toBe('Opuszczony Magazyn nr 7');
    // Nowe osoby, przedmioty i poszlaki z tej samej tury trafiły do nowej sceny!
    expect(updated.activeScene?.people).toContain('Stróż nocny');
    expect(updated.activeScene?.findings).toContain('Zakrwawiony hak');
    expect(updated.activeScene?.findings).toContain('Ślady wleczenia');
  });

  it('nie pieczętuje sceny gdy lokacja jest taka sama lub gdy aktywna lokacja to "Aktualna lokacja"', () => {
    const startChar: Character = {
      ...PREDEFINED_CHARACTERS[0],
      sceneCards: [],
      journal: [],
      activeScene: {
        sceneNumber: 1,
        location: 'Aktualna lokacja',
        startedAt: '2026-09-21T12:00:00Z',
        people: [],
        findings: [],
        notes: [],
      },
    };

    const narration = `[LOKACJA: Gabinet Profesora Westona: Pokój z zaryglowanymi oknami]`;
    const updated = appendJournalFromText(startChar, narration, 'msg-001');

    // Pierwsza lokacja nie pieczętuje pustej sceny
    expect(updated.sceneCards?.length || 0).toBe(0);
    expect(updated.activeScene?.location).toBe('Gabinet Profesora Westona');
  });

  describe('Investigation Progress (Mechaniki 1 i 8)', () => {
    const sampleSceneProgress: SceneCaseCard = {
      id: 'scene-card-1',
      sceneNumber: 1,
      location: 'Woronicza, Warszawa',
      title: 'Wizyta w archiwum TVP',
      inGameDate: '14 stycznia 1973',
      timestamp: '2026-09-21T10:00:00Z',
      people: ['Tadeusz Wrona', 'Marian Konieczny'],
      findings: ['Baterie', 'Teczka ze skradzioną taśmą', 'Zapałki'],
      keyTakeaways: [
        'Wrona przekazał zapieczętowaną teczkę z nagraniem.',
        'Służba Bezpieczeństwa interesuje się blokiem na Ursynowie.',
      ],
      nextStep: 'Skontaktować się z profesorem w Bibliotece Uniwersyteckiej.',
      isSealed: true,
    };

    const sampleActReport: ActReport = {
      id: 'act-report-1',
      actNumber: 1,
      title: 'Śmierć w Bibliotece Miskatonic',
      status: 'completed',
      inGameDate: '15 stycznia 1928',
      confirmedFacts: [
        'Dr Armitage znalazł zwłoki asystenta o 6:00 rano',
        'Księga Necronomicon została otwarta na 741. stronie',
      ],
      suspects: ['Wilbur Whateley', 'Profesor Rice'],
      unresolvedQuestions: ['Kto dostarczył klucz do gabloty?'],
      leadHypothesis: 'Morderca poszukiwał formuły odpędzenia Yog-Sothotha.',
    };

    it('wyświetla licznik wskazówek (Clue Counter) w nagłówku', () => {
      const character: Character = {
        ...PREDEFINED_CHARACTERS[0],
        sceneCards: [sampleSceneProgress],
        investigatorDossier: {
          clues: [
            {
              id: 'c1',
              title: 'Mosiężny klucz',
              description: 'Znaleziony w bibliotece',
              category: 'forensic',
              status: 'confirmed',
              epistemicLayer: 'player_clue',
              timestamp: Date.now(),
            },
            {
              id: 'c2',
              title: 'Notatka z łaciny',
              description: 'Fragment przekładu',
              category: 'document',
              status: 'confirmed',
              epistemicLayer: 'player_clue',
              timestamp: Date.now(),
            },
          ],
          npcs: [],
          locations: [],
          notes: [],
        },
      };

      const { rerender } = render(
        <SessionJournal
          character={character}
          totalCluesEstimated={5}
          onClose={jest.fn()}
        />
      );

      const badge = screen.getByTestId('clue-counter-badge');
      expect(badge).toBeInTheDocument();
      expect(badge.textContent).toContain('5');

      // Bez totalCluesEstimated
      rerender(
        <SessionJournal
          character={character}
          onClose={jest.fn()}
        />
      );
      expect(screen.getByTestId('clue-counter-badge')).toBeInTheDocument();
      expect(screen.getByTestId('clue-counter-badge').textContent).toContain('odkrytych');
    });

    it('umożliwia przełączenie na Raporty Aktów i wyświetla kartę w 4 blokach Art Déco', () => {
      const character: Character = {
        ...PREDEFINED_CHARACTERS[0],
        sceneCards: [sampleSceneProgress],
        actReports: [sampleActReport],
      };

      render(<SessionJournal character={character} onClose={jest.fn()} />);

      // Klikamy zakładkę Raporty Aktów
      const tabButton = screen.getByRole('button', { name: /Raporty Aktów/i });
      fireEvent.click(tabButton);

      // Sprawdzamy nagłówek i 4 bloki
      expect(screen.getAllByText('Śmierć w Bibliotece Miskatonic').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Akt #1').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Zakończony').length).toBeGreaterThanOrEqual(1);

      // Blok 1: Fakty
      expect(screen.getByText('Co wiemy na pewno (Fakty bezsprzeczne)')).toBeInTheDocument();
      expect(
        screen.getByText('Dr Armitage znalazł zwłoki asystenta o 6:00 rano')
      ).toBeInTheDocument();

      // Blok 2: Podejrzani
      expect(screen.getByText('Podejrzani i motywy')).toBeInTheDocument();
      expect(screen.getByText(/Wilbur Whateley/i)).toBeInTheDocument();

      // Blok 3: Białe plamy
      expect(screen.getByText('Białe plamy i luki w śledztwie')).toBeInTheDocument();
      expect(screen.getByText(/Kto dostarczył klucz do gabloty\?/i)).toBeInTheDocument();

      // Blok 4: Wiodąca hipoteza
      expect(screen.getByText('Wiodąca hipoteza robocza')).toBeInTheDocument();
      expect(
        screen.getByText(/Morderca poszukiwał formuły odpędzenia Yog-Sothotha\./i)
      ).toBeInTheDocument();
    });

    it('obsługuje Quote-to-Input dla wiodącej hipotezy w raporcie aktu', () => {
      const handleQuote = jest.fn();
      const character: Character = {
        ...PREDEFINED_CHARACTERS[0],
        sceneCards: [sampleSceneProgress],
        actReports: [sampleActReport],
      };

      render(
        <SessionJournal
          character={character}
          onQuoteToInput={handleQuote}
          onClose={jest.fn()}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /Raporty Aktów/i }));

      const quoteBtn = screen.getByRole('button', { name: /Zacytuj hipotezę na czacie/i });
      fireEvent.click(quoteBtn);

      expect(handleQuote).toHaveBeenCalledWith(sampleActReport.leadHypothesis);
    });

    it('wyświetla pusty stan raportów aktu z przyciskiem prośby o syntezę etapu', () => {
      const handleQuote = jest.fn();
      const character: Character = {
        ...PREDEFINED_CHARACTERS[0],
        sceneCards: [sampleSceneProgress],
        actReports: [],
      };

      render(
        <SessionJournal
          character={character}
          onQuoteToInput={handleQuote}
          onClose={jest.fn()}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /Raporty Aktów/i }));

      expect(screen.getByText('Brak raportów aktu')).toBeInTheDocument();
      const requestBtn = screen.getByRole('button', { name: /Poproś o syntezę etapu/i });
      expect(requestBtn).toBeInTheDocument();

      fireEvent.click(requestBtn);
      expect(handleQuote).toHaveBeenCalledWith(
        'Mistrzu Gry, podsumujmy dotychczasowe ustalenia i fakty tego etapu śledztwa.'
      );
    });
  });
});
