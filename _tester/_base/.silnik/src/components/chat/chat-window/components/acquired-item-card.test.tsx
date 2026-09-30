import { fireEvent, render, screen } from '@testing-library/react';
import { AcquiredItemCard } from './acquired-item-card';
import type { AcquiredItemProposal, Character } from '@/lib/types';

import { PREDEFINED_CHARACTERS } from '@/lib/immersion/predefined-characters';

describe('AcquiredItemCard - likwidacja samowolnego auto-lootu (Issue #565)', () => {
  const pendingProposal: AcquiredItemProposal = {
    id: 'msg-1:acquired:0',
    name: 'Srebrny klucz',
    description: 'Ciężki klucz z dziwnym symbolem',
    visualTreatment: 'mundane',
    status: 'pending',
  };

  const characters: Character[] = [
    {
      ...PREDEFINED_CHARACTERS[0],
      id: 'char-1',
      name: 'Edward Carnby',
    },
    {
      ...PREDEFINED_CHARACTERS[1],
      id: 'char-2',
      name: 'Emily Hartwood',
    },
  ];

  it('w trybie Solo renderuje kartę bez auto-lootu i pozwala podjąć decyzję graczowi', () => {
    const onConfirm = jest.fn();
    const onDismiss = jest.fn();

    render(
      <AcquiredItemCard
        proposal={pendingProposal}
        onConfirm={onConfirm}
        onDismiss={onDismiss}
        isDuet={false}
      />
    );

    // Brak samowolnego wywołania onConfirm przy montowaniu komponentu
    expect(onConfirm).not.toHaveBeenCalled();

    // Wyświetla nazwę i opis przedmiotu
    expect(screen.getByText('Srebrny klucz')).toBeInTheDocument();
    expect(screen.getByText('Ciężki klucz z dziwnym symbolem')).toBeInTheDocument();

    // Gracz klika przycisk zabrania do torby
    const takeButton = screen.getByRole('button', { name: /Zabierz do torby|addToRecordsButton/i });
    fireEvent.click(takeButton);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith(undefined);
  });

  it('w trybie Solo pozwala zostawić przedmiot na miejscu', () => {
    const onConfirm = jest.fn();
    const onDismiss = jest.fn();

    render(
      <AcquiredItemCard
        proposal={pendingProposal}
        onConfirm={onConfirm}
        onDismiss={onDismiss}
        isDuet={false}
      />
    );

    const leaveButton = screen.getByRole('button', { name: /Zostaw|dismissButton/i });
    fireEvent.click(leaveButton);

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('wyświetla subtelny komunikat po zatwierdzeniu zabrania przedmiotu', () => {
    const acceptedProposal: AcquiredItemProposal = {
      ...pendingProposal,
      status: 'accepted',
    };

    render(
      <AcquiredItemCard
        proposal={acceptedProposal}
        onConfirm={jest.fn()}
        onDismiss={jest.fn()}
        isDuet={false}
      />
    );

    expect(screen.getByText(/Dodano do torby: Srebrny klucz|acceptedMessage/i)).toBeInTheDocument();
  });

  it('wyświetla subtelny komunikat po pozostawieniu przedmiotu na miejscu', () => {
    const dismissedProposal: AcquiredItemProposal = {
      ...pendingProposal,
      status: 'dismissed',
    };

    render(
      <AcquiredItemCard
        proposal={dismissedProposal}
        onConfirm={jest.fn()}
        onDismiss={jest.fn()}
        isDuet={false}
      />
    );

    expect(screen.getByText(/Zostawiono na miejscu: Srebrny klucz|dismissedMessage/i)).toBeInTheDocument();
  });
});
