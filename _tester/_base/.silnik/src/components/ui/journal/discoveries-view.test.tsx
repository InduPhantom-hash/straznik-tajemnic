import { fireEvent, render, screen } from '@testing-library/react';
import { DiscoveriesView } from './discoveries-view';

const mockEntries = [
  {
    id: '1',
    title: 'Stary Dom',
    content: 'Mroczny dom na wzgórzu.',
    type: 'location',
  },
  {
    id: '2',
    title: 'John Doe',
    content: 'Podejrzany typ.',
    type: 'npc',
  },
  {
    id: '3',
    title: 'Złoty klucz',
    content: 'Klucz pasujący do starych drzwi.',
    type: 'item',
    tags: ['artefakt', 'dowód'],
  },
  {
    id: '4',
    title: 'Rozwiązanie zagadki',
    content: 'Znaleziono mordercę.',
    type: 'quest',
    questStatus: 'active' as const,
  }
];

describe('DiscoveriesView', () => {
  it('renderuje poprawnie pusty stan dla Miejsc na start', () => {
    render(
      <DiscoveriesView
        entries={[]}
        onEditEntry={jest.fn()}
        onDeleteEntry={jest.fn()}
      />
    );
    
    // Zaczyna od zakładki "Miejsca", która jest pusta w mocku
    expect(screen.getByText('Nie odkryto jeszcze żadnych lokacji.')).toBeInTheDocument();
  });

  it('filtruje po kategoriach poprawnie i wyświetla detale z prawego panelu', () => {
    render(
      <DiscoveriesView
        entries={mockEntries}
        onEditEntry={jest.fn()}
        onDeleteEntry={jest.fn()}
      />
    );

    // Default to 'places' (Miejsca)
    expect(screen.getAllByText('Stary Dom')[0]).toBeInTheDocument();
    
    // Kliknij "Postacie"
    fireEvent.click(screen.getByRole('button', { name: /Postacie/i }));
    expect(screen.getAllByText('John Doe')[0]).toBeInTheDocument();
    // Zawartość prawego panelu dla wybranej (domyślnie pierwszej) postaci
    expect(screen.getAllByText('Podejrzany typ.')[0]).toBeInTheDocument();

    // Kliknij "Przedmioty"
    fireEvent.click(screen.getByRole('button', { name: /Przedmioty/i }));
    expect(screen.getAllByText('Złoty klucz')[0]).toBeInTheDocument();
    expect(screen.getByText('#artefakt')).toBeInTheDocument();
    
    // Kliknij "Misje"
    fireEvent.click(screen.getByRole('button', { name: /Misje/i }));
    expect(screen.getAllByText('Rozwiązanie zagadki')[0]).toBeInTheDocument();
    // Status
    expect(screen.getByText('STATUS:')).toBeInTheDocument();
  });

  it('wyszukiwarka prawidłowo filtruje wpisy', () => {
    render(
      <DiscoveriesView
        entries={mockEntries}
        onEditEntry={jest.fn()}
        onDeleteEntry={jest.fn()}
        searchQuery="Podejrzany"
      />
    );

    // Dla miejsc - pusto
    expect(screen.getByText('Nie odkryto jeszcze żadnych lokacji.')).toBeInTheDocument();

    // Po przełączeniu na postacie
    fireEvent.click(screen.getByRole('button', { name: /Postacie/i }));
    expect(screen.getAllByText('John Doe')[0]).toBeInTheDocument(); // matches "Podejrzany" in content
  });
  
  it('wywołuje akcje na wpisach', () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    const onPin = jest.fn();

    render(
      <DiscoveriesView
        entries={mockEntries}
        onEditEntry={onEdit}
        onDeleteEntry={onDelete}
        onPinToBoard={onPin}
      />
    );

    // Edit
    fireEvent.click(screen.getByTitle('Edytuj'));
    expect(onEdit).toHaveBeenCalledWith(mockEntries[0]);

    // Delete
    fireEvent.click(screen.getByTitle('Usuń'));
    expect(onDelete).toHaveBeenCalledWith(mockEntries[0].id);

    // Pin
    fireEvent.click(screen.getByTitle('Przypnij do Tablicy Badacza'));
    expect(onPin).toHaveBeenCalledWith(mockEntries[0]);
  });

  it('wyświetla wniosek badacza jeśli jest obecny we wpisie oraz umożliwia jego edycję', () => {
    const onEdit = jest.fn();
    const entryWithInsight = {
      id: '5',
      title: 'Dziwny Symbol',
      content: 'Wygrawerowany znak na podłodze.',
      type: 'location',
      investigatorInsight: 'Symbol ten przypomina pieczęć pradawnego bóstwa.',
    };

    render(
      <DiscoveriesView
        entries={[entryWithInsight]}
        onEditEntry={onEdit}
        onDeleteEntry={jest.fn()}
      />
    );

    // Nagłówek i treść wniosku
    expect(screen.getByText('WNIOSEK BADACZA / DEDUKCJA')).toBeInTheDocument();
    expect(screen.getByText('Symbol ten przypomina pieczęć pradawnego bóstwa.')).toBeInTheDocument();

    // Edycja wniosku
    fireEvent.click(screen.getByRole('button', { name: /Edytuj wniosek/i }));
    const textarea = screen.getByPlaceholderText('Wpisz dedukcję lub hipotezę badacza dotyczącą tego wpisu...');
    expect(textarea).toBeInTheDocument();
    fireEvent.change(textarea, { target: { value: 'Zaktualizowana hipoteza śledcza.' } });
    fireEvent.click(screen.getByRole('button', { name: /Zapisz wniosek/i }));

    expect(onEdit).toHaveBeenCalledWith({
      ...entryWithInsight,
      investigatorInsight: 'Zaktualizowana hipoteza śledcza.',
    });
  });

  it('umożliwia dodanie nowego wniosku badacza gdy go brak', () => {
    const onEdit = jest.fn();
    const entryWithoutInsight = {
      id: '6',
      title: 'Stara Piwnica',
      content: 'Zimne, wilgotne pomieszczenie.',
      type: 'location',
    };

    render(
      <DiscoveriesView
        entries={[entryWithoutInsight]}
        onEditEntry={onEdit}
        onDeleteEntry={jest.fn()}
      />
    );

    const addInsightBtn = screen.getByRole('button', { name: /Dodaj wniosek badacza/i });
    expect(addInsightBtn).toBeInTheDocument();
    fireEvent.click(addInsightBtn);

    const textarea = screen.getByPlaceholderText('Wpisz dedukcję lub hipotezę badacza dotyczącą tego wpisu...');
    fireEvent.change(textarea, { target: { value: 'Ślady wskazują na pośpieszne zatarcie dowodów.' } });
    fireEvent.click(screen.getByRole('button', { name: /Zapisz wniosek/i }));

    expect(onEdit).toHaveBeenCalledWith({
      ...entryWithoutInsight,
      investigatorInsight: 'Ślady wskazują na pośpieszne zatarcie dowodów.',
    });
  });
});
