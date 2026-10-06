import React from 'react';
import { render, screen } from '@testing-library/react';
import { ArtDecoEye } from './art-deco-eye';

describe('ArtDecoEye', () => {
  it('renderuje poprawny element z etykietą dostępności', () => {
    render(<ArtDecoEye size={80} mode="rotating" />);
    const eye = screen.getByRole('img', { name: /symbol oka strażnika tajemnic/i });
    expect(eye).toBeInTheDocument();
    expect(eye).toHaveStyle({ width: '80px', height: '80px' });
  });

  it('wspiera tryb statyczny oraz delikatny bez błędów', () => {
    const { rerender } = render(<ArtDecoEye mode="static" />);
    expect(screen.getByRole('img')).toBeInTheDocument();

    rerender(<ArtDecoEye mode="gentle" />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});
