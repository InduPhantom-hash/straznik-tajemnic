import {
  getEraColorDirection,
  getEraImageFilter,
  getEraTechnologyGuardrails,
  getEraPhoneVisualDescription,
  getEraVehicleVisualDescription,
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

  it('poprawnie mapuje lata 80., 90., 2000 i okres przedwojenny 1900-1919', () => {
    expect(resolveEraVisualProfile('1983')).toBe('1980s');
    expect(resolveEraVisualProfile('1995')).toBe('1990s');
    expect(resolveEraVisualProfile('2004')).toBe('2000s');
    expect(resolveEraVisualProfile('1912')).toBe('1890s');
    expect(resolveEraVisualProfile('1955')).toBe('1950s');
  });

  it('generuje twarde strażniki anachronizmów dla epok historycznych', () => {
    const guardrails1980s = getEraTechnologyGuardrails('1983');
    expect(guardrails1980s).toContain('no smartphones');
    expect(guardrails1980s).toContain('no iPhones');
    expect(guardrails1980s).toContain('no powerbanks');

    const phone1980s = getEraPhoneVisualDescription('1983');
    expect(phone1980s).toContain('rotary dial or mechanical push buttons');
    expect(phone1980s).toContain('strictly no screen');

    const vehicle1970s = getEraVehicleVisualDescription('1974');
    expect(vehicle1970s).toContain('1970s Eastern European / European boxy sedan');
  });
});

