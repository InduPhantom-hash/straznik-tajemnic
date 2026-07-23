import { cleanupContent } from './cleanup';

describe('cleanupContent', () => {
  it('wycina tag [KONIEC_SESJI:POTWIERDZENIE] z tekstu narracji', () => {
    const input = 'Fabuła dochodzi do końca. Mrok spowija gabinet.\n\n[KONIEC_SESJI:POTWIERDZENIE]';
    const output = cleanupContent(input);
    expect(output).not.toContain('[KONIEC_SESJI:POTWIERDZENIE]');
    expect(output).toBe('Fabuła dochodzi do końca. Mrok spowija gabinet.');
  });

  it('nie ucina pytania [Co robisz?] przy zapytaniu o finałową akcję', () => {
    const input = 'Cienie gęstnieją przy drzwiach. Ostatni promień słońca znika za horyzontem.\n\n[Co robisz?]';
    const output = cleanupContent(input);
    expect(output).toContain('[Co robisz?]');
  });
});
