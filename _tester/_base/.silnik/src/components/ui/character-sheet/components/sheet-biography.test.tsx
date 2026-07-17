import { render, screen } from '@testing-library/react';
import { PREDEFINED_CHARACTERS } from '@/lib/immersion/predefined-characters';
import { SheetBiography } from './sheet-biography';

describe('SheetBiography', () => {
  it('pokazuje kanoniczną historię gotowego badacza', () => {
    const character = PREDEFINED_CHARACTERS[0];
    render(<SheetBiography character={character} />);

    expect(screen.getByText(/Tło Postaci/)).toBeTruthy();
    expect(screen.getByText(character.background)).toBeTruthy();
  });
});
