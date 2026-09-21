import {
  CANONICAL_MYTHOS_TERMS,
  buildCustomVocabulary,
} from './cthulhu-vocabulary';

describe('cthulhu-vocabulary', () => {
  it('zawiera kluczowe pojęcia kanoniczne Mitów Cthulhu 7e', () => {
    expect(CANONICAL_MYTHOS_TERMS).toContain('Arkham');
    expect(CANONICAL_MYTHOS_TERMS).toContain('Cthulhu');
    expect(CANONICAL_MYTHOS_TERMS).toContain('Necronomicon');
    expect(CANONICAL_MYTHOS_TERMS).toContain('Poczytalność');
    expect(CANONICAL_MYTHOS_TERMS).toContain('Strażnik Tajemnic');
    expect(CANONICAL_MYTHOS_TERMS).toContain('Głębinowy');
  });

  it('dokonuje fuzji kanonicznych terminów ze zróżnicowanymi badaczami i NPC-ami', () => {
    const { terms, promptSnippet } = buildCustomVocabulary({
      investigators: [
        { name: 'Gracz 1', characterName: 'Thomas Malone' },
        'Harvey Walters',
      ],
      sceneNpcs: ['Inspektor Legrasse', 'Profesor Armitage'],
      location: 'Miskatonic Boarding House',
    });

    expect(terms).toContain('Thomas Malone');
    expect(terms).toContain('Harvey Walters');
    expect(terms).toContain('Inspektor Legrasse');
    expect(terms).toContain('Profesor Armitage');
    expect(terms).toContain('Miskatonic Boarding House');
    expect(terms).toContain('Arkham');
    expect(promptSnippet).toContain('Thomas Malone');
    expect(promptSnippet).toContain('Inspektor Legrasse');
    expect(promptSnippet).toContain('Miskatonic Boarding House');
  });

  it('działa poprawnie bez parametrów (tylko baza kanoniczna)', () => {
    const { terms, promptSnippet } = buildCustomVocabulary();
    expect(terms.length).toBeGreaterThan(30);
    expect(terms).toContain('Arkham');
    expect(promptSnippet).toContain('Słownik kanonicznych');
  });
});
