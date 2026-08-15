import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CorkboardInvestigationBoard } from './corkboard-investigation-board';
import { EvidenceNode, EvidenceRelation } from '@/types/investigator-board';
import { PREDEFINED_CHARACTERS } from '@/lib/immersion/predefined-characters';
import * as diceUtils from '@/lib/dice-utils';

jest.mock('@/lib/api-keys-service', () => ({
  fetchWithApiKeys: jest.fn().mockRejectedValue(new Error('Offline mode fallback')),
}));

describe('CorkboardInvestigationBoard - Domain Deduction & CoC 7e RAW', () => {
  const mockNodes: EvidenceNode[] = [
    {
      id: 'node_1',
      title: 'Dziwny Dziennik',
      description: 'Zapiski w obcym języku znalezione w gabinecie.',
      type: 'clue',
      status: 'confirmed',
      position: { x: 100, y: 100 },
      investigatorInsight: 'Pismo odpowiada dialektowi kultystów z Arkham.',
      createdAt: new Date().toISOString(),
    },
  ];

  const mockRelations: EvidenceRelation[] = [];

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renderuje tablicę, dowody z wnioskami oraz przycisk Błysk Dedukcji (INT)', () => {
    render(
      <CorkboardInvestigationBoard
        nodes={mockNodes}
        relations={mockRelations}
        onUpdateNodes={jest.fn()}
        onUpdateRelations={jest.fn()}
        activeCharacter={PREDEFINED_CHARACTERS[0]}
      />
    );

    expect(screen.getByText('TABLICA BADACZA')).toBeInTheDocument();
    expect(screen.getByText('Dziwny Dziennik')).toBeInTheDocument();
    expect(screen.getByText('Pismo odpowiada dialektowi kultystów z Arkham.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Błysk Dedukcji \(INT\)/i })).toBeInTheDocument();
  });

  it('otwiera modal Dedukcji Śledczej, wyświetla umiejętności postaci i progi CoC 7e', () => {
    const character = {
      ...PREDEFINED_CHARACTERS[0],
      name: 'Harvey Walters',
      int: 75,
      skills: {
        Okultyzm: 65,
        Medycyna: 40,
      },
    };

    render(
      <CorkboardInvestigationBoard
        nodes={mockNodes}
        relations={mockRelations}
        onUpdateNodes={jest.fn()}
        onUpdateRelations={jest.fn()}
        activeCharacter={character}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Błysk Dedukcji \(INT\)/i }));

    expect(screen.getByText('DEDUKCJA ŚLEDCZA (CoC 7e RAW)')).toBeInTheDocument();
    expect(screen.getByText('Harvey Walters')).toBeInTheDocument();
    expect(screen.getByText('Próg bazowy: 75%')).toBeInTheDocument();
    expect(screen.getByText('≤ 75')).toBeInTheDocument(); // Zwykły
    expect(screen.getByText('≤ 37')).toBeInTheDocument(); // Trudny (75 / 2 = 37)
    expect(screen.getByText('≤ 15')).toBeInTheDocument(); // Ekstremalny (75 / 5 = 15)
  });

  it('wykonuje test dedukcji z sukcesem i pozwala zapisać wniosek bezpośrednio w badanym dowodzie', async () => {
    const onUpdateNodes = jest.fn();
    const character = {
      ...PREDEFINED_CHARACTERS[0],
      name: 'Harvey Walters',
      int: 70,
    };

    jest.spyOn(diceUtils, 'rollD100').mockReturnValue(32); // Sukces trudny

    render(
      <CorkboardInvestigationBoard
        nodes={mockNodes}
        relations={mockRelations}
        onUpdateNodes={onUpdateNodes}
        onUpdateRelations={jest.fn()}
        activeCharacter={character}
      />
    );

    // Otwórz modal
    fireEvent.click(screen.getByRole('button', { name: /Błysk Dedukcji \(INT\)/i }));

    // Wybierz badany obiekt: Dziwny Dziennik
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'node_1' } });

    // Wykonaj test dedukcji
    fireEvent.click(screen.getByRole('button', { name: /Wykonaj Test Dedukcji/i }));

    // Wynik
    await waitFor(() => {
      expect(screen.getByText('32')).toBeInTheDocument();
      expect(screen.getByText(/TRUDNY SUKCES/i)).toBeInTheDocument();
      expect(screen.getByText(/PEWNA POSZLAKA/i)).toBeInTheDocument();
    });

    // Zapisz wniosek bezpośrednio w badanym dowodzie
    const saveButton = screen.getByRole('button', { name: /Zapisz wniosek w dowodzie/i });
    fireEvent.click(saveButton);

    expect(onUpdateNodes).toHaveBeenCalledTimes(1);
    const updatedNodes = onUpdateNodes.mock.calls[0][0];
    expect(updatedNodes[0].id).toBe('node_1');
    expect(updatedNodes[0].investigatorInsight).toContain('Badacz dostrzega kluczową zależność');
  });

  it('wykonuje test dedukcji z porażką, generuje trop z komplikacją i pozwala przypiąć nową notatkę', async () => {
    const onUpdateNodes = jest.fn();
    const onAddJournalEntry = jest.fn();
    const character = {
      ...PREDEFINED_CHARACTERS[0],
      name: 'Harvey Walters',
      int: 50,
    };

    jest.spyOn(diceUtils, 'rollD100').mockReturnValue(85); // Porażka

    render(
      <CorkboardInvestigationBoard
        nodes={mockNodes}
        relations={mockRelations}
        onUpdateNodes={onUpdateNodes}
        onUpdateRelations={jest.fn()}
        activeCharacter={character}
        onAddJournalEntry={onAddJournalEntry}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Błysk Dedukcji \(INT\)/i }));
    fireEvent.click(screen.getByRole('button', { name: /Wykonaj Test Dedukcji/i }));

    await waitFor(() => {
      expect(screen.getByText('85')).toBeInTheDocument();
      expect(screen.getAllByText(/PORAŻKA/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/TROP Z KOMPLIKACJĄ/i)).toBeInTheDocument();
    });

    // Przypnij jako nowa notatka
    fireEvent.click(screen.getByRole('button', { name: /Przypnij jako nową notatkę/i }));

    expect(onUpdateNodes).toHaveBeenCalledTimes(1);
    const updatedNodes = onUpdateNodes.mock.calls[0][0];
    expect(updatedNodes).toHaveLength(2);
    expect(updatedNodes[1]).toMatchObject({
      type: 'player_note',
      status: 'hypothesis',
    });
  });
});
