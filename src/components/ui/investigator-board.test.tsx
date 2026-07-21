import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { InvestigatorBoard } from './investigator-board';
import { EvidenceNode, EvidenceRelation } from '@/types/investigator-board';

describe('InvestigatorBoard Component', () => {
  const mockNodes: EvidenceNode[] = [
    {
      id: 'node_1',
      title: 'Ślad krwi w bibliotece',
      description: 'Plama krwi pod regałem z manuskryptami.',
      type: 'evidence',
      status: 'confirmed',
      position: { x: 100, y: 100 },
      createdAt: new Date().toISOString(),
    },
    {
      id: 'node_2',
      title: 'Prof. Archibald Sterling',
      description: 'Główny podejrzany w sprawie zniknięcia księgi.',
      type: 'suspect',
      status: 'hypothesis',
      position: { x: 400, y: 100 },
      createdAt: new Date().toISOString(),
    },
  ];

  const mockRelations: EvidenceRelation[] = [
    {
      id: 'rel_1',
      fromNodeId: 'node_1',
      toNodeId: 'node_2',
      label: 'Podejrzany przy śladzie',
    },
  ];

  it('renders investigator board title and nodes correctly', () => {
    render(
      <InvestigatorBoard
        nodes={mockNodes}
        relations={mockRelations}
        onUpdateNodes={jest.fn()}
        onUpdateRelations={jest.fn()}
      />
    );

    expect(screen.getByText('TABLICA BADACZA')).toBeInTheDocument();
    expect(screen.getByText('Ślad krwi w bibliotece')).toBeInTheDocument();
    expect(screen.getByText('Prof. Archibald Sterling')).toBeInTheDocument();
  });

  it('allows filtering nodes by status', () => {
    render(
      <InvestigatorBoard
        nodes={mockNodes}
        relations={mockRelations}
        onUpdateNodes={jest.fn()}
        onUpdateRelations={jest.fn()}
      />
    );

    const selects = screen.getAllByRole('combobox');
    const statusSelect = selects[0]; // Pierwszy select to status
    fireEvent.change(statusSelect, { target: { value: 'confirmed' } });

    expect(screen.getByText('Ślad krwi w bibliotece')).toBeInTheDocument();
    expect(screen.queryByText('Prof. Archibald Sterling')).not.toBeInTheDocument();
  });
});
