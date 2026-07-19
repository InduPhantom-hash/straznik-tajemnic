import {
  getEraColorDirection,
  getEraImageFilter,
  resolveEraVisualProfile,
} from './era-visual-style';

describe('era visual style', () => {
  it('dobiera pełny kolor wyłącznie dla współczesności', () => {
    expect(getEraImageFilter('modern')).toBe('none');
    expect(getEraImageFilter('2026')).toBe('none');
    expect(getEraImageFilter('1925')).not.toBe('none');
  });

  it('rozróżnia lata 40. od PRL, także gdy UI przekazuje sam rok', () => {
    expect(resolveEraVisualProfile('1946')).toBe('1940s');
    expect(resolveEraVisualProfile('1974')).toBe('prl-1970s');
    expect(getEraColorDirection('1974')).toContain('Eastern European analog');
  });
});
