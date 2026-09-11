import { fireEvent, render, screen } from '@testing-library/react';
import { PredefinedCharactersSelector } from './predefined-characters-selector';
import {
  PREDEFINED_CHARACTERS,
  PredefinedCharacter,
} from '@/lib/immersion/predefined-characters';
import {
  getStrefa11CharactersForAdventure,
  STREFA_11_CHARACTERS,
} from '@/lib/immersion/strefa-11-characters';

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

  it('renderuje grafiki .webp dla przedmiotów ekwipunku postaci Strefy 11 bez fallbacków SVG', () => {
    render(
      <PredefinedCharactersSelector
        isOpen
        onClose={jest.fn()}
        onSelectCharacter={jest.fn()}
        characters={getStrefa11CharactersForAdventure('cien-nad-prabutami')}
        filterByEra={false}
      />
    );

    // Otwórz podgląd postaci Tomasza Nowickiego
    fireEvent.click(screen.getByText('Tomasz Nowicki'));

    // Znajdź obrazy w liście ekwipunku
    const dictaphoneImg = screen.getByAltText('Dyktafon na mikrokasety');
    const flashlightImg = screen.getByAltText('Mocna latarka policyjna');

    expect(dictaphoneImg.getAttribute('src')).toMatch(/\.webp$/);
    expect(dictaphoneImg.getAttribute('src')).not.toContain('.svg');
    expect(dictaphoneImg.getAttribute('src')).not.toContain('/predefined/');

    expect(flashlightImg.getAttribute('src')).toMatch(/\.webp$/);
    expect(flashlightImg.getAttribute('src')).not.toContain('.svg');
    expect(flashlightImg.getAttribute('src')).not.toContain('/predefined/');
  });

  it('rozstrzyga przedmioty z fallbackiem SVG do szablonu katalogowego .webp podczas podglądu i wyboru', () => {
    const onSelectCharacter = jest.fn();
    const characterWithSvg: PredefinedCharacter = {
      ...STREFA_11_CHARACTERS[0],
      id: 'custom_legacy_char',
      name: 'Badacz Retro',
      era: '2000s',
      equipment: [
        {
          id: 'eq_legacy_laptop',
          name: 'Ciężki laptop z wczesnym Wi-Fi',
          category: 'tool',
          imageUrl: '/equipment/predefined/tool.svg',
          visualSource: 'fallback',
        },
      ],
    };

    render(
      <PredefinedCharactersSelector
        isOpen
        onClose={jest.fn()}
        onSelectCharacter={onSelectCharacter}
        characters={[characterWithSvg]}
        filterByEra={false}
      />
    );

    fireEvent.click(screen.getByText('Badacz Retro'));

    const laptopImg = screen.getByAltText('Ciężki laptop z wczesnym Wi-Fi');
    expect(laptopImg.getAttribute('src')).toBe(
      '/equipment/catalog/heavy-laptop-wifi-1990s.webp'
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: /wybierz tę postać|choose this character/i,
      })
    );

    expect(onSelectCharacter).toHaveBeenCalledTimes(1);
    const selected = onSelectCharacter.mock.calls[0][0];
    expect(selected.equipment[0].imageUrl).toBe(
      '/equipment/catalog/heavy-laptop-wifi-1990s.webp'
    );
    expect(selected.equipment[0].visualSource).toBe('catalog');
  });

  it('poprawnie renderuje i wybiera postać Piotra "Kabla" Wójcickiego w epoce 2000s bez fallbacków SVG', () => {
    const onSelectCharacter = jest.fn();
    render(
      <PredefinedCharactersSelector
        isOpen
        onClose={jest.fn()}
        onSelectCharacter={onSelectCharacter}
        characters={getStrefa11CharactersForAdventure('przybysz-z-matriksa-glogow')}
        filterByEra={false}
      />
    );

    fireEvent.click(screen.getByText(/Piotr "Kabel" Wójcicki/i));

    const laptopImg = screen.getByAltText('Ciężki laptop z wczesnym Wi-Fi');
    const toolsImg = screen.getByAltText('Zestaw narzędzi do elektroniki');

    expect(laptopImg.getAttribute('src')).toBe(
      '/equipment/catalog/heavy-laptop-wifi-1990s.webp'
    );
    expect(laptopImg.getAttribute('src')).not.toContain('.svg');

    expect(toolsImg.getAttribute('src')).toBe(
      '/equipment/catalog/electronics-case-prl.webp'
    );
    expect(toolsImg.getAttribute('src')).not.toContain('.svg');

    fireEvent.click(
      screen.getByRole('button', {
        name: /wybierz tę postać|choose this character/i,
      })
    );

    expect(onSelectCharacter).toHaveBeenCalledTimes(1);
    const selected = onSelectCharacter.mock.calls[0][0];
    expect(selected.equipment).toHaveLength(2);
    expect(selected.equipment[0].imageUrl).toBe(
      '/equipment/catalog/heavy-laptop-wifi-1990s.webp'
    );
    expect(selected.equipment[0].visualSource).toBe('catalog');
    expect(selected.equipment[1].imageUrl).toBe(
      '/equipment/catalog/electronics-case-prl.webp'
    );
    expect(selected.equipment[1].visualSource).toBe('catalog');
  });

  it('używa currentEra jako fallbacku gdy postać nie ma zdefiniowanej własnej epoki', () => {
    const onSelectCharacter = jest.fn();
    const characterWithoutEra = {
      ...STREFA_11_CHARACTERS[0],
      id: 'no_era_char',
      name: 'Badacz Bez Epoki',
      era: undefined as unknown as PredefinedCharacter['era'],
      equipment: [
        {
          id: 'eq_classic_flashlight',
          name: 'Latarka elektryczna',
          category: 'tool' as const,
        },
      ],
    };

    render(
      <PredefinedCharactersSelector
        isOpen
        onClose={jest.fn()}
        onSelectCharacter={onSelectCharacter}
        currentEra="classic"
        characters={[characterWithoutEra]}
        filterByEra={false}
      />
    );

    fireEvent.click(screen.getByText('Badacz Bez Epoki'));

    const flashlightImg = screen.getByAltText('Latarka elektryczna');
    expect(flashlightImg.getAttribute('src')).toBe(
      '/equipment/catalog/flashlight-1920s.webp'
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: /wybierz tę postać|choose this character/i,
      })
    );

    expect(onSelectCharacter).toHaveBeenCalledTimes(1);
    const selected = onSelectCharacter.mock.calls[0][0];
    expect(selected.equipment[0].imageUrl).toBe(
      '/equipment/catalog/flashlight-1920s.webp'
    );
    expect(selected.equipment[0].visualSource).toBe('catalog');
  });
});
