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

    expect(screen.getByText(/Tło i Rola Fabularna/)).toBeTruthy();
    expect(screen.getByText(character.background)).toBeTruthy();
  });

  it('pokazuje życiorys badacza gdy backstory jest obecne', () => {
    const character = {
      id: 'test-char-backstory',
      name: 'Tomasz Nowicki',
      backstory: 'To jest pełny życiorys badacza.',
    } as any;
    render(<SheetBiography character={character} />);

    expect(screen.getByText(/Życiorys/)).toBeTruthy();
    expect(screen.getByText(character.backstory)).toBeTruthy();
  });
});
