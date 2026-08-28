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

  it('wycina kompletny angielski blok JOURNAL z narracji', () => {
    const input = 'The phone rings.\n\n[JOURNAL:clue:Telephone]\nA caller interrupts the morning.\n[/JOURNAL]';

    expect(cleanupContent(input)).toBe('The phone rings.');
  });

  it('wycina osierocony znacznik zamykający JOURNAL', () => {
    const input = 'The phone rings.[/JOURNAL]';

    expect(cleanupContent(input)).toBe('The phone rings.');
  });

  it('zachowuje angielskie pytanie narracyjne w nawiasach', () => {
    const input = 'The door opens.\n\n[What do you do?]';

    expect(cleanupContent(input)).toContain('[What do you do?]');
  });

  it('wycina różnorodne formy promptów obrazów wyciekające z LLM', () => {
    const cases = [
      '**Prompt:** Mroczny pokój',
      '**Prompt LLM:** Zjawa w lesie',
      'Prompt graficzny: Cień'
    ];
    cases.forEach(input => {
      expect(cleanupContent(input)).toBe('');
    });
  });
});
