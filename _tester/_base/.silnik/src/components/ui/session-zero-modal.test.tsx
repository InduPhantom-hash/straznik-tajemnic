import { render, screen, fireEvent } from '@testing-library/react';
import { SessionZeroModal } from './session-zero-modal';
import type { Character } from '@/lib/types';
import type { AdventureContext } from '@/lib/adventures-data';

jest.mock('@/lib/ai-settings', () => ({
  loadAISettings: jest.fn(() => ({
    sessionZero: null,
  })),
  saveAISettings: jest.fn(),
}));

describe('SessionZeroModal', () => {
  const onClose = jest.fn();
  const onComplete = jest.fn();

  const mockCharacter: Character = {
    id: 'char-1',
    name: 'Edward Carnby',
    occupation: 'Prywatny Detektyw',
    age: 38,
    background: 'Weteran wojenny, obecnie detektyw',
    characterConcept: 'Długi karciane i spłata wierzycieli',
    significantPerson: 'Siostra Clara w Bostonie',
    meaningfulLocation: 'Gabinet w Arkham',
    treasuredPossession: 'Złoty zegarek po ojcu',
    playerName: 'Jakub',
    isActive: true,
    lastUsed: new Date(),
    notes: '',
    str: 60,
    dex: 50,
    con: 70,
    app: 45,
    pow: 65,
    edu: 75,
    siz: 65,
    int: 80,
    luck: 55,
    hp: 13,
    san: 65,
    mp: 13,
    skills: {},
    experience: {
      totalXP: 0,
      availableXP: 0,
      earnedThisSession: 0,
      maxEarnedThisSession: 10,
    },
    developmentHistory: [],
  };

  const mockAdventure: AdventureContext = {
    id: 'adv-1',
    title: 'Cienie nad Innsmouth',
    era: 'classic',
    eraLabel: 'Lata 20.',
    yearRange: '1920-1928',
    location: 'Innsmouth, Massachusetts',
    country: 'USA',
    tone: 'purist',
    themes: ['Sekta', 'Hybrydy', 'Kosmiczna groza'],
    suggestedOccupations: ['Detektyw', 'Dziennikarz'],
    suggestedArchetypes: ['Śledczy'],
    hook: 'Zlecenie od rządu: zbadanie dziwnych doniesień o tajemniczej wspólnocie w Innsmouth.',
    description: 'Mroczne miasteczko rybackie skrywające bluźnierczy pakt z Istotami z Głębin.',
    estimatedSessions: '2-3',
    playerCount: '1-4',
    difficulty: 'normal',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders step 1 and transitions through 4 steps to completion', () => {
    render(
      <SessionZeroModal
        open={true}
        onClose={onClose}
        onComplete={onComplete}
        adventureContext={mockAdventure}
        activeCharacter={mockCharacter}
      />
    );

    // Krok 1: Konwencja i styl
    expect(screen.getByText('Konwencja opowieści')).toBeInTheDocument();
    expect(screen.getByText('Klasyczny Kosmiczny Horror (Purystyczny)')).toBeInTheDocument();
    expect(screen.getByText('Awanturniczy (Pulp Cthulhu)')).toBeInTheDocument();
    expect(screen.queryByText('Detektywistyczny / Noir')).not.toBeInTheDocument();
    expect(screen.getByText('Tryb narracji')).toBeInTheDocument();
    expect(screen.getByText('Pełne RPG')).toBeInTheDocument();
    expect(screen.getByText('Priorytet Fabuły')).toBeInTheDocument();
    expect(screen.getByText('Czysta Narracja')).toBeInTheDocument();
    expect(screen.getByText('Krok 1 z 4')).toBeInTheDocument();

    // Przejście do Kroku 2
    const nextBtn = screen.getByText('Dalej ›');
    fireEvent.click(nextBtn);

    // Krok 2: Odprawa i haczyk
    expect(screen.getByText('Karta Odprawy (Briefing)')).toBeInTheDocument();
    expect(screen.getByText('Haczyk wejścia badacza')).toBeInTheDocument();
    expect(screen.getByText('Krok 2 z 4')).toBeInTheDocument();
    // Odprawa zasysa hook z przygody
    expect(
      screen.getByDisplayValue(/Zlecenie od rządu/i)
    ).toBeInTheDocument();

    // Przejście do Kroku 3
    fireEvent.click(screen.getByText('Dalej ›'));

    // Krok 3: Kotwice psychiczne (Więzi RAW)
    expect(screen.getByText('Ważna Osoba (Key Connection)')).toBeInTheDocument();
    expect(screen.getByText('Znaczące Miejsce')).toBeInTheDocument();
    expect(screen.getByText('Cenny Przedmiot')).toBeInTheDocument();
    expect(screen.getByText('Krok 3 z 4')).toBeInTheDocument();
    // Sprawdzenie zasysania z karty postaci
    expect(screen.getByText('Pobrano z karty badacza: Edward Carnby')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Siostra Clara w Bostonie')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Gabinet w Arkham')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Złoty zegarek po ojcu')).toBeInTheDocument();

    // Przejście do Kroku 4
    fireEvent.click(screen.getByText('Dalej ›'));

    // Krok 4: Granice i epoka
    expect(screen.getByText('Realia epoki lat 20.')).toBeInTheDocument();
    expect(screen.getByText(/Linie \(tematy zakazane\)/)).toBeInTheDocument();
    expect(screen.getByText(/Zasłony \(fade to black\)/)).toBeInTheDocument();
    expect(screen.getByText('Sesja Zero ukończona')).toBeInTheDocument();
    expect(screen.getByText('Krok 4 z 4')).toBeInTheDocument();

    // Dodanie sugerowanego tagu dla Linii
    const klaustrofobiaChip = screen.getAllByTitle('Dodaj: Klaustrofobia')[0];
    fireEvent.click(klaustrofobiaChip);
    expect(screen.getByTitle('Usuń: Klaustrofobia')).toBeInTheDocument();

    // Zakończenie i zapis
    expect(screen.getByText('Zakończ i zapisz ›')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Zakończ i zapisz ›'));

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        completed: true,
        tone: 'purist',
        narrativeMode: 'full_rpg',
        eraFilter: 'authentic_1920s',
        briefing: expect.stringContaining('Zlecenie od rządu'),
        anchors: expect.objectContaining({
          keyConnection: 'Siostra Clara w Bostonie',
          importantPlace: 'Gabinet w Arkham',
          treasuredItem: 'Złoty zegarek po ojcu',
        }),
        lines: expect.arrayContaining(['Klaustrofobia']),
      })
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('allows jumping between steps via stepper buttons', () => {
    render(
      <SessionZeroModal
        open={true}
        onClose={onClose}
        onComplete={onComplete}
      />
    );

    // Skok do kroku 4 (Granice i epoka)
    fireEvent.click(screen.getByRole('button', { name: /Granice i epoka/i }));
    expect(screen.getByText('Krok 4 z 4')).toBeInTheDocument();
    expect(screen.getByText('Sesja Zero ukończona')).toBeInTheDocument();

    // Skok do kroku 3 (Kotwice psychiczne)
    fireEvent.click(screen.getByRole('button', { name: /Kotwice psychiczne/i }));
    expect(screen.getByText('Krok 3 z 4')).toBeInTheDocument();
    expect(screen.getByText('Ważna Osoba (Key Connection)')).toBeInTheDocument();

    // Skok do kroku 2 (Odprawa i haczyk)
    fireEvent.click(screen.getByRole('button', { name: /Odprawa i haczyk/i }));
    expect(screen.getByText('Krok 2 z 4')).toBeInTheDocument();
    expect(screen.getByText('Karta Odprawy (Briefing)')).toBeInTheDocument();

    // Skok do kroku 1 (Konwencja i styl)
    fireEvent.click(screen.getByRole('button', { name: /Konwencja i styl/i }));
    expect(screen.getByText('Krok 1 z 4')).toBeInTheDocument();
    expect(screen.getByText('Konwencja opowieści')).toBeInTheDocument();
  });

  it('normalizes legacy adventure tone noir to purist', () => {
    const noirAdventure: AdventureContext = {
      ...mockAdventure,
      tone: 'noir' as const,
    };

    render(
      <SessionZeroModal
        open={true}
        onClose={onClose}
        onComplete={onComplete}
        adventureContext={noirAdventure}
        activeCharacter={mockCharacter}
      />
    );

    // Skok do kroku 4 i zapis
    fireEvent.click(screen.getByRole('button', { name: /Granice i epoka/i }));
    fireEvent.click(screen.getByText('Zakończ i zapisz ›'));

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        tone: 'purist',
      })
    );
  });

  it('supports switching diegetic briefing document formats and selecting suggested hooks and anchors', () => {
    render(
      <SessionZeroModal
        open={true}
        onClose={onClose}
        onComplete={onComplete}
        adventureContext={mockAdventure}
        activeCharacter={mockCharacter}
      />
    );

    // Przejdź do Kroku 2
    fireEvent.click(screen.getByRole('button', { name: /Odprawa i haczyk/i }));

    // Domyślny format: Telegram
    expect(screen.getByText('WESTERN UNION TELEGRAPH CO.')).toBeInTheDocument();
    expect(screen.getByText(/PILNE · STOP/i)).toBeInTheDocument();

    // Przełącz na List zlecający
    const letterBtn = screen.getByRole('button', { name: /List Zlecający/i });
    fireEvent.click(letterBtn);
    expect(screen.getByText(/CIENIE NAD INNSMOUTH/i)).toBeInTheDocument();
    expect(screen.getByText(/Do rąk własnych Badacza/i)).toBeInTheDocument();

    // Przełącz na Teczkę Akt
    const dossierBtn = screen.getByRole('button', { name: /Teczka Akt/i });
    fireEvent.click(dossierBtn);
    expect(screen.getByText('ŚCIŚLE TAJNE')).toBeInTheDocument();
    expect(screen.getByText(/AKTA ŚLEDCZE N°/i)).toBeInTheDocument();

    // Wybór sugerowanego haczyka badacza
    const jobHookBtn = screen.getByRole('button', { name: /Zlecenie zawodowe \/ honorarium/i });
    fireEvent.click(jobHookBtn);
    expect(screen.getByDisplayValue('Zlecenie zawodowe / honorarium')).toBeInTheDocument();

    // Przejdź do Kroku 3
    fireEvent.click(screen.getByRole('button', { name: /Kotwice psychiczne/i }));
    expect(screen.getByText('KARTOTEKA POWIĄZAŃ PSYCHOLOGICZNYCH')).toBeInTheDocument();

    // Kliknięcie sugerowanej kotwicy
    const mentorChip = screen.getByRole('button', { name: /\+ Mentor uniwersytecki/i });
    fireEvent.click(mentorChip);
    expect(screen.getByDisplayValue('Mentor uniwersytecki')).toBeInTheDocument();
  });
});
