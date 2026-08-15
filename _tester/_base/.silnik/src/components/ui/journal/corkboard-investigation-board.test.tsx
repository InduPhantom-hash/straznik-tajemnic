import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { CorkboardInvestigationBoard } from './corkboard-investigation-board';
import { EvidenceNode, EvidenceRelation } from '@/types/investigator-board';
import { PREDEFINED_CHARACTERS } from '@/lib/immersion/predefined-characters';
import * as diceUtils from '@/lib/dice-utils';

describe('CorkboardInvestigationBoard - Idea Roll & Deduction', () => {
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

  it('otwiera modal Rzutu na Pomysł i wyświetla progi Inteligencji badacza', () => {
    const character = {
      ...PREDEFINED_CHARACTERS[0],
      name: 'Harvey Walters',
      int: 75,
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

    expect(screen.getByText('BŁYSK DEDUKCJI (IDEA ROLL)')).toBeInTheDocument();
    expect(screen.getByText('Harvey Walters')).toBeInTheDocument();
    expect(screen.getByText('INT: 75%')).toBeInTheDocument();
    expect(screen.getByText('≤ 75')).toBeInTheDocument(); // Zwykły
    expect(screen.getByText('≤ 37')).toBeInTheDocument(); // Trudny (75 / 2 = 37)
    expect(screen.getByText('≤ 15')).toBeInTheDocument(); // Ekstremalny (75 / 5 = 15)
  });

  it('wykonuje rzut na INT z sukcesem, wyświetla interpretację CoC 7e RAW i przypina wniosek do tablicy', () => {
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

    // Rzuć kością
    fireEvent.click(screen.getByRole('button', { name: /Wykonaj Rzut Dedukcji/i }));

    // Wynik i interpretacja
    expect(screen.getByText('32')).toBeInTheDocument();
    expect(screen.getByText(/TRUDNY SUKCES/i)).toBeInTheDocument();
    expect(screen.getByText(/Badacz dostrzega powiązania między zebranymi dowodami/i)).toBeInTheDocument();

    // Przypnij wniosek do tablicy
    fireEvent.click(screen.getByRole('button', { name: /Przypnij wniosek do Tablicy/i }));

    expect(onUpdateNodes).toHaveBeenCalledTimes(1);
    const updatedNodes = onUpdateNodes.mock.calls[0][0];
    expect(updatedNodes).toHaveLength(2);
    expect(updatedNodes[1]).toMatchObject({
      title: 'Błysk Dedukcji: Harvey Walters',
      type: 'clue',
      status: 'hypothesis',
    });
    expect(updatedNodes[1].investigatorInsight).toContain('Badacz Harvey Walters');
  });

  it('wykonuje rzut na INT z porażką, wyświetla komplikację CoC 7e RAW i zapisuje wpis w Kronice', () => {
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
        onUpdateNodes={jest.fn()}
        onUpdateRelations={jest.fn()}
        activeCharacter={character}
        onAddJournalEntry={onAddJournalEntry}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Błysk Dedukcji \(INT\)/i }));
    fireEvent.click(screen.getByRole('button', { name: /Wykonaj Rzut Dedukcji/i }));

    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getAllByText(/PORAŻKA/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/okupiony komplikacją fabularną/i)).toBeInTheDocument();

    // Zapisz w kronice
    fireEvent.click(screen.getByRole('button', { name: /Zapisz w Kronice/i }));

    expect(onAddJournalEntry).toHaveBeenCalledTimes(1);
    expect(onAddJournalEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Błysk Dedukcji: Harvey Walters',
        type: 'clue',
        tags: ['dedukcja', 'pomysł', 'INT'],
      })
    );
    expect(screen.getByText('Zapisano w Kronice')).toBeInTheDocument();
  });
});
