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
});
