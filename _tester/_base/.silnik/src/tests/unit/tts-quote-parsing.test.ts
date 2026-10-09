import { findDialogueClosingQuote } from '@/hooks/useTTS';

describe('useTTS: Systemowe parsowanie cudzysłowów dialogowych i zagnieżdżonych (Issue #737)', () => {
  it('nie przerywa kwestii NPC na wewnętrznym cudzysłowie ostrokątnym »The Boston Globe«', () => {
    // Wypowiedź Arthura Knotta z tytułem gazety wewnątrz polskich cudzysłowów „...”
    const rawSpokenBody = 'Czytał pan »The Boston Globe« z wczorajszego poranka? To było doprawdy wstrząsające.”';
    const result = findDialogueClosingQuote(rawSpokenBody, '„');

    expect(result).not.toBeNull();
    // Znak zamykający to ” na samym końcu tekstu, a NIE » po Boston Globe
    expect(result?.closingChar).toBe('”');
    expect(result?.index).toBe(rawSpokenBody.length - 1);
  });

  it('poprawnie oddziela prozę narratora występującą po zakończeniu dialogu z wewnętrznym tytułem', () => {
    const rawSpokenBody = 'Czytał pan »The Boston Globe«?” – zapytał ze strachem.';
    const result = findDialogueClosingQuote(rawSpokenBody, '„');

    expect(result).not.toBeNull();
    expect(result?.closingChar).toBe('”');
    expect(result?.index).toBe(30); // Tuż po znaku zapytania
    const rawInsideQuote = rawSpokenBody.slice(0, result!.index);
    const rawAfterQuote = rawSpokenBody.slice(result!.index + 1);

    expect(rawInsideQuote).toBe('Czytał pan »The Boston Globe«?');
    expect(rawAfterQuote.trim()).toBe('– zapytał ze strachem.');
  });

  it('zwraca null gdy wypowiedź postaci nie została otwarta cudzysłowem dialogowym (brak sztucznego ucinania przez »tytuł«)', () => {
    // Kwestia bez cudzysłowu otwierającego: "Arthur Knott: Czytał pan »The Boston Globe« z wczorajszego poranka?"
    const rawSpokenBody = 'Czytał pan »The Boston Globe« z wczorajszego poranka?';
    const result = findDialogueClosingQuote(rawSpokenBody, undefined);

    expect(result).toBeNull();
  });

  it('obsługuje zagnieżdżone cytaty apostrofowe w cudzysłowach angielskich "..."', () => {
    const rawSpokenBody = 'Did you read \'The Boston Globe\' this morning? It was terrible." said Knott.';
    const result = findDialogueClosingQuote(rawSpokenBody, '"');

    expect(result).not.toBeNull();
    expect(result?.closingChar).toBe('"');
    expect(rawSpokenBody.slice(0, result!.index)).toBe(
      "Did you read 'The Boston Globe' this morning? It was terrible."
    );
  });

  it('obsługuje cudzysłowy francuskie «...» z wewnętrznym cytatem', () => {
    const rawSpokenBody = 'Avez-vous lu le journal? C\'était affreux.»';
    const result = findDialogueClosingQuote(rawSpokenBody, '«');

    expect(result).not.toBeNull();
    expect(result?.closingChar).toBe('»');
  });
});
