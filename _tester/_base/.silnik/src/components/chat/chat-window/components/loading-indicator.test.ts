import { labelForSeconds } from './loading-indicator';

describe('LoadingIndicator labels', () => {
  it('uses English Game Master labels for the English locale', () => {
    expect(labelForSeconds(0, 'en')).toBe('The Game Master is responding...');
    expect(labelForSeconds(6, 'en')).toBe('The Game Master is setting the scene...');
    expect(labelForSeconds(15, 'en')).toBe('The Game Master weighs their words...');
  });

  it('keeps Polish labels for the Polish locale', () => {
    expect(labelForSeconds(0, 'pl')).toBe('Mistrz Gry odpowiada...');
  });
});
