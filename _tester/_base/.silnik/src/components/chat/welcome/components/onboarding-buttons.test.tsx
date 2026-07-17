import { fireEvent, render, screen } from '@testing-library/react';
import { OnboardingButtons } from './onboarding-buttons';

const baseProps = {
  onUploadRules: jest.fn(),
  onSelectAdventure: jest.fn(),
  onCreateCharacter: jest.fn(),
  onPickPredefinedCharacter: jest.fn(),
  onPickCharacter: jest.fn(),
  onStartGame: jest.fn(),
  hasRules: true,
  hasAdventure: true,
  hasSessionZero: true,
  hasCharacter: false,
  hasSavedCharacters: true,
};

describe('OnboardingButtons - duet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('pokazuje osobne miejsca dla obu graczy i blokuje start bez kompletu', () => {
    render(
      <OnboardingButtons
        {...baseProps}
        isDuet
        duetCharacterSlots={[
          { playerId: 'p1', playerName: 'Aga' },
          { playerId: 'p2', playerName: 'Jakub' },
        ]}
      />
    );

    expect(screen.getByText('Aga')).toBeInTheDocument();
    expect(screen.getByText('Jakub')).toBeInTheDocument();
    expect(screen.getAllByText('Brak przypisanej postaci')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /Rozpocznij/i })).toBeDisabled();
  });

  it('przekazuje jawne imię gracza do każdej ścieżki wyboru', () => {
    render(
      <OnboardingButtons
        {...baseProps}
        isDuet
        duetCharacterSlots={[{ playerId: 'p1', playerName: 'Aga' }]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Stwórz' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gotowa' }));
    fireEvent.click(screen.getByRole('button', { name: 'Katalog' }));

    expect(baseProps.onCreateCharacter).toHaveBeenCalledWith('Aga');
    expect(baseProps.onPickPredefinedCharacter).toHaveBeenCalledWith('Aga');
    expect(baseProps.onPickCharacter).toHaveBeenCalledWith('Aga');
  });

  it('pokazuje przypisaną postać w miejscu właściwego gracza', () => {
    render(
      <OnboardingButtons
        {...baseProps}
        isDuet
        hasCharacter
        duetCharacterSlots={[
          {
            playerId: 'p1',
            playerName: 'Aga',
            character: {
              id: 'c1',
              name: 'Margaret Sullivan',
              occupation: 'Dziennikarka',
              portraitUrl: '/portraits/margaret.webp',
            },
          },
          {
            playerId: 'p2',
            playerName: 'Jakub',
            character: {
              id: 'c2',
              name: 'Thomas O’Brien',
              occupation: 'Detektyw',
            },
          },
        ]}
      />
    );

    expect(screen.getByText('Margaret Sullivan')).toBeInTheDocument();
    expect(screen.getByAltText('Margaret Sullivan')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rozpocznij/i })).toBeEnabled();
  });
});
