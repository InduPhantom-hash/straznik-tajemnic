import { fireEvent, render, screen } from '@testing-library/react';
import type { Character, JournalEntry, SceneCaseCard } from '@/lib/types';
import { PREDEFINED_CHARACTERS } from '@/lib/immersion/predefined-characters';
import { isPlotRelevantItem, filterPlotItems } from '@/lib/journal/item-filter';
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
});
