import { fireEvent, render, screen } from '@testing-library/react';
import { BottomLinks } from './bottom-links';

describe('BottomLinks', () => {
  it('pokazuje przycisk zimnego startu i przekazuje kliknięcie', () => {
    const onColdStart = jest.fn();

    render(<BottomLinks onColdStart={onColdStart} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Zimny start' })
    );
    expect(onColdStart).toHaveBeenCalledTimes(1);
  });
});
