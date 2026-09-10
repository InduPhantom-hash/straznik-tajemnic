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

  it('wycina tagi protokołu BOP oraz ich ucięte linie bez nawiasów', () => {
    const inputWithBrackets = `[MYŚLI_MG: plan działania | MASKA_NPC: uprzejmy profesor, skrywa szaleństwo | RETRO_ZIARNO: pył na mankietach | KORELACJA: pasuje do zbrodni | ECHO_AKCJI: policja krąży wokół]
Kroki cichną w korytarzu.`;
    expect(cleanupContent(inputWithBrackets)).toBe('Kroki cichną w korytarzu.');

    const inputTruncated = `MASKA_NPC: ukryty motyw
RETRO_ZIARNO: zapach ozonu
KORELACJA: trop prowadzi do piwnicy
ECHO_AKCJI: portier obserwuje badacza
Na biurku leży stary telegram.`;
    expect(cleanupContent(inputTruncated)).toBe('Na biurku leży stary telegram.');
  });

  it('formatNarrative poprawnie ekstrahuje MYŚLI_MG z zagnieżdżonymi nawiasami w trybie Director Mode', () => {
    const { formatNarrative } = require('./formatter');
    const input = `[MYŚLI_MG: plan [serious] działania | MASKA_NPC: profesor [calm]]
Wkraczasz do gabinetu.`;
    const nodes = formatNarrative(input, undefined, undefined, true);
    expect(nodes.length).toBeGreaterThan(0);
    // Sprawdź czy sekcja director-notes została poprawnie wygenerowana
    const nonDirectorNodes = formatNarrative(input, undefined, undefined, false);
    expect(nonDirectorNodes.length).toBeLessThan(nodes.length);
  });
});

