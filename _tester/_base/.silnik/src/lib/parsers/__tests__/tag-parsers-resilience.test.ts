import { parseAIResponse } from '../index';

describe('Tag Parsers Resilience (Issue #501)', () => {
  it('handles [LOKACJA: ...] without description without throwing', () => {
    const text = 'Wkraczasz do nowego rejonu. [LOKACJA: Warszawa - Elbląg - Prabuty] [Co robisz?]';
    expect(() => parseAIResponse(text)).not.toThrow();

    const result = parseAIResponse(text);
    const loc = result.events.find((e) => e.type === 'location');
    expect(loc).toBeDefined();
    expect(loc?.title).toBe('Warszawa - Elbląg - Prabuty');
    expect(loc?.description).toBe('');
  });

  it('handles [LOCATION: ...] in English without description', () => {
    const text = 'You arrive at the harbor. [LOCATION: Boston Harbor] What do you do?';
    expect(() => parseAIResponse(text)).not.toThrow();

    const result = parseAIResponse(text);
    const loc = result.events.find((e) => e.type === 'location');
    expect(loc).toBeDefined();
    expect(loc?.title).toBe('Boston Harbor');
    expect(loc?.description).toBe('');
  });

  it('handles [LOKACJA: Nazwa: Opis] with full description', () => {
    const text = '[LOKACJA: Redakcja: Duszny pokój pełen dymu]';
    const result = parseAIResponse(text);
    const loc = result.events.find((e) => e.type === 'location');
    expect(loc).toBeDefined();
    expect(loc?.title).toBe('Redakcja');
    expect(loc?.description).toBe('Duszny pokój pełen dymu');
  });

  it('handles malformed or empty tags gracefully without throwing', () => {
    const text = `
      [LOKACJA:]
      [NPC:]
      [PRZEDMIOT:]
      [MYŚLI_MG:]
      [NASTRÓJ:]
      [CEL_NARRACYJNY:]
      [SANITY:]
      [WALKA:]
    `;
    expect(() => parseAIResponse(text)).not.toThrow();
    const result = parseAIResponse(text);
    expect(result).toBeDefined();
  });

  it('handles realistic game opening with location tag without description', () => {
    const openingText = `
Starszy mężczyzna stuka pożółkłym palcem w tekturę teczki.
[LOKACJA: Warszawa - Elbląg - Prabuty]

Pawlicki milknie, wpatrując się w ciebie zza grubych szkieł.
[DZIENNIK:sprawa:Początek śledztwa]Dostajesz zlecenie na wyjazd do Prabut.[/DZIENNIK]
[Co robisz?]
    `;

    expect(() => parseAIResponse(openingText)).not.toThrow();
    const result = parseAIResponse(openingText);

    expect(result.events.some((e) => e.type === 'location')).toBe(true);
    expect(result.journalEntries.length).toBeGreaterThan(0);
    expect(result.rawText).toBe(openingText);
  });
});
