import { fireEvent, render, screen } from '@testing-library/react';
import { PredefinedCharactersSelector } from './predefined-characters-selector';
import { PREDEFINED_CHARACTERS } from '@/lib/immersion/predefined-characters';
import { getStrefa11CharactersForAdventure } from '@/lib/immersion/strefa-11-characters';

const renderSelector = (
  currentEra: 'classic' | 'gaslight' | 'modern' | 'custom' = 'classic'
) =>
  render(
    <PredefinedCharactersSelector
      isOpen
      onClose={jest.fn()}
      onSelectCharacter={jest.fn()}
      currentEra={currentEra}
      targetPlayerName="Aga"
      characters={PREDEFINED_CHARACTERS}
    />
  );

describe('PredefinedCharactersSelector', () => {
  it('pokazuje wyłącznie badaczy z jawnie wybranej epoki', () => {
    renderSelector('classic');

    expect(screen.getByText(/Thomas "Tommy" O'Brien/i)).toBeTruthy();
    expect(screen.queryByText('David Miller')).toBeNull();
    expect(screen.getByText(/Postać dla gracza:/i).textContent).toContain(
      'Aga'
    );
  });

  it('łączy filtr archetypu z epoką', () => {
    renderSelector('classic');

    fireEvent.click(screen.getByRole('button', { name: 'Uczony' }));

    expect(screen.getByText('Prof. William Dyer')).toBeTruthy();
    expect(screen.getByText('Dr Dorothy Updike')).toBeTruthy();
    expect(screen.queryByText(/Thomas "Tommy" O'Brien/i)).toBeNull();
  });

  it('nie przypisuje własnej przygodzie po cichu lat 20.', () => {
    renderSelector('custom');

    expect(
      screen.getByText(/Epoka tej przygody nie jest określona/i)
    ).toBeTruthy();
    expect(screen.queryByText('Margaret Sullivan')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Współczesność' }));
    expect(screen.getByText('David Miller')).toBeTruthy();
  });

  it('używa lokalnych portretów zamiast obrazów zastępczych', () => {
    renderSelector('classic');

    const portrait = screen.getByAltText('Margaret Sullivan');
    expect(portrait.getAttribute('src')).toBe(
      '/portraits/predefined/margaret-sullivan.webp'
    );
  });

  it('passes an equipment array when an English preset is selected', () => {
    const onSelectCharacter = jest.fn();
    const previousLocale = process.env.NEXT_INTL_TEST_LOCALE;
    process.env.NEXT_INTL_TEST_LOCALE = 'en';

    render(
      <PredefinedCharactersSelector
        isOpen
        onClose={jest.fn()}
        onSelectCharacter={onSelectCharacter}
        currentEra="classic"
        characters={PREDEFINED_CHARACTERS}
      />
    );

    fireEvent.click(screen.getByText(/Margaret Sullivan/i));
    fireEvent.click(screen.getByRole('button', { name: /choose this character/i }));

    expect(onSelectCharacter.mock.calls[0][0].equipment).toEqual(
      expect.any(Array)
    );
    process.env.NEXT_INTL_TEST_LOCALE = previousLocale;
  });

  it('renders only the explicit Strefa 11 scenario pool without era filtering', () => {
    render(
      <PredefinedCharactersSelector
        isOpen
        onClose={jest.fn()}
        onSelectCharacter={jest.fn()}
        characters={getStrefa11CharactersForAdventure('tajemnica-dzieci-z-traszyna')}
        filterByEra={false}
      />
    );

    expect(screen.getByText('Ksiądz Jan Kaczmarek')).toBeTruthy();
    expect(screen.queryByText('Prof. William Dyer')).toBeNull();
  });
});
