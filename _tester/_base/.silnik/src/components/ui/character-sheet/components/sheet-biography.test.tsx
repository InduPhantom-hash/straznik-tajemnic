import { render, screen } from '@testing-library/react';
import { SheetBiography } from './sheet-biography';

describe('SheetBiography', () => {
  it('pokazuje kanoniczną historię gotowego badacza', () => {
    const character = {
      id: 'test-char',
      name: 'Arthur Pendelton',
      background: 'To jest tło testowe postaci, które powinno się pojawić w komponencie.',
    } as any;
    render(<SheetBiography character={character} />);

    expect(screen.getByText(/Tło Postaci/)).toBeTruthy();
    expect(screen.getByText(character.background)).toBeTruthy();
  });
});
